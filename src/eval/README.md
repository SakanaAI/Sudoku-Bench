# Sudoku-Bench LLM Evaluation

This directory contains code for evaluating Large Language Models (LLMs) on the [Sudoku-Bench](https://huggingface.co/datasets/SakanaAI/Sudoku-Bench) dataset. The evaluation framework enables testing various LLMs' abilities to solve Sudoku puzzles through a multi-round interaction format.

## Overview

The evaluation process works as follows:

1. The LLM is presented with a Sudoku puzzle through a carefully crafted prompt
2. The LLM responds with a single cell placement (e.g., `r3c6: 5`)
3. The framework validates this placement against the known solution
4. If correct, the updated board is sent back to the LLM for the next placement
5. The process continues until the puzzle is solved or an incorrect placement is made

## Requirements

- Python 3.10+
- Required packages
  ```bash
  pip install -r requirements.txt
  ```

## Usage

### Basic Usage

```bash
# Set required environment variables
export OPENAI_API_KEY="your_openai_api_key"
export DATASET="challenge_100"
export API="openai"
export MODEL="gpt-4o-mini-2024-07-18"

# Run evaluation
python -m eval.run \
    --dataset ${DATASET} \
    --output_csv ../data/benchmark_results/${DATASET}/${MODEL}.csv \
    --api ${API} \
    --model ${MODEL} \
    --batch_size 20
```

### Command-Line Arguments

#### Dataset Selection
- `--dataset`: Dataset to evaluate on. Choices: `"challenge_100"`, `"nikoli_100"`, `"ctc"`. Required.
- `--output_csv`: Path to save results. Required.

#### Puzzle Selection
- `--iloc_start`: Start index of puzzles to evaluate (default: 0)
- `--iloc_end`: End index of puzzles to evaluate (exclusive) (default: None - use all puzzles)
- `--ilocs`: Specific puzzle indices to evaluate (overrides start/end)

#### Evaluation Parameters
- `--num_empty_cells`: Number of empty cells in the initial board after hint fill (default: [0, 10, 20])
  - 0 means using the original board without additional hints
  - Values > 0 will randomly fill hints from the solution, leaving specified number of cells empty
- `--shuffle_seeds`: Random seeds for hint placement (default: [0])
- `--n_response_idxs`: Multiple trials per puzzle/hint/seed combination (default: [0])
- `--n_history_turns`: Number of conversation history turns to include (default: [5])
  - -1 means include full conversation history

#### Model Configuration
- `--api`: API provider to use. Choices: `"openai"`, `"anthropic"`, `"anthropic_bedrock"`, `"deepseek"`, `"vllm"`, `"togetherai"`. Default: `"openai"`.
- `--model`: Model name or path. Required.
- `--model_save_name`: Model name in the saved results. If not provided, uses `--model`.
- `--max_tokens`: Maximum tokens in each LLM response (default: 8192)
- `--temperature`: Sampling temperature (default: 0.1)
- `--top_p`: Top-p sampling probability (default: 0.95)
- `--top_k`: Top-k sampling (default: 40)
- `--batch_size`: Batch size for parallel processing (default: 16)
- `--max_retries`: Maximum number of retries for API calls (default: 3)
- `--retry_delay`: Delay between retries in seconds (default: 5.0)

#### vLLM-Specific Parameters
- `--tensor_parallel_size`: Tensor parallel size for vLLM (default: 1)
- `--pipeline_parallel_size`: Pipeline parallel size for vLLM (default: 1)
- `--draft_model`: Optional draft model path for speculative decoding

### Environment Variables

Depending on the API you're using, you'll need to set the appropriate environment variables:

- For OpenAI API: `OPENAI_API_KEY`
- For Anthropic API: `ANTHROPIC_API_KEY`
- For AWS Bedrock: `AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `AWS_REGION`
- For DeepSeek API: `DEEPSEEK_API_KEY`
- For Together AI: `TOGETHERAI_API_KEY`

## Output Format

The evaluation produces a CSV file with the following columns:

- `data_source`: Source dataset name
- `puzzle_id`: Identifier for the puzzle
- `model`: Model name used for evaluation
- `num_empty_cells`: Number of empty cells in the board
- `shuffle_seed`: Random seed used for hint placement
- `n_response_idx`: Trial index
- `n_history_turns`: Number of history turns used
- `setting`: Settings used for the evaluation
- `conversation`: Full conversation history as JSON
- `num_rounds`: Number of rounds completed
- `num_correct_placements`: Number of correct cell placements
- `final_solved`: 1 if puzzle was completely solved, 0 otherwise
- `final_board`: Final state of the board

## Summarizing Results

After running evaluations, you can use the `summarize.py` script to analyze results:

```bash
python summarize.py \
    --input_dir ../data/benchmark_results \
    --output_dir ../reports
```

This generates an HTML report with performance visualizations and detailed tables.

## Prompt Format

The system uses the following prompt components:
- `RULE_PROMPT`: Describes the Sudoku rules and visual elements
- `BOARD_PROMPT`: Shows the current board state
- `PREFILLED_ASSISTANT_RESPONSE`: Initial LLM response

The framework supports standard Sudoku rules as well as visual variants with additional constraints.
