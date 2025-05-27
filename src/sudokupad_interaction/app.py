import enum
from io import BytesIO
import json
from pathlib import Path
import re

from PIL import Image
from fastapi import FastAPI, status
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel, field_validator
from selenium import webdriver
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
import uvicorn


WINDOW_WIDTH, WINDOW_HEIGHT = 1920, 1200

SUDOKUPAD_PATH = Path(__file__).resolve().parent / "sudoku_pad"

SIMON_COLORS = {
    "colors": {
        "0": "transparent",
        "1": "rgb(1, 132, 16)",
        "2": "rgb(124, 124, 124)",
        "3": "rgb(-36, -36, -36)",
        "4": "rgb(179, 229, 106)",
        "5": "rgb(167, 29, 180)",
        "6": "rgb(228, 150, 50)",
        "7": "rgb(245, 58, 55)",
        "8": "rgb(252, 235, 63)",
        "9": "rgb(61, 153, 245)",
        "a": "transparent",
        "b": "rgb(204, 51, 17)",
        "c": "rgb(17, 119, 51)",
        "d": "rgb(0, 68, 196)",
        "e": "rgb(238, 153, 170)",
        "f": "rgb(255, 255, 25)",
        "g": "rgb(240, 70, 240)",
        "h": "rgb(160, 90, 30)",
        "i": "rgb(51, 187, 238)",
        "j": "rgb(145, 30, 180)",
        "k": "transparent",
        "l": "rgb(138, 2, 0)",
        "m": "rgb(253, 254, 169)",
        "n": "rgb(61, 153, 245)",
        "o": "rgb(192, 110, 109)",
        "p": "rgb(149, 208, 151)",
        "q": "rgb(158, 204, 250)",
        "r": "rgb(183, 177, 1)",
        "s": "rgb(7, 171, 13)",
        "t": "rgb(0, 59, 117)",
    },
    "pages": [
        ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
        ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"],
        ["k", "l", "m", "n", "o", "p", "q", "r", "s", "t"],
    ],
}


@enum.unique
class Operation(str, enum.Enum):
    """
    セルの操作を表す列挙型。

    属性:
    SELECT (str): セル選択操作。
    DESELECT (str): セル選択解除操作。
    VALUE (str): 値入力操作。
    PENCILMARKS (str): ペンシルマーク（隅のメモ）操作。
    CANDIDATES (str): 候補数字（中央のメモ）操作。
    COLOR (str): セルの色付け操作。
    PEN (str): ペン描画操作。
    PENCOLOR (str): ペンの色選択操作。
    CLEAR (str): 消去操作。
    UNDO (str): 元に戻す操作。
    REDO (str): やり直し操作。
    GROUPSTART (str): グループ開始操作。
    GROUPEND (str): グループ終了操作。
    UNPAUSE (str): 一時停止解除操作。
    WAIT (str): 待機操作。
    RESET (str): リセット操作。
    """
    SELECT = "sl"
    DESELECT = "ds"
    VALUE = "vl"
    PENCILMARKS = "pm"
    CANDIDATES = "cd"
    COLOR = "co"
    PEN = "pe"
    PENCOLOR = "pc"
    CLEAR = "cl"
    UNDO = "ud"
    REDO = "rd"
    GROUPSTART = "gs"
    GROUPEND = "ge"
    UNPAUSE = "up"
    WAIT = "wt"
    RESET = "rs"  # 注意: この操作はウェブアプリケーションでは使用されていません。


