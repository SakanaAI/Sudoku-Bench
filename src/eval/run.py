"""
Evaluate LLM on Sudoku puzzles using an API.

We call the LLM repeatedly:
  1) Provide an initial puzzle prompt.
  2) LLM responds with a single forced placement (e.g., <ANSWER>\nr3c6: 5\n</ANSWER>).
  3) We check if that placement is valid and correct based on the puzzle's known solution.
  4) If correct, we update the board and continue; if incorrect, we stop.
  5) Continue until the puzzle is solved or we reach a maximum number of steps.

Example Usage:
--------------
export OPENAI_API_KEY="your_openai_api_key"
export DATASET="challenge_100"
export API="openai"
export MODEL="gpt-4o-mini-2024-07-18"
python -m eval.run \
    --dataset ${DATASET} \
    --output_csv ../data/benchmark_results/${DATASET}/${MODEL}.csv \
    --api ${API} \
    --model ${MODEL} \
    --batch_size 20

Output:
-------
A CSV file with columns:
[
    "data_source",
    "puzzle_id",
    "model",
    "num_empty_cells",
    "shuffle_seed",
    "n_response_idx",
    "n_history_turns",
    "setting",
    "conversation",
    "num_rounds",
    "num_correct_placements",
    "final_solved",
    "final_board",
]

Plus a summary of average correctness/final-solved rates in stdout.
"""

import argparse
import asyncio
import json
import os
import sys
from typing import Any, Dict, List, Optional, Union
import uuid
import re


import aiohttp
import anthropic
import datasets
import jinja2
import openai
import pandas as pd
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

from eval.prompts import (
    BOARD_PROMPT,
    PREFILLED_ASSISTANT_RESPONSE,
    RULE_PROMPT,
    ONE_SHOT_PROMPT,
)
from eval.utils import (
    extract_action_from_response,
    pretty_print_visual_elements,
    random_fill_hints,
)
from sudoku_ds import (
    SudokuAction,
    SudokuBoard,
)


async def call_api(
    args: argparse.Namespace,
    client: Union[Any],
    messages: List[Dict],
    model: str,
    tokenizer: Optional[AutoTokenizer] = None,
) -> Optional[str]:
    attempt = 0
    while attempt < args.max_retries:
        try:
            # OpenAI API
            if args.api == "openrouter":
                kwargs = {
                    "model": model,
                    "messages": messages,
                    "temperature": args.temperature,
                    "top_p": args.top_p,
                }
                completion = await client.chat.completions.create(**kwargs)
                if not completion.choices:
                    # typically due to rate limiting
                    raise ValueError(f"API response missing 'choices'. Error: {completion.error['message']}")
                output_text = completion.choices[0].message.content
            elif isinstance(client, openai.AsyncOpenAI):
                kwargs = {
                    "model": model,
                    "messages": messages,
                    "temperature": args.temperature,
                    "top_p": args.top_p,
                }
                # Special setting for o1, o3
                if "o1-" in model or "o3-" in model:
                    kwargs["max_completion_tokens"] = args.max_tokens
                    kwargs["temperature"] = 1.0
                    kwargs.pop('top_p', None)
                # Special setting for R1 (TogetherAI)
                elif model == "deepseek-ai/DeepSeek-R1":
                    kwargs["temperature"] = 0.6
                    kwargs["max_tokens"] = None
                else:
                    kwargs["max_tokens"] = min(args.max_tokens, 8192)
                completion = await client.chat.completions.create(**kwargs)
                output_text = completion.choices[0].message.content
            # Anthropic API
            elif isinstance(client, (anthropic.AsyncAnthropic, anthropic.AsyncAnthropicBedrock)):
                kwargs = {
                    "model": model,
                    "messages": messages,
                    "max_tokens": args.max_tokens,
                    "temperature": args.temperature,
                    "top_p": args.top_p,
                    "top_k": args.top_k,
                }
                # Special setting for reasoning models as suggested
                if model.endswith("/thinking"):
                    kwargs["model"] = model.replace("/thinking", "")
                    kwargs["temperature"] = 1.0
                    kwargs["thinking"] = {
                        "type": "enabled",
                        "budget_tokens": args.max_tokens - 1024,
                    }
                    kwargs.pop('top_k', None)
                    kwargs.pop('top_p', None)
                # Handle system prompts for Anthropic APIs
                if messages[0]["role"] == "system":
                    kwargs["system"] = messages[0]["content"]
                    kwargs["messages"] = messages[1:]
                completion = await client.messages.create(**kwargs)
                output_text = completion.content[-1].text
            # vLLM API
            elif isinstance(client, AsyncLLMEngine):
                prompt = tokenizer.apply_chat_template(
                    conversation=messages,
                    tokenize=False,
                    add_generation_prompt=True,
                )
                result_generator = client.generate(
                    prompt,
                    SamplingParams(
                        temperature=args.temperature,
                        top_p=args.top_p,
                        top_k=args.top_k,
                        max_tokens=args.max_tokens,
                    ),
                    uuid.uuid4(),
                )
                final_output = None
                async for request_output in result_generator:
                    final_output = request_output
                prompt = final_output.prompt
                output_text = [output.text for output in final_output.outputs][0]
            return output_text
            
        except Exception as e:
            attempt += 1
            print(f"Attempt {attempt} failed. {e}")
            if attempt == args.max_retries:
                print(f"Failed after {args.max_retries} attempts for request. {e}")
                return None
            # Add small delay between retries
            await asyncio.sleep(args.retry_delay)


