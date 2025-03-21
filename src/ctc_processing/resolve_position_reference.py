import argparse
import asyncio
from collections import defaultdict
import json
import os
import random
import re
from typing import Any, Dict, List, Union
import uuid

import aiohttp
import anthropic
import jinja2
import openai
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

from sudoku_ds import (
    ActionType,
    SudokuAction,
)
from data_processing.resolve_position_reference_prompts import (
    example_input,
    example_output,
    instruction,
    prefilled_answer,
)


def validate_output_text(args: argparse.Namespace, input_text: str, output_text: str) -> str:
    """
    Validate output text format and content
    """
    # Prefix
    if not output_text.startswith("### Output ###"):
        raise ValueError("Output doesn't start with expected prefix")
    output_text = output_text[len("### Output ###"):].strip()

    # Exactly one board
    if args.output_board:
        if output_text.count("<board>") != 1 or output_text.count("</board>") != 1:
            raise ValueError("Output doesn't contain exactly one <board> tag")

    # Board content match
    if args.output_board:
        input_board = "<board>" + input_text.split("<board>")[1].split("</board>")[0] + "</board>"
        output_board = "<board>" + output_text.split("<board>")[1].split("</board>")[0] + "</board>"
        if input_board != output_board:
            raise ValueError("Output board doesn't match input board")

    # Reduced action sequence match
    action_types = set([f"<{action_type.value}>" for action_type in ActionType])
    to_reduce_tags = ["<sl>", "<ds>"]
    def get_reduced_action_sequence(text):
        tags = re.findall(r"(<.*?>)", text)
        reduced_action_chunks, cur_chunk = [], []
        for tag in tags:
            if tag in action_types:
                if cur_chunk:
                    assert cur_chunk[0] in action_types
                    if cur_chunk[0] not in to_reduce_tags:
                        reduced_action_chunks.append(cur_chunk)
                    cur_chunk = []
            cur_chunk.append(tag)
        if cur_chunk:
            if cur_chunk[0] not in to_reduce_tags:
                reduced_action_chunks.append(cur_chunk)
        reduced_actions = [SudokuAction.from_tokens(chunk) for chunk in reduced_action_chunks]
        return reduced_actions
    try:
        if args.output_board:
            input_text_nonboard = input_text.replace(input_board, "")
            output_text_nonboard = output_text.replace(output_board, "")
            input_reduced_actions = get_reduced_action_sequence(input_text_nonboard)
            output_reduced_actions = get_reduced_action_sequence(output_text_nonboard)
        else:
            input_reduced_actions = get_reduced_action_sequence(
                input_text[input_text.find("</board>") + len("</board>"):]
            )
            output_reduced_actions = get_reduced_action_sequence(output_text)
    except Exception as e:
        raise ValueError(f"Cannot get reduced action sequence from input/output: {str(e)}")
    if input_reduced_actions != output_reduced_actions:
        raise ValueError("Output reduced action sequence doesn't match input reduced action sequence")
        
    return output_text


def clean_output(args: argparse.Namespace, input_text: str, output_text: str) -> str:
    """
    Clean output text format and content
    """
    # Add board if not predicted
    if not args.output_board:
        input_board = "<board>" + input_text.split("<board>")[1].split("</board>")[0] + "</board>"
        output_text = input_board + output_text
    return output_text


