import argparse
import asyncio
from collections import defaultdict
import json
import os
import re
from typing import List

from tqdm import tqdm
from transformers import AutoTokenizer
try:
    from vllm import AsyncLLMEngine, SamplingParams
    from vllm.engine.arg_utils import AsyncEngineArgs
except ImportError:
    print("vllm not installed. Please install vllm to use it.")
    AsyncLLMEngine = None
    SamplingParams = None
    AsyncEngineArgs = None

from data_processing.resolve_position_reference import (
    clean_output,
    process_request_with_retry,
    process_batch_with_retries,
    validate_output_text,
)
from sudoku_ds import SELECTION_ACTIONS


def remove_low_info_actions(output_text: str, combine_position: bool = False) -> str:
    for action in SELECTION_ACTIONS:
        if combine_position:
            output_text = re.sub(rf"<{action}>(<r\d+?c\d+?>)+", "", output_text)
        else:
            output_text = re.sub(rf"<{action}>(<r\d+?><c\d+?>)+", "", output_text)
    return output_text


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input_filepath", type=str, required=True)
    parser.add_argument("--failed_log_filepath", type=str)
    parser.add_argument("--output_filepath", type=str, required=True)
    parser.add_argument("--output_board", action="store_true")
    parser.add_argument("--combine_position", action="store_true")
    parser.add_argument("--api",
        type=str, default="vllm", 
        choices=["openai", "anthropic", "anthropic_bedrock", "vllm"]
    )
    parser.add_argument("--model", type=str, default="Qwen/Qwen2.5-72B-Instruct-GPTQ-Int4")
    parser.add_argument("--draft_model", type=str)
    parser.add_argument("--max_retries", type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=1024)
    parser.add_argument("--tensor_parallel_size", type=int, default=1)
    parser.add_argument("--pipeline_parallel_size", type=int, default=1)
    parser.add_argument("--debug", action="store_true")
    
    args = parser.parse_args()

    from data_processing.adjust_action_position_prompts import (
        example_input,
        example_output,
        instruction,
        prefilled_answer,
    )

    # Get input segments
    line_idx2seg_idx2input = defaultdict(dict)
    line_idx2ending = {}
    num_segs = 0
    with open(args.input_filepath, "r") as f:
        for line_idx, line in tqdm(enumerate(f), desc="Reading input file"):
            line = json.loads(line)

            # Full text sequence
            text = line["text"]

            # Get segments based on <board>
            pieces = text.split("<board>")
            assert pieces[0] == ""
            pieces = pieces[1:]
            
            # Skip ending board
            line_idx2ending[line_idx] = "<board>" + pieces[-1]
            pieces = pieces[:-1]

            # Construct segments
            for seg_idx in range(len(pieces)):
                seg = f"<board>{pieces[seg_idx]}"
                line_idx2seg_idx2input[line_idx][seg_idx] = seg
                
                num_segs += 1
                if args.debug and num_segs >= 10:
                    break
            if args.debug and num_segs >= 10:
                break

    print(f"Number of lines: {len(line_idx2seg_idx2input)}")
    print(f"Number of segments: {num_segs}")

    # Get previously failed segments
    if args.failed_log_filepath:
        failed_request_idcs = set()
        with open(args.failed_log_filepath, "r") as f:
            failed_requests = json.loads(f.read())
            print(f"Number of previously failed requests: {len(failed_requests)}")
            for request in failed_requests:
                failed_request_idcs.add((request["line_idx"], request["seg_idx"]))

    # Adjust example output
    if not args.output_board:
        example_output = example_output[example_output.find("</board>") + len("</board>"):]

    # Remove low information actions
    example_input = remove_low_info_actions(example_input, combine_position=args.combine_position)
    example_output = remove_low_info_actions(example_output, combine_position=args.combine_position)
    for line_idx, seg_idx2input in line_idx2seg_idx2input.items():
        for seg_idx, input_text in seg_idx2input.items():
            line_idx2seg_idx2input[line_idx][seg_idx] = remove_low_info_actions(
                input_text, combine_position=args.combine_position
            )

    # Construct requests
    requests = []
    for line_idx, seg_idx2input in tqdm(line_idx2seg_idx2input.items(), desc="Constructing requests"):
        for seg_idx, input_text in seg_idx2input.items():
            # Keep only failed requests
            if args.failed_log_filepath and (line_idx, seg_idx) not in failed_request_idcs:
                continue

            # Prefill assistant response
            if args.output_board:
                output_text_prefix = input_text[:input_text.find("</board>") + len("</board>")]
            else:
                output_text_prefix = ""
            output_text_prefix = f"### Output ###\n\n{output_text_prefix}"
            
            # Construct LLM input
            messages = [
                {"role": "user", "content": instruction},
                {"role": "assistant", "content": prefilled_answer},
                {"role": "user", "content": f"### Input ###\n\n{example_input}"},
                {"role": "assistant", "content": f"### Output ###\n\n{example_output}"},
                {"role": "user", "content": f"### Input ###\n\n{input_text}"},
            ]
            if "gpt" not in args.model:
                messages.append({"role": "assistant", "content": output_text_prefix})

            requests.append({
                "line_idx": line_idx,
                "seg_idx": seg_idx,
                "messages": messages,
                "raw_input": input_text,
                "output_prefix": output_text_prefix,
            })

    print(f"Number of requests: {len(requests)}")
            
    # Setup
    if args.api == "vllm":
        tokenizer = AutoTokenizer.from_pretrained(args.model)
        client = AsyncLLMEngine.from_engine_args(
            AsyncEngineArgs(
                model=args.model,
                gpu_memory_utilization=0.9,
                tensor_parallel_size=args.tensor_parallel_size,
                pipeline_parallel_size=args.pipeline_parallel_size,
                enable_chunked_prefill=False if args.draft_model else True,
                max_num_batched_tokens=None if args.draft_model else 8192,
                enable_prefix_caching=True,
                enforce_eager=True,
                speculative_model=args.draft_model,
                num_speculative_tokens=5 if args.draft_model else None,
            )
        )
    else:
        if args.api == "openai":
            client = openai.AsyncOpenAI(
                api_key=os.environ.get("OPENAI_API_KEY"),
            )
        elif args.api == "anthropic":
            client = anthropic.AsyncAnthropic(
                api_key=os.environ.get("ANTHROPIC_API_KEY"),
            )
        elif args.api == "anthropic_bedrock":
            client = anthropic.AsyncAnthropicBedrock(
                aws_access_key=os.getenv("AWS_ACCESS_KEY"),
                aws_secret_key=os.getenv("AWS_SECRET_KEY"),
                aws_region=os.getenv("AWS_REGION", "us-east-1"),
            )
        tokenizer = None

    # Process requests with retry logic
    outputs = asyncio.run(process_batch_with_retries(
        args=args,
        requests=requests,
        client=client,
        tokenizer=tokenizer,
        model=args.model,
        max_retries=args.max_retries,
        batch_size=args.batch_size
    ))
    
    # Process outputs and write results
    line_idx2seg_idx2output = defaultdict(dict)
    failed_requests = []
    process_stat = defaultdict(int)
    for output in outputs:
        line_idx, seg_idx = output["line_idx"], output["seg_idx"]
        input_text = line_idx2seg_idx2input[line_idx][seg_idx]
        output_text = output["output"]
        # Try to get updated segment
        if "error" in output:
            # Handle failed requests - use input as it is
            print(f"Failed to process request {line_idx}-{seg_idx}: {output['error']}")
            failed_requests.append({"line_idx": line_idx, "seg_idx": seg_idx})
            process_stat["failed"] += 1
            line_idx2seg_idx2output[line_idx][seg_idx] = line_idx2seg_idx2input[line_idx][seg_idx]
        else:
            if input_text == output_text:
                process_stat["unchanged"] += 1    
            line_idx2seg_idx2output[line_idx][seg_idx] = output_text
            
        process_stat["attempts"] += output["attempts"]
        process_stat["total"] += 1
    print(f"Process stats: {process_stat}")

    # Complement with input segments that were not processed
    if args.failed_log_filepath:
        for line_idx, seg_idx2input in line_idx2seg_idx2input.items():
            for seg_idx, input_text in seg_idx2input.items():
                if (line_idx, seg_idx) in failed_request_idcs:
                    continue
                assert seg_idx not in line_idx2seg_idx2output[line_idx]
                line_idx2seg_idx2output[line_idx][seg_idx] = input_text

    # Merge outputs
    line_idx2output_str = {}
    for line_idx in line_idx2seg_idx2output.keys():
        line_output = []
        seg_idx2output = line_idx2seg_idx2output[line_idx]
        for seg_idx in range(len(seg_idx2output)):
            segment = seg_idx2output[seg_idx]
            line_output.append(segment)
        line_output.append(line_idx2ending[line_idx])
        line_output = "".join(line_output)
        line_idx2output_str[line_idx] = line_output

    # Write outputs
    os.makedirs(os.path.dirname(args.output_filepath), exist_ok=True)
    with open(args.input_filepath, "r") as in_f, open(args.output_filepath, "w") as out_f:
        for line_idx, line in enumerate(in_f):
            if line_idx not in line_idx2output_str:
                continue
            line = json.loads(line)
            line["text"] = line_idx2output_str[line_idx]
            out_f.write(json.dumps(line) + "\n")

    # Write failed requests to log file
    with open(args.output_filepath + ".log", "w") as f:
        f.write(json.dumps(failed_requests))


if __name__ == "__main__":
    main()