import { createHash } from "node:crypto";

import SuperJSON from "superjson";
import { assert, beforeEach, describe, expect, it, vi } from "vitest";

import { eq, inArray } from "@homarr/db";
import {
  apps,
  boards,
  integrationItems,
  integrationSecrets,
  integrations,
  itemLayouts,
  items,
  layouts,
  onboarding,
  sectionLayouts,
  sections,
  users,
} from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";
import type { WidgetKind } from "@homarr/definitions";
import type { OnboardingCompleteSetupInput } from "@homarr/validation/onboarding";

import { claimOnboardingAsync, isOnboardingClaimValidAsync } from "../../onboarding-claim";
import * as integrationConnection from "../integration/integration-test-connection";

const listDiscoveredContainersAsync = vi.hoisted(() => vi.fn());
const createIdMock = vi.hoisted(() => vi.fn());
const isProviderEnabled = vi.hoisted(() => vi.fn<(provider: string) => boolean>(() => false));
const stableAppIdForSource = (sourceId: string) => {
  const digest = createHash("sha256").update(sourceId).digest("hex").slice(0, 32);
  return `onboarding_app_${digest}`;
};
const stableIntegrationIdForSource = (sourceId: string) => {
  const digest = createHash("sha256").update(sourceId).digest("hex").slice(0, 32);
  return `onboarding_integration_${digest}`;
};

vi.mock("@homarr/auth/server", () => ({ isProviderEnabled }));
vi.mock("@homarr/common", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@homarr/common")>()),
  createId: createIdMock,
}));
vi.mock("@homarr/docker", () => ({
  createDockerSourceId: (host: string, externalId: string) =>
    `docker:${encodeURIComponent(host)}:${encodeURIComponent(externalId)}`,
  dockerLabels: { hide: "homarr.hide" },
  listDiscoveredContainersAsync,
}));

import { onboardRouter } from "../onboard/onboard-router";
import { normalizeOnboardingStep } from "../onboard/onboard-queries";

const createCaller = (db: ReturnType<typeof createDb>, onboardingClaimToken?: string) =>
  onboardRouter.createCaller({ db, deviceType: undefined, session: null, onboardingClaimToken });

const completionInput = (boardId: string, name = "Configured-board"): OnboardingCompleteSetupInput => ({
  server: {
    defaultLocale: "en" as const,
    defaultColorScheme: "dark" as const,
    analyticsEnabled: false,
  },
  board: {
    id: boardId,
    name,
    primaryColor: "#228BE6",
    secondaryColor: "#15AABF",
    itemRadius: "md" as const,
    layoutPreset: "balanced" as const,
    leftSidebar: false,
    rightSidebar: false,
  },
  selectedIntegrationIds: [] as string[],
  selectedAppIds: [] as string[],
  integrations: [],
  apps: [],
  selectedDockerSourceIds: [] as string[],
  selectedWidgetKinds: [] as WidgetKind[],
});

const rectanglesOverlap = (
  first: { xOffset: number; yOffset: number; width: number; height: number },
  second: { xOffset: number; yOffset: number; width: number; height: number },
) =>
  first.xOffset < second.xOffset + second.width &&
  first.xOffset + first.width > second.xOffset &&
  first.yOffset < second.yOffset + second.height &&
  first.yOffset + first.height > second.yOffset;

const seedOnboardingAsync = async (db: ReturnType<typeof createDb>) => {
  await db.insert(onboarding).values({ id: "onboarding", step: "setup", previousStep: "group" });
  const claim = await claimOnboardingAsync(db);
  if (claim.status !== "issued") throw new Error("Expected an onboarding claim");
  return claim.token;
};

const seedBoardAsync = async (
  db: ReturnType<typeof createDb>,
  input: { boardId: string; itemId?: string; itemKind?: "notebook"; withMobile?: boolean },
) => {
  const layoutId = `${input.boardId}-base`;
  const sectionId = `${input.boardId}-section`;
  await db.insert(boards).values({
    id: input.boardId,
    name: input.boardId,
    primaryColor: "#FA5252",
    secondaryColor: "#FD7E14",
  });
  await db.insert(layouts).values({
    id: layoutId,
    boardId: input.boardId,
    name: "Base",
    role: "base",
    columnCount: 12,
    breakpoint: 0,
  });
  if (input.withMobile) {
    await db.insert(layouts).values({
      id: `${input.boardId}-mobile`,
      boardId: input.boardId,
      name: "Mobile",
      role: "mobile",
      columnCount: 3,
      breakpoint: 0,
    });
  }
  await db.insert(sections).values({
    id: sectionId,
    boardId: input.boardId,
    kind: "empty",
    xOffset: 0,
    yOffset: 0,
  });
  if (input.itemId) {
    await db.insert(items).values({
      id: input.itemId,
      boardId: input.boardId,
      kind: input.itemKind ?? "notebook",
      options: SuperJSON.stringify({ content: "keep me" }),
    });
    await db.insert(itemLayouts).values({
      itemId: input.itemId,
      sectionId,
      layoutId,
      xOffset: 2,
      yOffset: 3,
      width: 4,
      height: 2,
    });
  }
  return { layoutId, sectionId };
};

