import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { generateDeviceIdentity, generateWorkerIdentity, getWorkerId } from "@homarr/remote-protocol";

import { WorkerAccess } from "./index";
import type { AccessPrincipal, VerifiedDevice } from "./types";

const opened: WorkerAccess[] = [];
const directories: string[] = [];
afterEach(() => {
  for (const access of opened.splice(0)) access.close();
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

async function device(): Promise<VerifiedDevice> {
  const identity = await generateDeviceIdentity();
  return { deviceId: await getWorkerId(identity.publicJwk), devicePublicJwk: identity.publicJwk };
}

function bootstrapSecret(access: WorkerAccess) {
  const secret = access.getBootstrapSecret();
  if (!secret) throw new Error("Expected unclaimed worker");
  return secret;
}

async function setup() {
  const directory = mkdtempSync(join(tmpdir(), "homarr-worker-access-"));
  directories.push(directory);
  const identity = await generateWorkerIdentity();
  const clock = { value: 1_800_000_000_000 };
  const access = await WorkerAccess.open({ directory, identity, now: () => clock.value });
  opened.push(access);
  const ownerDevice = await device();
  const secret = bootstrapSecret(access);
  const owner = await access.authenticateEnvelope(ownerDevice, { kind: "claim", secret });
  return { directory, identity, clock, access, ownerDevice, owner, secret };
}

describe("worker-owned pairing and grants", () => {
  test("native user invitations bind a local identity without granting worker ownership", async () => {
    const { access, owner, clock } = await setup();
    await expect(
      access.createInvitation(owner.principal, { role: "user", expiresAt: clock.value + 60_000 }),
    ).rejects.toThrow();
    const invitation = await access.createInvitation(owner.principal, {
      role: "user",
      userId: "local-user",
      expiresAt: clock.value + 60_000,
    });
    const invitedDevice = await device();
    const { principal, grant } = await access.authenticateEnvelope(invitedDevice, {
      kind: "invite",
      token: invitation.token,
    });
    expect(grant.userId).toBe("local-user");
    expect(principal.userId).toBe("local-user");
    access.authorizeProcedure(principal, { path: "board.getAllBoards", kind: "query" });
    expect(() => access.requireOwner(principal)).toThrow();
    await expect(
      access.createInvitation(principal, { role: "owner", expiresAt: clock.value + 60_000 }),
    ).rejects.toThrow();
    access.revokeInvitation(owner.principal, invitation.id);
    expect(() => access.assertActive(principal)).toThrow();
  });
  test("service capabilities bind one device, explicit integrations and procedure effects", async () => {
    const { access, owner, clock } = await setup();
    const serviceDevice = await device();
    const grant = await access.grantAccess(owner.principal, {
      role: "service",
      devicePublicJwk: serviceDevice.devicePublicJwk,
      expiresAt: clock.value + 60_000,
      service: {
        integrationIds: ["selected"],
        access: "query",
        procedurePaths: ["systemHealth.get", "systemHealth.restart", "integration.all"],
        audience: "https://homarr.dev/mcp",
        principalId: "account:alice",
      },
    });
    const { principal } = await access.authenticateEnvelope(serviceDevice, { kind: "grant", token: grant.token });
    expect(principal.role).toBe("service");
    expect(principal.service?.principalId).toBe("account:alice");
    access.authorizeProcedure(principal, { path: "systemHealth.get", kind: "query", integrationIds: ["selected"] });
    access.authorizeProcedure(principal, { path: "integration.all", kind: "query" });
    for (const request of [
      { path: "systemHealth.get", kind: "query" as const, integrationIds: ["other"] },
      { path: "systemHealth.get", kind: "query" as const },
      { path: "systemHealth.restart", kind: "mutation" as const, integrationIds: ["selected"] },
      { path: "board.remove", kind: "mutation" as const, integrationIds: ["selected"] },
    ])
      expect(() => access.authorizeProcedure(principal, request)).toThrow();
    expect(() => access.requireOwner(principal)).toThrow();
    await expect(access.authenticateEnvelope(await device(), { kind: "grant", token: grant.token })).rejects.toThrow();
    access.revokeGrant(owner.principal, grant.id);
    expect(() => access.authorizeProcedure(principal, { path: "integration.all", kind: "query" })).toThrow();
  });

  test("service approval requires finite bounded expiry and a matching organization binding", async () => {
    const { access, owner, clock } = await setup();
    const serviceDevice = await device();
    const scope = {
      role: "service" as const,
      devicePublicJwk: serviceDevice.devicePublicJwk,
      service: {
        integrationIds: ["selected"],
        access: "full" as const,
        procedurePaths: ["integration.request"],
        audience: "https://homarr.dev/mcp",
        principalId: "organization:team",
        organizationId: "team",
      },
    };
    for (const expiresAt of [undefined, null, clock.value + 31 * 86_400_000]) {
      await expect(access.grantAccess(owner.principal, { ...scope, expiresAt })).rejects.toThrow();
    }
    await expect(
      access.grantAccess(owner.principal, { ...scope, boardIds: ["private-board"], expiresAt: clock.value + 60_000 }),
    ).rejects.toThrow();
    await expect(
      access.grantAccess(owner.principal, {
        ...scope,
        expiresAt: clock.value + 60_000,
        service: { ...scope.service, principalId: "organization:other" },
      }),
    ).rejects.toThrow();
    const grant = await access.grantAccess(owner.principal, { ...scope, expiresAt: clock.value + 60_000 });
    const { principal } = await access.authenticateEnvelope(serviceDevice, { kind: "grant", token: grant.token });
    access.authorizeProcedure(principal, {
      path: "integration.request",
      kind: "mutation",
      integrationIds: ["selected"],
    });
    clock.value += 60_001;
    expect(() => access.assertActive(principal)).toThrow();
  });

  test("atomic claim race grants only one owner and permanently consumes the local secret", async () => {
    const directory = mkdtempSync(join(tmpdir(), "homarr-worker-access-"));
    directories.push(directory);
    const identity = await generateWorkerIdentity();
    const a = await WorkerAccess.open({ directory, identity });
    const b = await WorkerAccess.open({ directory, identity });
    opened.push(a, b);
    const secret = bootstrapSecret(a);
    expect(Buffer.from(secret, "base64url").byteLength).toBe(32);
    expect(statSync(join(directory, "pairing-secret")).mode & 0o777).toBe(0o600);
    const one = await device();
    const two = await device();
    const results = await Promise.allSettled([
      a.authenticateEnvelope(one, { kind: "claim", secret }),
      b.authenticateEnvelope(two, { kind: "claim", secret }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(a.claimed).toBe(true);
    expect(a.getBootstrapSecret()).toBeNull();
    expect(statSync(join(directory, "access.sqlite")).mode & 0o777).toBe(0o600);
    await expect(a.authenticateEnvelope(two, { kind: "claim", secret })).rejects.toMatchObject({ code: "CLAIMED" });
    expect(readFileSync(join(directory, "access.sqlite")).includes(Buffer.from(secret))).toBe(false);
  });

  test("wrong pairing credentials back off durably across connections", async () => {
    const directory = mkdtempSync(join(tmpdir(), "homarr-worker-access-"));
    directories.push(directory);
    const identity = await generateWorkerIdentity();
    let now = 100_000;
    const access = await WorkerAccess.open({ directory, identity, now: () => now });
    opened.push(access);
    const claimant = await device();
    const secret = bootstrapSecret(access);
    await expect(access.authenticateEnvelope(claimant, { kind: "claim", secret: "wrong" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    const second = await WorkerAccess.open({ directory, identity, now: () => now });
    opened.push(second);
    await expect(second.authenticateEnvelope(claimant, { kind: "claim", secret })).rejects.toMatchObject({
      code: "RATE_LIMITED",
    });
    now += 251;
    expect((await second.authenticateEnvelope(claimant, { kind: "claim", secret })).grant.role).toBe("owner");
  });

  test("worker grant is device-bound, persists through restart, and rejects altered signatures", async () => {
    const { access, ownerDevice, owner, directory, identity, clock } = await setup();
    const attacker = await device();
    await expect(
      access.authenticateEnvelope(attacker, { kind: "grant", token: owner.grant.token }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const tampered = owner.grant.token.replace(/^./, "_");
    await expect(access.authenticateEnvelope(ownerDevice, { kind: "grant", token: tampered })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    const restarted = await WorkerAccess.open({ directory, identity, now: () => clock.value });
    opened.push(restarted);
    const authenticated = await restarted.authenticateEnvelope(ownerDevice, {
      kind: "grant",
      token: owner.grant.token,
    });
    restarted.authorizeProcedure(authenticated.principal, { path: "integration.delete", kind: "mutation" });
  });

  test("one-time invitations cannot replay and remain constrained by board and expiry", async () => {
    const { access, owner, clock } = await setup();
    const invitation = await access.createInvitation(owner.principal, {
      role: "viewer",
      boardIds: ["public-board"],
      expiresAt: clock.value + 1000,
    });
    const guestDevice = await device();
    const guest = await access.authenticateEnvelope(guestDevice, { kind: "invite", token: invitation.token });
    access.authorizeProcedure(guest.principal, { path: "board.read", kind: "query", boardId: "public-board" });
    expect(() =>
      access.authorizeProcedure(guest.principal, { path: "board.read", kind: "query", boardId: "private-board" }),
    ).toThrow();
    expect(() =>
      access.authorizeProcedure(guest.principal, { path: "board.read", kind: "mutation", boardId: "public-board" }),
    ).toThrow();
    expect(() =>
      access.authorizeProcedure(guest.principal, { path: "integration.byId", kind: "query", boardId: "public-board" }),
    ).toThrow();
    await expect(
      access.authenticateEnvelope(await device(), { kind: "invite", token: invitation.token }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    clock.value += 1000;
    expect(() =>
      access.authorizeProcedure(guest.principal, { path: "board.read", kind: "query", boardId: "public-board" }),
    ).toThrow("expired");
  });

  test("the original device can recover the same invitation grant after a lost confirmation and restart", async () => {
    const { access, owner, ownerDevice, directory, identity, clock } = await setup();
    const invitation = await access.createInvitation(owner.principal, {
      role: "viewer",
      boardIds: ["a"],
      expiresAt: clock.value + 1000,
    });
    const invitedDevice = await device();
    const original = await access.authenticateEnvelope(invitedDevice, { kind: "invite", token: invitation.token });
    // Retry with the bootstrap credential, as when its first encrypted confirmation was lost.
    const recovered = await access.authenticateEnvelope(invitedDevice, { kind: "invite", token: invitation.token });
    expect(recovered.grant.id).toBe(original.grant.id);
    expect(recovered.grant.token === original.grant.token).toBe(true);
    expect(access.listGrants(owner.principal).length).toBe(2);
    const restarted = await WorkerAccess.open({ directory, identity, now: () => clock.value });
    opened.push(restarted);
    const afterRestart = await restarted.authenticateEnvelope(invitedDevice, {
      kind: "invite",
      token: invitation.token,
    });
    expect(afterRestart.grant.id).toBe(original.grant.id);
    expect(afterRestart.grant.token === original.grant.token).toBe(true);
    const restoredOwner = await restarted.authenticateEnvelope(ownerDevice, {
      kind: "grant",
      token: owner.grant.token,
    });
    expect(restarted.listGrants(restoredOwner.principal).length).toBe(2);
    expect(restarted.listInvitations(restoredOwner.principal)[0]?.used).toBe(true);
  });

  test("concurrent invitation retries enroll one original device and return one grant", async () => {
    const { access, owner, directory, identity, clock } = await setup();
    const invitation = await access.createInvitation(owner.principal, {
      role: "viewer",
      boardIds: ["a"],
      expiresAt: clock.value + 1000,
    });
    const otherProcess = await WorkerAccess.open({ directory, identity, now: () => clock.value });
    opened.push(otherProcess);
    const invitedDevice = await device();
    const [one, two] = await Promise.all([
      access.authenticateEnvelope(invitedDevice, { kind: "invite", token: invitation.token }),
      otherProcess.authenticateEnvelope(invitedDevice, { kind: "invite", token: invitation.token }),
    ]);
    expect(one.grant.id).toBe(two.grant.id);
    expect(one.grant.token === two.grant.token).toBe(true);
    expect(access.listGrants(owner.principal).length).toBe(2);
    await expect(
      access.authenticateEnvelope(await device(), { kind: "invite", token: invitation.token }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  test("invitation recovery never revives a revoked child, invitation, expired grant or issuing owner", async () => {
    for (const invalidation of ["child", "invitation", "expiry", "authority"] as const) {
      const { access, owner, clock } = await setup();
      const issuerDevice = await device();
      const issuerGrant = await access.grantAccess(owner.principal, {
        devicePublicJwk: issuerDevice.devicePublicJwk,
        role: "owner",
      });
      const issuer = await access.authenticateEnvelope(issuerDevice, { kind: "grant", token: issuerGrant.token });
      const invitation = await access.createInvitation(issuer.principal, {
        role: "viewer",
        boardIds: ["a"],
        expiresAt: clock.value + 1000,
      });
      const invitedDevice = await device();
      const original = await access.authenticateEnvelope(invitedDevice, { kind: "invite", token: invitation.token });
      const tampered = invitation.token.replace(/^./, "_");
      await expect(
        access.authenticateEnvelope(invitedDevice, { kind: "invite", token: tampered }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      if (invalidation === "child") access.revokeGrant(owner.principal, original.grant.id);
      if (invalidation === "invitation") access.revokeInvitation(owner.principal, invitation.id);
      if (invalidation === "expiry") clock.value += 1000;
      if (invalidation === "authority") access.revokeGrant(owner.principal, issuerGrant.id);
      await expect(
        access.authenticateEnvelope(invitedDevice, { kind: "invite", token: invitation.token }),
      ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
      expect(access.listGrants(owner.principal).length).toBe(3);
    }
  });

  test("revoking used invitations and permanent share grants invalidates active sessions", async () => {
    const { access, owner, clock } = await setup();
    const invitation = await access.createInvitation(owner.principal, {
      role: "viewer",
      boardIds: ["a"],
      expiresAt: clock.value + 1000,
    });
    const viewer = await access.authenticateEnvelope(await device(), { kind: "invite", token: invitation.token });
    access.revokeInvitation(owner.principal, invitation.id);
    expect(() =>
      access.authorizeProcedure(viewer.principal, { path: "board.read", kind: "query", boardId: "a" }),
    ).toThrow("revoked");
    const share = await access.issueShare(owner.principal, { boardIds: ["a"], expiresAt: null, anonymous: true });
    const anonymous = await access.authenticateEnvelope(await device(), { kind: "share", token: share.token });
    expect(share.expiresAt).toBeNull();
    access.authorizeProcedure(anonymous.principal, { path: "board.read", kind: "query", boardId: "a" });
    expect(() => access.requireOwner(anonymous.principal)).toThrow();
    access.revokeGrant(owner.principal, share.id);
    expect(() =>
      access.authorizeProcedure(anonymous.principal, { path: "board.read", kind: "query", boardId: "a" }),
    ).toThrow("revoked");
    await expect(access.authenticateEnvelope(await device(), { kind: "share", token: share.token })).rejects.toThrow();
  });

  test("temporary shares expire and invalid scopes or expiry never create grants", async () => {
    const { access, owner, clock } = await setup();
    for (const expiresAt of [clock.value - 1, clock.value, Infinity, NaN, clock.value + 0.5]) {
      await expect(access.issueShare(owner.principal, { boardIds: ["a"], expiresAt })).rejects.toMatchObject({
        code: "INVALID_INPUT",
      });
    }
    await expect(access.issueShare(owner.principal, { boardIds: [] })).rejects.toThrow();
    await expect(
      access.createInvitation(owner.principal, { role: "viewer", boardIds: ["a"], expiresAt: null }),
    ).rejects.toThrow();
    await expect(
      access.createInvitation(owner.principal, {
        role: "viewer",
        boardIds: ["a"],
        expiresAt: clock.value + 8 * 86400_000,
      }),
    ).rejects.toThrow();
    const share = await access.issueShare(owner.principal, { boardIds: ["a"], expiresAt: clock.value + 1 });
    clock.value += 1;
    await expect(access.authenticateEnvelope(await device(), { kind: "share", token: share.token })).rejects.toThrow(
      "expired",
    );
  });

  test("owner listings omit secrets, retain share visibility, and reflect revocation in active sessions", async () => {
    const { access, owner, ownerDevice, clock, directory, identity } = await setup();
    const invitation = await access.createInvitation(owner.principal, {
      role: "viewer",
      boardIds: ["a"],
      expiresAt: clock.value + 1000,
    });
    const share = await access.issueShare(owner.principal, { boardIds: ["a"], anonymous: false });
    const guest = await access.authenticateEnvelope(ownerDevice, { kind: "share", token: share.token });
    expect(access.assertActive(guest.principal).id).toBe(share.id);
    expect(access.listInvitations(owner.principal)).toMatchObject([{ id: invitation.id, used: false, revoked: false }]);
    expect(access.listShares(owner.principal)).toMatchObject([{ id: share.id, anonymous: false, revoked: false }]);
    expect(JSON.stringify(access.listInvitations(owner.principal))).not.toContain(invitation.token);
    expect(JSON.stringify(access.listShares(owner.principal))).not.toContain(share.token);
    const restarted = await WorkerAccess.open({ directory, identity, now: () => clock.value });
    opened.push(restarted);
    const ownerAgain = await restarted.authenticateEnvelope(ownerDevice, { kind: "grant", token: owner.grant.token });
    expect(restarted.listShares(ownerAgain.principal)).toMatchObject([{ id: share.id, anonymous: false }]);
    access.revokeGrant(owner.principal, share.id);
    expect(access.listShares(owner.principal)).toMatchObject([{ revoked: true }]);
    expect(() => access.assertActive(guest.principal)).toThrow("revoked");
    expect(() => access.listShares(guest.principal)).toThrow();
    expect(access.getPairingInfo()).toMatchObject({ workerId: access.workerId, claimed: true, secret: null });
  });

  test("private shares require current approved device membership and retain its board limits", async () => {
    const { access, owner, clock } = await setup();
    const stranger = await device();
    const share = await access.issueShare(owner.principal, { boardIds: ["a", "b"], anonymous: false });
    await expect(access.authenticateEnvelope(stranger, { kind: "share", token: share.token })).rejects.toThrow(
      "worker-approved device grant",
    );
    // A platform label supplied with a credential does not establish worker membership.
    await expect(
      access.authenticateEnvelope(stranger, { kind: "share", token: share.token, accountId: "github:123" } as never),
    ).rejects.toThrow();
    const membership = await access.grantAccess(owner.principal, {
      devicePublicJwk: stranger.devicePublicJwk,
      role: "viewer",
      boardIds: ["a"],
      expiresAt: clock.value + 1000,
    });
    const approved = await access.authenticateEnvelope(stranger, { kind: "share", token: share.token });
    expect(approved.grant.boardIds).toEqual(["a"]);
    expect(access.assertActive(approved.principal).expiresAt).toBe(membership.expiresAt);
    access.authorizeProcedure(approved.principal, { path: "board.read", kind: "query", boardId: "a" });
    expect(() =>
      access.authorizeProcedure(approved.principal, { path: "board.read", kind: "query", boardId: "b" }),
    ).toThrow();
    access.revokeGrant(owner.principal, membership.id);
    expect(() => access.assertActive(approved.principal)).toThrow("membership grant revoked");
    await expect(access.authenticateEnvelope(stranger, { kind: "share", token: share.token })).rejects.toThrow();
  });

  test("temporary owners cannot create persistent grants, invitations or shares", async () => {
    const { access, owner, clock } = await setup();
    const tempDevice = await device();
    const expiration = clock.value + 1000;
    const temporary = await access.grantAccess(owner.principal, {
      devicePublicJwk: tempDevice.devicePublicJwk,
      role: "owner",
      expiresAt: expiration,
    });
    const tempOwner = await access.authenticateEnvelope(tempDevice, { kind: "grant", token: temporary.token });
    const persistentDevice = await device();
    const persistent = await access.grantAccess(tempOwner.principal, {
      devicePublicJwk: persistentDevice.devicePublicJwk,
      role: "owner",
      expiresAt: null,
    });
    const share = await access.issueShare(tempOwner.principal, { boardIds: ["a"], expiresAt: null });
    const invitation = await access.createInvitation(tempOwner.principal, {
      role: "owner",
      expiresAt: clock.value + 10_000,
    });
    expect([persistent.expiresAt, share.expiresAt, invitation.expiresAt]).toEqual([expiration, expiration, expiration]);
    expect([persistent.parentGrantId, share.parentGrantId, invitation.parentGrantId]).toEqual([
      temporary.id,
      temporary.id,
      temporary.id,
    ]);
    const child = await access.authenticateEnvelope(persistentDevice, { kind: "grant", token: persistent.token });
    const shared = await access.authenticateEnvelope(await device(), { kind: "share", token: share.token });
    clock.value = expiration;
    expect(() => access.assertActive(child.principal)).toThrow("expired");
    expect(() => access.assertActive(shared.principal)).toThrow("expired");
    await expect(
      access.authenticateEnvelope(persistentDevice, { kind: "grant", token: persistent.token }),
    ).rejects.toThrow("expired");
    await expect(
      access.authenticateEnvelope(await device(), { kind: "invite", token: invitation.token }),
    ).rejects.toThrow("expired");
  });

  test("revoking an issuing owner invalidates descendants through grants and redeemed invitations", async () => {
    const { access, owner, clock } = await setup();
    const delegateDevice = await device();
    const delegateGrant = await access.grantAccess(owner.principal, {
      devicePublicJwk: delegateDevice.devicePublicJwk,
      role: "owner",
    });
    const delegate = await access.authenticateEnvelope(delegateDevice, { kind: "grant", token: delegateGrant.token });
    const invitation = await access.createInvitation(delegate.principal, {
      role: "owner",
      expiresAt: clock.value + 10_000,
    });
    const invitedDevice = await device();
    const invited = await access.authenticateEnvelope(invitedDevice, { kind: "invite", token: invitation.token });
    expect(invited.grant.parentGrantId).toBe(delegateGrant.id);
    expect(invited.grant.parentId).toBe(invitation.id);
    const share = await access.issueShare(invited.principal, { boardIds: ["a"] });
    const shared = await access.authenticateEnvelope(await device(), { kind: "share", token: share.token });
    access.revokeGrant(owner.principal, delegateGrant.id);
    expect(() => access.assertActive(invited.principal)).toThrow("Issuing grant revoked");
    expect(() => access.assertActive(shared.principal)).toThrow("Issuing grant revoked");
    await expect(
      access.authenticateEnvelope(invitedDevice, { kind: "grant", token: invited.grant.token }),
    ).rejects.toThrow();
    await expect(access.issueShare(invited.principal, { boardIds: ["a"] })).rejects.toThrow();
    await expect(
      access.authenticateEnvelope(await device(), { kind: "invite", token: invitation.token }),
    ).rejects.toThrow();
  });

  test("delegation has a bounded depth and cannot create unusable authority chains", async () => {
    const { access, owner, ownerDevice } = await setup();
    let current = owner;
    for (let depth = 1; depth < 32; depth++) {
      const grant = await access.grantAccess(current.principal, {
        devicePublicJwk: ownerDevice.devicePublicJwk,
        role: "owner",
      });
      current = await access.authenticateEnvelope(ownerDevice, { kind: "grant", token: grant.token });
    }
    access.requireOwner(current.principal);
    await expect(
      access.grantAccess(current.principal, { devicePublicJwk: ownerDevice.devicePublicJwk, role: "owner" }),
    ).rejects.toThrow("delegation depth exceeded");
  });

  test("descendant owners cannot revoke their authority ancestors and orphan the worker", async () => {
    const { access, owner, clock } = await setup();
    const delegateDevice = await device();
    const invite = await access.createInvitation(owner.principal, { role: "owner", expiresAt: clock.value + 1000 });
    const delegate = await access.authenticateEnvelope(delegateDevice, { kind: "invite", token: invite.token });
    expect(() => access.revokeGrant(delegate.principal, owner.grant.id)).toThrow("ancestor");
    expect(() => access.revokeInvitation(delegate.principal, invite.id)).toThrow("authority chain");
    access.requireOwner(owner.principal);
    access.requireOwner(delegate.principal);
    const otherDevice = await device();
    const otherGrant = await access.grantAccess(owner.principal, {
      role: "owner",
      devicePublicJwk: otherDevice.devicePublicJwk,
    });
    const other = await access.authenticateEnvelope(otherDevice, { kind: "grant", token: otherGrant.token });
    access.revokeGrant(delegate.principal, otherGrant.id);
    expect(() => access.assertActive(other.principal)).toThrow("revoked");
  });

  test("platform account labels, forged principals and malicious headers cannot grant ownership", async () => {
    const { access, owner } = await setup();
    const stranger = await device();
    const forged = {
      deviceId: stranger.deviceId,
      grantId: owner.grant.id,
      role: "owner",
      boardIds: [],
      accountId: "github:attacker",
    } as AccessPrincipal;
    expect(() => access.requireOwner(forged)).toThrow("Verified encrypted session required");
    const grant = await access.grantAccess(owner.principal, {
      role: "viewer",
      boardIds: ["a"],
      devicePublicJwk: stranger.devicePublicJwk,
      accountId: "github:attacker",
    });
    const credential = {
      kind: "grant" as const,
      token: grant.token,
      role: "owner",
      headers: { "x-worker-role": "owner", authorization: owner.grant.token },
    };
    const viewer = await access.authenticateEnvelope(stranger, credential);
    expect(viewer.principal.accountId).toBe("github:attacker");
    expect(() => access.requireOwner(viewer.principal)).toThrow("owner grant required");
    await expect(
      access.grantAccess(viewer.principal, { role: "owner", devicePublicJwk: stranger.devicePublicJwk }),
    ).rejects.toThrow();
    await expect(access.issueShare(viewer.principal, { boardIds: ["a"] })).rejects.toThrow();
    await expect(
      access.authenticateEnvelope({ ...stranger, deviceId: owner.principal.deviceId }, credential),
    ).rejects.toThrow("identity does not match");
  });

  test("only owners approve new owner devices and platform enrollment proof", async () => {
    const { access, owner, clock } = await setup();
    const secondDevice = await device();
    const invitation = await access.createInvitation(owner.principal, { role: "owner", expiresAt: clock.value + 1000 });
    const second = await access.authenticateEnvelope(secondDevice, { kind: "invite", token: invitation.token });
    access.requireOwner(second.principal);
    const proof = await access.signEnrollment(second.principal, {
      version: 1,
      type: "homarr-platform-enrollment",
      challengeId: "challenge",
      nonce: "a".repeat(32),
      userId: "github:123",
      audience: "https://remote.homarr.dev",
      expiresAt: clock.value + 1000,
    });
    expect(proof.workerId).toBe(access.workerId);
    const { verifyEnrollmentSignature } = await import("@homarr/remote-protocol");
    expect(await verifyEnrollmentSignature(proof)).toBe(true);
    expect(
      await verifyEnrollmentSignature({
        ...proof,
        challenge: { ...proof.challenge, userId: "github:attacker" },
      }),
    ).toBe(false);
  });
});