class BaseAction(BaseModel):
    """
    すべてのアクションの基底クラス。

    属性:
    operation (Operation): 実行する操作の種類。
    time_delta (int): 操作間の時間間隔（ミリ秒）。
    """
    operation: Operation
    time_delta: int = 1

    @field_validator("time_delta")
    @classmethod
    def validate_time_delta(cls, time_delta: int) -> int:
        if time_delta < 0:
            raise ValueError("time_deltaは負の値にできません。")
        return time_delta

    @classmethod
    def import_command(cls, command: str) -> "BaseAction":
        """
        文字列形式のコマンドからアクションオブジェクトを生成します。

        引数:
        command (str): コマンド文字列。

        戻り値:
        BaseAction: 生成されたアクションオブジェクト。
        """
        raise NotImplementedError("import_commandメソッドはサブクラスで実装する必要があります。")

    def export_command(self) -> str:
        """
        アクションオブジェクトをウェブアプリケーション用の文字列形式に変換します。

        戻り値:
        str: ウェブアプリケーション形式のコマンド文字列。
        """
        raise NotImplementedError("export_commandメソッドはサブクラスで実装する必要があります。")

    @staticmethod
    def convert_cells_tuple(cells: list[tuple[int, int]]) -> str:
        """
        セル座標のリストを文字列形式に変換します。

        引数:
        cells (list[tuple[int, int]]): セル座標のリスト（0ベース）。

        戻り値:
        str: 「r1c1r2c2...」形式のセル座標文字列（1ベース）。
        """
        return "".join([f"r{cell[0] + 1}c{cell[1] + 1}" for cell in cells])

    @staticmethod
    def convert_cells_str(cells: str) -> list[tuple[int, int]]:
        """
        「r1c1r2c2...」形式のセル座標文字列をタプルのリストに変換します。

        引数:
        cells (str): セル座標文字列（1ベース）。

        戻り値:
        list[tuple[int, int]]: セル座標のリスト（0ベース）。
        """
        return [(int(cell.group(1)) - 1, int(cell.group(2)) - 1) for cell in re.finditer(r"r(\d+)c(\d+)", cells)]


class SelectAction(BaseAction):
    """
    The select/deselect action.

    Attributes:
    cells (list[tuple[int, int]]): The cells to select/deselect.
    """
    cells: list[tuple[int, int]]

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.SELECT and operation != Operation.DESELECT:
            raise ValueError("The operation must be select or deselect.")
        return operation

    @field_validator("cells")
    @classmethod
    def validate_cells(cls, cells: list[tuple[int, int]]) -> list[tuple[int, int]]:
        for cell in cells:
            if cell[0] < 0 or cell[1] < 0:
                raise ValueError("The cell coordinates must be non-negative.")
        return cells

    @classmethod
    def import_command(cls, command: str) -> "SelectAction":
        operation, cells_str = command.split(":")  # TODO: deselect all like `ds/5`, r1c1r1c2...r9c8r9c9?
        time_delta = 1
        if "/" in cells_str:
            cells_str, time_delta_str = cells_str.split("/")
            time_delta = int(time_delta_str)
        cells = cls.convert_cells_str(cells_str)
        return cls(operation=Operation(operation), time_delta=time_delta, cells=cells)

    def export_command(self) -> str:
        cells_str = self.convert_cells_tuple(self.cells)
        return f"{self.operation.value}:{cells_str}/{self.time_delta}"


class ValueAction(BaseAction):
    """
    The value/pencilmarks/candidates action.
    [number type] (candidates/pencilmarks can not be written after the value is written, but those written before the value can be kept)
        value: Large number
        pencilmarks: Small numbers in the corner
        candidates: Small numbers in the centre

    Attributes:
    number (int): The number.
    """
    number: int

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.VALUE and operation != Operation.PENCILMARKS and operation != Operation.CANDIDATES:
            raise ValueError("The operation must be value.")
        return operation

    @field_validator("number")
    @classmethod
    def validate_number(cls, number: int) -> int:
        if not 1 <= number <= 9:
            raise ValueError("The number must be between 1 and 9.")
        return number

    @classmethod
    def import_command(cls, command: str) -> "ValueAction":
        operation, number_str = command.split(":")
        time_delta = 1
        if "/" in number_str:
            number_str, time_delta_str = number_str.split("/")
            time_delta = int(time_delta_str)
        number = int(number_str)
        return cls(operation=Operation(operation), time_delta=time_delta, number=number)

    def export_command(self) -> str:
        return f"{self.operation.value}:{self.number}/{self.time_delta}"


