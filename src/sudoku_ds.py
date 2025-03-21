from collections import defaultdict
from enum import Enum
import json
import os
import re
from typing import Optional, Tuple, Set, Union, Any


##########################
# Shared representations #
##########################
def coord_to_token(row: int, col: int, combine_position: bool) -> str:
    """
    Generate a token for coordinates.
    
    Args:
        row: Row number (1-indexed)
        col: Column number (1-indexed)
        combine_position: Whether to combine row and column into one token
        
    Returns:
        String token representing the coordinates
    """
    if combine_position:
        return f"<r{row}c{col}>"
    else:
        return f"<r{row}><c{col}>"


def value_to_token(value: str) -> str:
    """
    Generate a token for values.
    
    Args:
        value: The value to convert to a token
        
    Returns:
        String token representing the value
    """
    return f"<value{value}>"


def color_to_token(color: str) -> str:
    """
    Generate a token for colors.
    
    Args:
        color: The color to convert to a token
        
    Returns:
        String token representing the color
    """
    return f"<color{color}>"


def token_to_coord(token: str) -> Tuple[int, int]:
    """
    Extract coordinates from a token.
    
    Args:
        token: The token containing coordinate information
        
    Returns:
        A tuple of (row, col) as integers
        
    Raises:
        ValueError: If the token format is invalid
    """
    combine_position = token.count(">") == 1
    if combine_position:
        match = re.match(r"<r(\d+)c(\d+)>", token)
        if match:
            row, col = match.groups()
        else:
            raise ValueError(f"Invalid row-col token: {token}")
    else:
        match = re.match(r"<r(\d+)><c(\d+)>", token)
        if match:
            row, col = match.groups()
        else:
            raise ValueError(f"Invalid row-col token: {token}")
    return int(row), int(col)


def token_to_value(token: str) -> str:
    """
    Extract value from a token.
    
    Args:
        token: The token containing value information
        
    Returns:
        The extracted value as a string
        
    Raises:
        ValueError: If the token format is invalid
    """
    match = re.match(r"<value(.)>", token)
    if not match:
        raise ValueError(f"Invalid value token: {token}")
    return match.group(1)


def token_to_color(token: str) -> str:
    """
    Extract color from a token.
    
    Args:
        token: The token containing color information
        
    Returns:
        The extracted color as a string
        
    Raises:
        ValueError: If the token format is invalid
    """
    match = re.match(r"<color(.)>", token)
    if not match:
        raise ValueError(f"Invalid color token: {token}")
    return match.group(1)


######################
# Sudoku Basic Types #
######################
class ActionType(Enum):
    """Enumeration of possible Sudoku action types."""
    SELECT = "sl"
    DESELECT = "ds"
    VALUE = "vl"
    PENCILMARK = "pm"
    CANDIDATE = "cd"
    COLOR = "co"
    PEN = "pe"   # Not used for now
    CLEAR = "cl"


class OperationType(Enum):
    """Enumeration of possible operations (add or remove)."""
    ADD = "+"
    REMOVE = "-"


class ValueType(Enum):
    """Enumeration of possible cell values."""
    empty = "."
    number0 = "0"
    number1 = "1"
    number2 = "2"
    number3 = "3"
    number4 = "4"
    number5 = "5"
    number6 = "6"
    number7 = "7"
    number8 = "8"
    number9 = "9"

    def __lt__(self, other: "ValueType") -> bool:
        """Compare two ValueType objects based on their values."""
        return int(self.value) < int(other.value)


class ColorType(Enum):
    """Enumeration of possible colors for marking cells."""
    color0 = "0"
    color1 = "1"
    color2 = "2"
    color3 = "3"
    color4 = "4"
    color5 = "5"
    color6 = "6"
    color7 = "7"
    color8 = "8"
    color9 = "9"


# Set of actions that only affect selection state
SELECTION_ACTIONS = set([
    ActionType.SELECT.value,
    ActionType.DESELECT.value,
])


