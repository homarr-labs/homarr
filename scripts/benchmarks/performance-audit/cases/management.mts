import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { Writable } from "node:stream";
import { fileURLToPath, pathToFileURL } from "node:url";

import type { BenchmarkCase, Side } from "../lib.mts";
import { benchmarkPair, BenchmarkContext } from "../lib.mts";

const manage = "apps/nextjs/src/app/[locale]/manage";
const accessFile = `${manage}/_access.ts`;
const layoutFile = `${manage}/layout.tsx`;
const integrationsFile = `${manage}/integrations/page.tsx`;
const groupsFile = `${manage}/users/groups/_groups-table.tsx`;
const permissionsFile = `${manage}/users/groups/[id]/permissions/page.tsx`;
const dockerFile = `${manage}/tools/docker/docker-reconciliation.tsx`;
const previewFile = `${manage}/custom-widgets/_custom-widget-preview-panel.tsx`;
const userRoot = `${manage}/users/[userId]`;
const permissionDefinitions = "packages/definitions/src/permissions.ts";

function dependencies(ctx: BenchmarkContext) {
  return createRequire(pathToFileURL(join(ctx.roots.after, "package.json")));
}

// These fixtures execute the actual TSX with explicit hook/UI dependencies. They
// measure cold component lookup work; mounted browser behavior is covered below.
function elementRuntime() {
  return {
    Fragment: "fragment",
    createElement(type: unknown, props: unknown, ...children: unknown[]) {
      return { type, props: props ?? {}, children };
    },
  };
}

function uiBindings(names: string[]) {
  return Object.fromEntries(names.map((name) => [name, name]));
}

function nodes(tree: any, name: string): any[] {
  if (Array.isArray(tree)) return tree.flatMap((entry) => nodes(entry, name));
  if (!tree || typeof tree !== "object") return [];
  const found = [];
  if (tree.type === name) found.push(tree);
  found.push(...nodes(tree.children, name));
  return found;
}

function groupRender(ctx: BenchmarkContext, side: Side, countReads = false) {
  let states: any[] = [];
  let setters: ((value: unknown) => void)[] = [];
  let stateIndex = 0;
  let reads = 0;
  const render = ctx.evaluate<any>(side, groupsFile, "GroupsTable", {
    React: elementRuntime(),
    ...uiBindings([
      "DndContext",
      "Table",
      "TableThead",
      "TableTr",
      "TableTh",
      "TableTbody",
      "SortableContext",
      "DragOverlay",
      "SaveAffix",
      "DraggableRow",
      "Row",
      "DragHandle",
    ]),
    useI18n: () => (key: string) => key,
    useMemo: (operation: () => unknown) => operation(),
    useState(initial: unknown) {
      const index = stateIndex++;
      if (states[index] === undefined) states[index] = initial;
      const setter = (value: any) => {
        if (typeof value === "function") states[index] = value(states[index]);
        else states[index] = value;
      };
      setters[index] = setter;
      return [states[index], setter];
    },
    useSensor: () => undefined,
    useSensors: () => [],
    MouseSensor: {},
    TouchSensor: {},
    KeyboardSensor: {},
    closestCenter: {},
    restrictToVerticalAxis: {},
    verticalListSortingStrategy: {},
    arrayMove(array: unknown[], from: number, to: number) {
      const next = [...array];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    },
    clientApi: {
      group: { savePositions: { useMutation: () => ({ mutateAsync: async () => undefined, isPending: false }) } },
    },
    revalidatePathActionAsync: async () => undefined,
    showSuccessNotification: () => undefined,
  });
  const rawGroups = Array.from({ length: 2500 }, (_, index) => ({
    id: `group-${index}`,
    name: `Group ${index}`,
    members: [],
  }));
  let groups = rawGroups;
  if (countReads) {
    groups = rawGroups.map((group) => ({
      ...group,
      get id() {
        reads++;
        return group.id;
      },
    }));
  }
  const ids = rawGroups.map(({ id }) => id);
  const invoke = (currentGroups = groups, currentIds = ids, hasFilter = false) => {
    reads = 0;
    stateIndex = 0;
    const tree = render({ groups: currentGroups, initialGroupIds: currentIds, hasFilter });
    return {
      tree,
      reads,
      rows: nodes(tree, "DraggableRow").map((row) => row.props.group.name),
      dirty: nodes(tree, "SaveAffix")[0].props.visible,
    };
  };
  return {
    operation() {
      states = [];
      setters = [];
      const result = invoke();
      return { reads: result.reads, rows: result.rows, dirty: result.dirty };
    },
    interactions() {
      states = [];
      setters = [];
      const initial = invoke();
      assert.equal(initial.dirty, false);
      const drag = nodes(initial.tree, "DndContext")[0].props;
      drag.onDragStart({ active: { id: ids[0] } });
      const dragging = invoke();
      assert.equal(nodes(dragging.tree, "Row")[0].props.group.name, rawGroups[0].name);
      drag.onDragEnd({ active: { id: ids[0] }, over: { id: ids[1] } });
      const moved = invoke();
      assert.equal(moved.dirty, true);
      assert.deepEqual(moved.rows.slice(0, 2), [rawGroups[1].name, rawGroups[0].name]);
      nodes(moved.tree, "SaveAffix")[0].props.onDiscard();
      assert.equal(invoke().dirty, false);
      states[1] = [...ids];
      const filtered = invoke(
        groups.filter((_group, index) => index % 2 === 0),
        ids,
        true,
      );
      assert.equal(filtered.rows.length, 1250);
      assert.equal(
        nodes(filtered.tree, "DraggableRow").every((row) => row.props.disabled),
        true,
      );
      states[1] = [ids[1], ids[0], ...ids.slice(2)];
      assert.equal(invoke(groups, states[1]).dirty, false);
    },
  };
}

