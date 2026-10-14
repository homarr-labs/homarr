# Evening M restore-slot implementation: frozen for independent review

Approved exact three-file lease implemented with four inserted lines:

| File                                             | Exact addition                                                             |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `apps/nitro/src/features/onboarding/types.ts`    | Welcome presentation props: `sqliteRestore?: ReactNode;`                   |
| `apps/nitro/src/features/onboarding/studio.tsx`  | Welcome invocation: `sqliteRestore={props.sqliteRestore}`                  |
| `packages/onboarding/src/presentation-steps.tsx` | `OnboardingWelcomeViewProps`: `sqliteRestore?: ReactNode;`                 |
| `packages/onboarding/src/presentation-steps.tsx` | Immediately after the existing restore-hold Alert: `{props.sqliteRestore}` |

The existing optional presentation slot remains an optional ReactNode, not a new optional resource owner. The actual supplied component is forwarded unchanged; no DatabaseRestoreFlow replacement, component import, transport, bootstrap, capability or authorization is constructed. Rendering remains inside the existing `databaseDriver === "sqlite" && showRestore` branch, after the same translated description and restore hold. Existing disabled start/restore buttons, SQLite/showRestore condition, upstream claim/current-step gates, Mantine structure/CSS and i18n remain unchanged. Backup apply/export controls and producer holds are untouched.

Existing React dependencies/type imports were inspected in both package manifests; no dependency, manifest or lock edit. Applicable UI skill guidance was read; command/browser setup was not run under the explicit no-command lease. No comments, casts, any types, tests, other product edits, authority/native changes or new framework.

Only these three product files and this absence-checked new report were patched. No commands/checks/install/build/runtime/browser/native/SQL/data/environment/secrets/sealed captures/Git/children. Lint/typecheck and independent behavior/standards review remain pending coordinator freeze; no validation success, restore readiness or coverage increase is claimed. Coverage remains 91/334. This exact four-line product delta is frozen on return.
