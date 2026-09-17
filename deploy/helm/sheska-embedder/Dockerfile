# Bakes the model into the image at build time instead of pulling it at
# runtime (the old sheska-ollama chart's postStart-hook `ollama pull`, which
# needed a node-pinned local-path PVC and blocked scaling replicas across
# nodes — see 632c843 for the same rationale applied to sheska-embedder).
FROM ollama/ollama:latest AS model
# Ollama sizes the inference threadpool from the node's visible core count
# (nproc), which ignores this pod's CFS quota — a single embedding request
# then oversubscribes the quota and spends most of every scheduling period
# throttled. Baking num_thread into the tag rather than sending it per
# request keeps every caller on one runner: Ollama keys loaded runners by
# their options, so a request that omits the option would unload and reload
# the runner.
# Keep this equal to values.yaml resources.limits.cpu (2000m).
RUN (ollama serve &) && \
    until ollama list >/dev/null 2>&1; do sleep 1; done && \
    ollama pull qwen3-embedding:0.6b && \
    printf 'FROM qwen3-embedding:0.6b\nPARAMETER num_thread 2\n' > /tmp/Modelfile && \
    ollama create qwen3-embedding:0.6b -f /tmp/Modelfile

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