########################
# Sudoku Cell Handling #
########################
class SudokuCell:
    """
    Class to handle the Sudoku cell state and tokenization.

    Row and column are 1-indexed.
    
    Attributes:
        row (int): The row position (1-indexed)
        col (int): The column position (1-indexed)
        value (ValueType): The primary value in the cell
        candidates (list[ValueType]): list of candidate values for the cell
        pencilmarks (list[ValueType]): list of pencilmark values for the cell
    """
    def __init__(
        self,
        row: int, 
        col: int,
        value: ValueType = ValueType.empty,
        candidates: list[ValueType] = None,
        pencilmarks: list[ValueType] = None,
    ):
        """
        Initialize a new SudokuCell.
        
        Args:
            row: The row position (1-indexed)
            col: The column position (1-indexed)
            value: The primary value in the cell
            candidates: list of candidate values for the cell
            pencilmarks: list of pencilmark values for the cell
        """
        self.row = row
        self.col = col
        self.value = value
        self.candidates = candidates or []
        self.pencilmarks = pencilmarks or []

    def __eq__(self, other: "SudokuCell") -> bool:
        """
        Compare two SudokuCell objects for equality.
        
        Args:
            other: Another SudokuCell to compare with
            
        Returns:
            True if all attributes are equal, False otherwise
        """
        if not isinstance(other, SudokuCell):
            return False
            
        return (
            self.row == other.row
            and self.col == other.col
            and self.value == other.value
            and set(self.candidates) == set(other.candidates)
            and set(self.pencilmarks) == set(other.pencilmarks)
        )

    @classmethod
    def from_serialized(cls, row: int, col: int, cell_str: str) -> "SudokuCell":
        """
        Create a SudokuCell from a serialized string.
        
        Args:
            row: The row position (1-indexed)
            col: The column position (1-indexed)
            cell_str: The serialized cell string
            
        Returns:
            A new SudokuCell instance
        """
        # Parse the cell string
        slash_parts = cell_str.split("/")
        slash_parts += [""] * (6 - len(slash_parts))
        v_str = slash_parts[0].strip()  # Value
        c_str = slash_parts[1].strip()  # Candidates
        pm_str = slash_parts[2].strip()  # Pencilmarks
        co_str = slash_parts[3].strip()  # Colors
        hl_str = slash_parts[4].strip()  # Highlights
        pe_str = slash_parts[5].strip()  # Pen marks

        # Value
        value = ValueType("." if v_str == "" else v_str)
        # Candidates
        candidates = [ValueType(v) for v in c_str.split(",") if v]
        # Pencilmarks
        pencilmarks = [ValueType(v) for v in pm_str.split(",") if v]

        # Ignore other parts for now (colors, highlights, pen marks)

        return cls(row, col, value, candidates, pencilmarks)

    @classmethod
    def from_token_string(cls, cell_str: str) -> "SudokuCell":
        """
        Create a SudokuCell from a string of tokens.
        
        Args:
            cell_str: A string containing tokens that represent the cell
            
        Returns:
            A new SudokuCell instance
            
        Raises:
            ValueError: If the token format is invalid
        """
        # Split the cell string
        parts = cell_str.split(":")
        if len(parts) != 2:
            raise ValueError(f"Invalid cell token string: {cell_str}")
            
        rc_token = parts[0]
        other_tokens = parts[1]
        
        token_parts = other_tokens.split("/")
        if len(token_parts) < 3:
            raise ValueError(f"Invalid cell token parts: {other_tokens}")
            
        v_token = token_parts[0]
        c_tokens = token_parts[1]
        pm_tokens = token_parts[2]
        
        c_tokens = re.findall(r"(<value.+?>)", c_tokens)
        pm_tokens = re.findall(r"(<value.+?>)", pm_tokens)

        # Parse the row and column
        row, col = token_to_coord(rc_token)
        # Parse the value token
        value = ValueType(token_to_value(v_token))
        # Parse the candidate tokens
        candidates = [ValueType(token_to_value(token)) for token in c_tokens]
        # Parse the pencilmark tokens
        pencilmarks = [ValueType(token_to_value(token)) for token in pm_tokens]

        return cls(row, col, value, candidates, pencilmarks)

    def to_serialized(self) -> str:
        """
        Convert the cell state to a serialized string.
        
        Returns:
            A serialized representation of the cell
        """
        # Cell value
        v_str = "" if self.value == ValueType.empty else self.value.value
        # Cell candidates
        c_str = ",".join([x.value for x in sorted(self.candidates)])
        # Cell pencilmarks
        pm_str = ",".join([x.value for x in sorted(self.pencilmarks)])

        # Format the cell string
        cell_string = f"{v_str}/{c_str}/{pm_str}"

        return cell_string

    def to_token_string(self, combine_position: bool = False) -> str:
        """
        Convert the cell state to a string of tokens.
        
        Args:
            combine_position: Whether to combine row and column into one token
            
        Returns:
            A string representation of the cell using tokens
        """
        # Cell coordinates
        rc_token = coord_to_token(self.row, self.col, combine_position)
        # Cell value
        v_token = value_to_token(self.value.value)
        # Cell candidates
        c_token = "".join([value_to_token(v.value) for v in sorted(self.candidates)])
        # Cell pencilmarks
        pm_token = "".join([value_to_token(v.value) for v in sorted(self.pencilmarks)])

        # Format the cell string
        cell_string = f"{rc_token}:{v_token}/{c_token}/{pm_token}"

        return cell_string

    def is_empty(self) -> bool:
        """
        Check if the cell is empty (no value set).
        
        Returns:
            True if the cell has no value, False otherwise
        """
        return self.value == ValueType.empty


