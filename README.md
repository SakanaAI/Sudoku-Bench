<h1 align="center">
  <b>Sudoku-Bench</b><br>
</h1>
  
<p align="center">
  🤗 <a href="https://huggingface.co/SakanaAI/Sudoku-Bench">[Sudoku-Bench puzzle dataset]</a><br>
  🤗 <a href="https://huggingface.co/SakanaAI/Sudoku-CTC-Reasoning">[Sudoku-CTC-Reasoning dataset]</a><br>
  📝 <a href="https://sakana.ai/#">[Blog Post]</a>
</p>

Welcome to **Sudoku-Bench** from [SakanaAI](https://sakana.ai/)

| **🧩 Table of Contents 🧩** |
| --------------------- |
| 🐟 [Introduction](https://github.com/SakanaAI/Sudoku-Bench?tab=readme-ov-file#introduction) |
| 🐟 [The **Sudoku-Bench** puzzle dataset](https://github.com/SakanaAI/Sudoku-Bench?tab=readme-ov-file#the-sudoku-bench-puzzle-dataset) |
| &nbsp;&nbsp;🐡 [challenge_100 puzzle dataset](https://github.com/SakanaAI/Sudoku-Bench?tab=readme-ov-file#challenge_100-puzzle-dataset) |
| &nbsp;&nbsp;🐡 [nikoli_100 puzzle dataset](https://github.com/SakanaAI/Sudoku-Bench?tab=readme-ov-file#nikoli_100-puzzle-dataset) |
| &nbsp;&nbsp;🐡 [ctc puzzle dataset](https://github.com/SakanaAI/Sudoku-Bench?tab=readme-ov-file#ctc-puzzle-dataset) |
| 🐟 [Two ways to play](https://github.com/SakanaAI/Sudoku-Bench?tab=readme-ov-file#two-ways-to-play) |
| &nbsp;&nbsp;🐡 [Method 1: Text-only](https://github.com/SakanaAI/Sudoku-Bench?tab=readme-ov-file#method-1-text-only) |
| &nbsp;&nbsp;🐡 [Method 2: SudokuPad app](https://github.com/SakanaAI/Sudoku-Bench?tab=readme-ov-file#method-2-sudokupad-app) |
| 🐟 [Getting started](https://github.com/SakanaAI/Sudoku-Bench?tab=readme-ov-file#getting-started) |
| 🐟 [Partnerships](https://github.com/SakanaAI/Sudoku-Bench?tab=readme-ov-file#partnerships) |
| 🐟 [Citation](https://github.com/SakanaAI/Sudoku-Bench?tab=readme-ov-file#citation) |

## Introduction

**Sudoku-Bench** features the kind of Sudoku puzzles featured on [Cracking the Cryptic](https://www.youtube.com/c/CrackingTheCryptic) (CTC). These Sudoku variants employ unique rulesets to evoke creative problem solving, and we believe are the perfect evaluation benchmark for AI reasoning models.

In this repository we provide tools for interfacing with these Sudoku variants and are releasing:

- **The Sudoku-Bench dataset**: a new evaluation benchmark for reasoning models
- **Baseline evaluation code**: baseline code for evaluating current LLMs in multi-turn Sudoku solving
- **SudokuPad tools**: for interfacing with the [SudokuPad](https://sudokupad.app/) app created by [Sven Neumann](https://svencodes.com/)
- **Cracking the Cryptic reasoning traces**: thousands of hours of reasoning traces from Cracking the Cryptic, including verbal reasoning transcripts and SudokuPad state-action sequences extracted directly from YouTube videos

## The **Sudoku-Bench** puzzle dataset

The [**Sudoku-Bench**](https://huggingface.co/datasets/SakanaAI/Sudoku-Bench) puzzle dataset includes 3 subsets:
- `challenge_100`: 100 Sudoku puzzles designed as a core benchmark for evaluating reasoning models
- `nikoli_100`: 100 handmade standard Sudoku puzzles offered by [Nikoli](https://www.nikoli.co.jp/en/)
- `ctc`: 2565 puzzles featured in the CTC channel

### `challenge_100` puzzle dataset

![Image](https://github.com/user-attachments/assets/a9a117e4-818b-4739-a46a-3f567e5fdca1)

`challenge_100` includes:
- 15 4×4 puzzles
- 15 6×6 puzzles
- 50 9×9 puzzles
- 20 of the more difficult standard Sudoku puzzles from the `nikoli_100` set

The `challenge_100` is designed to evaluate models on a diverse set of logical and creative reasoning. The 50 9×9 puzzles were selected by the hosts of CTC. These puzzles range broadly in difficulty--from elegantly simple to extremely challenging--to thoroughly test AI reasoning capabilities.

The 4×4 and 6×6 puzzles offer an easier on-ramp for reasoning models, maintaining the creative qualities of the larger puzzles, but alleviating some need for long-context reasoning.

### `nikoli_100` puzzle dataset

![Image](https://github.com/user-attachments/assets/5a670d14-af67-4a11-8063-988c529f8d9e)

We partnered with [Nikoli](https://www.nikoli.co.jp/en/), the Japanese puzzle company that popularized Sudoku in the 1980s, to curate a set of 100 beautiful handmade standard Sudoku puzzles.

### `ctc` puzzle dataset

![Image](https://github.com/user-attachments/assets/18023272-7eee-4a34-a1fb-2eb75211e80f)

The `ctc` dataset contains 2565 puzzles featured in the CTC channel.

## Two ways to play

We provide two ways to interact with **Sudoku-Bench** puzzles.

#### Text-only
  - Use a text representation of each puzzle. The simplest way to evaluate any LLM on **Sudoku-Bench**.

#### SudokuPad app
  - Use the SudokuPad game engine in-the-loop. This allows for:
    - Screenshots of the sudoku board for VLM-based models
    - Note-taking methods that are commonly used by human solvers such as pencil marks for candidate digits and color-coding of cells

### Method 1: Text-only

<p align="center"><img width="500" alt="Image" src="https://github.com/user-attachments/assets/cec5a3ed-1462-4c66-9443-8b095b0d72f1" /></p>

<p align="center">
  <sub><a href="https://sudokupad.app/6bxd0ipaky">"Differences Count - part 1" by Sujoyku and Marty Sears</a></sub>
</p>

Sudoku variants like those seen in **Sudoku-Bench** contain unique rules and visual elements.

Each puzzle in **Sudoku-Bench** includes a structured text representation of its visual elements using `rxcy` coordinate notation. This is stored in the `visual_elements` field of each puzzle. Together with the `rules` and `initial_board` fields, one can construct a text-only prompt. This text-based representation facilitates easy evaluation and integration with LLMs without the need for visual processing.

See the end-to-end evaluation example in [`src/eval`](src/eval).

### Method 2: SudokuPad app

<p align="center"><img width="500" alt="Image" src="https://github.com/user-attachments/assets/ffb7b7c3-49b7-4eba-be8b-965da7bae551" /></p>

The [SudokuPad](https://sudokupad.app/), created by [Sven Neumann](https://svencodes.com/) is a popular puzzle app that hosts thousands of Sudoku puzzles. SudokuPad enables standard puzzle-solving strategies, such as pencil marking candidate digits and cell color-coding.

See the SudokuPad tools provided in [`src/sudokupad_interaction`](src/sudokupad_interaction).

## Getting started

To get started, navigate to

### Datasets
- **Sudoku-Bench** on Hugging Face: [SakanaAI/Sudoku-Bench](https://huggingface.co/datasets/SakanaAI/Sudoku-Bench)
- **Cracking the Cryptic (CTC) reasoning traces** on Hugging Face: [SakanaAI/Sudoku-CTC-Reasoning](https://huggingface.co/datasets/SakanaAI/Sudoku-CTC-Reasoning)

### This repository
- [src/eval](src/eval) for example of how to evaluate LLMs on **Sudoku-Bench** text representations of puzzles
- [src/sudokupad_interaction](src/sudokupad_interaction) for tools for interacting with the SudokuPad app
- [src/ctc_processing](src/ctc_processing) for processing the CTC reasoning traces in an LM-compatible format

## Partnerships

This project is in partnership with [Cracking the Cryptic](https://www.youtube.com/c/CrackingTheCryptic). We are grateful to [Nikoli](https://www.nikoli.co.jp/en/) for curating the `nikoli_100` dataset. Puzzle creators featured on CTC and in this repository are gratefully acknowledged in [acknowledgements.md](acknowledgements.md). We are grateful to [Sven Neumann](https://svencodes.com/) for help.

## Contribute

We welcome contributions to the **Sudoku-Bench**. Please note that we will not accept pull requests containing data scraped from YouTube channels or link to such data without evidence that they have explicit permission from the channel owner.

## Citation
```bibtex
@misc{seely2025sudoku-bench,
  title={{Sudoku-Bench}},
  author={Seely, Jeffrey and Imajuku, Yuki and Zhao, Tianyu and Cetin, Edoardo and Jones, Llion},
  howpublished = {\url{https://github.com/SakanaAI/Sudoku-Bench}},
  year={2025}
}
```
