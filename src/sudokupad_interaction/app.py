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


# Size of the browser window
WINDOW_WIDTH, WINDOW_HEIGHT = 1920, 1200

# Path to the SudokuPad files
SUDOKUPAD_PATH = Path(__file__).resolve().parent / "sudoku_pad"

# Simon's custom color palette
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
class Operation(enum.Enum):
    """
    The operation of the cell.

    Attributes:
    SELECT (str): The select operation.
    DESELECT (str): The deselect operation.
    VALUE (str): The value operation.
    PENCILMARKS (str): The pencilmarks operation.
    CANDIDATES (str): The candidates operation.
    COLOUR (str): The colour operation.
    PEN (str): The pen operation.
    PENCOLOR (str): The pencolor operation.
    CLEAR (str): The clear operation.
    UNDO (str): The undo operation.
    REDO (str): The redo operation.
    GROUPSTART (str): The groupstart operation.
    GROUPEND (str): The groupend operation.
    UNPAUSE (str): The unpause operation.
    WAIT (str): The wait operation.
    RESET (str): The reset operation.
    NOOP (str): The no operation operation.
    """
    SELECT: str = "sl"
    DESELECT: str = "ds"
    VALUE: str = "vl"
    PENCILMARKS: str = "pm"
    CANDIDATES: str = "cd"
    COLOR: str = "co"
    PEN: str = "pe"
    PENCOLOR: str = "pc"
    CLEAR: str = "cl"
    UNDO: str = "ud"
    REDO: str = "rd"
    GROUPSTART: str = "gs"
    GROUPEND: str = "ge"
    UNPAUSE: str = "up"
    WAIT: str = "wt"
    RESET: str = "rs"  # NOTE: This operation is not used in the web application.