class ColorAction(BaseAction):
    """
    セルに色を付けるアクション。

    属性:
    color (str): 色を表す文字（0, 1, 2, ..., 9, a, b, ..., t）。
    """
    operation: Operation = Operation.COLOR
    color: str  # 色は文字列（0, 1, 2, ..., 9, a, b, ..., t）で指定

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.COLOR:
            raise ValueError("操作はCOLORである必要があります。")
        return operation

    @field_validator("color")
    @classmethod
    def validate_color(cls, color: str) -> str:
        if len(color) != 1 or color not in "0123456789abcdefghijklmnopqrst":
            raise ValueError("色は0からtまでの1文字である必要があります。")
        return color

    @classmethod
    def import_command(cls, command: str) -> "ColorAction":
        operation, color_str = command.split(":")
        time_delta = 1
        if "/" in color_str:
            color_str, time_delta_str = color_str.split("/")
            time_delta = int(time_delta_str)
        color = color_str
        return cls(operation=Operation(operation), time_delta=time_delta, color=color)

    def export_command(self) -> str:
        return f"{self.operation.value}:{self.color}/{self.time_delta}"


class PenAction(BaseAction):
    """
    ペンで線や記号を描くアクション。

    このアクションはgroupstart/pencolor/select/pen/deselect/groupendアクションと組み合わせて使用されます。
    [アクション一覧]
        0: すべて消去
        1: 右のセルへの線
        2: 下のセルへの線
        3: 右辺に「x」マーク
        4: 下辺に「x」マーク
        5: セル内に「o」マーク
        6: セル内に「x」マーク
        7: 右辺に線
        8: 下辺に線
        9: 左辺に線
        a: 上辺に線
        b: 左辺に「x」マーク
        c: 上辺に「x」マーク
        d: 右上のセルへの線
        e: 右下のセルへの線
        f: セル内の右上から左下への対角線
        g: セル内の左上から右下への対角線

    属性:
    shape (str): ペンの形状を表す文字。
    """
    operation: Operation = Operation.PEN
    shape: str  # 形状は文字列（0, 1, 2, ..., 9, a, b, ..., g）で指定

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.PEN:
            raise ValueError("操作はPENである必要があります。")
        return operation

    @field_validator("shape")
    @classmethod
    def validate_shape(cls, shape: str) -> str:
        if len(shape) != 1 or shape not in "0123456789abcdefg":
            raise ValueError("形状は0からgまでの1文字である必要があります。")
        return shape

    @classmethod
    def import_command(cls, command: str) -> "PenAction":
        operation, shape_str = command.split(":")
        time_delta = 1
        if "/" in shape_str:
            shape_str, time_delta_str = shape_str.split("/")
            time_delta = int(time_delta_str)
        shape = shape_str
        return cls(operation=Operation(operation), time_delta=time_delta, shape=shape)

    def export_command(self) -> str:
        return f"{self.operation.value}:{self.shape}/{self.time_delta}"


class PencolorAction(BaseAction):
    """
    ペンの色を選択するアクション。

    属性:
    color (str): ペンの色を表す文字（1, 2, ..., 9）。
    """
    operation: Operation = Operation.PENCOLOR
    color: str  # 色は文字列（1, 2, ..., 9）で指定

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.PENCOLOR:
            raise ValueError("操作はPENCOLORである必要があります。")
        return operation

    @field_validator("color")
    @classmethod
    def validate_color(cls, color: str) -> str:
        if len(color) != 1 or color not in "123456789":
            raise ValueError("色は1から9までの1文字である必要があります。")
        return color

    @classmethod
    def import_command(cls, command: str) -> "PencolorAction":
        operation, color_str = command.split(":")
        time_delta = 1
        if "/" in color_str:
            color_str, time_delta_str = color_str.split("/")
            time_delta = int(time_delta_str)
        color = color_str
        return cls(operation=Operation(operation), time_delta=time_delta, color=color)

    def export_command(self) -> str:
        return f"{self.operation.value}:{self.color}/{self.time_delta}"


