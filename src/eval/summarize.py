import argparse
import os
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime


def create_html_summary(summary_df, output_dir):
    """
    Convert the summary DataFrame to HTML with styling and visualizations.
    """
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # Reset index for easier manipulation
        df_reset = summary_df.reset_index()
        
        # Create plots directory
        plots_dir = os.path.join(output_dir, "plots")
        os.makedirs(plots_dir, exist_ok=True)
        
        # Generate plots
        try:
            plot_files = generate_plots(df_reset, plots_dir)
        except Exception as e:
            print(f"Error generating plots: {e}")
            plot_files = []
        
        # Format the summary table
        try:
            formatted_table = format_summary_table(summary_df)
        except Exception as e:
            print(f"Error formatting table: {e}")
            # Fallback to basic HTML conversion
            formatted_table = summary_df.to_html()
        
        # Generate model performance summary
        try:
            model_summary_html = generate_model_summary(df_reset)
        except Exception as e:
            print(f"Error generating model summary: {e}")
            model_summary_html = "<p>Error generating model performance summary.</p>"
        
        # Generate HTML content
        html_content = generate_html_content(formatted_table, plot_files, model_summary_html)
        
        # Write HTML to file
        html_path = os.path.join(output_dir, "benchmark_results.html")
        with open(html_path, "w") as f:
            f.write(html_content)
        
        print(f"HTML summary created at: {html_path}")
        return html_path
    
    except Exception as e:
        print(f"Error creating HTML summary: {e}")
        # Create a simple HTML file with just the DataFrame if all else fails
        html_path = os.path.join(output_dir, "benchmark_results_simple.html")
        with open(html_path, "w") as f:
            f.write(f"""
            <!DOCTYPE html>
            <html>
            <head>
                <title>Benchmark Results</title>
                <style>
                    table {{ border-collapse: collapse; width: 100%; }}
                    th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                    tr:nth-child(even) {{ background-color: #f2f2f2; }}
                </style>
            </head>
            <body>
                <h1>Benchmark Results</h1>
                <p>Error generating full report: {str(e)}</p>
                {summary_df.to_html()}
            </body>
            </html>
            """)
        print(f"Simple HTML summary created at: {html_path}")
        return html_path


