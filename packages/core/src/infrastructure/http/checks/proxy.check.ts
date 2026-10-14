import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes, X509Certificate } from "node:crypto";
import { once } from "node:events";
import fs from "node:fs/promises";
import { Agent as HttpAgent, createServer as createHttpServer, request as requestHttp } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { Agent as HttpsAgent, createServer as createHttpsServer, request as requestHttps } from "node:https";
import { connect } from "node:net";
import type { Socket } from "node:net";
import type { Duplex } from "node:stream";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { create as createAxios, getAdapter } from "axios";
import { fetch } from "undici/index.js";

import { createCertificateHttpRuntime } from "../runtime";
import { ResourceHttpsAgent } from "../https-agent";
import type { CertificateHttpRuntime, HttpProxyResources } from "../runtime";

const directory = await fs.mkdtemp(path.join(path.dirname(fileURLToPath(import.meta.url)), ".proxy-fixture-"));
const servers: Server[] = [];
const sockets = new Set<Socket>();
const agents: (HttpAgent | HttpsAgent)[] = [];
const runtimes: CertificateHttpRuntime[] = [];
const results: { check: string; status: "pass" | "hold"; detail?: string }[] = [];
const managedCandidate = process.argv[2] === "managed-candidate";
let runtimeFactory = createCertificateHttpRuntime;
let sourceEvidence:
  | { currentSha256: string; candidateSha256: string; guardDelta: string; dependencies: Record<string, string> }
  | undefined;
const errorCodes = (error: unknown): string[] => {
  const codes: string[] = [];
  let cause = error;
  for (let depth = 0; depth < 6 && cause && typeof cause === "object"; depth++) {
    if ("code" in cause && typeof cause.code === "string" && /^[A-Z_]+$/.test(cause.code)) codes.push(cause.code);
    cause = "cause" in cause ? cause.cause : undefined;
  }
  return [...new Set(codes)];
};
const withinAsync = async <T>(operation: Promise<T>, milliseconds = 1500): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Owned fixture deadline exceeded")), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};
const trackSocket = (socket: Socket) => {
  sockets.add(socket);
  socket.on("error", () => {});
  socket.once("close", () => sockets.delete(socket));
  return socket;
};
const observePeers = (server: Server) => {
  const peers = new Map<Socket, Promise<void>>();
  server.on("connection", (socket) => {
    peers.set(
      socket,
      new Promise<void>((resolve) =>
        socket.once("close", () => {
          peers.delete(socket);
          resolve();
        }),
      ),
    );
  });
  return peers;
};
const listenAsync = async (server: Server) => {
  servers.push(server);
  server.on("connection", trackSocket);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return address.port;
};
const requestAsync = (url: string, agent: HttpAgent | HttpsAgent, signal = AbortSignal.timeout(1500)) =>
  new Promise<string>((resolve, reject) => {
    const request = (url.startsWith("https:") ? requestHttps : requestHttp)(url, { agent, signal }, (response) => {
      const chunks: Buffer[] = [];
      response.on("data", (chunk: Buffer) => chunks.push(chunk));
      response.on("error", reject);
      response.on("end", () => resolve(Buffer.concat(chunks).toString()));
    });
    request.on("error", reject);
    request.end();
  });

