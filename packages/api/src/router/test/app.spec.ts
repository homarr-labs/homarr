/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/db";
import { apps } from "@homarr/db/schema/sqlite";
import { createDb } from "@homarr/db/test";

import { appRouter } from "../app";

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));

describe("all should return all apps", () => {
  test("should return all apps", async () => {
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      session: null,
    });

    await db.insert(apps).values([
      {
        id: "2",
        name: "Mantine",
        description: "React components and hooks library",
        iconUrl: "https://mantine.dev/favicon.svg",
        href: "https://mantine.dev",
      },
      {
        id: "1",
        name: "Tabler Icons",
        iconUrl: "https://tabler.io/favicon.ico",
      },
    ]);

    const result = await caller.all();
    expect(result.length).toBe(2);
    expect(result[0]!.id).toBe("2");
    expect(result[1]!.id).toBe("1");
    expect(result[0]!.href).toBeDefined();
    expect(result[0]!.description).toBeDefined();
    expect(result[1]!.href).toBeNull();
    expect(result[1]!.description).toBeNull();
  });
});

describe("byId should return an app by id", () => {
  test("should return an app by id", async () => {
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      session: null,
    });

    await db.insert(apps).values([
      {
        id: "2",
        name: "Mantine",
        description: "React components and hooks library",
        iconUrl: "https://mantine.dev/favicon.svg",
        href: "https://mantine.dev",
      },
      {
        id: "1",
        name: "Tabler Icons",
        iconUrl: "https://tabler.io/favicon.ico",
      },
    ]);

    const result = await caller.byId({ id: "2" });
    expect(result.name).toBe("Mantine");
  });

  test("should throw an error if the app does not exist", async () => {
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      session: null,
    });

    const actAsync = async () => await caller.byId({ id: "2" });
    await expect(actAsync()).rejects.toThrow("App not found");
  });
});

describe("create should create a new app with all arguments", () => {
  test("should create a new app", async () => {
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      session: null,
    });
    const input = {
      name: "Mantine",
      description: "React components and hooks library",
      iconUrl: "https://mantine.dev/favicon.svg",
      href: "https://mantine.dev",
    };

    await caller.create(input);

    const dbApp = await db.query.apps.findFirst();
    expect(dbApp).toBeDefined();
    expect(dbApp!.name).toBe(input.name);
    expect(dbApp!.description).toBe(input.description);
    expect(dbApp!.iconUrl).toBe(input.iconUrl);
    expect(dbApp!.href).toBe(input.href);
  });

  test("should create a new app only with required arguments", async () => {
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      session: null,
    });
    const input = {
      name: "Mantine",
      description: null,
      iconUrl: "https://mantine.dev/favicon.svg",
      href: null,
    };

    await caller.create(input);

    const dbApp = await db.query.apps.findFirst();
    expect(dbApp).toBeDefined();
    expect(dbApp!.name).toBe(input.name);
    expect(dbApp!.description).toBe(input.description);
    expect(dbApp!.iconUrl).toBe(input.iconUrl);
    expect(dbApp!.href).toBe(input.href);
  });
});

describe("update should update an app", () => {
  test("should update an app", async () => {
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      session: null,
    });

    const appId = createId();
    const toInsert = {
      id: appId,
      name: "Mantine",
      iconUrl: "https://mantine.dev/favicon.svg",
    };

    await db.insert(apps).values(toInsert);

    const input = {
      id: appId,
      name: "Mantine2",
      description: "React components and hooks library",
      iconUrl: "https://mantine.dev/favicon.svg2",
      href: "https://mantine.dev",
    };

    await caller.update(input);

    const dbApp = await db.query.apps.findFirst();

    expect(dbApp).toBeDefined();
    expect(dbApp!.name).toBe(input.name);
    expect(dbApp!.description).toBe(input.description);
    expect(dbApp!.iconUrl).toBe(input.iconUrl);
    expect(dbApp!.href).toBe(input.href);
  });

  test("should throw an error if the app does not exist", async () => {
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      session: null,
    });

    const actAsync = async () =>
      await caller.update({
        id: createId(),
        name: "Mantine",
        iconUrl: "https://mantine.dev/favicon.svg",
        description: null,
        href: null,
      });
    await expect(actAsync()).rejects.toThrow("App not found");
  });
});

describe("delete should delete an app", () => {
  test("should delete an app", async () => {
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      session: null,
    });

    const appId = createId();
    await db.insert(apps).values({
      id: appId,
      name: "Mantine",
      iconUrl: "https://mantine.dev/favicon.svg",
    });

    await caller.delete({ id: appId });

    const dbApp = await db.query.apps.findFirst();
    expect(dbApp).toBeUndefined();
  });
});