async def process_one(
    args: argparse.Namespace,
    client: Union[Any],
    request: Dict,
    model: str,
    tokenizer: Optional[AutoTokenizer] = None
) -> Dict:
    # Load data
    rules = request["rules"]
    current_board_ascii = request["initial_board"]
    solution_ascii = request["solution"]
    rows = request["rows"]
    cols = request["cols"]
    visual_elements = request["visual_elements"]
    if pd.isna(visual_elements) or visual_elements == "":
        visual_elements = None
    n_history_turns = request["n_history_turns"]

    # Construct setting string
    settings = []
    if n_history_turns == -1:
        settings.append("full-history")
    else:
        assert n_history_turns >= 0
        settings.append(f"{n_history_turns}-history-turns")
    if len(settings) == 0:
        setting = "default"
    else:
        setting = "_".join(settings)

    # Pretty print visual elements
    if visual_elements is None:
        pretty_visual_elements = None
    else:
        visual_elements = json.loads(visual_elements)
        pretty_visual_elements = pretty_print_visual_elements(visual_elements)

    # Construct boards
    solution_board = SudokuBoard.from_ascii(solution_ascii, rows, cols)
    current_board = SudokuBoard.from_ascii(current_board_ascii, rows, cols)
    max_rounds = current_board.to_ascii(unfilled=".").count(".")

    # Initial conversation
    rule_prompt = jinja2.Template(RULE_PROMPT).render(
        rows=rows,
        cols=cols,
        rules=rules,
        pretty_visual_elements=pretty_visual_elements,
    )
    # `history_conversation`` is for recording
    # Actual input conversation will be constructed before calling API
    history_conversation = [
        {"role": "user", "content": rule_prompt},
        {"role": "assistant", "content": PREFILLED_ASSISTANT_RESPONSE}
    ]

    num_correct_placements = 0
    for round_idx in range(max_rounds):
        round_str = f"Round {round_idx + 1} / {max_rounds}"

        ##################
        ## Get response ##
        ################## 

        # Construct user prompt describing the current board
        board_prompt = jinja2.Template(BOARD_PROMPT).render(
            current_board=current_board.to_spaced_ascii(unfilled="."),
        )
        history_conversation.append({"role": "user", "content": board_prompt})

        # Construct input conversation
        # If full history, include all history turns
        if n_history_turns == -1:
            input_conversation = [
                {"role": message["role"], "content": message["content"]}
                for message in history_conversation
            ]
        # Otherwise
        # - First two prompts are fixed (rule prompt and prefilled assistant response)
        # - Last prompt is the current board
        # - In between, we add the most recent history turns
        else:
            input_conversation = [
                {"role": message["role"], "content": message["content"]}
                for message in \
                    history_conversation[:2] \
                    + history_conversation[2:-1][-2*n_history_turns:] \
                    + history_conversation[-1:]
            ]

        # Call API
        assistant_response = await call_api(
            args=args,
            client=client,
            model=model,
            tokenizer=tokenizer,
            messages=input_conversation,
        )

        # Teriminate if no response
        if not assistant_response:
            print(f"{round_str}. No response from server.")
            break

        # Update conversation
        history_conversation.append({"role": "assistant", "content": assistant_response})

        #################################
        ## Solution-independent checks ##
        ################################# 

        # Extract action from response
        action = extract_action_from_response(assistant_response)
        # Terminate if no action found
        if not action:
            print(f"[Fail] {round_str}. No valid action found in response.")
            break

        # Convert to SudokuAction
        try:
            r_str, c_str, val_str = action
            sudoku_action = SudokuAction.from_tokens([
                "<vl>", f"<value{val_str}>", f"<r{r_str}>", f"<c{c_str}>"
            ])
        # Terminate if action parsing fails
        except Exception as e:
            print(f"[Fail] {round_str}. Error parsing action: {e}.")
            break

        # Update board state
        try:
            current_board.execute_action(sudoku_action)
        # Terminate if action execution fails
        except Exception as e:
            print(f"[Fail] {round_str}. Error executing action: {e}")
            break

        ###############################
        ## Solution-dependent checks ##
        ###############################

        # Check correctness
        action_row, action_col = sudoku_action.coordinates[0]
        ref = solution_board.get_cell(action_row, action_col).value.value
        hyp = sudoku_action.value.value 
        if hyp == ref:
            print(f"[Pass] {round_str}.")
            num_correct_placements += 1
        # Terminate if incorrect placement
        else:
            print(f"[Fail] {round_str}. Incorrect placement at {action_row}, {action_col}.")
            break

        # Teriminate if all cells are filled
        if '.' not in current_board.to_ascii(unfilled="."):
            print(f"[Pass] {round_str}. All cells filled.")
            break

    ##########################
    ## Final solution match ##
    ##########################

    # Check if solution is correct
    final_board_ascii = current_board.to_ascii(unfilled=".")
    final_solved = 1 if (final_board_ascii == solution_ascii) else 0

    return {
        # From input
        "data_source": args.dataset,
        "puzzle_id": request["puzzle_id"],
        "model": args.model_save_name if args.model_save_name else model,
        "num_empty_cells": request["num_empty_cells"],
        "shuffle_seed": request["shuffle_seed"],
        "n_response_idx": request["n_response_idx"],
        "n_history_turns": n_history_turns,
        "setting": setting,
        "initial_board": request["initial_board"],
        # From output
        "conversation": json.dumps(history_conversation),
        "num_rounds": round_idx + 1,
        "num_correct_placements": num_correct_placements,
        "final_solved": final_solved,
        "final_board": final_board_ascii,
    }


