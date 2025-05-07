"""
Aggregates Sudoku benchmark results from multiple CSV files.

This script processes benchmark result CSVs located in a specified input
directory. It merges these results with puzzle metadata (including grid size),
calculates various statistics such as average solve rates and correct placements,
applies count-based thresholds, and computes weighted average solve rates across
different grid sizes.

The script outputs two main CSV files:
1.  A summary CSV: Contains aggregated statistics (solve rate, placements,
    counts) grouped by model, mode, and grid size (including a
    weighted average).
2.  A per-puzzle CSV: Provides a detailed view of each puzzle, showing the
    stop reason for each model and the total number of times each puzzle
    was solved across all models.

The input directory is expected to have a structure like:
`input_dir/data_source/mode/model_filename.csv`.
"""
# src/eval/summarize_results_to_csv.py
import argparse
import os
import sys
import pandas as pd
import datasets # Required to load original dataset for grid size info
import numpy as np
import glob
import re
from datetime import datetime
import math # For isnan check

# --- Configuration ---

# Define models and their display names (keep consistent with final display needs)
ALLOWED_MODELS_MAP = {
    "openai/o3-mini-high": "O3 Mini High",
    "gemini-2.5-pro-preview-03-25": "Gemini 2.5 Pro",
    "gemini-2.5-flash-preview-04-17": "Gemini 2.5 Flash",
    "gemini-2.0-flash-001": "Gemini 2.0 Flash",
    "gemma-3-27b-it": "Gemma 3.27B IT",
    "deepseek/deepseek-r1": "DeepSeek R1",
    "x-ai/grok-3-mini-beta": "Grok 3 Mini",
    "qwen/qwq-32b": "Qwen QwQ 32B",
    "anthropic/claude-3.7-sonnet:thinking": "Claude 3.7 Sonnet (Thinking)",
    "openai/gpt-4.1": "GPT 4.1",
    "meta-llama/llama-4-scout": "Llama 4 Scout",
    "meta-llama/llama-4-maverick": "Llama 4 Maverick",
    "qwen/qwen3-30b-a3b": "Qwen 3.30B A3B",
    "qwen/qwen3-32b": "Qwen 3.32B",
    "qwen/qwen3-235b-a22b": "Qwen 3.235B A22B",
}
ALLOWED_MODELS = list(ALLOWED_MODELS_MAP.keys())

# Modes to include
ALLOWED_MODES = ["multi_step", "single_shot"]

# Grid configuration for filtering and weighting
GRID_CONFIG = {
    '4x4': {'threshold': 15, 'weight': 15},
    '6x6': {'threshold': 15, 'weight': 15},
    '9x9': {'threshold': 70, 'weight': 70}
}
REQUIRED_GRIDS_FOR_WEIGHTED_AVG = set(GRID_CONFIG.keys())
TOTAL_WEIGHT = sum(config['weight'] for config in GRID_CONFIG.values())

# Helper to derive potential filename pattern from canonical model name
def get_filename_pattern(canonical_name):
    pattern = canonical_name.replace('/', '_').replace(':', '_')
    return pattern

# Create a reverse map from potential filename patterns to canonical names
FILENAME_TO_CANONICAL_MAP = {get_filename_pattern(k): k for k in ALLOWED_MODELS_MAP.keys()}


# --- Helper Functions (Adapted from summarize_for_md.py) ---

