import { QueryObserver, hashKey } from "@tanstack/react-query";
import { createTRPCClient } from "@trpc/client";
import { serialize } from "superjson";
import { describe, expect, it } from "vitest";

import type { AppRouter } from "@homarr/api";
import { defaultBrandingSettings } from "@homarr/server-settings";
import { defaultHeaderPreferences } from "@homarr/validation/header-preferences";

import { createSnapshotRedactor } from "./redact";
import { createReplayQueryClient, snapshotReplayLink } from "./replay-client";
import { maxSnapshotBytes, parseBoardSnapshot } from "./snapshot";
import type { BoardSnapshotPayload } from "./snapshot";

const makePayload = (): BoardSnapshotPayload => ({
  board: {
    id: "board",
    name: "main",
    pageTitle: "admin",
    metaTitle: "active",
    logoImageUrl: null,
    faviconImageUrl: null,
    backgroundImageUrl: null,
    backgroundImageAttachment: "fixed",
    backgroundImageRepeat: "no-repeat",
    backgroundImageSize: "cover",
    primaryColor: "#123456",
    secondaryColor: "#abcdef",
    opacity: 72,
    customCss: ".private-class {border-radius:19px}",
    iconColor: null,
    itemRadius: "xl",
    disableStatus: false,
    isPublic: true,
    creatorId: null,
    creator: null,
    userPermissions: [],
    groupPermissions: [],
    layouts: [
      {
        id: "layout",
        name: "main",
        columnCount: 13,
        leftGutterColumnCount: 0,
        rightGutterColumnCount: 0,
        breakpoint: 0,
        role: "base",
      },
    ],
    sections: [{ id: "section", kind: "empty", xOffset: 0, yOffset: 0 }],
    items: [],
  },
  settings: {
    firstDayOfWeek: 1,
    defaultSearchEngineId: null,
    homeBoardId: null,
    mobileHomeBoardId: null,
    byteUnitSystem: "decimal",
    openSearchInNewTab: true,
    ddgBangs: true,
    pingIconsEnabled: false,
    enableRightClickOnWidgets: true,
    headerPreferences: defaultHeaderPreferences,
    enableStatusByDefault: true,
    forceDisableStatus: false,
    enableGravatar: false,
    branding: defaultBrandingSettings,
  },
  integrations: [],
  queries: [],
  viewport: { width: 1280, height: 540, layoutId: "layout", scrollX: 0, scrollY: 350 },
  locale: "en",
  colorScheme: "dark",
  localStates: [],
});

const snapshotText = (payload: BoardSnapshotPayload) =>
  JSON.stringify({
    format: "homarr-board-snapshot",
    version: 1,
    capturedAt: "2026-10-09T00:00:00.000Z",
    payload: serialize(payload),
  });

const appQueryKey = (id: string) => [["app", "byId"], { input: { id }, type: "query" }];