class ClearAction(BaseAction):
    """
    セルの内容を消去するアクション。
    [レベル] 選択されたセルの少なくとも1つに表示値がある場合に消去します
        0: 値 -> 候補数字 -> ペンシルマーク -> 色 -> ペン
        1: ペンシルマーク -> 値 -> 候補数字 -> 色 -> ペン
        2: 候補数字 -> 値 -> ペンシルマーク -> 色 -> ペン
        3: 色 -> 値 -> 候補数字 -> ペンシルマーク -> ペン

    属性:
    level (str): 消去のレベルを表す文字。
    """
    operation: Operation = Operation.CLEAR
    level: str  # レベルは文字列（0, 1, 2, 3）で指定

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.CLEAR:
            raise ValueError("操作はCLEARである必要があります。")
        return operation

    @field_validator("level")
    @classmethod
    def validate_level(cls, level: str) -> str:
        if len(level) != 1 or level not in "0123":
            raise ValueError("レベルは0から3までの1文字である必要があります。")
        return level

    @classmethod
    def import_command(cls, command: str) -> "ClearAction":
        operation, level_str = command.split(":")
        time_delta = 1
        if "/" in level_str:
            level_str, time_delta_str = level_str.split("/")
            time_delta = int(time_delta_str)
        level = level_str
        return cls(operation=Operation(operation), time_delta=time_delta, level=level)

    def export_command(self) -> str:
        return f"{self.operation.value}:{self.level}/{self.time_delta}"


class UndoAction(BaseAction):
    """
    元に戻すアクション。
    """
    operation: Operation = Operation.UNDO

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.UNDO:
            raise ValueError("操作はUNDOである必要があります。")
        return operation

    @classmethod
    def import_command(cls, command: str) -> "UndoAction":
        operation, time_delta = command, 1
        if "/" in operation:
            operation, time_delta_str = operation.split("/")
            time_delta = int(time_delta_str)
        return cls(operation=Operation(operation), time_delta=time_delta)

    def export_command(self) -> str:
        return f"{self.operation.value}/{self.time_delta}"


class RedoAction(BaseAction):
    """
    やり直しアクション。
    """
    operation: Operation = Operation.REDO

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.REDO:
            raise ValueError("操作はREDOである必要があります。")
        return operation

    @classmethod
    def import_command(cls, command: str) -> "RedoAction":
        operation, time_delta = command, 1
        if "/" in operation:
            operation, time_delta_str = operation.split("/")
            time_delta = int(time_delta_str)
        return cls(operation=Operation(operation), time_delta=time_delta)

    def export_command(self) -> str:
        return f"{self.operation.value}/{self.time_delta}"


class GroupAction(BaseAction):
    """
    グループ開始/終了アクション。
    複数のアクションをグループ化するために使用されます。
    """
    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.GROUPSTART and operation != Operation.GROUPEND:
            raise ValueError("操作はGROUPSTARTまたはGROUPENDである必要があります。")
        return operation

    @classmethod
    def import_command(cls, command: str) -> "GroupAction":
        operation, time_delta = command, 1
        if "/" in operation:
            operation, time_delta_str = operation.split("/")
            time_delta = int(time_delta_str)
        return cls(operation=Operation(operation), time_delta=time_delta)

    def export_command(self) -> str:
        return f"{self.operation.value}/{self.time_delta}"


class PauseAction(BaseAction):
    """
    一時停止解除/待機アクション。
    
    属性:
    value (int | None): 待機時間（ミリ秒）。UNPAUSEの場合はNone。
    """
    value: int | None = None

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.UNPAUSE and operation != Operation.WAIT:
            raise ValueError("操作はUNPAUSEまたはWAITである必要があります。")
        return operation

    @classmethod
    def import_command(cls, command: str) -> "PauseAction":
        operation, value, time_delta = command, None, 1
        if "/" in operation:
            operation, time_delta_str = operation.split("/")
            time_delta = int(time_delta_str)
        if ":" in operation:
            operation, value_str = operation.split(":")
            value = int(value_str)
        return cls(operation=Operation(operation), time_delta=time_delta, value=value)

    def export_command(self) -> str:
        if self.value is not None:
            return f"{self.operation.value}:{self.value}/{self.time_delta}"
        return f"{self.operation.value}/{self.time_delta}"


