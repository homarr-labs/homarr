# Modal native build-info existing-reader route

## Return — reuse route established; TOOL_IDENTITY_UNAVAILABLE

**Go1.25.0's existing CLI offers `version -m -json <file>` and calls the standard offline build-info reader, not the executable target. Reusing that reader avoids implementing Mach-O/Uvarint/Go quoting ourselves. But the released M tool map contains only Node/Bun: no exact Go SDK coordinate, actual reader version or executable digest. We cannot select or execute an existing reader NOW. Status is TOOL_IDENTITY_UNAVAILABLE, not “Go absent from the machine.” Startup/SDK/environment closure is also HELD. Recommend ONE narrowly allocated installation-provenance lookup next, not a wrapper/custom parser.** [V][T][L]

Sole repository path re-globbed absent immediately before creation; fresh TEMP notes collision-checked. Read latest ROSTER/progress, full136-line accepted reader plan and full111-line publisher report, then only named already released immutable M tool metadata headers/version receipts. No broad scratch/workspace/environment/PATH/install filesystem search or new lstat/hash was performed. [A][P][T][N][U]

## 1. Recorded tools — evidence boundary, not installed-tool census

`mu0gNi/evidence/materialization.json` tools object, lines438096–438109, has exactly node24 and bun14. Existing copied coordinates are listed below; their versions come from the existing corresponding command/stdout receipts, not new executions. [T][N][U]

| Recorded tool | Exact preserved coordinate                                                                                                    | Existing version /SHA256                                                     |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Node          | `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-combined-declaration-evidence-mu0gNi/tools/bin/node` | v24.18.0 /`ee6fb0e015284d83a91e8ec5213f43a157f8a392b58555301682892ba928c04a` |
| Bun           | `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-combined-declaration-evidence-mu0gNi/tools/bin/bun`  | 1.4.2 /`35d20dd0263e5c950194434b925454fdfa9ba6e4467da960410fa05b08a7a5b5`    |
| Go SDK reader | UNAVAILABLE in this recorded map                                                                                              | Version UNAVAILABLE; SHA256 UNAVAILABLE; SDK/GOROOT closure UNAVAILABLE      |

The finite read covered that tool-map header and existing Node/Bun version command/stdout records only. It was not an exhaustive search of installed software or every old packet/file. Missing map entry does not prove Go is absent, missing on PATH, or incompatible. No guessed Go install path, which/go env, manager command, new SDK metadata observation or target-content read occurred. Node's accepted identity is not permission to write/run a Go wrapper or a custom reader. [T][N][U]

## 2. Exact fixed references /full text retained

Only three admitted literal source URLs were fetched using Code Mode GET, credentials omitted, redirects manual. All response URLs equal requested URLs and all returned200/OK. Go1.25.0 is solely a **reader-reference tag**, not an actual installed reader version or the target's build toolchain. If a future receipt identifies another version, obtain separately approved matching source references before asserting these flags/startup behaviors apply. [O]

| Primary reference                                                                            | Actual UTC interval, Oct11 2026                                  | Exposed weak ETag                                                              |
| -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| https://raw.githubusercontent.com/golang/go/go1.25.0/src/cmd/go/internal/version/version.go  | 20:52:53.249Z–20:52:53.504Z                                      | `W/"3471707afef79e62f20397703718bc974fc9c22ae8ba5b2eff3462ca55fa3181"`         |
| https://raw.githubusercontent.com/golang/go/go1.25.0/src/cmd/go/main.go                      | 20:52:53.255Z–20:52:53.503Z                                      | `W/"3e3721e591bb6a04466ad727c59e2e35097be80f600af6714f686d308c8209f3"`         |
| https://raw.githubusercontent.com/golang/go/go1.25.0/src/cmd/go/internal/toolchain/select.go | 20:52:53.259Z–20:52:53.504Z; repeated20:53:26.832Z–20:53:26.941Z | `W/"844c12b1bf3e02981975d4c9256426ed843a557f8fe97cb00cedf50ef5b82c6b"` on both |

