# 119 — Application operations CLI

## What to build
Deliver executable offline application administration/integration/password/admin-recovery commands using actual domain services, deliberate target syntax, safe configuration/resource lifecycle and meaningful operator outcomes without an HTTP server.

## Blocked by
- #01 — Runnable Nitro foundation and request-isolated SSR

## Status
ready-for-agent — triage only. Dispatch requires completed native blockers, accepted exact interface revisions, settled applicable decisions and exclusive file allocation; none is accepted by this publication.

## Coverage
Primary OPS-10. Source capability families users list/delete/update-password, integrations list/delete, reset-password, fix-usernames, recreate-admin; selection/flags/help/output/exit behavior. Commands may change spelling; an explicit operator capability mapping replaces obsolete syntax, not a mandatory legacy bridge. Own application CLI command entry/dispatch/adapters; #13 supplies credential/user/recovery algorithms, #41 offline integration services, #02 both-engine persistence. #21 ships executable/native resources and owns harness/local-harness lazy dispatch/Go developer-tool launch transferred from OPS-11. No HTTP procedure, UI page or new harness ticket is invented.

## Required contracts
Initially unaccepted: #13 operator credential hashing/provider restrictions/admin recovery/session consequences; #41 offline list/delete services; #02 open/transaction/reference/error/close for converted SQLite/PostgreSQL; #04 crypto/operator authority; #21 executable artifact/env/native/exit and lazy harness-dispatch interface. Exact service revisions permit start before entire auth/management/package peers finish.

## Decision holds
Q11/Q12 concrete DB/conversion/runtime adapter; Q15 credential/session continuity and deliberate API-key/last-admin/external-provider recovery consequences. CLI-native packaging/version evidence remains required. Destructive commands are future disposable acceptance scenarios, not real-installation authorization.

## Ownership
Own only application-domain CLI entry and command consumers, transferring offline entry from #13 without duplicating credential algorithms. #21 alone publishes executable and harness/Go launch; COMPOSITION owns manifests/exports/lock/container. Real packaged offline invocation and durable recovery are production joins, not a #21 start blocker; #125 is final convergence.

## Acceptance criteria
- [ ] Every named administration/integration/recovery capability has deliberate target help/selection/output/exit mapping and executes through actual services on authorized disposable converted data without HTTP startup or browser dependencies.
- [ ] Password/reset/admin recovery uses #13 hashing/provider restrictions and approved session/API-key consequences; denied external-user mutation and last-admin cases return typed safe failures rather than guessed side effects or fake success.
- [ ] User/integration deletion and username fixes honor canonical references/transactions and durable reload; list/error output contains no plaintext credentials, keys, ciphertext or sensitive stored fields.
- [ ] Entry initializes only required DB/env/crypto resources and closes them on failure/success; #21's harness-only dispatch avoids eager production DB initialization and packaged entry/native/migration paths invoke these commands correctly.
- [ ] Focused future representative offline recovery/revocation, denied provider mutation, failed durable command and packaged artifact invocation regressions use disposable installations, not real appdata or broad CLI/E2E suites.
