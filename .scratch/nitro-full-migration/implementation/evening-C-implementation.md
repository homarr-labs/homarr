# Evening C — frozen one-file implementation

Implemented only `apps/nitro/src/features/identity/workbench.tsx` under the approved one-file lease. Read the current owned source and existing `GroupPresentation` contract; no dependency rediscovery or library code was needed.

- Added the type-only existing `GroupPresentation` import.
- Required `groupPresentation` in both `IdentityWorkbench` and `IdentityScreen`; forwarded the original object without copying or defaults.
- Replaced obsolete group-list `onOpen` with `presentation={groupPresentation}`; supplied the same object to `GroupEditor`.
- Kept admin/demo/provider gating, authority/currentness, user navigation, initial view, JSX styling and all other branches unchanged. No comments, casts, fake presentation, no-op, optional required owner or tests added.

Source readback completed. **Frozen for independent review; no lint, compiler or other checks run.** No commands, build/install/runtime/native/tests, data/environment/secrets, Git or child agents. No manifest/lock/router/provider/other product source changed. This new handoff was absence-checked initially and immediately before creation.

Identity is not mounted by this change. Lane U still supplies the real presentation/navigation producer and private route join; the four other historical compiler obligations remain outside this lease. No compiler-success or production claim; old evidence remains historical and **91/334 unchanged**.
