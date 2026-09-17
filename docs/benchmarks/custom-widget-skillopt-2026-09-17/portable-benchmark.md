# Portable skill behavior benchmark

This is a bounded before/after benchmark of 10 synthetic behavior cases across
`codebase-context`, `documentation-sync`, and `mcp-integration`. Each case was
sent once with the baseline skill and once with the current skill, for 20
completed OpenRouter requests using `z-ai/glm-5.3-flash`. The raw responses and
per-call settled usage costs are in [portable-calls.jsonl](./portable-calls.jsonl).

The ordered provider routes were Sail Research, Atlas, Together, CoreWeave, and
Baseten, with fallback disabled and the configured price ceiling of $0.15 per
million input tokens and $0.50 per million output tokens. All 20 calls used
Sail Research and reported confirmed `usage.cost`.

## Results

The semantic review was one manual agent judgment pass. Partial criteria receive
0.5 points. The full expected sentences were also checked literally; that
separate audit is not a quality score.

| Skill | Baseline points | Current points | Maximum | Baseline cost | Current cost |
| --- | ---: | ---: | ---: | ---: | ---: |
| `codebase-context` | 4.0 | 6.0 | 9 | $0.00079515 | $0.00074715 |
| `documentation-sync` | 6.5 | 5.5 | 7 | $0.00051672 | $0.00058539 |
| `mcp-integration` | 9.0 | 9.5 | 12 | $0.00122195 | $0.00099101 |
| **Total** | **19.5** | **21.0** | **28** | **$0.00253382** | **$0.00232355** |

The portable suite cost $0.00485737 in total. All 10 cases were free of
must-not violations in both arms. Literal overlap was 0/28 in both arms; the
case-by-case rationale and criteria are in
[portable-semantic-grades.json](./portable-semantic-grades.json).

The first two calls were the `codebase-boundary-01` baseline/current pair and
cost $0.00027535 and $0.00026015. They were settled before the remaining 18
requests proceeded.

## Accounting reconciliation

Portable calls map to telemetry rows 262–281 by response ID, response length,
token counts, and exact reported cost. The separate runtime prompt benchmark
maps to rows 282–291 and contains 10 different `runtime/<case>/<arm>` request
IDs; its $0.00803370 is excluded from the portable totals. Its prompt hashes are
listed in [portable-benchmark-summary.json](./portable-benchmark-summary.json).
The portable backend evidence did not persist prompt SHA-256 values, so no
prompt-hash comparison is claimed for those 20 calls.

The shared ledger remains the source of reservation and settlement accounting.
Additional bounded repair calls share this ledger. Use the per-call telemetry
for the portable total and read the final ledger after all jobs finish; no
ledger snapshot in this report is a portable-only balance.

## Review limits

This is a single-pass semantic judgment of the case expectations. It does not
prove browser behavior, MCP transport behavior, deployment behavior, or the
truth of any model-generated repository claim. Baseline and current skill
content hashes are recorded in
[portable-skill-hashes.json](./portable-skill-hashes.json).
