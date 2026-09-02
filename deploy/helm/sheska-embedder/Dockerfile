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

CMD ["--model-id", "/model", "--json-output"]