function dockerRender(ctx: BenchmarkContext, side: Side, countReads = false) {
  let reads = 0;
  let healthData: any;
  const candidates = Array.from({ length: 2500 }, (_, index) => ({
    candidateKey: `candidate-${index}`,
    state: "newApp",
  }));
  let services = candidates.map(({ candidateKey }, index) => ({
    key: candidateKey,
    layers: [{ layer: "app", status: "available" }],
    index,
  }));
  if (countReads) {
    services = services.map((service) => ({
      ...service,
      get key() {
        reads++;
        return service.key;
      },
    }));
  }
  const fn = ctx.evaluate<any>(side, dockerFile, "DockerReconciliation", {
    React: elementRuntime(),
    ...uiBindings([
      "Alert",
      "IconAlertTriangle",
      "Stack",
      "Text",
      "Button",
      "Paper",
      "Group",
      "ThemeIcon",
      "IconBrandDocker",
      "Badge",
      "IconChevronDown",
      "Collapse",
      "Divider",
      "ServiceUrlTemplate",
      "SegmentedControl",
      "IconRefresh",
      "Accordion",
      "DockerReconciliationCandidate",
    ]),
    useI18n: () => (key: string) => key,
    useId: () => "inbox",
    useState: (initial: unknown) => [initial, () => undefined],
    useMemo: (operation: () => unknown) => operation(),
    useLocalStorage: ({ key, defaultValue }: any) => [key.endsWith("-open") ? true : defaultValue, () => undefined],
    clientApi: {
      useUtils: () => ({}),
      docker: {
        reconcileServices: { useQuery: () => ({ data: { endpoints: [], candidates } }) },
        getServiceHealth: { useQuery: () => ({ data: healthData }) },
        refreshInventory: { useMutation: () => ({ isPending: false }) },
      },
    },
    filterDockerReconciliationInbox: (items: unknown[]) => items,
    dismissDockerReconciliationCandidate: () => undefined,
    showErrorNotification: () => undefined,
  });
  return (missing = false) => {
    reads = 0;
    healthData = undefined;
    if (!missing) healthData = { services };
    const tree = fn({ defaultServerOrigin: "https://example.test" });
    const rows = nodes(tree, "DockerReconciliationCandidate");
    return { reads, indices: rows.map((row) => row.props.health?.index ?? -1) };
  };
}

class SimulatedIo {
  now = 0;
  events: { due: number; resolve: (value: unknown) => void; value: unknown }[] = [];
  delay(milliseconds: number, value: unknown) {
    return new Promise((resolve) => this.events.push({ due: this.now + milliseconds, resolve, value }));
  }
  async run(operation: () => Promise<unknown>) {
    let finished = false;
    let result: unknown;
    let failure: unknown;
    operation().then(
      (value) => {
        result = value;
        finished = true;
      },
      (error) => {
        failure = error;
        finished = true;
      },
    );
    while (!finished) {
      await new Promise<void>((resolve) => setImmediate(resolve));
      if (finished) break;
      if (this.events.length === 0) throw new Error("Simulated I/O workload stalled");
      this.now = Math.min(...this.events.map(({ due }) => due));
      const due = this.events.filter((event) => event.due === this.now);
      this.events = this.events.filter((event) => event.due !== this.now);
      for (const event of due) event.resolve(event.value);
    }
    if (failure) throw failure;
    return { result, simulatedCriticalPathMs: this.now };
  }
}

