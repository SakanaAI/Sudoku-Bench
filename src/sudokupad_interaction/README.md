# SudoukPad Interaction

This directory contains tools for interacting with the [SudokuPad app](https://sudokupad.app/), created by [Sven Neumann](https://svencodes.com/).

## Setup
```sh
# Python
python -m pip install -r requirements.txt

# Docker
docker compose build
```

### Font preparation
SudokuPad uses [Tahoma fonts](https://learn.microsoft.com/ja-jp/typography/font-list/tahoma) primarily.
Please install Tahoma fonts to your computer when you don't use the Docker or place truetype font files to [fonts/](./fonts/) before building the Docker image.
Please see also [here](./fonts/README.md).

### Loading a puzzle
To load a puzzle we will use the `encoded_puzzle` field from the Sudoku-Bench dataset.

```python
import datasets

dataset = datasets.load_dataset("SakanaAI/Sudoku-Bench", "challenge_100")

puzzle = dataset['test'][70]
encoded_puzzle = puzzle['encoded_puzzle']
print(encoded_puzzle)
# sclN4SwJgXA5AzgHjAtgfQLIgMYAsCGBTAGwBk8AzAawHsB3EAFwC9k8B2ADhwBYWAjDARjABOAAwiAbJ1IBmIWx54ArP1L9F00qXEZpUADQYcEANrAAbtDr0CeCAAIAkgDs6AJ0pgArhiuUnduko7AGFKTxcQJwBzEJBXDBsYKABfPXNoHE86LEpXe3RsfAI7EgoaegYUtIsoV09E+wBlAFUAEQB5AGlmgB0nAFo7ADEQAmLsvDso13A7WmyArEmwECj6GDt+fs47GCDsnDo7JyCVtaPXPAAHPEONyLscO3dqPTsMSgJPRCc33LseJQ4AA6Pp9YLtZoAOQAKg4oQBxEIOABKwSIAFFGn0AIJOACedjO9DsDyeGDiCUmkRWhjoeA2eDgOB8BEJOWodkQOAJ70piXefjoOAeByOxLowLsOI2PLsTJwiCuNjeIFIizwl1JsrsACZSf4eYSKfEVRqtTgtQrWYS6NQgrr7v4TVSnRq7FdPAwGDZgVV0rBPlkQH57NJOLr+PxdZxw/xpLrddJ+JwUgBdAwwCCKEQGWzGYx6IsZwvFvSlvQlouVjOXEwF3MiEu5/gl/h6Jvl9utkvGXO65t6aRtvQDrtDtO93UdkvT1vl6Qzhd6Hvl4zTsfrifLzeL4eTvSeEzAGBuSjkWxQE5OPD6HlRGwQXM+EzSYGKDvvjPUJ/AtjTrBf3/PRsggds8joAxdQgABiIYDH4WCRFSE8zwvaBr1vPR70fZ86BMXV30/RRvyAgCyJAwDwIgSCMGguCEKQlDT3cdCrz8LCcNsPDXyIt8SL0H8RD/cjhOA0DqNo+j4IEJi0hY89L0wu9olwgx8OMfg+K/QSKMAsTpwkvQIKg2CZMQmDkPktClI4lSH249STC0j9CIEoSRL0fTPKMky6LMxjLOYmyMLs7DVMcl9jH4lcdI84DvPEqjjJo0yGNkoLrNY2yb3stSopc2L3L0ijfNS/z0osqzUOy0LcvChynycvsiOE4qDK80rkr86TAuqhS2OUhr8o0tqitIjrEsM7ryt6jLkLTZIgA
```

Alternatively, you can convert a sudokupad URL to an encoded puzzle string by using [this tool](https://marktekfan.github.io/sudokupad-penpa-import/). Use the "create URL" option to generate a URL and remove the prefix `https://sudokupad.app/`.

> [!Note]
> The purpose of using the encoded puzzle string (instead of the sudokupad URL) is to avoid loading the sudokupad database.

## Run
0. Start the server
```sh
# Python
python app.py

# Docker
docker compose up -d
```

1. Initialize
```python
import requests

# https://sudokupad.app/etg05f8sm8
encoded_puzzle = puzzle['encoded_puzzle']
response = requests.put("http://localhost:8000/init", json={"encoded_puzzle": encoded_puzzle})
print(response.text)
# {"initialized":"sclN4SwJgXA5AzgHjAtgfQLIgMYAsCGBTAGwBk8AzAawHsB3EAFwC9k8B2ADhwBYWAjDARjABOAAwiAbJ1IBmIWx54ArP1L9F00qXEZpUADQYcEANrAAbtDr0CeCAAIAkgDs6AJ0pgArhiuUnduko7AGFKTxcQJwBzEJBXDBsYKABfPXNoHE86LEpXe3RsfAI7EgoaegYUtIsoV09E+wBlAFUAEQB5AGlmgB0nAFo7ADEQAmLsvDso13A7WmyArEmwECj6GDt+fs47GCDsnDo7JyCVtaPXPAAHPEONyLscO3dqPTsMSgJPRCc33LseJQ4AA6Pp9YLtZoAOQAKg4oQBxEIOABKwSIAFFGn0AIJOACedjO9DsDyeGDiCUmkRWhjoeA2eDgOB8BEJOWodkQOAJ70piXefjoOAeByOxLowLsOI2PLsTJwiCuNjeIFIizwl1JsrsACZSf4eYSKfEVRqtTgtQrWYS6NQgrr7v4TVSnRq7FdPAwGDZgVV0rBPlkQH57NJOLr+PxdZxw/xpLrddJ+JwUgBdAwwCCKEQGWzGYx6IsZwvFvSlvQlouVjOXEwF3MiEu5/gl/h6Jvl9utkvGXO65t6aRtvQDrtDtO93UdkvT1vl6Qzhd6Hvl4zTsfrifLzeL4eTvSeEzAGBuSjkWxQE5OPD6HlRGwQXM+EzSYGKDvvjPUJ/AtjTrBf3/PRsggds8joAxdQgABiIYDH4WCRFSE8zwvaBr1vPR70fZ86BMXV30/RRvyAgCyJAwDwIgSCMGguCEKQlDT3cdCrz8LCcNsPDXyIt8SL0H8RD/cjhOA0DqNo+j4IEJi0hY89L0wu9olwgx8OMfg+K/QSKMAsTpwkvQIKg2CZMQmDkPktClI4lSH249STC0j9CIEoSRL0fTPKMky6LMxjLOYmyMLs7DVMcl9jH4lcdI84DvPEqjjJo0yGNkoLrNY2yb3stSopc2L3L0ijfNS/z0osqzUOy0LcvChynycvsiOE4qDK80rkr86TAuqhS2OUhr8o0tqitIjrEsM7ryt6jLkLTZIgA","serialized_state":"{\"id\":\"sxsm_MichaelLefkowitz_e78a47bc1d90064f398be51f153ff6c3\",\"time\":17,\"actions\":0,\"cells\":[\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\",\"\"]}","message":"Success"}
```

2. Set state (**Make sure that no cell is highlighted**)
```python
# There can be an error when loading the serialized state if you finish with `sl` action.
serialized_state = '{"cells":["3","4","2","1","1","","4","","4","1","3","2","2","3","1",""]}'
response = requests.put("http://localhost:8000/set_state", json={"serialized_state": serialized_state})
print(response.text)
# {"initialized":"sclN4SwJgXA5AzgHjAtgfQLIgMYAsCGBTAGwBk8AzAawHsB3EAFwC9k8B2ADhwBYWAjDARjABOAAwiAbJ1IBmIWx54ArP1L9F00qXEZpUADQYcEANrAAbtDr0CeCAAIAkgDs6AJ0pgArhiuUnduko7AGFKTxcQJwBzEJBXDBsYKABfPXNoHE86LEpXe3RsfAI7EgoaegYUtIsoV09E+wBlAFUAEQB5AGlmgB0nAFo7ADEQAmLsvDso13A7WmyArEmwECj6GDt+fs47GCDsnDo7JyCVtaPXPAAHPEONyLscO3dqPTsMSgJPRCc33LseJQ4AA6Pp9YLtZoAOQAKg4oQBxEIOABKwSIAFFGn0AIJOACedjO9DsDyeGDiCUmkRWhjoeA2eDgOB8BEJOWodkQOAJ70piXefjoOAeByOxLowLsOI2PLsTJwiCuNjeIFIizwl1JsrsACZSf4eYSKfEVRqtTgtQrWYS6NQgrr7v4TVSnRq7FdPAwGDZgVV0rBPlkQH57NJOLr+PxdZxw/xpLrddJ+JwUgBdAwwCCKEQGWzGYx6IsZwvFvSlvQlouVjOXEwF3MiEu5/gl/h6Jvl9utkvGXO65t6aRtvQDrtDtO93UdkvT1vl6Qzhd6Hvl4zTsfrifLzeL4eTvSeEzAGBuSjkWxQE5OPD6HlRGwQXM+EzSYGKDvvjPUJ/AtjTrBf3/PRsggds8joAxdQgABiIYDH4WCRFSE8zwvaBr1vPR70fZ86BMXV30/RRvyAgCyJAwDwIgSCMGguCEKQlDT3cdCrz8LCcNsPDXyIt8SL0H8RD/cjhOA0DqNo+j4IEJi0hY89L0wu9olwgx8OMfg+K/QSKMAsTpwkvQIKg2CZMQmDkPktClI4lSH249STC0j9CIEoSRL0fTPKMky6LMxjLOYmyMLs7DVMcl9jH4lcdI84DvPEqjjJo0yGNkoLrNY2yb3stSopc2L3L0ijfNS/z0osqzUOy0LcvChynycvsiOE4qDK80rkr86TAuqhS2OUhr8o0tqitIjrEsM7ryt6jLkLTZIgA","serialized_state":"{\"id\":\"sxsm_MichaelLefkowitz_e78a47bc1d90064f398be51f153ff6c3\",\"time\":11590,\"actions\":0,\"cells\":[\"3\",\"4\",\"2\",\"1\",\"1\",\"\",\"4\",\"\",\"4\",\"1\",\"3\",\"2\",\"2\",\"3\",\"1\",\"\"]}","message":"Success"}
```

3. Get the board image
```python
from io import BytesIO
from PIL import Image

response = requests.get("http://localhost:8000/screenshot")
image = Image.open(BytesIO(response.content))
image.show()
```

4. Action (**Do not finish with `sl` action**)
```python
# There can be an error when loading the serialized state if you finish with `sl` action.
actions = ["sl:r2c2", "vl:2", "ds:r2c2",
           "sl:r2c4", "vl:3", "ds:r2c4",
           "sl:r4c4", "cd:4", "ds:r4c4"]
response = requests.put("http://localhost:8000/execute", json={"actions": actions})
print(response.text)
# {"initialized":"sclN4SwJgXA5AzgHjAtgfQLIgMYAsCGBTAGwBk8AzAawHsB3EAFwC9k8B2ADhwBYWAjDARjABOAAwiAbJ1IBmIWx54ArP1L9F00qXEZpUADQYcEANrAAbtDr0CeCAAIAkgDs6AJ0pgArhiuUnduko7AGFKTxcQJwBzEJBXDBsYKABfPXNoHE86LEpXe3RsfAI7EgoaegYUtIsoV09E+wBlAFUAEQB5AGlmgB0nAFo7ADEQAmLsvDso13A7WmyArEmwECj6GDt+fs47GCDsnDo7JyCVtaPXPAAHPEONyLscO3dqPTsMSgJPRCc33LseJQ4AA6Pp9YLtZoAOQAKg4oQBxEIOABKwSIAFFGn0AIJOACedjO9DsDyeGDiCUmkRWhjoeA2eDgOB8BEJOWodkQOAJ70piXefjoOAeByOxLowLsOI2PLsTJwiCuNjeIFIizwl1JsrsACZSf4eYSKfEVRqtTgtQrWYS6NQgrr7v4TVSnRq7FdPAwGDZgVV0rBPlkQH57NJOLr+PxdZxw/xpLrddJ+JwUgBdAwwCCKEQGWzGYx6IsZwvFvSlvQlouVjOXEwF3MiEu5/gl/h6Jvl9utkvGXO65t6aRtvQDrtDtO93UdkvT1vl6Qzhd6Hvl4zTsfrifLzeL4eTvSeEzAGBuSjkWxQE5OPD6HlRGwQXM+EzSYGKDvvjPUJ/AtjTrBf3/PRsggds8joAxdQgABiIYDH4WCRFSE8zwvaBr1vPR70fZ86BMXV30/RRvyAgCyJAwDwIgSCMGguCEKQlDT3cdCrz8LCcNsPDXyIt8SL0H8RD/cjhOA0DqNo+j4IEJi0hY89L0wu9olwgx8OMfg+K/QSKMAsTpwkvQIKg2CZMQmDkPktClI4lSH249STC0j9CIEoSRL0fTPKMky6LMxjLOYmyMLs7DVMcl9jH4lcdI84DvPEqjjJo0yGNkoLrNY2yb3stSopc2L3L0ijfNS/z0osqzUOy0LcvChynycvsiOE4qDK80rkr86TAuqhS2OUhr8o0tqitIjrEsM7ryt6jLkLTZIgA","serialized_state":"{\"id\":\"sxsm_MichaelLefkowitz_e78a47bc1d90064f398be51f153ff6c3\",\"time\":33372,\"actions\":9,\"cells\":[\"3\",\"4\",\"2\",\"1\",\"1\",\"2\",\"4\",\"3\",\"4\",\"1\",\"3\",\"2\",\"2\",\"3\",\"1\",\"/4\"]}","message":"Success"}
```

5. Current state
```python
response = requests.get("http://localhost:8000/current_state")
print(response.text)
# {"initialized":"sclN4SwJgXA5AzgHjAtgfQLIgMYAsCGBTAGwBk8AzAawHsB3EAFwC9k8B2ADhwBYWAjDARjABOAAwiAbJ1IBmIWx54ArP1L9F00qXEZpUADQYcEANrAAbtDr0CeCAAIAkgDs6AJ0pgArhiuUnduko7AGFKTxcQJwBzEJBXDBsYKABfPXNoHE86LEpXe3RsfAI7EgoaegYUtIsoV09E+wBlAFUAEQB5AGlmgB0nAFo7ADEQAmLsvDso13A7WmyArEmwECj6GDt+fs47GCDsnDo7JyCVtaPXPAAHPEONyLscO3dqPTsMSgJPRCc33LseJQ4AA6Pp9YLtZoAOQAKg4oQBxEIOABKwSIAFFGn0AIJOACedjO9DsDyeGDiCUmkRWhjoeA2eDgOB8BEJOWodkQOAJ70piXefjoOAeByOxLowLsOI2PLsTJwiCuNjeIFIizwl1JsrsACZSf4eYSKfEVRqtTgtQrWYS6NQgrr7v4TVSnRq7FdPAwGDZgVV0rBPlkQH57NJOLr+PxdZxw/xpLrddJ+JwUgBdAwwCCKEQGWzGYx6IsZwvFvSlvQlouVjOXEwF3MiEu5/gl/h6Jvl9utkvGXO65t6aRtvQDrtDtO93UdkvT1vl6Qzhd6Hvl4zTsfrifLzeL4eTvSeEzAGBuSjkWxQE5OPD6HlRGwQXM+EzSYGKDvvjPUJ/AtjTrBf3/PRsggds8joAxdQgABiIYDH4WCRFSE8zwvaBr1vPR70fZ86BMXV30/RRvyAgCyJAwDwIgSCMGguCEKQlDT3cdCrz8LCcNsPDXyIt8SL0H8RD/cjhOA0DqNo+j4IEJi0hY89L0wu9olwgx8OMfg+K/QSKMAsTpwkvQIKg2CZMQmDkPktClI4lSH249STC0j9CIEoSRL0fTPKMky6LMxjLOYmyMLs7DVMcl9jH4lcdI84DvPEqjjJo0yGNkoLrNY2yb3stSopc2L3L0ijfNS/z0osqzUOy0LcvChynycvsiOE4qDK80rkr86TAuqhS2OUhr8o0tqitIjrEsM7ryt6jLkLTZIgA","serialized_state":"{\"id\":\"sxsm_MichaelLefkowitz_e78a47bc1d90064f398be51f153ff6c3\",\"time\":57798,\"actions\":9,\"cells\":[\"3\",\"4\",\"2\",\"1\",\"1\",\"2\",\"4\",\"3\",\"4\",\"1\",\"3\",\"2\",\"2\",\"3\",\"1\",\"/4\"]}","message":"Success"}
```

6. Check completed
```python
response = requests.get("http://localhost:8000/is_completed")
print(response.text)
# {"is_completed":false,"message":"Success"}
response = requests.put("http://localhost:8000/execute", json={"actions": ["sl:r4c4", "vl:4", "ds:r4c4"]})
response = requests.get("http://localhost:8000/is_completed")
print(response.text)
# {"is_completed":true,"message":"Success"}
```

## Examples

Actions from SudokuPad can be one of

- `sl`: select
- `ds`: deselect
- `vl`: value
- `cd`: candidate
- `pm`: pencil mark
- `co`: color
- `cl`: clear

To update the cell state of row x, column y, use a triplet of `['sl:rxcy', '{action_type:value}', 'ds:rxcy']`.

To set the value of r1c2 to 5
```python
actions = ['sl:r1c2', 'vl:5', 'ds:r1c2']
```

If the state of r2c2 is currently empty, then
```python
actions = ['sl:r2c2', 'cd:1', 'cd:2', 'cd:3', 'ds:r2c2']
```
will add candidates 1, 2, and 3 to r2c2.

If r2c2 currently has candidates of 1, 2 and 3, then
```python
actions = ['sl:r2c2', 'cd:1', 'ds:r2c2']
```
will remove candidate 1 from r2c2. The action acts as a toggle.

