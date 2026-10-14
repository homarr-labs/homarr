# Terminal capture through the existing foreground shell parent

## Practical decision

**Yes: a literal reviewed zsh foreground conditional can supply actual owner-terminal status in captured text. Hidden normal-exit0 metadata and association with an installed OpenCode binary need not be essential for this ordinary synthetic attempt.** Keep the existing shell parent alive, run the exact accepted Python owner once, capture its status immediately, then emit one small uniquely labelled terminal record. This uses the already advertised `functions.shell` primitive, not another launcher, helper, control or framework.

This alternative supersedes the essential-operator-block recommendation in `convergence-runtime-unblock-plan.md` sections “The one essential interface request” and next-step1, and replaces next-step4's shell `exec` recommendation. It does not qualify the consumed control or grant invocation authority. The supported interface basis is this tool's actual description—macOS/zsh, execute command and return output, finite requested foreground timeout—plus ordinary documented zsh wait/status semantics. Opaque tool implementation association remains unknown and is not relabelled measured.

**Report only.** Only this new Markdown file is written. No command, check, hash, source evaluation/import, process/control fixture, compiler, SQL, Engine/container/network service or native attempt ran. No private configuration/environment/history/data/credential reads or nested agents. Primary public manuals and the narrowly relevant accepted source portions were read. Context7 quota remains held without retry.

## Primary supported contracts

