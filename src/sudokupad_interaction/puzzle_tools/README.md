# SudokuPad Puzzle Tools

This directory contains tools for converting puzzle data from SudokuPad's format into a structured puzzle representation.

## Extracting Puzzle Data

The primary utility is `extract_puzzle_from_sudokupad` in [`sudokupad_to_puzzle.py`](sudokupad_to_puzzle.py), which returns a dictionary containing the following puzzle data:
- `puzzle_id`: The ID of the puzzle
- `author`: The author of the puzzle
- `title`: The title of the puzzle
- `rules`: The rules of the puzzle as a structured JSON string
- `initial_board`: The initial board state as a simple string representation
- `solution`: The solution to the puzzle
- `rows`: The number of rows in the puzzle
- `cols`: The number of columns in the puzzle
- `visual_elements`: The visual elements of the puzzle (lines, arrows, cages, overlays, etc.)

## Example Usage

```python
from sudokupad_interaction.app import load_sudokupad, WINDOW_WIDTH, WINDOW_HEIGHT
from sudokupad_interaction.puzzle_tools.puzzle_encoding import fetch_puzzle
from sudokupad_interaction.puzzle_tools.sudokupad_to_puzzle import extract_puzzle_from_sudokupad
from pprint import pprint

url = "https://sudokupad.app/i9jmywmume"

encoded_puzzle = fetch_puzzle(url.split("sudokupad.app/")[1])  # Returns encoded puzzle
driver = load_sudokupad(encoded_puzzle, WINDOW_WIDTH, WINDOW_HEIGHT)  # Loads the puzzle in an offline browser
puzzle_data = extract_puzzle_from_sudokupad(driver)
driver.quit()

pprint(puzzle_data)
```

Or to `pprint` into terminal:
```bash
python sudokupad_to_puzzle.py --sudokupad-url https://sudokupad.app/i9jmywmume
```

