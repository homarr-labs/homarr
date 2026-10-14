# AW2 — completion-keyed retention fix frozen

Applied only the approved two-line amendment in `apps/backend/src/server/runtime-composition/native-main-persistence.ts`:

```ts
const fixedRecords = new WeakMap<Promise<unknown>, FixedTaskRecord>();
fixedRecords.set(completion.promise, entry);
```

The ordinary source search confirmed only those two `fixedRecords` references, with no iteration consumer. Every other producer, adapter, schema, export and body remains unchanged; earlier handoffs are preserved.

The independent MAIN review's P2 owner-lifetime strong-retention finding is addressed at source level: records now follow the actual completion key's reachability rather than an indefinitely strong owner Set. Settlement does not delete the acknowledgment record. The strong pending `fixedTasks` Set still retains actual work through settlement, and Auth's association retains its forwarded completion through request cleanup. Prepublication, actual promise/value/error/ambiguity recording, acknowledgment-before-consumer-fault ordering and physical drain behavior are unchanged. Disposed request cycles may become collectible without adding a getter, export, context field, counter or framework.

This report and those two source lines are the only writes. No commands, checks, tests, native/SQL execution, import evaluation, environment/data/secrets or nested agents were used. The supplied fresh-check results and scoped Auth/API ACCEPT are coordinator premises, not results reproduced here. Independent review and fresh focused checks remain coordinator work after this freeze; no MAIN acceptance or validation PASS is claimed.

The sources remain unmounted. K physical source/whole-target schema authentication, D provenance, Auth HTTP publication/cookies, all-enabled writer closure, PostgreSQL writes, private SSR/UI, normal startup, enrollment and activation holds remain unchanged. Generic COMMIT/plain credential DELETE gain no authority; recorded fulfillment is not client receipt or retry permission.