async def process_one_single_shot(
    args: argparse.Namespace,
    client: Union[Any],
    request: Dict,
    model: str,
    tokenizer: Optional[AutoTokenizer] = None,
) -> Dict:
    # Load data
    rules = request["rules"]
    initial_board_ascii = request["initial_board"]
    solution_ascii = request["solution"]
    rows = request["rows"]
    cols = request["cols"]
    visual_elements = request["visual_elements"]
    if pd.isna(visual_elements) or visual_elements == "":
        visual_elements = None
    n_history_turns = request["n_history_turns"] # Keep for consistency in output format

    # Construct setting string (simplified for single-shot)
    settings = ["single-shot"]
    if request["num_empty_cells"] > 0:
        settings.append(f"{request['num_empty_cells']}-empty-{request['shuffle_seed']}-seed")
    setting = "_".join(settings)

    # Pretty print visual elements
    pretty_visual_elements = None
    if visual_elements is not None:
        try:
            visual_elements = json.loads(visual_elements)
            pretty_visual_elements = pretty_print_visual_elements(visual_elements)
        except json.JSONDecodeError:
            print(f"Warning: Could not parse visual_elements for puzzle {request['puzzle_id']}")
            visual_elements = None # Set to None if parsing fails

    # Construct the single prompt
    one_shot_prompt = jinja2.Template(ONE_SHOT_PROMPT).render(
        rows=rows,
        cols=cols,
        rules=rules,
        pretty_visual_elements=pretty_visual_elements,
        current_board=initial_board_ascii,
    )

    # Single conversation turn
    input_conversation = [{"role": "user", "content": one_shot_prompt}]

    # Call API
    assistant_response = await call_api(
        args=args,
        client=client,
        model=model,
        tokenizer=tokenizer,
        messages=input_conversation,
    )

    parsed_answer = ""
    final_solved = 0

    if assistant_response:
        # Update conversation history (just this single turn)
        conversation = input_conversation + [{"role": "assistant", "content": assistant_response}]

        # Extract answer from <ANSWER> tags
        match = re.search(r"<ANSWER>(.*?)</ANSWER>", assistant_response, re.DOTALL | re.IGNORECASE)
        if match:
            answer_content = match.group(1)
            # Extract only digits
            parsed_answer = "".join(filter(str.isdigit, answer_content))
            # Check if parsed answer matches solution
            if parsed_answer == solution_ascii:
                final_solved = 1
                print(f"[Pass] Puzzle {request['puzzle_id']} solved correctly.")
            else:
                print(f"[Fail] Puzzle {request['puzzle_id']} incorrect.")
        else:
            print(f"[Fail] Puzzle {request['puzzle_id']}. No <ANSWER> tag found in response.")
            conversation = input_conversation # Record only user prompt if assistant failed
    else:
        print(f"[Fail] Puzzle {request['puzzle_id']}. No response from server.")
        conversation = input_conversation # Record only user prompt if assistant failed


    return {
        # From input
        "data_source": args.dataset,
        "puzzle_id": request["puzzle_id"],
        "model": args.model_save_name if args.model_save_name else model,
        "num_empty_cells": request["num_empty_cells"],
        "shuffle_seed": request["shuffle_seed"],
        "n_response_idx": request["n_response_idx"],
        "n_history_turns": n_history_turns, # Retained for consistency
        "setting": setting,
        "initial_board": request["initial_board"],
        # From output
        "conversation": json.dumps(conversation),
        "num_rounds": 1, # Single shot = 1 round
        "num_correct_placements": final_solved, # Treat solved as 1 correct 'placement'
        "final_solved": final_solved,
        "final_board": parsed_answer, # The parsed digit string from the response
    }


