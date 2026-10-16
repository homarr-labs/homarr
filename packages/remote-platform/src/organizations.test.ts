import { afterEach, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateWorkerIdentity, getWorkerId, signIdentity } from "@homarr/remote-protocol";

import { createRemotePlatformApp } from "./app";
import { enrollmentMessage } from "./enrollment";
import { PlatformStore } from "./store";
import type { EnrollmentChallenge, PlatformSession, WorkerConnection, WorkerEnrollment } from "./types";

const origin = "https://homarr.test";
function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error("Expected fixture value");
  return value;
}
const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

function fixture() {
  const directory = mkdtempSync(join(tmpdir(), "homarr-organizations-"));
  const path = join(directory, "platform.sqlite");
  const store = new PlatformStore(path);
  let time = 1_900_000_000_000;
  cleanups.push(() => {
    store.close();
    rmSync(directory, { recursive: true, force: true });
  });
  const app = createRemotePlatformApp({
    store,
    publicUrl: `${origin}/remote`,
    now: () => time,
    auth: {
      workshopApiUrl: origin,
      async authenticate(token) {
        const id = token.slice("fixture-account-".length);
        if (!token.startsWith("fixture-account-") || !id) throw new Error("Invalid account");
        return { workshopId: id.padStart(15, "0"), login: id, name: id, avatarUrl: null };
      },
    },
  });
  class Client {
    cookie = "";
    csrf = "";
    userId = "";
    async request(pathname: string, method = "GET", body?: unknown): Promise<Response> {
      const headers = new Headers({ Cookie: this.cookie });
      if (method !== "GET") {
        headers.set("Origin", origin);
        headers.set("X-CSRF-Token", this.csrf);
      }
      let requestBody: string | undefined;
      if (body !== undefined) {
        headers.set("Content-Type", "application/json");
        requestBody = JSON.stringify(body);
      }
      const response = await app.request(`${origin}/remote${pathname}`, { method, headers, body: requestBody });
      for (const cookie of response.headers.getSetCookie()) {
        const entry = required(cookie.split(";")[0]);
        const name = entry.slice(0, entry.indexOf("="));
        const retained = this.cookie.split("; ").filter((part) => part && !part.startsWith(`${name}=`));
        if (!entry.endsWith("=")) retained.push(entry);
        this.cookie = retained.join("; ");
      }
      return response;
    }
    async signIn(id: string) {
      const config = await (await this.request("/api/auth/config")).json();
      this.csrf = config.csrfToken;
      const response = await this.request("/auth/workshop/session", "POST", { token: `fixture-account-${id}` });
      expect(response.status).toBe(200);
      const session = (await response.json()) as PlatformSession;
      this.csrf = required(session.csrfToken);
      this.userId = required(session.user).id;
    }
    async enroll(name = "Existing personal worker") {
      const { challenge } = (await (await this.request("/api/workers/challenge", "POST")).json()) as {
        challenge: EnrollmentChallenge;
      };
      const identity = await generateWorkerIdentity();
      const input: WorkerEnrollment = {
        challenge,
        workerId: await getWorkerId(identity.publicJwk),
        workerPublicKey: identity.publicJwk,
        workerSigningKey: identity.publicJwk,
        signature: "",
        name,
        mode: "direct",
        directUrl: "https://worker.tailnet.test",
        relayUrl: "wss://relay.test",
      };
      input.signature = await signIdentity(identity, enrollmentMessage(input));
      const response = await this.request("/api/workers", "POST", input);
      expect(response.status).toBe(201);
      return ((await response.json()) as { worker: WorkerConnection }).worker;
    }
    async organization(name = "Home") {
      const response = await this.request("/api/organizations", "POST", { name });
      expect(response.status).toBe(201);
      return (await response.json()).organization as { organizationId: string; name: string; role: string };
    }
    async join(owner: Client, organizationId: string, role = "member") {
      const invite = await (
        await owner.request(`/api/organizations/${organizationId}/invites`, "POST", { role })
      ).json();
      expect((await this.request("/api/organization-invites/redeem", "POST", { code: invite.code })).status).toBe(200);
    }
  }
  return {
    store,
    path,
    Client,
    advance(milliseconds: number) {
      time += milliseconds;
    },
  };
}

test("organization directories are isolated and preserve existing personal workers across reopen", async () => {
  const f = fixture();
  const alice = new f.Client();
  const bob = new f.Client();
  await alice.signIn("alice");
  await bob.signIn("bob");
  const worker = await alice.enroll();
  const organization = await alice.organization();
  expect(organization.role).toBe("owner");
  const route = `/api/organizations/${organization.organizationId}`;
  expect((await alice.request(route)).status).toBe(200);
  expect((await bob.request(route)).status).toBe(404);
  expect((await (await bob.request("/api/organizations")).json()).organizations).toEqual([]);
  expect((await (await alice.request("/api/workers")).json()).workers).toEqual([worker]);
  const reopened = new PlatformStore(f.path);
  try {
    expect(reopened.worker(worker.workerId, alice.userId)?.name).toBe("Existing personal worker");
  } finally {
    reopened.close();
  }
});

