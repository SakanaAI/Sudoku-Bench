import argparse
from collections import defaultdict
from functools import partial
import json
import multiprocessing as mp
import os
from typing import Tuple

import datasets
from tqdm import tqdm

from sudoku_ds import (
    ActionType,
    SudokuAction,
    SudokuBoard,
    ValueType,
)
from data_processing.utils import (
    remove_special_digits_from_action_serialized,
    remove_special_digits_from_serialized_board,
)


def tokenize_actions(
    args: argparse.Namespace,
    action_data: list[dict],
    puzzle_data: dict,
) -> Tuple[list[dict], dict]:
    """
    Process the action data and generate tokens for actions and board states.
    Returns a tuple of (tokens, statistics)
    """
    tokens = []
    stats = defaultdict(int)
    rows = puzzle_data["rows"]
    cols = puzzle_data["cols"]
    solution_ascii = puzzle_data["solution"]

    # Remove special digits outside ValueType
    valid_digits = set([v.value for v in ValueType])

    if solution_ascii is None:
        raise ValueError("soluion missing")

    token_order_idx = 0
    ending_board_ascii = None
    for idx, item in enumerate(action_data[1:]):
        action_time = item.get("time", 0.0) or 0.0
        
        # Process actions
        local_tokens = []
        for action_idx, action_serialized in enumerate(item["actions"]):
            # Skip unnecessary action types
            action_type = action_serialized.split(":")[0]
            if action_type in ["pe"]:
                continue

            # remove special digits outside ValueType
            action_serialized = remove_special_digits_from_action_serialized(
                action_serialized, valid_digits
            )
            if action_serialized is None:
                continue

            # Create SudokuAction object
            try:
                action = SudokuAction.from_serialized(action_serialized)
            except Exception as e:
                print(f"Error creating action from serialized: {action_serialized}")
                continue

            # Get tokens
            action_tokens = action.to_tokens(combine_position=args.combine_position)

            # Add tokens with metadata
            for i, token in enumerate(action_tokens):
                local_tokens.append({
                    "type": "action",
                    "token": token,
                    "time": action_time,
                    "token_order_idx": token_order_idx,
                    "extracted_idx": item["idx"],
                })
                token_order_idx += 1
            
            stats["num_actions"] += 1
            
            # Track row/col stats
            for row, col in action.coordinates:
                stats["num_row"] = max(stats["num_row"], row)
                stats["num_col"] = max(stats["num_col"], col)
            
        # Add all local tokens to the global token list
        tokens.extend(local_tokens)

        # Check if the board is solved.
        # Ignore following actions if so.
        serialized_state = item["serialized_state"]
        if serialized_state:
            try:
                serialized_state = remove_special_digits_from_serialized_board(
                    serialized_state, valid_digits
                )
                board = SudokuBoard.from_serialized(
                    serialized_state,
                    rows=puzzle_data["rows"],
                    cols=puzzle_data["cols"]
                )
                current_board_ascii = board.to_ascii()
                if current_board_ascii == solution_ascii:
                    ending_board_ascii = current_board_ascii
                    break
            except Exception as e:
                print(f"Error processing board: {serialized_state}")
                raise ValueError("action board deserializing error")
    
    return tokens, ending_board_ascii, stats


def interleave(
    args: argparse.Namespace,
    asr_data: dict,
    action_data: list[dict],
    puzzle_data: dict
) -> Tuple[str, str, dict]:
    """
    Interleave the commentary and action data.
    """
    stat = defaultdict(int)

    # Process commentary
    commentary_words = []
    for segment in asr_data["segments"]:
        for word in segment["words"]:
            commentary_words.append({
                "type": "commentary",
                "token": word["word"],
                "time": word["start"],
            })
            stat["num_asr_words"] += 1
    
    # Process actions
    action_tokens, ending_board_ascii, action_stats = tokenize_actions(
        args,
        action_data,
        puzzle_data,
    )
    for k, v in action_stats.items():
        stat[k] = v
    
    # Truncate commentary at "Let's Get Cracking" timestamp
    lgc_timestamp = puzzle_data["lgc_timestamp"]
    commentary_words = [t for t in commentary_words if t["time"] >= lgc_timestamp]

    # Merge
    tokens = commentary_words + action_tokens

    # Sort by time and action order
    tokens.sort(key=lambda token: (token["time"], token.get("token_order_idx", 0)))

    # Generate interleaved text
    interleaved_text = "".join([t["token"] for t in tokens])

    return interleaved_text, ending_board_ascii, stat