class BaseAction(BaseModel):
    """
    The base action.

    Attributes:
    operation (Operation): The operation.
    time_delta (int): The time delta.
    """
    operation: Operation
    time_delta: int = 1

    @field_validator("time_delta")
    @classmethod
    def validate_time_delta(cls, time_delta: int) -> int:
        if time_delta < 0:
            raise ValueError("The time_delta must be non-negative.")
        return time_delta

    @classmethod
    def import_command(cls, command: str) -> "BaseAction":
        """
        Import the action from a tuple.

        Args:
        command (str): The action.

        Returns:
        BaseAction: The action.
        """
        raise NotImplementedError("The import_command method must be implemented in the subclass.")

    def export_command(self) -> str:
        """
        Convert the action to a string.

        Returns:
        str: The action command in the format of the web application.
        """
        raise NotImplementedError("The export_command method must be implemented in the subclass.")

    @staticmethod
    def convert_cells_tuple(cells: list[tuple[int, int]]) -> str:
        """
        Convert the cells to a string.

        Args:
        cells (list[tuple[int, int]]): The cells.

        Returns:
        str: The string of the cells.
        """
        return "".join([f"r{cell[0] + 1}c{cell[1] + 1}" for cell in cells])

    @staticmethod
    def convert_cells_str(cells: str) -> list[tuple[int, int]]:
        """
        Convert the cells to a list.

        Args:
        cells (str): The cells.

        Returns:
        list[tuple[int, int]]: The list of the cells.
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
    The color action.

    Attributes:
    color (str): The color.
    """
    operation: Operation = Operation.COLOR
    color: str  # color should be str (0, 1, 2, ..., 9, a, b, ..., t).

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.COLOR:
            raise ValueError("The operation must be color.")
        return operation

    @field_validator("color")
    @classmethod
    def validate_color(cls, color: str) -> int:
        if len(color) != 1 or color not in "0123456789abcdefghijklmnopqrst":
            raise ValueError("The color must be a single character from 0 to t.")
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
    The pen action.

    This action is used with groupstart/pencolor/select/pen/deselect/groupend actions.
    [action list]
        0: All clear
        1: Line to the right cell
        2: Line to the bottom cell
        3: `x` mark on the right edge
        4: `x` mark on the bottom edge
        5: `o` mark in the cell
        6: `x` mark on the cell
        7: Line the right edge
        8: Line the bottom edge
        9: Line the left edge
        a: Line the top edge
        b: `x` mark on the left edge
        c: `x` mark on the top edge
        d: Line to the top-right cell
        e: Line to the bottom-right cell
        f: Line from the top-right corner to the bottom-left corner in the cell
        g: Line from the top-left corner to the bottom-right corner in the cell

    Attributes:
    shape (str): The shape of the pen.
    """
    operation: Operation = Operation.PEN
    shape: str  # shape should be str (0, 1, 2, ..., 9, a, b, ..., g).

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.PEN:
            raise ValueError("The operation must be pen.")
        return operation

    @field_validator("shape")
    @classmethod
    def validate_shape(cls, shape: str) -> int:
        if len(shape) != 1 or shape not in "0123456789abcdefg":
            raise ValueError("The shape must be a single character from 0 to g.")
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
    The pencolor action.

    Attributes:
    color (str): The color.
    """
    operation: Operation = Operation.PENCOLOR
    color: str  # color should be str (1, 2, ..., 9).

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.PENCOLOR:
            raise ValueError("The operation must be pencolor.")
        return operation

    @field_validator("color")
    @classmethod
    def validate_color(cls, color: str) -> int:
        if len(color) != 1 or color not in "123456789":
            raise ValueError("The color must be a single character from 1 to 9.")
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
    The clear action.
    [level] Clear if there is a renderedValue (at least one of the selected cells)
        0: value -> candidates -> pencilmarks -> color -> pen
        1: pencilmarks -> value -> candidates -> color -> pen
        2: candidates -> value -> pencilmarks -> color -> pen
        3: color -> value -> candidates -> pencilmarks -> pen

    Attributes:
    level (str): The level of the clear.
    """
    operation: Operation = Operation.CLEAR
    level: str  # level should be str (0, 1, 2, 3).

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.CLEAR:
            raise ValueError("The operation must be clear.")
        return operation

    @field_validator("level")
    @classmethod
    def validate_level(cls, level: str) -> int:
        if len(level) != 1 or level not in "0123":
            raise ValueError("The level must be a single character from 0 to 3.")
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
    The undo action.
    """
    operation: Operation = Operation.UNDO

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.UNDO:
            raise ValueError("The operation must be undo.")
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
    The redo action.
    """
    operation: Operation = Operation.REDO

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.REDO:
            raise ValueError("The operation must be redo.")
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
    The groupstart/groupend action.
    """
    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.GROUPSTART and operation != Operation.GROUPEND:
            raise ValueError("The operation must be groupstart or groupend.")
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
    The unpause/wait action.
    """
    value: int | None = None

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.UNPAUSE and operation != Operation.WAIT:
            raise ValueError("The operation must be unpause or wait.")
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
    The reset action.

    Attributes:
    operation (Operation): The operation.
    """
    operation: Operation = Operation.RESET

    @field_validator("operation")
    @classmethod
    def validate_operation(cls, operation: Operation) -> Operation:
        if operation != Operation.RESET:
            raise ValueError("The operation must be reset.")
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
    Wait for SudokuPad to fully load all components.
    Raises TimeoutException on failure.
    """
    # 1) Wait for DOM to be 'complete'
    WebDriverWait(driver, timeout).until(lambda d: d.execute_script("return document.readyState") == "complete")
    # 2) Wait for puzzle container
    WebDriverWait(driver, timeout).until(EC.presence_of_element_located((By.CSS_SELECTOR, ".app .cells .row .cell")))
    # 3) Wait until we can do Framework.app.addTool
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

    # 4) Wait until puzzle.id is non-empty.
    def puzzle_has_id(_drv: webdriver.Chrome) -> bool:
        puzzle_check_js = """
        if (!Framework || !Framework.app || !Framework.app.puzzle || !Framework.app.puzzle.currentPuzzle) {
            return null;
        }
        const p = Framework.app.puzzle.currentPuzzle;
        // if puzzle.id is missing or empty string
        if (!p.id) {
            return null;
        }
        return p.id;  // Return the puzzle ID string
        """
        val = _drv.execute_script(puzzle_check_js)
        return bool(val)  # anything non-empty is success

    WebDriverWait(driver, timeout).until(puzzle_has_id)


def load_sudokupad(encoded_puzzle: str, window_width: int, window_height: int, **kwargs) -> webdriver.Chrome:
    """
    Load the webapp from the given URL.

    Args:
        encoded_puzzle (str): The string that represents the puzzle (Not shortened ID).
        window_width (int): Width of the browser window.
        window_height (int): Height of the browser window.
        **kwargs: Additional arguments to be passed to the webdriver.

    Returns:
        webdriver.Chrome: Selenium webdriver
    """
    # Set up the Chrome options
    options = webdriver.ChromeOptions()
    options.add_argument("--headless")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-font-subpixel-positioning")
    options.add_argument("--disable-font-antialiasing")
    options.add_argument("--disable-lcd-text")
    options.add_argument("--disable-skia-runtime-opts")
    options.add_argument("--force-device-scale-factor=1")
    options.add_argument("--high-dpi-support=1")
    options.add_argument(f"--window-size={window_width},{window_height}")
    # Initialize the webdriver
    driver = webdriver.Chrome(options=options)
    # Load SudokuPad
    driver.get(f"file://{SUDOKUPAD_PATH}/index.html?puzzleid={encoded_puzzle}")
    # Disable animations
    driver.execute_script(
        "const style = document.createElement('style');style.type = 'text/css';style.innerHTML = '* { animation: none !important; transition: none !important; }';document.head.appendChild(style);"
    )
    # Wait for the app to load
    wait_for_sudokupad(driver)
    # Settings
    driver.execute_script("""
        Framework.setSetting("toolpen", true);  // Enable Pen Tool: On
        Framework.toggleSettingClass("toolpen", true);  // Enable Pen Tool: On
        Framework.setSetting("toolletter", true);  // Enable Letter Tool: On
        Framework.toggleSettingClass("toolletter", true);  // Enable Letter Tool: On
        Framework.setSetting("digitoutlines", true);  // Outlines on Elements: On
        Framework.toggleSettingClass("digitoutlines", true);  // Outlines on Elements: On
        Framework.setSetting("autocheck", false);  // Check on Finish: Off
        Framework.toggleSettingClass("autocheck", false);  // Check on Finish: Off
        Framework.setSetting("conflictchecker", "off");  // Conflict Checker: Off, Simon don't need no error checking.
        Framework.toggleSettingClass("conflictchecker", "off");  // Conflict Checker: Off
        Framework.features.conflictchecker.detachElem()  // Conflict Checker: Off
    """)
    driver.execute_script(f"ToolColor.tool.setPalette({json.dumps(SIMON_COLORS)});")
    # Click outside the window to dismiss the start button
    screen_width = driver.execute_script("return window.innerWidth;")
    screen_height = driver.execute_script("return window.innerHeight;")
    actions = ActionChains(driver)
    actions.reset_actions()
    actions.move_by_offset(screen_width - 1, screen_height - 1).click().perform()
    return driver


class WebAppAgent:
    def __init__(self, encoded_puzzle: str) -> None:
        self.encoded_puzzle = encoded_puzzle
        self._load_webapp()

    def take_screenshot(self) -> bytes:
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
        return self.driver.execute_script("return Framework.app.puzzle.isCompleted();")

    def get_serialized_state(self) -> str:
        json_str = self.driver.execute_script("return Framework.app.puzzle.serializeState();")
        return json_str

    def load_serialized_state(self, serialized_state: str) -> None:
        self.driver.execute_script(f"Framework.app.puzzle.deserializeState({serialized_state});")  # FIXME: Why the `highlighted` cells are not restored?

    def _load_webapp(self) -> None:
        # Load the Sudokupad
        self.driver = load_sudokupad(encoded_puzzle=self.encoded_puzzle, window_width=WINDOW_WIDTH, window_height=WINDOW_HEIGHT)
        # Get the device pixel ratio
        self.dpr = self.driver.execute_script("return window.devicePixelRatio;")
        # Load the SVG element
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
        if isinstance(action, list):
            for act in action:
                self._execute(act, **kwargs)
            return  # Execute all actions
        if isinstance(action, ResetAction):
            self.driver.execute_script("Framework.app.puzzle.restartPuzzle();")  # Framework.app.puzzle.resetPuzzle() + trigger("start")
        else:
            self.driver.execute_script(f"Framework.app.puzzle.act(\"{action.export_command()}\");")


AGENT = None


app = FastAPI()
@app.get("/")
async def root() -> JSONResponse:
    return JSONResponse(content={"message": "OK"}, status_code=status.HTTP_200_OK)


class InitData(BaseModel):
    encoded_puzzle: str


@app.put("/init")
async def init(data: InitData) -> JSONResponse:
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
    if AGENT is None:
        return JSONResponse(content={"initialized": "", "serialized_state": "", "message": "The app is not initialized."}, status_code=status.HTTP_400_BAD_REQUEST)
    serialized_state = AGENT.get_serialized_state()
    return JSONResponse(content={"initialized": AGENT.encoded_puzzle, "serialized_state": serialized_state, "message": "Success"}, status_code=status.HTTP_200_OK)


class SetStateData(BaseModel):
    serialized_state: str


@app.put("/set_state")
async def set_state(data: SetStateData) -> JSONResponse:
    if AGENT is None:
        return JSONResponse(content={"initialized": "", "serialized_state": "", "message": "The app is not initialized."}, status_code=status.HTTP_400_BAD_REQUEST)
    AGENT.load_serialized_state(data.serialized_state)
    serialized_state = AGENT.get_serialized_state()
    return JSONResponse(content={"initialized": AGENT.encoded_puzzle, "serialized_state": serialized_state, "message": "Success"}, status_code=status.HTTP_200_OK)


class ExecuteData(BaseModel):
    actions: list[str]


@app.put("/execute")
async def execute(data: ExecuteData) -> JSONResponse:
    if AGENT is None:
        return JSONResponse(content={"initialized": "", "serialized_state": "", "message": "The app is not initialized."}, status_code=status.HTTP_400_BAD_REQUEST)
    old_serialized_state = AGENT.get_serialized_state()
    parsed_actions = []
    try:
        for action in data.actions:
            match action[:2]:  # The first two characters are the operation
                case Operation.SELECT.value:
                    parsed_actions.append(SelectAction.import_command(action))
                case Operation.DESELECT.value:
                    parsed_actions.append(SelectAction.import_command(action))
                case Operation.VALUE.value:
                    parsed_actions.append(ValueAction.import_command(action))
                case Operation.PENCILMARKS.value:
                    parsed_actions.append(ValueAction.import_command(action))
                case Operation.CANDIDATES.value:
                    parsed_actions.append(ValueAction.import_command(action))
                case Operation.COLOR.value:
                    parsed_actions.append(ColorAction.import_command(action))
                case Operation.PEN.value:
                    parsed_actions.append(PenAction.import_command(action))
                case Operation.PENCOLOR.value:
                    parsed_actions.append(PencolorAction.import_command(action))
                case Operation.CLEAR.value:
                    parsed_actions.append(ClearAction.import_command(action))
                case Operation.UNDO.value:
                    parsed_actions.append(UndoAction.import_command(action))
                case Operation.REDO.value:
                    parsed_actions.append(RedoAction.import_command(action))
                case Operation.GROUPSTART.value:
                    parsed_actions.append(GroupAction.import_command(action))
                case Operation.GROUPEND.value:
                    parsed_actions.append(GroupAction.import_command(action))
                case Operation.UNPAUSE.value:
                    parsed_actions.append(PauseAction.import_command(action))
                case Operation.WAIT.value:
                    parsed_actions.append(PauseAction.import_command(action))
                case Operation.RESET.value:
                    parsed_actions.append(ResetAction.import_command(action))
                case _:
                    raise ValueError(f"Invalid operation: {action[0]}")
    except Exception as e:
        return JSONResponse(content={"initialized": AGENT.encoded_puzzle, "serialized_state": old_serialized_state, "message": str(e)}, status_code=status.HTTP_400_BAD_REQUEST)
    try:
        AGENT._execute(parsed_actions)
    except Exception as e:
        AGENT.load_serialized_state(old_serialized_state)  # Rollback
        return JSONResponse(content={"initialized": AGENT.encoded_puzzle, "serialized_state": old_serialized_state, "message": str(e)}, status_code=status.HTTP_500_INTERNAL_SERVER_ERROR)
    new_serialized_state = AGENT.get_serialized_state()
    return JSONResponse(content={"initialized": AGENT.encoded_puzzle, "serialized_state": new_serialized_state, "message": "Success"}, status_code=status.HTTP_200_OK)


@app.get("/is_completed")
async def is_completed() -> JSONResponse:
    if AGENT is None:
        return JSONResponse(content={"message": "The app is not initialized."}, status_code=status.HTTP_400_BAD_REQUEST)
    is_completed = AGENT.puzzle_is_completed()
    return JSONResponse(content={"is_completed": is_completed, "message": "Success"}, status_code=status.HTTP_200_OK)


@app.get("/screenshot")
async def get_screenshot() -> StreamingResponse:
    if AGENT is None:
        return JSONResponse(content={"message": "The app is not initialized."}, status_code=status.HTTP_400_BAD_REQUEST)
    screenshot = AGENT.take_screenshot()
    return StreamingResponse(BytesIO(screenshot), media_type="image/png")


if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
