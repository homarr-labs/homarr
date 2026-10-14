# Backend workspace declaration — scoped before evidence

New minimal declaration-only lease supersedes all earlier COMPOSITION leases. Accepted Query adapter declaration and reviewed family declarations stay frozen. The current parallel cap remains 32; no worker dispatch here.

## Absence and preserved base

Before patching, dedicated directory/glob reads showed no `apps/backend` directory/files, and a lock text search showed no `workspaces["apps/backend"]` or `@homarr/backend` node. This report path was absent too. No existing user file is overwritten. Root workspace patterns already include `apps/*`; root configuration/catalog need no change.

The captured lock begins with `lockfileVersion: 3`, `configVersion: 1`, then `workspaces` containing the root object followed by `apps/docs`. The new backend record is inserted between those existing objects without changing either. Frontend lock evidence retains `workspaces["apps/nitro"].dependencies["@orpc/tanstack-query"] = "2.0.0-beta.43"`, alongside existing client/server beta.43. All existing workspaces, resolved nodes, integrities, scripts, frontend manifest/source/output and prior declaration fields remain outside this lease.

No Git/HEAD/index/hash command, install, compiler or automated before/after certificate was used. Evidence is dedicated metadata/declaration/lock reads and local patch operations, not a full dependency-closure proof.

## Existing package/node evidence

### Nitro

Read installed `node_modules/nitro/package.json`: version **3.0.260903-beta**, ESM, export `./storage` → `./dist/runtime/storage.mjs`. Installed `dist/runtime/storage.d.mts` reexports `useStorage`; internal declaration is:

```text
import type { Storage, StorageValue } from "unstorage";
export declare function useStorage<T extends StorageValue = StorageValue>(base?: string): Storage<T>;
```

Existing lock Nitro node is `nitro@3.0.260903-beta`, integrity:

```text
sha512-54gANPi62O8rfMvepiJUVuIzEIinYfpeHbebywlLxvVTgIYXDwSvpaU9Id+0sJOBjBx0wC1/CVYXJkH7SY+l0g==
```

Its recorded dependencies match the installed package: consola `^3.4.2`, crossws `^0.4.12`, db0 `^0.4.1`, env-runner `^0.2.1`, h3 `^2.0.1-rc.31`, hookable `^6.1.1`, nf3 `^0.3.24`, ocache `^0.3.0`, rolldown `^1.2.7`, rou3 `^0.9.2`, srvx `^1.0.3`, unenv `^2.0.0-rc.24`, unstorage `^2.0.0-alpha.10`. No installed Nitro peerDependencies field is present; metadata declares Node engine `^20.19.0 || >=22.12.0` and Vite compatibility `^7 || ^8`. These are declared constraints, not a runtime/engine test. Nitro's own development-only versions are not backend dependency requirements.

The existing unstorage node is **2.0.0-alpha.10**, already Nitro-owned. The backend will import `nitro/storage`, not `unstorage` directly; no backend unstorage declaration or node change is needed for that selected public import. Future explicit driver/type imports would require their own reviewed ownership.

### Zod

Read existing **`apps/nitro/node_modules/zod/package.json`**: version **4.6.5**, ESM; root import export `./index.js`, root types `./index.d.cts`. The installed declaration reexports genuine v4/classic types and named/default `z`. No runtime dependency or peerDependencies field is present in that manifest. Its `sideEffects` metadata specifically names compile entries; this is not a blanket application safety claim.

Existing resolved node `packages["@homarr/nitro/zod"]` is `zod@4.6.5`, integrity:

```text
sha512-v5l/aFXZQeai4awLbOpSoHecE9UiMrnfx75tEXLjNonXVARxQ5mOeipTjROUchszUNCqnE+hqAMujRsRHsut2Q==
```

Root **`node_modules/zod` and lock `packages["zod"]` remain 4.4.3**. Do not mistake that installed root for the requested backend version. Exact `4.6.5` already exists as a frontend-scoped installed/resolved artifact, but no backend-local resolution is certified before an integrated install. Neither root nor frontend Zod node is edited, duplicated or upgraded here.

`STACK-ADAPTER-APIS.md` was read as the frozen verified-API prerequisite. Its historical missing Query declaration is already resolved by the accepted tiny Query lease, not repeated here. Installed Nitro exposes old **`nitro/storage` / `useStorage`**, not the newer documentation's `nitro/kv` / `useKV`. Read-time schema validation/raw-KV expiry behavior and driver limitations stay with the separately leased adapter owner; declarations do not implement them.

## Frozen exact after objects

Dedicated after reads show the entire new manifest:

```json
{
  "name": "@homarr/backend",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "nitro": "3.0.260903-beta",
    "zod": "4.6.5"
  }
}
```

The only lock delta is this new workspace object, inserted before existing `apps/docs`:

```text
    "apps/backend": {
      "name": "@homarr/backend",
      "version": "0.0.0",
      "dependencies": {
        "nitro": "3.0.260903-beta",
        "zod": "4.6.5",
      },
    },
```

**Two direct owning dependency fields** in the new manifest and their matching fields in one new lock workspace record. No existing workspace fields/nodes/integrities, root catalog or frontend manifest edits. No startup/script, exports, main/types/tsconfig, future source target or React/Next/tRPC/Redis/provider dependency. `nitro/storage` and `zod` become explicit backend-owned import dependencies; no adapter implementation or API export is created.

## Physical graph / integrated-install holds

- **No backend installation/resolution proof.** The new workspace is not installed/linked here, and no backend Zod scope or `@homarr/backend` resolved package node is added. Existing version nodes are evidence of availability, not proof that the augmented lock is frozen-install-complete; a separately authorized integrated install may need workspace linking/version placement records. Those resolved-node changes are outside this lease. Never accept a root `4.4.3` hoist as backend `4.6.5`.
- Nitro's internal storage TYPE declaration reaches unstorage, while its actual runtime is builder/virtual-storage dependent. No full runtime graph was traversed, loaded or evaluated; mounted-driver ownership, isolation/expiry/retirement/durability and native behavior remain unproven. KV remains acceleration, not SQL/session/grant/transaction authority.
- **One frontend Nitro/Vite build, output and listener**, not a second backend process/start command. Source separation is the approved direction; actual cross-workspace packaging/lifetime/SSR/route resolution is still unverified. No proxy/CORS/port addition or listener operation.
- **A02 exact relocation manifest remains pending.** No old backend source move, shared configuration, `serverDir`, root plugin, route or lifecycle edits occur now. Those need the separately reviewed relocation/join allocation.
- This exact declaration freezes for **independent narrow review before the KV worker consumes the new workspace**. Existing installed public API/metadata and compatible pins do not certify runtime, private authority, physical resource settlement or production readiness.

No install/upgrade/fetch or new latest pin; final lint/typecheck and integrated install/build/graph/native/lifecycle verification remain required in a separately authorized convergence phase, **not run or passed here**. No application/source creation except the new manifest; no runtime imports/evaluation, commands/checks/tests/format, environment/credentials/current data/output, network/provider/SQL/browser/listener/Git mutation or nested agent. Only `apps/backend/package.json`, the new lock workspace object and this exact handoff were patched. Prior Query/family/source evidence remains frozen and untouched; no subprocess remains active from this lane.