def load_metadata_with_grid_size():
    """Loads metadata from all Sudoku-Bench datasets and adds grid size."""
    all_metadata = []
    # Only load necessary datasets for metadata
    dataset_configs = {
        "SakanaAI/Sudoku-Bench": "challenge_100",
        # Add nikoli/ctc if their puzzle_ids are present in results
        # "SakanaAI/Sudoku-Bench": "nikoli_100",
        # "SakanaAI/Sudoku-Bench": "ctc",
    }
    print(f"Attempting to load metadata for datasets: {list(dataset_configs.values())}")
    loaded_successfully = []
    for repo_id, config_name in dataset_configs.items():
        try:
            # Prioritize trust_remote_code=True if scripts depend on it
            try:
                ds = datasets.load_dataset(repo_id, config_name, split="test", trust_remote_code=True)
            except Exception as load_err_trust:
                print(f"Load with trust_remote_code=True failed for {repo_id}/{config_name}, trying without. Error: {load_err_trust}")
                ds = datasets.load_dataset(repo_id, config_name, split="test")

            df = ds.to_pandas()
            # Keep only essential columns for merge
            required_cols = ["puzzle_id", "rows", "cols", "title", "sudokupad_url"]
            if not all(col in df.columns for col in required_cols):
                print(f"Warning: Dataset {repo_id}/{config_name} missing columns ({required_cols}). Skipping.")
                continue

            df['puzzle_id'] = df['puzzle_id'].astype(str).str.strip()
            df['rows'] = pd.to_numeric(df['rows'], errors='coerce')
            df['cols'] = pd.to_numeric(df['cols'], errors='coerce')
            df.dropna(subset=['rows', 'cols', 'puzzle_id'], inplace=True)
            df['rows'] = df['rows'].astype(int)
            df['cols'] = df['cols'].astype(int)

            df = df[required_cols] # Select only needed cols
            df['data_source'] = config_name # Use config name as data source identifier
            all_metadata.append(df)
            loaded_successfully.append(f"{repo_id}/{config_name}")
        except Exception as e:
            print(f"Warning: Could not load metadata for dataset {repo_id}/{config_name}: {e}")
            # Add specific error handling hints if needed

    if not all_metadata:
        print("Error: No metadata could be loaded. Cannot determine grid sizes.")
        return None

    print(f"Successfully loaded metadata for: {loaded_successfully}")
    metadata_df = pd.concat(all_metadata, ignore_index=True)
    metadata_df['grid_size'] = metadata_df['rows'].astype(str) + 'x' + metadata_df['cols'].astype(str)
    # Keep relevant columns for merging
    metadata_df = metadata_df[
        ['puzzle_id', 'rows', 'grid_size', 'data_source', 'title', 'sudokupad_url']
    ].drop_duplicates(subset=['puzzle_id', 'data_source'])
    print(f"Generated metadata with {len(metadata_df)} unique puzzle_id/data_source combinations.")
    return metadata_df


