# 58: Proxmox

**What to build:** Configure/test a Proxmox token connection and consume authorized cluster/node/VM/LXC health with complete native results and safe provider errors.

**Blocked by:** #01 — Runnable Nitro foundation and request-isolated SSR.

**Status:** ready-for-agent

## Coverage

Primary kind `proxmox`: public username/tokenId/realm and private apiKey form the PVE token, not username/password. Native checks/H eligibility and projected nodes,vms,lxcs from array lengths. Preserve cluster/nodes/VMs/LXCs, parallel node/VM resources, custom provider errors and units. Exact evidence: original INTEGRATION-019/research §§2.2–2.3/5. Docker/Kubernetes are different owners and no upstream SDK admin expansion is implied.

## Required contracts

Accept #40 snapshot/query/SDK-fetch/operation/result/trust, #41 forms, #83 cluster-health selection and #04 allowed-kind/use/query interfaces. Only narrow revisions gate start; real delegated identity/secrets/storage/trusted SDK runtime and managed cluster UI are release joins, not completed peer barriers.

## Decision holds

Selected SDK/runtime/PVE version compatibility is unverified. Q11/Q12 apply to concrete repository/conversion, Q15 applicable session continuity; native URL/trust changes and restart lifetime remain qualified. Live minimal token scope/topology/access must be explicitly approved, never broadened to bypass permission failures.

## Ownership

Own Proxmox client/SDK injection/native cluster composition/descriptors and focused fixtures. #40 common transport, #83 widget orchestration/presentation, #41 forms and COMPOSITION mounts/manifests/exports retain exclusive ownership; record provider-local file allocation before dispatch.

- [ ] Complete configure/test/masked edit/remove/delete and authorized cluster/Stats consumer demonstration using exact username/tokenId/apiKey/realm metadata, native/H mode and trusted injected Fetch; no disable-TLS sample policy.
- [ ] Preserve all cluster/node/VM/LXC methods, parallel resources, counts/units/custom errors and partial-node result behavior; focused delegated permission/API-error/empty/malformed fixtures cover the actual source surface.
- [ ] Native cluster allowed-kind/subset/use/query policy resolves before decrypt and no SDK administrative operation becomes automatically exposed; safe errors neither reveal token strings nor request broader privileges.
- [ ] Pre-abort/deadline/config/trust/delete/revision cases prove resource ownership, cancellation or truthful unsettled-work handling, redaction and stale-result fencing through shared ports.
- [ ] Demonstrate actual node/VM/LXC target UI separately from host/Docker/Kubernetes tools. Later bounded live cluster reads require explicit deployed PVE/token scope/topology approval; unavailable rights remain failures/unverified evidence, not automatic all-provider live passes.
