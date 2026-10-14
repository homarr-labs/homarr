import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createCertificateFileStore } from "../files";
import type { TrustedCertificateHostname } from "../hostnames/types";
import { createCertificateService } from "../runtime";
import type { TrustMaterialChangedEffect } from "../runtime";

const directory = await fs.mkdtemp(path.join(path.dirname(fileURLToPath(import.meta.url)), ".revocation-fixture-"));
let checks = 0;

try {
  await fs.writeFile(
    path.join(directory, "root.conf"),
    "[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ca\n[dn]\nCN=Disposable revocation root\n[ca]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n",
  );
  execFileSync(
    "/usr/bin/openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      "root.key",
      "-out",
      "root.pem",
      "-days",
      "1",
      "-config",
      "root.conf",
    ],
    { cwd: directory, env: {}, stdio: "ignore" },
  );
  const root = await fs.readFile(path.join(directory, "root.pem"), "utf8");
  const thumbprint = new X509Certificate(root).fingerprint256;

  for (const failure of ["oversized", "symlink", "unreadable"] as const) {
    const folder = path.join(directory, failure);
    const files = createCertificateFileStore({ folder });
    await files.ensureCustomRootCertificateAsync("healthy.pem", root);
    if (failure === "oversized") await fs.writeFile(path.join(folder, "bad.pem"), Buffer.alloc(65537));
    if (failure === "symlink") await fs.symlink(path.join(directory, "root.pem"), path.join(folder, "bad.pem"));
    const grants: TrustedCertificateHostname[] = [{ hostname: "fixture.example", thumbprint, certificate: root }];
    const effects: TrustMaterialChangedEffect[] = [];
    const service = createCertificateService({
      files:
        failure === "unreadable"
          ? {
              ...files,
              getAllTrustedCertificatesAsync: async () => {
                throw new Error("Disposable injected EACCES");
              },
            }
          : files,
      hostnames: {
        listAsync: async () => grants,
        addAsync: async (grant) => {
          grants.push(grant);
        },
        removeAsync: async (hostname, fingerprint) => {
          const index = grants.findIndex((grant) => grant.hostname === hostname && grant.thumbprint === fingerprint);
          if (index >= 0) grants.splice(index, 1);
        },
        removeByFingerprintAsync: async (fingerprint) => {
          for (let index = grants.length - 1; index >= 0; index--) {
            if (grants[index]?.thumbprint === fingerprint) grants.splice(index, 1);
          }
        },
      },
      requireAdminAsync: async (authority: "admin" | "denied") => {
        assert.equal(authority, "admin");
      },
      onTrustMaterialChangedAsync: async (effect) => {
        effects.push(effect);
      },
    });
    await service.removeTrustedHostname("admin", { hostname: "fixture.example", thumbprint });
    assert.equal(grants.length, 0, `${failure} material must not prevent SQL revocation`);
    assert.ok(effects.some((effect) => effect.kind === "trust-material-unavailable"));
    checks++;
    await assert.rejects(service.trustHostnameMismatch("admin", { hostname: "new.example", certificate: root }));
    assert.equal(grants.length, 0, "Adding trust must fail closed");
    checks++;
    await service.removeCertificate("admin", { fileName: "healthy.pem" });
    await assert.rejects(fs.stat(path.join(folder, "healthy.pem")), { code: "ENOENT" });
    checks++;
    const previousEffects = effects.length;
    await assert.rejects(service.removeTrustedHostname("denied", { hostname: "fixture.example", thumbprint }));
    assert.equal(effects.length, previousEffects, "Denied cleanup must not read material or publish effects");
    checks++;
  }
  let revokedDespiteEffectFailure = false;
  const failingEffectService = createCertificateService({
    files: {
      ...createCertificateFileStore({ folder: undefined }),
      getAllTrustedCertificatesAsync: async () => {
        throw new Error("Disposable injected EACCES");
      },
    },
    hostnames: {
      listAsync: async () => [],
      addAsync: async () => {},
      removeAsync: async () => {
        revokedDespiteEffectFailure = true;
      },
      removeByFingerprintAsync: async () => {},
    },
    requireAdminAsync: async () => {},
    onTrustMaterialChangedAsync: async () => {
      throw new Error("Disposable retirement failure");
    },
  });
  await assert.rejects(
    failingEffectService.removeTrustedHostname("admin", { hostname: "fixture.example", thumbprint }),
  );
  assert.ok(
    revokedDespiteEffectFailure,
    "Retirement failure must be reported without preventing authorized SQL revocation",
  );
  checks++;
  console.log(
    `PASS: ${checks} public revocation/add-trust/admin checks across oversized, symlink and injected unreadable material`,
  );
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
