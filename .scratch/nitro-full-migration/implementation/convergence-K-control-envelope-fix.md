# K control envelope amendment — source freeze

Narrow source amendment under the reported Oracle approval `ses_ece61e4b3ffeWbV4O1ETRyh5DZ`. Only staging `control/schema-control.ts` and this new report were written. The coordinator's archived prior source/MJS/manifest remain untouched; prior compilation CLOSURE ACCEPT is invalidated. No commands, checks, builds, evaluation, native/SQL execution, environment/data/secret access, new dependencies/tests/comments/casts or nested agents were performed.

Read-only evidence covered existing source and coordinator records `cached-security-probe.stdout`, `cached-security-probe.exit`, `daemon-security-options.stdout`, `daemon-security-options.exit`. Both stored exit files contain `0`; `.stdout0` denotes the supplied successful record, not a filename present in this stage. The visible probe records canonical regular nonsymlink `/usr/sbin/docker-init`, PID1 executable identity, `/proc/self/attr/current` EINVAL and the three named LSM indicators ENOENT. Daemon stdout is exactly the reported two-option array. This delivery did not recalculate evidence hashes or rerun probes.

## Mandatory fixed manifest fields

The coordinator must rebuild and populate `/control/compile-manifest.json` with the following `runtimeEnvelope`, alongside its existing compilation/provenance fields:

```json
{
  "runtimeEnvelope": {
    "initPath": "/usr/sbin/docker-init",
    "defaultMaskedTmpfs": ["/proc/asound", "/sys/firmware"],
    "defaultLsm": {
      "kind": "not-applicable",
      "daemonSecurityOptions": [
        "name=seccomp,profile=builtin",
        "name=cgroupns"
      ],
      "evidence": {
        "daemonStdoutSha256": "<reviewed daemon-security-options.stdout byte hash>",
        "daemonExitSha256": "<reviewed daemon-security-options.exit byte hash>",
        "securityProbeStdoutSha256": "<reviewed cached-security-probe.stdout byte hash>",
        "securityProbeExitSha256": "<reviewed cached-security-probe.exit byte hash>"
      }
    }
  }
}
```

The displayed hash placeholders are documentation, not accepted values: all four actual fields must be64 lowercase hex. Envelope/defaultLSM/evidence key sets, fixed init path, ordered two-mask array and ordered two-option daemon array are checked exactly. Missing, extra, reordered, malformed or substituted fields fail closed. The native control reads only the fixed manifest path with the existing bounded regular/nonsymlink/single-link input reader. Its preflight records the manifest's byte hash and size, and initial input proof must match both before file creation/native open; existing post-proof rechecks the complete four-file control identities. Control inventory remains exactly source, MJS, compile manifest and preserved capture.

Evidence hashes are bindings in a reviewed compilation manifest, not proof that the native control contacted Docker or read host receipts. The separate launcher must compare them against independently approved hashes of the four actual stdout/exit files, confirm numeric successful statuses, and recheck actual daemon options and mask inventory before release. Neither arbitrary manifest text nor this host-envelope evidence grants DB authority.

## Exact assertion semantics

- **Init:** only comm `docker-init`, direct parent PID1, fixed canonical regular nonsymlink `/usr/sbin/docker-init`, and `/proc/1/exe` exactly that path are accepted. Its exact mount must be read-only overlay. Existing matching self/init mount/network/PID/IPC namespace checks remain. The new executable mount allowance is one equality, not an executable/path-prefix exemption.
- **Masked mounts:** only `/proc/asound` and `/sys/firmware` receive the measured exception. Both exact mount points must exist once, be tmpfs, and have exactly `ro,relatime` mount options. They cannot use the generic pseudo-mount exception to bypass their checks. Existing private propagation, read-only/root/input checks, work tmpfs guards and all other enumerated mount restrictions remain unchanged. No additional mask/prefix/filesystem/flag exception is introduced.
- **LSM present:** existing nonempty known Docker/AppArmor or container SELinux label checks remain, including explicit rejection of `unconfined`; the observation is `kind:confined` with the actual checked label. Unknown labels and all other read errors remain failures.
- **LSM absent:** allowed only when the actual fixed current-attribute read throws EINVAL, each of `/sys/kernel/security/lsm`, `/sys/module/apparmor/parameters/enabled`, `/sys/fs/selinux/enforce` independently throws ENOENT, and the mandatory reviewed manifest declares `defaultLsm.kind:not-applicable` with the exact daemon options and all four valid evidence hashes. A successful indicator read or any other error fails. The receipt records `kind:not-applicable`, actual EINVAL/ENOENT observations, manifest byte hash and evidence bindings; it does **not** call absence confined.
- **Unchanged:** all five capability masks remain zero; NoNewPrivs1 and Seccomp2 remain mandatory. No daemon/network client, new mount, launcher implementation, data read or second native owner was added.

All103 asset pins, journal/snapshot lineage, empty-file proof, fixed SQLite/Bun identity, actual one-client Drizzle migration exactly once, historical transaction/FK statements, metadata-only capture, lossless ledger checks, bounds, independent primary/closure failures, statement finalization, strict close and one sanitized post-close JSON remain unchanged.

## Release and holds

Freeze this source for independent review; coordinator then owns static compilation/closure/lint/type review, mandatory manifest evidence population, and a separate reviewed launcher release before any metadata experiment. No amended MJS, compilation manifest, source hash, native result or PASS is claimed here. Source/adoption/native/product PASS, K ACCEPT, D allocation and all prior lifetime/currentness, populated preservation, packaging, PG, Auth/provider/runtime publication and real restore holds remain in force.