#########################
# Sudoku Board Handling #
#########################
class SudokuBoard:
    """
    Class to handle the Sudoku board state and tokenization.
    
    Attributes:
        rows (int): Number of rows in the board
        cols (int): Number of columns in the board
        cells (list[SudokuCell]): list of all cells in the board
        cell_map (dict[Tuple[int, int], SudokuCell]): dictionary mapping (row, col) to cells for quick access
    """
    def __init__(self, rows: int, cols: int, cells: list[SudokuCell] = None, givens: dict = None):
        """
        Initialize a new SudokuBoard.
        
        Args:
            rows: Number of rows in the board
            cols: Number of columns in the board
            cells: list of SudokuCell objects
            givens: dictionary of given values (not fully implemented)
        """
        self.rows = rows
        self.cols = cols
        self.cells = cells or []
        
        # Create a cell map for quick lookups
        self.cell_map = {}
        if cells:
            for cell in cells:
                self.cell_map[(cell.row, cell.col)] = cell

    def __eq__(self, other: "SudokuBoard") -> bool:
        """
        Compare two SudokuBoard objects for equality.
        
        Args:
            other: Another SudokuBoard to compare with
            
        Returns:
            True if all attributes are equal, False otherwise
        """
        return (
            self.rows == other.rows
            and self.cols == other.cols
            and self.cells == other.cells
        )
        
    @classmethod
    def from_serialized(cls, serialized_state: str, rows: int, cols: int, givens: dict = None) -> "SudokuBoard":
        """
        Create a SudokuBoard from the JSON string and puzzle metadata.
        
        Args:
            serialized_state: JSON string representing the board state
            rows: Number of rows in the board
            cols: Number of columns in the board
            givens: dictionary of given values
            
        Returns:
            A new SudokuBoard instance
            
        Raises:
            ValueError: If the serialized state is invalid
        """
        givens = givens or {}
        try:
            parsed_state = json.loads(serialized_state)
            cell_strings = parsed_state.get("cells", [])
        except (json.JSONDecodeError, TypeError) as e:
            raise ValueError(f"Invalid serialized state: {e}")
            
        cells = []
        for i, cell_str in enumerate(cell_strings):
            row = i // cols + 1
            col = i % cols + 1
            
            # Create a SudokuCell
            cell = SudokuCell.from_serialized(row, col, cell_str)
            
            # Update cell value according to givens
            for g in givens:
                if g.startswith(f"r{row}c{col}"):
                    v_str = g.split("=")[1]
                    cell.value = ValueType(v_str)
                    break
                
            cells.append(cell)

        return cls(
            rows=rows,
            cols=cols,
            cells=cells
        )

    @classmethod
    def from_ascii(cls, board_str: str, rows: int, cols: int) -> "SudokuBoard":
        """
        Create a SudokuBoard from an ASCII representation.
        
        Args:
            board_str: ASCII string representing the board
            rows: Number of rows in the board
            cols: Number of columns in the board
            
        Returns:
            A new SudokuBoard instance
            
        Raises:
            ValueError: If the board string has incorrect length
        """
        if len(board_str) != rows * cols:
            raise ValueError(
                f"Board string length ({len(board_str)}) doesn't match dimensions ({rows}x{cols})"
            )
            
        cells = []
        for i, char in enumerate(board_str):
            row = i // cols + 1
            col = i % cols + 1
            cell = SudokuCell(row, col, ValueType(char))
            cells.append(cell)
            
        return cls(
            rows=rows,
            cols=cols,
            cells=cells
        )
    
    @classmethod
    def from_string(cls, board_str: str) -> "SudokuBoard":
        """
        Create a SudokuBoard from a string representation.
        
        Args:
            board_str: String containing token representations of cells
            
        Returns:
            A new SudokuBoard instance
        """
        cell_strings = board_str.strip().split("\n")
        
        cells = []
        for cell_str in cell_strings:
            cell = SudokuCell.from_token_string(cell_str)
            cells.append(cell)

        # Sort cells by row and column
        cells = sorted(cells, key=lambda cell: (cell.row - 1) * cols + (cell.col - 1))

        rows = max(cell.row for cell in cells)
        cols = max(cell.col for cell in cells)
        return cls(
            rows=rows,
            cols=cols,
            cells=cells
        )

    def to_serialized(self) -> str:
        """
        Convert the board state to a serialized string.
        
        Returns:
            A JSON string representing the board state
        """
        cell_strings = []
        for cell in self.cells:
            cell_strings.append(cell.to_serialized())
            
        board_dict = {"cells": cell_strings}
        return json.dumps(board_dict)

    def to_ascii(self, unfilled: str = ".") -> str:
        """
        Convert the board state to a string showing only cell values.
        
        Args:
            unfilled: Character to use for empty cells
            
        Returns:
            A plain ASCII string representing the board
        """
        board_str = ""
        for cell in self.cells:
            if cell.value == ValueType.empty:
                value = unfilled
            else:
                value = cell.value.value
            board_str += value
            
        return board_str

    def to_spaced_ascii(self, unfilled: str = ".") -> str:
        """
        Convert the board state to a string showing only cell values with spaces and newlines.
        
        Args:
            unfilled: Character to use for empty cells
            
        Returns:
            A formatted ASCII string representing the board
        """
        board_str = ""
        for i, cell in enumerate(self.cells):
            if cell.value == ValueType.empty:
                value = unfilled
            else:
                value = cell.value.value
            board_str += value
            
            if (i + 1) % self.cols == 0:
                board_str += "\n"
            else:
                board_str += " "
                
        board_str = board_str.strip()
        return board_str

    def to_string(self, combine_position: bool = False) -> str:
        """
        Convert the board state to a string showing cell values/candidates/pencilmarks.
        
        Args:
            combine_position: Whether to combine row and column into one token
            
        Returns:
            A string representing the board with all cell details
        """
        cell_strings = []
        for cell in self.cells:
            cell_string = cell.to_token_string(combine_position)
            cell_strings.append(cell_string)
            
        board_str = "\n".join(cell_strings)
        return board_str

    def get_cell(self, row: int, col: int) -> SudokuCell:
        """
        Get the cell at the given row and column.
        
        Args:
            row: Row index (1-indexed)
            col: Column index (1-indexed)
            
        Returns:
            The SudokuCell at the specified position
            
        Raises:
            ValueError: If the row or column is out of bounds
        """
        if row < 1 or row > self.rows or col < 1 or col > self.cols:
            raise ValueError(
                f"Error in accessing cell from a {self.rows}x{self.cols} board. "
                f"Invalid row or column: {row}x{col}"
            )
            
        try:
            return self.cell_map[(row, col)]    
        except KeyError:
            raise ValueError(f"Cell at position {row}x{col} not found")

    def execute_action(self, action: "SudokuAction") -> None:
        """
        Execute the given action on the board.
        
        Args:
            action: The SudokuAction to execute
            
        Raises:
            ValueError: If the action is invalid or cannot be executed
        """
        if action.action_type == ActionType.SELECT:
            # Selection actions don't modify the board state
            pass
        elif action.action_type == ActionType.DESELECT:
            # Deselection actions don't modify the board state
            pass
        elif action.action_type == ActionType.VALUE:
            if not action.coordinates:
                raise ValueError(f"Error in executing action: {action}. No coordinates provided.")
                
            if len(action.coordinates) != 1:
                raise ValueError(
                    f"Error in executing action: {action}. "
                    f"Expected 1 coordinate but got {len(action.coordinates)}."
                )
                
            row, col = action.coordinates[0]
            cell = self.get_cell(row, col)
            
            # Check if value can be placed
            if cell.value != ValueType.empty:
                raise ValueError(
                    f"Error in executing action: {action}. "
                    f"Cell {row}x{col} already has a value: {cell.value.value}"
                )
                
            cell.value = action.value
            
        elif action.action_type == ActionType.PENCILMARK:
            if not action.coordinates:
                raise ValueError(f"Error in executing action: {action}. No coordinates provided.")
                
            if not action.operation:
                raise ValueError(f"Error in executing action: {action}. No operation specified.")
                
            for row, col in action.coordinates:
                cell = self.get_cell(row, col)
                
                if action.operation == OperationType.ADD:
                    if action.value not in cell.pencilmarks:
                        cell.pencilmarks.append(action.value)
                    else:
                        raise ValueError(
                            f"Error in executing action: {action}. "
                            f"Pencilmark {action.value.value} already exists in cell {row}x{col}"
                        )
                    
                elif action.operation == OperationType.REMOVE:
                    if action.value in cell.pencilmarks:
                        cell.pencilmarks.remove(action.value)
                    else:
                        raise ValueError(
                            f"Error in executing action: {action}. "
                            f"Pencilmark {action.value.value} doesn't exist in cell {row}x{col}"
                        )
                    
        elif action.action_type == ActionType.CANDIDATE:
            if not action.coordinates:
                raise ValueError(f"Error in executing action: {action}. No coordinates provided.")
                
            if not action.operation:
                raise ValueError(f"Error in executing action: {action}. No operation specified.")
                
            for row, col in action.coordinates:
                cell = self.get_cell(row, col)
                
                if action.operation == OperationType.ADD:
                    if action.value not in cell.candidates:
                        cell.candidates.append(action.value)
                    else:
                        raise ValueError(
                            f"Error in executing action: {action}. "
                            f"Candidate {action.value.value} already exists in cell {row}x{col}"
                        )
                    
                elif action.operation == OperationType.REMOVE:
                    if action.value in cell.candidates:
                        cell.candidates.remove(action.value)
                    else:
                        raise ValueError(
                            f"Error in executing action: {action}. "
                            f"Candidate {action.value.value} doesn't exist in cell {row}x{col}"
                        )
                    
        elif action.action_type == ActionType.COLOR:
            # COLOR actions are not fully implemented yet
            pass

        elif action.action_type == ActionType.PEN:
            # PEN actions are not fully implemented yet
            pass
            
        elif action.action_type == ActionType.CLEAR:
            if not action.coordinates:
                raise ValueError(f"Error in executing action: {action}. No coordinates provided.")
                
            for row, col in action.coordinates:
                cell = self.get_cell(row, col)
                
                # Different clear operations based on value
                # 0 - clear value
                if action.value == ValueType("0"):
                    cell.value = ValueType(".")
                # 1 - clear pencilmarks
                elif action.value == ValueType("1"):
                    cell.pencilmarks = []
                # 2 - clear candidates
                elif action.value == ValueType("2"):
                    cell.candidates = []
                # 3 - clear colors
                elif action.value == ValueType("3"):
                    # Not implemented yet
                    pass
                # 4 - clear pen
                elif action.value == ValueType("4"):
                    # Not implemented yet
                    pass
                # 5 - clear everything
                elif action.value == ValueType("5"):
                    cell.value = ValueType(".")
                    cell.pencilmarks = []
                    cell.candidates = []
                else:
                    raise ValueError(
                        f"Error in executing action: {action}. "
                        f"Invalid clear action value: {action.value.value}"
                    )
        else:
            raise ValueError(
                f"Error in executing action: {action}. "
                f"Invalid action type: {action.action_type.value}"
            )


