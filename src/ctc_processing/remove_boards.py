import argparse
import json
import re


def main(args):
    with open(args.input_filepath, "r") as fin, open(args.output_filepath, "w") as fout:
        for line in fin:
            line = json.loads(line)
            text = line["text"]
            text = re.sub(r"<board>(.*?)</board>", "", text, flags=re.DOTALL)
            line["text"] = text
            fout.write(json.dumps(line) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--input_filepath", type=str, required=True)
    parser.add_argument("--output_filepath", type=str, required=True)
    args = parser.parse_args()
    main(args)