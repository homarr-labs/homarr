import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes, X509Certificate } from "node:crypto";
import { once } from "node:events";
import fs from "node:fs/promises";
import type { Server } from "node:http";
import { Agent, createServer, request } from "node:https";
import type { RequestOptions } from "node:https";
import { connect as connectNet, isIP, Socket } from "node:net";
import path from "node:path";
import { Readable } from "node:stream";
import type { Duplex } from "node:stream";
import { checkServerIdentity, connect as connectTls } from "node:tls";
import { fileURLToPath } from "node:url";
import { create as createAxios, getAdapter } from "axios";
import { buildConnector, Client } from "undici/index.js";

type Phase = "registered" | "handoff" | "target-tls" | "delivered";
interface ProbeOptions {
  proxy: URL;
  proxyCa: string;
  targetCa: string;
  signal: AbortSignal;
  grant?: { hostname: string; fingerprint: string };
  onPhase?: (phase: Phase) => void | Promise<void>;
  failRelease?: boolean;
}
interface Transaction {
  id: number;
  controller: AbortController;
  client?: Client;
  state: Phase | "closing" | "failed";
  streams: Set<Duplex>;
  failure?: unknown;
  completion?: Promise<void>;
  destruction?: Promise<void>;
}
const deadline = async <T,>(operation: Promise<T>, milliseconds = 1800): Promise<T> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Owned feasibility deadline exceeded")), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};
const codes = (error: unknown): string[] => {
  const found: string[] = [];
  let cause = error;
  for (let depth = 0; depth < 8 && cause && typeof cause === "object"; depth++) {
    if ("code" in cause && typeof cause.code === "string" && /^[A-Z_]+$/.test(cause.code)) found.push(cause.code);
    cause = "cause" in cause ? cause.cause : undefined;
  }
  return [...new Set(found)];
};

class ConnectorProbeAgent extends Agent {
  readonly transactions = new Map<number, Transaction>();
  readonly closedStreams = new Map<Duplex, Promise<void>>();
  readonly observations = {
    registeredBeforeIo: 0,
    outerSockets: 0,
    handoffs: 0,
    targetTls: 0,
    delivered: 0,
    callbacks: 0,
    rejectedCallbacks: 0,
    cancellationAfterHandoff: 0,
    releaseFailures: 0,
  };
  private retired = false;
  private disposal: Promise<void> | undefined;
  private failures: unknown[] = [];

  constructor(private readonly probe: ProbeOptions) {
    super({ keepAlive: false, maxCachedSessions: 0 });
  }

  private track(transaction: Transaction, stream: Duplex) {
    transaction.streams.add(stream);
    if (!this.closedStreams.has(stream)) {
      const closed = stream.closed ? Promise.resolve() : new Promise<void>((resolve) => stream.once("close", resolve));
      this.closedStreams.set(stream, closed);
    }
    stream.on("error", () => {});
    if (this.retired || transaction.controller.signal.aborted) stream.destroy();
  }

  private destroyStreams(transaction: Transaction) {
    for (const stream of transaction.streams) {
      try {
        stream.destroy();
      } catch (error) {
        this.failures.push(error);
      }
    }
  }

  private destroyClient(transaction: Transaction) {
    if (!transaction.destruction) {
      try {
        transaction.destruction = transaction.client?.destroy() ?? Promise.resolve();
      } catch (error) {
        transaction.destruction = Promise.reject(error);
      }
      void transaction.destruction.catch(() => {});
    }
    return transaction.destruction;
  }