def generate_model_summary(df_reset):
    """
    Generate summary of overall model performance and by data source.
    
    For each model:
    1) Average correct placements
    2) Average solve rate
    
    Both metrics are averaged across num_empty_cells but take max across settings.
    Also includes per num_empty_cells breakdowns.
    """
    summary_html = ""
    
    # Define a function to create a summary card
    def create_summary_card(title, summary_data, empty_cells_data=None):
        # Sort data by avg_correct_placements in descending order
        summary_data = summary_data.sort_values(by='avg_correct_placements', ascending=False)
        
        # Find min and max values for coloring
        min_placements = summary_data['avg_correct_placements'].min()
        max_placements = summary_data['avg_correct_placements'].max()
        min_solve_rate = summary_data['avg_solve_rate'].min()
        max_solve_rate = summary_data['avg_solve_rate'].max()
        
        # Start the card HTML
        card = f"""
        <div class="card summary-card">
            <div class="card-header">
                <h3>{title}</h3>
            </div>
            <div class="card-body">
                <div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead>
                            <tr>
                                <th>Model</th>
                                <th>Avg. Correct Placements</th>
                                <th>Avg. Solve Rate (%)</th>
                                <th>Best Setting</th>
        """
        
        # Add headers for each num_empty_cells value if provided
        if empty_cells_data is not None:
            # Get unique num_empty_cells values
            empty_cells_values = empty_cells_data['num_empty_cells'].unique()
            
            for val in empty_cells_values:
                card += f"""
                                <th colspan="2">Empty Cells: {val}</th>
                """
            
            # Close the first header row and add subheaders
            card += """
                            </tr>
                            <tr>
                                <th></th>
                                <th></th>
                                <th></th>
                                <th></th>
            """
            
            # Add subheaders for each empty cells value
            for _ in empty_cells_values:
                card += """
                                <th>Correct</th>
                                <th>Solve %</th>
                """
        
        # Close the header
        card += """
                            </tr>
                        </thead>
                        <tbody>
        """
        
        # Add rows for each model
        for _, row in summary_data.iterrows():
            # Calculate color intensities for gradient coloring
            # Normalize values between 0 and 1
            placement_norm = (row['avg_correct_placements'] - min_placements) / (max_placements - min_placements) if max_placements > min_placements else 0.5
            solve_rate_norm = (row['avg_solve_rate'] - min_solve_rate) / (max_solve_rate - min_solve_rate) if max_solve_rate > min_solve_rate else 0.5
            
            # Improved color palettes
            # Blues for placements - from light to dark blue
            h_p = 210  # Blue hue
            s_p = int(40 + (60 * placement_norm))  # Saturation from 40% to 100%
            l_p = int(95 - (45 * placement_norm))  # Lightness from 95% to 50%
            
            # Teals for solve rate - from light to dark teal
            h_s = 160  # Teal hue
            s_s = int(40 + (60 * solve_rate_norm))  # Saturation from 40% to 100%
            l_s = int(95 - (45 * solve_rate_norm))  # Lightness from 95% to 50%
            
            # Calculate text color (black or white) based on background lightness
            text_color_p = "#000000" if l_p > 60 else "#ffffff"
            text_color_s = "#000000" if l_s > 60 else "#ffffff"
            
            # Start the row with the main metrics
            card += f"""
                            <tr>
                                <td>{row['model']}</td>
                                <td style="background-color: hsl({h_p}, {s_p}%, {l_p}%); color: {text_color_p};">{row['avg_correct_placements']:.2f}</td>
                                <td style="background-color: hsl({h_s}, {s_s}%, {l_s}%); color: {text_color_s};">{row['avg_solve_rate']:.2f}</td>
                                <td>{row['best_setting']}</td>
            """
            
            # Add per num_empty_cells data if provided
            if empty_cells_data is not None:
                # Get unique num_empty_cells values
                empty_cells_values = empty_cells_data['num_empty_cells'].unique()
                
                for val in empty_cells_values:
                    # Filter the data for this model and num_empty_cells value
                    model_ec_data = empty_cells_data[
                        (empty_cells_data['model'] == row['model']) & 
                        (empty_cells_data['setting'] == row['best_setting']) & 
                        (empty_cells_data['num_empty_cells'] == val)
                    ]
                    
                    if not model_ec_data.empty:
                        # Get the values
                        ec_placements = model_ec_data['avg_correct_placements'].values[0]
                        ec_solve_rate = model_ec_data['avg_solve_rate'].values[0]
                        
                        # Calculate color intensities
                        ec_placement_norm = (ec_placements - min_placements) / (max_placements - min_placements) if max_placements > min_placements else 0.5
                        ec_solve_rate_norm = (ec_solve_rate - min_solve_rate) / (max_solve_rate - min_solve_rate) if max_solve_rate > min_solve_rate else 0.5
                        
                        # Colors for the per-empty-cells values
                        h_ec_p = 210  # Blue hue
                        s_ec_p = int(40 + (60 * ec_placement_norm))
                        l_ec_p = int(95 - (45 * ec_placement_norm))
                        
                        h_ec_s = 160  # Teal hue
                        s_ec_s = int(40 + (60 * ec_solve_rate_norm))
                        l_ec_s = int(95 - (45 * ec_solve_rate_norm))
                        
                        # Text colors
                        text_color_ec_p = "#000000" if l_ec_p > 60 else "#ffffff"
                        text_color_ec_s = "#000000" if l_ec_s > 60 else "#ffffff"
                        
                        card += f"""
                                <td style="background-color: hsl({h_ec_p}, {s_ec_p}%, {l_ec_p}%); color: {text_color_ec_p};">{ec_placements:.2f}</td>
                                <td style="background-color: hsl({h_ec_s}, {s_ec_s}%, {l_ec_s}%); color: {text_color_ec_s};">{ec_solve_rate:.2f}</td>
                        """
                    else:
                        # No data for this combination
                        card += """
                                <td>N/A</td>
                                <td>N/A</td>
                        """
            
            # Close the row
            card += """
                            </tr>
            """
        
        # Close the card
        card += """
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        """
        return card
    
    # First, create a copy of the DataFrame to avoid modifying the original
    summary_df = df_reset.copy()
    
    # Get list of all data sources
    data_sources = summary_df['data_source'].unique()
    
    # Get list of all num_empty_cells values
    empty_cells_values = summary_df['num_empty_cells'].unique()
    
    # 1. Overall performance across all data sources
    try:
        # For each model and setting, calculate average across all num_empty_cells and data_sources
        overall_avg = summary_df.groupby(['model', 'setting']).agg({
            ('num_correct_placements', 'mean'): 'mean',
            ('final_solved', 'mean'): 'mean'
        }).reset_index()
        
        # Rename columns for clarity
        overall_avg.columns = ['model', 'setting', 'avg_correct_placements', 'avg_solve_rate']
        
        # Convert solve rate to percentage
        overall_avg['avg_solve_rate'] = overall_avg['avg_solve_rate'] * 100
        
        # For each model, keep only the setting with the best average correct placements
        best_settings = overall_avg.loc[overall_avg.groupby('model')['avg_correct_placements'].idxmax()]
        
        # Add 'best_setting' column
        best_settings['best_setting'] = best_settings['setting']
        
        # Now prepare the per-empty-cells data
        # For each model, setting, and num_empty_cells, calculate averages
        ec_avg = summary_df.groupby(['model', 'setting', 'num_empty_cells']).agg({
            ('num_correct_placements', 'mean'): 'mean',
            ('final_solved', 'mean'): 'mean'
        }).reset_index()
        
        # Rename columns
        ec_avg.columns = ['model', 'setting', 'num_empty_cells', 'avg_correct_placements', 'avg_solve_rate']
        
        # Convert solve rate to percentage
        ec_avg['avg_solve_rate'] = ec_avg['avg_solve_rate'] * 100
        
        # Create the overall summary card with per-empty-cells breakdown
        summary_html += create_summary_card(
            "Overall Model Performance", 
            best_settings,
            ec_avg
        )
    except Exception as e:
        print(f"Error generating overall model performance summary: {e}")
        summary_html += "<p>Error generating overall model performance summary.</p>"
    
    # 2. Performance by data source
    for data_source in data_sources:
        try:
            # Filter data for this data source
            ds_data = summary_df[summary_df['data_source'] == data_source]
            
            # For each model and setting, calculate average across all num_empty_cells
            ds_avg = ds_data.groupby(['model', 'setting']).agg({
                ('num_correct_placements', 'mean'): 'mean',
                ('final_solved', 'mean'): 'mean'
            }).reset_index()
            
            # Rename columns for clarity
            ds_avg.columns = ['model', 'setting', 'avg_correct_placements', 'avg_solve_rate']
            
            # Convert solve rate to percentage
            ds_avg['avg_solve_rate'] = ds_avg['avg_solve_rate'] * 100
            
            # For each model, keep only the setting with the best average correct placements
            ds_best_settings = ds_avg.loc[ds_avg.groupby('model')['avg_correct_placements'].idxmax()]
            
            # Add 'best_setting' column
            ds_best_settings['best_setting'] = ds_best_settings['setting']
            
            # Now prepare the per-empty-cells data for this data source
            # For each model, setting, and num_empty_cells, calculate averages
            ds_ec_avg = ds_data.groupby(['model', 'setting', 'num_empty_cells']).agg({
                ('num_correct_placements', 'mean'): 'mean',
                ('final_solved', 'mean'): 'mean'
            }).reset_index()
            
            # Rename columns
            ds_ec_avg.columns = ['model', 'setting', 'num_empty_cells', 'avg_correct_placements', 'avg_solve_rate']
            
            # Convert solve rate to percentage
            ds_ec_avg['avg_solve_rate'] = ds_ec_avg['avg_solve_rate'] * 100
            
            # Create the data source summary card with per-empty-cells breakdown
            summary_html += create_summary_card(
                f"Model Performance on {data_source}", 
                ds_best_settings,
                ds_ec_avg
            )
        except Exception as e:
            print(f"Error generating model performance summary for {data_source}: {e}")
            summary_html += f"<p>Error generating model performance summary for {data_source}.</p>"
    
    return summary_html


