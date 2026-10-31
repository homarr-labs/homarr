/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test, vi } from "vitest";

import type { Session } from "@homarr/auth";
import { createId } from "@homarr/common";
import { apps } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { GroupPermissionKey } from "@homarr/definitions";
import type * as IconsModule from "@homarr/icons";

import { appRouter } from "../app";
import * as appAccessControl from "../app/app-access-control";

// Mock the auth module to return an empty session
vi.mock("@homarr/auth", () => ({ auth: () => ({}) as Session }));

const { fetchWebsiteMetadataAsyncMock, createImageAsyncMock } = vi.hoisted(() => ({
  fetchWebsiteMetadataAsyncMock: vi.fn(),
  createImageAsyncMock: vi.fn(),
}));

// getIconForName keeps its real implementation, so only the network-dependent part is mocked
vi.mock("@homarr/icons", async (importOriginal) => ({
  ...(await importOriginal<typeof IconsModule>()),
  fetchWebsiteMetadataAsync: fetchWebsiteMetadataAsyncMock,
}));
vi.mock("@homarr/image-proxy", () => ({
  ImageProxy: class {
    createImageAsync = createImageAsyncMock;
  },
}));

const createFakeAccessControl = (canAccess: boolean) =>
  vi.fn(
    class {
      canUserSeeAppAsync = async (_: string) => await Promise.resolve(canAccess);
      canUserSeeAppsAsync = async (_: string[]) => await Promise.resolve(canAccess);
    } as unknown as typeof appAccessControl.AppAccessControl,
  );

const createDefaultSession = (permissions: GroupPermissionKey[] = []): Session => ({
  user: { id: createId(), permissions, colorScheme: "light" },
  expires: new Date().toISOString(),
});

describe("all should return all apps", () => {
  test("should return all apps with session", async () => {
    // Arrange
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      deviceType: undefined,
      session: createDefaultSession(["app-modify-all"]),
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
  test("should throw UNAUTHORIZED if the user is not authenticated", async () => {
    // Arrange
    const caller = appRouter.createCaller({
      db: createDb(),
      deviceType: undefined,
      session: null,
    });

    // Act
    const actAsync = async () => await caller.all();

    // Assert
    await expect(actAsync()).rejects.toThrow("UNAUTHORIZED");
  });
  test("should throw FORBIDDEN without app-modify-all permission", async () => {
    // Arrange
    const caller = appRouter.createCaller({
      db: createDb(),
      deviceType: undefined,
      session: createDefaultSession(),
    });

    // Act
    const actAsync = async () => await caller.all();

    // Assert
    await expect(actAsync()).rejects.toThrow("Permission denied");
  });
});

describe("getPaginated should return apps to authenticated users", () => {
  test("should throw UNAUTHORIZED without a session", async () => {
    const caller = appRouter.createCaller({
      db: createDb(),
      deviceType: undefined,
      session: null,
    });

    await expect(caller.getPaginated({ page: 1, pageSize: 10 })).rejects.toThrow("UNAUTHORIZED");
  });

  test("should return apps with app-modify-all permission", async () => {
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      deviceType: undefined,
      session: createDefaultSession(["app-modify-all"]),
    });
    await db.insert(apps).values({ id: "1", name: "Homarr", iconUrl: "https://homarr.dev/icon.svg" });

    await expect(caller.getPaginated({ page: 1, pageSize: 10 })).resolves.toMatchObject({
      totalCount: 1,
      items: [{ id: "1" }],
    });
  });

  test("should throw FORBIDDEN without app-modify-all permission", async () => {
    const caller = appRouter.createCaller({
      db: createDb(),
      deviceType: undefined,
      session: createDefaultSession(),
    });

    await expect(caller.getPaginated({ page: 1, pageSize: 10 })).rejects.toThrow("Permission denied");
  });
});

describe("search should require app-modify-all or board-modify-all permission", () => {
  test("should throw FORBIDDEN without app-modify-all or board-modify-all permission", async () => {
    const caller = appRouter.createCaller({
      db: createDb(),
      deviceType: undefined,
      session: createDefaultSession(),
    });

    await expect(caller.search({ query: "Homarr" })).rejects.toThrow("Permission denied");
  });

  test("should return apps with board-modify-all permission", async () => {
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      deviceType: undefined,
      session: createDefaultSession(["board-modify-all"]),
    });
    await db.insert(apps).values({ id: "1", name: "Homarr", iconUrl: "https://homarr.dev/icon.svg" });

    const result = await caller.search({ query: "Homarr" });

    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("1");
  });
});

