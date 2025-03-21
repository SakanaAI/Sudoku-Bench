import argparse
import json
import re

import requests


#################
## Base64Codec ##
#################
class Base64Codec:
    KEY_STR_BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/\\"
    BASE_REVERSE_DIC = {}

    @staticmethod
    def compress(input_str):
        if input_str is None:
            return ""
        result = Base64Codec._compress_algorithm(input_str)
        remainder = len(result) % 4
        if remainder:
            result += "=" * (4 - remainder)
        return result

    @staticmethod
    def _compress_algorithm(uncompressed):
        context_dictionary = {}
        context_dictionary_to_create = {}
        context_w = ""
        context_enlarge_in = 2
        context_dict_size = 3
        context_num_bits = 2
        context_data = []
        context_data_val = 0
        context_data_position = 0

        for char in uncompressed:
            if char not in context_dictionary:
                context_dictionary[char] = context_dict_size
                context_dict_size += 1
                context_dictionary_to_create[char] = True

            wc = context_w + char
            if wc in context_dictionary:
                context_w = wc
            else:
                if context_w in context_dictionary_to_create:
                    if ord(context_w[0]) < 256:
                        for i in range(context_num_bits):
                            context_data_val = (context_data_val << 1) & 0xFFFFFFFF
                            context_data_position += 1
                            if context_data_position == 6:
                                context_data.append(Base64Codec.KEY_STR_BASE64[context_data_val])
                                context_data_val = 0
                                context_data_position = 0
                        value = ord(context_w[0])
                        for i in range(8):
                            context_data_val = ((context_data_val << 1) | (value & 1)) & 0xFFFFFFFF
                            context_data_position += 1
                            if context_data_position == 6:
                                context_data.append(Base64Codec.KEY_STR_BASE64[context_data_val])
                                context_data_val = 0
                                context_data_position = 0
                            value >>= 1
                    else:
                        pass
                    context_enlarge_in -= 1
                    if context_enlarge_in == 0:
                        context_enlarge_in = 2 ** context_num_bits
                        context_num_bits += 1
                    del context_dictionary_to_create[context_w]
                else:
                    value = context_dictionary[context_w]
                    for i in range(context_num_bits):
                        context_data_val = ((context_data_val << 1) | (value & 1)) & 0xFFFFFFFF
                        context_data_position += 1
                        if context_data_position == 6:
                            context_data.append(Base64Codec.KEY_STR_BASE64[context_data_val])
                            context_data_val = 0
                            context_data_position = 0
                        value >>= 1
                context_enlarge_in -= 1
                if context_enlarge_in == 0:
                    context_enlarge_in = 2 ** context_num_bits
                    context_num_bits += 1
                context_dictionary[wc] = context_dict_size
                context_dict_size += 1
                context_w = char

        if context_w != "":
            if context_w in context_dictionary_to_create:
                if ord(context_w[0]) < 256:
                    for i in range(context_num_bits):
                        context_data_val = (context_data_val << 1) & 0xFFFFFFFF
                        context_data_position += 1
                        if context_data_position == 6:
                            context_data.append(Base64Codec.KEY_STR_BASE64[context_data_val])
                            context_data_val = 0
                            context_data_position = 0
                    value = ord(context_w[0])
                    for i in range(8):
                        context_data_val = ((context_data_val << 1) | (value & 1)) & 0xFFFFFFFF
                        context_data_position += 1
                        if context_data_position == 6:
                            context_data.append(Base64Codec.KEY_STR_BASE64[context_data_val])
                            context_data_val = 0
                            context_data_position = 0
                        value >>= 1
                else:
                    pass
                context_enlarge_in -= 1
                if context_enlarge_in == 0:
                    context_enlarge_in = 2 ** context_num_bits
                    context_num_bits += 1
                del context_dictionary_to_create[context_w]
            else:
                value = context_dictionary[context_w]
                for i in range(context_num_bits):
                    context_data_val = ((context_data_val << 1) | (value & 1)) & 0xFFFFFFFF
                    context_data_position += 1
                    if context_data_position == 6:
                        context_data.append(Base64Codec.KEY_STR_BASE64[context_data_val])
                        context_data_val = 0
                        context_data_position = 0
                    value >>= 1
                context_enlarge_in -= 1
                if context_enlarge_in == 0:
                    context_enlarge_in = 2 ** context_num_bits
                    context_num_bits += 1

        value = 2
        for i in range(context_num_bits):
            context_data_val = ((context_data_val << 1) | (value & 1)) & 0xFFFFFFFF
            context_data_position += 1
            if context_data_position == 6:
                context_data.append(Base64Codec.KEY_STR_BASE64[context_data_val])
                context_data_val = 0
                context_data_position = 0
            value >>= 1

        while True:
            context_data_val = (context_data_val << 1) & 0xFFFFFFFF
            context_data_position += 1
            if context_data_position == 6:
                context_data.append(Base64Codec.KEY_STR_BASE64[context_data_val])
                break

        return "".join(context_data)

    @staticmethod
    def decompress(input_str):
        if input_str is None:
            return ""
        if input_str == "":
            return None
        input_str = input_str.rstrip("=")
        reset_value = 32

        def get_next_value(index):
            if Base64Codec.KEY_STR_BASE64 not in Base64Codec.BASE_REVERSE_DIC:
                Base64Codec.BASE_REVERSE_DIC[Base64Codec.KEY_STR_BASE64] = {Base64Codec.KEY_STR_BASE64[i]: i for i in range(len(Base64Codec.KEY_STR_BASE64))}
            return Base64Codec.BASE_REVERSE_DIC[Base64Codec.KEY_STR_BASE64][input_str[index]]

        data = {
            "val": get_next_value(0),
            "position": reset_value,
            "index": 1,
        }
        dictionary = []
        for i in range(3):
            dictionary.append(i)
        enlarge_in = 4
        dict_size = 4
        num_bits = 3

        bits = 0
        maxpower = 2 ** 2
        power = 1
        while power != maxpower:
            resb = data["val"] & data["position"]
            data["position"] >>= 1
            if data["position"] == 0:
                data["position"] = reset_value
                if data["index"] < len(input_str):
                    data["val"] = get_next_value(data["index"])
                data["index"] += 1
            bits |= (1 if resb > 0 else 0) * power
            power <<= 1

        if bits == 0:
            bits = 0
            maxpower = 2 ** 8
            power = 1
            while power != maxpower:
                resb = data["val"] & data["position"]
                data["position"] >>= 1
                if data["position"] == 0:
                    data["position"] = reset_value
                    if data["index"] < len(input_str):
                        data["val"] = get_next_value(data["index"])
                    data["index"] += 1
                bits |= (1 if resb > 0 else 0) * power
                power <<= 1
            entry = chr(bits)
        elif bits == 1:
            bits = 0
            maxpower = 2 ** 16
            power = 1
            while power != maxpower:
                resb = data["val"] & data["position"]
                data["position"] >>= 1
                if data["position"] == 0:
                    data["position"] = reset_value
                    if data["index"] < len(input_str):
                        data["val"] = get_next_value(data["index"])
                    data["index"] += 1
                bits |= (1 if resb > 0 else 0) * power
                power <<= 1
            entry = chr(bits)
        elif bits == 2:
            return ""
        w = entry
        dictionary.append(entry)  # dictionary[3] = entry
        result = [entry]

        while True:
            if data["index"] > len(input_str):
                return ""
            bits = 0
            maxpower = 2 ** num_bits
            power = 1
            while power != maxpower:
                resb = data["val"] & data["position"]
                data["position"] >>= 1
                if data["position"] == 0:
                    data["position"] = reset_value
                    if data["index"] < len(input_str):
                        data["val"] = get_next_value(data["index"])
                    data["index"] += 1
                bits |= (1 if resb > 0 else 0) * power
                power <<= 1
            c = bits
            if c == 0:
                bits = 0
                maxpower = 2 ** 8
                power = 1
                while power != maxpower:
                    resb = data["val"] & data["position"]
                    data["position"] >>= 1
                    if data["position"] == 0:
                        data["position"] = reset_value
                        if data["index"] < len(input_str):
                            data["val"] = get_next_value(data["index"])
                        data["index"] += 1
                    bits |= (1 if resb > 0 else 0) * power
                    power <<= 1
                dictionary.append(chr(bits))
                c = dict_size
                dict_size += 1
                enlarge_in -= 1
            elif c == 1:
                bits = 0
                maxpower = 2 ** 16
                power = 1
                while power != maxpower:
                    resb = data["val"] & data["position"]
                    data["position"] >>= 1
                    if data["position"] == 0:
                        data["position"] = reset_value
                        if data["index"] < len(input_str):
                            data["val"] = get_next_value(data["index"])
                        data["index"] += 1
                    bits |= (1 if resb > 0 else 0) * power
                    power <<= 1
                dictionary.append(chr(bits))
                c = dict_size
                dict_size += 1
                enlarge_in -= 1
            elif c == 2:
                return "".join(result)
            if enlarge_in == 0:
                enlarge_in = 2 ** num_bits
                num_bits += 1
            if c < len(dictionary) and dictionary[c] is not None:
                entry = dictionary[c]
            else:
                if c == dict_size:
                    entry = w + w[0]
                else:
                    return None
            result.append(entry)
            dictionary.append(w + entry[0])
            dict_size += 1
            enlarge_in -= 1
            w = entry
            if enlarge_in == 0:
                enlarge_in = 2 ** num_bits
                num_bits += 1


