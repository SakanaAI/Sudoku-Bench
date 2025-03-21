import argparse
from collections import defaultdict
import json
import multiprocessing as mp
from typing import Optional, Tuple

import datasets
from tqdm import tqdm

from sudoku_ds import (
    ValueType,
    SudokuAction,
    SudokuBoard,
)
from data_processing.utils import (
    remove_special_digits_from_action_serialized,
    remove_special_digits_from_serialized_board,
)


def process_video(video: dict) -> Tuple[str, Optional[dict]]:
    """
    Process a video from the dataset.
    """
    action_data = video["action_data"]
    rows = video["puzzle_data"]["rows"]
    cols = video["puzzle_data"]["cols"]
    solution_ascii = video["puzzle_data"]["solution"]

    initial_board_serialized = action_data[0]["serialized_state"]

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
    except:
        return "Initial board deserialization error", None

    # Execute actions
    current_board = initial_board
    solution_match = False
    for action_group in action_data:
        for action_serialized in action_group["actions"]:
            # Skip pencilmark actions
            if action_serialized.startswith("pe"):
                continue

            # Remove special digits from action serialized
            action_serialized = remove_special_digits_from_action_serialized(action_serialized, valid_digits)
            if action_serialized is None:
                continue
            
            # Deserialize action
            try:
                action = SudokuAction.from_serialized(action_serialized)
            except Exception as e:
                print(f"Action deserialization error: {e}")
                return "Action deserialization error", None

            # Execute action
            try:
                current_board.execute_action(action)
            except Exception as e:
                print(f"Action execution error: {e}")
                return "Action execution error", None

        # Compare board from execution with board from data
        current_board_serialized_from_data = action_group["serialized_state"]
        current_board_serialized_from_data = remove_special_digits_from_serialized_board(
            current_board_serialized_from_data,
            valid_digits
        )
        try:
            current_board_from_data = SudokuBoard.from_serialized(
                current_board_serialized_from_data, rows, cols
            )
        except Exception as e:
            print(f"Current board deserialization error: {e}")
            return "Current board deserialization error", None
        if current_board.to_serialized() != current_board_from_data.to_serialized():
            return "Updated board mismatch", None

        # Compare board with solution
        current_board_ascii = current_board.to_ascii()
        if current_board_ascii == solution_ascii:
            solution_match = True
            break

    # Check if solution was reached
    if not solution_match:
        return "Solution mismatch", None

    return "Success", video


def main(args):
    # Load dataset
    dataset = datasets.load_dataset("SakanaAI/Sudoku-CTC-Reasoning", "raw", split="train")

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
    with open(args.output_filepath, "w") as f:
        for video in valid_videos:
            f.write(json.dumps(video) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output_filepath", type=str, required=True)
    parser.add_argument("--num_processes", type=int, default=max(1, int(0.8 * mp.cpu_count())))
    args = parser.parse_args()
    main(args)