class ResetAction(BaseAction):
    """
    リセットアクション。
    パズルを初期状態に戻します。

    属性:
    operation (Operation): 実行する操作の種類。
    """
    operation: Operation = Operation.RESET

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.RESET:
            raise ValueError("操作はRESETである必要があります。")
        return operation

    @classmethod
    def import_command(cls, command: str) -> "ResetAction":
        operation, time_delta = command, 1
        if "/" in operation:
            operation, time_delta_str = operation.split("/")
            time_delta = int(time_delta_str)
        return cls(operation=Operation(operation), time_delta=time_delta)

    def export_command(self) -> str:
        return f"{self.operation.value}/{self.time_delta}"


def wait_for_sudokupad(driver: webdriver.Chrome, timeout: int = 15) -> None:
    """
    SudokuPadのすべてのコンポーネントが完全に読み込まれるのを待ちます。
    読み込みに失敗した場合はTimeoutExceptionを発生させます。
    """
    WebDriverWait(driver, timeout).until(lambda d: d.execute_script("return document.readyState") == "complete")
    WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.CSS_SELECTOR, ".app .cells .row .cell")))
    def add_tool_ready(_drv: webdriver.Chrome) -> bool:
        try:
            _drv.execute_script(
                "Framework.app.addTool({name:'_testTool',isTool:true});"
                "Framework.app.removeTool('_testTool');"
            )
            return True
        except:
            return False

    WebDriverWait(driver, timeout).until(add_tool_ready)

    def puzzle_has_id(_drv: webdriver.Chrome) -> bool:
        puzzle_check_js = """
        if (!Framework || !Framework.app || !Framework.app.puzzle || !Framework.app.puzzle.currentPuzzle) {
            return null;
        }
        const p = Framework.app.puzzle.currentPuzzle;
        // puzzle.idが存在しないか空文字列の場合
        if (!p.id) {
            return null;
        }
        return p.id;  // パズルIDの文字列を返す
        """
        val = _drv.execute_script(puzzle_check_js)
        return bool(val)  # 空でない値は成功とみなす

    WebDriverWait(driver, timeout).until(puzzle_has_id)


def load_sudokupad(encoded_puzzle: str, window_width: int, window_height: int, **kwargs) -> webdriver.Chrome:
    """
    指定されたURLからウェブアプリを読み込みます。

    引数:
        encoded_puzzle (str): パズルを表す文字列（短縮IDではない）。
        window_width (int): ブラウザウィンドウの幅。
        window_height (int): ブラウザウィンドウの高さ。
        **kwargs: webdriverに渡される追加の引数。

    戻り値:
        webdriver.Chrome: Seleniumのwebdriverインスタンス
    """
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")  # ヘッドレスモード
    options.add_argument("--no-sandbox")  # サンドボックスを無効化
    options.add_argument("--disable-dev-shm-usage")  # 共有メモリ使用を無効化
    options.add_argument("--disable-font-subpixel-positioning")  # フォントのサブピクセル配置を無効化
    options.add_argument("--disable-font-antialiasing")  # フォントのアンチエイリアスを無効化
    options.add_argument("--disable-lcd-text")  # LCD用テキストレンダリングを無効化
    options.add_argument("--disable-skia-runtime-opts")  # Skiaランタイムオプションを無効化
    options.add_argument("--force-device-scale-factor=1")  # デバイススケールファクターを1に固定
    options.add_argument("--high-dpi-support=1")  # 高DPIサポートを有効化
    options.add_argument(f"--window-size={window_width},{window_height}")  # ウィンドウサイズを設定
    driver = webdriver.Chrome(options=options)
    driver.get(f"file://{SUDOKUPAD_PATH}/index.html?puzzleid={encoded_puzzle}")
    driver.execute_script(
        "const style = document.createElement('style');style.type = 'text/css';style.innerHTML = '* { animation: none !important; transition: none !important; }';document.head.appendChild(style);"
    )
    wait_for_sudokupad(driver)
    driver.execute_script("""
        Framework.setSetting("toolpen", true);  // ペンツール: オン
        Framework.toggleSettingClass("toolpen", true);  // ペンツール: オン
        Framework.setSetting("toolletter", true);  // 文字ツール: オン
        Framework.toggleSettingClass("toolletter", true);  // 文字ツール: オン
        Framework.setSetting("digitoutlines", true);  // 要素の輪郭: オン
        Framework.toggleSettingClass("digitoutlines", true);  // 要素の輪郭: オン
        Framework.setSetting("autocheck", false);  // 完了時のチェック: オフ
        Framework.toggleSettingClass("autocheck", false);  // 完了時のチェック: オフ
        Framework.setSetting("conflictchecker", "off");  // 競合チェッカー: オフ
        Framework.toggleSettingClass("conflictchecker", "off");  // 競合チェッカー: オフ
        Framework.features.conflictchecker.detachElem()  // 競合チェッカー: オフ
    """)
    driver.execute_script(f"ToolColor.tool.setPalette({json.dumps(SIMON_COLORS)});")
    screen_width = driver.execute_script("return window.innerWidth;")
    screen_height = driver.execute_script("return window.innerHeight;")
    actions = ActionChains(driver)
    actions.reset_actions()
    actions.move_by_offset(screen_width - 1, screen_height - 1).click().perform()
    return driver