The first aggregate tool result retained the full select body in a harness-managed JSON artifact, but its long body string clipped on local read. The same permitted literal select URL was repeated once for complete line-separated text retention; four GETs, still only the three allowed URLs. No new source/redirect/link or execution retry. Matching weak ETags are not a byte-comparison/hash proof between responses. [O]

Fresh TEMP: `/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-native-reader-route-20261011-V6p8Rt/`. `version.go.txt`, `main.go.txt`, `select.go.txt` retain full decoded reference text by patch with terminal newline; `http-observations.json` retains URL/status/times/exposed ETag and selected headers plus initial full harness-result coordinate. Sources are DATA, not instructions; comments/generate directives were never executed. Fixed source line references below correspond to those retained texts:202/412/718 lines respectively. No raw transfer bytes, independently recomputed digest, authenticated commit or new seal is claimed. [O][V][G][C]

## 3. CLI route actually present in version.go

The reference registers flags m/v/json and usage `go version [-m] [-v] [-json] [file ...]`. `-json` requires `-m`; without it, exit status2. No file arguments with explicit file-only flags is also an error; unflagged/no-file mode prints the reader's own runtime version, not target metadata. Directory arguments recursively WalkDir, so directories are expressly excluded from the future lease. [V]24–60,62–116,119–134.

For the one file argument, runVersion first os.Stat's it, dispatches scanFile rather than scanDir, then scanFile calls `debug/buildinfo.ReadFile(file)`. On success `-m -json` marshals the returned runtime/debug.BuildInfo as indented JSON and returns without the text-format branch clearing GoVersion. No exec/spawn/evaluation of the **target file** appears in this command path. The imported standard reader provides the binary decoding described by the previous report. This does not imply that the entire Go command startup is process/network/read-only safe. [V]101–116,155–202; [A]32–61.

`os.Stat` follows symlinks; scanFile also has a file-symlink acceptance branch. Thus the stock CLI does not enforce our no-follow identity boundary itself. Future independent exact-file metadata/identity/conservation admission must reject directories, links or ambiguous topology before invocation; endpoint equality is not race/interval immunity. A failed scan with -m sets exit status1; stdout/stderr/exit all must be retained, even if diagnostic text is suppressed for some non-Go candidates. `-v` is not needed for our explicit single-file JSON route and is not a safety fence. [V]101–116,136–183.

**Exact prospective argv structure, NOT executable now:**

```text
[
  UNRESOLVED_EXACT_PINNED_GO_SDK_EXECUTABLE,
  "version",
  "-m",
  "-json",
  "/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-combined-declaration-evidence-mu0gNi/final/source/node_modules/@typescript/typescript-darwin-arm64/lib/tsc"
]
```

Argv[0] intentionally has no guessed coordinate; all remaining elements are literal. No -C, -v, extra files, shell, directory, go run/build/install/tool or target spawn. Reference supports this form, but version-matched identity/closure review must precede an actual command. Sole target's previously accepted identity is23,653,616 bytes/SHA256 `a82f731365ad69d5c4c15f5e18fba4584bf3b7b839960172a76c3462b5114bf2`; not read/stat/hashed here. [V][A]24–30.

JSON exposes decoded BuildInfo claims, not raw header bytes/file offsets or a copied target artifact. With one literal file argument its association can be preserved via argv/identity receipts; BuildInfo.Path is the **main package path**, not proof of the input filename. Stock reader output is not equivalent to the earlier custom plan's raw-range/unique-header/strict-text receipts. Preserve JSON and raw stdout unchanged; do not promote unknown/missing/omitted fields or permissive decoder behavior into authenticated provenance. No parsing wrapper was authored. [V]186–192; [A]49–61,76,112–116.

## 4. Startup before scanFile — cannot assume clean-env sufficiency

