import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(execFile);
const composeFile = resolve(import.meta.dirname, "docker-network.compose.yml");
const project = "homarr-dns-6997";
const temporaryDirectory = await mkdtemp(`${tmpdir()}/homarr-dns-proof-`);
const overrideFile = `${temporaryDirectory}/cache.json`;
let override = false;
let baseUrl = "";
let apiKey = "";

async function compose(args: string[], environment: Record<string, string> = {}) {
  const files = ["-f", composeFile];
  if (override) files.push("-f", overrideFile);
  const result = await execAsync("docker", ["compose", "-p", project, ...files, ...args], {
    env: { ...process.env, ...environment },
    maxBuffer: 4 * 1024 * 1024,
  });
  return result.stdout.trim();
}

async function refreshUrl() {
  const address = await compose(["port", "homarr", "7575"]);
  baseUrl = `http://${address}`;
}

async function nextProcessIdentity() {
  const identity = await compose([
    "exec",
    "-T",
    "homarr",
    "node",
    "-e",
    `
    const fs = require('node:fs');
    for (const pid of fs.readdirSync('/proc').filter(value => /^\\d+$/.test(value))) {
      try {
        if (fs.readFileSync('/proc/'+pid+'/cmdline','utf8').startsWith('next-server')) {
          const stat = fs.readFileSync('/proc/'+pid+'/stat','utf8');
          console.log(pid, stat.slice(stat.lastIndexOf(')')+2).split(' ')[19]);
        }
      } catch {}
    }
  `,
  ]);
  assert.ok(identity, "Next.js process was not found");
  return identity;
}

async function api(path: string, input: unknown) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ApiKey: apiKey },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(25000),
  });
  const result = await response.json();
  assert.equal(response.status, 200, `Homarr ${path} returned HTTP ${response.status}`);
  return result;
}

async function createIntegration(name: string, url: string, kind: string, token: string) {
  const result = await api("/api/trpc/integration.create", {
    json: { name, url, kind, secrets: [{ kind: "apiKey", value: token }], attemptSearchEngineCreation: false },
  });
  const data = result.result?.data?.json ?? result.result?.data;
  const integration = data?.integration;
  assert.ok(
    integration?.id,
    `Connection test/create failed for ${name}: ${JSON.stringify(data?.error?.type ?? result.error?.message ?? Object.keys(result))}`,
  );
  console.log(`PASS Next.js connection test: ${name} at ${url}`);
  return integration.id as string;
}

async function request(integrationId: string, path: string) {
  const result = await api("/api/integrations/request", { integrationId, path, method: "GET" });
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  return result.data;
}

async function upstreamKey(service: string) {
  const config = await compose(["exec", "-T", service, "cat", "/config/config.xml"]);
  const token = config.match(/<ApiKey>([^<]+)<\/ApiKey>/)?.[1];
  assert.ok(token, `Missing API key for disposable ${service}`);
  return token;
}

async function recreateFixture(address: string, instance: string) {
  await compose(["up", "-d", "--no-deps", "--force-recreate", "fixture"], {
    PROOF_SERVICE_IP: address,
    PROOF_INSTANCE: instance,
  });
  const deadline = Date.now() + 10000;
  while (true) {
    try {
      await compose([
        "exec",
        "-T",
        "fixture",
        "node",
        "-e",
        "fetch('http://127.0.0.1:6767/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))",
      ]);
      return;
    } catch {
      assert.ok(Date.now() < deadline, "Recreated fixture never became ready");
      await new Promise((done) => setTimeout(done, 100));
    }
  }
}

