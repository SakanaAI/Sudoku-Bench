"""
SudokuPad Visual Elements Extraction Utility
"""
import json
import copy
from math import copysign
from typing import Optional, Tuple
import matplotlib.colors as mcolors


# Standard region definitions for 9x9, 6x6, 4x4 puzzles
# These constants define the standard box regions for different puzzle sizes
SOURCE_PUZZLE_REGIONS_9X9 = '[[[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]], [[0, 3], [0, 4], [0, 5], [1, 3], [1, 4], [1, 5], [2, 3], [2, 4], [2, 5]], [[0, 6], [0, 7], [0, 8], [1, 6], [1, 7], [1, 8], [2, 6], [2, 7], [2, 8]], [[3, 0], [3, 1], [3, 2], [4, 0], [4, 1], [4, 2], [5, 0], [5, 1], [5, 2]], [[3, 3], [3, 4], [3, 5], [4, 3], [4, 4], [4, 5], [5, 3], [5, 4], [5, 5]], [[3, 6], [3, 7], [3, 8], [4, 6], [4, 7], [4, 8], [5, 6], [5, 7], [5, 8]], [[6, 0], [6, 1], [6, 2], [7, 0], [7, 1], [7, 2], [8, 0], [8, 1], [8, 2]], [[6, 3], [6, 4], [6, 5], [7, 3], [7, 4], [7, 5], [8, 3], [8, 4], [8, 5]], [[6, 6], [6, 7], [6, 8], [7, 6], [7, 7], [7, 8], [8, 6], [8, 7], [8, 8]]]'
CURRENT_PUZZLE_CAGES_9X9 = '[{"cells": "r1c1,r1c2,r1c3,r2c1,r2c2,r2c3,r3c1,r3c2,r3c3", "sum": 45, "unique": true, "style": "box", "type": "region"}, {"cells": "r1c4,r1c5,r1c6,r2c4,r2c5,r2c6,r3c4,r3c5,r3c6", "sum": 45, "unique": true, "style": "box", "type": "region"}, {"cells": "r1c7,r1c8,r1c9,r2c7,r2c8,r2c9,r3c7,r3c8,r3c9", "sum": 45, "unique": true, "style": "box", "type": "region"}, {"cells": "r4c1,r4c2,r4c3,r5c1,r5c2,r5c3,r6c1,r6c2,r6c3", "sum": 45, "unique": true, "style": "box", "type": "region"}, {"cells": "r4c4,r4c5,r4c6,r5c4,r5c5,r5c6,r6c4,r6c5,r6c6", "sum": 45, "unique": true, "style": "box", "type": "region"}, {"cells": "r4c7,r4c8,r4c9,r5c7,r5c8,r5c9,r6c7,r6c8,r6c9", "sum": 45, "unique": true, "style": "box", "type": "region"}, {"cells": "r7c1,r7c2,r7c3,r8c1,r8c2,r8c3,r9c1,r9c2,r9c3", "sum": 45, "unique": true, "style": "box", "type": "region"}, {"cells": "r7c4,r7c5,r7c6,r8c4,r8c5,r8c6,r9c4,r9c5,r9c6", "sum": 45, "unique": true, "style": "box", "type": "region"}, {"cells": "r7c7,r7c8,r7c9,r8c7,r8c8,r8c9,r9c7,r9c8,r9c9", "sum": 45, "unique": true, "style": "box", "type": "region"}, {"cells": "r1c1-r1c9", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r2c1-r2c9", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r3c1-r3c9", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r4c1-r4c9", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r5c1-r5c9", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r6c1-r6c9", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r7c1-r7c9", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r8c1-r8c9", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r9c1-r9c9", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r1c1-r9c1", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r1c2-r9c2", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r1c3-r9c3", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r1c4-r9c4", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r1c5-r9c5", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r1c6-r9c6", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r1c7-r9c7", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r1c8-r9c8", "sum": 45, "unique": true, "type": "rowcol"}, {"cells": "r1c9-r9c9", "sum": 45, "unique": true, "type": "rowcol"}]'

