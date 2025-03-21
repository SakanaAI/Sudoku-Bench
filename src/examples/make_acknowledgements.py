#!/usr/bin/env python
"""
Generate a markdown file acknowledging all puzzle authors and their puzzles in the Sudoku-Bench datasets.
"""

import datasets
from collections import defaultdict
import os

def main():
    # Dictionary to store authors and their puzzles
    author_puzzles = defaultdict(set)
    
    # The dataset requires a specific configuration, as shown in other examples
    # Available configurations are: "challenge_100", "nikoli_100", "ctc"
    configs = ["challenge_100", "nikoli_100", "ctc"]
    
    print(f"Processing Sudoku-Bench dataset with configurations: {configs}")
    
    # Process each configuration
    for config in configs:
        print(f"Loading configuration: {config}")
        dataset = datasets.load_dataset("SakanaAI/Sudoku-Bench", config)
        print(dataset)
        dataset = dataset["test"]
        print(f"Configuration {config} contains {len(dataset)} puzzles")
        
        # Process puzzles in this configuration
        for puzzle in dataset:
            # Extract author and title
            author = puzzle.get("author", "")
            title = puzzle.get("title", "")
            
            # Skip entries with missing info
            if not author or not title or author == "None" or title == "None":
                continue
                
            # Clean up author and title
            author = str(author).strip()
            title = str(title).strip()
            
            if author and title:  # Only add if both have content
                author_puzzles[author].add(title)
        
        print(f"Processed {len(dataset)} puzzles from {config}")
    
    # Sort authors alphabetically
    sorted_authors = sorted(author_puzzles.keys())
    
    # Write to markdown file in the current directory
    output_path = "puzzle_acknowledgements.md"
    with open(output_path, "w") as f:
        f.write("# Puzzle Acknowledgements\n\n")
        f.write("The puzzles in the Sudoku-Bench datasets were created by the following puzzle authors:\n\n")
        
        for author in sorted_authors:
            # Sort the puzzle titles for consistency
            titles = sorted(author_puzzles[author])
            titles_str = ", ".join(f'"{title}"' for title in titles)
            f.write(f"**{author}**: {titles_str}\n\n")
    
    total_authors = len(sorted_authors)
    total_puzzles = sum(len(puzzles) for puzzles in author_puzzles.values())
    
    print(f"\nGenerated acknowledgements for {total_authors} authors and {total_puzzles} unique puzzles")
    print(f"Output written to {output_path}")

if __name__ == "__main__":
    main() 