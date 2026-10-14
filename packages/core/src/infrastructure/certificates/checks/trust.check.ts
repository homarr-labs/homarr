import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
import { once } from "node:events";
import fs from "node:fs/promises";
import { createServer, get as getHttps } from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetch } from "undici/index.js";

import { createCertificateHttpRuntime } from "../../http/runtime";
import { withHttpRequestSignalAsync } from "../../http/request-signal";
import { createCustomCheckServerIdentity } from "../../http/tls";
import {
  addCustomRootCertificateAsync,
  createCertificateFileStore,
  getAllTrustedCertificatesAsync,
  loadCustomRootCertificatesAsync,
  removeCustomRootCertificateAsync,
} from "../files";
import {
  ensureCustomRootCertificateAsync,
  getCustomRootCertificateAsync,
  readCertificateAsync,
  RootCertificateError,
} from "../files/root-certificate";
import type { TrustedCertificateHostname } from "../hostnames/types";
import { createTrustedCertificateHostnameReader, getTrustedCertificateHostnamesAsync } from "../hostnames";
import { createCertificateService, createCertificateTrustReader } from "../runtime";
import type { CertificateTrustMaterial } from "../runtime";

const directory = await fs.mkdtemp(path.join(path.dirname(fileURLToPath(import.meta.url)), ".trust-fixture-"));
const folder = path.join(directory, "store");
const openssl = (args: string[]) => {
  try {
    execFileSync("/usr/bin/openssl", args, { cwd: directory, env: {}, stdio: ["ignore", "ignore", "pipe"] });
  } catch (error) {
    if (error instanceof Error && "stderr" in error && Buffer.isBuffer(error.stderr)) {
      throw new Error(error.stderr.toString("utf8"), { cause: error });
    }
    throw error;
  }
};
let runtime: ReturnType<typeof createCertificateHttpRuntime> | undefined;
let server: ReturnType<typeof createServer> | undefined;
const includeIssuerKeyIdentifiers = process.argv[2] !== "sparse-pki";