describe("onboard.testIntegration", () => {
  it("tests an onboarding draft without persisting it", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    const testConnection = vi.spyOn(integrationConnection, "testConnectionAsync").mockResolvedValue({ success: true });

    try {
      await expect(
        createCaller(db, claimToken).testIntegration({
          sourceId: "manual:sonarr",
          name: "Sonarr",
          url: "http://sonarr:8989",
          kind: "sonarr",
          secrets: [{ kind: "apiKey", value: "secret" }],
        }),
      ).resolves.toEqual({ success: true });
      expect(testConnection).toHaveBeenCalledWith(
        expect.objectContaining({
          id: stableIntegrationIdForSource("manual:sonarr"),
          name: "Sonarr",
          url: "http://sonarr:8989",
          kind: "sonarr",
        }),
      );
      expect(await db.query.integrations.findMany()).toHaveLength(0);
      expect(await db.query.integrationSecrets.findMany()).toHaveLength(0);
    } finally {
      testConnection.mockRestore();
    }
  });
});

describe("onboard.completeSetup", () => {
  beforeEach(() => {
    listDiscoveredContainersAsync.mockReset();
    createIdMock.mockReset();
    let nextId = 0;
    createIdMock.mockImplementation(() => `generated-${++nextId}`);
  });

  it("updates only the exact target board and preserves existing content for explicit empty selections", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    const target = await seedBoardAsync(db, { boardId: "target", itemId: "existing-item" });
    await seedBoardAsync(db, { boardId: "other" });

    const result = await createCaller(db, claimToken).completeSetup(completionInput("target"));

    expect(result).toEqual({
      boardId: "target",
      boardName: "Configured-board",
      docker: { missingSourceIds: [], ignoredSourceIds: [], skippedWidgets: [] },
    });
    expect(await db.query.boards.findFirst({ where: eq(boards.id, "target") })).toMatchObject({
      name: "Configured-board",
      primaryColor: "#228BE6",
      secondaryColor: "#15AABF",
      itemRadius: "md",
    });
    expect(await db.query.boards.findFirst({ where: eq(boards.id, "other") })).toMatchObject({ name: "other" });
    expect(await db.query.items.findMany()).toEqual([
      expect.objectContaining({ id: "existing-item", boardId: "target", kind: "notebook" }),
    ]);
    expect(await db.query.itemLayouts.findFirst({ where: eq(itemLayouts.itemId, "existing-item") })).toMatchObject({
      layoutId: target.layoutId,
      xOffset: 2,
      yOffset: 3,
      width: 4,
      height: 2,
    });
    expect(await db.query.onboarding.findFirst()).toMatchObject({ step: "finish", previousStep: "setup" });
    expect(await isOnboardingClaimValidAsync(db, claimToken)).toBe(false);
  });

  it("rejects a stale completion after another submission claims the setup transition", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    await seedBoardAsync(db, { boardId: "target" });
    const input = completionInput("target");
    input.selectedDockerSourceIds = ["docker:missing"];
    input.selectedWidgetKinds = ["clock"];

    let releaseDiscovery: () => void = () => undefined;
    const discoveryGate = new Promise<void>((resolve) => {
      releaseDiscovery = resolve;
    });
    listDiscoveredContainersAsync.mockImplementation(async () => {
      await discoveryGate;
      return { hosts: [], services: [] };
    });

    const submission = Promise.allSettled([createCaller(db, claimToken).completeSetup(input)]);
    try {
      await vi.waitFor(() => expect(listDiscoveredContainersAsync).toHaveBeenCalledOnce());
      await db.update(onboarding).set({ previousStep: "setup", step: "finish" });
    } finally {
      releaseDiscovery();
    }
    const [result] = await submission;

    expect(result).toMatchObject({
      status: "rejected",
      reason: expect.objectContaining({ message: "Onboarding setup was already completed." }),
    });
    expect(await db.query.items.findMany({ where: eq(items.kind, "clock") })).toHaveLength(0);
    expect(await db.query.boards.findFirst({ where: eq(boards.id, "target") })).toMatchObject({ name: "target" });
    expect(await db.query.onboarding.findFirst()).toMatchObject({ step: "finish", previousStep: "setup" });
  });

  it("uses canonical widget sizes for automatically generated integration widgets", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    await seedBoardAsync(db, { boardId: "target" });
    await db.insert(integrations).values({
      id: "sonarr",
      name: "Sonarr",
      url: "http://sonarr:8989",
      kind: "sonarr",
    });
    const input = completionInput("target");
    input.selectedIntegrationIds = ["sonarr"];

    await createCaller(db, claimToken).completeSetup(input);

    const mediaMissing = await db.query.items.findFirst({ where: eq(items.kind, "mediaMissing") });
    expect(mediaMissing).toBeDefined();
    expect(
      await db.query.itemLayouts.findFirst({ where: eq(itemLayouts.itemId, mediaMissing?.id ?? "missing") }),
    ).toMatchObject({ width: 4, height: 3 });
  });

  it("requires an exact board id when more than one board exists", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    await seedBoardAsync(db, { boardId: "target" });
    await seedBoardAsync(db, { boardId: "other" });
    const input = {
      ...completionInput("target"),
      board: { ...completionInput("target").board, id: undefined },
    };

    await expect(createCaller(db, claimToken).completeSetup(input)).rejects.toThrow(
      "Select the exact board to configure when more than one board exists.",
    );
    expect(await db.query.boards.findFirst({ where: eq(boards.id, "target") })).toMatchObject({ name: "target" });
    expect(await db.query.boards.findFirst({ where: eq(boards.id, "other") })).toMatchObject({ name: "other" });
    expect(await db.query.onboarding.findFirst()).toMatchObject({ step: "setup", previousStep: "group" });
  });

  it("rejects an explicit board id that no longer exists", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    await seedBoardAsync(db, { boardId: "target" });

    await expect(createCaller(db, claimToken).completeSetup(completionInput("missing"))).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "The selected board no longer exists.",
    });

    expect(await db.query.boards.findFirst({ where: eq(boards.id, "target") })).toMatchObject({ name: "target" });
    expect(await db.query.onboarding.findFirst()).toMatchObject({ step: "setup", previousStep: "group" });
  });

  it("rejects a board rename that only differs by case from another board", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    await seedBoardAsync(db, { boardId: "target" });
    await seedBoardAsync(db, { boardId: "existing" });
    await db.update(boards).set({ name: "Media" }).where(eq(boards.id, "existing"));

    await expect(createCaller(db, claimToken).completeSetup(completionInput("target", "media"))).rejects.toThrow(
      "A board with this name already exists.",
    );

    expect(await db.query.boards.findFirst({ where: eq(boards.id, "target") })).toMatchObject({ name: "target" });
    expect(await db.query.onboarding.findFirst()).toMatchObject({ step: "setup", previousStep: "group" });
  });

  it("creates a complete first board when setup resumes without any boards", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    const input = {
      ...completionInput("missing"),
      board: {
        ...completionInput("missing").board,
        id: undefined,
        name: "Recovered-board",
        columnCount: 14,
        leftSidebar: true,
        rightSidebar: true,
      },
    };

    const result = await createCaller(db, claimToken).completeSetup(input);

    expect(await db.query.boards.findMany()).toEqual([
      expect.objectContaining({
        id: result.boardId,
        name: "Recovered-board",
        primaryColor: "#228BE6",
        secondaryColor: "#15AABF",
        itemRadius: "md",
      }),
    ]);
    expect(await db.query.layouts.findMany({ where: eq(layouts.boardId, result.boardId) })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ role: "mobile", columnCount: 3, breakpoint: 0 }),
        expect.objectContaining({
          role: "base",
          columnCount: 14,
          breakpoint: 768,
          leftGutterColumnCount: 1,
          rightGutterColumnCount: 1,
        }),
      ]),
    );
    expect(await db.query.sections.findMany({ where: eq(sections.boardId, result.boardId) })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "empty", xOffset: 0, yOffset: 0 }),
        expect.objectContaining({ kind: "empty", xOffset: -1, yOffset: 0 }),
        expect.objectContaining({ kind: "empty", xOffset: 1, yOffset: 0 }),
      ]),
    );
    expect(await db.query.onboarding.findFirst()).toMatchObject({ step: "finish", previousStep: "setup" });
  });

  it("rolls back board and layout writes when planned item insertion fails", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    const { layoutId } = await seedBoardAsync(db, { boardId: "target", itemId: "generated-id" });
    const input = completionInput("target", "Must-roll-back");
    input.selectedWidgetKinds = ["clock"];
    createIdMock.mockReturnValue("generated-id");

    await expect(createCaller(db, claimToken).completeSetup(input)).rejects.toThrow();

    expect(await db.query.boards.findFirst({ where: eq(boards.id, "target") })).toMatchObject({
      name: "target",
      primaryColor: "#FA5252",
      secondaryColor: "#FD7E14",
    });
    expect(await db.query.layouts.findFirst({ where: eq(layouts.id, layoutId) })).toMatchObject({ columnCount: 12 });
    expect(await db.query.items.findMany()).toHaveLength(1);
    expect(await db.query.onboarding.findFirst()).toMatchObject({ step: "setup", previousStep: "group" });
    expect(await isOnboardingClaimValidAsync(db, claimToken)).toBe(true);
  });

  it("retains partial Docker results and places an explicitly selected label widget", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    await seedBoardAsync(db, { boardId: "target" });
    const service = {
      sourceId: "docker:good:clock",
      containerId: "clock",
      host: "good",
      group: "Utilities",
      name: "Clock service",
      href: "http://clock:3000",
      externalId: "clock",
      widgetKind: "clock" as const,
    };
    const integrationService = {
      sourceId: "docker:good:sonarr",
      containerId: "sonarr",
      host: "good",
      group: "Media",
      name: "Sonarr",
      href: "http://sonarr:8989",
      externalId: "sonarr",
      integrationKind: "sonarr" as const,
      description: "TV automation",
      pingUrl: "http://sonarr:8989/ping",
      icon: "custom-sonarr.svg",
    };
    listDiscoveredContainersAsync.mockResolvedValue({
      hosts: [
        { host: "good", status: "success", containers: [], services: [service, integrationService] },
        { host: "bad", status: "unavailable", reason: "permission denied", containers: [], services: [] },
      ],
      services: [service, integrationService],
    });

    const discovery = await createCaller(db, claimToken).discoverDockerServices();

    expect(discovery).toMatchObject({
      status: "partial",
      hosts: [
        { host: "good", status: "success", containerCount: 0 },
        { host: "bad", status: "unavailable", reason: "permission denied", containerCount: 0 },
      ],
      apps: [{ sourceId: service.sourceId, widgetKind: "clock" }],
      integrations: [
        {
          sourceId: integrationService.sourceId,
          iconUrl: integrationService.icon,
          description: integrationService.description,
          pingUrl: integrationService.pingUrl,
        },
      ],
    });
    const input = completionInput("target");
    input.selectedWidgetKinds = discovery.apps.flatMap((app) => (app.widgetKind ? [app.widgetKind] : []));
    await createCaller(db, claimToken).completeSetup(input);

    expect(await db.query.items.findMany()).toEqual([expect.objectContaining({ boardId: "target", kind: "clock" })]);
  });

  it("creates selected apps, integrations, secrets, and companion apps in completeSetup", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    await seedBoardAsync(db, { boardId: "target" });
    const input = completionInput("target");
    input.apps = [
      {
        sourceId: "docker:good:status",
        name: "Status",
        href: "http://status:3001",
        pingUrl: "http://status:3001/health",
        iconUrl: "https://icons.example/status.svg",
        description: "Internal status page",
      },
    ];
    input.integrations = [
      {
        sourceId: "docker:good:sonarr",
        name: "Sonarr",
        url: "http://sonarr:8989",
        kind: "sonarr",
        secrets: [{ kind: "apiKey", value: "secret" }],
        pingUrl: "http://sonarr:8989/ping",
        iconUrl: "https://icons.example/sonarr.svg",
        description: "TV automation",
      },
    ];

    const testConnection = vi.spyOn(integrationConnection, "testConnectionAsync").mockResolvedValue({ success: true });
    try {
      await createCaller(db, claimToken).completeSetup(input);

      expect(
        await db.query.apps.findFirst({ where: eq(apps.id, stableAppIdForSource("docker:good:status")) }),
      ).toMatchObject({
        href: "http://status:3001",
        pingUrl: "http://status:3001/health",
        iconUrl: "https://icons.example/status.svg",
        description: "Internal status page",
      });
      expect(
        await db.query.apps.findFirst({ where: eq(apps.id, stableAppIdForSource("docker:good:sonarr")) }),
      ).toMatchObject({
        href: "http://sonarr:8989",
        pingUrl: "http://sonarr:8989/ping",
        iconUrl: "https://icons.example/sonarr.svg",
        description: "TV automation",
      });
      expect(
        await db.query.integrations.findFirst({
          where: eq(integrations.id, stableIntegrationIdForSource("docker:good:sonarr")),
        }),
      ).toMatchObject({
        appId: stableAppIdForSource("docker:good:sonarr"),
        name: "Sonarr",
        url: "http://sonarr:8989",
        kind: "sonarr",
      });
      const savedSecrets = await db.query.integrationSecrets.findMany({
        where: eq(integrationSecrets.integrationId, stableIntegrationIdForSource("docker:good:sonarr")),
      });
      expect(savedSecrets).toEqual([expect.objectContaining({ kind: "apiKey" })]);
      expect(savedSecrets[0]?.value).not.toBe("secret");
      expect(await db.query.items.findMany({ where: eq(items.kind, "app") })).toHaveLength(2);
    } finally {
      testConnection.mockRestore();
    }
  });

  it("rolls draft records back with board writes and reuses stable IDs on retry", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    await seedBoardAsync(db, { boardId: "target", itemId: "generated-id" });
    const sourceId = "manual:sonarr";
    const input = completionInput("target", "Retried-board");
    input.integrations = [
      {
        sourceId,
        name: "Sonarr",
        url: "http://sonarr:8989",
        kind: "sonarr",
        secrets: [{ kind: "apiKey", value: "secret" }],
      },
    ];
    createIdMock.mockReturnValue("generated-id");
    const testConnection = vi.spyOn(integrationConnection, "testConnectionAsync").mockResolvedValue({ success: true });

    try {
      await expect(createCaller(db, claimToken).completeSetup(input)).rejects.toThrow();
      expect(await db.query.integrations.findMany()).toHaveLength(0);
      expect(await db.query.apps.findMany()).toHaveLength(0);
      expect(await db.query.integrationSecrets.findMany()).toHaveLength(0);
      expect(await db.query.onboarding.findFirst()).toMatchObject({ step: "setup", previousStep: "group" });

      let nextRetryId = 0;
      createIdMock.mockImplementation(() => `retry-${++nextRetryId}`);
      await createCaller(db, claimToken).completeSetup(input);

      expect(await db.query.integrations.findMany()).toHaveLength(1);
      expect(await db.query.apps.findMany()).toHaveLength(1);
      expect(await db.query.integrations.findFirst()).toMatchObject({
        id: stableIntegrationIdForSource(sourceId),
        appId: stableAppIdForSource(sourceId),
      });
      expect(
        await db.query.integrationSecrets.findMany({
          where: eq(integrationSecrets.integrationId, stableIntegrationIdForSource(sourceId)),
        }),
      ).toHaveLength(1);
    } finally {
      testConnection.mockRestore();
    }
  });

  it("re-fetches selected labels into grouped responsive containers and ignores another board target", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    const { sectionId: mainSectionId } = await seedBoardAsync(db, {
      boardId: "target",
      itemId: "existing-item",
      withMobile: true,
    });
    const groupedSource = {
      sourceId: "docker:good:sonarr",
      containerId: "sonarr",
      host: "good",
      group: "Media",
      name: "Sonarr",
      href: "http://sonarr:8989",
      externalId: "sonarr",
      widgetKind: "clock" as const,
    };
    const ignoredSource = {
      ...groupedSource,
      sourceId: "docker:good:radarr",
      containerId: "radarr",
      externalId: "radarr",
      name: "Radarr",
      boardName: "other-board",
    };
    listDiscoveredContainersAsync.mockResolvedValue({
      hosts: [{ host: "good", status: "success", containers: [], services: [groupedSource, ignoredSource] }],
      services: [groupedSource, ignoredSource],
    });
    const groupedAppId = stableAppIdForSource(groupedSource.sourceId);
    const ignoredAppId = stableAppIdForSource(ignoredSource.sourceId);
    await db.insert(apps).values([
      { id: groupedAppId, name: groupedSource.name, iconUrl: "icon", href: groupedSource.href },
      { id: ignoredAppId, name: ignoredSource.name, iconUrl: "icon", href: ignoredSource.href },
    ]);
    const input = completionInput("target");
    input.selectedAppIds = [groupedAppId, ignoredAppId];
    input.selectedDockerSourceIds = [groupedSource.sourceId, ignoredSource.sourceId, "docker:missing"];
    input.selectedWidgetKinds = ["clock"];

    const result = await createCaller(db, claimToken).completeSetup(input);

    expect(result.docker).toEqual({
      missingSourceIds: ["docker:missing"],
      ignoredSourceIds: [ignoredSource.sourceId],
      skippedWidgets: [],
    });
    const mediaSection = await db.query.sections.findFirst({
      where: (table, operators) =>
        operators.and(operators.eq(table.boardId, "target"), operators.eq(table.kind, "container")),
    });
    expect(mediaSection).toBeDefined();
    expect(SuperJSON.parse(mediaSection?.options ?? "{}")).toMatchObject({ title: "Media", showLabel: true });
    const containerPlacements = await db.query.sectionLayouts.findMany({
      where: eq(sectionLayouts.sectionId, mediaSection?.id ?? "missing"),
    });
    expect(containerPlacements).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ layoutId: "target-base", parentSectionId: mainSectionId, width: 10 }),
        expect.objectContaining({ layoutId: "target-mobile", parentSectionId: mainSectionId, width: 3 }),
      ]),
    );
    const groupedItems = await db.query.items.findMany({
      where: (table, operators) => operators.inArray(table.kind, ["app", "clock"]),
      with: { layouts: true },
    });
    expect(groupedItems).toHaveLength(2);
    expect(groupedItems.flatMap((item) => item.layouts)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ layoutId: "target-base", sectionId: mediaSection?.id }),
        expect.objectContaining({ layoutId: "target-mobile", sectionId: mediaSection?.id }),
      ]),
    );
    expect(await db.query.items.findFirst({ where: eq(items.id, "existing-item") })).toBeDefined();
    expect(
      groupedItems.some(
        (item) => item.kind === "app" && SuperJSON.parse<{ appId: string }>(item.options).appId === ignoredAppId,
      ),
    ).toBe(false);
  });

  it("places a labeled integration app and linked widget together inside its group", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    await seedBoardAsync(db, { boardId: "target", withMobile: true });
    const source = {
      sourceId: "docker:good:sonarr",
      containerId: "sonarr",
      host: "good",
      group: "Media",
      name: "Sonarr",
      href: "http://sonarr:8989",
      externalId: "sonarr",
      integrationKind: "sonarr" as const,
      widgetKind: "calendar" as const,
    };
    listDiscoveredContainersAsync.mockResolvedValue({
      hosts: [{ host: "good", status: "success", containers: [], services: [source] }],
      services: [source],
    });
    const appId = stableAppIdForSource(source.sourceId);
    const integrationId = stableIntegrationIdForSource(source.sourceId);
    await db.insert(apps).values({ id: appId, name: source.name, iconUrl: "icon", href: source.href });
    await db.insert(integrations).values({
      id: integrationId,
      appId,
      name: source.name,
      url: source.href,
      kind: source.integrationKind,
    });
    const input = completionInput("target");
    input.selectedIntegrationIds = [integrationId];
    input.selectedAppIds = [appId];
    input.selectedDockerSourceIds = [source.sourceId];
    input.selectedWidgetKinds = [source.widgetKind];

    await createCaller(db, claimToken).completeSetup(input);

    const mediaSection = await db.query.sections.findFirst({
      where: (table, operators) => operators.eq(table.kind, "container"),
    });
    const groupedItems = await db.query.items.findMany({
      where: (table, operators) => operators.inArray(table.kind, ["app", "calendar"]),
      with: { layouts: true },
    });
    expect(groupedItems).toHaveLength(2);
    expect(groupedItems.every((item) => item.layouts.every((layout) => layout.sectionId === mediaSection?.id))).toBe(
      true,
    );
    const calendar = groupedItems.find((item) => item.kind === "calendar");
    expect(calendar).toBeDefined();
    expect(
      await db.query.integrationItems.findFirst({ where: eq(integrationItems.itemId, calendar?.id ?? "") }),
    ).toEqual({
      itemId: calendar?.id,
      integrationId,
    });
  });

  it("links a labeled integration to an existing compatible widget", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    const { sectionId, layoutId } = await seedBoardAsync(db, { boardId: "target", itemId: "existing-seed" });
    await db.insert(items).values({ id: "calendar", boardId: "target", kind: "calendar" });
    await db.insert(itemLayouts).values({
      itemId: "calendar",
      sectionId,
      layoutId,
      xOffset: 0,
      yOffset: 0,
      width: 2,
      height: 2,
    });
    const source = {
      sourceId: "docker:good:sonarr",
      containerId: "sonarr",
      host: "good",
      group: "Media",
      name: "Sonarr",
      href: "http://sonarr:8989",
      externalId: "sonarr",
      integrationKind: "sonarr" as const,
      widgetKind: "calendar" as const,
    };
    listDiscoveredContainersAsync.mockResolvedValue({
      hosts: [{ host: "good", status: "success", containers: [], services: [source] }],
      services: [source],
    });
    const integrationId = stableIntegrationIdForSource(source.sourceId);
    await db.insert(integrations).values({
      id: integrationId,
      name: source.name,
      url: source.href,
      kind: source.integrationKind,
    });
    const input = completionInput("target");
    input.selectedIntegrationIds = [integrationId];
    input.selectedDockerSourceIds = [source.sourceId];
    input.selectedWidgetKinds = [source.widgetKind];

    await createCaller(db, claimToken).completeSetup(input);

    expect(await db.query.integrationItems.findFirst({ where: eq(integrationItems.itemId, "calendar") })).toEqual({
      itemId: "calendar",
      integrationId,
    });
    expect(await db.query.items.findMany({ where: eq(items.kind, "calendar") })).toHaveLength(1);
  });

  it("skips integration-required and incompatible label widgets but preserves their selected apps", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    await seedBoardAsync(db, { boardId: "target", itemId: "seeded-content" });
    await db.update(boards).set({ name: "dashboard" }).where(eq(boards.id, "target"));
    const appOnly = {
      sourceId: "docker:good:app-only",
      containerId: "app-only",
      host: "good",
      group: "Media",
      name: "App only",
      href: "http://app-only:3000",
      externalId: "app-only",
      widgetKind: "mediaServer" as const,
    };
    const incompatible = {
      ...appOnly,
      sourceId: "docker:good:sonarr",
      containerId: "sonarr",
      externalId: "sonarr",
      name: "Sonarr",
      href: "http://sonarr:8989",
      integrationKind: "sonarr" as const,
    };
    const services = [appOnly, incompatible];
    listDiscoveredContainersAsync.mockResolvedValue({
      hosts: [{ host: "good", status: "success", containers: [], services }],
      services,
    });
    const appIds = services.map((source) => stableAppIdForSource(source.sourceId));
    await db.insert(apps).values(
      services.map((source) => ({
        id: stableAppIdForSource(source.sourceId),
        name: source.name,
        iconUrl: "icon",
        href: source.href,
      })),
    );
    const integrationId = stableIntegrationIdForSource(incompatible.sourceId);
    await db.insert(integrations).values({
      id: integrationId,
      appId: appIds[1],
      name: incompatible.name,
      url: incompatible.href,
      kind: incompatible.integrationKind,
    });
    const input = completionInput("target");
    input.selectedAppIds = appIds;
    input.selectedIntegrationIds = [integrationId];
    input.selectedDockerSourceIds = services.map((source) => source.sourceId);
    input.selectedWidgetKinds = ["mediaServer"];

    const result = await createCaller(db, claimToken).completeSetup(input);

    expect(result.docker.skippedWidgets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sourceId: appOnly.sourceId, code: "integration-required" }),
        expect.objectContaining({
          sourceId: incompatible.sourceId,
          code: "incompatible-integration",
          integrationKind: "sonarr",
        }),
      ]),
    );
    expect(await db.query.items.findMany({ where: eq(items.kind, "mediaServer") })).toHaveLength(0);
    expect(await db.query.items.findMany({ where: eq(items.kind, "app") })).toHaveLength(2);
  });

  it("splits limited automatic integration widgets instead of over-linking one item", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    await seedBoardAsync(db, { boardId: "target" });
    await db.insert(integrations).values([
      { id: "navidrome", name: "Navidrome", url: "http://navidrome:4533", kind: "navidrome" },
      { id: "audiobookshelf", name: "Audiobookshelf", url: "http://audiobookshelf:13378", kind: "audiobookshelf" },
    ]);
    const input = completionInput("target");
    input.selectedIntegrationIds = ["navidrome", "audiobookshelf"];

    await createCaller(db, claimToken).completeSetup(input);

    const audioItems = await db.query.items.findMany({ where: eq(items.kind, "audioStats") });
    expect(audioItems).toHaveLength(2);
    const links = await db.query.integrationItems.findMany({
      where: inArray(
        integrationItems.itemId,
        audioItems.map((item) => item.id),
      ),
    });
    expect(links).toHaveLength(2);
    expect(new Set(links.map((link) => link.itemId)).size).toBe(2);
  });

  it("places an ungrouped labeled app and widget in the main root", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    await seedBoardAsync(db, { boardId: "target" });
    const source = {
      sourceId: "docker:good:status",
      containerId: "status",
      host: "good",
      name: "Status",
      href: "http://status:3001",
      externalId: "status",
      widgetKind: "clock" as const,
    };
    listDiscoveredContainersAsync.mockResolvedValue({
      hosts: [{ host: "good", status: "success", containers: [], services: [source] }],
      services: [source],
    });
    const appId = stableAppIdForSource(source.sourceId);
    await db.insert(apps).values({ id: appId, name: source.name, iconUrl: "icon", href: source.href });
    const input = completionInput("target");
    input.selectedAppIds = [appId];
    input.selectedDockerSourceIds = [source.sourceId];
    input.selectedWidgetKinds = [source.widgetKind];

    await createCaller(db, claimToken).completeSetup(input);

    expect(await db.query.sections.findMany({ where: eq(sections.kind, "container") })).toHaveLength(0);
    expect(await db.query.items.findMany()).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "app" }), expect.objectContaining({ kind: "clock" })]),
    );
    expect((await db.query.itemLayouts.findMany()).every((layout) => layout.sectionId === "target-section")).toBe(true);
  });

  it("packs grouped items with their actual dimensions without overlapping pending root content", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    await seedBoardAsync(db, { boardId: "target", withMobile: true });
    const sources = [
      {
        sourceId: "docker:good:clock",
        containerId: "clock",
        host: "good",
        group: "Utilities",
        name: "Clock",
        href: "http://clock:3000",
        externalId: "clock",
        widgetKind: "clock" as const,
      },
      {
        sourceId: "docker:good:weather",
        containerId: "weather",
        host: "good",
        group: "Utilities",
        name: "Weather",
        href: "http://weather:3000",
        externalId: "weather",
        widgetKind: "weather" as const,
      },
    ];
    listDiscoveredContainersAsync.mockResolvedValue({
      hosts: [{ host: "good", status: "success", containers: [], services: sources }],
      services: sources,
    });
    const appIds = sources.map((source) => stableAppIdForSource(source.sourceId));
    await db.insert(apps).values(
      sources.map((source) => ({
        id: stableAppIdForSource(source.sourceId),
        name: source.name,
        iconUrl: "icon",
        href: source.href,
      })),
    );
    const input = completionInput("target");
    input.board.leftSidebar = true;
    input.board.rightSidebar = true;
    input.selectedAppIds = appIds;
    input.selectedDockerSourceIds = sources.map((source) => source.sourceId);
    input.selectedWidgetKinds = ["bookmarks", "clock", "weather"];

    await createCaller(db, claimToken).completeSetup(input);

    const container = await db.query.sections.findFirst({ where: (table, { eq }) => eq(table.kind, "container") });
    expect(container).toBeDefined();
    const containerLayouts = await db.query.sectionLayouts.findMany({
      where: eq(sectionLayouts.sectionId, container?.id ?? "missing"),
    });
    const groupedLayouts = await db.query.itemLayouts.findMany({
      where: eq(itemLayouts.sectionId, container?.id ?? "missing"),
    });
    for (const layoutId of ["target-base", "target-mobile"]) {
      const positions = groupedLayouts.filter((layout) => layout.layoutId === layoutId);
      const containerLayout = containerLayouts.find((layout) => layout.layoutId === layoutId);
      expect(positions.length).toBeGreaterThan(0);
      expect(containerLayout).toBeDefined();
      expect(Math.max(...positions.map((position) => position.yOffset + position.height))).toBeLessThanOrEqual(
        containerLayout?.height ?? 0,
      );
      for (let firstIndex = 0; firstIndex < positions.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < positions.length; secondIndex += 1) {
          const firstPosition = positions[firstIndex];
          const secondPosition = positions[secondIndex];
          assert(firstPosition);
          assert(secondPosition);
          expect(rectanglesOverlap(firstPosition, secondPosition)).toBe(false);
        }
      }
    }
    const rootBookmarks = await db.query.itemLayouts.findMany({
      where: (table, { and, eq, inArray }) =>
        and(eq(table.sectionId, "target-section"), inArray(table.layoutId, ["target-base", "target-mobile"])),
    });
    for (const containerLayout of containerLayouts) {
      const rootItem = rootBookmarks.find((layout) => layout.layoutId === containerLayout.layoutId);
      expect(rootItem).toBeDefined();
      assert(rootItem);
      expect(rectanglesOverlap(rootItem, containerLayout)).toBe(false);
      expect(containerLayout.width).toBeLessThanOrEqual(containerLayout.layoutId === "target-base" ? 8 : 3);
    }
  });

  it("uses the main root and creates enabled sidebar roots transactionally", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    await db.insert(boards).values({ id: "target", name: "target" });
    await db.insert(layouts).values({
      id: "target-base",
      boardId: "target",
      name: "Base",
      role: "base",
      columnCount: 10,
      breakpoint: 768,
    });
    await db.insert(sections).values([
      { id: "right-root", boardId: "target", kind: "empty", xOffset: 1, yOffset: 0 },
      { id: "main-root", boardId: "target", kind: "empty", xOffset: 0, yOffset: 0 },
    ]);
    const input = completionInput("target");
    input.board.leftSidebar = true;
    input.board.rightSidebar = true;
    input.selectedWidgetKinds = ["clock"];

    await createCaller(db, claimToken).completeSetup(input);

    expect(await db.query.sections.findMany({ where: eq(sections.boardId, "target") })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "main-root", xOffset: 0 }),
        expect.objectContaining({ id: "right-root", xOffset: 1 }),
        expect.objectContaining({ xOffset: -1, kind: "empty" }),
      ]),
    );
    expect(await db.query.itemLayouts.findFirst()).toMatchObject({ sectionId: "main-root" });
    expect(await db.query.layouts.findFirst({ where: eq(layouts.id, "target-base") })).toMatchObject({
      leftGutterColumnCount: 1,
      rightGutterColumnCount: 1,
    });
  });

  it("adopts one label board name for a fresh sole board and ignores sources for other board targets", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    await seedBoardAsync(db, { boardId: "target", itemId: "seeded-content" });
    await db.update(boards).set({ name: "dashboard" }).where(eq(boards.id, "target"));
    const media = {
      sourceId: "docker:good:media",
      containerId: "media",
      host: "good",
      group: "Media",
      name: "Media",
      href: "http://media:3000",
      externalId: "media",
      boardName: "Media board",
    };
    listDiscoveredContainersAsync.mockResolvedValue({
      hosts: [{ host: "good", status: "success", containers: [], services: [media] }],
      services: [media],
    });
    const input = completionInput("target");
    input.selectedDockerSourceIds = [media.sourceId];

    const result = await createCaller(db, claimToken).completeSetup(input);

    expect(result.boardName).toBe("Media-board");
    expect(await db.query.boards.findFirst({ where: eq(boards.id, "target") })).toMatchObject({ name: "Media-board" });
    expect(await db.query.items.findFirst({ where: eq(items.id, "seeded-content") })).toBeDefined();

    const conflictDb = createDb();
    const conflictClaim = await seedOnboardingAsync(conflictDb);
    await seedBoardAsync(conflictDb, { boardId: "target", itemId: "seeded-content" });
    await conflictDb.update(boards).set({ name: "dashboard" }).where(eq(boards.id, "target"));
    const other = { ...media, sourceId: "docker:good:other", containerId: "other", boardName: "Other board" };
    const ignoredIntegrationSource = {
      ...other,
      sourceId: "docker:good:other-sonarr",
      containerId: "other-sonarr",
      externalId: "other-sonarr",
      integrationKind: "sonarr" as const,
    };
    listDiscoveredContainersAsync.mockResolvedValue({
      hosts: [{ host: "good", status: "success", containers: [], services: [media, other, ignoredIntegrationSource] }],
      services: [media, other, ignoredIntegrationSource],
    });
    const conflictInput = completionInput("target", "Media-board");
    const ignoredIntegrationId = stableIntegrationIdForSource(ignoredIntegrationSource.sourceId);
    await conflictDb.insert(integrations).values({
      id: ignoredIntegrationId,
      name: ignoredIntegrationSource.name,
      url: ignoredIntegrationSource.href,
      kind: ignoredIntegrationSource.integrationKind,
    });
    conflictInput.selectedIntegrationIds = [ignoredIntegrationId];
    conflictInput.selectedDockerSourceIds = [media.sourceId, other.sourceId, ignoredIntegrationSource.sourceId];
    const conflictResult = await createCaller(conflictDb, conflictClaim).completeSetup(conflictInput);
    expect(conflictResult.docker.ignoredSourceIds).toEqual([other.sourceId, ignoredIntegrationSource.sourceId]);
    expect(await conflictDb.query.boards.findFirst({ where: eq(boards.id, "target") })).toMatchObject({
      name: "Media-board",
    });
    expect(await conflictDb.query.items.findMany({ where: eq(items.kind, "calendar") })).toHaveLength(0);
  });

  it("rejects setup mutations from an unclaimed browser", async () => {
    const db = createDb();
    await seedOnboardingAsync(db);
    await seedBoardAsync(db, { boardId: "target" });
    await expect(createCaller(db).completeSetup(completionInput("target"))).rejects.toThrow(
      "This onboarding session is not claimed.",
    );
  });

  it("requires an authenticated administrator once any user exists", async () => {
    const db = createDb();
    const claimToken = await seedOnboardingAsync(db);
    await seedBoardAsync(db, { boardId: "target" });
    await db.insert(users).values({ id: "owner", name: "owner" });
    await expect(createCaller(db, claimToken).completeSetup(completionInput("target"))).rejects.toThrow(
      "This onboarding session is not claimed.",
    );
  });
});