function managementLayout(ctx: BenchmarkContext, side: Side) {
  const source = ctx.extract(side, layoutFile, "ManageLayout");
  const icons = [...new Set(source.match(/\bIcon\w+/gu) ?? [])];
  return async (permissions: string[], accessFailure = false) => {
    const clock = new SimulatedIo();
    let reads = 0;
    let authenticated = false;
    const session = { user: { id: "viewer", permissions } };
    const fn = ctx.evaluate<any>(side, layoutFile, "ManageLayout", {
      React: elementRuntime(),
      ...uiBindings([...icons, "ClientShell", "MainHeader", "MainNavigation", "AppShellMain", "ManageTourGate"]),
      auth: () =>
        clock.delay(10, session).then((value) => {
          authenticated = true;
          return value;
        }),
      getI18n: () => clock.delay(30, (key: string) => key),
      getRscUserSettingsAsync: () => clock.delay(40, { completedManageTour: false }),
      getAppsSectionAccess: () => ({ canAccess: true }),
      getIntegrationsSectionAccessAsync: async (current: any) => {
        assert.equal(authenticated, true);
        if (
          current.user.permissions.includes("integration-full-all") ||
          current.user.permissions.includes("integration-create")
        )
          return { canAccess: true };
        reads++;
        await clock.delay(25, undefined);
        if (accessFailure) throw new Error("delegated lookup failed");
        return { canAccess: true };
      },
      nextEnv: { DEMO_MODE: false },
      logger: { error: () => undefined },
      env: { ENABLE_DOCKER: false, ENABLE_KUBERNETES: false },
      dbEnv: { DRIVER: "better-sqlite3" },
      isProviderEnabled: () => true,
      homarrLogoPath: "/logo.png",
      createDocumentationLink: (path: string) => path,
    });
    const { result, simulatedCriticalPathMs } = await clock.run(() => fn({ children: "content" }));
    return { tree: result, simulatedCriticalPathMs, reads };
  };
}

function permissionsPage(ctx: BenchmarkContext, side: Side) {
  const groupPermissions = ctx.evaluate<any>(side, permissionDefinitions, "groupPermissions");
  return async (translationDelay: number, isAdmin = true) => {
    const clock = new SimulatedIo();
    let reads = 0;
    const api = {
      group: {
        getById: () => {
          reads++;
          return clock.delay(25, { id: "group", permissions: ["admin"] });
        },
      },
    };
    const translations = new Map<string, Promise<unknown>>();
    const getI18n = (namespace: string) => {
      let translator = translations.get(namespace);
      if (!translator) {
        translator = clock.delay(translationDelay, (key: string) => `${namespace}:${key}`);
        translations.set(namespace, translator);
      }
      return translator;
    };
    const builder = ctx.evaluate<any>(side, permissionsFile, "buildPermissionTextsAsync", {
      groupPermissions,
      objectKeys: Object.keys,
      getI18n,
    });
    const fn = ctx.evaluate<any>(side, permissionsFile, "GroupPermissionsPage", {
      React: elementRuntime(),
      ...uiBindings([
        "Stack",
        "Title",
        "PermissionForm",
        "PresetButtons",
        "PermissionMatrix",
        "EffectivePermissionPreview",
        "SaveAffix",
      ]),
      auth: async () => ({ user: { permissions: isAdmin ? ["admin"] : [] } }),
      notFound: () => {
        throw new Error("NOT_FOUND");
      },
      api,
      getI18n,
      buildPermissionTextsAsync: builder,
    });
    const { result, simulatedCriticalPathMs } = await clock.run(() => fn({ params: Promise.resolve({ id: "group" }) }));
    return { tree: result, simulatedCriticalPathMs, reads, translationNamespaces: translations.size };
  };
}

let sharedServerRenderer: any;

function serverRenderer(ctx: BenchmarkContext) {
  if (sharedServerRenderer) return sharedServerRenderer;
  const require = dependencies(ctx);
  const React = require(join(dirname(require.resolve("react")), "react.react-server.js"));
  const entry = require.resolve("next/dist/compiled/react-server-dom-webpack/server.node");
  const rendererModule = { exports: {} as any };
  let build = "development";
  if (process.env.NODE_ENV === "production") build = "production";
  const filename = join(dirname(entry), `cjs/react-server-dom-webpack-server.node.${build}.js`);
  new Function("require", "exports", "module", readFileSync(filename, "utf8"))(
    (name: string) => (name === "react" ? React : require(name)),
    rendererModule.exports,
    rendererModule,
  );
  sharedServerRenderer = {
    React,
    async request(operation: () => Promise<unknown>) {
      let result: unknown;
      let failure: unknown;
      async function Probe() {
        try {
          result = await operation();
        } catch (error) {
          failure = error;
        }
        return React.createElement("div", null, "request complete");
      }
      await new Promise<void>((resolve, reject) => {
        const sink = new Writable({
          write(_chunk, _encoding, done) {
            done();
          },
        });
        sink.on("finish", resolve);
        sink.on("error", reject);
        rendererModule.exports.renderToPipeableStream(React.createElement(Probe), {}, { onError: reject }).pipe(sink);
      });
      if (failure) throw failure;
      return result;
    },
  };
  return sharedServerRenderer;
}

