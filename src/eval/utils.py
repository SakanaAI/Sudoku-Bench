import random
import re


def pretty_print_visual_elements(visual_elements: list) -> str:
    """
    Pretty print the visual elements.
    """
    out = []
    for c in visual_elements:
        ctype = c.get("type", "")
        
        if ctype == "lines":
            out.append(f"line, color: {c['color_name']}, coords: {' '.join(c['coords'])}")
        elif ctype == "arrows":
            out.append(f"arrow, color: {c['color_name']}, coords (base to tip): {' '.join(c['coords'])}")
        elif ctype in ("diagonal arrow", "horizontal arrow", "vertical arrow"):
            out.append(f"{ctype}, color: {c['color_name']}, in location: {c['coords'][0]}, pointing {c['direction']}")
        elif ctype in ("underlays", "overlays"):
            shape = f"shape: {c['shape']}" if c.get('shape') else ""
            text_val = str(c.get("text", "")).strip()
            text = f"text: {text_val}" if text_val else ""

            # color processing
            color_name = c.get("color_name", "")
            border_color_name = c.get("border_color_name", "")
            if color_name and border_color_name:
                if color_name == border_color_name:
                    color = f"color: {color_name}"
                else:
                    color = f"color: {color_name} (stroke color: {border_color_name})"
            elif color_name:
                color = f"color: {color_name}"
            elif border_color_name:
                color = f"stroke color: {border_color_name}"
            else:
                color = ""
            
            loc_type = c.get("loc", "")
            if loc_type == "cell":
                loc = f"location: {c['coords'][0]}"
            elif loc_type in ("vertical edge", "horizontal edge"):
                loc = f"location: between {c['coords'][0]} and {c['coords'][1]}"
            elif loc_type == "corner":
                loc = f"location: at the corner of {' '.join(c['coords'])}"
            else:
                loc = ""
            
            parts = [part for part in (text, shape, color, loc) if part]
            out.append(", ".join(parts))
        elif ctype == "inequality":
            out.append(f"inequality arrow: {c['direction']} between {c['cells'][0]} and {c['cells'][1]}")
        
        if ctype == "cage":
            if c.get("style", "") == "killer":
                if c.get("value", "") != "":
                    out.append(f"killer cage (value {c['value']}): {' '.join(c['cells'])}")
                else:
                    out.append(f"killer cage: {' '.join(c['cells'])}")
            elif c.get("style", "") == "box":
                if c.get("value", "") != "":
                    out.append(f"region (value {c['value']}): {' '.join(c['cells'])}")
                else:
                    out.append(f"region: {' '.join(c['cells'])}")

        if ctype == "global":
            out.append(f"global: {c['text']}")

        if ctype == "manual":
            out.append(f"{c['text']}")

    return "- " + "\n- ".join(out)


def extract_action_from_response(response_text: str) -> tuple:
    """
    Extract the last action from the response text.
    """
    matches = re.findall(r"<ANSWER>\s*r(\d+)c(\d+):\s*(\d+)\s*</ANSWER>", response_text)
    if matches:
        return matches[-1]
    else:
        return ()


def random_fill_hints(initial_board: str, solution: str, num_empty_cells: int, shuffle_seed: int) -> str:
    """
    Randomly fill in some hints from the solution.
    Return None if the requested number of empty cells is not possible (larger than existing empty cells).
    """
    assert num_empty_cells > 0
    initial_board = list(initial_board)
    blanks = [i for i, ch in enumerate(initial_board) if ch == '.']
    if num_empty_cells >= len(blanks):
        return None
    rng = random.Random(shuffle_seed)
    rng.shuffle(blanks)
    num_hints = len(blanks) - num_empty_cells
    blanks = blanks[:num_hints]
    for i in blanks:
        initial_board[i] = solution[i]
    return ''.join(initial_board)