FROM ghcr.io/huggingface/text-embeddings-inference:cpu-1.9.3

# Bake the model into the image instead of pulling it at runtime. Kubernetes
# local-path storage ties a PVC to whichever node first bound it, which blocks
# running replicas across multiple nodes — baking the model in removes the
# need for a PVC (and the node pinning that came with it) entirely.
RUN (text-embeddings-router --model-id Qwen/Qwen3-Embedding-0.6B &) && \
    until curl -sf http://localhost:3000/health >/dev/null 2>&1; do sleep 1; done && \
    pkill text-embeddings-router

CMD ["--model-id", "Qwen/Qwen3-Embedding-0.6B", "--json-output"]