try {
  await compose(["up", "-d", "--wait", "--wait-timeout", "180"]);
  await refreshUrl();
  for (const path of ["/api/health/ready", "/api/health/live"]) {
    const response = await fetch(`${baseUrl}${path}`);
    assert.equal(response.status, 200);
    console.log(`PASS production Homarr ${path}: HTTP 200`);
  }

  // Provision only the disposable database. Keep the generated API key out of logs.
  apiKey = await compose([
    "exec",
    "-T",
    "homarr",
    "node",
    "-e",
    `
    const Database = require('better-sqlite3');
    const db = new Database(process.env.DB_URL, {nativeBinding:'/app/build/better_sqlite3.node'});
    const token = require('node:crypto').randomBytes(24).toString('hex');
    const hash = require('bcrypt').hashSync(token, 10);
    db.transaction(() => {
      db.prepare('INSERT OR IGNORE INTO user(id,name) VALUES (?,?)').run('dns-proof-user','DNS proof');
      db.prepare('INSERT OR IGNORE INTO "group"(id,name,position) VALUES (?,?,?)').run('dns-proof-group','DNS proof',999);
      db.prepare('INSERT OR IGNORE INTO groupMember(group_id,user_id) VALUES (?,?)').run('dns-proof-group','dns-proof-user');
      db.prepare('DELETE FROM groupPermission WHERE group_id=?').run('dns-proof-group');
      db.prepare('INSERT INTO groupPermission(group_id,permission) VALUES (?,?)').run('dns-proof-group','admin');
      db.prepare('INSERT OR REPLACE INTO apiKey(id,api_key,user_id) VALUES (?,?,?)').run('dns-proof-key',hash,'dns-proof-user');
    })();
    db.close();
    process.stdout.write('dns-proof-key.'+token);
  `,
  ]);

  for (const [service, port] of [
    ["sonarr", 8989],
    ["radarr", 7878],
  ] as const) {
    const id = await createIntegration(service, `http://${service}:${port}`, service, await upstreamKey(service));
    const health = await request(id, "/ping");
    assert.equal(health.status, "OK");
    const status = await request(id, "/api/v3/system/status");
    assert.ok(status.version);
    console.log(
      `PASS Next.js -> ${service}:${port}/ping and authenticated system/status: HTTP 200, version ${status.version}`,
    );
  }

  const fixture = await createIntegration("DNS fixture", "http://fixture:6767", "sonarr", "fixture-token");
  const hosts = await createIntegration("Hosts override", "http://overridden-service:6767", "sonarr", "fixture-token");
  assert.equal((await request(hosts, "/health")).instance, "hosts-override");
  console.log("PASS extra_hosts takes precedence over the conflicting Docker DNS alias");
  assert.equal((await request(fixture, "/health")).instance, "original");
  const originalContainer = await compose(["ps", "-q", "homarr"]);
  const originalNextProcess = await nextProcessIdentity();
  await recreateFixture("10.203.199.12", "replacement");
  assert.equal((await request(fixture, "/health")).instance, "replacement");
  assert.equal(await compose(["ps", "-q", "homarr"]), originalContainer);
  assert.equal(await nextProcessIdentity(), originalNextProcess);
  console.log("PASS fixture IP 10.203.199.10 -> 10.203.199.12: HTTP 200 without restarting Homarr");

  // Re-enable the old default as a control, using the same production image and API routes.
  await writeFile(
    overrideFile,
    JSON.stringify({ services: { homarr: { environment: { ENABLE_DNS_CACHING: "true" } } } }),
  );
  override = true;
  await compose(["up", "-d", "--no-deps", "--force-recreate", "--wait", "--wait-timeout", "90", "homarr"]);
  await refreshUrl();
  assert.equal((await request(fixture, "/health")).instance, "replacement");
  assert.equal((await request(hosts, "/health")).instance, "replacement");
  console.log("PASS control ENABLE_DNS_CACHING=true reproduces DNS overriding extra_hosts");
  await recreateFixture("10.203.199.13", "control-replacement");
  const native = JSON.parse(
    await compose([
      "exec",
      "-T",
      "homarr",
      "node",
      "-e",
      "fetch('http://fixture:6767/health').then(async r=>console.log(JSON.stringify(await r.json()))).catch(()=>process.exit(1))",
    ]),
  );
  assert.equal(native.instance, "control-replacement");
  await assert.rejects(
    request(fixture, "/health"),
    (error: unknown) => error instanceof assert.AssertionError && [502, 504].includes(error.actual as number),
  );
  console.log("PASS control ENABLE_DNS_CACHING=true reproduces failure after fixture IP change");
} finally {
  await compose(["down", "--volumes", "--remove-orphans"]);
  await rm(temporaryDirectory, { recursive: true, force: true });
  console.log("Removed the disposable Compose stack and volumes");
}
