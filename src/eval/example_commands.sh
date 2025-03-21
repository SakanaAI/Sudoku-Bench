# OpenAI - o3-mini-2025-01-31
export API=openai
export MODEL=o3-mini-2025-01-31
export OPENAI_API_KEY=...
for DATA_SOURCE in nikoli_100 challenge_100; do
    python -m eval.run \
        --dataset ${DATA_SOURCE} \
        --output_csv ../data/benchmark_results/${DATA_SOURCE}/${MODEL}.csv \
        --api ${API} \
        --model ${MODEL} \
        --batch_size 20
done

# OpenAI - gpt-4o-2024-11-20
export API=openai
export MODEL=gpt-4o-2024-11-20
export OPENAI_API_KEY=...
for DATA_SOURCE in nikoli_100 challenge_100; do
    python -m eval.run \
        --dataset ${DATA_SOURCE} \
        --output_csv ../data/benchmark_results/${DATA_SOURCE}/${MODEL}.csv \
        --api ${API} \
        --model ${MODEL} \
        --batch_size 20
done

# OpenAI - gpt-4o-mini-2024-07-18
export API=openai
export MODEL=gpt-4o-mini-2024-07-18
export OPENAI_API_KEY=...
for DATA_SOURCE in nikoli_100 challenge_100; do
    python -m eval.run \
        --dataset ${DATA_SOURCE} \
        --output_csv ../data/benchmark_results/${DATA_SOURCE}/${MODEL}.csv \
        --api ${API} \
        --model ${MODEL} \
        --batch_size 20
done

# Anthropic - claude-3-7-sonnet-20250219
export API=anthropic
export MODEL=claude-3-7-sonnet-20250219
export ANTHROPIC_API_KEY=...
for DATA_SOURCE in nikoli_100 challenge_100; do
    python -m eval.run \
        --dataset ${DATA_SOURCE} \
        --output_csv ../data/benchmark_results/${DATA_SOURCE}/${MODEL}.csv \
        --api ${API} \
        --model ${MODEL} \
        --batch_size 20
done

# Anthropic - claude-3-5-haiku-20241022
export API=anthropic
export MODEL=claude-3-5-haiku-20241022
export ANTHROPIC_API_KEY=...
for DATA_SOURCE in nikoli_100 challenge_100; do
    python -m eval.run \
        --dataset ${DATA_SOURCE} \
        --output_csv ../data/benchmark_results/${DATA_SOURCE}/${MODEL}.csv \
        --api ${API} \
        --model ${MODEL} \
        --batch_size 20
done

# deepseek-ai/DeepSeek-V3
export API=togetherai
export MODEL=deepseek-ai/DeepSeek-V3
export TOGETHERAI_API_KEY=...
for DATA_SOURCE in nikoli_100 challenge_100; do
    python -m eval.run \
        --dataset ${DATA_SOURCE} \
        --output_csv ../data/benchmark_results/${DATA_SOURCE}/${MODEL}.csv \
        --api ${API} \
        --model ${MODEL} \
        --batch_size 20
done

# Qwen/QwQ-32B-AWQ
export API=vllm
export MODEL=Qwen/QwQ-32B-AWQ
for DATA_SOURCE in nikoli_100 challenge_100; do
    CUDA_VISIBLE_DEVICES=0,1,2,3 python -m eval.run \
        --dataset ${DATA_SOURCE} \
        --output_csv ../data/benchmark_results/${DATA_SOURCE}/${MODEL}.csv \
        --api ${API} \
        --model ${MODEL} \
        --tensor_parallel_size 4 \
        --batch_size 1024 \
        --temperature 0.6 \
        --max_tokens 20000
done

# Qwen/Qwen2.5-72B-Instruct-GPTQ-Int4
export API=vllm
export MODEL=Qwen/Qwen2.5-7B-Instruct-GPTQ-Int4
for DATA_SOURCE in nikoli_100 challenge_100; do
    CUDA_VISIBLE_DEVICES=0,1,2,3 python -m eval.run \
        --dataset ${DATA_SOURCE} \
        --output_csv ../data/benchmark_results/${DATA_SOURCE}/${MODEL}.csv \
        --api ${API} \
        --model ${MODEL} \
        --tensor_parallel_size 4 \
        --n_response_idxs 0 1 2 \
        --batch_size 1024
done

# meta-llama/Llama-3.3-70B-Instruct
export API=vllm
export MODEL=Llama/Llama-3.3-70B-Instruct
for DATA_SOURCE in nikoli_100 challenge_100; do
    CUDA_VISIBLE_DEVICES=0,1,2,3 python -m eval.run \
        --dataset ${DATA_SOURCE} \
        --output_csv ../data/benchmark_results/${DATA_SOURCE}/${MODEL}.csv \
        --api ${API} \
        --model ${MODEL} \
        --tensor_parallel_size 4 \
        --n_response_idxs 0 1 2 \
        --batch_size 1024
done

# RekaAI/reka-flash-3
export API=vllm
export MODEL=RekaAI/reka-flash-3
for DATA_SOURCE in nikoli_100 challenge_100; do
    CUDA_VISIBLE_DEVICES=0,1,2,3 python -m eval.run \
        --dataset ${DATA_SOURCE} \
        --output_csv ../data/benchmark_results/${DATA_SOURCE}/${MODEL}.csv \
        --api ${API} \
        --model ${MODEL} \
        --tensor_parallel_size 4 \
        --n_response_idxs 0 1 2 \
        --batch_size 1024
done

# google/gemma-3-27b-it
export API=vllm
export MODEL=google/gemma-3-27b-it
for DATA_SOURCE in nikoli_100 challenge_100; do
    CUDA_VISIBLE_DEVICES=0,1,2,3 python -m eval.run \
        --dataset ${DATA_SOURCE} \
        --output_csv ../data/benchmark_results/${DATA_SOURCE}/${MODEL}.csv \
        --api ${API} \
        --model ${MODEL} \
        --tensor_parallel_size 4 \
        --n_response_idxs 0 1 2 \
        --batch_size 1024
done