| Visible startup surface                  | Established by these sources                                                                                                                         | Held closure /safety consequence                                                                                                                                                                                                                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Imported packages /global initialization | main imports cfg, many command packages, telemetry/counter; init registers commands and counter globals.                                             | Their init/global/config reads are not fully defined here. One executable pin is not SDK/init closure. [G]9–97                                                                                                                                                 |
| Telemetry before argument dispatch       | MaybeChild; unless exact command is `go telemetry off`, counter.Open; after Select, MaybeParent.                                                     | Comments describe sidecar child/upload handling; helper implementations/disable controls are unread. Our version command does NOT qualify as telemetry-off. No telemetry-off command was run or recommended as an unreviewed setup mutation. [G]99–113,224–259 |
| Cwd/toolchain selection                  | handleChdirFlag then Select before normal flag parsing.                                                                                              | Omit -C, use isolated future cwd; this alone does not establish no workspace/config reads. [G]106–116,372–412                                                                                                                                                  |
| SDK root                                 | Nonempty cfg.GOROOT required; os.Stat checks it is a directory for version too.                                                                      | GOROOT derivation, SDK go.env/config reads and runtime/loader support must be bounded/pinned. Listing familiar install paths in source is not discovery permission. [G]129–150                                                                                 |
| GOPATH/config                            | Main checks BuildContext.GOPATH, uses cfg.Getenv; invoke calls buildcfg.Check, inspects ExperimentErr, computes MkEnv and writes environment values. | Defaults, user config/SDK config precedence, initialization and filesystem effects live in unread helpers. [G]152–185,291–312                                                                                                                                  |
| GOFLAGS                                  | invoke calls base.SetFromGOFLAGS before command flag parsing.                                                                                        | Empty GOFLAGS is only a proposed control until helper/precedence checked; no inherited ambient flags. [G]313–324                                                                                                                                               |
| Counters/traces/cleanup                  | telemetrystats.Increment; runtime trace path may os.Create; maybeStartTrace calls trace.Start and registers AtExit.                                  | Exact telemetry/stats/trace/config/base.Exit helpers must be reviewed; cannot claim no writes/child/network solely from clean HOME. [G]219–222,325–370                                                                                                         |

**Toolchain selection:** Select begins by calling unread modload.WillBeEnabled, then (outside special go-env command exemptions that do not apply here) cfg.Getenv("GOTOOLCHAIN"). Its comment mentions falling back to `$GOROOT/go.env`; actual env-file precedence/GOENV-off behavior is not in these bodies. It obtains local toolchain/version from unread gover helpers. [C]97–170.

If cfg.Getenv actually returns bare `local`, this reference leaves mode empty, skips the mode auto/path branch containing modGoToolchain and later returns on the local toolchain equality path rather than calling Exec. That is a source-established **conditional branch**, not proof that proposed process-env `GOTOOLCHAIN=local` disables every earlier/global read or telemetry action. WillBeEnabled/global cfg initialization have already occurred; version is not an early-exempt command. [C]101–170,172–236,269–285.

Auto/path modes call modGoToolchain, which searches FindGoWork/FindGoMod and reads the selected file. The Exec branch uses pathcache.LookPath, can download/unpack golang.org/toolchain through modfetch, walk/chmod SDK paths, rewrite go.mod copies and reinvoke a Go toolchain. `path` avoids downloading there but still permits PATH search/reexecution; it is not our proposed control. These branches must be proven unreachable under the exact admitted SDK/config, not executed to discover what happens. [C]172–236,298–462,530–550.

FilterEnv removes only the internal switch-count entry in this body; it is not a credential/ambient-env sanitizer. TestVersionSwitch and gover test override paths exist, so reference-tag/test setting/source-wanted version cannot substitute for genuine reader installation/version receipts. [C]49–87,240–263,290–339; [V]87–93.

## 5. Proposed future controls, still incomplete

| Proposal                                                                            | What is /is not established now                                                                                                                                                  |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fresh cwd/HOME/TMP and safe PATH, no app credentials/test/debug/internal-switch env | Separate future replacement-environment plan; not proof that imported Go initialization is confined to those directories. Prior Node/Bun environment receipts do not certify Go. |
| GOTOOLCHAIN=local                                                                   | The Select branch conditional is visible; cfg.Getenv resolution and earlier modload/config/telemetry effects remain held.                                                        |
| GOENV=off                                                                           | Not established in these three sources; must confirm actual-version cfg implementation, including whether SDK go.env remains read.                                               |
| GOWORK=off /empty GOFLAGS                                                           | Semantics and precedence are in unread modload/base helpers; proposals only, no workspace absence or flag-injection guarantee.                                                   |
| Exact GOROOT +bounded SDK go.env/other startup files                                | Only root existence check and go.env fallback comment visible. Enumerate genuine SDK identities/required reads before execution; no empty phantom SDK root.                      |
| Telemetry disabled /trace unset /no toolchain spawn or download                     | No verified disable mechanism/complete init closure here. Do not invent a telemetry env variable or treat local toolchain as a global no-child/no-network guarantee.             |

