import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
import { once } from "node:events";
import fs from "node:fs/promises";
import { Agent as HttpsAgent, createServer, get } from "node:https";
import path from "node:path";
import { checkServerIdentity, createSecureContext, rootCertificates } from "node:tls";
import { fileURLToPath } from "node:url";
import { create as createAxios } from "axios";
import { Agent, fetch } from "undici/index.js";

const directory = await fs.mkdtemp(path.join(path.dirname(fileURLToPath(import.meta.url)), ".interop-fixture-"));
const rows = [];
const generations = Number(process.argv[2] ?? 6);
const collision = process.argv[3] === "collision";
assert.ok(Number.isInteger(generations) && generations > 0 && generations <= 12);
const errorCodes = (error) => {
  const codes = [];
  for (let cause = error; cause && typeof cause === "object"; cause = cause.cause) {
    if (typeof cause.code === "string") codes.push(cause.code);
  }
  return codes;
};
try {
  for (let generation = 1; generation <= generations; generation++) {
    const openssl = (args) => execFileSync("/usr/bin/openssl", args, { cwd: directory, env: {}, stdio: "pipe" });
    await fs.writeFile(
      path.join(directory, "root.conf"),
      "[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ca\n[dn]\nCN=Disposable root\n[ca]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n",
    );
    await fs.writeFile(
      path.join(directory, "leaf.conf"),
      "[req]\nprompt=no\ndistinguished_name=dn\n[dn]\nCN=correct.example\n[leaf]\nbasicConstraints=critical,CA:FALSE\nsubjectAltName=DNS:correct.example\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n",
    );
    for (const name of ["root", "other"]) {
      await fs.writeFile(
        path.join(directory, `${name}.conf`),
        `[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ca\n[dn]\nCN=Disposable ${collision ? "root" : name}\n[ca]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n`,
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
      "-set_serial",
      String(generation),
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
    const leaf = await fs.readFile(path.join(directory, "leaf.pem"), "utf8");
    const parsed = new X509Certificate(leaf);
    assert.equal(new X509Certificate(root).subject === new X509Certificate(other).subject, collision);
    console.log(
      JSON.stringify({
        generation,
        rootSubject: new X509Certificate(root).subject,
        otherSubject: new X509Certificate(other).subject,
        leafIssuer: parsed.issuer,
        rootSerial: new X509Certificate(root).serialNumber,
        otherSerial: new X509Certificate(other).serialNumber,
      }),
    );
    assert.ok(parsed.verify(new X509Certificate(root).publicKey));
    assert.equal(parsed.verify(new X509Certificate(other).publicKey), false);
    assert.match(openssl(["verify", "-CAfile", "root.pem", "leaf.pem"]).toString(), /OK/);
    await fs.writeFile(path.join(directory, "pair.pem"), other + root);
    const pairVerification = (() => {
      try {
        openssl(["verify", "-CAfile", "pair.pem", "leaf.pem"]);
        return "pass";
      } catch {
        return "fail";
      }
    })();
    rows.push({ generation, mode: "openssl-pair", client: "openssl", status: pairVerification });
    const server = createServer(
      { cert: leaf, key: await fs.readFile(path.join(directory, "leaf.key")) },
      (_request, response) => response.end("verified"),
    );
    const sockets = new Set();
    server.on("connection", (socket) => {
      sockets.add(socket);
      socket.once("close", () => sockets.delete(socket));
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const url = `https://127.0.0.1:${server.address().port}/`;
    const identity = (hostname, peer) =>
      hostname === "127.0.0.1" && peer.fingerprint256 === parsed.fingerprint256
        ? undefined
        : checkServerIdentity(hostname, peer);
    const bundle = [...rootCertificates, other, root];
    const modes = {
      "root-ca": { ca: [root] },
      "pair-ca": { ca: [other, root] },
      "bundle-ca": { ca: bundle },
      "bundle-context-ca": { ca: bundle, secureContext: createSecureContext({ ca: bundle }) },
      "bundle-context-only": { secureContext: createSecureContext({ ca: bundle }) },
      "joined-ca": { ca: bundle.join("\n") },
      "root-first-ca": { ca: [root, other, ...rootCertificates] },
      "normal-bundle": { ca: bundle, servername: "correct.example" },
      "mismatched-bundle": { ca: bundle, servername: "wrong.example" },
    };
    try {
      for (const [mode, tls] of Object.entries(modes)) {
        for (const client of ["fetch", "https", "axios"]) {
          const dispatcher =
            client === "fetch"
              ? new Agent({ connect: { ...tls, checkServerIdentity: identity, timeout: 1000, maxCachedSessions: 0 } })
              : undefined;
          const agent =
            client !== "fetch"
              ? new HttpsAgent({ ...tls, checkServerIdentity: identity, maxCachedSessions: 0 })
              : undefined;
          try {
            if (client === "fetch")
              assert.equal(
                await (await fetch(url, { dispatcher, signal: AbortSignal.timeout(1500) })).text(),
                "verified",
              );
            if (client === "https")
              await new Promise((resolve, reject) =>
                get(url, { agent, signal: AbortSignal.timeout(1500) }, (response) => {
                  response.resume();
                  response.on("end", resolve);
                }).on("error", reject),
              );
            if (client === "axios")
              assert.equal(
                (
                  await createAxios({ httpsAgent: agent, proxy: false, adapter: "http" }).get(url, {
                    signal: AbortSignal.timeout(1500),
                  })
                ).data,
                "verified",
              );
            rows.push({ generation, mode, client, status: mode === "mismatched-bundle" ? "fail" : "pass" });
          } catch (error) {
            const codes = errorCodes(error);
            rows.push({
              generation,
              mode,
              client,
              status: mode === "mismatched-bundle" && codes.includes("ERR_TLS_CERT_ALTNAME_INVALID") ? "pass" : "fail",
              codes,
            });
          } finally {
            await dispatcher?.destroy();
            agent?.destroy();
          }
        }
      }
    } finally {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }
  }
  for (const mode of new Set(rows.map((row) => row.mode))) {
    for (const client of mode === "openssl-pair" ? ["openssl"] : ["fetch", "https", "axios"]) {
      const group = rows.filter((row) => row.mode === mode && row.client === client);
      console.log(
        JSON.stringify({
          runtime: process.versions.bun ? `bun-${process.versions.bun}` : `node-${process.versions.node}`,
          mode,
          client,
          passes: group.filter((row) => row.status === "pass").length,
          total: group.length,
          failures: group.filter((row) => row.status === "fail"),
        }),
      );
    }
  }
  await fs.writeFile(
    new URL(
      `tls-interop-${process.versions.bun ? "bun" : "node"}-${collision ? "collision" : "distinct"}.json`,
      import.meta.url,
    ),
    JSON.stringify(rows, null, 2) + "\n",
  );
  if (!collision)
    assert.ok(
      rows.every((row) => row.status === "pass"),
      "Distinct sparse roots must preserve verified chain, normal identity and mismatch denial in every client",
    );
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
