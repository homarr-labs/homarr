# CORE DB — exact URL control-character fence repair

Fresh frozen-source checks at `nitro-onboarding-core-db-checks-z_5vtwtq`: 25/25 types and DB3 formatting pass; lint rejects the intentional control-character regex at `runtime-onboarding-read.ts:150`. Warning-only diagnostics do not authorize unrelated cleanup.

Prospective sole file `packages/db/runtime-onboarding-read.ts`: preserve bounded `text(input, 4096, 4096)`, nonempty and exact trim checks. Replace only `/[\u0000-\u0020\u007f]/u.test(value)` with a bounded loop over the already-admitted string, rejecting when the character's first code unit is <=32 or exactly127. Keep the original unavailable result, URL parsing, credentials/query/fragment/origin rules and returned value unchanged.

ASCII controls/space/DEL have the same first code unit under string iteration; non-ASCII characters, surrogate pairs and every other URL rule retain their behavior. No allocated character array, regex suppression, dependency, comment, test, clock or policy change. No new helper file or broad `.sort()`/shadow-warning cleanup.

Both CORE source reviews must finish and any findings reconcile before authoring. Reviewers approve the combined minimal cut; sole-file author captures a new freeze/protected joins, then fresh owning/direct-consumer types and DB3 lint/format plus source rereview. This lint correction does not prove native execution, authorization, projection publication or runtime success.