function integrationRequests(ctx: BenchmarkContext, side: Side, renderer: ReturnType<typeof serverRenderer>) {
  let reads = 0;
  const session = { user: { id: "delegated-user", permissions: [] as string[] } };
  const integrations = [
    {
      id: "group-owned",
      name: "Group owned",
      kind: "sonarr",
      url: "https://example.test",
      permissions: { hasFullAccess: true },
    },
    {
      id: "read-only",
      name: "Read only",
      kind: "sonarr",
      url: "https://example.test",
      permissions: { hasFullAccess: false },
    },
  ];
  const api = {
    integration: {
      all: async () => {
        reads++;
        return integrations;
      },
    },
  };
  const getAppManagementAccess = ctx.evaluate<any>(side, permissionDefinitions, "getAppManagementAccess");
  const getIntegrationManagementAccess = ctx.evaluate<any>(
    side,
    permissionDefinitions,
    "getIntegrationManagementAccess",
  );
  const declarations = ["getIntegrationsSectionAccess", "getIntegrationsSectionAccessAsync"];
  if (side === "after") declarations.unshift("getManageIntegrationsAsync");
  const access = ctx.evaluate<any>(
    side,
    accessFile,
    declarations,
    {
      api,
      cache: renderer.React.cache,
      getAppManagementAccess,
      getIntegrationManagementAccess,
    },
    {
      returnExpression:
        "({getIntegrationsSectionAccessAsync, getIntegrationsSectionAccess" +
        (side === "after" ? ", getManageIntegrationsAsync" : "") +
        "})",
    },
  );
  const page = ctx.evaluate<any>(side, integrationsFile, "IntegrationsPage", {
    React: elementRuntime(),
    ...uiBindings([
      "ManageCollectionPage",
      "NoResults",
      "IconPlugX",
      "TourTarget",
      "MobileAffixButton",
      "Link",
      "SearchInput",
      "IntegrationItem",
      "Stack",
      "Text",
    ]),
    api,
    auth: async () => session,
    searchParamsSchema: { parse: (value: unknown) => value },
    getI18n: async () => (key: string) => key,
    getIntegrationName: (kind: string) => kind,
    redirect: () => {
      throw new Error("REDIRECT");
    },
    notFound: () => {
      throw new Error("NOT_FOUND");
    },
    ...access,
  });
  return async () => {
    reads = 0;
    session.user.permissions = [];
    const result = await renderer.request(async () => {
      const [nav, pageResult] = await Promise.all([
        access.getIntegrationsSectionAccessAsync(session),
        page({ searchParams: Promise.resolve({}) }),
      ]);
      return { nav, pageResult };
    });
    const delegatedReads = reads;
    assert.equal((result as any).nav.canAccess, true);
    const second = await renderer.request(() => access.getIntegrationsSectionAccessAsync(session));
    const secondRequestReads = reads - delegatedReads;
    assert.equal((second as any).canAccess, true);
    session.user.permissions = ["integration-full-all"];
    const beforeGlobal = reads;
    await renderer.request(() => access.getIntegrationsSectionAccessAsync(session));
    assert.equal(reads - beforeGlobal, 0);
    session.user.permissions = [];
    const beforeDenied = reads;
    integrations[0].permissions.hasFullAccess = false;
    const denied = await renderer.request(() => access.getIntegrationsSectionAccessAsync(session));
    assert.equal((denied as any).canAccess, false);
    integrations[0].permissions.hasFullAccess = true;
    let distinctUserReads = 2;
    if (side === "after") {
      const countBefore = reads;
      await renderer.request(async () => {
        await access.getManageIntegrationsAsync("one");
        await access.getManageIntegrationsAsync("one");
        await access.getManageIntegrationsAsync("two");
      });
      distinctUserReads = reads - countBefore;
      assert.equal(distinctUserReads, 2);
    }
    assert.equal(beforeDenied > 0, true);
    return { result, delegatedReads, secondRequestReads, distinctUserReads };
  };
}

