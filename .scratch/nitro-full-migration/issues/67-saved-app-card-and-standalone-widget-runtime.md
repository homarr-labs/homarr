# 67: Saved app card and standalone widget runtime

**What to build:** Select, configure, save and reload a real app card through the typed lazy widget registry, and deliver the complete standalone kind workbench route/layout using the shared editor supplied by #68.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

- [ ] All six app options round-trip through an authorized placement; settings-derived ping defaults and force-disable visibility survive conversion, false values remain false, cross-board/item or wrong-kind writes fail, and unauthorized app reads disclose nothing.
- [ ] Real links/icons/title/description/layout and minute-background ping status work after reload; links are inert in edit preview. Definition and renderer load independently in parallel, deduplicate pending loads and evict rejected loads for retry without server services entering browser chunks.
- [ ] Standalone route/layout validates the requested durable kind, handles invalid/missing kinds, resumes the correct route after login, selects only authorized compatible integrations and supplies the resolved home-board preview context without borrowing another board's authority.
- [ ] Workbench lazy rendering, local options and supported advanced state, resize/edit toggle, error reset, editor-modal handoff and success/failure feedback work together; undefined item/board IDs never authorize saved-item reads or writes. Consume #68's editor, not a second editor implementation.
- [ ] App/ping query registration uses actual procedure, exact input and actual key; refresh/status/recovery, revocation and session changes isolate and clear the right data, dispose registrations and use the approved request-local hydration or deterministic client-pending policy without duplicate calls.
- [ ] At the agreed target milestone, record persisted app-card and standalone workbench evidence including denied preview/save, failed-chunk recovery and login return; focused future security/content/critical-flow checks use disposable data and do not claim fixture-only runtime parity.

## Coverage

Primary kind `app` — 6 direct options: `appId`, `openInNewTab`, `showTitle`, `descriptionDisplayMode`, `layout`, `pingEnabled`. Primary inputs `app`, `switch`, `select`; all three are exercised here. Source capabilities `app.byId`, `widget.app.ping`; standalone kind workbench route/layout and common local widget metadata, loaders, option reduction, query/error/status adapters. Exact evidence: [widget definition/input/procedure ledgers](../../../research_notes/Homarr%20full%20Nitro%20migration/widgets.md#3-exhaustive-definitionoption-ledger), [original runtime obligations](../drafts/widgets.md#widget-runtime--a-real-saved-app-card-on-the-expanded-widget-runtime).

Common completion standard: [PUBLISHING](../PUBLISHING.md) and [widget common obligations](../drafts/widgets.md#common-completion-obligations-inherited-by-every-ticket), interpreted under [DESIGN](../DESIGN.md): preserve durable content with explicit conversion, declared types/defaults/refinements/nullish values, saved-versus-preview authorization, exact query identity, ordinary-stale versus forbidden clearing, hydration/client splits, cleanup and focused deferred evidence. Old protocol spellings/formats need not survive.

## Required contracts

Initially unaccepted: #01 request-local root/contribution and typed route contract; #26 authorized home/board projection; #27 item geometry/focus host; #28 ordered option effects where needed; #29 placement/dialog handoff; #35 app read/selector/embedded form; #68 option get/save/editor/preview service; #20 ping status and #03 bounded state; #04 app/board/preview policy; #09 session/login return; #05/#07/#08 locale/time/modal feedback; #113/#115 icon/media selection; #120 query/error/key interfaces. Accept only needed revisions before dispatch. The real principal/persistence/ping/card/workbench join is later acceptance, not an all-widget/provider start barrier.

## Decision holds

Q11/Q12 affect concrete persistence/conversion; Q13 affects ordered saves; Q15 affects login/session continuity only. Full-product SSR/selective prefetch and cache freshness/demo policy, populated app HTML minimum, preview authority and server option-validation/repair decisions remain genuine holds on affected paths. Core-first auth investigation, singleton, Redis removal, Mantine, file routes and use-intl are settled.

## Ownership

#67 exclusively owns feature-local widget runtime/metadata/loader registry, common query/error adapters, app renderer and standalone workbench route/layout. #68 owns editor and common option services; #29 owns board placement; #35 owns app resources; #98 owns Assistant placement and #104 customApi/options/custom inputs. Families supply descriptors, not registry edits. COMPOSITION (#01/#21/#125) alone installs root/routes/central registries/exports/manifests/build; exclusive local files must be allocated before dispatch.