def load_all_results(input_dir, exclude_keywords):
    """Load all CSV results, adding mode and model info from path."""
    all_dfs = []
    pattern = os.path.join(input_dir, "**", "*.csv")
    csv_filepaths = glob.iglob(pattern, recursive=True)
    print(f"Searching for CSV files in {input_dir}...")

    processed_files = 0
    skipped_files = 0
    checked_paths = 0

    for csv_file in csv_filepaths:
        checked_paths += 1
        if checked_paths % 500 == 0: print(f"Checked {checked_paths} paths...")

        normalized_path = os.path.normpath(csv_file)
        if any(exclude in normalized_path for exclude in exclude_keywords):
            skipped_files += 1
            continue

        try:
            parts = normalized_path.split(os.sep)
            if len(parts) < 4:
                skipped_files += 1
                continue

            filename = parts[-1]
            mode = parts[-2] # Expect mode to be the parent directory
            data_source = parts[-3] # Expect data_source to be grandparent

            # Skip if mode is not allowed early
            if mode not in ALLOWED_MODES:
                skipped_files += 1
                continue

            # Robust Model Name Mapping
            base_model_name_from_file = filename.replace(".csv", "")
            full_model_name = FILENAME_TO_CANONICAL_MAP.get(base_model_name_from_file)

            # Handle specific known discrepancies if direct map fails
            if full_model_name is None:
                 if base_model_name_from_file == 'anthropic_claude-3.7-sonnet_thinking':
                     full_model_name = 'anthropic/claude-3.7-sonnet:thinking'
                 # Add more specific fallbacks if needed

            if full_model_name is None or full_model_name not in ALLOWED_MODELS:
                skipped_files += 1
                continue

            df_part = pd.read_csv(csv_file, low_memory=False) # Use low_memory=False for potentially mixed types

            # --- Data Cleaning & Type Enforcement ---
            required_cols_for_load = ['puzzle_id', 'num_correct_placements', 'final_solved', 'stop_reason', 'setting']
            if not all(col in df_part.columns for col in ['puzzle_id', 'final_solved']): # Minimum requirement
                 print(f"Warning: Skipping {normalized_path}, missing essential columns 'puzzle_id' or 'final_solved'.")
                 skipped_files += 1
                 continue

            df_part['puzzle_id'] = df_part['puzzle_id'].astype(str).str.strip()

            # Handle potentially missing columns needed for aggregation
            for col in ['num_correct_placements']:
                if col in df_part.columns:
                    df_part[col] = pd.to_numeric(df_part[col], errors='coerce')
                else:
                    df_part[col] = np.nan # Add as NaN if missing

            # Final_solved is crucial
            df_part['final_solved'] = pd.to_numeric(df_part['final_solved'], errors='coerce')

            # Ensure other needed columns exist, fill with default if necessary
            if 'stop_reason' not in df_part.columns: df_part['stop_reason'] = 'unknown'
            if 'setting' not in df_part.columns: df_part['setting'] = 'unknown'


            # Add extracted/standardized info
            df_part['data_source'] = data_source # Use inferred from path
            df_part['mode'] = mode
            df_part['model'] = full_model_name # Use the mapped full model name

            # Select only columns needed downstream + keys for merging/grouping
            cols_to_keep = ['puzzle_id', 'model', 'mode', 'data_source',
                            'num_correct_placements', 'final_solved', 'stop_reason', 'setting']
            existing_cols = [col for col in cols_to_keep if col in df_part.columns]

            all_dfs.append(df_part[existing_cols])
            processed_files += 1

        except pd.errors.EmptyDataError:
            skipped_files += 1
        except Exception as e:
            print(f"Warning: Could not read or process file {normalized_path}: {e}")
            skipped_files += 1

    print(f"\nChecked {checked_paths} paths total.")
    print(f"Successfully processed {processed_files} relevant CSV files.")
    if skipped_files > 0:
        print(f"Skipped {skipped_files} files due to exclusions, errors, structure, or unmapped/disallowed models/modes.")

    if not all_dfs:
        print("No valid CSV data could be loaded for allowed models and modes.")
        return None

    combined_df = pd.concat(all_dfs, ignore_index=True)
    print(f"Combined DataFrame has {len(combined_df)} rows before cleaning.")

    # --- Post-Concatenation Cleaning ---
    combined_df.dropna(subset=['puzzle_id', 'model', 'mode', 'data_source', 'final_solved'], inplace=True)
    # Fill NaN placements with 0 only AFTER ensuring rows are valid
    combined_df['num_correct_placements'] = combined_df['num_correct_placements'].fillna(0)
    # Ensure final_solved is float for mean calculation
    combined_df['final_solved'] = combined_df['final_solved'].astype(float)

    print(f"DataFrame shape after cleaning: {combined_df.shape}")

    return combined_df

# --- Main Execution Logic ---

