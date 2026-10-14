# F4 — recursive owner inference repair

Fresh frozen-source checks at `nitro-onboarding-wire-client-checks-l61ka8cc` report only TS7022/TS7023 in `claim.ts`: owner initializer references `owner.disposeAsync` through reset, leaving recursive return inference unresolved. Lint/format pass and source associations remain conserved.

Prospective sole file `apps/nitro/src/features/onboarding/claim.ts`:

- Add the existing `OnboardingCsrfOwner` type annotation to `const owner`.
- Annotate that object's `resetAsync` method with its already-declared `Promise<void>` return type.

Keep the existing Object.freeze generic and all runtime expressions, method bodies, currentness/generation/task/retirement checks, legacy claim body and public signatures unchanged. No cast, suppression, any, wrapper, new type or caller effect. This is a static repair, not cancellation/concurrency/runtime proof.

Both active F4 source reviews must finish and any findings reconcile before authoring. Original reviewers approve the exact combined cut; one author freezes the repaired generation, then coordinator reruns focused Nitro type/lint/format and independent exact-source rereview. No installation, root/route/studio/projection/read/source-export, server/transport/native/runtime/FS/data permission.
