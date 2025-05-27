# Sudoku-CTC-Reasoning データ処理

このコードベースには、[Sudoku-CTC-Reasoning](https://huggingface.co/datasets/SakanaAI/Sudoku-CTC-Reasoning)の生データから言語モデル（LM）のファインチューニングに適した推論トレースデータセットを作成するためのパイプラインが含まれています。

## 概要

パイプラインは主に4つの処理ステップで構成されています：1 - インターリービング（交互配置）、2 - 位置参照解決、3 - アクショングループ化、4 - アクション削減。

## 要件

- Python 3.10+
- 必要なパッケージ
  ```bash
  pip install -r requirements.txt
  ```

## Sudoku-CTC-Reasoningデータセット

Sudoku-CTC-Reasoningデータセットには、[Cracking the Cryptic](https://www.youtube.com/c/CrackingTheCryptic) YouTubeチャンネルで紹介された2565パズルの推論トレースが含まれており、数独ゲームでの推論や、より広範囲の推論集約型タスクを学習するための言語モデル（LM）のトレーニングに豊富な学習信号を提供します。

生のCTCデータは、1）動画のWhisper ASR（自動音声認識）トランスクリプトと2）動画から抽出された数独アクションの別々の記録の形式で提供されており、そのままではLMのトレーニングに直接使用できません。このコードベースは、生データをLMのファインチューニングに適したデータセットに処理するためのパイプラインを提供します。

## パイプライン

![CTCデータ処理の例](https://github.com/user-attachments/assets/1b98e70d-a822-42b1-a677-f9ddb2c8fe96)

### 0. 処理可能なパズルの抽出

生データを処理する前に、まずLMのトレーニングに適さないパズルを除外します。パズルが適さない理由はいくつかあります。
- 数独アクションとボードをエンコードするために[一連の文法](#lm-sudoku-grammar)を考案しました（例：`<vl><value1><r5><c3>`は5行3列に数字1を入力するアクションを表します）。これにより、言語モデリングのために推論トレースに適切に線形化して統合できます。しかし、CTCパズルには非標準のバリアントが含まれており、現在の文法ではカバーされていない多くのエッジケースが生じます。そのため、現在の文法と互換性のないパズルを除外します。
- 一部のCTCパズルでは、作者が解答を公開しないことを決めており、抽出された数独アクションの正確さを検証することが難しくなっています。これらのパズルも除外します。

```bash
python -m data_processing.extract_processable_raw_data \
    --output_filepath ../data/executable.jsonl
```

### 1. インターリービング（交互配置）

インターリービングステップでは、タイムスタンプに基づいてWhisper ASRトランスクリプトと数独アクションを単一のトークンシーケンスに結合します。同時に、アクションは文法に基づいてトークンのシーケンスに線形化されます。

```bash
python -m data_processing.interleave \
    --input_filepath ../data/executable.jsonl \
    --output_filepath ../data/interleaved.jsonl
```

### 2. 位置参照解決

位置参照解決ステップでは、インターリーブされたデータを処理して、解説内の暗黙的な位置参照を解決します。多くの場合、数独ソルバーは座標を明示的に言及せずに「このセル」や「そのケージ」などの位置を参照します。これらの参照を解決するためにLLM（大規模言語モデル）を活用します。

LLMに問い合わせる前に、まずインターリーブされたシーケンスをより短い部分に分割して、LLMの最大コンテキストウィンドウを超えないようにします。特に、以下のスクリプトを実行して、50アクションごとにシーケンスを分割します：

```bash
python -m data_processing.insert_boards \
    --input_filepath ../data/interleaved.jsonl \
    --output_filepath ../data/processing/interleaved.w_boards.jsonl \
    --num_action_interval 50
```

次に、各セグメント内の位置参照を解決するために、vLLM経由のローカルLLMまたはAPI経由のリモートLLMに問い合わせます。`resolve_position_reference_prompts.py`からのワンショット例プロンプトを使用してクエリを構築します。また、フォーマットと元のアクションとの同等性をチェックすることでLLM出力を検証します。失敗したクエリはログに記録され、追加の位置参照解決ラウンドにカスケードできます。

```bash
python -m data_processing.resolve_position_reference \
    --input_filepath ../data/processing/interleaved.w_boards.jsonl \
    --output_filepath ../data/processing/interleaved.w_boards.rpr.jsonl \
    --output_board \
    --api vllm \
    --tensor_parallel_size 2 \
    --model RekaAI/reka-flash-3
```

### 3. アクショングループ化

このステップでは、解説とアクションが頻繁に入り混じることを避けたいと考えています。そのために、近接したアクションをグループ化し、対応する解説文の最後に配置します。`adjust_action_position_prompts.py`からのワンショット例プロンプトを使用してLLMに問い合わせます。同様に、LLM出力を検証し、このステップを複数回実行することができます。

```bash
python -m data_processing.adjust_action_position \
    --input_filepath ../data/processing/interleaved.w_boards.rpr.jsonl \
    --output_filepath ../data/processing/interleaved.w_boards.aap.jsonl \
    --output_board \
    --api vllm \
    --tensor_parallel_size 2 \
    --model RekaAI/reka-flash-3
```

### 4. アクション削減

上記のLLM依存ステップの後、ボードを削除し、セグメントを単一のシーケンスに戻します。

```bash
python -m data_processing.remove_boards \
    --input_filepath ../data/processing/interleaved.w_boards.aap.jsonl \
    --output_filepath ../data/processing/interleaved.wo_boards.jsonl
```

セル位置情報はテキスト内でほとんど復元されているため、他の情報量の多いアクションに焦点を当てるために、データからセル選択/選択解除（`<sl>`、`<ds>`）アクションを削除することを選択します。

```bash
python -m data_processing.reduce_actions \
    --input_filepath ../data/processing/interleaved.wo_boards.jsonl \
    --output_filepath ../data/processing/interleaved.wo_boards.jsonl
```

## LM数独文法

私たちの文法は、数独アクションとボード状態を角括弧内のトークンとしてエンコードします。この構造化された表現により、言語モデルは自然言語による説明と形式的な数独操作の両方を学習し生成することができます。

### アクショントークン

数独アクションは以下の文法を使用してエンコードされます：

- `<sl>`: 選択（Select）- セルを選択する（低レベルUIオペレーション用）
- `<ds>`: 選択解除（Deselect）- セルの選択を解除する
- `<vl>`: 値の配置（Value placement）- セルに数字を配置する
- `<pm>`: ペンシルマーク（Pencilmark）- 角の表記を配置する
- `<cd>`: 候補（Candidate）- セルに候補を追加する
- `<co>`: 色（Color）- セルに色を付ける
- `<cl>`: クリア（Clear）- セルから値/候補/ペンシルマーク/色をクリアする

### 位置トークン

位置は行と列のトークンでエンコードされます：

- `<r1>` から `<r9>`: 行インデックス
- `<c1>` から `<c9>`: 列インデックス
- `<r1c3>`: 結合された行列位置（--combine_positionフラグ使用時）

### 値トークン

値は以下でエンコードされます：

- `<value1>` から `<value9>`: 数字の値
- `<value.>`: 空のセル

### セル表現

セルは `{Position}:{Value}/{Candidates}/{Pencilmarks}` で表現されます。ここで、
- `{Position}` は位置トークンを使用
- `{Value}` は1つの値トークン
- `{Candidates}` は1つ以上の値トークン
- `{Pencilmarks}` は1つ以上の値トークン
- 現在のバージョンでは色は無視します。

### ボード表現

ボード状態は `<board>` と `</board>` タグで囲まれ、その間には改行で区切られたセル表現があります。例えば：

```
<board>
<r1><c1>:<value.>//<value3><value4><value5>
<r1><c2>:<value.>//<value3><value5>
<r1><c3>:<value.>/<value1><value2>/
...
<r9><c9>:<value2>//
</board>
```

### アクション表現

各アクションには独自のトークン構成があります：

- **値の配置**: `<vl><value{X}>{Position}`

  例: `<vl><value5><r3><c7>` - 3行7列に値5を配置

- **候補操作**: `<cd><{Operation}><value{X}>{Position}`

  例: `<cd><+><value3><r2><c4>` - 2行4列に候補3を追加
  
  例: `<cd><-><value7><r5><c6>` - 5行6列から候補7を削除

- **ペンシルマーク操作**: `<pm><{Operation}><value{X}>{Position}`

  例: `<pm><+><value2><r4><c9>` - 4行9列にペンシルマーク2を追加
  
  例: `<pm><-><value8><r1><c3>` - 1行3列からペンシルマーク8を削除

- **色操作**: `<co><value{X}>{Position}`

  例: `<co><value3><r7><c2>` - 7行2列に色3で色付け

- **クリア操作**: `<cl><value{X}>{Position}`

  クリア操作の値：
  - `<value0>`: 値をクリア
  - `<value1>`: ペンシルマークをクリア
  - `<value2>`: 候補をクリア
  - `<value3>`: 色をクリア
  - `<value4>`: ペンマークをクリア
  - `<value5>`: すべてをクリア

  例: `<cl><value0><r6><c5>` - 6行5列の値をクリア

  例: `<cl><value5><r8><c1>` - 8行1列のすべてをクリア

- **選択操作**: `<sl>{Positions}`

  例: `<sl><r3><c9><r3><c8>` - 3行9列と3行8列のセルを選択

- **選択解除操作**: `<ds>{Positions}` または `<ds><all>`

  例: `<ds><r3><c9><r3><c8>` - 3行9列と3行8列のセルの選択を解除

  例: `<ds><all>` - すべてのセルの選択を解除
