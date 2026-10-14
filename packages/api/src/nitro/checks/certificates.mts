import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { call, ORPCError } from "@orpc/server";
import { drizzle } from "drizzle-orm/better-sqlite3";

import type { Database } from "@homarr/db";
import { createCertificateFileStore } from "@homarr/core/infrastructure/certificates/resources";
import type {
  TrustedCertificateHostname,
  TrustedCertificateHostnameStore,
  TrustMaterialChangedEffect,
} from "@homarr/core/infrastructure/certificates/resources";
import { sqliteSchema as schema } from "@homarr/db/schema";
import { backendContractRevision } from "../context";
import type { BackendContext, BackendPrincipal } from "../context";
import { defineBackendContribution } from "../contribution";
import { sourcePortRows } from "../port-map";
import { getSourceProjectionMeta } from "../procedure";
import {
  createCertificateProcedures,
  certificateImplementedPaths,
  certificatePendingPaths,
} from "../routers/certificates";
import type { CertificateProcedureResources } from "../routers/certificates";

const directory = await fs.mkdtemp(
  path.join(fileURLToPath(new URL("../routers/-certificates/", import.meta.url)), ".fixture-"),
);
const folder = path.join(directory, "certificates");
const generatedFiles = ["first", "second", "leaf"].flatMap((name) => [`${name}.conf`, `${name}.key`, `${name}.pem`]);
const managedFiles = ["ca.pem", "uploaded.pem", "legacy root.pem", "leaf.pem", "bad.pem"];
let databaseTouches = 0;
const database: Database = new Proxy(drizzle.mock({ schema }), {
  get() {
    databaseTouches++;
    throw new Error("Fixture must not execute SQL");
  },
});
const admin: BackendPrincipal = {
  kind: "authenticated",
  user: { id: "fixture-admin", permissions: ["admin"], name: null, email: null, image: null, colorScheme: "auto" },
};
function context(principal: BackendPrincipal = admin, signal = new AbortController().signal): BackendContext {
  const request = new Request("https://fixture.invalid/rpc/certificates", { method: "POST" });
  return {
    db: database,
    request,
    signal,
    principal,
    deviceType: undefined,
    demo: { enabled: false, readOnly: false },
    setup: {
      async isClaimOnlyAccessAllowed() {
        return false;
      },
      async currentStep() {
        return "finish";
      },
    },
    effect() {
      throw new Error("Unexpected host response effect");
    },
    onDispose() {},
  };
}

async function expectCode(operation: Promise<unknown>, code: string, message?: string) {
  await assert.rejects(operation, (error: unknown) => {
    if (!(error instanceof ORPCError) || error.code !== code) return false;
    if (message !== undefined) {
      assert.equal(error.message, message);
      assert.equal(error.cause, undefined);
    }
    assert.equal(JSON.stringify(error.toJSON()).includes("fixture-private-SQL-or-PEM"), false);
    return true;
  });
}