##########################
# Sudoku Action Handling #
##########################
class SudokuAction:
    """
    A class to represent a Sudoku action in various formats.
    This centralizes all action-related functionality.
    
    Attributes:
        action_type (ActionType): The type of action
        operation (OperationType): The operation (add/remove) if applicable
        value (ValueType): The value associated with the action
        color (ColorType): The color for color actions
        coordinates (list[Tuple[int, int]]): list of affected cell coordinates
        use_all (bool): Whether the action applies to all cells
    """
    def __init__(
        self,
        action_type: ActionType,
        operation: Optional[OperationType] = None,
        value: Optional[ValueType] = None,
        color: Optional[ColorType] = None,
        coordinates: list[Tuple[int, int]] = None,
        use_all: bool = False
    ):
        """
        Initialize a new SudokuAction.
        
        Args:
            action_type: The type of action
            operation: The operation (add/remove) if applicable
            value: The value associated with the action
            color: The color for color actions
            coordinates: list of affected cell coordinates
            use_all: Whether the action applies to all cells
        """
        self.action_type = action_type
        self.operation = operation
        self.value = value
        self.color = color
        self.coordinates = coordinates or []
        self.use_all = use_all

    def __repr__(self) -> str:
        """
        Create a string representation of the action.
        
        Returns:
            A string representation for debugging
        """
        return (f"SudokuAction(type={self.action_type.value}, op={self.operation.value if self.operation else None}, "
                f"value={self.value.value if self.value else None}, "
                f"coords={self.coordinates}, all={self.use_all})")

    def __eq__(self, other: Any) -> bool:
        """
        Compare two SudokuAction objects for equality.
        
        Args:
            other: Another object to compare with
            
        Returns:
            True if all attributes are equal, False otherwise
        """
        if not isinstance(other, SudokuAction):
            return False
            
        return (
            self.action_type == other.action_type
            and self.operation == other.operation
            and self.value == other.value
            and self.color == other.color
            and set(self.coordinates) == set(other.coordinates)
            and self.use_all == other.use_all
        )
    
    @classmethod
    def from_serialized(cls, action_str: str) -> "SudokuAction":
        """
        Parse a string representation of an action (e.g. "cd:+:5:r3c9" or "ds:all").
        
        Args:
            action_str: The serialized action string
            
        Returns:
            A SudokuAction object
            
        Raises:
            ValueError: If the action string format is invalid
        """
        # Split by colon
        parts = action_str.split(":")
        if not parts:
            raise ValueError(f"Invalid action string: {action_str}")
        
        # The first part is always action_type
        try:
            action_type = ActionType(parts[0])  # e.g. "cd" or "ds" or "pe", etc.
        except ValueError:
            raise ValueError(f"Invalid action type: {parts[0]}")
        
        # Special case for ds:all
        if action_type == ActionType.DESELECT and len(parts) >= 2 and parts[1] == "all":
            return cls(action_type=action_type, use_all=True)
        
        # Handle operation (+/-) if present
        idx = 1
        operation = None
        if len(parts) > 1 and parts[1] in ["+", "-"]:
            operation = OperationType("+" if parts[1] == "+" else "-")
            idx = 2
            
        # Handle value argument
        value = None
        if action_type in [ActionType.VALUE, ActionType.PENCILMARK, ActionType.CANDIDATE, 
                         ActionType.COLOR, ActionType.PEN, ActionType.CLEAR] and idx < len(parts):
            try:
                value = ValueType(parts[idx])
            except ValueError:
                raise ValueError(f"Invalid value: {parts[idx]}")
            idx += 1
        
        # Handle color argument for pen tool
        color = None
        if action_type == ActionType.PEN and idx < len(parts):
            try:
                color = ColorType(parts[idx])
            except ValueError:
                raise ValueError(f"Invalid color: {parts[idx]}")
            idx += 1
        
        # Handle coordinates
        coordinates = []
        if idx < len(parts):
            coords_str = parts[idx]
            coords_list = coords_str.split(",")
            for coord in coords_list:
                match = re.match(r"r(\d+)c(\d+)", coord)
                if match:
                    row, col = match.groups()
                    coordinates.append((int(row), int(col)))
                else:
                    raise ValueError(f"Invalid coordinates: {coord}")
            
        return cls(
            action_type=action_type,
            operation=operation,
            value=value,
            color=color,
            coordinates=coordinates
        )
    
    def to_serialized(self) -> str:
        """
        Convert a SudokuAction object to its string representation.
        
        Returns:
            A serialized string representation of the action
        """
        parts = [self.action_type.value]
        
        if self.use_all and self.action_type == ActionType.DESELECT:
            parts.append("all")
            return ":".join(parts)
        
        if self.operation is not None:
            parts.append(self.operation.value)
            
        if self.value is not None:
            parts.append(self.value.value)
            
        if self.color is not None:
            parts.append(self.color.value)
            
        if self.coordinates:
            coords_str = ",".join([f"r{row}c{col}" for row, col in sorted(self.coordinates)])
            parts.append(coords_str)
            
        return ":".join(parts)
    
    @classmethod
    def from_tokens(cls, tokens: list[str]) -> "SudokuAction":
        """
        Convert a list of tokens back to a SudokuAction object.
        
        Args:
            tokens: list of tokens representing an action
            
        Returns:
            A SudokuAction object
            
        Raises:
            ValueError: If the token format is invalid
        """    
        if not tokens:
            raise ValueError("Empty token list")
            
        # Parse action type
        action_type_token = tokens[0]
        if not action_type_token.startswith("<") or not action_type_token.endswith(">"):
            raise ValueError(f"Invalid action type token: {action_type_token}")
            
        try:
            action_type = ActionType(action_type_token[1:-1])  # Remove < > brackets
        except ValueError:
            raise ValueError(f"Invalid action type: {action_type_token[1:-1]}")
        
        # Check for "all" special case
        if len(tokens) > 1 and tokens[1] == "<all>":
            return cls(action_type=action_type, use_all=True)
            
        # Parse operation if present
        idx = 1
        operation = None
        if len(tokens) > idx and tokens[idx] in ["<+>", "<->"]:
            operation = OperationType(tokens[idx][1:-1])  # Remove < > brackets
            idx += 1
            
        # Parse value if present
        value = None
        color = None
        if idx < len(tokens) and tokens[idx].startswith("<value"):
            try:
                value = ValueType(tokens[idx][6:-1])  # Extract from <valueX>
            except ValueError:
                raise ValueError(f"Invalid value token: {tokens[idx]}")
                
            idx += 1
            
            # Handle color for pen tool
            if action_type == ActionType.PEN and idx < len(tokens) and tokens[idx].startswith("<color"):
                try:
                    color = ColorType(tokens[idx][6:-1])  # Extract from <colorX>
                except ValueError:
                    raise ValueError(f"Invalid color token: {tokens[idx]}")
                    
                idx += 1
                
        # Determine coordinate format
        combine_position = tokens[idx].startswith("<r") and "c" in tokens[idx]
        
        # Parse coordinates
        coordinates = []
        while idx < len(tokens):
            if combine_position:
                match = re.match(r"<r(\d+)c(\d+)>", tokens[idx])
                if match is None:
                    raise ValueError(
                        f"Invalid coordinate token at index {idx}: {tokens[idx]}"
                    )
                row, col = match.groups()
                coordinates.append((int(row), int(col)))
                idx += 1
            else:
                if not (idx + 1 < len(tokens)
                    and tokens[idx].startswith("<r")
                    and tokens[idx+1].startswith("<c")
                ): 
                    raise ValueError(
                        f"Invalid coordinate tokens at index {idx}: {tokens[idx:idx+2]}"
                    )
                try:
                    row = int(tokens[idx][2:-1])  # Extract from <rX>
                    col = int(tokens[idx+1][2:-1])  # Extract from <cX>
                except (ValueError, IndexError):
                    raise ValueError(
                        f"Invalid row/column values at index {idx}: {tokens[idx:idx+2]}"
                    )
                coordinates.append((row, col))
                idx += 2

        return cls(
            action_type=action_type,
            operation=operation,
            value=value,
            color=color,
            coordinates=coordinates
        )
    
    def to_tokens(self, combine_position: bool = False) -> list[str]:
        """
        Convert a SudokuAction object to a list of tokens.
        
        Args:
            combine_position: Whether to combine row and column into one token
            
        Returns:
            A list of tokens representing the action
        """
        tokens = []
        
        # Add action type token
        tokens.append(f"<{self.action_type.value}>")
        
        # Handle "ds:all" as a special case
        if self.action_type == ActionType.DESELECT and self.use_all:
            tokens.append("<all>")
            return tokens
            
        # Add operation token if present
        if self.operation is not None:
            tokens.append(f"<{self.operation.value}>")
            
        # Add value token if present
        if self.value is not None:
            if self.action_type == ActionType.PEN:
                tokens.append(value_to_token(self.value.value))
                if self.color is not None:
                    tokens.append(color_to_token(self.color.value))
            else:
                tokens.append(value_to_token(self.value.value))
                
        # Add coordinate tokens
        for row, col in sorted(self.coordinates):
            tokens.append(coord_to_token(row, col, combine_position))
                
        return tokens
    
    def to_sudokupad_actions(self) -> list[list[str]]:
        """
        Convert a SudokuAction to SudokuPad format actions.
        May return multiple actions as needed.
        
        Returns:
            A list of SudokuPad action sequences
        """
        if self.action_type in [ActionType.SELECT, ActionType.DESELECT]:
            # Skip these actions for now
            return []
            
        sudokupad_actions = []
        
        if self.action_type == ActionType.VALUE:
            # Handle value actions - need to select, set value, deselect
            for row, col in sorted(self.coordinates):
                coord = f"r{row}c{col}"
                sp_actions = [
                    f"sl:{coord}/1",
                    f"vl:{self.value.value}/1",
                    f"ds:{coord}/1"
                ]
                sudokupad_actions.append(sp_actions)
                
        elif self.action_type in [ActionType.PENCILMARK, ActionType.CANDIDATE, ActionType.COLOR]:
            # Handle pencilmark, candidate, and color actions
            for row, col in sorted(self.coordinates):
                coord = f"r{row}c{col}"
                sp_actions = [
                    f"sl:{coord}/1",
                    f"{self.action_type.value}:{self.value.value}/1",
                    f"ds:{coord}/1"
                ]
                sudokupad_actions.append(sp_actions)
                
        elif self.action_type == ActionType.CLEAR:
            # Handle clear actions
            for row, col in sorted(self.coordinates):
                coord = f"r{row}c{col}"
                sp_actions = [
                    f"sl:{coord}/1",
                    f"{self.action_type.value}:{self.value.value}/1",
                    f"ds:{coord}/1"
                ]
                sudokupad_actions.append(sp_actions)
                
        # Pen actions are currently skipped
                
        return sudokupad_actions
    

