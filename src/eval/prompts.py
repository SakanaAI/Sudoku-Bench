RULE_PROMPT = """You are a professional Sudoku puzzle solver. Please work out the solution to the puzzle below.

## Puzzle Description ##
We will provide you with a Sudoku puzzle.
- Each row must contain the digits 1 through 9 exactly once.
- Each column must contain the digits 1 through 9 exactly once.
- Each 3x3 sub-grid (box) must contain the digits 1 through 9 exactly once.

## Format Explanation ##
Coordinates:
- We will use r{x}c{y} coordinates. For example, r1c1 is the top-left cell at row 1 column 1, r1c2 is the cell to the right at row 1 column 2, r2c1 is the cell below at row 2 column 1, and so on.
{%- if pretty_visual_elements %}

Visual Elements:
- Any visual elements will be described in text using rxcy coordinates.
- Please note the visual elements will be described as-is. If a thermo or arrow appears on the board, the location of the circle or bulb will be listed, and the line or arrow will be listed as a separate object. But you can infer they are part of the same object by their coordinates.
- If a visual element is described as "between" two cells, it means the visual element appears on the edge between the two cells.
- In some puzzles there may be visual elements outside of the grid and these will be described using the same coordinate system. For example an arrow in r0c1 pointing to the lower right means there is an arrow above r1c1 that points in the direction of the diagonal: r1c2, r2c3, etc.
{%- endif %}

## Tips ##
In solving the puzzle it often helps to understand that there exists a unique solution.
It therefore helps to focus on what values must be forced given the puzzle constraints, and given the fact that the solution is unique.
You should try to commit a single value to a cell.

## Size ## 
{{rows}} x {{cols}}

## Rules ##
{{rules}}
{%- if pretty_visual_elements %}

## Visual Elements ##
{{pretty_visual_elements}}
{%- endif %}

## Answer Format ##
In order to make progress on the puzzle, you must answer by providing a value to any currently empty cells.

Put your answer within tags <ANSWER></ANSWER>. For example, if you wanted to place a 5 in r1c1, you would respond with
<ANSWER>
r1c1: 5
</ANSWER>
at the very end of your response.

You only need to make a single placement in your response, as long as you are confident that the placement is correct.
""".strip()


PREFILLED_ASSISTANT_RESPONSE = """
I'm ready to help solve this Sudoku puzzle! I'll analyze the board carefully using logical deduction techniques and constraint propagation to find definite placements.

For each step, I'll:
1. Examine the current board state
2. Apply Sudoku solving techniques (naked singles, hidden singles, etc.)
3. Identify cells with definite values
4. Provide clear reasoning for my placement

When I find a definite value for a cell, I'll provide my answer in the required format:
<ANSWER>
rXcY: Z
</ANSWER>

Let's begin when you share the puzzle board!
""".strip()


BOARD_PROMPT = """
## Current Board ##
{{current_board}}
""".strip()