test("organization invitations are one-use directory membership and cannot restore a removed member", async () => {
  const f = fixture();
  const owner = new f.Client();
  const member = new f.Client();
  const outsider = new f.Client();
  await owner.signIn("alice");
  await member.signIn("bob");
  await outsider.signIn("carol");
  const organization = await owner.organization();
  const base = `/api/organizations/${organization.organizationId}`;
  const response = await owner.request(`${base}/invites`, "POST", { role: "member", expiresInSeconds: 60 });
  expect(response.status).toBe(201);
  const invitation = await response.json();
  expect(invitation.maxUses).toBe(1);
  expect((await member.request("/api/organization-invites/redeem", "POST", { code: invitation.code })).status).toBe(
    200,
  );
  expect((await (await member.request("/api/workers")).json()).workers).toEqual([]);
  expect((await member.request(`${base}/invites`, "POST", { role: "admin" })).status).toBe(403);
  expect((await outsider.request("/api/organization-invites/redeem", "POST", { code: invitation.code })).status).toBe(
    409,
  );
  expect((await owner.request(`${base}/members/${member.userId}`, "DELETE")).status).toBe(200);
  expect((await member.request(base)).status).toBe(404);
  expect((await member.request("/api/organization-invites/redeem", "POST", { code: invitation.code })).status).toBe(
    409,
  );
  const expiring = await (
    await owner.request(`${base}/invites`, "POST", { role: "member", expiresInSeconds: 60 })
  ).json();
  f.advance(61_000);
  expect((await outsider.request("/api/organization-invites/redeem", "POST", { code: expiring.code })).status).toBe(
    404,
  );
  const revoked = await (await owner.request(`${base}/invites`, "POST", { role: "member" })).json();
  expect((await owner.request(`${base}/invites/${revoked.inviteId}`, "DELETE")).status).toBe(200);
  expect((await outsider.request("/api/organization-invites/redeem", "POST", { code: revoked.code })).status).toBe(404);
  expect(JSON.stringify(await (await owner.request(`${base}/invites`)).json())).not.toContain(invitation.code);
});

test("organizations attach only worker-owned identities and switch a single primary without granting worker access", async () => {
  const f = fixture();
  const owner = new f.Client();
  const admin = new f.Client();
  await owner.signIn("alice");
  await admin.signIn("bob");
  const primary = await owner.enroll("Home");
  const secondary = await owner.enroll("Office");
  const organization = await owner.organization();
  const base = `/api/organizations/${organization.organizationId}/workers`;
  await admin.join(owner, organization.organizationId, "admin");
  expect((await admin.request(base, "POST", { workerId: primary.workerId })).status).toBe(403);
  expect((await owner.request(base, "POST", { workerId: primary.workerId, token: "must-not-be-stored" })).status).toBe(
    400,
  );
  const firstResponse = await owner.request(base, "POST", { workerId: primary.workerId });
  expect(firstResponse.status).toBe(201);
  expect((await firstResponse.json()).worker.purpose).toBe("primary");
  expect((await owner.request(base, "POST", { workerId: secondary.workerId })).status).toBe(201);
  const membersView = (await (await admin.request(base)).json()).workers;
  expect(membersView.map((worker: { purpose: string }) => worker.purpose)).toEqual(["primary", "integrations"]);
  expect(membersView.every((worker: { accessStatus: string }) => worker.accessStatus === "requiresWorkerGrant")).toBe(
    true,
  );
  expect((await admin.request(`/api/workers/${primary.workerId}/members`)).status).toBe(404);
  expect((await admin.request(`${base}/${secondary.workerId}`, "PATCH", { purpose: "primary" })).status).toBe(200);
  const afterSwitch = (await (await owner.request(base)).json()).workers;
  expect(
    afterSwitch
      .filter((worker: { purpose: string }) => worker.purpose === "primary")
      .map((worker: { workerId: string }) => worker.workerId),
  ).toEqual([secondary.workerId]);
  expect((await owner.request(`${base}/${secondary.workerId}`, "PATCH", { purpose: "integrations" })).status).toBe(409);
  expect((await owner.request(`${base}/${secondary.workerId}`, "DELETE")).status).toBe(200);
  expect((await (await owner.request(base)).json()).workers[0].purpose).toBe("primary");
  expect((await (await owner.request("/api/workers")).json()).workers).toHaveLength(2);
});

