# Approved Nitro feasibility implementation tickets

Published October 10, 2026 after user approval of the eight-ticket breakdown and start. The canonical specification is [Prove a cached dashboard on Nitro v3][spec]; these are its implementation children, not wayfinder issues. Project: Homarr Nitro migration experiment (`P-AJN-6`); team: `AJN`.

## Ticket index and verified blockers

1. [Establish the isolated Nitro fixture foundation][foundation] — **AJN-499**.
   - Blocked by: none.
   - Publication state: In Progress, assigned to the authenticated user (Thomas Camlong).
2. [Serve a populated cached board with matching hydration][rendering] — **AJN-500**.
   - Blocked by: [Establish the isolated Nitro fixture foundation][foundation].
3. [Select fixture identities and enforce private-board access][access] — **AJN-501**.
   - Blocked by: [Establish the isolated Nitro fixture foundation][foundation].
4. [Refresh the included widget from a controlled HTTP source][widget] — **AJN-502**.
   - Blocked by: [Serve a populated cached board with matching hydration][rendering]; [Select fixture identities and enforce private-board access][access].
5. [Save runtime board edits with revision-safe persistence][editing] — **AJN-503**.
   - Blocked by: [Serve a populated cached board with matching hydration][rendering]; [Select fixture identities and enforce private-board access][access].
6. [Expose one authorized REST sample and its OpenAPI document][rest] — **AJN-504**.
   - Blocked by: [Select fixture identities and enforce private-board access][access].
7. [Package the isolated fixture application in one container][container] — **AJN-505**.
   - Blocked by: [Establish the isolated Nitro fixture foundation][foundation].
8. [Integrate and verify the complete feasibility slice][integration] — **AJN-506**.
   - Blocked by: [Establish the isolated Nitro fixture foundation][foundation]; [Serve a populated cached board with matching hydration][rendering]; [Select fixture identities and enforce private-board access][access]; [Refresh the included widget from a controlled HTTP source][widget]; [Save runtime board edits with revision-safe persistence][editing]; [Expose one authorized REST sample and its OpenAPI document][rest]; [Package the isolated fixture application in one container][container].

All eight issues have only `ready-for-agent`. At publication, tickets 2–8 are Todo and unassigned. Native `blockedBy` relationships, parent, project, team, labels, and assignments were read back and verified. All eight were linked to primary user session `ses_eda1c4289ffezx6R6PWxk49PHO` immediately after creation. Statuses here are a publication snapshot; live Linear issues own execution state.

## Execution pointers

- Read the canonical [specification][spec] and the claimed ticket for scope, acceptance criteria, ownership boundaries, and check policy.
- Read [COORDINATION.md](COORDINATION.md) for proposed concrete ownership, shared-file single-writer rules, dependency-ready claims, coordinated probe reservations, and bounded worker notes.
- [SPEC.md](SPEC.md) is the local specification source. [TICKETS-DRAFT.md](TICKETS-DRAFT.md) is preserved unchanged as the approved historical proposal, including its original draft wording; it is no longer an approval gate or execution-state tracker.
- Begin with the foundation's exclusive shared contracts/manifests/lockfile/registrations. Subsequent workers claim only ready, non-overlapping capability boundaries. Maximum implementation frontier: four workers, not twelve artificial lanes.
- Focused isolated dev/build/runtime probes may demonstrate composed slices under coordinator ownership. Intermediate lint/typecheck and new tests remain excluded. Final integration owns complete-slice validation and scoped lint/typecheck; never run full-repository typecheck.
- This publication/index task performed no implementation, installation, code commands, or checks and did not edit the specification, coordination document, draft, roster, or parent issue bodies.

[spec]: https://linear.app/ajnart/issue/AJN-498/prove-a-cached-dashboard-on-nitro-v3
[foundation]: https://linear.app/ajnart/issue/AJN-499/establish-the-isolated-nitro-fixture-foundation
[rendering]: https://linear.app/ajnart/issue/AJN-500/serve-a-populated-cached-board-with-matching-hydration
[access]: https://linear.app/ajnart/issue/AJN-501/select-fixture-identities-and-enforce-private-board-access
[widget]: https://linear.app/ajnart/issue/AJN-502/refresh-the-included-widget-from-a-controlled-http-source
[editing]: https://linear.app/ajnart/issue/AJN-503/save-runtime-board-edits-with-revision-safe-persistence
[rest]: https://linear.app/ajnart/issue/AJN-504/expose-one-authorized-rest-sample-and-its-openapi-document
[container]: https://linear.app/ajnart/issue/AJN-505/package-the-isolated-fixture-application-in-one-container
[integration]: https://linear.app/ajnart/issue/AJN-506/integrate-and-verify-the-complete-feasibility-slice
