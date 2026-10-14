# Independent rereview05: scoped PASS

No P0–P3 findings in the reopened user-menu portal repair. The previous P1 is resolved within the reviewed presentation boundary.

## Source reasoning

- `apps/nitro/src/source-ui/chrome/shell.tsx:36` overrides `userMenu` after `{...header}`. A committed `sessionBlocked=true` render therefore supplies `null`, not the original menu, to every existing header placement.
- `configurable-header.tsx:21–27,31,212–215` forwards that same overridden value into every HeaderItem and the hidden-header floating user slot. `packages/ui/src/source-views/chrome/configurable-header-view.tsx:40–70` renders desktop zones, mobile zones and floating controls through those paths; no separate retained user-menu node was found.
- Removing the actual UserButton subtree removes its Menu.Target, Menu.Dropdown and descendant body portals, including supplied combobox descendants. `withinPortal` and `keepMounted` do not preserve an unmounted parent component. Menu links and board-switcher click/focus/pointer-preload, Assistant, Docker and logout handlers are consequently absent while blocked; the repair does not depend on ancestor DOM inertness reaching a body portal.
- Returning to unblocked mounts a new uncontrolled UserButton/Menu instance, rather than reviving the prior open instance. When continuously unblocked, the identical original node and placement are retained. Width300, withinPortal, keepMounted, ordering, combobox nonclosing behavior, hotkey labels, menu handlers, focus configuration and source styling were not rewritten.
- The checkout shell and checked repaired shell have matching displayed contents. Comparison with the prior publication shell shows only the added menu override. The checkout UserButton, ConfigurableHeader and two explicit publication barrels also match their prior publication copies as read.

## Retained validation evidence inspected

Read actual artifacts under `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/playable-05-portal-fence-upy10vhy`, not only the canonical handoff appendix:

- `lint.command.json`: explicit Node/oxlint paths, Nitro lint config, only repaired shell. Actual stdout: `Found 0 warnings and 0 errors.` and `Finished in 172ms on 1 file with 197 rules using 16 threads.` Stderr empty.
- `typecheck.command.json`: explicit Node/tsc paths, strict/noEmit/bundler/react-jsx flags and all ten actual05 consumer inputs. Both output streams empty.
- `validation-status.json`: lint0 and typecheck0.
- `source-hashes.sha256.log`: repaired shell `947e2cf4490a260fea0323c22ef3fd1dddc3413b7eb14d8e7794c56ac58f1842`; remaining nine05 identities, eighteen accepted P1 body/contract/CSS identities and both barrel identities match the canonical prior tables. Chrome barrel remains `7df4dfa34d27c32e2df1b1db132564adee21da2a401cc41066c7ed329a6e987e`; manage barrel remains `12e1b7e8587031d83dc42b5a492cb2ac75b0c00bd692dd090b2b6f044c356bb4`.
- Captured real UI manifest contains the two exact public barrel declarations and canonical header CSS declaration; its retained hash is `009be1c65d09c5e00729037c69762d6bdc3a985fdf6f3204110b5e8bc35b8292`. The historical missing-export blocker is not present in this retained validation snapshot.

Hashes are inspected retained evidence, not newly recomputed checkout hashes. No commands, tests, builds, browser, Git operations or child agents were run. Only this permitted review artifact was written.

## Scope limits

This is static approval of the exact reopened menu-unmount repair, not runtime portal/focus/race proof, whole-header/provider approval or native/backend authority. The fence applies when the blocked render commits; it does not cancel already-started callbacks/resource operations, establish externally owned hotkey gating or guarantee provider session currentness. Other authority, resource and runtime holds remain unchanged.