describe("onboard.nextStep", () => {
  beforeEach(() => {
    isProviderEnabled.mockReturnValue(false);
  });

  it("advances welcome exactly once", async () => {
    const db = createDb();
    await db.insert(onboarding).values({ id: "onboarding", step: "start" });
    const claim = await claimOnboardingAsync(db);
    if (claim.status !== "issued") throw new Error("Expected an onboarding claim");
    const caller = createCaller(db, claim.token);

    await caller.nextStep();
    expect(await db.query.onboarding.findFirst()).toMatchObject({ step: "setup", previousStep: "start" });
    await expect(caller.nextStep()).rejects.toThrow("The welcome step is already complete.");
    expect(await db.query.onboarding.findFirst()).toMatchObject({ step: "setup", previousStep: "start" });
  });

  it("skips duplicate credential account creation when an administrator resumes a legacy step", async () => {
    isProviderEnabled.mockImplementation((provider: string) => provider === "credentials");
    const db = createDb();
    await db.insert(onboarding).values({ id: "onboarding", step: "import" as never });
    await db.insert(users).values({ id: "existing-admin", name: "admin", provider: "credentials" });

    const { nextOnboardingStepAsync } = await import("../onboard/onboard-queries");
    await nextOnboardingStepAsync(db);

    expect(await db.query.onboarding.findFirst()).toMatchObject({ step: "setup", previousStep: "start" });
  });

  it("still requires credential account creation on a fresh installation", async () => {
    isProviderEnabled.mockImplementation((provider: string) => provider === "credentials");
    const db = createDb();
    await db.insert(onboarding).values({ id: "onboarding", step: "start" });

    const { nextOnboardingStepAsync } = await import("../onboard/onboard-queries");
    await nextOnboardingStepAsync(db);

    expect(await db.query.onboarding.findFirst()).toMatchObject({ step: "user", previousStep: "start" });
  });
});

describe("normalizeOnboardingStep", () => {
  it("keeps legacy import backups eligible for restore from the start step", () => {
    expect(normalizeOnboardingStep("import")).toBe("start");
  });
});