def action_token_vocab(
    max_rows: int = 20,
    max_cols: int = 20,
    combine_position: bool = False
) -> list[str]:
    """
    Generate the complete vocabulary of tokens used in the system.
    
    Args:
        max_rows: Maximum number of rows to generate tokens for
        max_cols: Maximum number of columns to generate tokens for
        combine_position: Whether to combine row and column into one token
        
    Returns:
        A list of all possible tokens
    """
    tokens = []
    
    # Action types
    for action_type in ActionType:
        tokens.append(f"<{action_type.value}>")
    
    # Operation tokens
    tokens.append("<+>")
    tokens.append("<->")
    
    # Special "all" token
    tokens.append("<all>")
    
    # Value tokens - numbers and special characters
    for v in ValueType:
        tokens.append(f"<value{v.value}>")
    
    # Color tokens
    for v in ColorType:
        tokens.append(f"<color{v.value}>")
    
    # Coordinate tokens
    if combine_position:
        # Combined row-col tokens
        for r in range(1, max_rows + 1):
            for c in range(1, max_cols + 1):
                tokens.append(f"<r{r}c{c}>")
    else:
        # Separate row and column tokens
        for r in range(1, max_rows + 1):
            tokens.append(f"<r{r}>")
        for c in range(1, max_cols + 1):
            tokens.append(f"<c{c}>")
    
    # Board tokens
    tokens.append("<board>")
    tokens.append("</board>")
    
    # Remove duplicates while preserving order
    seen = set()
    unique_tokens = []
    for token in tokens:
        if token not in seen:
            seen.add(token)
            unique_tokens.append(token)
    
    return unique_tokens