SOURCE_PUZZLE_REGIONS_6X6 = '[[[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]], [[0, 3], [0, 4], [0, 5], [1, 3], [1, 4], [1, 5]], [[2, 0], [2, 1], [2, 2], [3, 0], [3, 1], [3, 2]], [[2, 3], [2, 4], [2, 5], [3, 3], [3, 4], [3, 5]], [[4, 0], [4, 1], [4, 2], [5, 0], [5, 1], [5, 2]], [[4, 3], [4, 4], [4, 5], [5, 3], [5, 4], [5, 5]]]'
CURRENT_PUZZLE_CAGES_6X6 = '[{"cells": "r1c1,r1c2,r1c3,r2c1,r2c2,r2c3", "sum": 21, "unique": true, "style": "box", "type": "region"}, {"cells": "r1c4,r1c5,r1c6,r2c4,r2c5,r2c6", "sum": 21, "unique": true, "style": "box", "type": "region"}, {"cells": "r3c1,r3c2,r3c3,r4c1,r4c2,r4c3", "sum": 21, "unique": true, "style": "box", "type": "region"}, {"cells": "r3c4,r3c5,r3c6,r4c4,r4c5,r4c6", "sum": 21, "unique": true, "style": "box", "type": "region"}, {"cells": "r5c1,r5c2,r5c3,r6c1,r6c2,r6c3", "sum": 21, "unique": true, "style": "box", "type": "region"}, {"cells": "r5c4,r5c5,r5c6,r6c4,r6c5,r6c6", "sum": 21, "unique": true, "style": "box", "type": "region"}, {"cells": "r1c1-r1c6", "sum": 21, "unique": true, "type": "rowcol"}, {"cells": "r2c1-r2c6", "sum": 21, "unique": true, "type": "rowcol"}, {"cells": "r3c1-r3c6", "sum": 21, "unique": true, "type": "rowcol"}, {"cells": "r4c1-r4c6", "sum": 21, "unique": true, "type": "rowcol"}, {"cells": "r5c1-r5c6", "sum": 21, "unique": true, "type": "rowcol"}, {"cells": "r6c1-r6c6", "sum": 21, "unique": true, "type": "rowcol"}, {"cells": "r1c1-r6c1", "sum": 21, "unique": true, "type": "rowcol"}, {"cells": "r1c2-r6c2", "sum": 21, "unique": true, "type": "rowcol"}, {"cells": "r1c3-r6c3", "sum": 21, "unique": true, "type": "rowcol"}, {"cells": "r1c4-r6c4", "sum": 21, "unique": true, "type": "rowcol"}, {"cells": "r1c5-r6c5", "sum": 21, "unique": true, "type": "rowcol"}, {"cells": "r1c6-r6c6", "sum": 21, "unique": true, "type": "rowcol"}]'

SOURCE_PUZZLE_REGIONS_4X4 = '[[[0, 0], [0, 1], [1, 0], [1, 1]], [[0, 2], [0, 3], [1, 2], [1, 3]], [[2, 0], [2, 1], [3, 0], [3, 1]], [[2, 2], [2, 3], [3, 2], [3, 3]]]'
CURRENT_PUZZLE_CAGES_4X4 = '[{"cells": "r1c1,r1c2,r2c1,r2c2", "sum": 10, "unique": true, "style": "box", "type": "region"}, {"cells": "r1c3,r1c4,r2c3,r2c4", "sum": 10, "unique": true, "style": "box", "type": "region"}, {"cells": "r3c1,r3c2,r4c1,r4c2", "sum": 10, "unique": true, "style": "box", "type": "region"}, {"cells": "r3c3,r3c4,r4c3,r4c4", "sum": 10, "unique": true, "style": "box", "type": "region"}, {"cells": "r1c1-r1c4", "sum": 10, "unique": true, "type": "rowcol"}, {"cells": "r2c1-r2c4", "sum": 10, "unique": true, "type": "rowcol"}, {"cells": "r3c1-r3c4", "sum": 10, "unique": true, "type": "rowcol"}, {"cells": "r4c1-r4c4", "sum": 10, "unique": true, "type": "rowcol"}, {"cells": "r1c1-r4c1", "sum": 10, "unique": true, "type": "rowcol"}, {"cells": "r1c2-r4c2", "sum": 10, "unique": true, "type": "rowcol"}, {"cells": "r1c3-r4c3", "sum": 10, "unique": true, "type": "rowcol"}, {"cells": "r1c4-r4c4", "sum": 10, "unique": true, "type": "rowcol"}]'

######################
## Color Conversion ##
###################### 

# Precompute CSS4 color names mapped to RGB tuples (normalized floats)
CSS4_RGB = {name: mcolors.to_rgb(hex_code) for name, hex_code in mcolors.CSS4_COLORS.items()}