class WebAppAgent:
    """
    SudokuPadウェブアプリケーションとの対話を管理するエージェントクラス。
    
    このクラスはSeleniumを使用してSudokuPadアプリケーションを操作し、
    スクリーンショットの取得、パズルの状態の保存と復元、アクションの実行などの
    機能を提供します。
    """
    def __init__(self, encoded_puzzle: str) -> None:
        """
        WebAppAgentを初期化します。
        
        引数:
            encoded_puzzle (str): エンコードされたパズル文字列。
        """
        self.encoded_puzzle = encoded_puzzle
        self._load_webapp()

    def take_screenshot(self) -> bytes:
        """
        現在のパズルボードのスクリーンショットを取得します。
        
        戻り値:
            bytes: PNG形式のスクリーンショット画像データ。
        """
        image = Image.open(BytesIO(self.driver.get_screenshot_as_png())).convert("RGB")
        image = image.resize(
            (round(image.width / self.dpr), round(image.height / self.dpr)),
            Image.Resampling.LANCZOS,
        )
        board = image.crop((
            self.puzzle_region["left"], self.puzzle_region["top"], self.puzzle_region["right"], self.puzzle_region["bottom"]
        ))
        bytes_buffer = BytesIO()
        board.save(bytes_buffer, format="PNG")
        return bytes_buffer.getvalue()

    def puzzle_is_completed(self) -> bool:
        """
        パズルが完成しているかどうかを確認します。
        
        戻り値:
            bool: パズルが完成している場合はTrue、そうでない場合はFalse。
        """
        return self.driver.execute_script("return Framework.app.puzzle.isCompleted();")

    def get_serialized_state(self) -> str:
        """
        現在のパズル状態をシリアライズして取得します。
        
        戻り値:
            str: シリアライズされたパズル状態のJSON文字列。
        """
        json_str = self.driver.execute_script("return Framework.app.puzzle.serializeState();")
        return json_str

    def load_serialized_state(self, serialized_state: str) -> None:
        """
        シリアライズされたパズル状態を読み込みます。
        
        引数:
            serialized_state (str): シリアライズされたパズル状態のJSON文字列。
        """
        self.driver.execute_script(f"Framework.app.puzzle.deserializeState({serialized_state});")  # 注意: 「highlighted」セルが復元されない理由は？

    def _load_webapp(self) -> None:
        """
        SudokuPadウェブアプリケーションを読み込みます。
        パズル領域の座標情報も取得します。
        """
        self.driver = load_sudokupad(encoded_puzzle=self.encoded_puzzle, window_width=WINDOW_WIDTH, window_height=WINDOW_HEIGHT)
        self.dpr = self.driver.execute_script("return window.devicePixelRatio;")
        svg_element = self.driver.find_element(By.ID, "svgrenderer")
        puzzle_region = self.driver.execute_script(
            r"const rect = arguments[0].getBoundingClientRect(); return {x: rect.left, y: rect.top, width: rect.width, height: rect.height};",
            svg_element
        )
        self.puzzle_region = {
            "left": puzzle_region["x"], "top": puzzle_region["y"],
            "right": puzzle_region["x"] + puzzle_region["width"], "bottom": puzzle_region["y"] + puzzle_region["height"],
        }

    def _execute(self, action: BaseAction | list[BaseAction], **kwargs) -> None:
        """
        アクションを実行します。
        
        引数:
            action (BaseAction | list[BaseAction]): 実行するアクション、またはアクションのリスト。
            **kwargs: 追加の引数。
        """
        if isinstance(action, list):
            for act in action:
                self._execute(act, **kwargs)
            return  # すべてのアクションを実行
        if isinstance(action, ResetAction):
            self.driver.execute_script("Framework.app.puzzle.restartPuzzle();")  # Framework.app.puzzle.resetPuzzle() + trigger("start")
        else:
            self.driver.execute_script(f"Framework.app.puzzle.act(\"{action.export_command()}\");")