describe("byId should return an app by id", () => {
  test("should return an app by id when canUserSeeAppAsync returns true", async () => {
    // Arrange
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
    });
    vi.spyOn(appAccessControl, "AppAccessControl").mockImplementation(createFakeAccessControl(true));

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

    // Act
    const result = await caller.byId({ id: "2" });

    // Assert
    expect(result.name).toBe("Mantine");
  });

  test("should throw NOT_FOUND error when canUserSeeAppAsync returns false", async () => {
    // Arrange
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      deviceType: undefined,
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
    ]);
    vi.spyOn(appAccessControl, "AppAccessControl").mockImplementation(createFakeAccessControl(false));

    // Act
    const actAsync = async () => await caller.byId({ id: "2" });

    // Assert
    await expect(actAsync()).rejects.toThrow("App not found");
  });

  test("should throw an error if the app does not exist", async () => {
    // Arrange
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      deviceType: undefined,
      session: null,
    });

    // Act
    const actAsync = async () => await caller.byId({ id: "2" });

    // Assert
    await expect(actAsync()).rejects.toThrow("App not found");
  });
});

describe("create should create a new app with all arguments", () => {
  test("should create a new app", async () => {
    // Arrange
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      deviceType: undefined,
      session: createDefaultSession(["app-create"]),
    });
    const input = {
      name: "Mantine",
      description: "React components and hooks library",
      iconUrl: "https://mantine.dev/favicon.svg",
      href: "https://mantine.dev",
      pingUrl: "https://mantine.dev/a",
    };

    // Act
    await caller.create(input);

    // Assert
    const dbApp = await db.query.apps.findFirst();
    expect(dbApp).toBeDefined();
    expect(dbApp!.name).toBe(input.name);
    expect(dbApp!.description).toBe(input.description);
    expect(dbApp!.iconUrl).toBe(input.iconUrl);
    expect(dbApp!.href).toBe(input.href);
    expect(dbApp!.pingUrl).toBe(input.pingUrl);
  });

  test("should create a new app only with required arguments", async () => {
    // Arrange
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      deviceType: undefined,
      session: createDefaultSession(["app-create"]),
    });
    const input = {
      name: "Mantine",
      description: null,
      iconUrl: "https://mantine.dev/favicon.svg",
      href: null,
      pingUrl: "",
    };

    // Act
    await caller.create(input);

    // Assert
    const dbApp = await db.query.apps.findFirst();
    expect(dbApp).toBeDefined();
    expect(dbApp!.name).toBe(input.name);
    expect(dbApp!.description).toBe(input.description);
    expect(dbApp!.iconUrl).toBe(input.iconUrl);
    expect(dbApp!.href).toBe(input.href);
    expect(dbApp!.pingUrl).toBe(null);
  });
});

describe("update should update an app", () => {
  test("should update an app", async () => {
    // Arrange
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      deviceType: undefined,
      session: createDefaultSession(["app-modify-all"]),
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
      pingUrl: "https://mantine.dev/a",
    };

    // Act
    await caller.update(input);

    // Assert
    const dbApp = await db.query.apps.findFirst();

    expect(dbApp).toBeDefined();
    expect(dbApp!.name).toBe(input.name);
    expect(dbApp!.description).toBe(input.description);
    expect(dbApp!.iconUrl).toBe(input.iconUrl);
    expect(dbApp!.href).toBe(input.href);
  });

  test("should throw an error if the app does not exist", async () => {
    // Arrange
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      deviceType: undefined,
      session: createDefaultSession(["app-modify-all"]),
    });

    // Act
    const actAsync = async () =>
      await caller.update({
        id: createId(),
        name: "Mantine",
        iconUrl: "https://mantine.dev/favicon.svg",
        description: null,
        href: null,
        pingUrl: "",
      });

    // Assert
    await expect(actAsync()).rejects.toThrow("App not found");
  });
});

describe("delete should delete an app", () => {
  test("should delete an app", async () => {
    // Arrange
    const db = createDb();
    const caller = appRouter.createCaller({
      db,
      deviceType: undefined,
      session: createDefaultSession(["app-full-all"]),
    });

    const appId = createId();
    await db.insert(apps).values({
      id: appId,
      name: "Mantine",
      iconUrl: "https://mantine.dev/favicon.svg",
    });

    // Act
    await caller.delete({ id: appId });

    // Assert
    const dbApp = await db.query.apps.findFirst();
    expect(dbApp).toBeUndefined();
  });
});