def format_summary_table(summary_df):
    """Format the summary table for HTML display."""
    # Create a copy to avoid modifying the original
    styled_df = summary_df.copy()
    
    # Apply styling to the summary table
    styled = styled_df.style.set_table_attributes('class="table table-striped table-hover table-bordered"')
    
    # Safely get column subsets for styling
    try:
        # We need to make sure we're using the actual columns that exist in the dataframe
        # Get the actual column names
        cols = list(styled_df.columns)
        
        # Create dictionaries to map column types to color maps
        mean_cols = [col for col in cols if col[1] == 'mean']
        max_cols = [col for col in cols if col[1] == 'max']
        sum_cols = [col for col in cols if col[1] == 'sum']
        
        # Apply different color schemes to different column types
        if mean_cols:
            styled = styled.background_gradient(cmap='YlGnBu', subset=mean_cols)
        if max_cols:
            styled = styled.background_gradient(cmap='Oranges', subset=max_cols)
        if sum_cols:
            styled = styled.background_gradient(cmap='Greens', subset=sum_cols)
            
        # Format the numeric columns for mean values
        format_dict = {col: "{:.2f}" for col in mean_cols}
        styled = styled.format(format_dict)
        
    except Exception as e:
        print(f"Warning: Error applying styling to table: {e}")
        # Fallback to basic styling if advanced styling fails
        pass
    
    # Convert to HTML with escape=False to preserve the styling
    try:
        html_table = styled.to_html(escape=False)
    except Exception as e:
        print(f"Warning: Error converting styled DataFrame to HTML: {e}")
        # Fallback to basic HTML conversion
        html_table = summary_df.to_html()
    
    return html_table