  createConnection(options: RequestOptions, callback?: (error: Error | null, stream: Duplex) => void): undefined {
    assert.ok(callback, "Probe requires actual native Agent callback");
    const transaction: Transaction = {
      id: this.observations.registeredBeforeIo + 1,
      controller: new AbortController(),
      state: "registered",
      streams: new Set(),
    };
    this.transactions.set(transaction.id, transaction);
    this.observations.registeredBeforeIo++;
    let called = false;
    const finish = (error: Error | null, stream?: Duplex) => {
      if (called) {
        if (stream && (this.retired || transaction.controller.signal.aborted)) stream.destroy();
        return;
      }
      called = true;
      this.observations.callbacks++;
      if (error) this.observations.rejectedCallbacks++;
      try {
        callback(error, stream as Duplex);
      } catch (failure) {
        this.failures.push(failure);
        this.destroyStreams(transaction);
        throw failure;
      }
    };
    const cancel = () => {
      if (transaction.state === "handoff" || transaction.state === "target-tls")
        this.observations.cancellationAfterHandoff++;
      transaction.controller.abort(new Error("Probe request cancelled"));
      this.destroyStreams(transaction);
    };
    this.probe.signal.addEventListener("abort", cancel, { once: true });
    if (this.probe.signal.aborted || this.retired) cancel();
    const run = async () => {
      await this.probe.onPhase?.("registered");
      transaction.controller.signal.throwIfAborted();
      assert.ok(
        this.transactions.has(transaction.id),
        "Pending transaction must be owned before Client construction/I/O",
      );
      const connector = buildConnector({
        ca: this.probe.proxyCa,
        checkServerIdentity,
        maxCachedSessions: 0,
        timeout: 1500,
      });
      const client = new Client(this.probe.proxy.origin, {
        headersTimeout: 1500,
        connect: (connection, notify) => {
          const outer: unknown = connector(connection, notify);
          assert.ok(outer instanceof Socket, "Pinned buildConnector must return the native pending socket");
          this.observations.outerSockets++;
          this.track(transaction, outer);
        },
      });
      transaction.client = client;
      const auth = `Basic ${Buffer.from(`${decodeURIComponent(this.probe.proxy.username)}:${decodeURIComponent(this.probe.proxy.password)}`).toString("base64")}`;
      const data = await client.connect({
        path: `${options.host}:${options.port}`,
        headers: { "proxy-authorization": auth },
        signal: transaction.controller.signal,
      });
      this.track(transaction, data.socket);
      transaction.state = "handoff";
      this.observations.handoffs++;
      if (data.statusCode < 200 || data.statusCode >= 300)
        throw Object.assign(new Error("Probe CONNECT rejected"), { code: "PROBE_CONNECT_REJECTED" });
      await this.probe.onPhase?.("handoff");
      transaction.controller.signal.throwIfAborted();
      if (this.retired) throw new Error("Probe retired before target TLS");
      const identity: typeof checkServerIdentity = (hostname, peer) =>
        this.probe.grant?.hostname === hostname && this.probe.grant.fingerprint === peer.fingerprint256
          ? undefined
          : checkServerIdentity(hostname, peer);
      assert.ok(typeof options.host === "string");
      const tls = connectTls({
        socket: data.socket as Socket,
        ca: this.probe.targetCa,
        host: options.host,
        servername: isIP(options.host)
          ? undefined
          : typeof options.servername === "string" && options.servername
            ? options.servername
            : options.host,
        checkServerIdentity: identity,
        rejectUnauthorized: true,
        ALPNProtocols: ["http/1.1"],
      });
      this.track(transaction, tls);
      transaction.state = "target-tls";
      this.observations.targetTls++;
      const secure = new Promise<void>((resolve, reject) => {
        tls.once("secureConnect", resolve);
        tls.once("error", reject);
        tls.once("close", () => reject(new Error("Probe target TLS closed before delivery")));
      });
      await this.probe.onPhase?.("target-tls");
      await secure;
      transaction.controller.signal.throwIfAborted();
      if (this.retired) throw new Error("Probe retired before delivery");
      transaction.state = "delivered";
      this.observations.delivered++;
      finish(null, tls);
      await this.probe.onPhase?.("delivered");
      await this.closedStreams.get(tls);
    };
    transaction.completion = run()
      .catch((error: unknown) => {
        transaction.failure = error;
        finish(error instanceof Error ? error : new Error("Probe connector failed"));
      })
      .then(async () => {
        this.probe.signal.removeEventListener("abort", cancel);
        transaction.state = "closing";
        transaction.controller.abort();
        this.destroyStreams(transaction);
        const outcomes = await Promise.allSettled([
          this.destroyClient(transaction),
          ...[...transaction.streams].map((stream) => this.closedStreams.get(stream)),
        ]);
        const failures = outcomes
          .filter((outcome) => outcome.status === "rejected")
          .map((outcome) => outcome.reason as unknown);
        if (this.probe.failRelease) {
          this.observations.releaseFailures++;
          failures.push(new Error("Injected probe-only release failure after real physical close"));
        }
        if (failures.length) {
          transaction.state = "failed";
          this.failures.push(...failures);
        } else {
          this.transactions.delete(transaction.id);
        }
      });
    return undefined;
  }

