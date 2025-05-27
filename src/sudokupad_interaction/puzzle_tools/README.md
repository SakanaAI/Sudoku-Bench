# SudokuPadパズルツール

このディレクトリには、SudokuPadのフォーマットからパズルデータを構造化された形式に変換するためのツールが含まれています。

## パズルデータの抽出

主要なユーティリティは[`sudokupad_to_puzzle.py`](sudokupad_to_puzzle.py)の`extract_puzzle_from_sudokupad`関数で、以下のパズルデータを含む辞書を返します：
- `puzzle_id`：パズルのID
- `author`：パズルの作者
- `title`：パズルのタイトル
- `rules`：構造化されたJSON文字列としてのパズルのルール
- `initial_board`：シンプルな文字列表現としての初期盤面
- `solution`：パズルの解答
- `rows`：パズルの行数
- `cols`：パズルの列数
- `visual_elements`：パズルのビジュアル要素（線、矢印、ケージ、オーバーレイなど）

## 使用例

```python
from sudokupad_interaction.app import load_sudokupad, WINDOW_WIDTH, WINDOW_HEIGHT
from sudokupad_interaction.puzzle_tools.puzzle_encoding import fetch_puzzle
from sudokupad_interaction.puzzle_tools.sudokupad_to_puzzle import extract_puzzle_from_sudokupad
from pprint import pprint

url = "https://sudokupad.app/i9jmywmume"

encoded_puzzle = fetch_puzzle(url.split("sudokupad.app/")[1])  # エンコードされたパズルを取得
driver = load_sudokupad(encoded_puzzle, WINDOW_WIDTH, WINDOW_HEIGHT)  # オフラインブラウザでパズルを読み込む
puzzle_data = extract_puzzle_from_sudokupad(driver)
driver.quit()

pprint(puzzle_data)
```

または、ターミナルに`pprint`で出力する場合：
```bash
python sudokupad_to_puzzle.py --sudokupad-url https://sudokupad.app/i9jmywmume
```