- Official zsh [Shell Grammar6.1](https://zsh.sourceforge.io/Doc/Release/Shell-Grammar.html#Simple-Commands-_0026-Pipelines): a sublist terminated by newline or semicolon is waited for before the next sublist runs; `&`, `&|` and `&!` instead background it. A simple command's value is its exit status, or128 plus the signal number when terminated by a signal. [Grammar6.3](https://zsh.sourceforge.io/Doc/Release/Shell-Grammar.html#Complex-Commands) defines the ordinary `if` branch from the condition's actual status.
- Official zsh [Parameters15.5](https://zsh.sourceforge.io/Doc/Release/Parameters.html#Parameters-Set-By-The-Shell): `$?` is the last command's returned status; `status` is a read-only special parameter. Use a distinct ordinary variable, not an assignment to `status`.
- Official zsh [builtin commands](https://zsh.sourceforge.io/Doc/Release/Shell-Builtin-Commands.html): `builtin` selects a builtin; `printf` formats its supplied arguments, with `%d` and newline supported; `exit n` exits with the specified status; `emulate -R zsh` resets ordinary settable options. No external formatter is necessary.
- POSIX Issue8 [env](https://pubs.opengroup.org/onlinepubs/9799919799/utilities/env.html): `-i` ignores inherited environment and invokes the named utility with explicit entries; with a utility operand env does not print its environment; its status is the invoked utility's status, or an env/invocation error. Thus the sole absolute env/Python command is status-associated under the supported contract. A launch error does not prove Python ran.

These are ordinary supported contracts, not measured local zsh/env versions, proof against a compromised shell, or an all-faults finite kernel theorem. The fetched zsh manual identifies5.9.2; no local version command was run. Do not infer a deployed-version measurement from that documentation.

## Exact script concept for later envelope review

The concept is deliberately **not a materialized/released command**. Future preparation must replace all angle-bracket placeholders with reviewed literals before approval; no placeholder is callable authority. There is one external foreground command and one terminal-record emission:

```text
builtin emulate -R zsh
if command /usr/bin/env -i \
  PATH=/usr/bin:/bin \
  HOME='<fixed caller-stage>/control/home' \
  TMPDIR='<fixed caller-stage>/control/tmp' \
  NITRO_NATIVE_CALLER_ROOT_POLICY='<exact separately approved bounded JSON>' \
  '<reviewed canonical existing Python executable>' -I -S -B \
  '/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/nitro-native-runtime-caller-o_s9lpod/author/own-supervisor.py'
then
  nitro_terminal_rc=0
else
  nitro_terminal_rc=$?
fi
builtin printf 'NITRO_TERMINAL_<approved literal nonce> {"version":1,"shellPid":%d,"status":%d}\n' "$$" "$nitro_terminal_rc"
builtin exit "$nitro_terminal_rc"
```

`<fixed caller-stage>` is exactly `TEMP/nitro-native-runtime-caller-o_s9lpod`, with TEMP as defined in the preceding plan. The Python executable must match the future index's sealed existing-tool binding; the example does not choose or remeasure it. The entry has no extra application/worker arguments. `functions.shell` uses that fixed caller stage as `workdir`, `background:false`, requested timeout35000ms. Its stdout must remain a pipe/socket: Python841–849 rejects regular-file output. No file redirection, pipeline, command substitution, `eval`, loop, trap, background job, `wait` loop, observer or second interpreter is added.

The zero branch records exactly the successful conditional result. The failure branch's **first operation** captures `$?`; no intervening printf, test or assignment may overwrite it. The terminal printf is shared by both branches and occurs once. The shell exits with the captured status rather than letting printf success mask owner failure. The parent is deliberately not replaced with `exec`; its trailing builtin action also prevents a last-external-command exec optimization from removing the observer parent.

The reviewed concrete envelope must retain normal zsh evaluation with no status-changing aliases/traps/functions or xtrace output. `emulate` is option normalization, not proof that private startup files were never loaded or a mechanism for cleaning arbitrary malicious traps. No private startup inspection is proposed. Failure to establish the ordinary shell contract, or unexpected diagnostic/protocol output, is UNKNOWN, not permission to start another shell framework.

The nonce is a bounded coordinator-selected literal association label, not a secret, capability, approval or cryptographic signature. Bind its exact marker spelling and the complete command text to the released attempt/index. Do not pass the marker through the owner's bootstrap JSON or clean environment. No native permission is derived by parsing stdout in the shell.

## What the accepted source actually lets the oracle conclude

Python source facts, retained acceptance unchanged:

-70–116: the root-policy schema has exactly the nine existing fields; `runnerFinalFailureBoundaryReviewed` is checked as true but supplies no implementation or guarantee by itself.
-119–147,1040–1051: original wall/monotonic roots and stricter remaining clock are retained. The terminal shell does not refresh them, derive a new owner budget, or change host/caller/child deadlines.
-841–864: the only owner stdout record is `NITRO_CALLER_OWNER_RESULT` plus bounded JSON/newline,≤65536 bytes. Nonblocking writes and final clock check occur under the original owner cap.
-991–1032: `candidate-clean` requires five genuinely settled exit0/EOF tasks, no force/fault and a valid actual caller return. After emission the owner checks its clock again; emission/check failure makes its returned code nonzero even if an earlier frame said candidate-clean. Selector close and ordinary process exit follow.
-1055–1060: main exceptions return1, and the actual code is passed to `sys.exit`. Parent terminal status catches a post-frame failure, including unsuccessful shutdown, instead of trusting the owner's pre-exit claim alone.

A received complete owner record followed by the unique parent record with status0 therefore joins **source-checked candidate work/frame emission** to **actual foreground command termination with status0** under the ordinary shell/env contract. It is not an owner self-assertion of exit. No extra PID birth/absence control is needed to associate the sole command in that exact literal envelope.

The accepted owner does not relay child/worker raw stdout to the tool; it emits only its JSON frame. Host/child return material is nested JSON, with strings escaped rather than raw newlines. The parent-marker literal is absent from the existing owner output mechanism and is not passed as an input. Under reviewed-source ownership it cannot become a second top-level terminal line through a native child's bounded result. A duplicate/lookalike/embedded marker never passes the oracle. This is source/protocol separation, not security against compromised processes or a dishonest tool provider.

Status is an observed numeric **shell status**, not an invented signal observation. Values128+ are retained exactly and classified non-success; without separate evidence do not name a signal or distinguish an explicit high exit code from signal termination.126/127 or missing owner frame are launch/association failures, not proof of an executed owner.

## Complete-protocol oracle, prepared before invocation

Review the oracle as a finite read-only result reconciliation, not a new executable verifier/helper. On the sole tool result:

1. Require the exact approved invocation, foreground disposition and no tool-reported timeout, cancellation, backgrounding, truncation or capture-loss notice. Absence of hidden normal-exit metadata is permitted; explicit contradictory metadata is not ignored.
2. Require the **entire captured command-output protocol**, not a grep-selected tail: exactly one complete owner JSON line then exactly one parent terminal JSON line, final newline and no additional command-output bytes. Owner line≤65536 bytes; terminal line≤512 bytes; total≤66048 bytes and exactly two protocol lines. Any tool wrapper notices must be recognized as wrappers, never parsed as command-output authority. If the tool shortens a larger valid frame, accept no extracted substitute—UNKNOWN.
3. Validate JSON strictly, including duplicate-key rejection, fixed schemas, attempt/owner/index/root bindings, the exact literal nonce, positive integer shell PID and numeric status0. The parent shell PID is not the owner PID; no equality is invented. The sole exact command and complete owner bindings establish association.
4. Require the existing owner candidate-clean/no-primary/no-fault/no-force, five exit0/reaped/EOF/physical-close task facts, unchanged original-root policy and valid nested caller/host result. Require actual child K/readiness→epoch→empty-D, physical close, original accepted START/wait and same-ID exited/Pid0 closure, no retried action and no context removal. A parent0 marker by itself grants nothing.
5. Check recorded original-bound failures and final returned outcomes. Any late, invalid, incomplete, nonzero, contradictory or missing record consumes/quarantines the attempt. A candidate-clean frame followed by parent1 is explicitly not PASS. A parent0 without the full bound/closure frame is not PASS.

Completeness here means the complete expected source-defined protocol delivered by the documented tool, not proof that a transport could never drop arbitrary unrelated bytes. In a clean run the bounded owner frame is the only expected owner output and its mandatory nested task/return fields must all survive. Unknown tail truncation thresholds can reduce the chance of obtaining a complete result; they cannot authorize a partial-frame PASS or justify another run.

One source-specific limitation: Python's `os.set_blocking(1,False)` can also affect the parent's shared stdout open-file description. The small builtin printf is **not** guaranteed to complete under backpressure. A missing/partial terminal marker stays UNKNOWN; do not add output retry, another capture helper or claim that a small write must succeed. The received whole marker proves those bytes were captured, not universal write availability.

## Time and failure scope—do not inflate the marker

The marker proves foreground termination/status; it contains no timestamp and proves neither exact physical exit/capture before the owner's30s deadline nor whole API return latency. Python's final original-root checks bound its work/frame emission; ordinary exit occurs afterward. Nominal35s foreground timeout is a separate external operational cutoff covering startup/exit/capture, not a refreshed native allowance or a guaranteed transport-return time. The parent's own final exit is likewise not proven merely by its preceding marker; the documented command-return interface is the supported ordinary completion basis.

**Recommended review scope:** accept source-checked original30s work/emission, actual parent-wait terminal status, complete protocol captured through the declared finite foreground operation, and UNKNOWN/quarantine when any boundary is lost. Do not call this a measured30s physical-exit or35s transport-latency proof. No operator guarantee is essential to that deliberately narrower ordinary experiment. If a reviewer insists on independently timestamped physical owner exit/capture against the exact original wall/monotonic deadline, this marker does not supply it; keep that stronger claim held rather than quietly synthesizing a timestamp or clock proof.

Parent wait is only for the sole foreground command, not a reap of Python's separately sessioned workers or the daemon-owned container. Actual source-checked clean task closure is still necessary. Timeout/owner death can leave worker/file/native/START disposition UNKNOWN. Retain the existing once-only owned group/context force policies under future explicit approval; shell adds no signal, cleanup or retry. The existing consumed control's late/inconclusive result remains unchanged.

## Minimal policy joins and next release

Python115's `runnerFinalFailureBoundaryReviewed`, the index's runner-boundary/caller-capture authorities and review reference, and host299–307's independent-owner assertions must refer to **this reviewed parent-wait/complete-protocol/UNKNOWN policy**, not a claim that all new sessions are reaped by an opaque tool. Source constants or a proposed nonce never grant approval. Host272's legacy namespace-field issue remains in the separate preceding plan; this proposal does not alter namespace predicates.

No owner/caller/host code change is required if independent review accepts that exact boundary meaning and the existing provisional/publication labels as ordinary operation plus parent-terminal reconciliation. If an existing policy interpretation genuinely requires hidden tool metadata or guaranteed all-session reaping, reject that interpretation. The only contingent source scope is a narrowly reviewed policy-leaf rename, for example `runnerFinalFailureBoundaryReviewed`→`foregroundTerminalProtocolReviewed`, at the strict schema/check and future matching bootstrap/index policy—not changed clocks, task bodies or native checks. Such an edit needs a separate source lease/freeze/review/focused checks. It is not performed or necessary by default.

Next: independently review this oracle/semantic scope; approve candidate resource/time/UNKNOWN policy; separately materialize the frozen child+exact103 assets at unused fixed input/output roots with private modes and exclusive writer lease; prepare and review the concrete literal envelope/index; then separately release one new empty-memory initialization and the existing one-CREATE/one-START/once-force authorities. Reconcile its returned result immediately using this prepared oracle. **No operator metadata campaign and no second control are prerequisites to this alternative.** All current native permissions remain false until that release.

The20/22/30 host and18/23/30 outer candidates still do not enforce `delta+r<1s` force room; checkpoint admission still closes at18s. UNKNOWN failure policy may accept those risks, but no nominal budget is a success guarantee. Fresh synthetic memory only: no real installation, credentials, ports3100/3200, protected fixtures/output, restore, app boot or cutover. Backend/frontend/type-visibility lanes remain separate and untouched.
