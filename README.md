<h1 align="center">
  <b>Sudoku-Bench（数独ベンチマーク）</b><br>
</h1>
  
<p align="center">
  🤗 <a href="https://huggingface.co/datasets/SakanaAI/Sudoku-Bench">[数独ベンチマークパズルデータセット]</a><br>
  🤗 <a href="https://huggingface.co/datasets/SakanaAI/Sudoku-CTC-Reasoning">[数独CTC推論データセット]</a><br>
  📝 <a href="https://sakana.ai/sudoku-bench">[ブログ記事]</a>
</p>

[SakanaAI](https://sakana.ai/)が開発した**Sudoku-Bench（数独ベンチマーク）**へようこそ！

| **🧩 目次 🧩** |
| --------------------- |
| 🐟 [はじめに](#はじめに) |
| 🐟 [Sudoku-Benchとは？](#sudoku-benchとは) |
| 🐟 [数独ベンチマークパズルデータセット](#数独ベンチマークパズルデータセット) |
| &nbsp;&nbsp;🐡 [challenge_100パズルデータセット](#challenge_100パズルデータセット) |
| &nbsp;&nbsp;🐡 [nikoli_100パズルデータセット](#nikoli_100パズルデータセット) |
| &nbsp;&nbsp;🐡 [ctcパズルデータセット](#ctcパズルデータセット) |
| 🐟 [利用方法：2つのアプローチ](#利用方法2つのアプローチ) |
| &nbsp;&nbsp;🐡 [方法1：テキストのみ](#方法1テキストのみ) |
| &nbsp;&nbsp;🐡 [方法2：SudokuPadアプリ](#方法2sudokupadアプリ) |
| 🐟 [使い始める](#使い始める) |
| 🐟 [パートナーシップ](#パートナーシップ) |
| 🐟 [貢献について](#貢献について) |
| 🐟 [引用](#引用) |

## はじめに

**Sudoku-Bench（数独ベンチマーク）**は、AIの推論能力を評価するための新しいベンチマークです。特に、創造的で人間らしい問題解決能力を測定することに焦点を当てています。

## Sudoku-Benchとは？

Sudoku-Benchは、[Cracking the Cryptic](https://www.youtube.com/c/CrackingTheCryptic)（CTC）で紹介されているような数独バリアント（変種数独）を特徴としています。これらの数独バリアントは独自のルールセットを採用しており、創造的な問題解決能力を引き出します。私たちは、これらがAI推論モデルを評価するための理想的なベンチマークだと考えています。

このリポジトリでは、これらの数独バリアントと連携するためのツールを提供し、以下のものをリリースしています：

- **数独ベンチマークデータセット**：推論モデルのための新しい評価ベンチマーク
- **ベースライン評価コード**：マルチターン数独解決における現在のLLM（大規模言語モデル）を評価するためのベースラインコード
- **SudokuPadツール**：[Sven Neumann](https://svencodes.com/)氏が作成した[SudokuPad](https://sudokupad.app/)アプリとの連携ツール
- **Cracking the Crypticの推論トレース**：Cracking the Crypticから抽出した数千時間の推論トレース（YouTubeビデオから直接抽出した言語的推論トランスクリプトとSudokuPadの状態-アクションシーケンスを含む）

## 数独ベンチマークパズルデータセット

[**Sudoku-Bench**](https://huggingface.co/datasets/SakanaAI/Sudoku-Bench)パズルデータセットには、以下の3つのサブセットが含まれています：
- `challenge_100`：推論モデルを評価するためのコアベンチマークとして設計された100個の数独パズル
- `nikoli_100`：[ニコリ](https://www.nikoli.co.jp/en/)が提供する100個の手作り標準数独パズル
- `ctc`：CTCチャンネルで紹介された2565個のパズル

### challenge_100パズルデータセット

![画像](https://github.com/user-attachments/assets/a9a117e4-818b-4739-a46a-3f567e5fdca1)

`challenge_100`には以下が含まれています：
- 15個の4×4パズル
- 15個の6×6パズル
- 50個の9×9パズル
- `nikoli_100`セットからより難しい標準数独パズル20個

`challenge_100`は、多様な論理的・創造的推論能力でモデルを評価するために設計されています。50個の9×9パズルはCTCのホストによって選ばれました。これらのパズルは、エレガントにシンプルなものから非常に難しいものまで、幅広い難易度を持ち、AIの推論能力を徹底的にテストします。

4×4と6×6のパズルは、推論モデルにとってより簡単な入門となり、大きなパズルの創造的な特性を維持しながらも、長いコンテキスト推論の必要性を軽減します。

### nikoli_100パズルデータセット

![画像](https://github.com/user-attachments/assets/5a670d14-af67-4a11-8063-988c529f8d9e)

私たちは、1980年代に数独を普及させた日本のパズル会社[ニコリ](https://www.nikoli.co.jp/en/)と提携し、100個の美しい手作りの標準数独パズルをキュレーションしました。

### ctcパズルデータセット

![画像](https://github.com/user-attachments/assets/18023272-7eee-4a34-a1fb-2eb75211e80f)

`ctc`データセットには、CTCチャンネルで紹介された2565個のパズルが含まれています。

## 利用方法：2つのアプローチ

**Sudoku-Bench**パズルとの対話には、2つの方法を提供しています。

#### 方法1：テキストのみ
  - 各パズルのテキスト表現を使用します。**Sudoku-Bench**でLLMを評価する最もシンプルな方法です。

#### 方法2：SudokuPadアプリ
  - SudokuPadゲームエンジンをループ内で使用します。これにより以下が可能になります：
    - VLM（視覚言語モデル）ベースのモデル用の数独ボードのスクリーンショット
    - 候補数字のペンシルマークやセルのカラーコーディングなど、人間のソルバーが一般的に使用するメモ取り方法

### 方法1：テキストのみ

<p align="center"><img width="500" alt="画像" src="https://github.com/user-attachments/assets/cec5a3ed-1462-4c66-9443-8b095b0d72f1" /></p>

<p align="center">
  <sub><a href="https://sudokupad.app/6bxd0ipaky">「Differences Count - part 1」by Sujoyku and Marty Sears</a></sub>
</p>

**Sudoku-Bench**に見られるような数独バリアントには、独自のルールと視覚的要素が含まれています。

**Sudoku-Bench**の各パズルには、`rxcy`座標表記を使用した視覚的要素の構造化されたテキスト表現が含まれています。これは各パズルの`visual_elements`フィールドに格納されています。`rules`と`initial_board`フィールドと合わせて、テキストのみのプロンプトを構築できます。このテキストベースの表現により、視覚的処理を必要とせずにLLMとの簡単な評価と統合が可能になります。

[`src/eval`](src/eval)のエンドツーエンド評価例をご覧ください。

### 方法2：SudokuPadアプリ

<p align="center"><img width="500" alt="画像" src="https://github.com/user-attachments/assets/ffb7b7c3-49b7-4eba-be8b-965da7bae551" /></p>

[Sven Neumann](https://svencodes.com/)氏が作成した[SudokuPad](https://sudokupad.app/)は、数千のパズルをホストする人気のパズルアプリです。SudokuPadは、候補数字のペンシルマークやセルのカラーコーディングなど、標準的なパズル解決戦略を可能にします。

[`src/sudokupad_interaction`](src/sudokupad_interaction)で提供されているSudokuPadツールをご覧ください。

## 使い始める

始めるには、以下にアクセスしてください：

### データセット
- Hugging Faceの**Sudoku-Bench**：[SakanaAI/Sudoku-Bench](https://huggingface.co/datasets/SakanaAI/Sudoku-Bench)
- Hugging Faceの**Cracking the Cryptic (CTC)推論トレース**：[SakanaAI/Sudoku-CTC-Reasoning](https://huggingface.co/datasets/SakanaAI/Sudoku-CTC-Reasoning)

### このリポジトリ
- [`src/eval`](src/eval)：**Sudoku-Bench**のテキスト表現でLLMを評価する方法の例
- [`src/sudokupad_interaction`](src/sudokupad_interaction)：SudokuPadアプリとの対話ツール
- [`src/ctc_processing`](src/ctc_processing)：CTC推論トレースをLM互換形式に処理するためのツール

## パートナーシップ

このプロジェクトは[Cracking the Cryptic](https://www.youtube.com/c/CrackingTheCryptic)とのパートナーシップによるものです。`nikoli_100`データセットをキュレーションしてくれた[ニコリ](https://www.nikoli.co.jp/en/)に感謝します。CTCで紹介されたパズル作成者とこのリポジトリは[acknowledgements.md](acknowledgements.md)で感謝の意を表しています。また、[Sven Neumann](https://svencodes.com/)氏のご協力に感謝します。

## 貢献について

**Sudoku-Bench**への貢献を歓迎します。YouTubeチャンネルからスクレイピングされたデータを含むプルリクエスト、またはチャンネル所有者から明示的な許可を得た証拠なしにそのようなデータへのリンクを含むプルリクエストは受け付けないことにご注意ください。

## 引用
```bibtex
@misc{seely2025sudoku-bench,
  title={{Sudoku-Bench}},
  author={Seely, Jeffrey and Imajuku, Yuki and Zhao, Tianyu and Cetin, Edoardo and Jones, Llion},
  howpublished = {\url{https://github.com/SakanaAI/Sudoku-Bench}},
  year={2025}
}
```
