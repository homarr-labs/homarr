# Reconciliation notes

The parent review checks proposed resolutions against the actual scope and implementation, then incorporates corrections into reviewer JSON and the consolidated reports.

| Issue | Initial assessment | Final adjustment | Reason |
| --- | --- | --- | --- |
| #1014 | Partially addressed | Not addressed | Manual URL entry does not implement standard browser HTML bookmark import/export. Corrected a `.tsx` evidence filename to `.ts`. |
| #3140 | Partially addressed | Needs verification | An existing notebook mutation and bookmark renderer do not demonstrate a causal fix for stale edits, anonymous-board failures, or client errors. |
| #6543 | Addressed in V2 | Partially addressed | The stateless transport/SDK upgrade is present, but the proposed scope also includes OAuth/CIMD evaluation and metadata, cache documentation, and Assistant compatibility validation. Retaining DCR does not itself imply noncompliance. |
| #6622 | Addressed in V2 | Disposition retained; evidence wording qualified | The reporter confirmed re-login on the PR test image but was unsure whether the additional instance was actually V2. The current source and merged equivalent establish code placement; this is not runtime proof for the reviewed SHA. |
| #2160 | Partially addressed | Addressed in V2 | The request is two Proxmox integrations in one widget; V2 renders both. The reviewer had added an unrequested combined-totals requirement. |
| #4738 | Addressed in V2 | Needs verification | A redesigned layout-save path does not establish a fix for one problematic existing board with no isolated cause. |
| #4190 | Not addressed, high | Needs verification, medium | The current schema already allows a null CPU model; the actual failing OMV field/payload is unknown. |
| #6300 | Partially addressed | Needs verification | Beszel being used to measure container memory is not evidence that the affected board uses a Beszel live widget. Related retention fixes lack a causal link to this report. |
| #6671 | Addressed in V2 | Disposition retained; conversation strengthened | The reporter confirmed the outbound-disabled explanation after re-adding the widget. This resolves misleading UX, not disabled weather fetching. |
| #2154, #2478, #2495 | Evidence references | Corrected | Removed a directory-as-file citation, replaced a nonexistent backup router reference with the actual export route, and pointed the app redirect to its real lines. |
| #3675 | Not addressed, high | Needs verification, medium | Process consolidation changes shutdown behavior; potential open handles are not proof that the original multi-process SIGTERM hang survives. |
| #962, #2911 | Addressed in V2 | Needs verification | A replacement container model does not prove menu-handle overlap or repeated child-drag failures are fixed. The original #962 screenshots show nested handles; runtime reproduction is still required. |
| #6682 | Addressed in V2; incorrect commit ancestry | Disposition retained; ancestry corrected | The independent audit and parent git check confirm `31e218295` is not an ancestor. The current V2 header-forwarding implementation and conversation support the candidate independently. |
| #4973 | Partially addressed | Addressed in V2 | Parent and independent audit traced the old double-counted capacity to the corrected TrueNAS mapping; no invented physical-memory normalization requirement remains. |
| #6153 | Not addressed, high | Partially addressed, medium | Parent refined both reviewers: the native Assistant widget plus configurable compatible endpoint partially serves the stated local-LLM chat goal, even though a dedicated Open WebUI client is absent. Open WebUI compatibility remains untested. |
| #4541 | Addressed in V2 | Partially addressed | Selecting breakpoints and projecting new/reset layouts does not automatically propagate later Base edits into all existing layouts. |
| #6850 | Not addressed, high | Needs verification, medium | Parent refined both reviews: navigating to the IdP after local logout does not itself prove the reported premature navigation back to Homarr. Firefox and Authentik reproduction is required. |
| #6024 | Addressed in V2 | Needs verification | A Beszel timing correlation and a generic SyntaxError boundary do not establish that the reported JavaScript parser exception originated in that guarded integration path. The final independent audit agrees. |
| #125 | Closure follow-up | Keep as ongoing tracker | Renovate dashboard maintenance is recurring; it is not a product bug or a V2 closure candidate. |

The comment inventory was checked against timeline comment IDs for every issue. All 442 matched exactly. Application behavior was reviewed from source. Five focused assertions against the V2 Nextcloud URL helper passed; full application and deployment checks remain pending. See [validation details](RUNTIME-VALIDATION.md).