try {
  if (managedCandidate) {
    assert.equal(process.versions.bun, "1.4.2");
    const current = await fs.readFile(new URL("../runtime.ts", import.meta.url), "utf8");
    const guard =
      '    if (process.versions.bun && (proxy.httpProxy || proxy.httpsProxy) && proxy.noProxy !== "*") {\n      throw new Error("Configured HTTPS/Axios proxies require a verified proxy-capable agent on Bun");\n    }\n';
    assert.equal(current.split(guard).length, 2, "Candidate requires exactly the accepted guard bytes");
    const candidate = current.replace(guard, "");
    const candidateDirectory = path.join(directory, "candidate");
    await fs.mkdir(candidateDirectory);
    const dependencies: Record<string, string> = {};
    for (const name of ["request-signal", "timeout", "tls", "transport-agent", "https-agent", "ownership"]) {
      const original = fileURLToPath(new URL(`../${name}.ts`, import.meta.url));
      dependencies[name] = createHash("sha256")
        .update(await fs.readFile(original))
        .digest("hex");
      await fs.symlink(original, path.join(candidateDirectory, `${name}.ts`));
    }
    const candidatePath = path.join(candidateDirectory, "runtime.ts");
    await fs.writeFile(candidatePath, candidate);
    const loaded: { createCertificateHttpRuntime: typeof createCertificateHttpRuntime } = await import(
      pathToFileURL(candidatePath).href
    );
    runtimeFactory = loaded.createCertificateHttpRuntime;
    sourceEvidence = {
      currentSha256: createHash("sha256").update(current).digest("hex"),
      candidateSha256: createHash("sha256").update(candidate).digest("hex"),
      guardDelta:
        "Delete only the three-line Bun configured-native-proxy rejection block; every other runtime byte unchanged",
      dependencies,
    };
  }
  const openssl = (args: string[]) =>
    execFileSync("/usr/bin/openssl", args, { cwd: directory, env: {}, stdio: "pipe" });
  await fs.writeFile(
    path.join(directory, "root.conf"),
    "[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ca\n[dn]\nCN=Disposable proxy root\n[ca]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n",
  );
  await fs.writeFile(
    path.join(directory, "leaf.conf"),
    "[req]\nprompt=no\ndistinguished_name=dn\n[dn]\nCN=localhost\n[leaf]\nbasicConstraints=critical,CA:FALSE\nsubjectAltName=DNS:localhost,IP:127.0.0.1\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n",
  );
  openssl([
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
  ]);
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
    "1",
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
  const leaf = await fs.readFile(path.join(directory, "leaf.pem"), "utf8");
  const slowRequests = new Map<string, ReturnType<typeof Promise.withResolvers<void>>>();
  const slowResponses = new Map<string, ServerResponse>();
  let targetRequests = 0;
  const target = (request: IncomingMessage, response: ServerResponse) => {
    targetRequests++;
    assert.ok(request.headers["proxy-authorization"] === undefined, "Proxy credentials must not reach the target");
    if (request.url?.startsWith("/slow/")) {
      slowResponses.set(request.url, response);
      response.on("error", () => {});
      slowRequests.get(request.url)?.resolve();
      return;
    }
    if (request.url === "/redirect") {
      response.writeHead(302, { location: "/verified" });
      response.end();
      return;
    }
    response.end("verified");
  };
  const httpTarget = createHttpServer(target);
  const httpsTarget = createHttpsServer(
    { cert: leaf, key: await fs.readFile(path.join(directory, "leaf.key")) },
    target,
  );
  const targetPeers = [observePeers(httpTarget), observePeers(httpsTarget)];
  const httpPort = await listenAsync(httpTarget);
  const httpsPort = await listenAsync(httpsTarget);
  const allowedConnectPorts = new Set([httpPort, httpsPort]);
  const httpUrl = `http://127.0.0.1:${httpPort}`;
  const httpsUrl = `https://127.0.0.1:${httpsPort}`;
  const username = "fixture";
  const password = randomBytes(16).toString("hex");
  const expectedAuth = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  const createProxyAsync = async (secure = false) => {
    const counters = { connect: 0, forward: 0, authenticated: 0 };
    const forward = (request: IncomingMessage, response: ServerResponse) => {
      if (request.headers["proxy-authorization"] !== expectedAuth) {
        response.writeHead(407);
        response.end();
        return;
      }
      counters.authenticated++;
      const destination = new URL(request.url ?? "");
      assert.equal(destination.origin, httpUrl, "Fixture proxy must not forward to unowned destinations");
      counters.forward++;
      const { "proxy-authorization": _auth, "proxy-connection": _connection, ...headers } = request.headers;
      const upstream = requestHttp(destination, { method: request.method, headers, agent: false }, (result) => {
        response.writeHead(result.statusCode ?? 502, result.headers);
        result.pipe(response);
      });
      upstream.on("socket", trackSocket);
      upstream.on("error", () => response.destroy());
      response.once("close", () => upstream.destroy());
      request.pipe(upstream);
    };
    const server = secure
      ? createHttpsServer({ cert: leaf, key: await fs.readFile(path.join(directory, "leaf.key")) }, forward)
      : createHttpServer(forward);
    const peers = observePeers(server);
    server.on("connect", (request, socket, head) => {
      if (request.headers["proxy-authorization"] !== expectedAuth) {
        socket.end("HTTP/1.1 407 Proxy Authentication Required\r\nContent-Length: 0\r\n\r\n");
        return;
      }
      counters.authenticated++;
      const destination = new URL(`http://${request.url}`);
      assert.equal(destination.hostname, "127.0.0.1");
      const port = Number(destination.port);
      assert.ok(allowedConnectPorts.has(port), "Fixture CONNECT must stay on owned ports");
      counters.connect++;
      const upstream = trackSocket(
        connect({ host: "127.0.0.1", port }, () => {
          socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
          if (head.length) upstream.write(head);
          socket.pipe(upstream);
          upstream.pipe(socket);
        }),
      );
      socket.once("close", () => upstream.destroy());
      upstream.once("close", () => socket.destroy());
    });
    const port = await listenAsync(server);
    return { counters, peers, url: `http://${username}:${password}@127.0.0.1:${port}` };
  };
  const firstProxy = await createProxyAsync();
  const secondProxy = await createProxyAsync();
  const proxy: HttpProxyResources = { httpProxy: firstProxy.url, httpsProxy: secondProxy.url, noProxy: "" };
  const createRuntime = (
    configuration = proxy,
    trustedHostnames: { hostname: string; thumbprint: string; certificate: string }[] = [],
    ca = [root],
  ) => {
    const runtime = runtimeFactory({
      readTrustMaterialAsync: async () => ({ ca, trustedHostnames, version: JSON.stringify([ca, trustedHostnames]) }),
      fetch,
      proxy: configuration,
      retirementGraceMs: 10,
    });
    runtimes.push(runtime);
    return runtime;
  };
  if (managedCandidate) {
    await fs.writeFile(
      path.join(directory, "other.conf"),
      "[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ca\n[dn]\nCN=Disposable other root\n[ca]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n",
    );
    openssl([
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      "other.key",
      "-out",
      "other.pem",
      "-days",
      "1",
      "-config",
      "other.conf",
    ]);
    const other = await fs.readFile(path.join(directory, "other.pem"), "utf8");
    assert.notEqual(new X509Certificate(root).subject, new X509Certificate(other).subject);
    assert.equal(new X509Certificate(leaf).verify(new X509Certificate(root).publicKey), true);
    assert.equal(new X509Certificate(leaf).verify(new X509Certificate(other).publicKey), false);
    const mismatchedTargets: { url: string; certificate: string }[] = [];
    await fs.writeFile(
      path.join(directory, "mismatch.conf"),
      "[req]\nprompt=no\ndistinguished_name=dn\n[dn]\nCN=correct.example\n[leaf]\nbasicConstraints=critical,CA:FALSE\nsubjectAltName=DNS:correct.example\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n",
    );
    for (const [index, name] of ["mismatch", "replacement"].entries()) {
      openssl([
        "req",
        "-new",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        `${name}.key`,
        "-out",
        `${name}.csr`,
        "-config",
        "mismatch.conf",
      ]);
      openssl([
        "x509",
        "-req",
        "-in",
        `${name}.csr`,
        "-CA",
        "root.pem",
        "-CAkey",
        "root.key",
        "-set_serial",
        String(index + 2),
        "-out",
        `${name}.pem`,
        "-days",
        "1",
        "-extfile",
        "mismatch.conf",
        "-extensions",
        "leaf",
      ]);
      const certificate = await fs.readFile(path.join(directory, `${name}.pem`), "utf8");
      const server = createHttpsServer(
        { cert: certificate, key: await fs.readFile(path.join(directory, `${name}.key`)) },
        target,
      );
      targetPeers.push(observePeers(server));
      const port = await listenAsync(server);
      allowedConnectPorts.add(port);
      mismatchedTargets.push({ url: `https://127.0.0.1:${port}`, certificate });
    }
    for (const name of ["root", "other", "leaf", "mismatch", "replacement"]) {
      const metadata = openssl(["x509", "-in", `${name}.pem`, "-text", "-noout"]).toString();
      assert.ok(
        !metadata.includes("Subject Key Identifier") && !metadata.includes("Authority Key Identifier"),
        "Managed proof must remain sparse PKI",
      );
    }
    const watchedPeers = [firstProxy.peers, secondProxy.peers, ...targetPeers];
    const disposeManagedAsync = async (runtime: CertificateHttpRuntime) => {
      const closed = watchedPeers.flatMap((peers) => [...peers.values()]);
      const disposal = runtime.disposeAsync();
      assert.equal(runtime.disposeAsync(), disposal);
      await withinAsync(disposal);
      await withinAsync(Promise.all(closed));
      await assert.rejects(runtime.createHttpsAgentAsync(), /stopped/);
      await assert.rejects(runtime.createAxiosCertificateInstanceAsync(), /stopped/);
    };
    const managedCheckAsync = async (check: string, operation: () => Promise<void>) => {
      try {
        await operation();
        results.push({ check, status: "pass" });
      } catch (error) {
        results.push({
          check,
          status: "hold",
          detail: errorCodes(error).join(",") || "Bounded managed assertion/deadline failure; request/config omitted",
        });
      }
    };
    const executeManagedAsync = async (
      runtime: CertificateHttpRuntime,
      client: "https" | "axios",
      url: string,
      signal = AbortSignal.timeout(1500),
    ) => {
      if (client === "https") return requestAsync(url, await runtime.createHttpsAgentAsync(), signal);
      const axiosClient = await runtime.createAxiosCertificateInstanceAsync();
      assert.equal(getAdapter(axiosClient.defaults.adapter).name, "http");
      return (await axiosClient.get<string>(url, { signal })).data;
    };
    await managedCheckAsync("current-source-bun-managed-proxy-guard", async () => {
      const baseline = createCertificateHttpRuntime({
        readTrustMaterialAsync: async () => ({
          ca: [root],
          trustedHostnames: [],
          version: "explicit-fixture-baseline",
        }),
        fetch,
        proxy,
      });
      runtimes.push(baseline);
      const before = targetRequests;
      await assert.rejects(baseline.createHttpsAgentAsync(), /verified proxy-capable agent/);
      await assert.rejects(baseline.createAxiosCertificateInstanceAsync(), /verified proxy-capable agent/);
      assert.equal(targetRequests, before);
      await disposeManagedAsync(baseline);
    });
    const mismatch = mismatchedTargets[0];
    const replacement = mismatchedTargets[1];
    assert.ok(mismatch && replacement);
    const grant = {
      hostname: "127.0.0.1",
      thumbprint: new X509Certificate(mismatch.certificate).fingerprint256,
      certificate: mismatch.certificate,
    };
    for (const client of ["https", "axios"] as const) {
      for (const policy of [
        "mismatch-denied",
        "exact-grant",
        "wrong-fingerprint",
        "changed-leaf",
        "wrong-hostname",
        "grant-untrusted-chain",
      ]) {
        await managedCheckAsync(`managed-${client}-trust-${policy}`, async () => {
          const grants =
            policy === "mismatch-denied"
              ? []
              : policy === "wrong-fingerprint"
                ? [{ ...grant, thumbprint: new X509Certificate(leaf).fingerprint256 }]
                : policy === "wrong-hostname"
                  ? [{ ...grant, hostname: "different.example" }]
                  : [grant];
          const runtime = createRuntime(proxy, grants, policy === "grant-untrusted-chain" ? [other] : [other, root]);
          const destination = policy === "changed-leaf" ? replacement.url : mismatch.url;
          try {
            if (policy === "exact-grant")
              assert.equal(await executeManagedAsync(runtime, client, `${destination}/verified`), "verified");
            else
              await assert.rejects(executeManagedAsync(runtime, client, `${destination}/verified`), (error: unknown) =>
                errorCodes(error).includes(
                  policy === "grant-untrusted-chain"
                    ? "UNABLE_TO_VERIFY_LEAF_SIGNATURE"
                    : "ERR_TLS_CERT_ALTNAME_INVALID",
                ),
              );
          } finally {
            await disposeManagedAsync(runtime);
          }
        });
      }
      await managedCheckAsync(`managed-${client}-proxy-auth-denial-no-fallback`, async () => {
        const runtime = createRuntime({
          ...proxy,
          httpsProxy: secondProxy.url.replace(password, "invalid-fixture-password"),
        });
        const before = targetRequests;
        try {
          await assert.rejects(executeManagedAsync(runtime, client, `${httpsUrl}/verified`));
          assert.equal(targetRequests, before);
        } finally {
          await disposeManagedAsync(runtime);
        }
      });
      await managedCheckAsync(`managed-${client}-late-target-response-after-retirement`, async () => {
        const runtime = createRuntime();
        const route = `/slow/managed-late-${client}`;
        const entered = Promise.withResolvers<void>();
        slowRequests.set(route, entered);
        const controller = new AbortController();
        const outcome = executeManagedAsync(runtime, client, httpsUrl + route, controller.signal).then(
          () => "unexpected-success",
          () => "rejected",
        );
        try {
          await withinAsync(entered.promise);
          const disposal = runtime.disposeAsync();
          assert.equal(runtime.disposeAsync(), disposal);
          slowResponses.get(route)?.end("late-fixture-response");
          assert.equal(await withinAsync(outcome), "rejected");
          await withinAsync(disposal);
        } finally {
          controller.abort();
          await disposeManagedAsync(runtime);
        }
      });
    }
    for (const client of ["https", "axios"] as const) {
      for (const noProxy of ["", "*", "127.0.0.1", `127.0.0.1:${httpsPort}`, `127.0.0.1:${httpPort}`]) {
        await managedCheckAsync(
          `managed-${client}-route-noProxy-${noProxy === "" ? "empty" : noProxy === "*" ? "wildcard" : noProxy.includes(":") ? (noProxy.endsWith(String(httpsPort)) ? "matching-port" : "other-port") : "exact-host"}`,
          async () => {
            const runtime = createRuntime({ ...proxy, noProxy });
            const before = secondProxy.counters.connect;
            try {
              assert.equal(await executeManagedAsync(runtime, client, `${httpsUrl}/verified`), "verified");
              assert.equal(secondProxy.counters.connect > before, noProxy === "" || noProxy.endsWith(String(httpPort)));
            } finally {
              await disposeManagedAsync(runtime);
            }
          },
        );
      }
    }
    const secureProxy = await createProxyAsync(true);
    watchedPeers.push(secureProxy.peers);
    const secureConfiguration = {
      httpProxy: secureProxy.url.replace("http:", "https:"),
      httpsProxy: secureProxy.url.replace("http:", "https:"),
      noProxy: "",
    };
    for (const client of ["https", "axios"] as const) {
      await managedCheckAsync(`managed-${client}-https-proxy-route`, async () => {
        const runtime = createRuntime(secureConfiguration);
        const before = secureProxy.counters.connect;
        const beforeTarget = targetRequests;
        try {
          assert.equal(await executeManagedAsync(runtime, client, `${httpsUrl}/verified`), "verified");
          assert.ok(secureProxy.counters.connect > before);
        } catch (error) {
          assert.equal(secureProxy.counters.connect, before, "TLS proxy failure must precede CONNECT");
          assert.equal(targetRequests, beforeTarget, "TLS proxy failure must not fall back directly to the target");
          throw error;
        } finally {
          await disposeManagedAsync(runtime);
        }
      });
      for (const action of ["abort", "invalidate", "dispose", "late-connect", "failed-connect"]) {
        await managedCheckAsync(`managed-${client}-pending-connect-${action}`, async () => {
          const entered = Promise.withResolvers<{ socket: Duplex; closed: Promise<void> }>();
          const server = createHttpServer();
          server.on("connect", (request, socket) => {
            assert.ok(
              request.headers["proxy-authorization"] === expectedAuth,
              "Generated proxy authentication required",
            );
            assert.equal(request.url, `127.0.0.1:${httpsPort}`);
            socket.resume();
            socket.once("end", () => socket.end());
            entered.resolve({ socket, closed: new Promise<void>((resolve) => socket.once("close", resolve)) });
            if (action === "failed-connect")
              socket.write("HTTP/1.1 407 Proxy Authentication Required\r\nContent-Length: 0\r\n\r\n");
          });
          const port = await listenAsync(server);
          const runtime = createRuntime({
            httpProxy: "",
            httpsProxy: `http://${username}:${password}@127.0.0.1:${port}`,
            noProxy: "",
          });
          const controller = new AbortController();
          const outcome = executeManagedAsync(runtime, client, `${httpsUrl}/verified`, controller.signal).then(
            () => "unexpected-success",
            () => "rejected",
          );
          const before = targetRequests;
          try {
            const peer = await withinAsync(entered.promise);
            let retirement: Promise<void> | undefined;
            if (action === "abort") controller.abort();
            if (action === "invalidate") retirement = runtime.invalidateAsync();
            if (action === "dispose" || action === "late-connect") {
              retirement = runtime.disposeAsync();
              assert.equal(runtime.disposeAsync(), retirement);
            }
            if (action === "late-connect") peer.socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
            await withinAsync(peer.closed);
            assert.equal(await withinAsync(outcome), "rejected");
            if (retirement) await withinAsync(retirement);
            assert.equal(targetRequests, before, "A pending/failed/retired tunnel must not fall back to the target");
          } finally {
            controller.abort();
            await disposeManagedAsync(runtime);
          }
        });
      }
    }
    for (const action of ["route", "abort", "dispose"]) {
      await managedCheckAsync(`managed-axios-plain-http-${action}`, async () => {
        const runtime = createRuntime();
        const route = `/slow/managed-http-${action}`;
        const entered = Promise.withResolvers<void>();
        slowRequests.set(route, entered);
        const controller = new AbortController();
        try {
          const before = firstProxy.counters.forward;
          if (action === "route")
            assert.equal(await executeManagedAsync(runtime, "axios", `${httpUrl}/verified`), "verified");
          else {
            const outcome = executeManagedAsync(runtime, "axios", httpUrl + route, controller.signal).then(
              () => "unexpected-success",
              () => "rejected",
            );
            await withinAsync(entered.promise);
            if (action === "abort") controller.abort();
            else await withinAsync(runtime.disposeAsync());
            assert.equal(await withinAsync(outcome), "rejected");
          }
          assert.ok(firstProxy.counters.forward > before);
        } finally {
          controller.abort();
          await disposeManagedAsync(runtime);
        }
      });
    }
    assert.ok(sourceEvidence);
    assert.equal(
      createHash("sha256")
        .update(await fs.readFile(new URL("../runtime.ts", import.meta.url)))
        .digest("hex"),
      sourceEvidence.currentSha256,
    );
    for (const [name, expected] of Object.entries(sourceEvidence.dependencies)) {
      assert.equal(
        createHash("sha256")
          .update(await fs.readFile(new URL(`../${name}.ts`, import.meta.url)))
          .digest("hex"),
        expected,
        "Frozen transport source changed during candidate proof",
      );
    }
    await withinAsync(
      Promise.all([...sockets].map((socket) => new Promise<void>((resolve) => socket.once("close", resolve)))),
    );
    assert.equal(sockets.size, 0, "Managed native sockets must settle before fixture cleanup");
    assert.ok(
      watchedPeers.every((peers) => peers.size === 0),
      "Every observed target/proxy peer must physically close",
    );
    const evidence = {
      runtime: `bun-${process.versions.bun}`,
      mode: "isolated-guard-only-candidate",
      sourceEvidence,
      fixture: { sparsePki: true, distinctRootSubjects: true, noFactoryOverrides: true, actualManagedRuntime: true },
      cleanup: { nativeSettledBeforeFixtureCleanup: true, remainingSockets: sockets.size },
      results,
    };
    const encoded = JSON.stringify(evidence, null, 2);
    assert.ok(
      !encoded.includes(password) && !encoded.includes(expectedAuth),
      "Evidence must not contain generated proxy credentials",
    );
    console.log(encoded);
    await fs.writeFile(
      new URL("proxy-managed-results.json", import.meta.url),
      JSON.stringify(evidence, null, 2) + "\n",
    );
  } else {
    const proxyEnv = { HTTP_PROXY: proxy.httpProxy, HTTPS_PROXY: proxy.httpsProxy, NO_PROXY: proxy.noProxy };
    const nativeHttp = new HttpAgent({ proxyEnv });
    const nativeHttps = new HttpsAgent({ ca: [root], proxyEnv });
    agents.push(nativeHttp, nativeHttps);
    const axios = createAxios({ httpAgent: nativeHttp, httpsAgent: nativeHttps, proxy: false });
    assert.equal(getAdapter(axios.defaults.adapter).name, "http");
    for (const [name, operation, selectedProxy] of [
      ["native-http", () => requestAsync(`${httpUrl}/verified`, nativeHttp), firstProxy],
      ["native-https", () => requestAsync(`${httpsUrl}/verified`, nativeHttps), secondProxy],
      [
        "axios-native-http",
        async () => (await axios.get<string>(`${httpUrl}/verified`, { signal: AbortSignal.timeout(1500) })).data,
        firstProxy,
      ],
      [
        "axios-native-https",
        async () => (await axios.get<string>(`${httpsUrl}/redirect`, { signal: AbortSignal.timeout(1500) })).data,
        secondProxy,
      ],
    ] as const) {
      const before = selectedProxy.counters.connect + selectedProxy.counters.forward;
      assert.equal(await operation(), "verified");
      const routed = selectedProxy.counters.connect + selectedProxy.counters.forward > before;
      results.push({
        check: name,
        status: routed ? "pass" : "hold",
        detail: routed
          ? "Authenticated owned proxy observed"
          : "proxyEnv silently bypassed: production rejection must remain",
      });
    }
    const runtime = createRuntime();
    const beforeFetch = secondProxy.counters.connect;
    assert.equal(
      await (await runtime.fetchWithTrustedCertificatesAsync(`${httpsUrl}/verified`, { timeout: 1500 })).text(),
      "verified",
    );
    assert.ok(secondProxy.counters.connect > beforeFetch);
    results.push({ check: "runtime-fetch-https", status: "pass" });
    const fallback = createRuntime({ httpProxy: firstProxy.url, httpsProxy: "", noProxy: "" });
    const beforeFallback = firstProxy.counters.connect;
    assert.equal(
      await (await fallback.fetchWithTrustedCertificatesAsync(`${httpsUrl}/verified`, { timeout: 1500 })).text(),
      "verified",
    );
    assert.ok(firstProxy.counters.connect > beforeFallback);
    results.push({ check: "runtime-fetch-http-proxy-fallback", status: "pass" });
    const bypass = createRuntime({ ...proxy, noProxy: "*" });
    const beforeBypass = secondProxy.counters.connect;
    assert.equal(
      await (await bypass.fetchWithTrustedCertificatesAsync(`${httpsUrl}/verified`, { timeout: 1500 })).text(),
      "verified",
    );
    assert.equal(secondProxy.counters.connect, beforeBypass);
    results.push({ check: "explicit-no-proxy", status: "pass" });
    const untrusted = createRuntime(
      proxy,
      [{ hostname: "127.0.0.1", thumbprint: new X509Certificate(leaf).fingerprint256, certificate: leaf }],
      [],
    );
    await assert.rejects(untrusted.fetchWithTrustedCertificatesAsync(`${httpsUrl}/verified`, { timeout: 1500 }));
    results.push({ check: "fingerprint-grant-does-not-bypass-chain", status: "pass" });
    const deniedProxy = createRuntime({
      httpProxy: firstProxy.url.replace(password, "invalid-fixture-password"),
      httpsProxy: "",
      noProxy: "",
    });
    const beforeDenial = targetRequests;
    await assert.rejects(deniedProxy.fetchWithTrustedCertificatesAsync(`${httpsUrl}/verified`, { timeout: 1500 }));
    assert.equal(targetRequests, beforeDenial, "Proxy failure must not fall back to a direct connection");
    results.push({ check: "proxy-auth-denial-no-direct-fallback", status: "pass" });
    for (const [name, operation] of [
      ["fetch", (url: string, signal: AbortSignal) => runtime.fetchWithTrustedCertificatesAsync(url, { signal })],
      ["https", (url: string, signal: AbortSignal) => requestAsync(url, nativeHttps, signal)],
      ["axios", (url: string, signal: AbortSignal) => axios.get(url, { signal })],
    ] as const) {
      const route = `/slow/${name}`;
      const entered = Promise.withResolvers<void>();
      slowRequests.set(route, entered);
      const controller = new AbortController();
      const rejected = assert.rejects(operation(httpsUrl + route, controller.signal));
      await withinAsync(entered.promise);
      controller.abort();
      await rejected;
      results.push({ check: `${name}-proxy-cancellation`, status: "pass" });
    }
    let pendingConnect = Promise.withResolvers<{ socket: Duplex; closed: Promise<void> }>();
    const pendingProxyServer = createHttpServer();
    pendingProxyServer.on("connect", (_request, socket) => {
      const closed = new Promise<void>((resolve) => socket.once("close", resolve));
      socket.once("end", () => socket.end());
      socket.resume();
      pendingConnect.resolve({ socket, closed });
    });
    const pendingProxyPort = await listenAsync(pendingProxyServer);
    const pendingProxy = { httpProxy: "", httpsProxy: `http://127.0.0.1:${pendingProxyPort}`, noProxy: "" };
    for (const kind of [
      "native-destroy",
      "native-abort",
      "axios-abort",
      "runtime-fetch-dispose",
      ...(!process.versions.bun
        ? [
            "runtime-native-dispose",
            "runtime-native-abort",
            "runtime-axios-dispose",
            "runtime-axios-abort",
            "runtime-native-late-connect",
          ]
        : []),
    ]) {
      pendingConnect = Promise.withResolvers();
      const controller = new AbortController();
      const owned = kind.startsWith("runtime-") ? createRuntime(pendingProxy) : undefined;
      const agent = kind.startsWith("runtime-native-")
        ? await owned?.createHttpsAgentAsync()
        : new ResourceHttpsAgent({
            ca: [root],
            proxyEnv: { HTTP_PROXY: "", HTTPS_PROXY: pendingProxy.httpsProxy, NO_PROXY: "" },
          });
      assert.ok(agent);
      agents.push(agent);
      const client = kind.startsWith("runtime-axios-")
        ? await owned?.createAxiosCertificateInstanceAsync()
        : createAxios({ httpsAgent: agent, proxy: false });
      const selectedAgent =
        client?.defaults.httpsAgent instanceof ResourceHttpsAgent && kind.includes("axios")
          ? client.defaults.httpsAgent
          : agent;
      const localSockets = new Set<Duplex>();
      const nativeConnect = selectedAgent.createConnection.bind(selectedAgent);
      selectedAgent.createConnection = (options, callback) => {
        const stream = nativeConnect(options, callback);
        if (stream) {
          localSockets.add(stream);
          stream.once("close", () => localSockets.delete(stream));
        }
        return stream;
      };
      const operation =
        kind === "runtime-fetch-dispose"
          ? owned?.fetchWithTrustedCertificatesAsync(`${httpsUrl}/verified`, { signal: controller.signal })
          : kind.includes("axios")
            ? client?.get(`${httpsUrl}/verified`, { signal: controller.signal })
            : requestAsync(`${httpsUrl}/verified`, agent, controller.signal);
      assert.ok(operation);
      const outcome = operation.then(
        () => "unexpected-success",
        () => "rejected",
      );
      const pending = await withinAsync(pendingConnect.promise);
      const disposal = owned && !kind.endsWith("abort") ? owned.disposeAsync() : undefined;
      const checkedDisposal = disposal?.then(() => localSockets.size);
      if (disposal && owned)
        assert.equal(owned.disposeAsync(), disposal, "Overlapping disposal must return the same completion");
      if (kind === "native-destroy") agent.destroy();
      if (kind.endsWith("abort")) controller.abort();
      if (kind.endsWith("late-connect")) pending.socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      await withinAsync(pending.closed);
      assert.equal(await withinAsync(outcome), "rejected");
      if (checkedDisposal)
        assert.equal(
          await withinAsync(checkedDisposal),
          0,
          "Disposal must await the actual returned native socket close",
        );
      results.push({
        check: `pending-connect-${kind}`,
        status: "pass",
        detail: "Real proxy socket close and request rejection awaited without fixture intervention",
      });
      if (owned) await withinAsync(owned.disposeAsync());
    }
    const directPeer = Promise.withResolvers<{ closed: Promise<void> }>();
    let enteredDirectPeer = directPeer;
    const directServer = createHttpServer();
    directServer.on("connection", (socket) => {
      socket.resume();
      socket.once("end", () => socket.end());
      enteredDirectPeer.resolve({ closed: new Promise<void>((resolve) => socket.once("close", resolve)) });
    });
    const directPort = await listenAsync(directServer);
    for (const kind of ["destroy", "abort", "runtime-dispose"]) {
      enteredDirectPeer = Promise.withResolvers();
      const owned =
        kind === "runtime-dispose" ? createRuntime({ httpProxy: "", httpsProxy: "", noProxy: "" }) : undefined;
      const agent = owned ? await owned.createHttpsAgentAsync() : new ResourceHttpsAgent({ ca: [root] });
      agents.push(agent);
      const controller = new AbortController();
      const outcome = requestAsync(`https://127.0.0.1:${directPort}/`, agent, controller.signal).then(
        () => "unexpected-success",
        () => "rejected",
      );
      const peer = await withinAsync(enteredDirectPeer.promise);
      if (kind === "destroy") agent.destroy();
      if (kind === "abort") controller.abort();
      const disposal = owned?.disposeAsync();
      await withinAsync(peer.closed);
      assert.equal(await withinAsync(outcome), "rejected");
      if (disposal) await withinAsync(disposal);
      results.push({
        check: `pending-direct-tls-${kind}`,
        status: "pass",
        detail: "Real direct TLS peer closed without fixture intervention",
      });
    }
    const failedPeer = Promise.withResolvers<{ closed: Promise<void> }>();
    const failedServer = createHttpServer();
    failedServer.on("connect", (_request, socket) => {
      socket.resume();
      socket.once("end", () => socket.end());
      failedPeer.resolve({ closed: new Promise<void>((resolve) => socket.once("close", resolve)) });
      socket.write("HTTP/1.1 407 Proxy Authentication Required\r\nContent-Length: 0\r\n\r\n");
    });
    const failedPort = await listenAsync(failedServer);
    const failedAgent = new ResourceHttpsAgent({
      ca: [root],
      proxyEnv: { HTTP_PROXY: "", HTTPS_PROXY: `http://127.0.0.1:${failedPort}`, NO_PROXY: "" },
    });
    agents.push(failedAgent);
    const failedRequest = assert.rejects(requestAsync(`${httpsUrl}/verified`, failedAgent));
    const failedConnection = await withinAsync(failedPeer.promise);
    await withinAsync(failedRequest);
    await withinAsync(failedConnection.closed);
    failedAgent.destroy();
    results.push({
      check: "failed-connect-physical-close",
      status: "pass",
      detail: "407 callback rejects and closes undelivered socket without fixture intervention",
    });
    if (process.versions.bun) {
      const beforeGuard = targetRequests;
      await assert.rejects(runtime.createHttpsAgentAsync(), /verified proxy-capable agent/);
      await assert.rejects(runtime.createAxiosCertificateInstanceAsync(), /verified proxy-capable agent/);
      assert.equal(targetRequests, beforeGuard);
      results.push({ check: "runtime-native-proxy-fail-closed", status: "pass" });
    } else {
      const agent = await runtime.createHttpsAgentAsync();
      assert.equal(await requestAsync(`${httpsUrl}/verified`, agent), "verified");
      const client = await runtime.createAxiosCertificateInstanceAsync();
      assert.equal(
        (await client.get<string>(`${httpsUrl}/verified`, { signal: AbortSignal.timeout(1500) })).data,
        "verified",
      );
      results.push({ check: "runtime-node-native-proxy", status: "pass" });
    }
    await Promise.all(runtimes.map((owned) => owned.disposeAsync()));
    await assert.rejects(runtime.fetchWithTrustedCertificatesAsync(`${httpsUrl}/verified`), /stopped/);
    results.push({ check: "runtime-proxy-disposal", status: "pass" });
    console.log(
      JSON.stringify(
        { runtime: process.versions.bun ? `bun-${process.versions.bun}` : `node-${process.versions.node}`, results },
        null,
        2,
      ),
    );
    await fs.writeFile(
      new URL(`proxy-r3-${process.versions.bun ? "bun" : "node"}-results.json`, import.meta.url),
      JSON.stringify(results, null, 2) + "\n",
    );
  }
  if (results.some((result) => result.status === "hold")) process.exitCode = 1;
} catch (error) {
  const code =
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string" &&
    /^[A-Z_]+$/.test(error.code)
      ? error.code
      : "FIXTURE_FAILURE";
  console.error(
    JSON.stringify({
      status: "fail",
      code,
      detail: "Redacted proxy fixture failure; no request/agent credentials emitted",
    }),
  );
  process.exitCode = 1;
} finally {
  try {
    for (const agent of agents) agent.destroy();
    const retiring = runtimes.map((runtime) => runtime.disposeAsync());
    const closed = [...sockets].map(
      (socket) =>
        new Promise<void>((resolve) => {
          socket.once("close", resolve);
          socket.destroy();
        }),
    );
    await Promise.all(closed);
    const outcomes = await Promise.allSettled(retiring);
    if (outcomes.some((outcome) => outcome.status === "rejected")) process.exitCode = 1;
    await Promise.all(
      servers.map(
        (server) =>
          new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
      ),
    );
    assert.equal(sockets.size, 0);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}
