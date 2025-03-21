import argparse
from collections import defaultdict
import json
import multiprocessing as mp
import re
from typing import Optional, Tuple

import datasets
from tqdm import tqdm

from sudoku_ds import (
    ActionType,
    SudokuAction,
    SudokuBoard,
    ValueType,
)
from data_processing.utils import remove_special_digits_from_serialized_board


def process_video(video: dict) -> Tuple[str, Optional[dict]]:
    """
    Process a video from the dataset.
    """
    text = video["text"]
    rows = video["puzzle_data"]["rows"]
    cols = video["puzzle_data"]["cols"]
    solution_ascii = video["puzzle_data"]["solution"]
    initial_board_serialized = video["initial_board_serialized"]

    # Remove special digits from serialized board
    valid_digits = set([v.value for v in ValueType])
    initial_board_serialized = remove_special_digits_from_serialized_board(
        initial_board_serialized,
        valid_digits
    )

    # Deserialize initial board
    try:
        initial_board = SudokuBoard.from_serialized(
            initial_board_serialized, rows, cols
        )
    except Exception as e:
        return "Initial board deserialization error", None

    # Extract actions
    action_types = set([f"<{action_type.value}>" for action_type in ActionType])
    tags = re.findall(r"(<.*?>)", text)
    action_chunks, cur_chunk = [], []
    for tag in tags:
        if tag in action_types:
            if cur_chunk:
                if cur_chunk[0] not in action_types:
                    # import code
                    # code.interact(local=dict(globals(), **locals()))
                    return "Invalid action chunk", None
                if args.reduce_action:
                    if cur_chunk[0] not in ["<sl>", "<ds>"]:
                        action_chunks.append(cur_chunk)
                else:
                    action_chunks.append(cur_chunk)
                cur_chunk = []
        cur_chunk.append(tag)
    if cur_chunk:
        action_chunks.append(cur_chunk)

    # Construct SudokuAction
    actions = []
    for chunk in action_chunks:
        try:
            actions.append(SudokuAction.from_tokens(chunk))
        except Exception as e:
            print(f"Action construction error: {e}")
            return "Action construction error", None

    # Execute actions
    current_board = initial_board
    solution_match = False
    for action in actions:
        # Execute action
        try:
            current_board.execute_action(action)
        except Exception as e:
            print(f"Action execution error: {e}")
            return "Action execution error", None

    # Compare board with solution
    current_board_ascii = current_board.to_ascii()
    if current_board_ascii != solution_ascii:
        return "Solution mismatch", None

    return "Success", video


def main(args):
    # Load dataset
    dataset = []
    with open(args.input_filepath, "r") as f:
        for line in tqdm(f):
            dataset.append(json.loads(line))
    
    # Process videos
    stat = defaultdict(int)
    valid_videos = []
    if args.num_processes == 1:
        for video in tqdm(dataset):
            flag, video = process_video(video)
            stat[flag] += 1
            if video is not None:
                valid_videos.append(video)
    else:
        with mp.Pool(processes=args.num_processes) as pool:
            for result in tqdm(pool.imap_unordered(process_video, dataset), total=len(dataset)):
                flag, video = result
                stat[flag] += 1
                if video is not None:
                    valid_videos.append(video)

    # Print statistics
    for key, value in stat.items():
        print(f"{key}: {value}")

    # Save valid videos
    if args.output_filepath:
        with open(args.output_filepath, "w") as f:
            for video in valid_videos:
                f.write(json.dumps(video) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input_filepath", type=str, required=True)
    parser.add_argument("--output_filepath", type=str)
    parser.add_argument("--reduce_action", action="store_true")
    parser.add_argument("--num_processes", type=int, default=max(1, int(0.8 * mp.cpu_count())))
    args = parser.parse_args()
    main(args)