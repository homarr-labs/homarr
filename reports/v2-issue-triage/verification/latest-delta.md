# Latest release/v2 delta

Reviewed range: `681c1dd15a5d4753c04a84f7cb92a60e47a2c360..439b208283c2e80dd399fcb2a83e1661bb0c099f`.

Commit `439b20828` (`#6860`) is a responsive widget sweep. It changes compact sizing, metric/column visibility, chart axes, loading presentation, and scroll/layout behavior across widget families. The affected baseline assessments are retained below unless the changed code directly satisfies their request.

The new issue snapshot for `#6853` was also read in full. Its notification feature is already present in the `439b20828` tree through the earlier notification implementation: sanitized Markdown/HTML rendering, Gotify deletion, and a dedicated service-link action. The `681c1dd15..439b20828` notification delta itself adds responsive density and title/body tooltips; it is not treated as the feature's originating fix.

The available `verification/*` runtime/UI assessments are pinned to `681c1dd15a5d4753c04a84f7cb92a60e47a2c360`. Those prior runtime results are not evidence for behavior in paths changed at `439b208283c2e80dd399fcb2a83e1661bb0c099f`; this agent performed no new `439b20828` runtime capture. The parent subsequently completed a [fresh notebook browser smoke](latest-runtime.json) on that exact image; deployment-specific persistence remains unverified. In particular, the prior #3140 Notebook persistence result cannot validate the new Notebook layout code. #2861 mobile section-membership and #6811 header-overflow runtime rows were not included because #6860 changes no board-section or header paths.

| Issue | Suggested disposition | Delta finding |
| --- | --- | --- |
| #6853 | addressed-in-v2 / high | Current `439b` source covers all three notification requests; #6860 only adds responsive notification presentation. |
| #6644 | not-addressed / high | Beszel charts are more responsive, but System Stats still has no GPU historical panels. |
| #6600 | partially-addressed / high | Compact Docker presentation improves; unresolved beta subtopics, including direct Docker controls/pause, remain. |
| #6589 | addressed-in-v2 / high | Docker endpoint selection and filtered totals are unchanged by the responsive diff. |
| #6155 | not-addressed / high | Beszel still does not use Dashdot `CommonChart`. |
| #3853 | not-addressed / high | Docker stats remain admin-gated. |
| #3843 | not-addressed / high | Notebook table border controls remain absent. |
| #3784 | not-addressed / high | No app-to-container link or app-tile lifecycle controls were added. |
| #3140 | needs-verification / medium | Notebook presentation changed, but the reported persistence/deployment paths still need a fresh `439b` runtime check. |

No branches, GitHub state, products, containers, or existing report files were changed; only these two latest-delta report files were added.
