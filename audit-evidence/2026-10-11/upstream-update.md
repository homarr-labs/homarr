# Upstream update during the audit

Initial audited/controlled baseline: `bab8e2a2dad837365a2237263b58b658d23abe69`. A delivery refresh at 2026-10-11 16:58 UTC found `origin/dev` at `9e3fe5a693a40258de6322abb2a3bdfdb9427b66`, with #7153/#7154 since the baseline.

The integration media-search board-ID projection is identical upstream and is omitted from the final PR diff. This audit still independently measured the query shape, but the new integration improvement in this PR is limited to the two middleware queries.

Upstream Custom JSX request-parameter analyzer changes and notebook conditional document stats/effect dependencies were preserved during the final rebase. LDAP authorization, BoardCard, Custom Widget executor, runtime catalog generator and canonical catalog bytes/dependency versions are unchanged upstream. The final source was independently reviewed and checked against the refreshed merge-base.

All raw before/after measurements retain their exact original source hashes. Production graph/chunk measurements were captured on the original controlled baseline; unrelated upstream changes can alter final graph hashes/sizes, so they are not asserted as final-head deployed route transfer. Final catalog parity/architecture and owning checks verify the combined source. The 4,201-path audit manifest describes the original audited inventory; this note records subsequent upstream changes separately rather than relabeling them as measured improvements.