async def process_batch(
    args: argparse.Namespace,
    requests: List[Dict],
    client: Union[Any],
    model: str,
    tokenizer: Optional[AutoTokenizer] = None,
    batch_size: int = 1,
    process_func: callable = process_one
) -> List[Dict]:
    semaphore = asyncio.Semaphore(batch_size)
    async def process_with_semaphore(request):
        async with semaphore:
            return await process_func(
                args=args,
                client=client,
                request=request,
                model=model,
                tokenizer=tokenizer,
            )
    
    tasks = [process_with_semaphore(request) for request in requests]
    outputs = []
    
    # Process requests with progress bar
    with tqdm(total=len(tasks), desc="Processing requests") as pbar:
        for coro in asyncio.as_completed(tasks):
            result = await coro
            if result:
                 outputs.append(result)
            pbar.update(1)
    
    return outputs


def construct_request(
    puzzle_id: str,
    author: str,
    rules: str,
    visual_elements: Optional[str],
    initial_board: str,
    solution: str,
    rows: int,
    cols: int,
    num_empty_cells: int,
    shuffle_seed: Optional[int],
    n_response_idx: int,
    n_history_turns: int,
) -> Optional[Dict]:
    # Fill hints if needed
    if num_empty_cells > 0:
        initial_board = random_fill_hints(
            initial_board,
            solution,
            num_empty_cells,
            shuffle_seed,
        )
        if initial_board is None:
            return None
    return {
        "puzzle_id": puzzle_id,
        "author": author,
        "rules": rules,
        "visual_elements": visual_elements,
        "initial_board": initial_board,
        "solution": solution,
        "rows": rows,
        "cols": cols,
        "num_empty_cells": num_empty_cells,
        "shuffle_seed": shuffle_seed,
        "n_response_idx": n_response_idx,
        "n_history_turns": n_history_turns,
    }
    