def generate_plots(df_reset, plots_dir):
    """Generate visualizations for the data and save them to the plots directory."""
    plot_files = []
    
    # Set the style for all plots
    sns.set_style("whitegrid")
    plt.rcParams.update({'font.size': 12})
    
    # First, we need to handle the special case where 'Original' might have been converted
    # Copy and prepare the dataframe for plotting
    plot_df = df_reset.copy()
    
    # Convert any non-numeric values in num_empty_cells back to something we can use for plotting
    # First check if the column contains non-numeric values
    if plot_df['num_empty_cells'].dtype == 'object':
        # If 'Original' is in the column, map it back to 0 for plotting
        plot_df['num_empty_cells_numeric'] = plot_df['num_empty_cells'].replace('Original', 0)
        # Make sure it's numeric
        plot_df['num_empty_cells_numeric'] = pd.to_numeric(plot_df['num_empty_cells_numeric'])
    else:
        plot_df['num_empty_cells_numeric'] = plot_df['num_empty_cells']
    
    # Extract the values we need for plotting from the MultiIndex
    plot_df['correct_placements_mean'] = plot_df[('num_correct_placements', 'mean')]
    plot_df['final_solved_mean'] = plot_df[('final_solved', 'mean')]
    
    # Plot 1: # Correct predictions by empty cells
    plt.figure(figsize=(12, 8))
    
    # Create plot
    g = sns.catplot(
        data=plot_df,
        x="num_empty_cells",  # Keep original labels for display
        y="correct_placements_mean",
        hue="model",
        col="setting",
        kind="bar",
        height=6,
        aspect=1.2
    )
    g.set_axis_labels("Number of Empty Cells", "Average Correct Placements")
    g.fig.suptitle("# Correct predictions by Difficulty Level", y=1.05)
    g.tight_layout()
    
    # Save the plot
    plot1_path = os.path.join(plots_dir, "model_performance_by_difficulty.png")
    g.savefig(plot1_path)
    plt.close()
    plot_files.append(("# Correct predictions by Difficulty", "plots/model_performance_by_difficulty.png"))
    
    # Plot 2: Solve rate by model and setting
    plt.figure(figsize=(14, 8))
    
    g = sns.catplot(
        data=plot_df,
        x="model",
        y="final_solved_mean",
        hue="setting",
        col="num_empty_cells",
        kind="bar",
        height=6,
        aspect=1.2
    )
    g.set_axis_labels("Model", "Solve Rate")
    g.set_xticklabels(rotation=90)
    g.fig.suptitle("Solve Rate by Model and Setting", y=1.05)
    g.tight_layout()
    
    # Save the plot
    plot2_path = os.path.join(plots_dir, "solve_rate_by_model.png")
    g.savefig(plot2_path)
    plt.close()
    plot_files.append(("Solve Rate by Model and Setting", "plots/solve_rate_by_model.png"))
    
    # Plot 3: Data source comparison
    plt.figure(figsize=(12, 8))
    g = sns.catplot(
        data=plot_df,
        x="data_source",
        y="correct_placements_mean",
        hue="model",
        col="num_empty_cells",
        row="setting",
        kind="bar",
        height=4,
        aspect=1.5
    )
    g.set_axis_labels("Data Source", "Average Correct Placements")
    g.set_xticklabels(rotation=45)
    g.fig.suptitle("Performance by Data Source", y=1.05)
    
    # Get the unique data source labels
    data_source_labels = plot_df['data_source'].unique()
    
    # Add data source tick labels to x-axis in the last row
    # Get the number of rows in the FacetGrid
    n_rows = len(g.axes)
    if n_rows > 0:
        # For the last row of subplots
        last_row_idx = n_rows - 1
        for ax in g.axes[last_row_idx]:
            ax.set_xticklabels(data_source_labels, rotation=45, ha='right')
    
    g.tight_layout()
    
    # Save the plot
    plot3_path = os.path.join(plots_dir, "performance_by_data_source.png")
    g.savefig(plot3_path)
    plt.close()
    plot_files.append(("Performance by Data Source", "plots/performance_by_data_source.png"))
    
    return plot_files


