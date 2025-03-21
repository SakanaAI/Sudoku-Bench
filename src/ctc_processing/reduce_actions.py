import argparse
import json

from tqdm import tqdm
from transformers import AutoTokenizer

from sudoku_ds import (
    ActionType,
    action_token_vocab,
)


def build_tokenizer(tokenizer_dir: str = None, **kwargs) -> AutoTokenizer:
    """
    Build tokenizer and add special tokens for Sudoku representations.
    """
    tokenizer = AutoTokenizer.from_pretrained(
        tokenizer_dir,
        trust_remote_code=True
    )

    # Add action tokens
    action_tokens = action_token_vocab()
    print(f"Add {len(action_tokens)} action tokens to the tokenizer.")
    print(f"Before adding action tokens: {len(tokenizer)}")
    tokenizer.add_tokens(action_tokens)
    print(f"After adding action tokens: {len(tokenizer)}")

    # Add as tokenizer's attributes for fast access
    # - Action tokens
    tokenizer.action_token2id = {action_token: tokenizer.vocab[action_token] for action_token in action_tokens}
    tokenizer.action_token_id2token = {v: k for k, v in tokenizer.action_token2id.items()}
    # - Action types
    tokenizer.action_type2id = {
        f"<{action_type.value}>": tokenizer.vocab[f"<{action_type.value}>"]
        for action_type in ActionType
        if f"<{action_type.value}>" in tokenizer.vocab
    }
    tokenizer.action_type_id2token = {v: k for k, v in tokenizer.action_type2id.items()}
    
    return tokenizer


def reduce_actions(tokenizer: AutoTokenizer, text: str) -> str:
    # Token ids
    token_ids = tokenizer.encode(text, add_special_tokens=False)

    # Token ids and their indices (i.e. positions)
    to_include_token_ids = tokenizer.action_token_id2token.keys()
    action_token_ids = [x for x in token_ids if x in to_include_token_ids]
    action_token_idcs = [i for i, x in enumerate(token_ids) if x in to_include_token_ids]
    commentary_token_ids = [x for x in token_ids if x not in to_include_token_ids]
    commentary_token_idcs = [i for i, x in enumerate(token_ids) if x not in to_include_token_ids]

    # Chunk by action type IDs
    chunked_ids, chunked_idcs, current_chunk, current_chunk_idcs = [], [], [], []
    for x, x_idx in zip(action_token_ids, action_token_idcs):
        if x in tokenizer.action_type2id.values():
            if current_chunk:
                chunked_ids.append(current_chunk)
                chunked_idcs.append(current_chunk_idcs)
            current_chunk = [x]
            current_chunk_idcs = [x_idx]
        else:
            current_chunk.append(x)
            current_chunk_idcs.append(x_idx)
    if current_chunk:
        chunked_ids.append(current_chunk)
        chunked_idcs.append(current_chunk_idcs)
    
    # Remove actions with action type sl, ds
    to_skip_action_type_ids = [
        tokenizer.action_type2id[action_type]
        for action_type in ("<sl>", "<ds>")
    ]
    reduced_chunked_ids, reduced_chunked_idcs = [], []
    for chunk, chunk_idcs in zip(chunked_ids, chunked_idcs):
        if chunk[0] not in to_skip_action_type_ids:
            reduced_chunked_ids.append(chunk)
            reduced_chunked_idcs.append(chunk_idcs)
    
    # Flatten reduced action groups
    reduced_action_token_ids = [x for chunk in reduced_chunked_ids for x in chunk]
    reduced_action_token_idcs = [x for chunk_idcs in reduced_chunked_idcs for x in chunk_idcs]

    # Interleave commentary and actions
    all_token_id_and_idx = []
    all_token_id_and_idx.extend(zip(commentary_token_ids, commentary_token_idcs))
    all_token_id_and_idx.extend(zip(reduced_action_token_ids, reduced_action_token_idcs))
    all_token_id_and_idx.sort(key=lambda x: x[1])
    interleaved_token_ids = [x[0] for x in all_token_id_and_idx]

    # Text
    text = tokenizer.decode(interleaved_token_ids)

    return text


def main(args):
    # Load tokenizer
    tokenizer = build_tokenizer(args.tokenizer_dir)

    # Process text
    data = []
    with open(args.input_filepath, "r") as f:
        for line in tqdm(f):
            line = json.loads(line)
            reduced_text = reduce_actions(tokenizer, line["text"])
            line["text"] = reduced_text
            data.append(line)
        
    # Save reduced text
    with open(args.output_filepath, "w") as f:
        for line in tqdm(data):
            f.write(json.dumps(line) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--tokenizer_dir", type=str, default="Qwen/Qwen2.5-72B-Instruct-GPTQ-Int4",
        help="Any tokenizer"
    )
    parser.add_argument("--input_filepath", type=str, required=True, help="Input file path.")
    parser.add_argument("--output_filepath", type=str, required=True, help="Output file path.")
    args = parser.parse_args()

    main(args)