  disposeAsync() {
    if (!this.disposal) {
      this.retired = true;
      for (const transaction of this.transactions.values()) {
        transaction.controller.abort(new Error("Probe agent retired"));
        this.destroyStreams(transaction);
        if (transaction.client) void this.destroyClient(transaction);
      }
      try {
        super.destroy();
      } catch (error) {
        this.failures.push(error);
      }
      this.disposal = (async () => {
        const outcomes = await Promise.allSettled(
          [...this.transactions.values()].map((transaction) => transaction.completion),
        );
        for (const outcome of outcomes) if (outcome.status === "rejected") this.failures.push(outcome.reason);
        await Promise.all(this.closedStreams.values());
        if (this.failures.length) throw new AggregateError(this.failures, "Probe ownership release failed");
        assert.equal(this.transactions.size, 0);
      })();
    }
    return this.disposal;
  }

  destroy() {
    void this.disposeAsync().catch(() => {});
  }
}

const send = async (agent: ConnectorProbeAgent, url: string, signal: AbortSignal, client: "native" | "axios") => {
  const body = Readable.from(["owned-", "stream"]);
  if (client === "axios") {
    const axios = createAxios({ httpsAgent: agent, proxy: false, adapter: "http" });
    assert.equal(getAdapter(axios.defaults.adapter).name, "http");
    const response = await axios.post<Readable>(url, body, { signal, responseType: "stream" });
    assert.ok(response.data instanceof Readable);
    let text = "";
    for await (const chunk of response.data) text += String(chunk);
    return text;
  }
  return new Promise<string>((resolve, reject) => {
    const outgoing = request(url, { agent, method: "POST", signal }, (incoming) => {
      let text = "";
      incoming.on("data", (chunk: Buffer) => {
        text += chunk.toString();
      });
      incoming.on("error", reject);
      incoming.on("end", () => resolve(text));
    });
    outgoing.on("error", reject);
    body.on("error", reject);
    body.pipe(outgoing);
  });
};

