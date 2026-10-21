# Worker memory evidence — 21 October 2026

Interpretation and workload: [report](../../../../docs/notes/remote/worker-memory-20261021.md).

`summary.json` records the exact image, build command, source hashes, effective limits and per-phase metrics. The three phase files preserve raw one-second samples losslessly (`gzip -dc active.json.gz`). `image-proof.json` and the browser flow/errors establish the narrow functional scope and task cleanup. No worker credentials, private links, databases or user data are included.

Only corrected-image windows are accepted. The earlier relay-only configuration failure and its setup delay were excluded. The final collector adds conservative missing-PID/output-preservation guards; the first two accepted windows recorded a stable two-process roster, and the primary cgroup sampling formula is unchanged.

The phase maxima are sampled, not instantaneous. A shared-host page charge is not the same metric as RSS or PSS. The short workload has no configured external integrations and does not determine a safe deployment memory cap.

The raw active phase label includes the planned management navigation. Its accepted interpretation is initial dashboard connection/loading; the saved navigation timestamps are subsequent functional proof before the warm-idle window. See the report for that boundary.