async def process_request_with_retry(
    args: argparse.Namespace,
    client: Union[openai.AsyncOpenAI, anthropic.AsyncAnthropic, anthropic.AsyncAnthropicBedrock, AsyncLLMEngine],
    request: Dict,
    model: str,
    tokenizer: AutoTokenizer,
    max_retries: int = 3,
    temperature: float = 0.1
) -> Dict:
    """
    Process a single request with retry logic
    """
    attempt = 0
    while attempt < max_retries:
        try:
            if isinstance(client, openai.AsyncOpenAI):
                completion = await client.chat.completions.create(
                    model=model,
                    messages=request["messages"],
                    temperature=temperature,
                )
                output_text = completion.choices[0].message.content
            elif isinstance(client, (anthropic.AsyncAnthropic, anthropic.AsyncAnthropicBedrock)):
                completion = await client.messages.create(
                    model=model,
                    messages=request["messages"],
                    max_tokens=8192,
                    temperature=temperature,

                )
                output_text = completion.content[0].text
                output_text = request["output_prefix"] + output_text
            elif isinstance(client, AsyncLLMEngine):
                prompt = tokenizer.apply_chat_template(
                    conversation=request["messages"],
                    tokenize=False,
                    add_generation_prompt=False,
                    continue_final_message=True,
                )
                sampling_params_kwargs = {
                    "temperature": temperature,
                    "max_tokens": 8192,
                }
                # NOTE: fix for reka not having <sep> as a special token
                if "reka" in args.model:
                    sampling_params_kwargs["stop"] = ["<sep>"]
                result_generator = client.generate(
                    prompt,
                    SamplingParams(**sampling_params_kwargs),
                    uuid.uuid4(),
                )
                final_output = None
                async for request_output in result_generator:
                    final_output = request_output
                prompt = final_output.prompt
                output_text = [output.text for output in final_output.outputs][0]
                output_text = request["output_prefix"] + output_text
            
            # Validate output format
            output_text = validate_output_text(
                args=args,
                input_text=request["raw_input"],
                output_text=output_text
            )

            # Clean output
            output_text = clean_output(
                args=args,
                input_text=request["raw_input"],
                output_text=output_text
            )
            
            return {
                "line_idx": request["line_idx"],
                "seg_idx": request["seg_idx"],
                "output": output_text,
                "attempts": attempt + 1
            }
            
        except Exception as e:
            print(f"Failed for request {request['line_idx']}-{request['seg_idx']} attempt {attempt+1}: {str(e)}")
            attempt += 1
            if attempt == max_retries:
                print(f"Failed after {max_retries} attempts for request {request['line_idx']}-{request['seg_idx']}: {str(e)}")
                return {
                    "line_idx": request["line_idx"],
                    "seg_idx": request["seg_idx"],
                    "output": output_text if 'output_text' in locals() else "",
                    "error": str(e),
                    "attempts": attempt
                }
            await asyncio.sleep(1)  # Add small delay between retries


async def process_batch_with_retries(
    args: argparse.Namespace,
    requests: List[Dict],
    client: Union[openai.AsyncOpenAI, anthropic.AsyncAnthropic, anthropic.AsyncAnthropicBedrock, AsyncLLMEngine],
    model: str,
    tokenizer: AutoTokenizer,
    max_retries: int,
    batch_size: int,
) -> List[Dict]:
    """
    Process a batch of requests with retry logic
    """
    semaphore = asyncio.Semaphore(batch_size)
    async def process_with_semaphore(request):
        async with semaphore:
            return await process_request_with_retry(
                args=args,
                client=client,
                request=request,
                model=model,
                tokenizer=tokenizer,
                max_retries=max_retries
            )
    
    tasks = [process_with_semaphore(request) for request in requests]
    outputs = []
    
    # Process requests with progress bar
    with tqdm(total=len(tasks), desc="Processing requests") as pbar:
        for coro in asyncio.as_completed(tasks):
            result = await coro
            outputs.append(result)
            pbar.update(1)
            if "error" in result:
                pbar.write(f"Error in request {result['line_idx']}-{result['seg_idx']}: {result['error']}")
    
    return outputs


def main():
    parser = argparse.ArgumentParser()
    # Paths
    parser.add_argument("--input_filepath", type=str, required=True)
    parser.add_argument("--failed_log_filepath", type=str)
    parser.add_argument("--output_filepath", type=str, required=True)

    # Setting
    parser.add_argument("--output_board", action="store_true")
    parser.add_argument("--debug", action="store_true")

    # Client
    parser.add_argument("--api", type=str, default="vllm", choices=["openai", "anthropic", "anthropic_bedrock", "vllm"])
    parser.add_argument("--model", type=str, default="Qwen/Qwen2.5-72B-Instruct-GPTQ-Int4")
    parser.add_argument("--max_retries", type=int, default=3)
    parser.add_argument("--batch_size", type=int, default=1024)

    # vLLM
    parser.add_argument("--tensor_parallel_size", type=int, default=1)
    parser.add_argument("--pipeline_parallel_size", type=int, default=1)
    parser.add_argument("--draft_model", type=str)
    
    args = parser.parse_args()

    from data_processing.resolve_position_reference_prompts import (
        example_input,
        example_output,
        instruction,
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

            if len(pieces) == 0:
                import code
                code.interact(local=dict(locals(), **globals()))

            # Construct segments
            for seg_idx in range(len(pieces)):
                seg = f"<board>{pieces[seg_idx]}"
                line_idx2seg_idx2input[line_idx][seg_idx] = seg
                
                num_segs += 1
                if args.debug and num_segs >= 100:
                    break
            if args.debug and num_segs >= 100:
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