interface FixtureCertificate {
  cert: string;
  key: Buffer;
}
interface Observation {
  name: string;
  result: "delivered" | "expected-rejection" | "observed-injected-release-failure" | "unexpected-failure";
  codes: string[];
  ownership?: ConnectorProbeAgent["observations"];
  remainingOwners?: number;
  actualPeerClosed?: boolean;
  safeMessage?: string;
}
const observations: Observation[] = [];
const directoryBase = "/private/var/folders/kx/hccbvbyd6sb61s6lrr2jyt2m0000gn/T/opencode";
const directory = await fs.mkdtemp(path.join(directoryBase, "proxy-connector-"));
await fs.chmod(directory, 0o700);
const servers: Server[] = [];
const physical = new Map<Socket, Promise<void>>();
const agents: ConnectorProbeAgent[] = [];
const secrets: string[] = [];
const sourceRoot = new URL("../../../../../../", import.meta.url);
const hash = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const runtimePath = new URL("../runtime.ts", import.meta.url);
const guardBefore = hash(await fs.readFile(runtimePath));
const listen = async (server: Server) => {
  servers.push(server);
  server.on("connection", (socket) => {
    socket.on("error", () => {});
    physical.set(
      socket,
      new Promise<void>((resolve) =>
        socket.once("close", () => {
          physical.delete(socket);
          resolve();
        }),
      ),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  assert.ok(![3000, 3100, 3200, 3210].includes(address.port));
  return address.port;
};
let metadata: Record<string, unknown> = {};
try {
  assert.ok(process.versions.bun === "1.4.2" || (!process.versions.bun && process.versions.node === "24.18.0"));
  const manifestBytes = await fs.readFile(new URL("packages/core/package.json", sourceRoot));
  const rootBytes = await fs.readFile(new URL("package.json", sourceRoot));
  const core: { dependencies?: Record<string, string> } = JSON.parse(manifestBytes.toString());
  const root: { workspaces: { catalog: Record<string, string> } } = JSON.parse(rootBytes.toString());
  assert.equal(core.dependencies?.undici, "catalog:");
  assert.equal(core.dependencies?.axios, "catalog:");
  assert.equal(root.workspaces.catalog.undici, "7.29.1");
  assert.equal(root.workspaces.catalog.axios, "1.20.0");
  const undiciPackage: { version: string } = JSON.parse(
    (await fs.readFile(new URL("package.json", import.meta.resolve("undici/index.js")))).toString(),
  );
  const axiosPackage: { version: string } = JSON.parse(
    (await fs.readFile(new URL(import.meta.resolve("axios/package.json")))).toString(),
  );
  assert.equal(undiciPackage.version, root.workspaces.catalog.undici);
  assert.equal(axiosPackage.version, root.workspaces.catalog.axios);
  const sourceHashes: Record<string, string> = {};
  for (const source of [
    "lib/api/api-connect.js",
    "lib/api/abort-signal.js",
    "lib/core/connect.js",
    "lib/dispatcher/client-h1.js",
  ]) {
    sourceHashes[source] = hash(await fs.readFile(new URL(source, import.meta.resolve("undici/index.js"))));
  }
  metadata = {
    runtime: process.versions.bun ? `bun-${process.versions.bun}` : `node-${process.versions.node}`,
    currentCoreManifestSha256: hash(manifestBytes),
    currentCatalogSha256: hash(rootBytes),
    declarations: "Current direct declarations verified; uncommitted COMPOSITION acceptance is not HEAD acceptance",
    guardBefore,
    probeSha256: hash(await fs.readFile(fileURLToPath(import.meta.url))),
    isolatedProbeNotDefaultManaged: true,
    installedVersions: { undici: undiciPackage.version, axios: axiosPackage.version },
    installedUndiciSourceSha256: sourceHashes,
  };
  const openssl = (args: string[]) =>
    execFileSync("/usr/bin/openssl", args, { cwd: directory, env: {}, stdio: "pipe" });
  const roots: Record<string, string> = {};
  for (const role of ["proxy", "target", "other"]) {
    await fs.writeFile(
      path.join(directory, `${role}.conf`),
      `[req]\nprompt=no\ndistinguished_name=dn\nx509_extensions=ca\n[dn]\nCN=Disposable ${role} root\n[ca]\nbasicConstraints=critical,CA:TRUE\nkeyUsage=critical,keyCertSign,cRLSign\n`,
    );
    openssl([
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      `${role}.key`,
      "-out",
      `${role}.pem`,
      "-days",
      "1",
      "-config",
      `${role}.conf`,
    ]);
    roots[role] = await fs.readFile(path.join(directory, `${role}.pem`), "utf8");
  }
  const issue = async (name: string, signer: string, validHost: boolean): Promise<FixtureCertificate> => {
    await fs.writeFile(
      path.join(directory, `${name}.conf`),
      `[req]\nprompt=no\ndistinguished_name=dn\n[dn]\nCN=${validHost ? "localhost" : "different.example"}\n[leaf]\nbasicConstraints=critical,CA:FALSE\nsubjectAltName=${validHost ? "IP:127.0.0.1" : "DNS:different.example"}\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n`,
    );
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
      `${name}.conf`,
    ]);
    openssl([
      "x509",
      "-req",
      "-in",
      `${name}.csr`,
      "-CA",
      `${signer}.pem`,
      "-CAkey",
      `${signer}.key`,
      "-set_serial",
      String(1 + Object.keys(roots).length + name.length),
      "-out",
      `${name}.pem`,
      "-days",
      "1",
      "-extfile",
      `${name}.conf`,
      "-extensions",
      "leaf",
    ]);
    return {
      cert: await fs.readFile(path.join(directory, `${name}.pem`), "utf8"),
      key: await fs.readFile(path.join(directory, `${name}.key`)),
    };
  };
  const proxyCert = await issue("proxy-leaf", "proxy", true);
  const targetCert = await issue("target-leaf", "target", true);
  const mismatch = await issue("target-mismatch", "target", false);
  const proxyWrongHost = await issue("proxy-wrong-host", "proxy", false);
  const proxyReplacement = await issue("proxy-replacement", "other", true);
  const proxySignedTarget = await issue("proxy-signed-target", "proxy", true);
  assert.equal(new Set(Object.values(roots).map((pem) => new X509Certificate(pem).subject)).size, 3);
  const proxyCa = roots.proxy;
  const targetCa = roots.target;
  assert.ok(proxyCa && targetCa);
  let targetRequests = 0;
  const targetPorts = new Set<number>();
  const createTarget = async (certificate: FixtureCertificate) => {
    const server = createServer(certificate, (incoming, outgoing) => {
      targetRequests++;
      assert.ok(incoming.headers["proxy-authorization"] === undefined, "Credentials must not reach target");
      assert.equal(incoming.method, "POST");
      incoming.pipe(outgoing);
    });
    const port = await listen(server);
    targetPorts.add(port);
    return `https://127.0.0.1:${port}/echo`;
  };
  const targetUrl = await createTarget(targetCert);
  const mismatchUrl = await createTarget(mismatch);
  const wrongSignerUrl = await createTarget(proxySignedTarget);
  const username = "fixture";
  const password = randomBytes(16).toString("hex");
  const auth = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
  secrets.push(password, auth);
  const createProxy = async (
    certificate: FixtureCertificate,
    mode: "relay" | "held" | "reject" | "target-blackhole" = "relay",
  ) => {
    const entered = Promise.withResolvers<{ peer: Duplex; closed: Promise<void> }>();
    let connects = 0;
    const server = createServer(certificate);
    server.on("connect", (incoming, peer, head) => {
      connects++;
      assert.ok(incoming.headers["proxy-authorization"] === auth, "Generated auth required at proxy only");
      const destination = new URL(`http://${incoming.url}`);
      assert.equal(destination.hostname, "127.0.0.1");
      assert.ok(targetPorts.has(Number(destination.port)));
      peer.on("error", () => {});
      peer.once("end", () => peer.end());
      const closed = new Promise<void>((resolve) => peer.once("close", resolve));
      entered.resolve({ peer, closed });
      if (mode === "held") {
        peer.resume();
        return;
      }
      if (mode === "reject") {
        peer.resume();
        peer.write("HTTP/1.1 407 Proxy Authentication Required\r\nContent-Length: 0\r\n\r\n");
        return;
      }
      if (mode === "target-blackhole") {
        peer.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        peer.resume();
        return;
      }
      const upstream = connectNet({ host: "127.0.0.1", port: Number(destination.port) }, () => {
        peer.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        if (head.length) upstream.write(head);
        peer.pipe(upstream);
        upstream.pipe(peer);
      });
      upstream.on("error", () => peer.destroy());
      physical.set(
        upstream,
        new Promise<void>((resolve) =>
          upstream.once("close", () => {
            physical.delete(upstream);
            resolve();
          }),
        ),
      );
      peer.once("close", () => upstream.destroy());
      upstream.once("close", () => peer.destroy());
    });
    const port = await listen(server);
    return { url: new URL(`https://${username}:${password}@127.0.0.1:${port}`), entered, connects: () => connects };
  };
  const successfulProxy = await createProxy(proxyCert);
  const makeAgent = (proxy: URL, signal: AbortSignal, extra: Partial<ProbeOptions> = {}) => {
    const agent = new ConnectorProbeAgent({ proxy, proxyCa, targetCa, signal, ...extra });
    agents.push(agent);
    return agent;
  };
  const settle = async (agent: ConnectorProbeAgent, failedRelease = false) => {
    const peers = [...physical.values()];
    const disposal = agent.disposeAsync();
    assert.equal(agent.disposeAsync(), disposal);
    if (failedRelease) {
      await assert.rejects(deadline(disposal), AggregateError);
      assert.ok(agent.transactions.size > 0, "Failed owner release must remain strongly owned");
      await assert.rejects(agent.disposeAsync(), AggregateError);
    } else await deadline(disposal);
    await deadline(Promise.all(peers));
    assert.equal(physical.size, 0, "No peer intervention may manufacture native settlement");
    assert.ok([...agent.closedStreams.keys()].every((stream) => stream.closed));
    assert.equal(agent.observations.callbacks, agent.observations.registeredBeforeIo);
  };
  const record = async (name: string, operation: () => Promise<Observation>) => {
    try {
      observations.push(await operation());
    } catch (error) {
      let message = error instanceof Error ? error.message : "Unknown probe failure";
      for (const secret of secrets) message = message.replaceAll(secret, "REDACTED");
      observations.push({
        name,
        result: "unexpected-failure",
        codes: codes(error),
        safeMessage: message.replace(/https?:\/\/\S+/g, "REDACTED_URL").slice(0, 250),
        ownership: agents.at(-1)?.observations,
      });
      throw error;
    }
  };
  for (const client of ["native", "axios"] as const) {
    await record(`${client}-separate-ca-stream-route`, async () => {
      const controller = new AbortController();
      const agent = makeAgent(successfulProxy.url, controller.signal);
      assert.equal(await deadline(send(agent, targetUrl, controller.signal, client)), "owned-stream");
      await settle(agent);
      return {
        name: `${client}-separate-ca-stream-route`,
        result: "delivered",
        codes: [],
        ownership: agent.observations,
        remainingOwners: agent.transactions.size,
        actualPeerClosed: true,
      };
    });
  }
  for (const test of [
    "unknown-proxy-ca",
    "wrong-proxy-host",
    "untrusted-proxy-replacement",
    "proxy-ca-not-target",
    "target-host-denied",
    "target-exact-grant",
    "target-grant-not-proxy",
    "connect-auth-rejection",
  ]) {
    await record(test, async () => {
      const proxy =
        test === "wrong-proxy-host" || test === "target-grant-not-proxy"
          ? await createProxy(proxyWrongHost)
          : test === "untrusted-proxy-replacement"
            ? await createProxy(proxyReplacement)
            : test === "connect-auth-rejection"
              ? await createProxy(proxyCert, "reject")
              : successfulProxy;
      const controller = new AbortController();
      const grant =
        test === "target-exact-grant"
          ? { hostname: "127.0.0.1", fingerprint: new X509Certificate(mismatch.cert).fingerprint256 }
          : test === "target-grant-not-proxy"
            ? { hostname: "127.0.0.1", fingerprint: new X509Certificate(proxyWrongHost.cert).fingerprint256 }
            : undefined;
      const agent = makeAgent(proxy.url, controller.signal, {
        ...(test === "unknown-proxy-ca" ? { proxyCa: targetCa } : {}),
        grant,
      });
      const beforeConnect = proxy.connects();
      const beforeTarget = targetRequests;
      let error: unknown;
      try {
        const text = await deadline(
          send(
            agent,
            test === "proxy-ca-not-target"
              ? wrongSignerUrl
              : test.startsWith("target-") && test !== "target-grant-not-proxy"
                ? mismatchUrl
                : targetUrl,
            controller.signal,
            "native",
          ),
        );
        assert.equal(test, "target-exact-grant", "Negative trust case must not deliver a request");
        assert.equal(text, "owned-stream");
      } catch (failure) {
        error = failure;
      }
      if (test !== "target-exact-grant") {
        assert.ok(error, "Expected real trust/CONNECT rejection");
        const requiredCode = ["wrong-proxy-host", "target-host-denied", "target-grant-not-proxy"].includes(test)
          ? "ERR_TLS_CERT_ALTNAME_INVALID"
          : test === "connect-auth-rejection"
            ? "PROBE_CONNECT_REJECTED"
            : "UNABLE_TO_VERIFY_LEAF_SIGNATURE";
        assert.ok(codes(error).includes(requiredCode), "Negative case must reject for its actual trust/CONNECT reason");
        assert.equal(targetRequests, beforeTarget);
        if (
          ["unknown-proxy-ca", "wrong-proxy-host", "untrusted-proxy-replacement", "target-grant-not-proxy"].includes(
            test,
          )
        )
          assert.equal(proxy.connects(), beforeConnect);
      } else assert.equal(error, undefined);
      await settle(agent);
      return {
        name: test,
        result: test === "target-exact-grant" ? "delivered" : "expected-rejection",
        codes: codes(error),
        ownership: agent.observations,
        remainingOwners: agent.transactions.size,
        actualPeerClosed: true,
      };
    });
  }
  for (const test of [
    "abort-before-io",
    "abort-pending-connect",
    "abort-at-handoff",
    "dispose-during-handoff",
    "abort-target-tls",
    "dispose-pending-late-connect",
  ]) {
    await record(test, async () => {
      const proxy = await createProxy(
        proxyCert,
        test.includes("pending") ? "held" : test === "abort-target-tls" ? "target-blackhole" : "relay",
      );
      const controller = new AbortController();
      const atHandoff = Promise.withResolvers<void>();
      const resume = Promise.withResolvers<void>();
      const agent = makeAgent(proxy.url, controller.signal, {
        onPhase: async (phase) => {
          if (test === "abort-at-handoff" && phase === "handoff") controller.abort();
          if (test === "abort-target-tls" && phase === "target-tls") controller.abort();
          if (test === "dispose-during-handoff" && phase === "handoff") {
            atHandoff.resolve();
            await resume.promise;
          }
        },
      });
      if (test === "abort-before-io") controller.abort();
      const outcome = send(agent, targetUrl, controller.signal, "native").then(
        () => undefined,
        (error: unknown) => error,
      );
      if (test === "abort-pending-connect" || test === "dispose-pending-late-connect") {
        const { peer, closed } = await deadline(proxy.entered.promise);
        if (test === "abort-pending-connect") controller.abort();
        else {
          void agent.disposeAsync().catch(() => {});
          peer.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        }
        await deadline(closed);
      }
      if (test === "dispose-during-handoff") {
        await deadline(atHandoff.promise);
        const disposal = agent.disposeAsync();
        assert.equal(agent.disposeAsync(), disposal);
        resume.resolve();
      }
      const error = await deadline(outcome);
      assert.ok(error, "Cancellation/retirement must reject the actual request");
      await settle(agent);
      assert.equal(agent.observations.delivered, 0);
      return {
        name: test,
        result: "expected-rejection",
        codes: codes(error),
        ownership: agent.observations,
        remainingOwners: agent.transactions.size,
        actualPeerClosed: true,
      };
    });
  }
  await record("injected-release-failure-after-physical-close", async () => {
    const controller = new AbortController();
    const agent = makeAgent(successfulProxy.url, controller.signal, { failRelease: true });
    assert.equal(await deadline(send(agent, targetUrl, controller.signal, "native")), "owned-stream");
    await settle(agent, true);
    return {
      name: "injected-release-failure-after-physical-close",
      result: "observed-injected-release-failure",
      codes: [],
      ownership: agent.observations,
      remainingOwners: agent.transactions.size,
      actualPeerClosed: true,
    };
  });
  assert.equal(physical.size, 0);
  assert.equal(observations.length, 17, "Bounded probe must complete every owned seam");
} catch (error) {
  metadata = { ...metadata, unexpectedErrorCodes: codes(error), unexpectedFailure: true };
  process.exitCode = 1;
} finally {
  const outcomes = await Promise.allSettled(agents.map((agent) => agent.disposeAsync()));
  try {
    await deadline(Promise.all(physical.values()));
  } catch {
    process.exitCode = 1;
  }
  const physicalSettledBeforeCleanup = physical.size === 0;
  if (!physicalSettledBeforeCleanup) {
    process.exitCode = 1;
    for (const socket of physical.keys()) socket.destroy();
    await Promise.all(physical.values());
  }
  await Promise.all(
    servers.map(
      (server) => new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
    ),
  );
  const guardAfter = hash(await fs.readFile(runtimePath));
  assert.equal(guardAfter, guardBefore, "Production guard bytes must remain frozen");
  await fs.rm(directory, { recursive: true, force: true });
  const output = JSON.stringify(
    {
      ...metadata,
      observations,
      counts: {
        delivered: observations.filter((row) => row.result === "delivered").length,
        expectedRejections: observations.filter((row) => row.result === "expected-rejection").length,
        injectedReleaseFailures: observations.filter((row) => row.result === "observed-injected-release-failure")
          .length,
        unexpectedFailures: observations.filter((row) => row.result === "unexpected-failure").length,
        rejectedDisposals: outcomes.filter((row) => row.status === "rejected").length,
      },
      physicalSettledBeforeCleanup,
      remainingPhysicalSockets: physical.size,
      guardAfter,
      fixtureRemoved: true,
    },
    null,
    2,
  );
  assert.ok(
    secrets.every((secret) => !output.includes(secret)),
    "Generated credentials must not be serialized",
  );
  console.log(output);
}
