import argparse
from collections import defaultdict
from functools import partial
import json
import multiprocessing as mp
import os
import re
from typing import Tuple

from tqdm import tqdm

from sudoku_ds import (
    SudokuAction,
    SudokuBoard,
)


def extract_action_tokens(text: str) -> list[Tuple[int, list[str]]]:
    """
    Extract action tokens from the interleaved text.
    Returns a list of tuples (position, tokens) where position is the index in the text.
    """
    # Pattern to find action tokens (tokens enclosed in angle brackets)
    pattern = r"<[^>]+>"
    
    action_groups = []
    current_group = []
    current_start = -1
    
    for match in re.finditer(pattern, text):
        token = match.group(0)
        position = match.start()
        
        # Check if this is a new action (starts with action type token)
        if token.startswith("<sl>") or token.startswith("<ds>") or token.startswith("<vl>") or \
           token.startswith("<pm>") or token.startswith("<cd>") or token.startswith("<co>") or \
           token.startswith("<pe>") or token.startswith("<cl>"):
            
            # If we have tokens collected, save the previous group
            if current_group:
                action_groups.append((current_start, current_group))
            
            # Start a new group
            current_group = [token]
            current_start = position
        else:
            # Add to current group if we have one
            if current_group:
                current_group.append(token)
    
    # Add the last group if there is one
    if current_group:
        action_groups.append((current_start, current_group))
    
    return action_groups


def insert_boards(
    args: argparse.Namespace,
    text: str,
    initial_board_serialized: str,
    puzzle_data: dict,
) -> str:
    """
    Insert board states into the interleaved text at regular action intervals.
    Each board state is wrapped in <board> </board> tags, and inserted after a group of action tokens.
    """
    # Initialize the board
    board = SudokuBoard.from_serialized(
        initial_board_serialized,
        rows=puzzle_data["rows"],
        cols=puzzle_data["cols"],
    )

    # Extract action tokens and their positions
    action_groups = extract_action_tokens(text)
    
    # Track positions to insert boards
    # - Insert initial board at the start
    board_string = board.to_string()
    insertion_positions = [(0, board_string)]
    segment_stat = {
        "cur_num_actions": 0,
        "cur_num_chars": 0,
        "last_ending_position": 0,
    }
    
    # Process actions and determine where to insert boards
    for i, (position, tokens) in enumerate(action_groups):
        # Convert tokens to SudokuAction
        action = SudokuAction.from_tokens(tokens)

        # Execute the action on the board
        try:
            board.execute_action(action)
        except Exception as e:
            print(f"Error executing action: {e}")
            raise e
        
        # Try to insert a board after this action
        segment_stat["cur_num_actions"] += 1
        is_last_action = (i == (len(action_groups) - 1))
        # Condition: enough number of actions
        if (
            segment_stat["cur_num_actions"] >= args.num_action_interval
            or is_last_action
        ):
            # Find the end position of this action group
            end_position = position + len("".join(tokens))
            
            # Condition: enough number of characters
            segment_stat["cur_num_chars"] = end_position - segment_stat["last_ending_position"]
            if (
                segment_stat["cur_num_chars"] >= args.num_char_interval
                or is_last_action
            ):   
                # Condition: ends with a period without any actions in between
                # - search forward for 100 chars till the end of a sentence (ends with a period)
                search_end = min(end_position + 100, len(text))
                period_position = text.find(".", end_position, search_end)
                insertion_position = None
                if period_position != -1 and "<" not in text[end_position:period_position]:
                    insertion_position = period_position + 1
                elif is_last_action:
                    # Handle last action differently when no period is found
                    insertion_position = min(end_position + 1, len(text))
                if insertion_position is not None:
                    # Get the board representation
                    board_string = board.to_string()
                    
                    # Save position and board state
                    insertion_positions.append((insertion_position, board_string))

                    # Update segment stat
                    segment_stat["cur_num_actions"] = 0
                    segment_stat["cur_num_chars"] = 0
                    segment_stat["last_ending_position"] = insertion_position
    
    # Insert boards into the text (working backwards to not mess up positions)
    result_text = text
    for position, board_string in reversed(insertion_positions):
        # Wrap the board in markers
        board_text = f"<board>\n{board_string}\n</board>"
        
        # Insert into text
        result_text = result_text[:position] + board_text + result_text[position:]
    
    return result_text


def process_video(video_data: dict, args: argparse.Namespace) -> dict:
    """Process a single video with board insertions."""
    # Insert board states
    try:
        text = insert_boards(
            args,
            video_data["text"],
            video_data["initial_board_serialized"],
            video_data["puzzle_data"]
        )
        video_data["text"] = text
    except Exception as e:
        print(f"Error processing video: {e}")
        return None
    
    return video_data


def main(args):
    # Read interleaved data
    videos = []
    print(f"Reading interleaved data from {args.input_filepath}")
    with open(args.input_filepath, "r") as f:
        for line in f:
            video = json.loads(line)
            videos.append(video)

    # Set up multiprocessing
    print(f"Processing {len(videos)} videos using {args.num_processes} processes...")

    # Create a partial function with the interval
    process_func = partial(process_video, args=args)
    
    # Process videos in parallel
    if args.num_processes == 1:
        processed_videos = [process_func(video) for video in tqdm(videos, desc="Processing videos")]
    else:
        with mp.Pool(processes=args.num_processes) as pool:
            processed_videos = list(tqdm(
                pool.imap(process_func, videos),
                total=len(videos),
                desc="Processing videos"
            ))

    # Write processed data
    print(f"Writing results to {args.output_filepath}")
    stat = defaultdict(int)
    os.makedirs(os.path.dirname(args.output_filepath), exist_ok=True)
    with open(args.output_filepath, "w") as f:
        for video in processed_videos:
            if video is not None:
                f.write(json.dumps(video) + "\n")
                stat["valid"] += 1
            else:
                stat["invalid"] += 1
    print(stat)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    # Paths
    parser.add_argument("--input_filepath", type=str, required=True)
    parser.add_argument("--output_filepath", type=str, required=True)
    
    # Setting
    parser.add_argument("--num_action_interval", type=int, default=50)
    parser.add_argument("--num_char_interval", type=int, default=2000)
    parser.add_argument("--num_processes", type=int, default=max(1, int(0.8 * mp.cpu_count())),
        help="Number of processes to use. Default uses 80% available cores."
    )
    args = parser.parse_args()
    main(args)