def generate_html_content(formatted_table, plot_files, model_summary_html):
    """Generate the HTML content for the summary page."""
    current_time = datetime.now().strftime("%Y-%m-%d")
    
    html_template = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Sudoku-Bench Leaderboard</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
            body {{ padding: 20px; font-family: Arial, sans-serif; }}
            .header {{ margin-bottom: 30px; }}
            .section {{ margin-bottom: 40px; }}
            .plot-container {{ margin: 20px 0; text-align: center; }}
            .plot-container img {{ max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; }}
            .table-responsive {{ margin-top: 30px; }}
            .summary-card {{ margin-bottom: 20px; }}
            h2, h3 {{ color: #2c3e50; }}
            .card {{ box-shadow: 0 4px 8px rgba(0,0,0,0.1); }}
            footer {{ margin-top: 50px; text-align: center; font-size: 0.9em; color: #7f8c8d; }}
        </style>
    </head>
    <body>
        <div class="container-fluid">
            <div class="header">
                <h1 class="display-4">Sudoku-Bench Leaderboard</h1>
                <p class="lead">Comparative performance analysis of different models on <a href=https://huggingface.co/datasets/SakanaAI/Sudoku-Bench>SakanaAI/Sudoku-Bench</a></p>
                <p class="text-muted">Last updated on: {current_time}</p>
            </div>
            
            <div class="row section">
                <div class="col-12">
                    <h2>Description</h2>
                    <p>Each puzzle is tested on with different difficulty levels. The difficulty level is decided by the number of empty cells ("num_empty_cells"). When it is "original", the original puzzle is directly presented without the evaluation system prefilling any cells.</p>
                </div>
            </div>
            
            <div class="row section">
                <div class="col-12">
                    <h2>Summary</h2>
                    <p>The following tables show the overall performance of each model. The "Avg." metrics are averaged across all difficulty levels ("Empty Cells"), but we only show the best setting for each model. Results are sorted by average correct placements (highest first).</p>
                    <p>"Correct" refers to the average number of correct placements, and "Solve %" is the average solve rate across all puzzles.</p>
                    {model_summary_html}
                </div>
            </div>

            <div class="row section">
                <div class="col-12">
                    <h2>Visualizations</h2>
                    <p>These charts provide a visual representation of model performance across different dimensions.</p>
                    
                    {generate_plot_html(plot_files)}
                </div>
            </div>

            <div class="row section">
                <div class="col-12">
                    <h2>Detailed Results</h2>
                    <p>The table below presents detailed statistics for each model configuration.</p>
                    <p>"num_correct_placements" refers to the number of correct placements, and "final_solved" indicates whether the puzzle was solved or not.</p>
                    <p>"num_correct_placements" shows a column of aggregation of "max" over all puzzles under the corresponding setting, while "final_solved" shows a column of aggregation of "sum". Note that some models are tested for multiple runs on each puzzle, so the entire number of tested puzzles ("count") can be different among models.</p>
                    <div class="table-responsive">
                        {formatted_table}
                    </div>
                </div>
            </div>
            
            <footer>
                <hr>
                <p>This report was automatically generated using Python. For questions or issues, please report an issue on our Github repo <a href="https://github.com/SakanaAI/Sudoku-Bench">SakanaAI/Sudoku-Bench<a>.</p>
            </footer>
        </div>
        
        <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    </body>
    </html>
    """
    
    return html_template

def generate_plot_html(plot_files):
    """Generate HTML for plot sections with all charts in one column as requested."""
    plot_html = ""
    
    for title, path in plot_files:
        plot_html += f"""
        <div class="row mb-4">
            <div class="col-12">
                <div class="card summary-card">
                    <div class="card-header">
                        <h3>{title}</h3>
                    </div>
                    <div class="card-body">
                        <div class="plot-container">
                            <img src="{path}" alt="{title}">
                        </div>
                    </div>
                </div>
            </div>
        </div>
        """
            
    return plot_html


def main(args):
    try:
        # Retrieve all csvs in the input directory
        csv_filepaths = []
        for root, dirs, files in os.walk(args.input_dir):
            for file in files:
                if file.endswith(".csv"):
                    if any([exclude in os.path.join(root, file) for exclude in args.exclude]):
                        continue
                    csv_filepaths.append(os.path.join(root, file))
        
        if not csv_filepaths:
            print(f"No CSV files found in {args.input_dir}")
            return
            
        # Read and concatenate all csvs
        df = pd.concat([pd.read_csv(csv_file) for csv_file in csv_filepaths])

        # Filter out columns of interest
        df = df[["data_source", "model", "setting", "num_empty_cells", "num_correct_placements", "final_solved"]]
        
        # Convert "0" in "num_empty_cells" column to "Original" as requested
        df['num_empty_cells'] = df['num_empty_cells'].replace(0, 'Original')

        # Summarize the results
        group_cols = ["data_source", "num_empty_cells", "setting", "model"]
        summary = df.groupby(group_cols).agg(
            {
                "num_correct_placements": ["count", "mean", "max", "sum"],
                "final_solved": ["count", "mean", "sum"],
            }
        )
        keep_cols = [
            ("num_correct_placements", "count"),
            ("num_correct_placements", "mean"),
            ("num_correct_placements", "max"),
            ("final_solved", "count"),
            ("final_solved", "mean"),
            ("final_solved", "sum"),
        ]
        keep_cols = pd.MultiIndex.from_tuples(keep_cols)
        summary = summary[keep_cols]

        # Convert dtype of "count" and "max" columns to int
        int_cols = [col for col in summary.columns if col[1] in ["count", "max", "sum"]]
        summary[int_cols] = summary[int_cols].astype(int)

        # Print summary to console
        with pd.option_context("display.max_rows", None, "display.precision", 2):
            print(summary)
        
        # Generate HTML report if output directory is specified
        if args.output_dir:
            html_path = create_html_summary(summary, args.output_dir)
            print(f"HTML report generated at: {html_path}")
    
    except Exception as e:
        print(f"Error in main function: {e}")
        import traceback
        traceback.print_exc()   


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input_dir", type=str, required=True, help="Directory containing csv files to summarize")
    parser.add_argument("--output_dir", type=str, help="Directory to save HTML report and plots")
    parser.add_argument("--exclude", type=str, nargs="+", default=[], help="Path keywords to exclude from loading")
    args = parser.parse_args()
    main(args)