const key = (hostname: string, thumbprint: string) => JSON.stringify([hostname, thumbprint]);
async function removeKnownFile(fileName: string) {
  try {
    await fs.unlink(fileName);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
}
async function removeKnownDirectory(folderName: string) {
  try {
    await fs.rmdir(folderName);
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
  }
}

try {
  for (const name of ["first", "second", "leaf"]) {
    await fs.writeFile(
      path.join(directory, `${name}.conf`),
      `[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ca\n[dn]\nCN=Disposable native ${name} certificate\n[ca]\nbasicConstraints=critical,CA:${name === "leaf" ? "FALSE" : "TRUE"}\nkeyUsage=critical,${name === "leaf" ? "digitalSignature" : "keyCertSign,cRLSign"}\n`,
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
        `${name}.key`,
        "-out",
        `${name}.pem`,
        "-days",
        "1",
        "-config",
        `${name}.conf`,
      ],
      { cwd: directory, env: { NODE_ENV: "test" }, stdio: "ignore" },
    );
  }
  const first = await fs.readFile(path.join(directory, "first.pem"), "utf8");
  const second = await fs.readFile(path.join(directory, "second.pem"), "utf8");
  const leafCertificate = await fs.readFile(path.join(directory, "leaf.pem"), "utf8");
  const fingerprint = new X509Certificate(first).fingerprint256;
  const rawFiles = createCertificateFileStore({ folder });
  const grants = new Map<string, TrustedCertificateHostname>();
  let storeCalls = 0;
  let fileReads = 0;
  let fileTexts = 0;
  let acquired = 0;
  let released = 0;
  let current = true;
  let currentAdmin = true;
  let materialUnavailable = false;
  let revokeAfterDelete = false;
  let revokeAfterPreflight = false;
  let revokeAfterFileDelete = false;
  let failRetirement = false;
  let cancelAfterDelete: AbortController | undefined;
  let retirementGate: ReturnType<typeof Promise.withResolvers<void>> | undefined;
  let retirementEntered: ReturnType<typeof Promise.withResolvers<void>> | undefined;
  const effects: TrustMaterialChangedEffect[] = [];
  const hostnames: TrustedCertificateHostnameStore = {
    async listAsync() {
      storeCalls++;
      return [...grants.values()];
    },
    async addAsync(grant) {
      storeCalls++;
      grants.set(key(grant.hostname, grant.thumbprint), { ...grant });
    },
    async removeAsync(hostname, thumbprint) {
      storeCalls++;
      grants.delete(key(hostname, thumbprint));
      if (revokeAfterDelete) current = false;
      cancelAfterDelete?.abort();
    },
    async removeByFingerprintAsync(thumbprint) {
      storeCalls++;
      for (const [id, grant] of grants) if (grant.thumbprint === thumbprint) grants.delete(id);
    },
  };
  const resources: CertificateProcedureResources = {
    files: {
      ...rawFiles,
      async getCustomRootCertificateAsync(name) {
        fileReads++;
        return rawFiles.getCustomRootCertificateAsync(name);
      },
      async getAllTrustedCertificatesAsync() {
        fileReads++;
        if (materialUnavailable) throw new Error("fixture-private-SQL-or-PEM");
        const ca = await rawFiles.getAllTrustedCertificatesAsync();
        if (revokeAfterPreflight) current = false;
        return ca;
      },
      async removeCustomRootCertificateAsync(name) {
        const certificate = await rawFiles.removeCustomRootCertificateAsync(name);
        if (revokeAfterFileDelete) current = false;
        return certificate;
      },
    },
    async acquireAuthorityAsync(requestContext) {
      acquired++;
      return {
        identity: {
          type: "authenticated",
          userId: "fixture-admin",
          groupIds: [],
          permissions: currentAdmin ? ["admin"] : [],
        },
        signal: requestContext.signal,
        async assertCurrentAsync() {
          if (!current) throw new Error("fixture-private-SQL-or-PEM");
        },
        async releaseAsync() {
          released++;
        },
      };
    },
    createHostnameStore() {
      return hostnames;
    },
    async retireTrustMaterialAsync(effect) {
      effects.push(effect);
      retirementEntered?.resolve();
      await retirementGate?.promise;
      if (failRetirement) throw new Error("fixture-private-SQL-or-PEM");
    },
  };
  const certificates = createCertificateProcedures(resources);
  const allocated = sourcePortRows.filter(([leaf]) => leaf.startsWith("certificates.")).map(([leaf]) => leaf);
  assert.deepEqual(certificateImplementedPaths.toSorted(), allocated.toSorted());
  assert.equal(certificateImplementedPaths.length, 6);
  assert.equal(certificatePendingPaths.length, 0);
  defineBackendContribution({
    revision: backendContractRevision,
    id: "disposable-certificates",
    router: { certificates },
    leaves: certificateImplementedPaths,
  });
  assert.equal(getSourceProjectionMeta(certificates.getCertificate)?.openapi?.path, "/api/certificates/{fileName}");
  assert.equal(getSourceProjectionMeta(certificates.ensureRootCertificate)?.openapi?.path, "/api/certificates/root");
  assert.equal(getSourceProjectionMeta(certificates.addCertificate), undefined);
  assert.equal("listCertificates" in certificates, false);

  const hostileInput = {
    get fileName(): string {
      throw new Error("Denied input was parsed");
    },
  };
  class ObservedFile extends File {
    override async text() {
      fileTexts++;
      return super.text();
    }
  }
  class HostileFormData extends FormData {
    override [Symbol.iterator](): FormDataIterator<[string, FormDataEntryValue]> {
      throw new Error("Denied form was parsed");
    }
  }
  await expectCode(
    call(certificates.getCertificate, hostileInput, { context: context({ kind: "anonymous" }) }),
    "UNAUTHORIZED",
  );
  await expectCode(
    call(certificates.addCertificate, new HostileFormData(), {
      context: context({ kind: "authenticated", user: { ...admin.user, permissions: [] } }),
    }),
    "FORBIDDEN",
  );
  currentAdmin = false;
  await expectCode(call(certificates.getCertificate, hostileInput, { context: context() }), "FORBIDDEN");
  currentAdmin = true;
  current = false;
  await expectCode(
    call(certificates.addCertificate, { file: new ObservedFile([first], "uploaded.pem") }, { context: context() }),
    "FORBIDDEN",
  );
  current = true;
  assert.equal(fileTexts, 0);
  assert.equal(fileReads, 0);
  assert.equal(storeCalls, 0);
  assert.equal(effects.length, 0);

  const cancelled = new AbortController();
  cancelled.abort();
  await expectCode(
    call(certificates.getCertificate, hostileInput, { context: context(admin, cancelled.signal) }),
    "PRECONDITION_FAILED",
    "Certificate operation was cancelled",
  );
  await expectCode(
    call(certificates.getCertificate, hostileInput, {
      context: context({ kind: "authenticated", user: { ...admin.user, id: "wrong-fixture-user" } }),
    }),
    "FORBIDDEN",
    "Permission denied",
  );
  assert.equal(fileReads, 0);
  assert.equal(storeCalls, 0);
  assert.equal(effects.length, 0);

  assert.equal(await call(certificates.getCertificate, { fileName: "ca.pem" }, { context: context() }), null);
  const created = await call(
    certificates.ensureRootCertificate,
    { fileName: "ca.pem", certificate: first },
    { context: context() },
  );
  assert.equal(created.created, true);
  assert.equal(created.certificate.ca, true);
  assert.equal(created.certificate.fingerprint256, fingerprint);
  assert.deepEqual(
    Object.keys(created.certificate).toSorted(),
    ["fileName", "sha256", "fingerprint256", "ca", "validFrom", "validTo"].toSorted(),
  );
  assert.deepEqual(
    await call(certificates.getCertificate, { fileName: "ca.pem" }, { context: context() }),
    created.certificate,
  );
  assert.equal(JSON.stringify(created).includes("BEGIN CERTIFICATE"), false);
  const previousEffect = effects.at(-1);
  retirementGate = Promise.withResolvers<void>();
  retirementEntered = Promise.withResolvers<void>();
  let identicalSettled = false;
  const identical = call(
    certificates.ensureRootCertificate,
    { fileName: "ca.pem", certificate: first },
    { context: context() },
  ).finally(() => {
    identicalSettled = true;
  });
  await retirementEntered.promise;
  assert.equal(identicalSettled, false);
  assert.deepEqual(effects.at(-1), previousEffect);
  retirementGate.resolve();
  assert.equal((await identical).created, false);
  retirementGate = undefined;
  retirementEntered = undefined;
  await expectCode(
    call(certificates.ensureRootCertificate, { fileName: "ca.pem", certificate: second }, { context: context() }),
    "CONFLICT",
    "A different certificate already exists at this file name",
  );
  assert.equal(await fs.readFile(path.join(folder, "ca.pem"), "utf8"), first);
  await expectCode(
    call(
      certificates.ensureRootCertificate,
      { fileName: "leaf.pem", certificate: leafCertificate },
      { context: context() },
    ),
    "BAD_REQUEST",
    "Expected a self-signed root CA certificate",
  );
  await expectCode(
    call(
      certificates.ensureRootCertificate,
      { fileName: "bad.pem", certificate: "fixture-private-SQL-or-PEM" },
      { context: context() },
    ),
    "BAD_REQUEST",
    "Expected one PEM root CA certificate, at most 64 KiB",
  );
  const textBeforeOversized = fileTexts;
  await expectCode(
    call(
      certificates.addCertificate,
      { file: new ObservedFile(["x".repeat(65537)], "uploaded.pem") },
      { context: context() },
    ),
    "BAD_REQUEST",
    "Expected one PEM root CA certificate, at most 64 KiB",
  );
  assert.equal(fileTexts, textBeforeOversized);
  revokeAfterPreflight = true;
  await expectCode(
    call(certificates.addCertificate, { file: new ObservedFile([first], "uploaded.pem") }, { context: context() }),
    "FORBIDDEN",
    "Permission denied",
  );
  assert.equal(fileTexts, textBeforeOversized);
  current = true;
  revokeAfterPreflight = false;
  assert.equal(
    await call(
      certificates.addCertificate,
      { file: new ObservedFile([first], "uploaded.pem") },
      { context: context() },
    ),
    undefined,
  );
  const formData = new FormData();
  formData.append("file", new File([first], "uploaded.pem"));
  assert.equal(await call(certificates.addCertificate, formData, { context: context() }), undefined);
  await expectCode(
    call(certificates.addCertificate, { file: new ObservedFile([second], "uploaded.pem") }, { context: context() }),
    "CONFLICT",
    "A different certificate already exists at this file name",
  );
  assert.equal(await fs.readFile(path.join(folder, "uploaded.pem"), "utf8"), first);
  await expectCode(
    call(
      certificates.addCertificate,
      { file: new ObservedFile([leafCertificate], "leaf.pem") },
      { context: context() },
    ),
    "BAD_REQUEST",
    "Expected a self-signed root CA certificate",
  );
  assert.deepEqual((await fs.readdir(folder)).toSorted(), ["ca.pem", "uploaded.pem"]);

  const hostname = "Fixture.EXAMPLE:443";
  await call(certificates.trustHostnameMismatch, { hostname, certificate: first }, { context: context() });
  await call(
    certificates.trustHostnameMismatch,
    { hostname: "other.example", certificate: first },
    { context: context() },
  );
  await call(certificates.trustHostnameMismatch, { hostname, certificate: second }, { context: context() });
  assert.equal(grants.size, 3);
  await call(certificates.removeTrustedHostname, { hostname, thumbprint: fingerprint }, { context: context() });
  assert.equal(grants.has(key(hostname, fingerprint)), false);
  assert.equal(grants.has(key("other.example", fingerprint)), true);
  assert.equal(grants.size, 2);
  await fs.writeFile(path.join(folder, "legacy root.pem"), first);
  await expectCode(
    call(certificates.getCertificate, { fileName: "legacy root.pem" }, { context: context() }),
    "BAD_REQUEST",
  );
  await call(certificates.removeCertificate, { fileName: "legacy root.pem" }, { context: context() });
  assert.equal(grants.has(key("other.example", fingerprint)), false);
  assert.equal(grants.size, 1);
  grants.set(key(hostname, fingerprint), { hostname, thumbprint: fingerprint, certificate: first });
  revokeAfterFileDelete = true;
  await expectCode(
    call(certificates.removeCertificate, { fileName: "uploaded.pem" }, { context: context() }),
    "CERTIFICATE_OPERATION_FAILED",
    "Certificate mutation may have completed; current authority or cancellation changed",
  );
  assert.equal(grants.has(key(hostname, fingerprint)), false);
  current = true;
  revokeAfterFileDelete = false;
  await expectCode(
    call(certificates.removeCertificate, { fileName: ".." }, { context: context() }),
    "BAD_REQUEST",
    "Invalid certificate file name",
  );

  grants.set(key(hostname, fingerprint), { hostname, thumbprint: fingerprint, certificate: first });
  materialUnavailable = true;
  retirementGate = Promise.withResolvers<void>();
  retirementEntered = Promise.withResolvers<void>();
  let revokedSettled = false;
  const revoked = call(
    certificates.removeTrustedHostname,
    { hostname, thumbprint: fingerprint },
    { context: context() },
  ).finally(() => {
    revokedSettled = true;
  });
  await retirementEntered.promise;
  assert.equal(grants.has(key(hostname, fingerprint)), false);
  assert.equal(revokedSettled, false);
  assert.deepEqual(effects.at(-1), { kind: "trust-material-unavailable" });
  retirementGate.resolve();
  await revoked;
  retirementGate = undefined;
  retirementEntered = undefined;
  materialUnavailable = false;

  grants.set(key(hostname, fingerprint), { hostname, thumbprint: fingerprint, certificate: first });
  failRetirement = true;
  await expectCode(
    call(certificates.removeTrustedHostname, { hostname, thumbprint: fingerprint }, { context: context() }),
    "CERTIFICATE_OPERATION_FAILED",
    "Certificate mutation may have completed but trust retirement failed",
  );
  assert.equal(grants.has(key(hostname, fingerprint)), false);
  failRetirement = false;

  for (const change of ["authority", "abort"]) {
    grants.set(key(hostname, fingerprint), { hostname, thumbprint: fingerprint, certificate: first });
    const controller = new AbortController();
    revokeAfterDelete = change === "authority";
    cancelAfterDelete = change === "abort" ? controller : undefined;
    retirementGate = Promise.withResolvers<void>();
    retirementEntered = Promise.withResolvers<void>();
    const changed = expectCode(
      call(
        certificates.removeTrustedHostname,
        { hostname, thumbprint: fingerprint },
        { context: context(admin, controller.signal) },
      ),
      "CERTIFICATE_OPERATION_FAILED",
      "Certificate mutation may have completed; current authority or cancellation changed",
    );
    await retirementEntered.promise;
    assert.equal(grants.has(key(hostname, fingerprint)), false);
    retirementGate.resolve();
    await changed;
    current = true;
    revokeAfterDelete = false;
    cancelAfterDelete = undefined;
    retirementGate = undefined;
    retirementEntered = undefined;
  }
  assert.equal(acquired, released);
  assert.equal(databaseTouches, 0);
  console.log(
    JSON.stringify(
      {
        nativeUnmounted: 6,
        fixtureOnlyCoreMapping: true,
        actualCoreServiceAndGeneratedFiles: true,
        deniedParseReadEffects: "passed",
        metadataIdempotenceConflict: "passed",
        exactGrantRevocation: "passed",
        awaitedRetirementIncludingIdenticalUnavailableAndPostMutationFence: "passed",
        databaseTouches,
        actualSQL: false,
        actualTransportRetirement: false,
      },
      null,
      2,
    ),
  );
} finally {
  for (const name of managedFiles) await removeKnownFile(path.join(folder, name));
  await removeKnownDirectory(folder);
  for (const name of generatedFiles) await removeKnownFile(path.join(directory, name));
  await removeKnownDirectory(directory);
}