describe("board snapshot privacy and import boundaries", () => {
  it("anonymizes display text even when it equals a native enum", () => {
    const redactor = createSnapshotRedactor();
    redactor.preserve("layout", "compact");
    for (const key of ["name", "pageTitle", "title", "label", "text", "message"])
      for (const value of ["main", "admin", "active", "compact"])
        expect(redactor.string(value, key)).toMatch(/^redacted_\d+$/);
    expect(redactor.string("compact", "layout")).toBe("compact");
    expect(redactor.string("compact", "unknownField")).toMatch(/^redacted_\d+$/);
    for (const type of ["node", "qemu", "lxc", "storage"]) expect(redactor.string(type, "type")).toBe(type);
    expect(redactor.string("primaryColor.5", "c")).toBe("primaryColor.5");
    expect(redactor.string("redacted_1", "href")).toBe("");
    expect(redactor.string("available", "availability")).toBe("available");
    expect(redactor.string("approved", "status")).toBe("approved");
    expect(redactor.string("off", "state")).toBe("off");
  });

  it("keeps string-literal contract keys used by health widgets", () => {
    const loadAverage = { "1min": 1, "5min": 5, "15min": 15 };
    expect(createSnapshotRedactor().redact({ loadAverage })).toEqual({ loadAverage });
  });

  it("removes secrets, URLs and private source while retaining CSS and data bindings", () => {
    const redactor = createSnapshotRedactor();
    const result = redactor.redact({
      name: "PRIVATE_CANARY",
      password: "PRIVATE_CANARY",
      apiKey: "PRIVATE_CANARY",
      headers: { Authorization: "PRIVATE_CANARY" },
      href: "https://private.example/key",
      data: { PRIVATE_CANARY: 7 },
      template:
        '<Stack align={"center"}><Badge variant={data.state === "playing" ? "filled" : "outline"}>PRIVATE_CANARY</Badge><Badge color={["playing", "paused"].includes(data.state) ? "green" : "red"}/><Text>{"filled"}</Text><SubData path="PRIVATE_CANARY"/></Stack>',
      customCssClasses: ["PRIVATE_CANARY"],
      customCss:
        '.PRIVATE_CANARY {border-radius:19px;content:"PRIVATE_CANARY";background:url(https://private.example/key)} .mantine-Button-root[data-variant="filled"][data-orientation="vertical"] {padding:9px}',
      content: '<h2>PRIVATE_CANARY</h2><img src="https://private.example/image" width="28%" onerror="alert(1)">',
      ...JSON.parse('{"__proto__":{"PRIVATE_CANARY":true},"constructor":"PRIVATE_CANARY"}'),
    }) as Record<string, unknown>;
    const text = JSON.stringify(result);
    expect(text).not.toMatch(/PRIVATE_CANARY|private\.example|__proto__|constructor|onerror/);
    expect(result.password).toBe("");
    expect(result.headers).toEqual({});
    expect(result.href).toBe("");
    const anonymousKey = Object.keys(result.data as object)[0];
    expect(result.template).toContain(`path="${anonymousKey}"`);
    expect(result.template).toContain('align={"center"}');
    expect(result.template).toContain('data.state === "playing" ? "filled" : "outline"');
    expect(result.template).toContain('["playing", "paused"].includes(data.state) ? "green" : "red"');
    expect(result.template).not.toContain('<Text>{"filled"}</Text>');
    expect(result.customCss).toContain(`.${anonymousKey}`);
    expect(result.customCss).toContain("border-radius:19px");
    expect(result.customCss).toContain('[data-variant="filled"][data-orientation="vertical"]');
    expect(result.content).toContain('width="28%"');
  });

  it("redacts imports idempotently and retains settings, layout and viewport", async () => {
    const source = makePayload();
    source.board.items = [
      {
        id: "timer-item",
        kind: "timer",
        options: {},
        integrationIds: [],
        advancedOptions: { title: "admin", customCssClasses: [], borderColor: "" },
        layouts: [{ layoutId: "layout", sectionId: "section", xOffset: 0, yOffset: 0, width: 2, height: 2 }],
      },
    ];
    const timerState = {
      version: 3,
      value: {
        mode: "pomodoro",
        phase: "focus",
        status: "paused",
        remainingMs: 123_000,
        totalDurationMs: 1_500_000,
        deadline: null,
        completedFocusSessions: 0,
        history: [],
        alerts: { sound: false, notifications: false },
        awaitingManualStart: false,
      },
    };
    source.localStates = [{ key: ["timer", "board", "timer-item"], value: timerState }];
    const imported = await parseBoardSnapshot(snapshotText(source));
    expect(imported.payload.board.name).not.toBe("main");
    expect(imported.payload.board.pageTitle).not.toBe("admin");
    expect(imported.payload.board.metaTitle).not.toBe("active");
    expect(imported.payload.board.layouts[0]?.columnCount).toBe(13);
    expect(imported.payload.board.itemRadius).toBe("xl");
    expect(imported.payload.board.opacity).toBe(72);
    expect(imported.payload.board.customCss).toContain("border-radius:19px");
    expect(imported.payload.viewport).toMatchObject({ width: 1280, height: 540, scrollY: 350 });
    expect(imported.payload.settings.headerPreferences).toEqual(defaultHeaderPreferences);
    expect(imported.payload.localStates[0]?.key).toEqual([
      "timer",
      imported.payload.board.id,
      imported.payload.board.items[0]?.id,
    ]);
    expect(imported.payload.localStates[0]?.value).toEqual(timerState);
    expect((await parseBoardSnapshot(JSON.stringify(imported.snapshot))).payload).toEqual(imported.payload);
  });

  it("rejects unsafe or oversized imports", async () => {
    const text = snapshotText(makePayload());
    await expect(parseBoardSnapshot(text.replace('"version":1', '"version":2'))).rejects.toThrow();
    await expect(parseBoardSnapshot(text.replace('"board":{', '"board":{"__proto__":{},'))).rejects.toThrow(
      "Unsafe snapshot property",
    );
    await expect(parseBoardSnapshot(" ".repeat(maxSnapshotBytes + 1))).rejects.toThrow("10 MB limit");
    const payload = makePayload();
    payload.viewport.layoutId = "missing-layout";
    await expect(parseBoardSnapshot(snapshotText(payload))).rejects.toThrow("active layout");
    payload.viewport.layoutId = "layout";
    payload.queries = [{ key: [["user", "getAll"]], status: "success", updatedAt: 0 }];
    await expect(parseBoardSnapshot(snapshotText(payload))).rejects.toThrow("non-widget query");
  });
});

