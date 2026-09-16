# Bakes the model into the image at build time instead of pulling it at
# runtime (the old sheska-ollama chart's postStart-hook `ollama pull`, which
# needed a node-pinned local-path PVC and blocked scaling replicas across
# nodes — see 632c843 for the same rationale applied to sheska-embedder).
FROM ollama/ollama:latest AS model
RUN (ollama serve &) && \
    until ollama list >/dev/null 2>&1; do sleep 1; done && \
    ollama pull qwen3-embedding:0.6b

FROM ollama/ollama:latest

# curl is not present in the base image. k8s httpGet probes can't POST, and
# /api/embeddings is the only endpoint that actually exercises the
# NUM_PARALLEL-gated inference queue (/, /api/tags, /api/ps all respond
# instantly regardless of queue state) — so an exec probe shelling out to
# curl is the only way to detect a stuck inference pipeline.
# Installed before the model COPY so a future model bump doesn't bust this
# layer's cache.
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

COPY --from=model /root/.ollama /root/.ollama

# Ollama's default 5-minute idle-unload was the original reason this backend
# got replaced by TEI (632c843): a quiet period forced a 15-25s cold reload
# on the next request. -1 keeps the model resident for the pod's lifetime.
ENV OLLAMA_KEEP_ALIVE=-1