describe("detectMetadata", () => {
  test("refuses a user who may not create apps without detecting anything", async () => {
    // Arrange
    const caller = appRouter.createCaller({ db: createDb(), deviceType: undefined, session: createDefaultSession([]) });

    // Act & Assert
    await expect(caller.detectMetadata({ href: "https://app.example.com" })).rejects.toThrow("Permission denied");
    expect(fetchWebsiteMetadataAsyncMock).not.toHaveBeenCalled();
  });

  test("proxies the detected icon so the tile loads it from Homarr", async () => {
    // Arrange
    fetchWebsiteMetadataAsyncMock.mockResolvedValueOnce({
      title: "Example App",
      iconUrl: "https://app.example.com/favicon.ico",
    });
    createImageAsyncMock.mockResolvedValueOnce("/api/image-proxy/persistent.abc");
    const caller = appRouter.createCaller({
      db: createDb(),
      deviceType: undefined,
      session: createDefaultSession(["app-create"]),
    });

    // Act
    const result = await caller.detectMetadata({ href: "https://app.example.com" });

    // Assert
    expect(result).toEqual({ name: "Example App", iconUrl: "/api/image-proxy/persistent.abc" });
    expect(createImageAsyncMock).toHaveBeenCalledWith("https://app.example.com/favicon.ico", undefined, {
      persistent: true,
      allowPrivateNetwork: true,
    });
  });

  test("proxies an icon hosted on another public origin", async () => {
    // Arrange
    fetchWebsiteMetadataAsyncMock.mockResolvedValueOnce({
      title: "Example App",
      iconUrl: "https://cdn.example.com/favicon.ico",
    });
    createImageAsyncMock.mockResolvedValueOnce("/api/image-proxy/persistent.cdn");
    const caller = appRouter.createCaller({
      db: createDb(),
      deviceType: undefined,
      session: createDefaultSession(["app-create"]),
    });

    // Act
    const result = await caller.detectMetadata({ href: "https://app.example.com" });

    // Assert
    expect(result).toEqual({ name: "Example App", iconUrl: "/api/image-proxy/persistent.cdn" });
    expect(createImageAsyncMock).toHaveBeenCalledWith("https://cdn.example.com/favicon.ico", undefined, {
      persistent: true,
      allowPrivateNetwork: false,
    });
  });

  test("leaves a page-declared icon on another private host to the browser", async () => {
    // Arrange
    fetchWebsiteMetadataAsyncMock.mockResolvedValueOnce({
      title: "Example App",
      iconUrl: "http://192.168.1.10/private",
    });
    const caller = appRouter.createCaller({
      db: createDb(),
      deviceType: undefined,
      session: createDefaultSession(["app-create"]),
    });

    // Act
    const result = await caller.detectMetadata({ href: "https://app.example.com" });

    // Assert
    expect(result).toEqual({ name: "Example App", iconUrl: "http://192.168.1.10/private" });
    expect(createImageAsyncMock).not.toHaveBeenCalled();
  });

  test("proxies an icon on the private host that was dropped", async () => {
    // Arrange
    fetchWebsiteMetadataAsyncMock.mockResolvedValueOnce({
      title: "Home Assistant",
      iconUrl: "http://192.168.1.10/favicon.ico",
    });
    createImageAsyncMock.mockResolvedValueOnce("/api/image-proxy/persistent.local.abc");
    const caller = appRouter.createCaller({
      db: createDb(),
      deviceType: undefined,
      session: createDefaultSession(["app-create"]),
    });

    // Act
    const result = await caller.detectMetadata({ href: "http://192.168.1.10:8123/" });

    // Assert
    expect(result).toEqual({ name: "Home Assistant", iconUrl: "/api/image-proxy/persistent.local.abc" });
    expect(createImageAsyncMock).toHaveBeenCalledWith("http://192.168.1.10/favicon.ico", undefined, {
      persistent: true,
      allowPrivateNetwork: true,
    });
  });

  test("falls back to the site icon url when registering it with the proxy fails", async () => {
    // Arrange
    fetchWebsiteMetadataAsyncMock.mockResolvedValueOnce({
      title: "Example App",
      iconUrl: "https://app.example.com/favicon.ico",
    });
    createImageAsyncMock.mockRejectedValueOnce(new Error("proxy unavailable"));
    const caller = appRouter.createCaller({
      db: createDb(),
      deviceType: undefined,
      session: createDefaultSession(["app-create"]),
    });

    // Act
    const result = await caller.detectMetadata({ href: "https://app.example.com" });

    // Assert
    expect(result).toEqual({ name: "Example App", iconUrl: "https://app.example.com/favicon.ico" });
  });

  test("uses the hostname when no title was detected", async () => {
    // Arrange
    fetchWebsiteMetadataAsyncMock.mockResolvedValueOnce({ title: null, iconUrl: null });
    const caller = appRouter.createCaller({
      db: createDb(),
      deviceType: undefined,
      session: createDefaultSession(["app-create"]),
    });

    // Act
    const result = await caller.detectMetadata({ href: "https://app.example.com" });

    // Assert
    expect(result.name).toBe("app.example.com");
    expect(createImageAsyncMock).not.toHaveBeenCalled();
  });
});