AGENT = None


app = FastAPI()
@app.get("/")
async def root() -> JSONResponse:
    """
    ルートエンドポイント。アプリケーションが正常に動作しているかを確認します。
    
    戻り値:
        JSONResponse: 「OK」メッセージを含むレスポンス。
    """
    return JSONResponse(content={"message": "OK"}, status_code=status.HTTP_200_OK)


class InitData(BaseModel):
    """
    初期化リクエストのデータモデル。
    
    属性:
        encoded_puzzle (str): エンコードされたパズル文字列。
    """
    encoded_puzzle: str


@app.put("/init")
async def init(data: InitData) -> JSONResponse:
    """
    WebAppAgentを初期化するエンドポイント。
    
    引数:
        data (InitData): エンコードされたパズル文字列を含むデータ。
        
    戻り値:
        JSONResponse: 初期化結果を含むレスポンス。
    """
    global AGENT
    try:
        AGENT = WebAppAgent(data.encoded_puzzle)
    except Exception as e:
        AGENT = None
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"initialized": "", "serialized_state": "", "message": str(e)})
    serialized_state = AGENT.get_serialized_state()
    return JSONResponse(content={"initialized": AGENT.encoded_puzzle, "serialized_state": serialized_state, "message": "Success"}, status_code=status.HTTP_200_OK)


@app.get("/current_state")
async def get_current_state() -> JSONResponse:
    """
    現在のパズル状態を取得するエンドポイント。
    
    戻り値:
        JSONResponse: 現在のパズル状態を含むレスポンス。
    """
    if AGENT is None:
        return JSONResponse(content={"initialized": "", "serialized_state": "", "message": "アプリケーションが初期化されていません。"}, status_code=status.HTTP_400_BAD_REQUEST)
    serialized_state = AGENT.get_serialized_state()
    return JSONResponse(content={"initialized": AGENT.encoded_puzzle, "serialized_state": serialized_state, "message": "Success"}, status_code=status.HTTP_200_OK)


class SetStateData(BaseModel):
    """
    状態設定リクエストのデータモデル。
    
    属性:
        serialized_state (str): シリアライズされたパズル状態。
    """
    serialized_state: str


@app.put("/set_state")
async def set_state(data: SetStateData) -> JSONResponse:
    """
    パズル状態を設定するエンドポイント。
    
    引数:
        data (SetStateData): シリアライズされたパズル状態を含むデータ。
        
    戻り値:
        JSONResponse: 状態設定結果を含むレスポンス。
    """
    if AGENT is None:
        return JSONResponse(content={"initialized": "", "serialized_state": "", "message": "アプリケーションが初期化されていません。"}, status_code=status.HTTP_400_BAD_REQUEST)
    AGENT.load_serialized_state(data.serialized_state)
    serialized_state = AGENT.get_serialized_state()
    return JSONResponse(content={"initialized": AGENT.encoded_puzzle, "serialized_state": serialized_state, "message": "Success"}, status_code=status.HTTP_200_OK)


class ExecuteData(BaseModel):
    """
    アクション実行リクエストのデータモデル。
    
    属性:
        actions (list[str]): 実行するアクションのリスト。
    """
    actions: list[str]


