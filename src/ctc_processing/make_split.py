import argparse
import json


VALID_ACTION_DATA_VIDEO_IDS = [
    "zkz5Qw2BWx4", "_-fTTLSHcvI", "_991BH3o0D4", "_0tfc71zcMA", "_7FmxprT1ZA", "_JegZ7YE0Qw"
]
VALID_COMMENTARY_DATA_VIDEO_IDS = [
    "7FvU235j_qU", "6ICLWWaugGs", "KiyWaXawodE", "749GeetIdRo", "d-vgZC5JiCg",
    "40J58uNeDjI", "OR8UpZmZo0E", "kDO6GlPK_48", "QDd4tK5XNLY", "3RnIKOR7G2o"
]

SKIP_VIDEO_IDS = [
    "BYD4TsYH9lU",
]


def main(args):
    train_data = []
    valid_data = []
    
    # Handle multiple input files
    for input_filepath in args.input_filepaths:
        print(f"Processing {input_filepath}")
        with open(input_filepath, "r") as f:
            for l in f:
                data = json.loads(l)
                if data["youtube_id"] in SKIP_VIDEO_IDS:
                    continue
                if data["youtube_id"] in (
                    VALID_ACTION_DATA_VIDEO_IDS
                    + VALID_COMMENTARY_DATA_VIDEO_IDS
                ):
                    valid_data.append(data)
                else:
                    train_data.append(data)
    
    # Use the first input filepath as base for output paths
    base_filepath = args.input_filepaths[0]
    train_output_filepath = base_filepath.replace(".jsonl", ".train.jsonl")
    valid_output_filepath = base_filepath.replace(".jsonl", ".valid.jsonl")

    print(f"Writing {len(train_data)} training examples to {train_output_filepath}")
    print(f"Writing {len(valid_data)} validation examples to {valid_output_filepath}")
    
    with open(train_output_filepath, "w") as f:
        for data in train_data:
            f.write(json.dumps(data) + "\n")
    with open(valid_output_filepath, "w") as f:
        for data in valid_data:
            f.write(json.dumps(data) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input_filepaths", type=str, nargs="+", 
                       help="One or more input JSONL files")
    args = parser.parse_args()
    main(args)
