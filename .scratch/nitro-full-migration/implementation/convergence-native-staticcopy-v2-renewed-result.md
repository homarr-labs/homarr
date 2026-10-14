# Staticcopy-v2 renewal: preflight implementation HOLD, copier uninvoked

## Actual terminal outcome

**Renewed preflight exited1 with `RuntimeError: exact-private-reference-exception`; copier invocations0.** This is an executor preflight implementation error, not a failed104-file copier result and not the earlier coordinator protocol-label error. No C/H/P read or mutation was reached. No candidate command/result/parent status exists.

The coordinator corrected the oracle to exactly `NITRO_MATERIALIZATION_STATIC` followed by `NITRO_STATIC_TERMINAL_matplan01` with numericstatus0, without changing the selected report/literal/Python bytes. That correction is accepted here; the prior wrong-label HOLD report and `48ab8aa096e97aa9` evidence remain unchanged. No new protocol mismatch is asserted.

I stopped without repairing/rerunning the failed helper, invoking the copier, allocating alternate C/H roots, cleaning/resetting the new partial external stage or changing old evidence. Coordinator owns reconciliation; this result supplies no copy/native/final-index approval.

## Exact failure boundary

The fresh stdlib-only helper allocated the four authorized new external private directories and read the selected source report. Its explicit report/literal/POSIX-shlex-decoded Python checks precede the failing statement; shlex retained the opening Python newline. Expected source associations remain:

| Source                                   | Bytes | SHA256                                                             |
| ---------------------------------------- | ----: | ------------------------------------------------------------------ |
| Selected report                          | 40152 | `b8aeef58e1f31b1f5364e49c15c2635b602d73d0d9fc8f258576ece5c0280c91` |
| Complete selected literal                | 29949 | `5741874ba53d38bca15ac6e1cc2ec7f1a65b4083440de4467c42f9aba0aa51da` |
| Decoded Python including opening newline | 29308 | `8d66031ae0d48a4b2fbd70c68afdc7da316611a20bb47fea64a9670e7019de21` |

These checks were reached before the displayed exception, but their in-memory source read receipt was neither returned nor frozen. The table identifies the exact checked expected pins, not newly published complete preflight receipts.

Failing preflight statement:

```python
checks = reference(T + "/nitro-materialization-v2-envelope-checks-lpjqi16c/records/final-result.json", 32768, mode=0o400)
```

The helper's `reference` guard admits non0600 only for the two exacthash-bound0644 asset-reference contracts. I incorrectly passed0400 for the retained static-check receipt through that restricted helper. It raised before `take` or any read/stat of the selected static-check leaf. **The leaf's actual current mode was not observed**; the error does not establish a bad historical receipt mode or justify chmod/repair of it. The copied candidate source itself was not changed or invoked.

Selected tool-body pins, `.slim`/ROSTER reads, metadata-companion reads, five current author400 checks, control700/emptiness checks, C/H admission absences, P's104 pins/layout and fence checks all occur later in this helper and were not reached. Thus no fresh full copier gate, successful preflight, release/planned-command record or actual submitted source association is claimed. Historical metadata physical-facts acceptance does not fill these missing gates; metadata exactsourceequality remainsfalse and its admission deviation remains permanentlyHOLD.

## Retained stage and physically closed receipts

`TEMP=/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode`.

New partial stage: `TEMP/nitro-native-staticcopy-v2-execution-renewed-fd2ef4a106f4de02`.

After the failed helper, bounded namespace-only discovery found this new stage; the result collector then inspected only its own four directories. Stage/home/tmp/records were canonical501:20/0700, home/tmp/records empty before stop-receipt writes. This is not a C/H/P postflight.

The collector exclusively wrote these two new leaves0600→fsync→fchmod0400→fsync→physical close→independent exact readback/hash→close. Both returned receipts are regular501:20/nlink1/0400; final collector frame acknowledges **two actual closed writers and zero tracked readers/writers**, including its last JSON writer after close/readback. Its JSON contents do not attest their own future close.

| `records/` leaf                     | Bytes | Actual SHA256                                                      |
| ----------------------------------- | ----: | ------------------------------------------------------------------ |
| `preflight-visible-tool-return.txt` |   604 | `03152ec08b81a563593dad0f192a97f53b068a175847f67efc44c9b12cc3ce14` |
| `preflight-stop-result.json`        |  4616 | `726daa06f6ec90552bfb4a5c033bbf7b3455ce035970afc1d76009143319ec44` |

The text leaf transcribes the complete displayed preflight traceback and `Exited with code 1` exactly, including final newline. This is visible-return evidence, not independently recovered raw stdout/stderr channels or harness argv. No candidate result frame/status0 was reconstructed. Collector readbacks5220 bytes; failed-helper source read40152 bytes by executed ordering; both are far below the extra8MiB limit. No additional source/tool/asset payload read was made by the collector.

One intervening empty `functions.shell` request displayed `provider.transport`, `WebSocket closed with code 1000`, an empty response body and no command/result. It supplied no candidate command and establishes no collector completion or shell-status fact. The subsequent explicit stop-receipt collector is not a candidate/preflight retry and returned the physical receipts above. No invisible effects or successful action are inferred from the transport error.

## Scope and limitations

Copier invocations0, candidate writes0, C/H/P reads&writes0;104-file source/copy joins,106-file writer closure,400/500 frozen input modes, outputempty700 and final approval/runtime absences remain **unobserved by this renewed executor**, not failed or satisfied results. No native/Bun/SQL/Engine/network/container/application/enrollment operation, source-product/check/test edit, final index/grant/claim writer, source rewrite, nested agent or runtime assertion occurred.

Independent review must classify this preflight implementation HOLD before any coordinator continuation. Preserve the partial external stage, prior HOLD evidence, all old controls/artifacts/Bun attempts/data and C/H/P unchanged. No automatic callback repair, repeated helper, cleanup/reset, alternate root or copier retry follows this report. Wire-plan and seeded-route lanes remain disjoint and were not contacted or delegated to.
