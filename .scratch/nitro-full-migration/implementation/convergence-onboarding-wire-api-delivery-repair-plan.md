# API publication delivery — one-file repair plan

## Boundary

Change only `packages/api/src/nitro/assembly/onboarding-writes.ts`, frozen SHA256 `f5c76172036108faa595006aabf54c2ed40ee0f2399b8b9773241e17a7628343`. Joint security/SDK provenance is source-accepted; fresh9 dependency typechecks, lint and formatting passed at `TEMP/nitro-onboarding-wire-api-source-checks-t6qdcurx`. Lifecycle source acceptance remains held on the reported close-versus-delivery race, not a failed runtime reproduction.

The source-established adverse timeline is close during an awaited handler, followed by error encoding and finite-publication handoff. Executed red/green reproduction and regression phases are explicitly deferred: genuine MAIN/controller publication enrollment is not assembled or runtime-released, and no new tests were requested. Source review/type checks cannot claim that those runtime phases passed.

## Exact cut

Immediately after obtaining the genuine finite publication read, and before assigning `responseOwner = "delivered"`, check the controller's own `record.stop.signal` and require `record.phase === "running"`. Use the existing stop signal's abort throw and `rejectWire` phase failure. No await or caller callback belongs between those checks and the delivery assignment/return.

Do not call `checkWorking` here: it rejects normal retirement. Do not check the composed Auth work signal, which ordinary successful retirement aborts. The local controller stop signal stays live for normal retirement and aborts synchronously when `closeAsync` enters closing.

If close begins while execution awaits a guard, handler, error encoder or finite response registration, the final check throws into the existing execution catch. The actual publication remains Auth-owned, not delivered; that catch awaits `retireBeforeError` and genuine `settleProductionOnboardingPublicationAsync(...abandoned...)` before the execution task settles. Close continues draining those actual tasks. Native acknowledgement, first primary and distinct cleanup outcomes keep their existing ownership; no replacement publication, resend or new cleanup path is needed.

If delivery wins synchronously before close starts, the existing delivered result belongs to C–D. This repair does not revoke a completed handoff or claim physical publication occurred. C–F/MAIN context birth, enrollment and actual publisher remain separate holds.

## Gates

Original lifecycle reviewer approves this plan before the sole-file writer. Preserve old source/check evidence; capture a new before/after/diff and protected siblings/Auth/DB joins. Then rerun focused API/Backend/Nitro types and API source lint/format, and independently rereview this exact cut. No new tests, comments, casts, helper files, dependencies, API signatures, shared Auth/DB edits or runtime/fixture/FS permissions.
