"""
SudokuPad Puzzle Extraction Utility

This module provides functionality to extract puzzle data from SudokuPad.app,
including metadata, rules, visual elements, and board state. It can convert
a SudokuPad URL into a structured puzzle representation.
"""

import argparse
import sys
import json
from pathlib import Path
from typing import List
import re
from pprint import pprint

# Local puzzle_data utils
sys.path.append(str(Path(__file__).parent.parent.parent.resolve()))
from sudokupad_interaction.app import load_sudokupad, WINDOW_WIDTH, WINDOW_HEIGHT
from sudokupad_interaction.puzzle_tools.puzzle_encoding import fetch_puzzle
from sudokupad_interaction.puzzle_tools.visual_elements import extract_visual_elements


# JavaScript to extract basic puzzle data from SudokuPad
PUZZLE_DATA_JS = """
function getPuzzleData() {
    const puzzle = Framework.app.puzzle.currentPuzzle;
    // If puzzle or puzzle.id is missing, return null so we handle in Python
    if (!puzzle || !puzzle.id) {
        return null;
    }
    return {
        puzzle_id: puzzle.id || "",
        author: puzzle.author || "",
        title: puzzle.title || "",
        solution: puzzle.solution || "",
        rules: JSON.stringify(puzzle.rules || ""),
        rows: String(Framework.app.grid.rows || ""),
        cols: String(Framework.app.grid.cols || ""),
        givens: JSON.stringify(puzzle.givens || ""),
        has_fog: String('hideclue' in Framework.app.puzzle.cells[0]) || "",
    };
}
return getPuzzleData();
"""


def execute_safe(js_func: str) -> str:
    """
    Creates a JavaScript wrapper that safely executes and serializes function results,
    handling circular references in JavaScript objects.
    """
    return f"""
    function safeStringify(obj) {{
        const seen = new WeakSet();
        return JSON.stringify(obj, (key, value) => {{
            if (typeof value === "object" && value !== null) {{
                if (seen.has(value)) {{
                    return undefined; // Omit circular references
                }}
                seen.add(value);
            }}
            return value;
        }}, 2); // Optional: Add indentation for readability
    }}
    var result = {js_func};
    return safeStringify(result);
    """

def convert_givens_to_string(givens: List[str], rows: int, cols: int, blank_char: str = ".") -> str:
    """
    Converts SudokuPad's "givens" format (list of r1c1=val strings) to a simple string representation.
    """
    size = rows * cols
    grid = [blank_char] * size
    pattern = re.compile(r"^r(\d+)c(\d+)=(\d+)$")

    for item in givens:
        m = pattern.match(item)
        if m:
            r, c, val = m.groups()
            rr = int(r) - 1
            cc = int(c) - 1
            idx = rr * cols + cc
            if 0 <= idx < size:
                grid[idx] = val
    return "".join(grid)


def extract_puzzle_from_sudokupad(driver) -> dict:
    """
    Extracts comprehensive puzzle data from an active SudokuPad session.
    
    This function retrieves puzzle metadata, rules, visual elements, and board state
    from a currently loaded SudokuPad puzzle in the browser.
    
    Args:
        driver: Selenium WebDriver instance with SudokuPad loaded
        
    Returns:
        Dictionary containing structured puzzle data including:
        - puzzle_id: Unique identifier
        - author: Puzzle creator
        - title: Puzzle name
        - rules: Puzzle solving rules (JSON string)
        - initial_board: Starting board state as a string
        - solution: Solution board if available
        - rows/cols: Grid dimensions
        - visual_elements: Special visual elements (JSON string)
    """
    puzzle_data = driver.execute_script(PUZZLE_DATA_JS)
    current_puzzle = json.loads(driver.execute_script(execute_safe('Framework.app.puzzle.currentPuzzle')))
    source_puzzle = json.loads(driver.execute_script(execute_safe('Framework.app.sourcePuzzle')))
    visual_elements = extract_visual_elements(source_puzzle, current_puzzle, int(puzzle_data['rows']), int(puzzle_data['cols']))
    puzzle_data["visual_elements"] = json.dumps(visual_elements)
    initial_board = convert_givens_to_string(puzzle_data["givens"], int(puzzle_data['rows']), int(puzzle_data['cols']))
    puzzle_data["initial_board"] = initial_board
    
    # patch rules
    rules = json.loads(puzzle_data["rules"])
    if isinstance(rules, list) and rules:
        rules = rules[0]
    puzzle_data["rules"] = json.dumps(rules)

    # keep entries:
    puzzle_data = {
        "puzzle_id": puzzle_data["puzzle_id"],
        "author": puzzle_data["author"],
        "title": puzzle_data["title"],
        "rules": puzzle_data["rules"],
        "initial_board": puzzle_data["initial_board"],
        "solution": puzzle_data["solution"],
        "rows": puzzle_data["rows"],
        "cols": puzzle_data["cols"],
        "visual_elements": puzzle_data["visual_elements"],
    }

    return puzzle_data


def main():
    """
    Command-line interface for converting SudokuPad URLs to puzzle data.

    Example usage of extracting puzzle data from a SudokuPad URL. 
    """
    parser = argparse.ArgumentParser(description="Convert SudokuPad URLs to puzzle data")
    parser.add_argument("--sudokupad-url", type=str, help="SudokuPad URL to convert")
    args = parser.parse_args()

    encoded_puzzle = fetch_puzzle(args.sudokupad_url.split("sudokupad.app/")[1])
    driver = load_sudokupad(encoded_puzzle, WINDOW_WIDTH, WINDOW_HEIGHT)

    # get puzzle data
    puzzle_data = extract_puzzle_from_sudokupad(driver)
    pprint(puzzle_data)

    # close driver
    driver.quit()

if __name__ == "__main__":
    main()