def process_youtube_id(
    request: Tuple[str, dict, list[dict], dict],
    args: argparse.Namespace
) -> Tuple[str, dict, str]:
    """
    Process a single youtube_id.
    """
    youtube_id, asr_data, action_data, puzzle_data = request

    # Get interleaved text
    try:
        text, ending_board_ascii, stat = interleave(
            args,
            asr_data,
            action_data,
            puzzle_data
        )
    except Exception as e:
        print(f"Error processing youtube_id {youtube_id}: {e}")
        return (youtube_id, None, e.args[0])

    # Skip if solution board was not reached when tokenizing actions
    if ending_board_ascii is None:
        return (youtube_id, None, "unmatched")
    
    # Get initial board
    try:
        init_board_serialized = action_data[0].get("serialized_state")
        init_board = SudokuBoard.from_serialized(
            init_board_serialized,
            rows=puzzle_data["rows"],
            cols=puzzle_data["cols"],
        )
    except Exception as e:
        print(f"Error processing youtube_id {youtube_id}: {e}")
        return (youtube_id, None, "init board deserializing error")

    # Assign
    video_data = {
        "youtube_id": youtube_id,
        "text": text,
        "puzzle_data": puzzle_data,
        "initial_board_ascii": init_board.to_ascii(),
        "initial_board_serialized": init_board_serialized,
    }
    
    return (youtube_id, video_data, "processed")


def main(args):
    # Load action and asr data
    if args.input_filepath:
        with open(args.input_filepath, "r", encoding="utf-8") as f_in:
            dataset = [json.loads(line) for line in f_in]
    else:
        dataset = datasets.load_dataset("SakanaAI/Sudoku-CTC-Reasoning", "raw", split="train")
    
    # Process in parallel 
    if args.num_processes > 1:
        # Construct processing requests
        requests = []
        for video in tqdm(dataset, desc="Constructing requests"):
            youtube_id = video["youtube_id"]
            asr_data = video["asr_data"]
            action_data = video["action_data"]
            puzzle_data = video["puzzle_data"]
            requests.append((youtube_id, asr_data, action_data, puzzle_data))

        results = []
        pbar_stat = defaultdict(int)
        with mp.Pool(processes=args.num_processes) as pool:
            imap_it = pool.imap(
                partial(process_youtube_id, args=args),
                requests,
                chunksize=1
            )
            with tqdm(total=len(requests), desc="Processing videos") as pbar:
                for youtube_id, video_data, status in imap_it:
                    results.append((youtube_id, video_data, status))
                    pbar_stat[status] += 1
                    pbar.set_postfix(pbar_stat)
                    pbar.update(1)
    # Process sequentially
    else:
        results = []
        pbar_stat = defaultdict(int)
        with tqdm(dataset, desc="Processing videos") as pbar:
            for video in pbar:
                youtube_id, video_data, status = process_youtube_id(
                    (
                        video["youtube_id"],
                        video["asr_data"],
                        video["action_data"],
                        video["puzzle_data"],
                    ),
                    args
                )
                results.append((youtube_id, video_data, status))
                pbar_stat[status] += 1
                pbar.set_postfix(pbar_stat)
                pbar.update(1)
    
    # Print final stats
    print("\nProcessing completed. Final statistics:")
    for status, count in pbar_stat.items():
        print(f"  {status}: {count}")

    # Write results to file
    os.makedirs(os.path.dirname(args.output_filepath), exist_ok=True)
    with open(args.output_filepath, "w", encoding="utf-8") as f_out:
        for _, doc, status in results:
            if status == "processed" and doc is not None:
                f_out.write(json.dumps(doc, ensure_ascii=False) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    # Paths
    parser.add_argument("--input_filepath", type=str, required=True)
    parser.add_argument("--output_filepath", type=str, required=True)

    # Setting
    parser.add_argument("--combine_position", action="store_true")
    parser.add_argument("--num_processes", type=int, default=max(1, int(0.8 * mp.cpu_count())),
        help="Number of processes to use. Default uses 80% available cores."
    )

    args = parser.parse_args()

    main(args)