describe("offline snapshot replay", () => {
  it("replays captured data and errors, and rejects mutations and uncaptured queries", async () => {
    const payload = makePayload();
    payload.queries = [
      {
        key: [["app", "byId"], { input: { id: "captured" }, type: "query" }],
        data: { name: "redacted_1" },
        status: "success",
        updatedAt: 1,
      },
      {
        key: [["app", "byId"], { input: { id: "error" }, type: "query" }],
        status: "error",
        errorCode: "FORBIDDEN",
        updatedAt: 0,
      },
    ];
    const client = createTRPCClient<AppRouter>({ links: [snapshotReplayLink(payload)] });
    await expect(client.app.byId.query({ id: "captured" })).resolves.toEqual({ name: "redacted_1" });
    await expect(client.app.byId.query({ id: "error" })).rejects.toMatchObject({ data: { code: "FORBIDDEN" } });
    await expect(client.app.byId.query({ id: "missing" })).rejects.toMatchObject({ data: { code: "NOT_FOUND" } });
    await expect(client.board.renameBoard.mutate({ id: "board", name: "new" })).rejects.toMatchObject({
      data: { code: "FORBIDDEN" },
    });
  });

  it("hydrates the maximum query count and preserves pending state when observers replace metadata", () => {
    const payload = makePayload();
    payload.queries = Array.from({ length: 10000 }, (_, id) => ({
      key: appQueryKey(String(id)),
      data: { id },
      status: "success",
      updatedAt: 1,
    }));
    const pendingKey = appQueryKey("0");
    payload.queries[0] = { key: pendingKey, status: "pending", updatedAt: 0 };
    const client = createReplayQueryClient(payload);
    const observer = new QueryObserver(client, { queryKey: pendingKey, enabled: false, meta: { replaced: true } });
    expect(client.getQueryCache().getAll()).toHaveLength(10000);
    expect(client.getQueryData(appQueryKey("9999"))).toEqual({ id: 9999 });
    expect(observer.getCurrentResult().status).toBe("pending");
    expect(client.getDefaultOptions().queries?.meta?.boardSnapshotPendingQueryHashes).toEqual(
      new Set([hashKey(pendingKey)]),
    );
    observer.destroy();
    client.clear();
  });
});