@app.put("/execute")
async def execute(data: ExecuteData) -> JSONResponse:
    """
    アクションを実行するエンドポイント。
    
    引数:
        data (ExecuteData): 実行するアクションのリストを含むデータ。
        
    戻り値:
        JSONResponse: アクション実行結果を含むレスポンス。
    """
    if AGENT is None:
        return JSONResponse(content={"initialized": "", "serialized_state": "", "message": "アプリケーションが初期化されていません。"}, status_code=status.HTTP_400_BAD_REQUEST)
    old_serialized_state = AGENT.get_serialized_state()
    parsed_actions = []
    try:
        for action in data.actions:
            match action[:2]:  # 最初の2文字が操作を表す
                case "sl":  # SELECT
                    parsed_actions.append(SelectAction.import_command(action))
                case "ds":  # DESELECT
                    parsed_actions.append(SelectAction.import_command(action))
                case "vl":  # VALUE
                    parsed_actions.append(ValueAction.import_command(action))
                case "pm":  # PENCILMARKS
                    parsed_actions.append(ValueAction.import_command(action))
                case "cd":  # CANDIDATES
                    parsed_actions.append(ValueAction.import_command(action))
                case "co":  # COLOR
                    parsed_actions.append(ColorAction.import_command(action))
                case "pe":  # PEN
                    parsed_actions.append(PenAction.import_command(action))
                case "pc":  # PENCOLOR
                    parsed_actions.append(PencolorAction.import_command(action))
                case "cl":  # CLEAR
                    parsed_actions.append(ClearAction.import_command(action))
                case "ud":  # UNDO
                    parsed_actions.append(UndoAction.import_command(action))
                case "rd":  # REDO
                    parsed_actions.append(RedoAction.import_command(action))
                case "gs":  # GROUPSTART
                    parsed_actions.append(GroupAction.import_command(action))
                case "ge":  # GROUPEND
                    parsed_actions.append(GroupAction.import_command(action))
                case "up":  # UNPAUSE
                    parsed_actions.append(PauseAction.import_command(action))
                case "wt":  # WAIT
                    parsed_actions.append(PauseAction.import_command(action))
                case "rs":  # RESET
                    parsed_actions.append(ResetAction.import_command(action))
                case _:
                    raise ValueError(f"無効な操作: {action[0]}")
    except Exception as e:
        return JSONResponse(content={"initialized": AGENT.encoded_puzzle, "serialized_state": old_serialized_state, "message": str(e)}, status_code=status.HTTP_400_BAD_REQUEST)
    try:
        AGENT._execute(parsed_actions)
    except Exception as e:
        AGENT.load_serialized_state(old_serialized_state)  # ロールバック
        return JSONResponse(content={"initialized": AGENT.encoded_puzzle, "serialized_state": old_serialized_state, "message": str(e)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    new_serialized_state = AGENT.get_serialized_state()
    return JSONResponse(content={"initialized": AGENT.encoded_puzzle, "serialized_state": new_serialized_state, "message": "Success"}, status_code=status.HTTP_200_OK)


@app.get("/is_completed")
async def is_completed() -> JSONResponse:
    """
    パズルが完成しているかどうかを確認するエンドポイント。
    
    戻り値:
        JSONResponse: パズルの完成状態を含むレスポンス。
    """
    if AGENT is None:
        return JSONResponse(content={"message": "アプリケーションが初期化されていません。"}, status_code=status.HTTP_400_BAD_REQUEST)
    is_completed = AGENT.puzzle_is_completed()
    return JSONResponse(content={"is_completed": is_completed, "message": "Success"}, status_code=status.HTTP_200_OK)


@app.get("/screenshot")
async def get_screenshot() -> StreamingResponse:
    """
    現在のパズルボードのスクリーンショットを取得するエンドポイント。
    
    戻り値:
        StreamingResponse: PNG形式のスクリーンショット画像。
    """
    if AGENT is None:
        return JSONResponse(content={"message": "アプリケーションが初期化されていません。"}, status_code=status.HTTP_400_BAD_REQUEST)
    screenshot = AGENT.take_screenshot()
    return StreamingResponse(BytesIO(screenshot), media_type="image/png")


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
