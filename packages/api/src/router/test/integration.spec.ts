import { describe, expect, it, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/db";
import { integrations, integrationSecrets } from "@homarr/db/schema/sqlite";
import { createDb } from "@homarr/db/test";

import type { RouterInputs } from "../..";
import { encryptSecret, integrationRouter } from "../integration";
import { expectToBeDefined } from "./helper";

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));

describe("all should return all integrations", () => {
  it("should return all integrations", async () => {
    const db = createDb();
    const caller = integrationRouter.createCaller({
      db,
      session: null,
    });

    await db.insert(integrations).values([
      {
        id: "1",
        name: "Home assistant",
        kind: "homeAssistant",
        url: "http://homeassist.local",
      },
      {
        id: "2",
        name: "Home plex server",
        kind: "plex",
        url: "http://plex.local",
      },
    ]);

    const result = await caller.all();
    expect(result.length).toBe(2);
    expect(result[0]!.kind).toBe("plex");
    expect(result[1]!.kind).toBe("homeAssistant");
  });
});

describe("byId should return an integration by id", () => {
  it("should return an integration by id", async () => {
    const db = createDb();
    const caller = integrationRouter.createCaller({
      db,
      session: null,
    });

    await db.insert(integrations).values([
      {
        id: "1",
        name: "Home assistant",
        kind: "homeAssistant",
        url: "http://homeassist.local",
      },
      {
        id: "2",
        name: "Home plex server",
        kind: "plex",
        url: "http://plex.local",
      },
    ]);

    const result = await caller.byId({ id: "2" });
    expect(result.kind).toBe("plex");
  });

  it("should throw an error if the integration does not exist", async () => {
    const db = createDb();
    const caller = integrationRouter.createCaller({
      db,
      session: null,
    });

    const act = async () => await caller.byId({ id: "2" });
    await expect(act()).rejects.toThrow("Integration not found");
  });

  it("should only return the public secret values", async () => {
    const db = createDb();
    const caller = integrationRouter.createCaller({
      db,
      session: null,
    });

    await db.insert(integrations).values([
      {
        id: "1",
        name: "Home assistant",
        kind: "homeAssistant",
        url: "http://homeassist.local",
      },
    ]);
    await db.insert(integrationSecrets).values([
      {
        kind: "username",
        value: encryptSecret("musterUser"),
        integrationId: "1",
        updatedAt: new Date(),
      },
      {
        kind: "password",
        value: encryptSecret("Password123!"),
        integrationId: "1",
        updatedAt: new Date(),
      },
      {
        kind: "apiKey",
        value: encryptSecret("1234567890"),
        integrationId: "1",
        updatedAt: new Date(),
      },
    ]);

    const result = await caller.byId({ id: "1" });
    expect(result.secrets.length).toBe(3);
    const username = expectToBeDefined(
      result.secrets.find((secret) => secret.kind === "username"),
    );
    expect(username.value).not.toBeNull();
    const password = expectToBeDefined(
      result.secrets.find((secret) => secret.kind === "password"),
    );
    expect(password.value).toBeNull();
    const apiKey = expectToBeDefined(
      result.secrets.find((secret) => secret.kind === "apiKey"),
    );
    expect(apiKey.value).toBeNull();
  });
});

