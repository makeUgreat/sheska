# Downloads the model in a separate stage using the official `hf` CLI, rather
# than starting text-embeddings-router itself and waiting for /health — that
# requires the full download-load-warmup sequence to finish, not just the
# download, and the same load+warmup runs again anyway on every container
# start via CMD below. Doing it at build time too was pure waste, and it's
# the expensive part: measured as an ~11GB instantaneous memory spike that
# OOM-killed a CI host outright.
FROM python:3.12-slim AS model
RUN pip install --no-cache-dir huggingface_hub
RUN hf download Qwen/Qwen3-Embedding-0.6B --local-dir /model

# Bake the model into the final image instead of pulling it at runtime.
# Kubernetes local-path storage ties a PVC to whichever node first bound it,
# which blocks running replicas across multiple nodes — baking the model in
# removes the need for a PVC (and the node pinning that came with it)
# entirely.
FROM ghcr.io/huggingface/text-embeddings-inference:cpu-1.9.3
COPY --from=model /model /model

# The pods themselves OOMKilled in production too (confirmed via
# `kubectl` — lastState.terminated.reason: OOMKilled — on both replicas,
# repeatedly, despite both nodes having several GiB free), not just the CI
# build. Same "Starting Qwen3 model on Cpu" -> "Warming up model" -> killed
# pattern every time.
#
# --dtype float16: this repo has no ONNX export, so the backend falls back
# to raw safetensors (fp32) weights.
#
# --max-batch-tokens / --max-concurrent-requests: defaults (16384 / 512) are
# sized for generic high-throughput serving, not this workload. Our chunker
# caps chunks at 6000 characters (recursive-character.chunker.ts,
# DEFAULT_CHUNK_SIZE — originally tuned against Ollama's real per-request
# behavior for this same model). Worst case for dense CJK tokenization that's
# ~6000 tokens per chunk, so 8192 covers one worst-case chunk plus some
# concurrent headroom without approaching the defaults. 32 concurrent
# requests is a conservative cap sized to this workload rather than generic
# high-throughput serving; raise it later if real traffic needs more.
CMD ["--model-id", "/model", "--dtype", "float16", "--max-batch-tokens", "2048", "--max-concurrent-requests", "32", "--tokenization-workers", "1", "--json-output"]