test("organization connection choices stay personal and current membership gates discovery", async () => {
  const f = fixture();
  const owner = new f.Client();
  const member = new f.Client();
  await owner.signIn("alice");
  await member.signIn("bob");
  const worker = await owner.enroll();
  const organization = await owner.organization();
  const base = `/api/organizations/${organization.organizationId}`;
  await owner.request(`${base}/workers`, "POST", { workerId: worker.workerId });
  await member.join(owner, organization.organizationId);
  const preferences = `${base}/workers/${worker.workerId}/connection`;
  expect((await member.request(preferences, "PATCH", { mode: "relay", relayUrl: "wss://my-relay.test" })).status).toBe(
    200,
  );
  const memberWorkers = (await (await member.request(`${base}/workers`)).json()).workers;
  expect(memberWorkers[0].mode).toBe("relay");
  expect(memberWorkers[0].relayUrl).toBe("wss://my-relay.test");
  expect(memberWorkers[0].role).toBe("member");
  const ownerWorkers = (await (await owner.request(`${base}/workers`)).json()).workers;
  expect(ownerWorkers[0].mode).toBe("direct");
  expect(ownerWorkers[0].relayUrl).toBe("wss://relay.test");
  expect((await member.request(preferences, "PATCH", { directUrl: "https://user:secret@worker.test" })).status).toBe(
    400,
  );
  expect((await member.request(preferences, "PATCH", { grant: "must-not-reach-platform" })).status).toBe(400);
  expect(f.store.workersForPrincipal(member.userId, organization.organizationId)).toHaveLength(1);
  expect(f.store.workersForPrincipal(owner.userId)).toHaveLength(1);
  expect((await owner.request(`${base}/members/${member.userId}`, "DELETE")).status).toBe(200);
  expect((await member.request(`${base}/workers`)).status).toBe(404);
  expect(f.store.workersForPrincipal(member.userId, organization.organizationId)).toEqual([]);
  expect(f.store.workersForPrincipal(member.userId)).toEqual([]);
  await member.join(owner, organization.organizationId);
  const rejoined = (await (await member.request(`${base}/workers`)).json()).workers;
  expect(rejoined[0].mode).toBe("direct");
});

test("organization role changes protect the owner and revoke a former administrator's unused invitations", async () => {
  const f = fixture();
  const owner = new f.Client();
  const admin = new f.Client();
  const otherAdmin = new f.Client();
  const member = new f.Client();
  await owner.signIn("alice");
  await admin.signIn("bob");
  await otherAdmin.signIn("carol");
  await member.signIn("dave");
  const organization = await owner.organization();
  const base = `/api/organizations/${organization.organizationId}`;
  await admin.join(owner, organization.organizationId, "admin");
  await otherAdmin.join(owner, organization.organizationId, "admin");
  expect((await admin.request(`${base}/invites`, "POST", { role: "admin" })).status).toBe(403);
  expect((await admin.request(`${base}/members/${otherAdmin.userId}`, "DELETE")).status).toBe(403);
  expect((await admin.request(`${base}/members/${owner.userId}`, "DELETE")).status).toBe(403);
  expect((await owner.request(`${base}/members/${owner.userId}`, "PATCH", { role: "member" })).status).toBe(403);
  expect((await admin.request(`${base}/members/${otherAdmin.userId}`, "PATCH", { role: "member" })).status).toBe(403);
  const pending = await (await admin.request(`${base}/invites`, "POST", { role: "member" })).json();
  expect((await owner.request(`${base}/members/${admin.userId}`, "PATCH", { role: "member" })).status).toBe(200);
  expect((await member.request("/api/organization-invites/redeem", "POST", { code: pending.code })).status).toBe(404);
  expect((await admin.request(base, "PATCH", { name: "Changed by former admin" })).status).toBe(403);
  expect((await otherAdmin.request(base, "PATCH", { name: "Family" })).status).toBe(200);
  expect((await otherAdmin.request(base, "DELETE")).status).toBe(403);
  const worker = await owner.enroll();
  await owner.request(`${base}/workers`, "POST", { workerId: worker.workerId });
  expect((await owner.request(base, "DELETE")).status).toBe(200);
  expect((await otherAdmin.request(base)).status).toBe(404);
  expect((await (await owner.request("/api/workers")).json()).workers).toHaveLength(1);
});

test("removing a personal worker promotes the remaining organization worker and survives reopen", async () => {
  const f = fixture();
  const owner = new f.Client();
  await owner.signIn("alice");
  const first = await owner.enroll("Primary");
  const second = await owner.enroll("Secondary");
  const organization = await owner.organization();
  const route = `/api/organizations/${organization.organizationId}/workers`;
  await owner.request(route, "POST", { workerId: first.workerId });
  await owner.request(route, "POST", { workerId: second.workerId });
  expect((await owner.request(`/api/workers/${first.workerId}`, "DELETE")).status).toBe(200);
  const workers = (await (await owner.request(route)).json()).workers;
  expect(workers).toHaveLength(1);
  expect(workers[0].workerId).toBe(second.workerId);
  expect(workers[0].purpose).toBe("primary");
  const reopened = new PlatformStore(f.path);
  try {
    expect(reopened.workersForPrincipal(owner.userId, organization.organizationId)[0]?.purpose).toBe("primary");
  } finally {
    reopened.close();
  }
});
