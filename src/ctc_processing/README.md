# Sudoku-CTC-Reasoning Data Processing

This codebase contains the pipeline for creating a reasoning trace dataset suitable for finetuning LMs from the raw data in [Sudoku-CTC-Reasoning](https://huggingface.co/datasets/SakanaAI/Sudoku-CTC-Reasoning).

## Overview

The pipeline mainly consists of four processing steps, namely 1 - interleaving, 2 - position reference resolution, 3 - action grouping, and 4 - action pruning. 

## Requirements

- Python 3.10+
- Required packages
  ```bash
  pip install -r requirements.txt
  ```

## The Sudoku-CTC-Reasoning dataset

The Sudoku-CTC-Reasoning dataset contains the reasoning traces of 2565 puzzles featured in the [Cracking the Cryptic](https://www.youtube.com/c/CrackingTheCryptic) YouTube channel, and thus provides rich learning signals for training LMs to learn reasoning in a Sudoku game or for a broader range of reasoning-intensive tasks.

The raw CTC data comes in the form of separate records of 1) Whisper ASR transcripts of a video and 2) Sudoku actions extracted from the video, which makes it not directly usable for training LMs. This codebase provides a pipeline to process the raw data into a dataset suitable for finetuning LMs.

## Pipeline

![CTC data processing example](https://github.com/user-attachments/assets/1b98e70d-a822-42b1-a677-f9ddb2c8fe96)

### 0. Extract processable puzzles

Before processing the raw data, we first filter out the puzzles that are unsuitable for training LMs. There are several reasons that render a puzzle unsuitable.
- We devised [a set of grammar](#lm-sudoku-grammar) to encode the Sudoku actions and boards (e.g. `<vl><value1><r5><c3>` denotes the action of filling digit 5 at row 5 column 3), so they can be properly linearized and integrated into the reasoning traces for language modeling. But CTC puzzles include unstandard variants, which creates many edge cases that are not covered by our grammar. So we filter out the puzzles that are incompatible with our (current) grammar.
- In some CTC puzzles, the author decided not to disclose the solution, which makes it hard to verify the correctness of the extracted Sudoku actions. We filter out these puzzles as well.

```bash
python -m data_processing.extract_processable_raw_data \
    --output_filepath ../data/executable.jsonl
```

### 1. Interleaving

The interleaving step combines the Whisper ASR transcripts and the Sudoku actions into a single sequence of tokens, based on their timestamps. Meanwhile, the actions are linearized into a sequence of tokens based on our grammar.

```bash
python -m data_processing.interleave \
    --input_filepath ../data/executable.jsonl \
    --output_filepath ../data/interleaved.jsonl
```

### 2. Position reference resolution

The position reference resolution step processes the interleaved data to resolve implicit position references in the commentary. In many cases, the Sudoku solver refers to positions like "this cell" or "that cage" without explicitly mentioning the coordinates. We utilize LLMs to resolve these references.

Before querying LLMs, we first segment the interleaved sequence into shorter pieces to avoid exceeding an LLM's maximum context window. In particular, we segment the sequence at every 50 actions by running the following script:

```bash
python -m data_processing.insert_boards \
    --input_filepath ../data/interleaved.jsonl \
    --output_filepath ../data/processing/interleaved.w_boards.jsonl \
    --num_action_interval 50
```

Then we query LLMs -- either local LLMs via vLLM or remote LLMs via APIs -- to resolve the position references in each segment. We construct queries with a one-shot example prompt from `resolve_position_reference_prompts.py`. We also verify LLM outputs by checking their format and equivalence to the original actions. Failed queries are logged and can be cascaded to an extra round of position reference resolution.

```bash
python -m data_processing.resolve_position_reference \
    --input_filepath ../data/processing/interleaved.w_boards.jsonl \
    --output_filepath ../data/processing/interleaved.w_boards.rpr.jsonl \
    --output_board \
    --api vllm \
    --tensor_parallel_size 2 \
    --model RekaAI/reka-flash-3
```

### 3. Action grouping

In this step we want to avoid too frequently intertwined commentary and actions. We do so by grouping close actions and put them at the end of their corresponding commentary sentence. We query LLMs with a one-shot example prompt from `adjust_action_position_prompts.py`. Similarly, we verify LLM outputs and can run this step for multiple times.

```bash
python -m data_processing.adjust_action_position \
    --input_filepath ../data/processing/interleaved.w_boards.rpr.jsonl \
    --output_filepath ../data/processing/interleaved.w_boards.aap.jsonl \
    --output_board \
    --api vllm \
    --tensor_parallel_size 2 \
    --model RekaAI/reka-flash-3
```

### 4. Action pruning

After the above LLM-dependent steps, we remove the boards and revert the segments into a single sequence.

```bash
python -m data_processing.remove_boards \
    --input_filepath ../data/processing/interleaved.w_boards.aap.jsonl \
    --output_filepath ../data/processing/interleaved.wo_boards.jsonl
```

Since cell position information has been mostly restored in the text, we choose to remove cell selection/deselection (`<sl>`, `<ds>`) actions from the data to focus on other informative actions.

```bash
python -m data_processing.reduce_actions \
    --input_filepath ../data/processing/interleaved.wo_boards.jsonl \
    --output_filepath ../data/processing/interleaved.wo_boards.jsonl
```

## LM Sudoku Grammar

Our grammar encodes Sudoku actions and board states as tokens within angle brackets. This structured representation allows language models to learn and generate both natural language explanations and formal Sudoku operations.

### Action Tokens

The Sudoku actions are encoded using the following grammar:

- `<sl>`: Select - selecting a cell (for low-level UI operations)
- `<ds>`: Deselect - deselecting a cell
- `<vl>`: Value placement - placing a digit in a cell
- `<pm>`: Pencilmark - placing a corner notation
- `<cd>`: Candidate - adding a candidate to a cell
- `<co>`: Color - marking a cell with a color
- `<cl>`: Clear - clearing value/candidates/pencilmarks/colors from a cell

### Position Tokens

Positions are encoded with row and column tokens:

- `<r1>` to `<r9>`: Row indices
- `<c1>` to `<c9>`: Column indices
- `<r1c3>`: Combined row-column position (when using --combine_position flag)

### Value Tokens

Values are encoded with:

- `<value1>` to `<value9>`: Digit values
- `<value.>`: Empty cell

### Cell Representation

A cell is represented by `{Position}:{Value}/{Candidates}/{Pencilmarks}`, where
- `{Position}` uses the position tokens
- `{Value}` is ONE value token
- `{Candidates}` is ONE or MORE value tokens
- `{Pencilmarks}` is ONE or MORE value tokens
- We ignore color for the current version.

### Board Representation

Board states are enclosed in `<board>` and `</board>` tags, and inbetween are cell representations separated by newlines. For example:

```
<board>
<r1><c1>:<value.>//<value3><value4><value5>
<r1><c2>:<value.>//<value3><value5>
<r1><c3>:<value.>/<value1><value2>/
...
<r9><c9>:<value2>//
</board>
```

### Action Representation

Each action has its own composition of tokens:

- **Value placement**: `<vl><value{X}>{Position}`

  Example: `<vl><value5><r3><c7>` - Place value 5 at row 3, column 7

- **Candidate operations**: `<cd><{Operation}><value{X}>{Position}`

  Example: `<cd><+><value3><r2><c4>` - Add candidate 3 to row 2, column 4
  
  Example: `<cd><-><value7><r5><c6>` - Remove candidate 7 from row 5, column 6

- **Pencilmark operations**: `<pm><{Operation}><value{X}>{Position}`

  Example: `<pm><+><value2><r4><c9>` - Add pencilmark 2 to row 4, column 9
  
  Example: `<pm><-><value8><r1><c3>` - Remove pencilmark 8 from row 1, column 3

- **Color operations**: `<co><value{X}>{Position}`

  Example: `<co><value3><r7><c2>` - Color row 7, column 2 with color 3

- **Clear operations**: `<cl><value{X}>{Position}`

  Clear operation values:
  - `<value0>`: Clear value
  - `<value1>`: Clear pencilmarks
  - `<value2>`: Clear candidates
  - `<value3>`: Clear colors
  - `<value4>`: Clear pen marks
  - `<value5>`: Clear everything

  Example: `<cl><value0><r6><c5>` - Clear value from row 6, column 5

  Example: `<cl><value5><r8><c1>` - Clear everything from row 8, column 1

- **Selection operations**: `<sl>{Positions}`

  Example: `<sl><r3><c9><r3><c8>` - Select cells at row 3, column 9 and row 3, column 8

- **Deselection operations**: `<ds>{Positions}` or `<ds><all>`

  Example: `<ds><r3><c9><r3><c8>` - Deselect cells at row 3, column 9 and row 3, column 8

  Example: `<ds><all>` - Deselect all cells