function userRequests(ctx: BenchmarkContext, side: Side, renderer: ReturnType<typeof serverRenderer>) {
  let reads = 0;
  let rejectUser = false;
  const session = { user: { id: "admin", permissions: ["admin"] } };
  const api = {
    user: {
      getById: async ({ userId }: any) => {
        reads++;
        if (rejectUser) throw new Error("NOT_FOUND");
        return { id: userId, name: "Target User", provider: "credentials" };
      },
    },
    board: { getManageOverview: async () => [] },
    searchEngine: { getSelectable: async () => [] },
  };
  const bindings: Record<string, unknown> = {
    React: elementRuntime(),
    api,
    auth: async () => session,
    getI18n: async () => (key: string) => key,
    canAccessUserEditPage: (_session: unknown, id: string) => id === "target" || id === "other-target",
    catchTrpcNotFound: (error: Error) => {
      throw error;
    },
    catchTrpcUnauthorized: (error: Error) => {
      throw error;
    },
    notFound: () => {
      throw new Error("NOT_FOUND");
    },
    ...uiBindings([
      "ManageContainer",
      "DynamicBreadcrumb",
      "Grid",
      "GridCol",
      "Group",
      "UserAvatar",
      "Stack",
      "Title",
      "Text",
      "NavigationLink",
      "IconSettings",
      "IconShieldLock",
      "Alert",
      "IconExclamationCircle",
      "UserGeneralSettingsForm",
      "UserProfileAvatarForm",
      "ResetTours",
      "DangerZoneRoot",
      "DangerZoneItem",
      "DeleteUserButton",
      "ChangePasswordForm",
    ]),
  };
  if (side === "after")
    bindings.getUserEditDataAsync = ctx.evaluate<any>(side, `${userRoot}/_data.ts`, "getUserEditDataAsync", {
      api,
      cache: renderer.React.cache,
    });
  const layout = ctx.evaluate<any>(side, `${userRoot}/layout.tsx`, "Layout", bindings);
  const metadata = ctx.evaluate<any>(side, `${userRoot}/general/page.tsx`, "generateMetadata", bindings);
  const general = ctx.evaluate<any>(side, `${userRoot}/general/page.tsx`, "EditUserPage", bindings);
  const security = ctx.evaluate<any>(side, `${userRoot}/security/page.tsx`, "UserSecurityPage", bindings);
  return async () => {
    reads = 0;
    const props = { params: Promise.resolve({ userId: "target" }), children: "page" };
    const result = await renderer.request(async () => Promise.all([layout(props), metadata(props), general(props)]));
    const generalReads = reads;
    await renderer.request(async () => Promise.all([layout(props), security(props)]));
    const securityReads = reads - generalReads;
    let distinctTargetReads = 2;
    if (side === "after") {
      const countBefore = reads;
      await renderer.request(async () => {
        await (bindings.getUserEditDataAsync as any)("target");
        await (bindings.getUserEditDataAsync as any)("target");
        await (bindings.getUserEditDataAsync as any)("other-target");
      });
      distinctTargetReads = reads - countBefore;
      assert.equal(distinctTargetReads, 2);
    }
    rejectUser = true;
    await renderer.request(async () => {
      assert.deepEqual(await metadata(props), {});
      await assert.rejects(() => layout(props), /NOT_FOUND/u);
      await assert.rejects(() => security(props), /NOT_FOUND/u);
    });
    rejectUser = false;
    return { result, generalReads, securityReads, distinctTargetReads };
  };
}