##################
## PuzzleZipper ##
##################
class PuzzleZipper:
    prop_map = {
        "color": "c",
        "cages": "ca",
        "center": "ct",
        "borderColor": "c1",
        "backgroundColor": "c2",
        "cells": "ce",
        "cellSize": "cs",
        "arrows": "a",
        "overlays": "o",
        "underlays": "u",
        "width": "w",
        "height": "h",
        "value": "v",
        "videos": "vd",
        "lines": "l",
        "rounded": "r",
        "regions": "re",
        "fontSize": "fs",
        "thickness": "th",
        "headLength": "hl",
        "wayPoints": "wp",
        "title": "t",
        "text": "te",
        "duration": "d",
        "d": "d2",
    }
    re_quoted_string_split = re.compile(r'("(?:(?:\\.)|[^"\\])*")')
    re_quoted_marker_split = re.compile(r'("__{S[0-9]+}__")')
    re_quoted_marker = re.compile(r'"__{S([0-9]+)}__"')

    @staticmethod
    def clear_empty_arrays(o):
        if isinstance(o, list):
            for v in o:
                PuzzleZipper.clear_empty_arrays(v)
        elif isinstance(o, dict):
            for key in list(o.keys()):
                PuzzleZipper.clear_empty_arrays(o[key])
                if isinstance(o[key], list) and len(o[key]) == 0:
                    del o[key]
        return o

    @staticmethod
    def map_props(o, mapping):
        if isinstance(o, list):
            for item in o:
                PuzzleZipper.map_props(item, mapping)
        elif isinstance(o, dict):
            for key in list(o.keys()):
                if key in mapping:
                    new_key = mapping[key]
                    if new_key in o:
                        raise Exception(f"Prop mapping collission from {key}: {o[key]} to {new_key}: {o[new_key]}")
                    o[new_key] = o[key]
                    del o[key]
                    key = new_key
                PuzzleZipper.map_props(o[key], mapping)
        return o

    @staticmethod
    def map_values(o, map_func):
        if isinstance(o, list):
            for idx, v in enumerate(o):
                o[idx] = PuzzleZipper.map_values(v, map_func)
        elif isinstance(o, dict):
            for key in o:
                o[key] = PuzzleZipper.map_values(o[key], map_func)
        else:
            o = map_func(o)
        return o

    @staticmethod
    def zip_quotes(s: str) -> str:
        return s.replace("'", "\\'").replace('"', "'")

    @staticmethod
    def unzip_quotes(s: str) -> str:
        if '"' in s:
            return s
        s = re.sub(r"(?<!\\)\\'", "’", s)
        s = s.replace("'", '"')
        s = s.replace("’", "'")
        return s

    @staticmethod
    def convert_if_int(v):
        if isinstance(v, str):
            try:
                iv = int(v)
                if str(iv) == v:
                    return iv
            except ValueError:
                pass
        return v

    @staticmethod
    def zip_puzzle(json_input):
        if not isinstance(json_input, str):
            json_input = json.dumps(json_input)
        try:
            zipped = json.loads(json_input)
        except Exception as e:
            raise Exception("Invalid JSON input") from e

        PuzzleZipper.clear_empty_arrays(zipped)
        PuzzleZipper.map_props(zipped, PuzzleZipper.prop_map)

        has_solution = "metadata" in zipped and "solution" in zipped["metadata"]
        if has_solution:
            zipped["metadata"]["solution"] = zipped["metadata"]["solution"] + "$"  # To avoid conversion to int
        PuzzleZipper.map_values(zipped, PuzzleZipper.convert_if_int)
        if has_solution:
            zipped["metadata"]["solution"] = zipped["metadata"]["solution"][:-1]

        zipped_str = json.dumps(zipped, separators=(",", ":"))
        zipped_str = re.sub(r'([,\{\[])"([a-zA-Z0-9]+)":', r'\1\2:', zipped_str)
        zipped_str = re.sub(r'([,\{\[])\{\}(?=[,\}\]])', r'\1', zipped_str)
        zipped_str = re.sub(r'(:)false([,\}\]])', r'\1f\2', zipped_str)
        zipped_str = re.sub(r'(:)true([,\}\]])', r'\1t\2', zipped_str)
        zipped_str = re.sub(r'(:)"#000000"([,\}\]])', r'\1#0\2', zipped_str)
        zipped_str = re.sub(r'(:)"#FFFFFF"([,\}\]])', r'\1#F\2', zipped_str)
        zipped_str = re.sub(r'(:)"#([0-9a-fA-F]{6})"([,\}\]])', r'\1\2\3', zipped_str)
        zipped_str = PuzzleZipper.zip_quotes(zipped_str)

        return zipped_str

    @staticmethod
    def extract_strings(s: str) -> dict:
        parts = PuzzleZipper.re_quoted_string_split.split(s)
        new_parts = []
        strings = []
        for i, part in enumerate(parts):
            if i % 2 == 1:
                placeholder = f'"__{{S{(i // 2)}}}__"'
                new_parts.append(placeholder)
                strings.append(part)
            else:
                new_parts.append(part)
        return {"str": "".join(new_parts), "strings": strings}

    @staticmethod
    def inject_strings(s: str, strings: list) -> str:
        def replacement(match):
            index = int(match.group(1))
            return strings[index]
        return PuzzleZipper.re_quoted_marker.sub(replacement, s)

    @staticmethod
    def unzip_puzzle(zipped_str: str) -> str:
        zipped_str = PuzzleZipper.unzip_quotes(zipped_str)
        extracted = PuzzleZipper.extract_strings(zipped_str)
        s = extracted["str"]

        s = re.sub(r'([,\{\[])([a-zA-Z0-9]+):', r'\1"\2":', s)
        s = re.sub(r'([,\{\[])(?=[,\}\]])', r'\1_', s)
        s = re.sub(r'\{_\}', '{}', s)
        s = re.sub(r'([,\{\[])_', r'\1{}', s)
        s = re.sub(r'(:)f([,\}\]])', r'\1false\2', s)
        s = re.sub(r'(:)t([,\}\]])', r'\1true\2', s)
        s = re.sub(r'(:)#0([,\}\]])', r'\1"#000000"\2', s)
        s = re.sub(r'(:)#F([,\}\]])', r'\1"#FFFFFF"\2', s)
        s = re.sub(r'(:)([0-9a-fA-F]{6})([,\}\]])', r'\1"#\2"\3', s)

        s = PuzzleZipper.inject_strings(s, extracted["strings"])

        try:
            unzipped = json.loads(s)
        except Exception as e:
            raise Exception("Unzipping failed. The input may be invalid.") from e

        rev_map = {v: k for k, v in PuzzleZipper.prop_map.items()}
        PuzzleZipper.map_props(unzipped, rev_map)

        def fix_color(v):
            if isinstance(v, str) and re.fullmatch(r'[0-9a-fA-F]{6}', v):
                return f"#{v}"
            return v

        PuzzleZipper.map_values(unzipped, fix_color)
        return json.dumps(unzipped, separators=(",", ":"))


#################
## PuzzleFetch ##
#################
def fetch_puzzle(puzzle_id):
    urls = [
        f"https://sudokupad.app/api/puzzle/{puzzle_id}",
        f"https://sudokupad.svencodes.com/ctclegacy/{puzzle_id}",
        f"https://firebasestorage.googleapis.com/v0/b/sudoku-sandbox.appspot.com/o/{puzzle_id}?alt=media"
    ]

    for url in urls:
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                puzzle_data = response.text
                if "firebasestorage" in url:
                    puzzle_data = PuzzleZipper.zip_puzzle(puzzle_data)

                if not puzzle_data.startswith("pack"):
                    if not re.match(r"^(scl|ctc|fpuz)", puzzle_data):
                        puzzle_data = f"scl{Base64Codec.compress(PuzzleZipper.zip_puzzle(puzzle_data))}"

                return puzzle_data
        except Exception as e:
            print(f"Error fetching puzzle: {e}")
            last_error = e

    raise last_error
