# Sudoku-Bench LLM評価

このディレクトリには、[Sudoku-Bench](https://huggingface.co/datasets/SakanaAI/Sudoku-Bench)データセットで大規模言語モデル（LLM）を評価するためのコードが含まれています。この評価フレームワークは、マルチラウンドの対話形式を通じて、様々なLLMの数独パズル解決能力をテストすることを可能にします。

## 概要

評価プロセスは以下のように機能します：

1. LLMには、慎重に作成されたプロンプトを通じて数独パズルが提示されます
2. LLMは単一のセル配置（例：`r3c6: 5`）で応答します
3. フレームワークはこの配置を既知の解答と照合して検証します
4. 正しい場合、更新されたボードが次の配置のためにLLMに送り返されます
5. パズルが解かれるか、不正な配置が行われるまでプロセスは継続します

## 要件

- Python 3.10+
- 必要なパッケージ
  ```bash
  pip install -r requirements.txt
  ```

## 使用方法

### 基本的な使用法

```bash
# 必要な環境変数を設定
export OPENAI_API_KEY="your_openai_api_key"
export DATASET="challenge_100"
export API="openai"
export MODEL="gpt-4o-mini-2024-07-18"

# 評価を実行
python -m eval.run \
    --dataset ${DATASET} \
    --output_csv ../data/benchmark_results/${DATASET}/${MODEL}.csv \
    --api ${API} \
    --model ${MODEL} \
    --batch_size 20
```

### コマンドライン引数

#### データセット選択
- `--dataset`: 評価するデータセット。選択肢：`"challenge_100"`, `"nikoli_100"`, `"ctc"`。必須。
- `--output_csv`: 結果を保存するパス。必須。

#### パズル選択
- `--iloc_start`: 評価するパズルの開始インデックス（デフォルト：0）
- `--iloc_end`: 評価するパズルの終了インデックス（排他的）（デフォルト：None - すべてのパズルを使用）
- `--ilocs`: 評価する特定のパズルインデックス（開始/終了をオーバーライド）

#### 評価パラメータ
- `--num_empty_cells`: ヒント埋め込み後の初期ボードの空セル数（デフォルト：[0, 10, 20]）
  - 0は追加ヒントなしでオリジナルのボードを使用することを意味します
  - 0より大きい値は、解答からランダムにヒントを埋め、指定された数のセルを空のままにします
- `--shuffle_seeds`: ヒント配置のランダムシード（デフォルト：[0]）
- `--n_response_idxs`: パズル/ヒント/シードの組み合わせごとの複数試行（デフォルト：[0]）
- `--n_history_turns`: 含める会話履歴のターン数（デフォルト：[5]）
  - -1は完全な会話履歴を含めることを意味します

#### モデル設定
- `--api`: 使用するAPIプロバイダ。選択肢：`"openai"`, `"anthropic"`, `"anthropic_bedrock"`, `"deepseek"`, `"vllm"`, `"togetherai"`。デフォルト：`"openai"`。
- `--model`: モデル名またはパス。必須。
- `--model_save_name`: 保存される結果でのモデル名。提供されない場合、`--model`を使用。
- `--max_tokens`: 各LLM応答の最大トークン数（デフォルト：8192）
- `--temperature`: サンプリング温度（デフォルト：0.1）
- `--top_p`: トップpサンプリング確率（デフォルト：0.95）
- `--top_k`: トップkサンプリング（デフォルト：40）
- `--batch_size`: 並列処理のバッチサイズ（デフォルト：16）
- `--max_retries`: APIコールの最大リトライ回数（デフォルト：3）
- `--retry_delay`: リトライ間の遅延（秒）（デフォルト：5.0）

#### vLLM固有のパラメータ
- `--tensor_parallel_size`: vLLMのテンソル並列サイズ（デフォルト：1）
- `--pipeline_parallel_size`: vLLMのパイプライン並列サイズ（デフォルト：1）
- `--draft_model`: 投機的デコーディングのためのオプションのドラフトモデルパス

### 環境変数

使用するAPIに応じて、適切な環境変数を設定する必要があります：

- OpenAI API用：`OPENAI_API_KEY`
- Anthropic API用：`ANTHROPIC_API_KEY`
- AWS Bedrock用：`AWS_ACCESS_KEY`, `AWS_SECRET_KEY`, `AWS_REGION`
- DeepSeek API用：`DEEPSEEK_API_KEY`
- Together AI用：`TOGETHERAI_API_KEY`

## 出力形式

評価は以下の列を持つCSVファイルを生成します：

- `data_source`: ソースデータセット名
- `puzzle_id`: パズルの識別子
- `model`: 評価に使用されたモデル名
- `num_empty_cells`: ボード内の空セルの数
- `shuffle_seed`: ヒント配置に使用されたランダムシード
- `n_response_idx`: 試行インデックス
- `n_history_turns`: 使用された履歴ターン数
- `setting`: 評価に使用された設定
- `conversation`: JSONとしての完全な会話履歴
- `num_rounds`: 完了したラウンド数
- `num_correct_placements`: 正しいセル配置の数
- `final_solved`: パズルが完全に解かれた場合は1、そうでない場合は0
- `final_board`: ボードの最終状態

## 結果の要約

評価を実行した後、`summarize.py`スクリプトを使用して結果を分析できます：

```bash
python summarize.py \
    --input_dir ../data/benchmark_results \
    --output_dir ../reports
```

これにより、パフォーマンスの視覚化と詳細な表を含むHTMLレポートが生成されます。

## プロンプト形式

システムは以下のプロンプトコンポーネントを使用します：
- `RULE_PROMPT`: 数独のルールと視覚的要素を説明します
- `BOARD_PROMPT`: 現在のボード状態を表示します
- `PREFILLED_ASSISTANT_RESPONSE`: 初期LLM応答

このフレームワークは、標準的な数独ルールだけでなく、追加の制約を持つ視覚的バリアントもサポートしています。