async function pollingProbe(ctx: BenchmarkContext, side: Side) {
  const require = dependencies(ctx);
  const { JSDOM } = require("jsdom");
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "https://example.test" });
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    HTMLElement: dom.window.HTMLElement,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: dom.window.navigator });
  dom.window.matchMedia = () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  });
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
  const React = require("react");
  const { createRoot } = require("react-dom/client");
  const query = require("@tanstack/react-query");
  const core = require("@tanstack/query-core");
  assert.equal(core.isServer, false, "Polling requires a browser observer context");
  const { MantineProvider, Tabs } = require("@mantine/core");
  let now = 0;
  let timerId = 0;
  let requests = 0;
  let renderAttempts = 0;
  const intervals = new Map<number, { handler: () => void; next: number; period: number }>();
  const pending = new Map<number, ReturnType<typeof setTimeout>>();
  core.timeoutManager.setTimeoutProvider({
    setTimeout(handler: () => void, timeout: number) {
      const id = ++timerId;
      pending.set(id, setTimeout(handler, timeout));
      return id;
    },
    clearTimeout(id: number) {
      clearTimeout(pending.get(id));
      pending.delete(id);
    },
    setInterval(handler: () => void, period: number) {
      const id = ++timerId;
      intervals.set(id, { handler, next: now + period, period });
      return id;
    },
    clearInterval(id: number) {
      intervals.delete(id);
    },
  });
  const queryCacheDefaultStaleTimeMs = ctx.evaluate<number>(
    side,
    "packages/api/src/query-cache.ts",
    "queryCacheDefaultStaleTimeMs",
  );
  const client = new query.QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity, staleTime: queryCacheDefaultStaleTimeMs } },
  });
  const transparent = ({ children }: any) => React.createElement("div", null, children);
  const component = ctx.evaluate<any>(side, previewFile, "CustomWidgetPreviewPanelContent", {
    React,
    useState: React.useState,
    useMemo: React.useMemo,
    ...Object.fromEntries(
      ["Card", "Stack", "Group", "Box", "Paper", "Text", "Alert"].map((name) => [name, transparent]),
    ),
    Tabs,
    SegmentedControl: () => null,
    Switch: () => null,
    useI18n: () => (key: string) => key,
    clientApi: {
      customWidget: {
        setPreviewLiveActions: { useMutation: () => ({}) },
        previewJournal: {
          useQuery: (input: unknown, options: unknown) =>
            query.useQuery({
              queryKey: ["previewJournal", input],
              queryFn: async () => {
                requests++;
                return [];
              },
              ...(options as object),
            }),
        },
      },
    },
    analyzeCustomWidgetAccessibility: () => [],
    createPreviewDisplayData: () => ({}),
    getPreviewSummary: () => ({}),
    previewWidths: { standard: 480 },
    PreviewErrorBoundary: transparent,
    CustomJsxDisplay: () => {
      renderAttempts++;
      return React.createElement("span", null, "preview renderer");
    },
    CodeEditor: () => null,
    JsonPreviewEditor: () => null,
    PreviewActionControl: () => null,
    CustomWidgetPreviewSizeControl: () => null,
    PreviewResult: () => null,
    PreviewStatusDot: () => null,
    showErrorNotification: () => undefined,
    classes: { previewCanvas: "canvas" },
  });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const props = {
    candidate: { template: "<Text>preview</Text>", requests: {}, sources: [] },
    validationIssues: [],
    preview: {
      data: {},
      status: {},
      session: { id: "preview-session", expiresAt: Date.now() + 60_000, liveActions: false },
      outcome: "success",
    },
    size: "standard",
    optionsSnapshot: {},
    onSizeChange() {},
    onOptionsChange() {},
    onLiveActionsChange() {},
  };
  const flush = async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    await Promise.resolve();
  };
  const advance = async (milliseconds: number) => {
    const target = now + milliseconds;
    while (intervals.size > 0) {
      const next = Math.min(...[...intervals.values()].map((timer) => timer.next));
      if (next > target) break;
      now = next;
      for (const [id, timer] of [...intervals]) {
        if (timer.next > now || !intervals.has(id)) continue;
        timer.next += timer.period;
        timer.handler();
      }
      await flush();
    }
    now = target;
    await flush();
  };
  const select = async (tab: string) => {
    const button = [...host.querySelectorAll("button[role=tab]")].find((element: any) =>
      element.textContent.includes(`tab.${tab}`),
    ) as HTMLElement;
    assert.ok(button);
    await React.act(async () => {
      button.click();
      await flush();
    });
  };
  try {
    await React.act(async () => {
      root.render(
        React.createElement(
          query.QueryClientProvider,
          { client },
          React.createElement(MantineProvider, null, React.createElement(component, props)),
        ),
      );
      await flush();
    });
    assert.equal(host.textContent?.includes("preview renderer"), true);
    await React.act(() => advance(6000));
    const hiddenRequests = requests;
    const hiddenRenderAttempts = renderAttempts;
    await select("diagnostics");
    const entryRequests = requests - hiddenRequests;
    if (side === "after") assert.equal(entryRequests >= 1, true, "Entry refreshes current journal data");
    const beforePolling = requests;
    await React.act(() => advance(4000));
    const visiblePollRequests = requests - beforePolling;
    assert.equal(visiblePollRequests, 2);
    await select("data");
    const beforeLeaving = requests;
    await React.act(() => advance(6000));
    const leavingRequests = requests - beforeLeaving;
    await select("diagnostics");
    const returnRequests = requests - beforeLeaving - leavingRequests;
    if (side === "after") assert.equal(returnRequests >= 1, true);
    const keys = client
      .getQueryCache()
      .getAll()
      .map((entry: any) => entry.queryKey);
    assert.deepEqual(keys, [["previewJournal", { sessionId: "preview-session" }]]);
    return {
      hiddenRequests,
      hiddenRenderAttempts,
      entryRequests,
      visiblePollRequests,
      leavingRequests,
      returnRequests,
    };
  } finally {
    await React.act(() => root.unmount());
    client.clear();
    for (const timeout of pending.values()) clearTimeout(timeout);
    host.remove();
    dom.window.close();
  }
}

