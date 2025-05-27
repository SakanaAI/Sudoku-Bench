# SudokuPad 連携

このディレクトリには、[Sven Neumann](https://svencodes.com/)氏が作成した[SudokuPadアプリ](https://sudokupad.app/)と連携するためのツールが含まれています。

## セットアップ
```sh
# Python
python -m pip install -r requirements.txt

# Docker
docker compose build
```

### フォントの準備
SudokuPadは主に[Tahomaフォント](https://learn.microsoft.com/ja-jp/typography/font-list/tahoma)を使用しています。
Dockerを使用しない場合はTahomaフォントをコンピュータにインストールするか、Dockerイメージをビルドする前にTrueTypeフォントファイルを[fonts/](./fonts/)に配置してください。
詳細は[こちら](./fonts/README.md)をご覧ください。

### パズルの読み込み
パズルを読み込むには、Sudoku-Benchデータセットの`encoded_puzzle`フィールドを使用します。

```python
import datasets

dataset = datasets.load_dataset("SakanaAI/Sudoku-Bench", "challenge_100")

puzzle = dataset['test'][70]
encoded_puzzle = puzzle['encoded_puzzle']
print(encoded_puzzle)
# sclN4SwJgXA5AzgHjAtgfQLIgMYAsCGBTAGwBk8AzAawHsB3EAFwC9k8B2ADhwBYWAjDARjABOAAwiAbJ1IBmIWx54ArP1L9F00qXEZpUADQYcEANrAAbtDr0CeCAAIAkgDs6AJ0pgArhiuUnduko7AGFKTxcQJwBzEJBXDBsYKABfPXNoHE86LEpXe3RsfAI7EgoaegYUtIsoV09E+wBlAFUAEQB5AGlmgB0nAFo7ADEQAmLsvDso13A7WmyArEmwECj6GDt+fs47GCDsnDo7JyCVtaPXPAAHPEONyLscO3dqPTsMSgJPRCc33LseJQ4AA6Pp9YLtZoAOQAKg4oQBxEIOABKwSIAFFGn0AIJOACedjO9DsDyeGDiCUmkRWhjoeA2eDgOB8BEJOWodkQOAJ70piXefjoOAeByOxLowLsOI2PLsTJwiCuNjeIFIizwl1JsrsACZSf4eYSKfEVRqtTgtQrWYS6NQgrr7v4TVSnRq7FdPAwGDZgVV0rBPlkQH57NJOLr+PxdZxw/xpLrddJ+JwUgBdAwwCCKEQGWzGYx6IsZwvFvSlvQlouVjOXEwF3MiEu5/gl/h6Jvl9utkvGXO65t6aRtvQDrtDtO93UdkvT1vl6Qzhd6Hvl4zTsfrifLzeL4eTvSeEzAGBuSjkWxQE5OPD6HlRGwQXM+EzSYGKDvvjPUJ/AtjTrBf3/PRsggds8joAxdQgABiIYDH4WCRFSE8zwvaBr1vPR70fZ86BMXV30/RRvyAgCyJAwDwIgSCMGguCEKQlDT3cdCrz8LCcNsPDXyIt8SL0H8RD/cjhOA0DqNo+j4IEJi0hY89L0wu9olwgx8OMfg+K/QSKMAsTpwkvQIKg2CZMQmDkPktClI4lSH249STC0j9CIEoSRL0fTPKMky6LMxjLOYmyMLs7DVMcl9jH4lcdI84DvPEqjjJo0yGNkoLrNY2yb3stSopc2L3L0ijfNS/z0osqzUOy0LcvChynycvsiOE4qDK80rkr86TAuqhS2OUhr8o0tqitIjrEsM7ryt6jLkLTZIgA
```

または、[このツール](https://marktekfan.github.io/sudokupad-penpa-import/)を使用してSudokuPad URLをエンコードされたパズル文字列に変換することもできます。「create URL」オプションを使用してURLを生成し、プレフィックス`https://sudokupad.app/`を削除します。

> [!Note]
> エンコードされたパズル文字列を使用する目的は（SudokuPad URLの代わりに）、SudokuPadデータベースの読み込みを避けるためです。

## 実行方法
0. サーバーを起動
```sh
# Python
python app.py

# Docker
docker compose up -d
```

1. 初期化
```python
import requests

# https://sudokupad.app/etg05f8sm8
encoded_puzzle = puzzle['encoded_puzzle']
response = requests.put("http://localhost:8000/init", json={"encoded_puzzle": encoded_puzzle})
print(response.text)
# {"initialized":"sclN4SwJgXA5AzgHjAtgfQLIgMYAsCGBTAGwBk8AzAawHsB3EAFwC9k8B2ADhwBYWAjDARjABOAAwiAbJ1IBmIWx54ArP1L9F00qXEZpUADQYcEANrAAbtDr0CeCAAIAkgDs6AJ0pgArhiuUnduko7AGFKTxcQJwBzEJBXDBsYKABfPXNoHE86LEpXe3RsfAI7EgoaegYUtIsoV09E+wBlAFUAEQB5AGlmgB0nAFo7ADEQAmLsvDso13A7WmyArEmwECj6GDt+fs47GCDsnDo7JyCVtaPXPAAHPEONyLscO3dqPTsMSgJPRCc33LseJQ4AA6Pp9YLtZoAOQAKg4oQBxEIOABKwSIAFFGn0AIJOACedjO9DsDyeGDiCUmkRWhjoeA2eDgOB8BEJOWodkQOAJ70piXefjoOAeByOxLowLsOI2PLsTJwiCuNjeIFIizwl1JsrsACZSf4eYSKfEVRqtTgtQrWYS6NQgrr7v4TVSnRq7FdPAwGDZgVV0rBPlkQH57NJOLr+PxdZxw/xpLrddJ+JwUgBdAwwCCKEQGWzGYx6IsZwvFvSlvQlouVjOXEwF3MiEu5/gl/h6Jvl9utkvGXO65t6aRtvQDrtDtO93UdkvT1vl6Qzhd6Hvl4zTsfrifLzeL4eTvSeEzAGBuSjkWxQE5OPD6HlRGwQXM+EzSYGKDvvjPUJ/AtjTrBf3/PRsggds8joAxdQgABiIYDH4WCRFSE8zwvaBr1vPR70fZ86BMXV30/RRvyAgCyJAwDwIgSCMGguCEKQlDT3cdCrz8LCcNsPDXyIt8SL0H8RD/cjhOA0DqNo+j4IEJi0hY89L0wu9olwgx8OMfg+K/QSKMAsTpwkvQIKg2CZMQmDkPktClI4lSH249STC0j9CIEoSRL0fTPKMky6LMxjLOYmyMLs7DVMcl9jH4lcdI84DvPEqjjJo0yGNkoLrNY2yb3stSopc2L3L0ijfNS/z0osqzUOy0LcvChynycvsiOE4qDK80rkr86TAuqhS2OUhr8o0tqitIjrEsM7ryt6jLkLTZIgA","serialized_state":"{\"id\":\"sxsm_MichaelLefkowitz_e78a47bc1d90064f398be51f153ff6c3\",\"time\":17,\"actions\":0,\"cells\":[\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]}","message":"Success"}
```

2. 状態の設定（**セルがハイライトされていないことを確認してください**）
```python
# `sl`アクションで終了すると、シリアライズされた状態を読み込む際にエラーが発生する可能性があります。
serialized_state = '{"cells":["3","4","2","1","1","","4","","4","1","3","2","2","3","1",""]}'
response = requests.put("http://localhost:8000/set_state", json={"serialized_state": serialized_state})
print(response.text)
# {"initialized":"sclN4SwJgXA5AzgHjAtgfQLIgMYAsCGBTAGwBk8AzAawHsB3EAFwC9k8B2ADhwBYWAjDARjABOAAwiAbJ1IBmIWx54ArP1L9F00qXEZpUADQYcEANrAAbtDr0CeCAAIAkgDs6AJ0pgArhiuUnduko7AGFKTxcQJwBzEJBXDBsYKABfPXNoHE86LEpXe3RsfAI7EgoaegYUtIsoV09E+wBlAFUAEQB5AGlmgB0nAFo7ADEQAmLsvDso13A7WmyArEmwECj6GDt+fs47GCDsnDo7JyCVtaPXPAAHPEONyLscO3dqPTsMSgJPRCc33LseJQ4AA6Pp9YLtZoAOQAKg4oQBxEIOABKwSIAFFGn0AIJOACedjO9DsDyeGDiCUmkRWhjoeA2eDgOB8BEJOWodkQOAJ70piXefjoOAeByOxLowLsOI2PLsTJwiCuNjeIFIizwl1JsrsACZSf4eYSKfEVRqtTgtQrWYS6NQgrr7v4TVSnRq7FdPAwGDZgVV0rBPlkQH57NJOLr+PxdZxw/xpLrddJ+JwUgBdAwwCCKEQGWzGYx6IsZwvFvSlvQlouVjOXEwF3MiEu5/gl/h6Jvl9utkvGXO65t6aRtvQDrtDtO93UdkvT1vl6Qzhd6Hvl4zTsfrifLzeL4eTvSeEzAGBuSjkWxQE5OPD6HlRGwQXM+EzSYGKDvvjPUJ/AtjTrBf3/PRsggds8joAxdQgABiIYDH4WCRFSE8zwvaBr1vPR70fZ86BMXV30/RRvyAgCyJAwDwIgSCMGguCEKQlDT3cdCrz8LCcNsPDXyIt8SL0H8RD/cjhOA0DqNo+j4IEJi0hY89L0wu9olwgx8OMfg+K/QSKMAsTpwkvQIKg2CZMQmDkPktClI4lSH249STC0j9CIEoSRL0fTPKMky6LMxjLOYmyMLs7DVMcl9jH4lcdI84DvPEqjjJo0yGNkoLrNY2yb3stSopc2L3L0ijfNS/z0osqzUOy0LcvChynycvsiOE4qDK80rkr86TAuqhS2OUhr8o0tqitIjrEsM7ryt6jLkLTZIgA","serialized_state":"{\"id\":\"sxsm_MichaelLefkowitz_e78a47bc1d90064f398be51f153ff6c3\",\"time\":11590,\"actions\":0,\"cells\":[\"3\",\"4\",\"2\",\"1\",\"1\",\"\",\"4\",\"\",\"4\",\"1\",\"3\",\"2\",\"2\",\"3\",\"1\",\"\"]}","message":"Success"}
```

3. ボード画像の取得
```python
from io import BytesIO
from PIL import Image

response = requests.get("http://localhost:8000/screenshot")
image = Image.open(BytesIO(response.content))
image.show()
```

4. アクション（**`sl`アクションで終了しないでください**）
```python
# `sl`アクションで終了すると、シリアライズされた状態を読み込む際にエラーが発生する可能性があります。
actions = ["sl:r2c2", "vl:2", "ds:r2c2",
           "sl:r2c4", "vl:3", "ds:r2c4",
           "sl:r4c4", "cd:4", "ds:r4c4"]
response = requests.put("http://localhost:8000/execute", json={"actions": actions})
print(response.text)
# {"initialized":"sclN4SwJgXA5AzgHjAtgfQLIgMYAsCGBTAGwBk8AzAawHsB3EAFwC9k8B2ADhwBYWAjDARjABOAAwiAbJ1IBmIWx54ArP1L9F00qXEZpUADQYcEANrAAbtDr0CeCAAIAkgDs6AJ0pgArhiuUnduko7AGFKTxcQJwBzEJBXDBsYKABfPXNoHE86LEpXe3RsfAI7EgoaegYUtIsoV09E+wBlAFUAEQB5AGlmgB0nAFo7ADEQAmLsvDso13A7WmyArEmwECj6GDt+fs47GCDsnDo7JyCVtaPXPAAHPEONyLscO3dqPTsMSgJPRCc33LseJQ4AA6Pp9YLtZoAOQAKg4oQBxEIOABKwSIAFFGn0AIJOACedjO9DsDyeGDiCUmkRWhjoeA2eDgOB8BEJOWodkQOAJ70piXefjoOAeByOxLowLsOI2PLsTJwiCuNjeIFIizwl1JsrsACZSf4eYSKfEVRqtTgtQrWYS6NQgrr7v4TVSnRq7FdPAwGDZgVV0rBPlkQH57NJOLr+PxdZxw/xpLrddJ+JwUgBdAwwCCKEQGWzGYx6IsZwvFvSlvQlouVjOXEwF3MiEu5/gl/h6Jvl9utkvGXO65t6aRtvQDrtDtO93UdkvT1vl6Qzhd6Hvl4zTsfrifLzeL4eTvSeEzAGBuSjkWxQE5OPD6HlRGwQXM+EzSYGKDvvjPUJ/AtjTrBf3/PRsggds8joAxdQgABiIYDH4WCRFSE8zwvaBr1vPR70fZ86BMXV30/RRvyAgCyJAwDwIgSCMGguCEKQlDT3cdCrz8LCcNsPDXyIt8SL0H8RD/cjhOA0DqNo+j4IEJi0hY89L0wu9olwgx8OMfg+K/QSKMAsTpwkvQIKg2CZMQmDkPktClI4lSH249STC0j9CIEoSRL0fTPKMky6LMxjLOYmyMLs7DVMcl9jH4lcdI84DvPEqjjJo0yGNkoLrNY2yb3stSopc2L3L0ijfNS/z0osqzUOy0LcvChynycvsiOE4qDK80rkr86TAuqhS2OUhr8o0tqitIjrEsM7ryt6jLkLTZIgA","serialized_state":"{\"id\":\"sxsm_MichaelLefkowitz_e78a47bc1d90064f398be51f153ff6c3\",\"time\":33372,\"actions\":9,\"cells\":[\"3\",\"4\",\"2\",\"1\",\"1\",\"2\",\"4\",\"3\",\"4\",\"1\",\"3\",\"2\",\"2\",\"3\",\"1\",\"/4\"]}","message":"Success"}
```

5. 現在の状態
```python
response = requests.get("http://localhost:8000/current_state")
print(response.text)
# {"initialized":"sclN4SwJgXA5AzgHjAtgfQLIgMYAsCGBTAGwBk8AzAawHsB3EAFwC9k8B2ADhwBYWAjDARjABOAAwiAbJ1IBmIWx54ArP1L9F00qXEZpUADQYcEANrAAbtDr0CeCAAIAkgDs6AJ0pgArhiuUnduko7AGFKTxcQJwBzEJBXDBsYKABfPXNoHE86LEpXe3RsfAI7EgoaegYUtIsoV09E+wBlAFUAEQB5AGlmgB0nAFo7ADEQAmLsvDso13A7WmyArEmwECj6GDt+fs47GCDsnDo7JyCVtaPXPAAHPEONyLscO3dqPTsMSgJPRCc33LseJQ4AA6Pp9YLtZoAOQAKg4oQBxEIOABKwSIAFFGn0AIJOACedjO9DsDyeGDiCUmkRWhjoeA2eDgOB8BEJOWodkQOAJ70piXefjoOAeByOxLowLsOI2PLsTJwiCuNjeIFIizwl1JsrsACZSf4eYSKfEVRqtTgtQrWYS6NQgrr7v4TVSnRq7FdPAwGDZgVV0rBPlkQH57NJOLr+PxdZxw/xpLrddJ+JwUgBdAwwCCKEQGWzGYx6IsZwvFvSlvQlouVjOXEwF3MiEu5/gl/h6Jvl9utkvGXO65t6aRtvQDrtDtO93UdkvT1vl6Qzhd6Hvl4zTsfrifLzeL4eTvSeEzAGBuSjkWxQE5OPD6HlRGwQXM+EzSYGKDvvjPUJ/AtjTrBf3/PRsggds8joAxdQgABiIYDH4WCRFSE8zwvaBr1vPR70fZ86BMXV30/RRvyAgCyJAwDwIgSCMGguCEKQlDT3cdCrz8LCcNsPDXyIt8SL0H8RD/cjhOA0DqNo+j4IEJi0hY89L0wu9olwgx8OMfg+K/QSKMAsTpwkvQIKg2CZMQmDkPktClI4lSH249STC0j9CIEoSRL0fTPKMky6LMxjLOYmyMLs7DVMcl9jH4lcdI84DvPEqjjJo0yGNkoLrNY2yb3stSopc2L3L0ijfNS/z0osqzUOy0LcvChynycvsiOE4qDK80rkr86TAuqhS2OUhr8o0tqitIjrEsM7ryt6jLkLTZIgA","serialized_state":"{\"id\":\"sxsm_MichaelLefkowitz_e78a47bc1d90064f398be51f153ff6c3\",\"time\":57798,\"actions\":9,\"cells\":[\"3\",\"4\",\"2\",\"1\",\"1\",\"2\",\"4\",\"3\",\"4\",\"1\",\"3\",\"2\",\"2\",\"3\",\"1\",\"/4\"]}","message":"Success"}
```

6. 完了の確認
```python
response = requests.get("http://localhost:8000/is_completed")
print(response.text)
# {"is_completed":false,"message":"Success"}
response = requests.put("http://localhost:8000/execute", json={"actions": ["sl:r4c4", "vl:4", "ds:r4c4"]})
response = requests.get("http://localhost:8000/is_completed")
print(response.text)
# {"is_completed":true,"message":"Success"}
```

## 使用例

SudokuPadのアクションは以下のいずれかになります：

- `sl`: 選択（select）
- `ds`: 選択解除（deselect）
- `vl`: 値（value）
- `cd`: 候補数字（candidate）
- `pm`: ペンシルマーク（pencil mark）
- `co`: 色（color）
- `cl`: クリア（clear）

x行y列のセル状態を更新するには、`['sl:rxcy', '{action_type:value}', 'ds:rxcy']`の3つ組を使用します。

r1c2の値を5に設定するには：
```python
actions = ['sl:r1c2', 'vl:5', 'ds:r1c2']
```

r2c2の状態が現在空の場合：
```python
actions = ['sl:r2c2', 'cd:1', 'cd:2', 'cd:3', 'ds:r2c2']
```
これによりr2c2に候補数字1、2、3が追加されます。

r2c2に現在候補数字1、2、3がある場合：
```python
actions = ['sl:r2c2', 'cd:1', 'ds:r2c2']
```
これによりr2c2から候補数字1が削除されます。このアクションはトグルとして機能します。

