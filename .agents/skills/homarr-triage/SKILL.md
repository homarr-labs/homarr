---
name: homarr-triage
description: Triage Homarr GitHub issues and pull requests, refresh reporter follow-ups, prioritize investigations, and operate the triage Project. Use for queue updates and approved issue work, including contributor PRs.
---

# Homarr Triage

Work in `homarr-labs/homarr`. Treat an issue and its implementation PR as one investigation, while retaining their separate testing and review states.

## Load the contract

From the repository root, read:

- [Issue tracker](../../../docs/agents/issue-tracker.md): repository, request surfaces, and operations.
- [Triage labels](../../../docs/agents/triage-labels.md): exact categories, primary states, sizes, and reporter acceptance.
- [Project automation](../../../docs/agents/triage-project.md): Status mapping, event behavior, credentials, and recovery limits.

These repository documents take precedence over differently named labels or state meanings in a generic triage skill. This skill does not require a globally installed skill. Open linked files directly if the agent environment has no skill invocation tool.

Use [GitHub operations](references/github-operations.md) when collecting conversations, checking the board, or repairing synchronization. Use [delivery and replies](references/delivery.md) when implementing, publishing evidence, replying, or merging.

## Refresh and recommend

1. Establish the requested scope and time window. For "today", use the user's timezone and convert midnight to UTC; state the timezone and checked-at time. Keep yesterday's carryover separate. A request for a table or recommendations is read-only; it does not authorize comments, label changes, code, CI approval, or delegation.
2. Discover newly opened **and updated** issues and PRs, including recently closed/merged work. Include collaborator PRs and explicitly named items. Separate automated dependency/translation activity from human replies. Paginate reads; a list/search result is discovery, not a full conversation review.
3. Read selected bodies, Conversation comments, review submissions, inline review replies, label/state events, linked reports, and current PR heads. Preserve resolved questions, maintainer decisions, existing contributor work, and explicit holds. An `updated_at` change alone is not a human reply. Distinguish a new comment from an edit of an older one.
4. Check current default-branch code using `codebase-context`, plus relevant glossary/ADRs. Search existing implementations and open/merged fixes before assigning work. If rejection records such as `.out-of-scope/` exist, consult them; their absence is not evidence of approval.
5. Rank by user-visible impact, affected users, reproducibility, bounded scope, and existing progress. Favor a focused regression fix or review of an existing small PR over a competing implementation. Identify missing evidence and product choices separately.

Present a linked table: item, current state/new evidence, value, proposed action, and blocker or maintainer decision. Distinguish source findings, reporter claims, and locally reproduced behavior. End with a small proposed set of disjoint investigations; dispatch only when authorized. Do not claim every item was source-reviewed or reproduced when only metadata was refreshed.

## Apply an authorized decision

- Re-read the item immediately before mutating it. For open triaged work, use the exact repository category, one primary state, and one size once scope is understood. Preserve unrelated labels. Flag conflicting primary states for maintainer resolution rather than selecting one from an arbitrary ordering; the workflow skips those items.
- A contributor PR and green checks do not establish that the maintainer wants the feature or its current design. Resolve product choices before implementation. Inspect a draft when requested, but preserve its draft/hold status until the maintainer or author advances it.
- An author saying "works" is evidence to read, not permission to merge. Record what build and behavior were accepted. Follow the repository's acceptance/closure contract, including any explicit maintainer override.
- Existing authorization remains valid within its stated scope. Do not repeatedly ask for approved work, or extend permission for one PR's CI, preview, or admin bypass to unrelated PRs.
- When delegation is authorized, give each agent one owning issue/PR, an isolated checkout, expected behavior, existing decisions, evidence requirements, and permitted side effects. Respect requested model/concurrency settings and the runtime limit. Keep one lead-owned findings table; integrate fresh remote state before publishing.

## Follow the board correctly

Labels are authoritative. The Project is a mirror; moving a card does not change labels or authorize work. Open unlabelled items can appear as **Needs triage** without acquiring a repository label.

An original human author's new top-level Conversation reply releases a sole `waiting-for-reporter` state to `needs triage` only when it postdates the current waiting-label event. This requests another review; it is not acceptance. Bot/App replies and recognized AI-disclaimer replies are ignored. Non-author comments, inline review replies, edited-old comments, and maintainer holds still require manual attention.

A PR push can invalidate older testing readiness. The automation preserves explicit holds, conflicting states, newer readiness, and ambiguous same-second ordering. Recheck the actual current head, checks, and published image rather than assuming the workflow removed every stale label.

Use **All tracked items** to inspect completed work; **Triage board** filters to open work. Verify both the workflow result and the real card Status after an authorized repair. A green run can still report skipped Project sync or a conflict; read the relevant step output.

## Leave useful public context

Prefix new AI-authored public triage text with:

```markdown
> _This was generated by AI during triage._
```

Explain what changed or was established, the evidence, and the single next action. Use human-facing language; keep agent assignments, internal prompts, and status recitations in the working ledger. Do not post an "Agent Brief" to the contributor.

Inspect the latest Conversation before posting. If an AI/LLM triage follow-up already exists and no human has replied since, a later triage pass must not append another AI message. This applies across sessions, models, and accounts; intervening bot activity does not reset it. Leave the message alone when nothing material changed, or edit it with new findings/corrections. When an authorized fresh ping is needed, replace the identified existing AI note with one corrected message instead of leaving both in the conversation.

The authenticated account can also contain human-written comments; verify the exact comment ID and AI provenance before editing/deleting. Edit/delete only messages within the agent's authorized control. If the existing AI note cannot be updated, keep the new findings in the working ledger until a human replies or the maintainer directs otherwise. Preserve human replies, useful history, and the maintainer's removal of obsolete AI notes. Re-read after a successful write.

## Completion

Report the requested outcome with links and distinguish what is still waiting: investigation, implementation, CI, preview publication, reporter validation, merge, or release. Update the working findings table and changed cards within the authorized scope. Do not infer release/deployment success from a merge or silently revive held work.