export const cases: BenchmarkCase[] = [
  benchmarkPair({
    id: "MTAIL-001",
    title: "Linear group row and saved-order lookup",
    files: [groupsFile],
    iterations: 20,
    fixture:
      "2,500 unique groups; actual component function with explicit hook/UI bindings. Timed cold renders use plain data and include Map allocation; property-read counts come from separate untimed probes. Drag overlay/reorder/discard/filter/save-order equivalence retained.",
    metricUnits: { groupIdReads: "property reads", renderedRows: "rows" },
    prepare(ctx) {
      const before = groupRender(ctx, "before");
      const after = groupRender(ctx, "after");
      const probes = {
        before: groupRender(ctx, "before", true).operation(),
        after: groupRender(ctx, "after", true).operation(),
      };
      before.interactions();
      after.interactions();
      return {
        before: before.operation,
        after: after.operation,
        verify(a: any, b: any) {
          assert.deepEqual(b.rows, a.rows);
          assert.equal(b.dirty, a.dirty);
          assert.deepEqual(probes.before.rows, a.rows);
          assert.deepEqual(probes.after.rows, b.rows);
          assert.equal(probes.before.dirty, a.dirty);
          assert.equal(probes.after.dirty, b.dirty);
          assert.equal(a.reads, 0);
          assert.equal(b.reads, 0);
          assert.ok(probes.after.reads < probes.before.reads);
        },
        metrics(result: any, side) {
          return { groupIdReads: probes[side].reads, renderedRows: result.rows.length };
        },
      };
    },
  }),
  benchmarkPair({
    id: "NMG-004",
    title: "Indexed Docker candidate health lookup",
    files: [dockerFile],
    iterations: 20,
    fixture:
      "2,500 candidates and matching unique health keys; actual component function with explicit hook/UI/query bindings. Timed cold renders use plain data and include Map allocation; property-read counts come from separate untimed probes.",
    metricUnits: { healthKeyReads: "property reads", renderedCandidates: "rows" },
    prepare(ctx) {
      const before = dockerRender(ctx, "before");
      const after = dockerRender(ctx, "after");
      const probes = {
        before: dockerRender(ctx, "before", true)(),
        after: dockerRender(ctx, "after", true)(),
      };
      assert.deepEqual(after(true).indices, before(true).indices);
      return {
        before,
        after,
        verify(a: any, b: any) {
          assert.deepEqual(b.indices, a.indices);
          assert.deepEqual(probes.before.indices, a.indices);
          assert.deepEqual(probes.after.indices, b.indices);
          assert.equal(a.reads, 0);
          assert.equal(b.reads, 0);
          assert.ok(probes.after.reads < probes.before.reads);
        },
        metrics(result: any, side) {
          return { healthKeyReads: probes[side].reads, renderedCandidates: result.indices.length };
        },
      };
    },
  }),
  benchmarkPair({
    id: "NSC-1",
    title: "Overlap management access with translation/tour reads",
    files: [layoutFile],
    async: true,
    timing: false,
    fixture:
      "Actual layout with simulated auth=10ms, tour=40ms, translation=30ms, delegated access=25ms; checks fast path and failure propagation. Simulated critical path is not production latency.",
    metricUnits: { simulatedCriticalPathMs: "simulated ms", accessReads: "queries" },
    async prepare(ctx) {
      const before = managementLayout(ctx, "before");
      const after = managementLayout(ctx, "after");
      for (const operation of [before, after]) {
        assert.equal((await operation(["integration-full-all"])).reads, 0);
        assert.equal((await operation(["integration-create"])).reads, 0);
        await assert.rejects(() => operation([], true), /delegated lookup failed/u);
      }
      return {
        before: () => before([]),
        after: () => after([]),
        verify(a: any, b: any) {
          assert.deepEqual(b.tree, a.tree);
          assert.equal(a.reads, b.reads);
          assert.equal(a.simulatedCriticalPathMs, 75);
          assert.equal(b.simulatedCriticalPathMs, 50);
        },
        metrics(result: any) {
          return { simulatedCriticalPathMs: result.simulatedCriticalPathMs, accessReads: result.reads };
        },
      };
    },
  }),
  benchmarkPair({
    id: "MTAIL-002",
    title: "Permission page independent translator acquisition",
    files: [permissionsFile, permissionDefinitions],
    async: true,
    timing: false,
    fixture:
      "Actual authorized page/helper with request-cached translators; simulated translation=10ms/namespace and group=25ms; also verifies zero-cost translator cache and no calls before admin authorization. Not production latency.",
    metricUnits: {
      simulatedCriticalPathMs: "simulated ms",
      groupReads: "queries",
      translationNamespaces: "namespaces",
      hotTranslationCriticalPathMs: "simulated ms",
    },
    async prepare(ctx) {
      const before = permissionsPage(ctx, "before");
      const after = permissionsPage(ctx, "after");
      const beforeHot = await before(0);
      const afterHot = await after(0);
      assert.equal(beforeHot.simulatedCriticalPathMs, 25);
      assert.equal(afterHot.simulatedCriticalPathMs, 25);
      await assert.rejects(() => before(10, false), /NOT_FOUND/u);
      await assert.rejects(() => after(10, false), /NOT_FOUND/u);
      return {
        before: () => before(10),
        after: () => after(10),
        verify(a: any, b: any) {
          assert.deepEqual(b.tree, a.tree);
          assert.equal(a.reads, b.reads);
          assert.equal(a.translationNamespaces, b.translationNamespaces);
          assert.ok(b.simulatedCriticalPathMs < a.simulatedCriticalPathMs);
        },
        metrics(result: any) {
          return {
            simulatedCriticalPathMs: result.simulatedCriticalPathMs,
            groupReads: result.reads,
            translationNamespaces: result.translationNamespaces,
            hotTranslationCriticalPathMs: 25,
          };
        },
      };
    },
  }),
  benchmarkPair({
    id: "NMG-002",
    title: "Request-scoped integration list reuse",
    files: [accessFile, integrationsFile, permissionDefinitions],
    async: true,
    timing: false,
    fixture:
      "Actual access helper and complete integrations-page function, mocked authorized group-owned/read-only rows, real React.cache inside installed Flight renderer requests; verifies request reset/global skip/denied access/user-key separation.",
    metricUnits: { delegatedListReads: "queries", subsequentRequestReads: "queries", distinctUserReads: "queries" },
    prepare(ctx) {
      const renderer = serverRenderer(ctx);
      const before = integrationRequests(ctx, "before", renderer);
      const after = integrationRequests(ctx, "after", renderer);
      return {
        before,
        after,
        verify(a: any, b: any) {
          assert.deepEqual(b.result, a.result);
          assert.equal(a.delegatedReads, 2);
          assert.equal(b.delegatedReads, 1);
          assert.equal(a.secondRequestReads, 1);
          assert.equal(b.secondRequestReads, 1);
        },
        metrics(result: any) {
          return {
            delegatedListReads: result.delegatedReads,
            subsequentRequestReads: result.secondRequestReads,
            distinctUserReads: result.distinctUserReads,
          };
        },
      };
    },
  }),
  benchmarkPair({
    id: "NMG-005",
    title: "Request-scoped target-user lookup reuse",
    files: [`${userRoot}/layout.tsx`, `${userRoot}/general/page.tsx`, `${userRoot}/security/page.tsx`],
    async: true,
    timing: false,
    fixture:
      "Actual layout/general/metadata/security functions; authorized API dependency; real React.cache in installed Flight renderer requests; verifies target-user key separation, request reset, metadata suppression and page error propagation.",
    metricUnits: { generalUserReads: "queries", securityUserReads: "queries", distinctTargetReads: "queries" },
    prepare(ctx) {
      const renderer = serverRenderer(ctx);
      const before = userRequests(ctx, "before", renderer);
      const after = userRequests(ctx, "after", renderer);
      return {
        before,
        after,
        verify(a: any, b: any) {
          assert.deepEqual(b.result, a.result);
          assert.equal(a.generalReads, 3);
          assert.equal(b.generalReads, 1);
          assert.equal(a.securityReads, 2);
          assert.equal(b.securityReads, 1);
        },
        metrics(result: any) {
          return {
            generalUserReads: result.generalReads,
            securityUserReads: result.securityReads,
            distinctTargetReads: result.distinctTargetReads,
          };
        },
      };
    },
  }),
  benchmarkPair({
    id: "NMG-001",
    title: "Diagnostics-only journal polling",
    files: [previewFile, "packages/api/src/query-cache.ts"],
    async: true,
    timing: false,
    fixture:
      "Actual preview panel mounted in jsdom with real Mantine Tabs and TanStack Query hooks; controlled Query timer provider: hidden 6s, Diagnostics 4s, Data 6s, re-entry. Isolated browser context ensures query-core isServer=false.",
    metricUnits: {
      hiddenRequests: "requests / simulated 6s",
      visiblePollRequests: "requests / simulated 4s",
      leavingRequests: "requests / simulated 6s",
      entryRequests: "requests",
      returnRequests: "requests",
      hiddenRenderAttempts: "renders",
    },
    prepare(ctx) {
      for (const side of ["before", "after"] as const)
        ctx.extract(side, previewFile, "CustomWidgetPreviewPanelContent");
      const execute = (side: Side) => {
        const output = spawnSync(
          process.execPath,
          [fileURLToPath(import.meta.url), "--poll-probe", ctx.roots.before, ctx.roots.after, side],
          { encoding: "utf8", timeout: 60_000 },
        );
        if (output.error) throw output.error;
        if (output.status !== 0)
          throw new Error(output.stderr || output.stdout || `Polling child failed: ${output.status}`);
        return JSON.parse(output.stdout);
      };
      return {
        before: () => execute("before"),
        after: () => execute("after"),
        verify(a: any, b: any) {
          assert.equal(a.hiddenRequests, 4);
          assert.equal(b.hiddenRequests, 0);
          assert.equal(a.leavingRequests, 3);
          assert.equal(b.leavingRequests, 0);
          assert.equal(b.visiblePollRequests, a.visiblePollRequests);
          assert.equal(b.hiddenRenderAttempts, 1);
        },
        metrics(result: any) {
          return result;
        },
      };
    },
  }),
];

if (process.argv[2] === "--poll-probe") {
  const beforeRoot = process.argv[3];
  const afterRoot = process.argv[4];
  if (!beforeRoot || !afterRoot) throw new Error("Polling probe requires both source roots");
  const ctx = new BenchmarkContext({ before: beforeRoot, after: afterRoot });
  const side = process.argv[5] as Side;
  // React's act queue can await a MessageChannel turn after the last Query
  // timer is removed. Keep the child alive until that queue finishes.
  const keepAlive = setInterval(() => undefined, 1_000);
  pollingProbe(ctx, side)
    .then((result) => {
      process.stdout.write(JSON.stringify(result));
    })
    .catch((error) => {
      process.stderr.write(String(error.stack ?? error));
      process.exitCode = 1;
    })
    .finally(() => clearInterval(keepAlive));
}