def main(args):
    try:
        # --- 1. Load Raw Data ---
        print("Loading results...")
        combined_df = load_all_results(args.input_dir, args.exclude)
        if combined_df is None or combined_df.empty:
            print("No data loaded. Exiting.")
            return

        # --- 2. Load Metadata ---
        print("Loading metadata...")
        metadata_df = load_metadata_with_grid_size()
        if metadata_df is None:
            print("Could not load metadata. Grid size analysis will be incomplete. Exiting.")
            return

        # --- 3. Merge Data ---
        print("Merging results with metadata...")
        combined_df['puzzle_id'] = combined_df['puzzle_id'].astype(str).str.strip()
        metadata_df['puzzle_id'] = metadata_df['puzzle_id'].astype(str).str.strip()
        combined_df['data_source'] = combined_df['data_source'].astype(str).str.strip()
        metadata_df['data_source'] = metadata_df['data_source'].astype(str).str.strip()

        df_merged = pd.merge(
            combined_df,
            metadata_df[['puzzle_id', 'data_source', 'grid_size', 'title', 'sudokupad_url']].drop_duplicates(),
            on=['puzzle_id', 'data_source'],
            how="left"
        )

        missing_grid_info = df_merged['grid_size'].isnull().sum()
        if missing_grid_info > 0:
            print(f"Warning: Could not find grid size/metadata for {missing_grid_info} result rows after merge.")
            df_merged = df_merged.dropna(subset=['grid_size'])
            print(f"Dropped rows with missing grid size. Remaining rows: {len(df_merged)}")

        if df_merged.empty:
            print("No data remaining after merging with metadata and dropping NaNs. Exiting.")
            return

        print(f"Data ready for aggregation: {len(df_merged)} rows.")

        # --- 4. Aggregate Results (Per Grid Size) ---
        print("Aggregating results per grid size...")
        group_cols = ["model", "mode", "grid_size"] # Group by these

        agg_summary = df_merged.groupby(group_cols).agg(
            # Use np.mean directly for potentially all-NaN slices
            avg_correct_placements=('num_correct_placements', lambda x: np.mean(x) if not x.isnull().all() else np.nan),
            avg_solve_rate=('final_solved', lambda x: np.mean(x) if not x.isnull().all() else np.nan),
            count=('final_solved', 'size') # Count entries per group
        ).reset_index()

        print("Aggregation per grid complete.")
        print(agg_summary.head().to_string()) # Print head for debugging

        # --- 5. Apply Count Threshold ---
        print(f"Applying count thresholds: { {g: c['threshold'] for g, c in GRID_CONFIG.items()} }")
        agg_thresholded = agg_summary.copy()
        rows_nulled = 0
        for grid, config in GRID_CONFIG.items():
            mask = (agg_thresholded['grid_size'] == grid) & (agg_thresholded['count'] < config['threshold'])
            rows_nulled += mask.sum()
            agg_thresholded.loc[mask, ['avg_correct_placements', 'avg_solve_rate']] = np.nan
        if rows_nulled > 0:
            print(f"Set metrics to NaN for {rows_nulled} model/mode/grid combinations due to count threshold.")


        # --- 6. Calculate Weighted Average Solve Rate ---
        print("Calculating weighted average solve rates...")
        weighted_avg_data = []
        for mode in ALLOWED_MODES:
            for model, group in agg_thresholded[agg_thresholded['mode'] == mode].groupby('model'):
                weighted_sum = 0.0
                total_actual_weight = 0.0
                sufficient_data = True
                relevant_rates = {}

                for grid in REQUIRED_GRIDS_FOR_WEIGHTED_AVG:
                    rate_series = group.loc[group['grid_size'] == grid, 'avg_solve_rate']
                    # Check if grid exists and has a non-NaN solve rate
                    if rate_series.empty or pd.isna(rate_series.iloc[0]):
                        sufficient_data = False
                        break
                    relevant_rates[grid] = rate_series.iloc[0]

                w_avg_solve_rate = np.nan
                if sufficient_data:
                    weighted_sum = sum(relevant_rates[grid] * GRID_CONFIG[grid]['weight'] for grid in REQUIRED_GRIDS_FOR_WEIGHTED_AVG)
                    w_avg_solve_rate = weighted_sum / TOTAL_WEIGHT

                weighted_avg_data.append({
                    'model': model,
                    'mode': mode,
                    'grid_size': 'Weighted Avg',
                    'avg_correct_placements': np.nan, # N/A for weighted avg row
                    'avg_solve_rate': w_avg_solve_rate,
                    'count': np.nan # N/A
                })

        weighted_avg_df = pd.DataFrame(weighted_avg_data)

        # --- 7. Combine Aggregated and Weighted Average Data ---
        final_aggregated_df = pd.concat([agg_thresholded, weighted_avg_df], ignore_index=True)

        # Add display names
        final_aggregated_df['model_display'] = final_aggregated_df['model'].map(ALLOWED_MODELS_MAP).fillna(final_aggregated_df['model'])

        # Select and order columns for the final CSV
        output_cols = [
            'model', 'model_display', 'mode', 'grid_size',
            'avg_correct_placements', 'avg_solve_rate', 'count'
        ]
        final_output_df = final_aggregated_df[output_cols]

        # --- 8. Save Final Aggregated CSV ---
        os.makedirs(os.path.dirname(args.output_csv), exist_ok=True)
        final_output_df.to_csv(args.output_csv, index=False, float_format='%.4f') # Save with decent precision
        print(f"\nAggregated summary saved to: {args.output_csv}")
        print(f"Final aggregated DataFrame shape: {final_output_df.shape}")
        print("Final aggregated DataFrame head:")
        print(final_output_df.head().to_string())

        # --- 9. Save Per-Puzzle CSV ---
        os.makedirs(os.path.dirname(args.output_puzzle_csv), exist_ok=True)
        # Pivot to create a puzzle-level table: one row per puzzle+mode, columns per model with stop_reason and grid size
        puzzle_summary = df_merged.pivot_table(
            index=['puzzle_id', 'title', 'sudokupad_url', 'mode', 'grid_size'],
            columns='model',
            values='stop_reason',
            aggfunc=lambda x: x.iloc[0] if not x.empty else ''
        ).reset_index()
        # Rename grid_size to size
        puzzle_summary.rename(columns={'grid_size': 'size'}, inplace=True)
        # Compute total solved per puzzle+mode (sum of final_solved across models)
        solved_counts = df_merged.groupby(['puzzle_id', 'mode'])['final_solved'].sum().reset_index(name='total_solved')
        solved_counts['total_solved'] = solved_counts['total_solved'].astype(int)
        # Merge total_solved into the summary
        puzzle_summary = puzzle_summary.merge(solved_counts, on=['puzzle_id', 'mode'], how='left')
        # Save the wide-format puzzle CSV for the website
        puzzle_summary.to_csv(args.output_puzzle_csv, index=False)
        print(f"\nPuzzle-level summary saved to: {args.output_puzzle_csv}")
        print(f"Puzzle summary DataFrame shape: {puzzle_summary.shape}")
        # Print all unique stop reasons found in the puzzle data
        unique_reasons = sorted(df_merged['stop_reason'].unique())
        print(f"Unique stop reasons: {unique_reasons}")

    except Exception as e:
        print(f"Error in main function: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Aggregate Sudoku-Bench results from multiple CSVs into a single summary CSV.")
    parser.add_argument("--input_dir", type=str, default="../data/benchmark_results",
                        help="Base directory containing benchmark result subdirectories (default: ../data/benchmark_results). Expects structure like input_dir/data_source/mode/model_filename.csv")
    parser.add_argument("--output_csv", type=str, default="../data/summary.csv",
                        help="Path to save the final aggregated summary CSV file (default: ../data/summary.csv).")
    parser.add_argument("--output_puzzle_csv", type=str, default="../data/puzzle_summary.csv",
                        help="Path to save the per-puzzle summary CSV file (default: ../data/puzzle_summary.csv).")
    parser.add_argument("--exclude", type=str, nargs="+", default=[".ipynb_checkpoints", "_SUCCESS", ".DS_Store"],
                        help="Path keywords/filenames to exclude from loading.")
    args = parser.parse_args()
    main(args)