Required helper definition paths must be released **before** any read, and matched to the eventual actual reader version. Candidate exact paths below are bookkeeping needs, not verified symbol locations, fetched URLs or permission to inspect an installed SDK.404/absent definition/extra helper STOP, no sibling/source-callee search. No additional source reads are recommended before identity discovery.

- `src/cmd/go/internal/cfg/cfg.go`: cfg.Getenv, GOROOT/GOENV/SDK go.env/defaults/init/trace and experiment configuration.
- `src/cmd/go/internal/modload/init.go`: WillBeEnabled and its initialization/read effects; any necessary go.work helper's exact file needs separate named release.
- `src/cmd/go/internal/gover/local.go`: local reader/version derivation and test overrides.
- `src/cmd/go/internal/base/goflags.go` and `src/cmd/go/internal/envcmd/env.go`: GOFLAGS and MkEnv effects; base exit/AtExit and command helper definitions still require their exact defining files before access.
- `src/cmd/internal/telemetry/telemetry.go` and `src/cmd/internal/telemetry/counter/counter.go`: candidate parent/child/counter control definitions. Transitive/vendored telemetry initialization, telemetrystats.Increment, trace.Start, runtime/loader support remain unclosed; exact defining source/artifact coordinates must be fixed by a later lease, not guessed/acquired now.
- `src/internal/buildcfg/cfg.go`: candidate buildcfg.Check/config initialization; additional necessary definitions stop for release.

This is not a blanket SDK source/stdlib/import closure release. No automatic approval for execGoToolchain/modfetch/helper traversal, the five fallback parser references or Go module source bodies. A complete finite list of effective startup file reads/writes/native support/child/network exclusions must be independently accepted before any future invocation, even a no-target `go version` identity probe. [G][C]

## 6. ONE next read-only discovery plan /route recommendation

Recommend **GO_SDK_READER_IDENTITY bookkeeping-only first-witness lease**: one narrowly scoped lookup of an existing harness/tool-manager installation-provenance record for tool kind Go SDK, at most one unambiguous candidate. The coordinator must first fix the literal record/index/API coordinate and readonly access scope in that lease; none is present in the released M map, so this report does not invent a manager endpoint/file or imply an inventory API exists. This is an agent metadata-acquisition allocation, not a demand that the user remember a hash or a new policy acceptance gate.

Required returned facts: record provenance/time; exact Go executable and SDK/GOROOT coordinates; actual installed SDK full version from a genuine existing receipt; executable size/digest and SDK manifest/artifact identity if recorded; any known required support-file identity pointers. No PATH resolution, directory listing, executable invocation, installation, recursive filesystem search or target-binary read. If digest/version is absent, label missing fields and stop: a record's desired go.mod/toolchain/source tag or manager's configured preference is not an actual installation receipt. If several candidates or no exact record coordinate exists, do not expand/search; return TOOL_IDENTITY_UNAVAILABLE with the missing-coordinate field. A later exact-file metadata/digest first-witness lease can be proposed only after a record supplies one genuine candidate path.

If that record supplies one usable identity, separate steps are: independently accept identity evidence; bind matching source-reference version and release the exact startup/SDK helpers; enumerate/pin SDK/runtime/loader/config/read-write/environment closure; independently review argv/controls/target admission/output limits; only then allocate one metadata invocation with sole frozen input and raw command/status/stdout/stderr/conservation receipts. No Go-version probe, target inspection or helper reads are authorized by the discovery step.