describe("create should create a new integration", () => {
  it("should create a new integration", async () => {
    const db = createDb();
    const caller = integrationRouter.createCaller({
      db,
      session: null,
    });
    const input = {
      name: "Jellyfin",
      kind: "jellyfin" as const,
      url: "http://jellyfin.local",
      secrets: [{ kind: "apiKey" as const, value: "1234567890" }],
    };

    const fakeNow = new Date("2023-07-01T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(fakeNow);
    await caller.create(input);
    vi.useRealTimers();

    const dbIntegration = await db.query.integrations.findFirst();
    const dbSecret = await db.query.integrationSecrets.findFirst();
    expect(dbIntegration).toBeDefined();
    expect(dbIntegration!.name).toBe(input.name);
    expect(dbIntegration!.kind).toBe(input.kind);
    expect(dbIntegration!.url).toBe(input.url);

    expect(dbSecret!.integrationId).toBe(dbIntegration!.id);
    expect(dbSecret).toBeDefined();
    expect(dbSecret!.kind).toBe(input.secrets[0]!.kind);
    expect(dbSecret!.value).toMatch(/^[a-f0-9]+.[a-f0-9]+$/);
    expect(dbSecret!.updatedAt).toEqual(fakeNow);
  });
});

describe("update should update an integration", () => {
  it("should update an integration", async () => {
    const db = createDb();
    const caller = integrationRouter.createCaller({
      db,
      session: null,
    });

    const lastWeek = new Date("2023-06-24T00:00:00Z");
    const integrationId = createId();
    const toInsert = {
      id: integrationId,
      name: "Pi Hole",
      kind: "piHole" as const,
      url: "http://hole.local",
    };

    await db.insert(integrations).values(toInsert);

    const usernameToInsert = {
      kind: "username" as const,
      value: encryptSecret("musterUser"),
      integrationId,
      updatedAt: lastWeek,
    };

    const passwordToInsert = {
      kind: "password" as const,
      value: encryptSecret("Password123!"),
      integrationId,
      updatedAt: lastWeek,
    };
    await db
      .insert(integrationSecrets)
      .values([usernameToInsert, passwordToInsert]);

    const input = {
      id: integrationId,
      name: "Milky Way Pi Hole",
      kind: "piHole" as const,
      url: "http://milkyway.local",
      secrets: [
        { kind: "username" as const, value: "newUser" },
        { kind: "password" as const, value: null },
        { kind: "apiKey" as const, value: "1234567890" },
      ],
    };

    const fakeNow = new Date("2023-07-01T00:00:00Z");
    vi.useFakeTimers();
    vi.setSystemTime(fakeNow);
    await caller.update(input);
    vi.useRealTimers();

    const dbIntegration = await db.query.integrations.findFirst();
    const dbSecrets = await db.query.integrationSecrets.findMany();

    expect(dbIntegration).toBeDefined();
    expect(dbIntegration!.name).toBe(input.name);
    expect(dbIntegration!.kind).toBe(input.kind);
    expect(dbIntegration!.url).toBe(input.url);

    expect(dbSecrets.length).toBe(3);
    const username = expectToBeDefined(
      dbSecrets.find((secret) => secret.kind === "username"),
    );
    const password = expectToBeDefined(
      dbSecrets.find((secret) => secret.kind === "password"),
    );
    const apiKey = expectToBeDefined(
      dbSecrets.find((secret) => secret.kind === "apiKey"),
    );
    expect(username.value).toMatch(/^[a-f0-9]+.[a-f0-9]+$/);
    expect(password.value).toMatch(/^[a-f0-9]+.[a-f0-9]+$/);
    expect(apiKey.value).toMatch(/^[a-f0-9]+.[a-f0-9]+$/);
    expect(username.updatedAt).toEqual(fakeNow);
    expect(password.updatedAt).toEqual(lastWeek);
    expect(apiKey.updatedAt).toEqual(fakeNow);
    expect(username.value).not.toEqual(usernameToInsert.value);
    expect(password.value).toEqual(passwordToInsert.value);
    expect(apiKey.value).not.toEqual(input.secrets[2]!.value);
  });

  it("should throw an error if the integration does not exist", async () => {
    const db = createDb();
    const caller = integrationRouter.createCaller({
      db,
      session: null,
    });

    const act = async () =>
      await caller.update({
        id: createId(),
        name: "Pi Hole",
        url: "http://hole.local",
        secrets: [],
      });
    await expect(act()).rejects.toThrow("Integration not found");
  });
});

describe("delete should delete an integration", () => {
  it("should delete an integration", async () => {
    const db = createDb();
    const caller = integrationRouter.createCaller({
      db,
      session: null,
    });

    const integrationId = createId();
    await db.insert(integrations).values({
      id: integrationId,
      name: "Home assistant",
      kind: "homeAssistant",
      url: "http://homeassist.local",
    });

    await db.insert(integrationSecrets).values([
      {
        kind: "username",
        value: encryptSecret("example"),
        integrationId,
        updatedAt: new Date(),
      },
    ]);

    await caller.delete({ id: integrationId });

    const dbIntegration = await db.query.integrations.findFirst();
    expect(dbIntegration).toBeUndefined();
    const dbSecrets = await db.query.integrationSecrets.findMany();
    expect(dbSecrets.length).toBe(0);
  });
});

describe("testConnection should test the connection to an integration", () => {
  it.each([
    [
      "nzbGet" as const,
      [
        { kind: "username" as const, value: null },
        { kind: "password" as const, value: "Password123!" },
      ],
    ],
    [
      "nzbGet" as const,
      [
        { kind: "username" as const, value: "exampleUser" },
        { kind: "password" as const, value: null },
      ],
    ],
    ["sabNzbd" as const, [{ kind: "apiKey" as const, value: null }]],
    [
      "sabNzbd" as const,
      [
        { kind: "username" as const, value: "exampleUser" },
        { kind: "password" as const, value: "Password123!" },
      ],
    ],
  ])(
    "should fail when a required secret is missing when creating %s integration",
    async (kind, secrets) => {
      const db = createDb();
      const caller = integrationRouter.createCaller({
        db,
        session: null,
      });

      const input: RouterInputs["integration"]["testConnection"] = {
        id: null,
        kind,
        url: `http://${kind}.local`,
        secrets,
      };

      const act = async () => await caller.testConnection(input);
      await expect(act()).rejects.toThrow("SECRETS_NOT_DEFINED");
    },
  );

  it.each([
    [
      "nzbGet" as const,
      [
        { kind: "username" as const, value: "exampleUser" },
        { kind: "password" as const, value: "Password123!" },
      ],
    ],
    ["sabNzbd" as const, [{ kind: "apiKey" as const, value: "1234567890" }]],
  ])(
    "should be successful when all required secrets are defined for creation of %s integration",
    async (kind, secrets) => {
      const db = createDb();
      const caller = integrationRouter.createCaller({
        db,
        session: null,
      });

      const input: RouterInputs["integration"]["testConnection"] = {
        id: null,
        kind,
        url: `http://${kind}.local`,
        secrets,
      };

      const act = async () => await caller.testConnection(input);
      await expect(act()).resolves.toBeUndefined();
    },
  );

  it("should be successful when all required secrets are defined for updating an nzbGet integration", async () => {
    const db = createDb();
    const caller = integrationRouter.createCaller({
      db,
      session: null,
    });

    const input: RouterInputs["integration"]["testConnection"] = {
      id: createId(),
      kind: "nzbGet",
      url: "http://nzbGet.local",
      secrets: [
        { kind: "username", value: "exampleUser" },
        { kind: "password", value: "Password123!" },
      ],
    };

    const act = async () => await caller.testConnection(input);
    await expect(act()).resolves.toBeUndefined();
  });

  it("should be successful when overriding one of the secrets for an existing nzbGet integration", async () => {
    const db = createDb();
    const caller = integrationRouter.createCaller({
      db,
      session: null,
    });

    const integrationId = createId();
    await db.insert(integrations).values({
      id: integrationId,
      name: "NZBGet",
      kind: "nzbGet",
      url: "http://nzbGet.local",
    });

    await db.insert(integrationSecrets).values([
      {
        kind: "username",
        value: encryptSecret("exampleUser"),
        integrationId,
        updatedAt: new Date(),
      },
      {
        kind: "password",
        value: encryptSecret("Password123!"),
        integrationId,
        updatedAt: new Date(),
      },
    ]);

    const input: RouterInputs["integration"]["testConnection"] = {
      id: integrationId,
      kind: "nzbGet",
      url: "http://nzbGet.local",
      secrets: [
        { kind: "username", value: "newUser" },
        { kind: "password", value: null },
      ],
    };

    const act = async () => await caller.testConnection(input);
    await expect(act()).resolves.toBeUndefined();
  });

  it("should fail when a required secret is missing for an existing nzbGet integration", async () => {
    const db = createDb();
    const caller = integrationRouter.createCaller({
      db,
      session: null,
    });

    const integrationId = createId();
    await db.insert(integrations).values({
      id: integrationId,
      name: "NZBGet",
      kind: "nzbGet",
      url: "http://nzbGet.local",
    });

    await db.insert(integrationSecrets).values([
      {
        kind: "username",
        value: encryptSecret("exampleUser"),
        integrationId,
        updatedAt: new Date(),
      },
    ]);

    const input: RouterInputs["integration"]["testConnection"] = {
      id: integrationId,
      kind: "nzbGet",
      url: "http://nzbGet.local",
      secrets: [
        { kind: "username", value: "newUser" },
        { kind: "apiKey", value: "1234567890" },
      ],
    };

    const act = async () => await caller.testConnection(input);
    await expect(act()).rejects.toThrow("SECRETS_NOT_DEFINED");
  });

  it("should fail when the updating integration does not exist", async () => {
    const db = createDb();
    const caller = integrationRouter.createCaller({
      db,
      session: null,
    });

    const act = async () =>
      await caller.testConnection({
        id: createId(),
        kind: "nzbGet",
        url: "http://nzbGet.local",
        secrets: [
          { kind: "username", value: null },
          { kind: "password", value: "Password123!" },
        ],
      });
    await expect(act()).rejects.toThrow("SECRETS_NOT_DEFINED");
  });
});
