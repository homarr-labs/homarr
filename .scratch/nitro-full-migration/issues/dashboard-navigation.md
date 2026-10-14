# Map complete dashboard and navigation migration

Type: research. Claimed by the coordinator for a background research worker. Blocked by: none; source and primary documentation are available. Linear publication is blocked by its free issue limit, not by an architectural dependency.

## Question

How should every current dashboard, board editor, app/bookmark, search/navigation and board-management flow move from Next App Router to Vite and TanStack Router without losing behavior?

Inventory actual routes, layouts, loaders/actions, board contexts, editing and grid semantics, links, redirects, search parameters, route-driven modals, SSR and invalidation. Distinguish reusable domain/UI code from Next-specific glue. Propose independent end-to-end migration batches with shared interfaces, genuine blockers and human demo checkpoints.

Read `../RESEARCH.md` for the common evidence and safety contract. Write only `research_notes/Homarr full Nitro migration/dashboard-navigation.md`. Leave widget internals to the widget worker, identity policy to the identity worker and shared localization services to the frontend replacement worker; cite the seams that connect them.