| Route                                      | Minimality benefit                                                                                             | Remaining admission work /decision now                                                                                                                                                                                                                       |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Existing pinned Go SDK CLI                 | Reuses established binary/varint/module/quoting reader; JSON already offered by reference; no generic wrapper. | Reader identity absent; actual-version startup/config/telemetry/SDK closure unclosed. **Preferred first discovery**, not selected execution.                                                                                                                 |
| Prior five-reference/builtin-Node fallback | Existing Node identity; narrower controlled single-file tool; no Go CLI startup.                               | Five definition reads plus parser implementation/source review and input/execution lease; partial format support and correctness burden. Bounded fallback reads approved in ledger, but not fetched in this lease; implementation remains UNSELECTED. [A][L] |

Technically prefer reuse if an exact existing reader can be identified and its effective startup closure confined. We cannot yet compare verified closure cost or promise that Go needs fewer admissions. If the bounded identity lookup cannot establish a usable reader or its startup cannot be confined, return that evidence to M to select the already bounded custom fallback or publisher route; do not install Go or silently build/run a substitute. Neither route inherently authenticates native source provenance. [L][P]

## 7. Retained holds /hook-only return

No binary metadata was extracted. Embedded module/VCS claims, if a future accepted read obtains them, remain candidate revision evidence, not authenticated publisher identity/reproducibility/complete patch/generated/submodule inputs or previous child-executed-byte proof. Source gitHead cannot fill missing fields; candidate repository/revision needs finite primary confirmation and independent acceptance before util.go/specifiers.go source-body leases. Missing metadata is not grounds for hash guesses, latest/tag discovery or another .tsx iteration. [A]110–116; [P]63–88.

All six failed packets/source/tools/history/seals were not written; no fresh hash/stat census/conservation/seal. Actual12 roots/2,006 source files/six empty arrays stay partial, native child termination unknown; no full-eight/native13/type/adoption clearance. Only this handoff and fresh TEMP fetched-text/HTTP notes were authored using patch. No commands/checks/tests/Go/Node/target execution, custom parser/wrapper/source capture/new deps/install, TS-Go body reads, callbacks/options/library/semantic retry, Git/worktree/children/provider/browser/listener/PID/SQL/protected3100/3200/live5268-g3210 action or network beyond the three literal reference URLs occurred.

ActiveDBcaptureToolAuthor/ContractsInternalReview/currentF/Auth/Icons/native-candidate graphs were excluded before metadata/read/hash/copy. **Return solely for independent M review: TOOL_IDENTITY_UNAVAILABLE /SDK_STARTUP_CLOSURE_HOLD; next step one readonly recorded-tool identity allocation.** No reader identity/implementation/execution/native provenance/currentM all8/native13/adoption/host/J5/COMMIT/privateSSR/publication/91-of-334 acceptance.

## Sources

[V]: https://raw.githubusercontent.com/golang/go/go1.25.0/src/cmd/go/internal/version/version.go "Fixed reference; full retained version.go.txt lines1–202"
[G]: https://raw.githubusercontent.com/golang/go/go1.25.0/src/cmd/go/main.go "Fixed reference; full retained main.go.txt lines1–412"
[C]: https://raw.githubusercontent.com/golang/go/go1.25.0/src/cmd/go/internal/toolchain/select.go "Fixed reference; full retained select.go.txt lines1–718 from second recorded observation"
[O]: /private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-native-reader-route-20261011-V6p8Rt/http-observations.json "Actual four GET observations/three literal URLs, decoded-text retention/ETag limitations"
[T]: /private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-combined-declaration-evidence-mu0gNi/evidence/materialization.json "Already released finite tools header lines438096–438109; exactly Node/Bun"
[N]: /private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-combined-declaration-evidence-mu0gNi/evidence/node-version.command.json "Already released Node argv/environment/digest/version-only status; corresponding node-version.stdout.raw.log v24.18.0"
[U]: /private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode/modal-combined-declaration-evidence-mu0gNi/evidence/bun-version.command.json "Already released Bun argv/environment/digest/version-only status; corresponding bun-version.stdout.raw.log1.4.2"
[A]: ./modal-native-build-info-plan.md "Accepted complete136-line reader plan, original fixed decoder/text references and exact target identity; custom implementation unselected"
[P]: ./modal-native-module-specifier-provenance.md "Accepted complete111-line publisher report and precise native-source mapping STOP"
[L]: ../ROSTER.md "Original M minimality amendment/this report-only allocation line328; .slim/deepwork/nitro-full-migration.md line179"