try {
  await fs.writeFile(
    path.join(directory, "root.conf"),
    "[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ca\n[dn]\nCN=Disposable trust root\n[ca]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n" +
      (includeIssuerKeyIdentifiers ? "subjectKeyIdentifier=hash\n" : ""),
  );
  for (const name of ["root", "other"]) {
    await fs.writeFile(
      path.join(directory, `${name}.conf`),
      `[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ca\n[dn]\nCN=Disposable ${name}\n[ca]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n` +
        (includeIssuerKeyIdentifiers ? "subjectKeyIdentifier=hash\n" : ""),
    );
    openssl([
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
    ]);
  }
  await fs.writeFile(
    path.join(directory, "leaf.conf"),
    "[req]\nprompt=no\ndistinguished_name=dn\n[dn]\nCN=correct.example\n[leaf]\nbasicConstraints=critical,CA:FALSE\nsubjectAltName=DNS:correct.example\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n" +
      (includeIssuerKeyIdentifiers ? "authorityKeyIdentifier=keyid,issuer\n" : ""),
  );
  openssl([
    "req",
    "-new",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    "leaf.key",
    "-out",
    "leaf.csr",
    "-config",
    "leaf.conf",
  ]);
  openssl([
    "x509",
    "-req",
    "-in",
    "leaf.csr",
    "-CA",
    "root.pem",
    "-CAkey",
    "root.key",
    "-CAcreateserial",
    "-out",
    "leaf.pem",
    "-days",
    "1",
    "-extfile",
    "leaf.conf",
    "-extensions",
    "leaf",
  ]);
  const root = await fs.readFile(path.join(directory, "root.pem"), "utf8");
  const other = await fs.readFile(path.join(directory, "other.pem"), "utf8");
  assert.notEqual(new X509Certificate(root).subject, new X509Certificate(other).subject);
  const leaf = await fs.readFile(path.join(directory, "leaf.pem"), "utf8");
  await fs.mkdir(path.join(directory, "issued"));
  await fs.writeFile(path.join(directory, "index.txt"), "");
  await fs.writeFile(path.join(directory, "index.txt.attr"), "unique_subject=no\n");
  await fs.writeFile(path.join(directory, "serial.txt"), "01\n");
  await fs.writeFile(
    path.join(directory, "expired.conf"),
    "[ca]\ndefault_ca=issuer\n[issuer]\ndatabase=index.txt\nnew_certs_dir=issued\ncertificate=root.pem\nprivate_key=root.key\nserial=serial.txt\ndefault_md=sha256\nemail_in_dn=no\npolicy=policy\nx509_extensions=root_extensions\n[policy]\ncommonName=supplied\n[root_extensions]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n",
  );
  openssl(["req", "-new", "-key", "root.key", "-out", "root.csr", "-config", "root.conf"]);
  openssl([
    "ca",
    "-batch",
    "-selfsign",
    "-notext",
    "-config",
    "expired.conf",
    "-in",
    "root.csr",
    "-out",
    "expired.pem",
    "-startdate",
    "20000101000000Z",
    "-enddate",
    "20000102000000Z",
  ]);
  const expired = await fs.readFile(path.join(directory, "expired.pem"), "utf8");
  const files = createCertificateFileStore({ folder });
  await assert.rejects(files.ensureCustomRootCertificateAsync("expired.pem", expired), RootCertificateError);
  const grants = new Map<string, TrustedCertificateHostname>();
  const store = {
    listAsync: async () => [...grants.values()],
    addAsync: async (grant: TrustedCertificateHostname) => {
      grants.set(JSON.stringify([grant.hostname, grant.thumbprint]), grant);
    },
    removeAsync: async (hostname: string, thumbprint: string) => {
      grants.delete(JSON.stringify([hostname, thumbprint]));
    },
    removeByFingerprintAsync: async (thumbprint: string) => {
      for (const [key, grant] of grants) if (grant.thumbprint === thumbprint) grants.delete(key);
    },
  };
  const versions: string[] = [];
  await assert.rejects(getTrustedCertificateHostnamesAsync(), /explicit trusted certificate hostname store/);
  assert.deepEqual(await getTrustedCertificateHostnamesAsync(store), []);
  assert.deepEqual(await createTrustedCertificateHostnameReader(store).getTrustedCertificateHostnamesAsync(), []);
  const service = createCertificateService({
    files,
    hostnames: store,
    requireAdminAsync: async (authority: "admin" | "denied") => {
      assert.equal(authority, "admin", "admin required");
    },
    onTrustMaterialChangedAsync: async (effect) => {
      if (effect.kind === "trust-material-changed") versions.push(effect.version);
      await runtime?.invalidateAsync();
    },
  });
  const denied = [
    () => service.getCertificate("denied", { fileName: "root.pem" }),
    () => service.ensureRootCertificate("denied", { fileName: "root.pem", certificate: root }),
    () => service.addCertificate("denied", { file: new File([root], "root.pem") }),
    () => service.trustHostnameMismatch("denied", { hostname: "localhost", certificate: leaf }),
    () => service.removeTrustedHostname("denied", { hostname: "localhost", thumbprint: "unused" }),
    () => service.removeCertificate("denied", { fileName: "root.pem" }),
    () => service.listCertificates("denied"),
    () => service.listTrustedHostnames("denied"),
  ];
  for (const operation of denied) await assert.rejects(operation, /admin required/);
  await assert.rejects(fs.stat(folder), { code: "ENOENT" });

  const same = await Promise.all(
    Array.from({ length: 12 }, () => files.ensureCustomRootCertificateAsync("race.pem", root)),
  );
  assert.equal(same.filter((result) => result.created).length, 1);
  const different = await Promise.allSettled([
    files.ensureCustomRootCertificateAsync("different.pem", root),
    files.ensureCustomRootCertificateAsync("different.pem", other),
  ]);
  assert.equal(different.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(
    different.filter(
      (result) =>
        result.status === "rejected" &&
        result.reason instanceof RootCertificateError &&
        result.reason.code === "CONFLICT",
    ).length,
    1,
  );
  await files.removeCustomRootCertificateAsync("race.pem");
  await files.removeCustomRootCertificateAsync("different.pem");

  for (const [fileName, certificate] of [
    ["../outside.pem", root],
    ["leaf.pem", leaf],
    ["chain.pem", root + other],
    ["large.pem", "x".repeat(65537)],
    ["invalid.pem", "invalid"],
  ]) {
    assert.ok(fileName !== undefined && certificate !== undefined);
    await assert.rejects(files.ensureCustomRootCertificateAsync(fileName, certificate), RootCertificateError);
  }
  await assert.rejects(
    service.addCertificate("admin", { file: new File(["x".repeat(65537)], "large.pem") }),
    RootCertificateError,
  );
  const target = path.join(directory, "outside.pem");
  await fs.writeFile(target, root);
  await fs.symlink(target, path.join(folder, "linked.pem"));
  await assert.rejects(files.getCustomRootCertificateAsync("linked.pem"), RootCertificateError);
  await assert.rejects(files.ensureCustomRootCertificateAsync("linked.pem", root), RootCertificateError);
  await fs.unlink(path.join(folder, "linked.pem"));
  await fs.mkdir(path.join(folder, "directory.pem"));
  await assert.rejects(files.getCustomRootCertificateAsync("directory.pem"), RootCertificateError);
  await fs.rmdir(path.join(folder, "directory.pem"));
  execFileSync("/usr/bin/mkfifo", [path.join(folder, "fifo.pem")], { env: {} });
  await assert.rejects(readCertificateAsync(path.join(folder, "fifo.pem")), RootCertificateError);
  await fs.unlink(path.join(folder, "fifo.pem"));
  await fs.writeFile(path.join(folder, "oversized.pem"), Buffer.alloc(65537));
  await assert.rejects(files.getCustomRootCertificateAsync("oversized.pem"), RootCertificateError);
  await fs.unlink(path.join(folder, "oversized.pem"));
  assert.equal(await fs.readFile(target, "utf8"), root);
  assert.ok(!(await fs.readdir(folder)).some((name) => name.startsWith(".root-certificate-")));

  assert.equal(await service.getCertificate("admin", { fileName: "missing.pem" }), null);
  assert.equal(
    (await service.ensureRootCertificate("admin", { fileName: "root.pem", certificate: root })).created,
    true,
  );
  assert.equal(
    (await service.ensureRootCertificate("admin", { fileName: "root.pem", certificate: root })).created,
    false,
  );
  assert.equal(versions.length, 1);
  await service.addCertificate("admin", { file: new File([other], "other.pem") });
  assert.equal((await service.listCertificates("admin")).length, 2);
  assert.ok((await service.getCertificate("admin", { fileName: "root.pem" }))?.ca);
  await fs.writeFile(path.join(folder, "invalid.pem"), "invalid");
  assert.ok((await service.listCertificates("admin")).some((entry) => entry.kind === "invalid"));
  await fs.unlink(path.join(folder, "invalid.pem"));
  await fs.writeFile(path.join(folder, "legacy root.pem"), root);
  assert.ok((await files.loadCustomRootCertificatesAsync()).some((entry) => entry.fileName === "legacy root.pem"));
  assert.ok(await files.removeCustomRootCertificateAsync("legacy root.pem"));

  const parsed = new X509Certificate(leaf);
  openssl(["verify", "-CAfile", "root.pem", "leaf.pem"]);
  const fingerprint = parsed.fingerprint256;
  const identity = createCustomCheckServerIdentity([
    { hostname: "localhost", thumbprint: fingerprint, certificate: leaf },
  ]);
  assert.equal(identity("localhost", parsed.toLegacyObject()), undefined);
  assert.ok(identity("unrelated.example", parsed.toLegacyObject()));
  assert.ok(
    createCustomCheckServerIdentity([
      { hostname: "localhost", thumbprint: new X509Certificate(other).fingerprint256, certificate: other },
    ])("localhost", parsed.toLegacyObject()),
  );

  server = createServer(
    { key: await fs.readFile(path.join(directory, "leaf.key")), cert: leaf },
    (_request, response) => response.end("trusted"),
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const url = `https://127.0.0.1:${address.port}/`;
  runtime = createCertificateHttpRuntime({
    ...createCertificateTrustReader(files, store),
    fetch,
    proxy: { httpProxy: "", httpsProxy: "", noProxy: "*" },
  });
  await assert.rejects(runtime.fetchWithTrustedCertificatesAsync(url));
  const activeFetchRuntime = runtime;
  await service.trustHostnameMismatch("admin", { hostname: "127.0.0.1", certificate: leaf });
  assert.ok((await files.getAllTrustedCertificatesAsync()).includes(root));
  let trustedBody: string | undefined;
  await assert.doesNotReject(async () => {
    trustedBody = await (await activeFetchRuntime.fetchWithTrustedCertificatesAsync(url)).text();
  }, "installed Undici must honor the current root and fingerprint grant");
  assert.equal(trustedBody, "trusted");
  const unavailableMaterialAgent = await runtime.createHttpsAgentAsync();
  await fs.writeFile(path.join(folder, "unavailable.pem"), Buffer.alloc(65537));
  await service.removeTrustedHostname("admin", { hostname: "127.0.0.1", thumbprint: fingerprint });
  assert.equal(grants.size, 0, "Unavailable mounted material must not prevent real-fixture revocation");
  assert.throws(() => unavailableMaterialAgent.createConnection({}), /retired/);
  await fs.unlink(path.join(folder, "unavailable.pem"));
  await service.trustHostnameMismatch("admin", { hostname: "127.0.0.1", certificate: leaf });
  const bareAgent = await runtime.createHttpsAgentAsync();
  const getWithBareAgentAsync = () =>
    new Promise<void>((resolve, reject) => {
      try {
        getHttps(url, { agent: bareAgent }, (response) => {
          response.resume();
          response.on("end", resolve);
        }).on("error", reject);
      } catch (error) {
        reject(error);
      }
    });
  await getWithBareAgentAsync();
  const aborted = new AbortController();
  aborted.abort();
  const activeRuntime = runtime;
  await assert.rejects(
    withHttpRequestSignalAsync(aborted.signal, () => activeRuntime.fetchWithTrustedCertificatesAsync(url)),
  );
  const axios = await runtime.createAxiosCertificateInstanceAsync();
  assert.equal((await axios.get<string>(url)).data, "trusted");
  const list = await service.listTrustedHostnames("admin");
  assert.equal(list.length, 1);
  assert.ok(!("certificate" in (list[0] ?? {})));
  await service.removeTrustedHostname("admin", { hostname: "127.0.0.1", thumbprint: fingerprint });
  await assert.rejects(runtime.fetchWithTrustedCertificatesAsync(url));
  await assert.rejects(axios.get(url));
  await assert.rejects(getWithBareAgentAsync(), /retired/);
  await service.trustHostnameMismatch("admin", { hostname: "localhost", certificate: root });
  await service.removeCertificate("admin", { fileName: "root.pem" });
  assert.equal(grants.size, 0);
  await service.trustHostnameMismatch("admin", { hostname: "127.0.0.1", certificate: leaf });
  await assert.rejects(runtime.fetchWithTrustedCertificatesAsync(url));
  await service.removeTrustedHostname("admin", { hostname: "127.0.0.1", thumbprint: fingerprint });
  await service.removeCertificate("admin", { fileName: "other.pem" });
  assert.equal((await service.listCertificates("admin")).length, 0);
  process.env.NODE_ENV = "development";
  process.env.LOCAL_CERTIFICATE_PATH = folder;
  assert.equal((await ensureCustomRootCertificateAsync("public.pem", root)).created, true);
  assert.equal(
    (await getCustomRootCertificateAsync("public.pem"))?.fingerprint256,
    new X509Certificate(root).fingerprint256,
  );
  await addCustomRootCertificateAsync("public-other.pem", other);
  assert.equal((await loadCustomRootCertificatesAsync()).length, 2);
  assert.ok((await getAllTrustedCertificatesAsync()).includes(root));
  assert.equal(
    (await removeCustomRootCertificateAsync("public.pem"))?.fingerprint256,
    new X509Certificate(root).fingerprint256,
  );
  await removeCustomRootCertificateAsync("public-other.pem");
  await runtime.disposeAsync();
  await assert.rejects(runtime.fetchWithTrustedCertificatesAsync(url), /stopped/);
  let resolveLateMaterial: ((material: CertificateTrustMaterial) => void) | undefined;
  const lateMaterial = new Promise<CertificateTrustMaterial>((resolve) => {
    resolveLateMaterial = resolve;
  });
  const lateRuntime = createCertificateHttpRuntime({
    readTrustMaterialAsync: () => lateMaterial,
    fetch,
    proxy: { httpProxy: "", httpsProxy: "", noProxy: "*" },
  });
  const lateAgent = lateRuntime.createCertificateAgentAsync();
  await lateRuntime.disposeAsync();
  assert.ok(resolveLateMaterial);
  resolveLateMaterial(await createCertificateTrustReader(files, store).readTrustMaterialAsync());
  await assert.rejects(lateAgent, /stopped/);
  if (process.versions.bun) {
    const guardedRuntime = createCertificateHttpRuntime({
      ...createCertificateTrustReader(files, store),
      fetch,
      proxy: { httpProxy: "http://127.0.0.1:1", httpsProxy: "", noProxy: "" },
    });
    try {
      await assert.rejects(guardedRuntime.createHttpsAgentAsync(), /verified proxy-capable agent/);
      await assert.rejects(guardedRuntime.createAxiosCertificateInstanceAsync(), /verified proxy-capable agent/);
      await guardedRuntime.createCertificateAgentAsync();
    } finally {
      await guardedRuntime.disposeAsync();
    }
  }
  console.log(
    "PASS: six admin paths, trust versions, CA/race/file safety, fingerprint binding, real injected Fetch/Axios, revocation and disposal",
  );
} finally {
  try {
    await runtime?.disposeAsync();
  } finally {
    try {
      if (server?.listening) {
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) =>
          server?.close((error) => {
            if (error && !("code" in error && error.code === "ERR_SERVER_NOT_RUNNING")) reject(error);
            else resolve();
          }),
        );
      }
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  }
}
