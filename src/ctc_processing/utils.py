import json


def remove_special_digits_from_action_serialized(action_serialized: str, valid_digits: set) -> str:
    if action_serialized.startswith("vl"):
        action_type, digit_arg, coord = action_serialized.split(":")
        if digit_arg not in valid_digits:
            return None
        return f"{action_type}:{digit_arg}:{coord}"
    elif action_serialized.startswith("pm") or action_serialized.startswith("cd"):
        action_type, operation, digit_arg, coord = action_serialized.split(":")
        if digit_arg not in valid_digits:
            return None
        return f"{action_type}:{operation}:{digit_arg}:{coord}"
    else:
        return action_serialized


def remove_special_digits_from_serialized_board(serialized_board: str, valid_digits: set) -> str:
    unserialize_board = json.loads(serialized_board)
    cells = unserialize_board["cells"]
    
    def remove_special_digits(cell_str):
        # Parse the cell string
        slash_parts = cell_str.split("/")
        slash_parts += [""] * (6 - len(slash_parts))
        v_str = slash_parts[0].strip()  # Value
        c_str = slash_parts[1].strip()  # Candidates
        pm_str = slash_parts[2].strip()  # Pencilmarks
        co_str = slash_parts[3].strip()  # Colors
        hl_str = slash_parts[4].strip()  # Highlights
        pe_str = slash_parts[5].strip()  # Pen marks

        v_str = ",".join([d for d in v_str.split(",") if d in valid_digits])
        c_str = ",".join([d for d in c_str.split(",") if d in valid_digits])
        pm_str = ",".join([d for d in pm_str.split(",") if d in valid_digits])

        return f"{v_str}/{c_str}/{pm_str}/{co_str}/{hl_str}/{pe_str}"
        
    for idx, cell_str in enumerate(cells):
        cells[idx] = remove_special_digits(cell_str)

    serialize_board = json.dumps(unserialize_board)
    return serialize_board