def main():
    parser = argparse.ArgumentParser(description="Evaluate LLM on Sudoku puzzles.")

    # Filepaths
    parser.add_argument("--dataset", type=str, required=True, choices=["challenge_100", "nikoli_100", "ctc"],
                        help="Dataset to evaluate on.")
    parser.add_argument("--output_csv", type=str, required=True,
                        help="Output CSV path.")
    
    # Subset of puzzles to evaluate
    parser.add_argument("--iloc_start", type=int, default=0,
                        help="Start index of puzzles to evaluate.")
    parser.add_argument("--iloc_end", type=int, default=None,
                        help="End index of puzzles to evaluate (exclusive).")
    parser.add_argument("--ilocs", type=int, nargs="+",
                        help="Specific puzzle indices to evaluate. Overrides start/end.")

    # Eval setting
    parser.add_argument("--mode", type=str, default="multi_round", choices=["multi_round", "single_shot"],
                        help="Evaluation mode: multi-round interaction or single-shot completion.")
    # The number of evaluations for each puzzle is the product of the following four arguments.
    parser.add_argument("--num_empty_cells", type=int, nargs="+", default=[0, 10, 20],
                        help="Number of empty cells in the intial board after hint fill in random cells. "
                             "0 means the original board.")
    parser.add_argument("--shuffle_seeds", type=int, nargs="+", default=[0],
                        help="Shuffle seeds for the random hint fill. Only used if num_empty_cells > 0.")
    parser.add_argument("--n_response_idxs", type=int, nargs="+", default=[0],
                        help="If you want to run multiple trials per puzzle/hint/seed. E.g., [0,1,2,3,4] for 5 runs.")
    parser.add_argument("--n_history_turns", type=int, nargs="+", default=[5],
                        help="Number of history turns to include in each LLM prompt. -1 means full history.")

    # Model
    parser.add_argument("--api", type=str, default="openai",
                        choices=["openai", "anthropic", "anthropic_bedrock", "deepseek", "vllm", "togetherai", "openrouter"],
                        help="API to use.")
    parser.add_argument("--model", type=str, required=True,
                        help="Model name or path.")
    parser.add_argument("--model_save_name", type=str,
                        help="Model name in saved result. If not provided, use --model.")
    parser.add_argument("--max_tokens", type=int, default=8192,
                        help="Max tokens in each LLM response.")
    parser.add_argument("--temperature", type=float, default=0.1,
                        help="LLM temperature.")
    parser.add_argument("--top_p", type=float, default=0.95,
                        help="Top-p sampling probability.")
    parser.add_argument("--top_k", type=int, default=40,
                        help="Top-k sampling.")
    parser.add_argument("--batch_size", type=int, default=16,
                        help="Batch size for parallel processing.")
    parser.add_argument("--max_retries", type=int, default=3,
                        help="Max retries for API calls.")
    parser.add_argument("--retry_delay", type=float, default=5.0,
                        help="Delay (in second) between retries.")

    # vLLM specific
    parser.add_argument("--tensor_parallel_size", type=int, default=1,
                        help="Tensor parallel size for vLLM.")
    parser.add_argument("--pipeline_parallel_size", type=int, default=1,
                        help="Pipeline parallel size for vLLM.")
    parser.add_argument("--draft_model", type=str,
                        help="Use the draft model.")
    
    args = parser.parse_args()

    # Sanity check
    assert args.num_empty_cells != [0] or len(args.shuffle_seeds) == 1, \
        "shuffle_seed is only used when providing hints (i.e. num_empty_cells > 0)."
    if args.mode == "single_shot" and args.n_history_turns != [5]:
         print("Warning: --n_history_turns is ignored in single_shot mode.")
         args.n_history_turns = [0]

    # Load puzzle
    dataset = datasets.load_dataset("SakanaAI/Sudoku-Bench", args.dataset, split="test")
    
    # Use a subset of puzzles if specified
    if args.ilocs is not None:
        ilocs = args.ilocs
    else:
        end_idx = args.iloc_end if args.iloc_end is not None else len(dataset)
        ilocs = range(args.iloc_start, end_idx)
    puzzle_rows = [dataset[i] for i in ilocs]
    print(f"Number of puzzles to evaluate: {len(puzzle_rows)}")

    # Construct requests
    requests = []
    for puzzle_row in puzzle_rows:
        for nhist in args.n_history_turns:
            for ne in args.num_empty_cells:
                for sseed in args.shuffle_seeds:
                    for nr_idx in args.n_response_idxs:
                        request = construct_request(
                            puzzle_id=puzzle_row["puzzle_id"],
                            author=puzzle_row["author"],
                            rules=puzzle_row["rules"],
                            visual_elements=puzzle_row["visual_elements"],
                            initial_board=puzzle_row["initial_board"],
                            solution=puzzle_row["solution"],
                            rows=puzzle_row["rows"],
                            cols=puzzle_row["cols"],
                            num_empty_cells=ne,
                            shuffle_seed=sseed,
                            n_response_idx=nr_idx,
                            n_history_turns=nhist,
                        )
                        if request is not None:
                            requests.append(request)
    print(f"Number of requests to process: {len(requests)}")

    # Setup client
    tokenizer = None
    if args.api == "openai":
        client = openai.AsyncOpenAI(
            api_key=os.environ.get("OPENAI_API_KEY"),
        )
    elif args.api == "openrouter":
        client = openai.AsyncOpenAI(
            api_key=os.environ.get("OPENROUTER_API_KEY"),
            base_url="https://openrouter.ai/api/v1",
        )
    elif args.api == "anthropic":
        client = anthropic.AsyncAnthropic(
            api_key=os.environ.get("ANTHROPIC_API_KEY"),
        )
    elif args.api == "anthropic_bedrock":
        client = anthropic.AsyncAnthropicBedrock(
            aws_access_key=os.getenv("AWS_ACCESS_KEY"),
            aws_secret_key=os.getenv("AWS_SECRET_KEY"),
            aws_region=os.getenv("AWS_REGION"),
        )
    elif args.api == "deepseek":
        client = openai.AsyncOpenAI(
            api_key=os.environ.get("DEEPSEEK_API_KEY"),
            base_url="https://api.deepseek.com",
        )
    elif args.api == "togetherai":
        client = openai.AsyncOpenAI(
            api_key=os.environ.get("TOGETHER_API_KEY"),
            base_url="https://api.together.xyz/v1",
        )
    elif args.api == "googleai": # Add googleai client setup
        client = genai.Client(api_key=os.environ.get("GOOGLE_API_KEY"))
    elif args.api == "vllm":
        client = AsyncLLMEngine.from_engine_args(
            AsyncEngineArgs(
                model=args.model,
                gpu_memory_utilization=0.9,
                tensor_parallel_size=args.tensor_parallel_size,
                pipeline_parallel_size=args.pipeline_parallel_size,
                enable_chunked_prefill=False if args.draft_model else True,
                max_num_batched_tokens=None if args.draft_model else 8192,
                enable_prefix_caching=False if "gemma" in args.model else True,
                enforce_eager=True,
                speculative_model=args.draft_model,
                num_speculative_tokens=5 if args.draft_model else None,
            )
        )
        tokenizer = AutoTokenizer.from_pretrained(args.model)
        
    # Select processing function based on mode
    process_func = process_one if args.mode == "multi_round" else process_one_single_shot
    print(f"Running in {args.mode} mode.")

    # Process batch using the selected function
    all_results = asyncio.run(process_batch(
        args=args,
        batch_size=args.batch_size,
        requests=requests,
        client=client,
        tokenizer=tokenizer,
        model=args.model,
        process_func=process_func # Pass the selected function
    ))

    # Convert results to DataFrame
    if not all_results: # Check if list is empty
        print("No results generated. Exiting.")
        return # Exit if no results
    res_df = pd.DataFrame(all_results)
    if len(res_df) == 0:
        print("No results to save. DataFrame is empty.")
        return

    # Print summary
    # We'll measure average number of correct placements and fraction of puzzles solved.
    group_cols = ["num_empty_cells", "setting", "model"]
    agg_metrics = {"final_solved": "mean"}
    if args.mode == "multi_round":
         # Only include multi-round specific metrics if in that mode
         agg_metrics["num_correct_placements"] = "mean"

    # Ensure columns exist before aggregation
    existing_cols = [col for col in group_cols if col in res_df.columns]
    if not existing_cols:
         print("Grouping columns not found in results DataFrame. Cannot generate summary.")
         summary_str = "Summary could not be generated."
    else:
        summary = (
            res_df
            .groupby(existing_cols)
            .agg(agg_metrics)
            .reset_index()
        )
        with pd.option_context("display.max_rows", None, "display.precision", 3):
             summary_str = summary.to_string()

    print("\\n--- Summary ---")
    print(summary_str)
    print("---------------")


    # Save results to CSV
    os.makedirs(os.path.dirname(args.output_csv), exist_ok=True)
    res_df.to_csv(args.output_csv, index=False)
    print(f"\nResults saved to {args.output_csv}")


if __name__ == "__main__":
    main()