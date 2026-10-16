# Native worker review

Review base: backend-only checkpoint `ffd6565d4`. Feature snapshot: `b8abab697`. Both axes ran independently in parallel; fixes were then checked separately. Review agents used Luna 6 Max and GPT 6.1 Sol Medium after the user's model preference changed.

## Standards

Two documented-rule findings were fixed:

- New Board-facing text used “dashboard.” It now uses “board”; existing saved names, import paths, and CSS identifiers remain intact. The legacy directory's default share label also uses “Shared board.”
- The earlier experimental viewer hand-built generic SVG icons. Its generic icons now use the repository's Tabler dependency. Its brand mark remains a brand mark.

All five required documentation checks passed: typecheck, production build, links, search, and SEO. Tests were explicitly authorized at the worker connection, organization/invite, federation, and MCP boundaries.

Three smell-baseline suggestions remain judgment calls, rather than violations: browser/server admission handshake duplication, separate federation merge/failure classifications, and direct branching for two sharing modes. The current transport policies remain local, native failure shapes remain explicit, and the two sharing modes avoid another configuration abstraction. Their current public behavior is covered by the focused checks.

**Result:** two documented findings resolved; three nonblocking design suggestions accepted.

## Spec

Two confirmed behavior findings were fixed:

- Custom Widget load, shared load, manual query, and action paths checked cancellation but did not forward it into delegated requests. They now forward the operation signal through the executor. A real encrypted placed-widget test observes upstream HTTP cancellation for all four paths and fails when forwarding is removed.
- Hosted MCP discovery rejected more than 100 integrations despite approvals supporting 1,000. Discovery now accepts 1,000; the 101-integration case returns its provenance, and malformed/count/body limits still fail closed.

The Spec reviewer checked both fixes in the final working tree and confirmed them resolved. No additional confirmed scope or security finding remained in the reviewed seams.

**Result:** two findings resolved; no outstanding confirmed Spec findings.

## Additional final browser findings

- Bun's bare `undici` import selected an incomplete built-in substitute. Runtime imports now select the installed `undici/index.js`. Actual Bun tests cover GET, actions, cancellation, DNS pinning, and scope rejection; the assembled container confirms genuine Agent methods. Firefox's placed Custom Widget Image/Avatar/SubData flow passes.
- Opening a second worker's invitation in a fresh navigation left the saved primary offline. The frontend now restores a different saved primary while retaining same-worker setup confirmation. The container regression passes.
- Viewer publication checks did not account for omitted location options that the frontend fills with defaults. Weather, air quality, and clock definitions now share their existing default locations with the publication guard. The regression permits only the correct defaults and rejects other coordinates.