def hex_to_rgb(hex_code: str) -> Optional[Tuple[float, float, float]]:
    """
    Convert a hex color code to an RGB tuple of floats in [0,1].
    
    Supports shorthand (e.g., "#abc" or "#abcd") and full length
    (e.g., "#aabbcc" or "#aabbccdd"). Any alpha channel is dropped.
    
    Args:
        hex_code: A string containing a hex color code
        
    Returns:
        A tuple of three float values representing RGB values, or None if conversion fails
    """
    hex_code = hex_code.strip().lstrip('#')
    if len(hex_code) in (3, 4):
        hex_code = ''.join(c * 2 for c in hex_code)
    if len(hex_code) == 8:  # assume RGBA; ignore alpha
        hex_code = hex_code[:6]
    try:
        return mcolors.to_rgb("#" + hex_code)
    except ValueError:
        return None

def rgb_to_name(rgb: Optional[Tuple[float, float, float]]) -> Optional[str]:
    """
    Return the name of the CSS4 color that best approximates the given RGB tuple.
    
    Args:
        rgb: A tuple of three float values representing RGB values
        
    Returns:
        The name of the closest CSS4 color, or None if rgb is None
    """
    if rgb is None:
        return None
    return min(CSS4_RGB.items(),
               key=lambda item: sum((a - b) ** 2 for a, b in zip(rgb, item[1])))[0]

def hex_to_color_name(hex_code: str) -> str:
    """
    Convert a hex color code to the closest CSS4 color name.
    
    Args:
        hex_code: A string containing a hex color code
        
    Returns:
        The name of the closest CSS4 color or the original hex code if conversion fails
    """
    rgb = hex_to_rgb(hex_code)
    return rgb_to_name(rgb) or hex_code


##########################################
## Sudokupad visual elements extraction ##
##########################################

def get_lines_or_arrows(source_puzzle, type="lines"):
    """
    Extract lines or arrows from source puzzle, converting waypoints to cell-based coordinates.
    
    Args:
        source_puzzle: The puzzle data structure
        type: The type of element to extract ("lines" or "arrows")
        
    Returns:
        A list of extracted line/arrow elements with their properties
    """
    # Constants for detection logic
    EDGE_EPS = 0.35  # How close to an integer boundary we consider "on the border"
    MIN_SIZE = 0.1   # Bounding box smaller than this in one dimension => might be a small arrow
    MAX_SIZE = 0.4   # Bounding box bigger than this in the other dimension => skip
    
    lines = []
    for line in source_puzzle.get(type, []):
        if line.get('target', '') == 'cell-grids':
            # Possibly a penpa reference line, skip
            continue
        
        wps = []
        broken = False
        if len(line.get('wayPoints', [])) <= 1:
            # Skip line because it has no waypoints
            continue

        # Handle inequality arrows (e.g., maximum/minimum cells in https://sudokumaker.app/)
        if len(line.get('wayPoints', [])) == 3:
            rs = [pt[0] for pt in line.get('wayPoints', [])]
            cs = [pt[1] for pt in line.get('wayPoints', [])]
            rmin, rmax = min(rs), max(rs)
            cmin, cmax = min(cs), max(cs)
            height = rmax - rmin
            width  = cmax - cmin
            
            # Figure out bounding box corners in integer grid space
            floor_r = int(rmin)
            floor_c = int(cmin)
            ceil_r  = int(rmax)  # same as floor_r if within the same cell
            ceil_c  = int(cmax)
            
            # We only handle the case that all three points are in the same cell
            same_row_cell = (floor_r == int(rmax))
            same_col_cell = (floor_c == int(cmax))
            
            if same_row_cell and same_col_cell:
                # Check if it's near the left/right edge or top/bottom edge
                near_left   = (abs(cmin - floor_c) <= EDGE_EPS)
                near_right  = (abs((floor_c+1) - cmax) <= EDGE_EPS)
                near_top    = (abs(rmin - floor_r) <= EDGE_EPS)
                near_bottom = (abs((floor_r+1) - rmax) <= EDGE_EPS)
                
                # Check the bounding box dimensions
                small_enough = (min(width, height) < MIN_SIZE and max(width, height) < MAX_SIZE)
                
                if small_enough:
                    # Try to figure out direction
                    directions = []
                    if near_left:
                        directions.append(('>', (floor_r, floor_c), (floor_r, floor_c+1)))
                    if near_right:
                        directions.append(('<', (floor_r, floor_c+1), (floor_r, floor_c)))
                    if near_top:
                        directions.append(('v', (floor_r, floor_c), (floor_r+1, floor_c)))
                    if near_bottom:
                        directions.append(('^', (floor_r+1, floor_c), (floor_r, floor_c)))
                    
                    # If exactly one direction is found, interpret it as an inequality arrow
                    if len(directions) == 1:
                        symbol, cellA, cellB = directions[0]
                        # Convert (row, col) in 0-based to "rXcY" 1-based notation
                        A = f"r{cellA[0]+1}c{cellA[1]+1}"
                        B = f"r{cellB[0]+1}c{cellB[1]+1}"
                        
                        lines.append({
                            'type': 'inequality',
                            'direction': symbol,
                            'cells': [A, B],
                            'color_name': hex_to_color_name(line.get('color', '')),
                            'color_hex': line.get('color', ''),
                            'thickness': line.get('thickness', ''),
                        })
                        continue

        # Handle internal arrows (start and end on the same cell)
        if type == "arrows" and len(line.get('wayPoints', [])) == 2:
            r1, c1 = line['wayPoints'][0]
            r2, c2 = line['wayPoints'][1]
            if int(r1 // 1) == int(r2 // 1) and int(c1 // 1) == int(c2 // 1):
                cell_r = int(r1 // 1)
                cell_c = int(c1 // 1)
                
                # Get position within cell (0-1 for both r and c)
                cell_pos_r = r1 % 1
                cell_pos_c = c1 % 1   
                dr = r2 - r1
                dc = c2 - c1

                # Check if arrow is horizontal (same row position)
                if abs(cell_pos_r - 0.5) < 1e-4:
                    direction = "left" if dc < 0 else "right"
                    coords = [f"r{cell_r+1}c{cell_c+1}"]
                    line_data = {
                        'type': "horizontal arrow",
                        'coords': coords,
                        'direction': direction,
                        'color_name': hex_to_color_name(line.get('color', '')),
                        'color_hex': line.get('color', ''),
                        'thickness': line.get('thickness', ''),
                    }
                    lines.append(line_data)
                    continue

                # Check if arrow is vertical (same column position)
                if abs(cell_pos_c - 0.5) < 1e-4:
                    direction = "up" if dr < 0 else "down"
                    coords = [f"r{cell_r+1}c{cell_c+1}"]
                    line_data = {
                        'type': "vertical arrow",
                        'coords': coords,
                        'direction': direction,
                        'color_name': hex_to_color_name(line.get('color', '')),
                        'color_hex': line.get('color', ''),
                        'thickness': line.get('thickness', ''),
                    }
                    lines.append(line_data)
                    continue

                # Check if arrow is diagonal (same slope in both directions)
                if abs(abs(dr) - abs(dc)) < 1e-4:  # Is it diagonal?
                    # Check if arrow lies on cell's diagonal
                    if abs(cell_pos_r - cell_pos_c) < 1e-4:  # Main diagonal
                        direction = "upper left" if dr < 0 else "lower right"
                        coords = [f"r{cell_r+1}c{cell_c+1}"]
                        line_data = {
                            'type': "diagonal arrow",
                            'coords': coords,
                            'direction': direction,
                            'color_name': hex_to_color_name(line.get('color', '')),
                            'color_hex': line.get('color', ''),
                            'thickness': line.get('thickness', ''),
                        }
                        lines.append(line_data)
                        continue
                    elif abs((cell_pos_r + cell_pos_c) - 1) < 1e-4:  # Other diagonal
                        direction = "upper right" if dr < 0 else "lower left"
                        coords = [f"r{cell_r+1}c{cell_c+1}"]
                        line_data = {
                            'type': "diagonal arrow",
                            'coords': coords,
                            'direction': direction,
                            'color_name': hex_to_color_name(line.get('color', '')),
                            'color_hex': line.get('color', ''),
                            'thickness': line.get('thickness', ''),
                        }
                        lines.append(line_data)
                        continue

        # Handle normal lines (start and end on different cells)
        for wp1, wp2 in zip(line['wayPoints'], line['wayPoints'][1:]):
            r1, c1 = wp1
            r2, c2 = wp2
            # Check if coordinates are between 0.05 and 0.95 (within cells)
            for coord in [r1, c1, r2, c2]:
                if not (coord % 1 >= 0.05 and coord % 1 <= 0.95):
                    broken = True
                    break
            if broken:
                continue
                
            # Convert to integer-based cells
            r1 = int(r1 // 1) + 1
            c1 = int(c1 // 1) + 1
            r2 = int(r2 // 1) + 1
            c2 = int(c2 // 1) + 1
            rdiff = r2 - r1
            cdiff = c2 - c1
            
            # Expand segments to a list of contiguous cells
            if rdiff == 0 and cdiff == 0:
                # Same cell - skip or break depending on the puzzle
                broken = True
                break
            elif rdiff == 0:
                # Horizontal line
                step = int(copysign(1, cdiff))
                next_wps = [[r1, c] for c in range(c1, c2 + step, step)]
                if not wps:
                    wps.extend(next_wps)
                else:
                    wps.extend(next_wps[1:]) 
            elif cdiff == 0:
                # Vertical line
                step = int(copysign(1, rdiff))
                next_wps = [[r, c1] for r in range(r1, r2 + step, step)]
                if not wps:
                    wps.extend(next_wps)
                else:
                    wps.extend(next_wps[1:])
            elif abs(rdiff) == abs(cdiff):
                # Diagonal line
                step_r = int(copysign(1, rdiff))
                step_c = int(copysign(1, cdiff))
                next_wps = [[r1 + i*step_r, c1 + i*step_c] for i in range(abs(rdiff) + 1)]
                if not wps:
                    wps.extend(next_wps)
                else:
                    wps.extend(next_wps[1:])
            else:
                # Skip line because it's not horizontal, vertical, or diagonal
                broken = True
                break
        
        if not broken and wps:
            coords = [f"r{int(wp[0])}c{int(wp[1])}" for wp in wps]
            line_data = {
                'type': type,
                'coords': coords,
                'color_name': hex_to_color_name(line.get('color', '')),
                'color_hex': line.get('color', ''),
                'thickness': line.get('thickness', ''),
            }
            lines.append(line_data)
    
    return lines


def get_cages(current_puzzle, rows, cols):
    """
    Extract any 'killer cages' that are not the standard boxes or row/col definitions.
    
    Args:
        current_puzzle: The current puzzle data structure
        rows: Number of rows in the puzzle
        cols: Number of columns in the puzzle
        
    Returns:
        A list of non-standard cages in the puzzle
    """
    if rows == 9 and cols == 9:
        standard_cages = json.loads(CURRENT_PUZZLE_CAGES_9X9)
    elif rows == 6 and cols == 6:
        standard_cages = json.loads(CURRENT_PUZZLE_CAGES_6X6)
    elif rows == 4 and cols == 4:
        standard_cages = json.loads(CURRENT_PUZZLE_CAGES_4X4)
    else:
        standard_cages = []
    
    cages = []
    for cage in current_puzzle.get('cages', []):
        # Simplify cage by removing 'parsedCells' key
        c_simplified = {k: v for k, v in cage.items() if k != 'parsedCells'}
        
        # Skip if standard
        if c_simplified in standard_cages:
            continue
        
        # Skip if cage is entire puzzle
        if len(c_simplified['cells'].split(',')) == rows * cols:
            continue
        
        # Skip if cage is empty
        if c_simplified['cells'] == '':
            continue
        
        current_cage = {
            'type': 'cage',
            'style': c_simplified.get('style', ''),
            'cells': c_simplified['cells'].split(','),
            'value': c_simplified.get('value', ''),
        }
        
        cages.append(current_cage)
    
    return cages

def get_regions(source_puzzle, rows, cols):
    """
    Extract any custom regions not in standard definitions.
    
    Args:
        source_puzzle: The puzzle data structure
        rows: Number of rows in the puzzle
        cols: Number of columns in the puzzle
        
    Returns:
        A list of non-standard regions in the puzzle
    """
    if rows == 9 and cols == 9:
        standard_regions = json.loads(SOURCE_PUZZLE_REGIONS_9X9)
    elif rows == 6 and cols == 6:
        standard_regions = json.loads(SOURCE_PUZZLE_REGIONS_6X6)
    elif rows == 4 and cols == 4:
        standard_regions = json.loads(SOURCE_PUZZLE_REGIONS_4X4)
    else:
        standard_regions = []
    
    regions = []
    for region in source_puzzle.get('regions', []):
        if region in standard_regions:
            continue
        reg = {
            'type': 'region',
            'region': copy.deepcopy(region),
        }
        regions.append(reg)
    
    return regions


def get_underlays_or_overlays(source_puzzle, type="underlays"):
    """
    Extract underlay or overlay elements from source puzzle.
    
    Args:
        source_puzzle: The puzzle data structure
        type: The type of element to extract ("underlays" or "overlays")
        
    Returns:
        A list of extracted underlay/overlay elements with their properties
    """
    items = []
    for item in source_puzzle.get(type, []):
        if item.get('class', '') == 'board-position':
            continue
        
        center = item.get('center', None)
        if not center:
            continue
            
        r, c = center
        r0 = int(r // 1)
        c0 = int(c // 1)
        
        # Get all cells touching the center
        if r % 1 == 0.0 and c % 1 == 0.0:
            # Centered on a corner
            coords = [f"r{r0}c{c0}", f"r{r0}c{c0+1}", f"r{r0+1}c{c0}", f"r{r0+1}c{c0+1}"]
            loc = "corner"
        elif r % 1 == 0.0 and c % 1 >= 0.1 and c % 1 <= 0.9:
            # Centered on horizontal edge
            coords = [f"r{r0}c{c0+1}", f"r{r0+1}c{c0+1}"]
            loc = "horizontal edge"
        elif c % 1 == 0.0 and r % 1 >= 0.1 and r % 1 <= 0.9:
            # Centered on a vertical edge
            coords = [f"r{r0+1}c{c0}", f"r{r0+1}c{c0+1}"]
            loc = "vertical edge"
        elif r % 1 >= 0.1 and r % 1 <= 0.9 and c % 1 >= 0.1 and c % 1 <= 0.9:
            # Inside a cell
            coords = [f"r{r0+1}c{c0+1}"]
            loc = "cell"
        else:
            continue

        text = item.get('text', '')
        shape = "circle" if item.get('rounded', False) else "square"
        if shape == 'square':
            if item.get('angle', 0) == 45:
                shape = "diamond"
                
        color = item.get('backgroundColor', None)
        color_name = hex_to_color_name(color) if color else ""
        color_hex = color if color else ""
        
        border_color = item.get('borderColor', None)
        border_color_name = hex_to_color_name(border_color) if border_color else ""
        border_color_hex = border_color if border_color else ""

        width, height = item.get('width', 0), item.get('height', 0)
        
        # Size classification based on width
        if width >= 0.75 and width <= 1.1:
            size = "large"
        elif width >= 0.35 and width <= 0.75:
            size = "medium"
        elif width >= 0.1 and width <= 0.35:
            size = "small"
        else:
            size = "unknown"

        item_data = {
            'type': type,
            'coords': coords,
            'loc': loc,
            'shape': shape,
            'color_name': color_name,
            'color_hex': color_hex,
            'border_color_name': border_color_name,
            'border_color_hex': border_color_hex,
            'size': size,
            'text': text,
            'width': width,
            'height': height,
        }
        items.append(item_data)
        
    return items


def get_global_constraints(source_puzzle):
    """
    Extract global constraints (like anti-knight, anti-king, etc.) from metadata.
    
    Args:
        source_puzzle: The puzzle data structure
        
    Returns:
        A list of global constraints defined in the puzzle
    """
    global_constraints = []
    metadata = source_puzzle.get('metadata', {})
    
    if metadata.get('antiking', False):
        global_constraints.append({"text": "anti-king", "type": "global"})
    if metadata.get('antiknight', False):
        global_constraints.append({"text": "anti-knight", "type": "global"})
    
    return global_constraints

def extract_visual_elements(source_puzzle, current_puzzle, rows, cols):
    """
    Gather all puzzle constraints in a single list.
    
    Args:
        source_puzzle: The source puzzle data structure
        current_puzzle: The current puzzle data structure
        rows: Number of rows in the puzzle
        cols: Number of columns in the puzzle
        
    Returns:
        A list of all visual elements in the puzzle
    """
    visual_elements = []
    visual_elements.extend(get_cages(current_puzzle, rows, cols))
    # visual_elements.extend(get_regions(source_puzzle, rows, cols))  # Optional
    visual_elements.extend(get_lines_or_arrows(source_puzzle, type="lines"))
    visual_elements.extend(get_lines_or_arrows(source_puzzle, type="arrows"))
    visual_elements.extend(get_underlays_or_overlays(source_puzzle, type="underlays"))
    visual_elements.extend(get_underlays_or_overlays(source_puzzle, type="overlays"))
    visual_elements.extend(get_global_constraints(source_puzzle))
    return visual_elements
