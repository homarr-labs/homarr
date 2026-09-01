import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { stringify } from "superjson";

import { comparePasswordsAsync, hashPasswordAsync } from "../../packages/auth/security.ts";
import { customWidgetDefinitionSchema } from "../../packages/custom-widgets/src/core/index.ts";
import {
  emptySuperJSON,
  getBoardLaneColumnCount,
  getDefaultWidgetConfig,
  getRootSectionLane,
  getWidgetKindsForIntegration,
  widgetKinds,
} from "../../packages/definitions/index.ts";
import type { BoardPermission, GroupPermissionKey, LayoutRole, WidgetKind } from "../../packages/definitions/index.ts";
import { db as rootDb, eq, inArray, sql } from "../../packages/db/index.ts";
import {
  apps,
  boardGroupPermissions,
  boardUserPermissions,
  boards,
  customWidgetDefinitions,
  groupMembers,
  groupPermissions,
  groups,
  iconRepositories,
  icons,
  integrationItems,
  integrations,
  itemLayouts,
  items,
  layouts,
  onboarding,
  sectionLayouts,
  sections,
  users,
} from "../../packages/db/schema/index.ts";
import { boardNameSchema } from "../../packages/validation/src/board.ts";

import { findFixtureGeometryErrors } from "./geometry.mts";
import {
  getReleaseV2QaExpectedBoardAccess,
  releaseV2QaPacketBoardAccess,
  validateReleaseV2QaPacketBoardAccess,
} from "./permissions.mts";
import type { ReleaseV2QaCoverageAccessManifest } from "./permissions.mts";
import {
  assertReleaseV2QaProfileEnvironment,
  releaseV2QaProfiles,
  resolveCheckoutCandidateSha,
  validateCandidateSha,
} from "./provenance.mts";
import type { ReleaseV2QaProfile, ReleaseV2QaProfileFlags } from "./provenance.mts";
import { validateFixtureUrl } from "./safety.mts";

let db = rootDb;
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const profiles = releaseV2QaProfiles;
type Profile = ReleaseV2QaProfile;

interface CliOptions {
  candidateSha?: string;
  manifestPath?: string;
  outputDirectory?: string;
  profile?: Profile;
  reset: boolean;
}

interface PersonaDefinition {
  handle: string;
  name: string;
  permissions: GroupPermissionKey[];
}

interface LayoutDefinition {
  breakpoint: number;
  columnCount: number;
  handle: string;
  leftGutterColumnCount?: number;
  name: string;
  rightGutterColumnCount?: number;
  role: LayoutRole;
}

interface BoardDefinition {
  handle: string;
  isPublic?: boolean;
  label: string;
  layouts?: LayoutDefinition[];
  ownerHandle: string;
}

interface ItemDefinition {
  advancedOptions?: string;
  boardHandle: string;
  handle: string;
  height: number;
  kind: WidgetKind;
  options: string;
  sectionHandle?: string;
  width: number;
}

interface Position {
  boardHandle: string;
  height: number;
  itemHandle: string;
  layoutHandle: string;
  sectionHandle: string;
  width: number;
  xOffset: number;
  yOffset: number;
}

const mobileLayout: LayoutDefinition = {
  handle: "mobile",
  name: "Mobile",
  columnCount: 3,
  breakpoint: 0,
  role: "mobile",
};
const defaultLayouts: LayoutDefinition[] = [
  mobileLayout,
  { handle: "base", name: "Base", columnCount: 12, breakpoint: 768, role: "base" },
];

const personas: PersonaDefinition[] = [
  { handle: "avery-admin", name: "Avery Admin", permissions: ["admin"] },
  { handle: "rowan-owner", name: "Rowan Owner", permissions: ["board-create"] },
  { handle: "eden-editor", name: "Eden Editor", permissions: [] },
  { handle: "vivian-viewer", name: "Vivian Viewer", permissions: [] },
  { handle: "nolan-outsider", name: "Nolan Outsider", permissions: [] },
  { handle: "morgan-mobile", name: "Morgan Mobile", permissions: [] },
  { handle: "casey-chaos", name: "Casey Chaos", permissions: [] },
  { handle: "ingrid-infra", name: "Ingrid Infra", permissions: ["integration-full-all"] },
  { handle: "maya-media", name: "Maya Media", permissions: ["media-full-all"] },
  { handle: "brooke-minimalist", name: "Brooke Minimalist", permissions: [] },
  { handle: "cora-creator", name: "Cora Creator", permissions: ["board-create", "app-create"] },
  { handle: "ash-assistant", name: "Ash Assistant", permissions: [] },
  { handle: "kira-keyboard", name: "Kira Keyboard", permissions: [] },
  { handle: "nora-newcomer", name: "Nora Newcomer", permissions: [] },
];

const widgetGalleryGroups: readonly (readonly WidgetKind[])[] = [
  ["clock", "weather", "airQuality", "countdown", "timer"],
  ["app", "iframe", "video", "minecraftServerStatus", "stockPrice"],
  ["notebook", "anchorNote", "bookmarks", "rssFeed", "timetable"],
  ["downloads", "dockerContainers", "indexerManager", "dnsHoleSummary", "dnsHoleControls"],
  ["smartHome-entityState", "smartHome-executeAutomation", "healthMonitoring", "systemResources", "systemDisks"],
  ["firewall", "notifications", "networkControllerSummary", "networkControllerStatus", "uptimeKuma"],
  ["beszelSystemTable", "beszelSystemGrid", "beszelAlerts", "beszelSystemStats", "wud"],
  ["ups", "vpn", "speedtestTracker", "traefik", "umami"],
  ["calendar", "mediaServer", "mediaRequests-requestList", "mediaRequests-requestStats", "mediaMissing"],
  ["mediaReleases", "mediaTranscoding", "immich-serverStats", "immich-albumCarousel", "audioStats"],
  ["paperlessNgx", "patchmon", "bazarr", "tracearr", "releases"],
  ["coolify", "archiveTeamWarrior", "customApi", "assistant"],
];

const sharedBoards: BoardDefinition[] = [
  {
    handle: "grid-24",
    label: "QA v2 · 24-column grid",
    ownerHandle: "avery-admin",
    layouts: [
      mobileLayout,
      {
        handle: "six",
        name: "6 columns",
        columnCount: 6,
        breakpoint: 480,
        role: "custom",
        leftGutterColumnCount: 1,
        rightGutterColumnCount: 1,
      },
      {
        handle: "twelve",
        name: "12 columns",
        columnCount: 12,
        breakpoint: 768,
        role: "custom",
        leftGutterColumnCount: 1,
        rightGutterColumnCount: 1,
      },
      {
        handle: "eighteen",
        name: "18 columns",
        columnCount: 18,
        breakpoint: 1024,
        role: "custom",
        leftGutterColumnCount: 1,
        rightGutterColumnCount: 1,
      },
      {
        handle: "width-coverage",
        name: "24-column width coverage",
        columnCount: 24,
        breakpoint: 1280,
        role: "custom",
      },
      {
        handle: "base",
        name: "Base 24",
        columnCount: 24,
        breakpoint: 1440,
        role: "base",
        leftGutterColumnCount: 1,
        rightGutterColumnCount: 1,
      },
    ],
  },
  {
    handle: "scroll",
    label: "QA v2 · Scroll",
    ownerHandle: "avery-admin",
    layouts: [
      mobileLayout,
      {
        handle: "base",
        name: "Base with rails",
        columnCount: 12,
        breakpoint: 768,
        role: "base",
        leftGutterColumnCount: 2,
        rightGutterColumnCount: 2,
      },
    ],
  },
  { handle: "dense-collisions", label: "QA v2 · Dense collisions", ownerHandle: "avery-admin" },
  { handle: "nested-containers", label: "QA v2 · Nested containers", ownerHandle: "avery-admin" },
  {
    handle: "layout-boundaries",
    label: "QA v2 · Layout boundaries",
    ownerHandle: "avery-admin",
    layouts: [
      mobileLayout,
      { handle: "compact", name: "Compact", columnCount: 6, breakpoint: 480, role: "custom" },
      { handle: "desktop", name: "Desktop", columnCount: 12, breakpoint: 1024, role: "custom" },
      { handle: "base", name: "Base 24", columnCount: 24, breakpoint: 1440, role: "base" },
    ],
  },
  { handle: "icons-bookmarks", label: "QA v2 · Icons and bookmarks", ownerHandle: "avery-admin" },
  ...Array.from({ length: 12 }, (_, index) => {
    const handle = `widgets-${String(index + 1).padStart(2, "0")}`;
    return { handle, label: `QA v2 · ${handle}`, ownerHandle: "avery-admin" };
  }),
  {
    handle: "custom-widget-assistant",
    label: "QA v2 · Custom Widget and Assistant",
    ownerHandle: "avery-admin",
  },
  {
    handle: "permissions-public",
    label: "QA v2 · Permissions and public access",
    ownerHandle: "rowan-owner",
    isPublic: true,
  },
  { handle: "download-upload", label: "QA v2 · Download and upload", ownerHandle: "maya-media" },
];

const homeBoards: BoardDefinition[] = personas.map((persona) => ({
  handle: `home-${persona.handle}`,
  label: `QA v2 · Home · ${persona.handle}`,
  ownerHandle: persona.handle,
}));

const qaBoards = [...homeBoards, ...sharedBoards];
const boardName = (handle: string) => {
  if (handle === "scroll") return "qa-scroll-lab";
  return `qa-${handle}`;
};
const validateQaBoardDefinitions = () => {
  const names = qaBoards.map((board) => boardName(board.handle));
  if (new Set(names).size !== names.length) throw new Error("QA board names must be unique");
  for (const name of names) {
    if (!boardNameSchema.safeParse(name).success) throw new Error(`Invalid QA board name: ${name}`);
  }
};
const userId = (handle: string) => `qa-v2-user-${handle}`;
const groupId = (handle: string) => `qa-v2-group-${handle}`;
const boardId = (handle: string) => `qa-v2-board-${handle}`;
const layoutId = (boardHandle: string, handle: string) => `qa-v2-layout-${boardHandle}-${handle}`;
const sectionId = (boardHandle: string, handle: string) => `qa-v2-section-${boardHandle}-${handle}`;
const itemId = (boardHandle: string, handle: string) => `qa-v2-item-${boardHandle}-${handle}`;
const appId = (index: number) => `qa-v2-app-${String(index).padStart(2, "0")}`;
const iconId = (index: number) => `qa-v2-icon-${String(index).padStart(2, "0")}`;
const qaUserIds = personas.map((persona) => userId(persona.handle));
const qaBoardIds = qaBoards.map((board) => boardId(board.handle));
const qaLayoutIds = qaBoards.flatMap((board) =>
  (board.layouts ?? defaultLayouts).map((layout) => layoutId(board.handle, layout.handle)),
);
const qaGroupIds = [groupId("fixture-access"), ...personas.map((persona) => groupId(persona.handle))];
const qaAppIds = Array.from({ length: 8 }, (_, index) => appId(index + 1));
const qaIconIds = Array.from({ length: 8 }, (_, index) => iconId(index + 1));
const mockIntegrationId = "qa-v2-integration-mock";
const customDefinitionId = "qa-v2-custom-widget-fixture";
const disabledCustomDefinitionId = "qa-v2-custom-widget-disabled";
const missingSecretCustomDefinitionId = "qa-v2-custom-widget-missing-secret";
const customDefinitionIds = [customDefinitionId, disabledCustomDefinitionId, missingSecretCustomDefinitionId];
const iconRepositoryId = "qa-v2-icon-repository";
const expectedBoardAccess = getReleaseV2QaExpectedBoardAccess(releaseV2QaPacketBoardAccess);

const parseCli = (): CliOptions => {
  const options: CliOptions = { reset: false };
  for (let index = 2; index < process.argv.length; index++) {
    const argument = process.argv[index];
    if (argument === "--") continue;
    if (argument === "--reset") {
      options.reset = true;
      continue;
    }
    if (!["--candidate-sha", "--manifest", "--output", "--profile"].includes(argument ?? "")) {
      throw new Error(`Unknown argument: ${argument ?? ""}`);
    }
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argument}`);
    index++;
    if (argument === "--candidate-sha") options.candidateSha = value;
    if (argument === "--manifest") options.manifestPath = value;
    if (argument === "--output") options.outputDirectory = value;
    if (argument === "--profile") {
      if (!profiles.includes(value as Profile)) throw new Error(`Unsupported profile: ${value}`);
      options.profile = value as Profile;
    }
  }
  return options;
};

const requiredEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const requiredQaPassword = async () => {
  const direct = process.env.QA_PASSWORD?.trim();
  if (direct) return direct;
  const passwordFile = process.env.QA_PASSWORD_FILE?.trim();
  if (passwordFile) {
    const fromFile = (await readFile(resolve(passwordFile), "utf8")).trim();
    if (fromFile) return fromFile;
  }
  throw new Error("QA_PASSWORD or QA_PASSWORD_FILE is required");
};

const runInTransactionAsync = async (operation: () => Promise<void>) => {
  if ((process.env.DB_DRIVER ?? "better-sqlite3") === "better-sqlite3") {
    rootDb.run(sql.raw("BEGIN IMMEDIATE"));
    try {
      await operation();
      rootDb.run(sql.raw("COMMIT"));
    } catch (error) {
      rootDb.run(sql.raw("ROLLBACK"));
      throw error;
    }
    return;
  }

  try {
    await rootDb.transaction(async (transaction) => {
      db = transaction as typeof rootDb;
      await operation();
    });
  } finally {
    db = rootDb;
  }
};

const resolveManifestPath = (options: CliOptions) => {
  const explicit = options.manifestPath ?? process.env.QA_FIXTURE_MANIFEST;
  if (explicit) return resolve(explicit);
  if (options.outputDirectory) return resolve(options.outputDirectory, "fixture-manifest.json");
  const runRoot = process.env.QA_RUN_ROOT;
  const slot = process.env.QA_SLOT;
  if (runRoot && slot) return resolve(runRoot, "slots", slot, "fixture-manifest.json");
  throw new Error("--manifest, --output, or QA_FIXTURE_MANIFEST is required");
};

const upsertById = async <TRow extends { id: string }>(
  query: { findFirst: (input: unknown) => Promise<TRow | undefined> },
  table: { id: unknown },
  row: TRow,
) => {
  const existing = await query.findFirst({ where: eq(table.id as never, row.id) });
  if (existing) {
    await db
      .update(table as never)
      .set(row as never)
      .where(eq(table.id as never, row.id));
    return;
  }
  await db.insert(table as never).values(row as never);
};

const resetQaRowsAsync = async () => {
  if (qaBoardIds.length > 0) await db.delete(boards).where(inArray(boards.id, qaBoardIds));
  if (qaUserIds.length > 0) await db.delete(users).where(inArray(users.id, qaUserIds));
  if (qaGroupIds.length > 0) await db.delete(groups).where(inArray(groups.id, qaGroupIds));
  await db.delete(customWidgetDefinitions).where(inArray(customWidgetDefinitions.id, customDefinitionIds));
  await db.delete(integrations).where(eq(integrations.id, mockIntegrationId));
  if (qaAppIds.length > 0) await db.delete(apps).where(inArray(apps.id, qaAppIds));
  if (qaIconIds.length > 0) await db.delete(icons).where(inArray(icons.id, qaIconIds));
  await db.delete(iconRepositories).where(eq(iconRepositories.id, iconRepositoryId));
};

const setOnboardingStepAsync = async (profile: Profile) => {
  const row = await db.query.onboarding.findFirst();
  if (!row) throw new Error("Production seed did not create the onboarding row");
  if (profile === "onboarding-fresh") {
    await db.update(onboarding).set({ step: "start", previousStep: null }).where(eq(onboarding.id, row.id));
    return;
  }
  await db.update(onboarding).set({ step: "finish", previousStep: "setup" }).where(eq(onboarding.id, row.id));
};

const resolvePasswordHashAsync = async (password: string) => {
  const existing = await db.query.users.findMany({ where: inArray(users.id, qaUserIds), columns: { password: true } });
  for (const row of existing) {
    if (row.password && (await comparePasswordsAsync(password, row.password))) return row.password;
  }
  return hashPasswordAsync(password);
};

const seedPersonasAsync = async (passwordHash: string) => {
  for (const persona of personas) {
    const id = userId(persona.handle);
    await upsertById(
      db.query.users as never,
      users as never,
      {
        id,
        name: persona.handle,
        email: `qa-v2-${persona.handle}@example.test`,
        emailVerified: null,
        image: null,
        password: passwordHash,
        provider: "credentials",
        homeBoardId: null,
        mobileHomeBoardId: null,
        defaultSearchEngineId: null,
        openSearchInNewTab: true,
        ddgBangs: true,
        colorScheme: "dark",
        firstDayOfWeek: 1,
        pingIconsEnabled: true,
        enableRightClickOnWidgets: true,
        completedManageTour: true,
        completedBoardTour: true,
      } as typeof users.$inferSelect,
    );
  }

  await upsertById(
    db.query.groups as never,
    groups as never,
    {
      id: groupId("fixture-access"),
      name: "QA v2 fixture access",
      ownerId: userId("avery-admin"),
      homeBoardId: null,
      mobileHomeBoardId: null,
      position: 10_000,
    } as typeof groups.$inferSelect,
  );

  for (const [index, persona] of personas.entries()) {
    await upsertById(
      db.query.groups as never,
      groups as never,
      {
        id: groupId(persona.handle),
        name: `QA v2 role · ${persona.handle}`,
        ownerId: userId("avery-admin"),
        homeBoardId: null,
        mobileHomeBoardId: null,
        position: 10_001 + index,
      } as typeof groups.$inferSelect,
    );
  }

  await db.delete(groupPermissions).where(inArray(groupPermissions.groupId, qaGroupIds));
  await db.delete(groupMembers).where(inArray(groupMembers.userId, qaUserIds));
  await db
    .insert(groupPermissions)
    .values([
      { groupId: groupId("fixture-access"), permission: "app-use-all" },
      { groupId: groupId("fixture-access"), permission: "integration-use-all" },
      ...personas.flatMap((persona) =>
        persona.permissions.map((permission) => ({ groupId: groupId(persona.handle), permission })),
      ),
    ]);
  await db
    .insert(groupMembers)
    .values([
      ...personas.map((persona) => ({ groupId: groupId("fixture-access"), userId: userId(persona.handle) })),
      ...personas.map((persona) => ({ groupId: groupId(persona.handle), userId: userId(persona.handle) })),
    ]);
};

const seedGlobalFixturesAsync = async (fixtureUrl: string) => {
  await upsertById(
    db.query.integrations as never,
    integrations as never,
    {
      id: mockIntegrationId,
      name: "QA v2 built-in mock integration",
      url: fixtureUrl,
      kind: "mock",
      appId: null,
    } as typeof integrations.$inferSelect,
  );

  const appRows = qaAppIds.map((id, index) => ({
    id,
    name: `QA Fixture ${String(index + 1).padStart(2, "0")}`,
    description: `Deterministic release v2 QA bookmark ${index + 1}`,
    iconUrl: `${fixtureUrl}/media/image.png?app=${index + 1}`,
    href:
      [
        `${fixtureUrl}/api/qa/download/sample.txt`,
        null,
        "/relative/qa-v2",
        "https://example.com/qa-v2-external",
        `${fixtureUrl}/error?status=404`,
        `${fixtureUrl}/iframe?app=6`,
        `${fixtureUrl}/empty`,
        `${fixtureUrl}/slow?ms=200`,
      ][index] ?? null,
    pingUrl: index === 1 ? null : index === 4 ? `${fixtureUrl}/error?status=503` : `${fixtureUrl}/json`,
  }));
  for (const row of appRows) await upsertById(db.query.apps as never, apps as never, row);

  await upsertById(db.query.iconRepositories as never, iconRepositories as never, {
    id: iconRepositoryId,
    slug: "qa-v2/release-fixtures",
  });
  for (const [index, id] of qaIconIds.entries()) {
    await upsertById(db.query.icons as never, icons as never, {
      id,
      name: `qa-v2-icon-${String(index + 1).padStart(2, "0")}`,
      url: `${fixtureUrl}/media/image.png?icon=${index + 1}`,
      checksum: `qa-v2-checksum-${String(index + 1).padStart(2, "0")}`,
      iconRepositoryId,
    });
  }

  const definition = customWidgetDefinitionSchema.parse({
    $schema: "homarr-custom-widget-v2",
    name: "Release v2 QA fixture",
    description: "Credential-free deterministic Custom JSX fixture for release v2 browser QA.",
    sources: {
      default: { name: "QA fixture", baseUrl: fixtureUrl, networkScope: "loopback", auth: "none" },
    },
    requests: { fixture: { path: "/api/qa/custom-widget", cacheSeconds: 0 } },
    options: {},
    template: `<Stack p="md" gap="sm" h="100%"><Group justify="space-between"><Title order={3}>{data.fixture?.title ?? "Release v2 QA"}</Title><Badge color={status.fixture?.ok ? "green" : "gray"}>{data.fixture?.status ?? "loading"}</Badge></Group>{status.fixture?.loading ? <Skeleton height={80} /> : status.fixture?.error ? <Alert color="red" title="Fixture failed">{status.fixture.error}<RefreshButton /></Alert> : <Stack gap="xs">{(data.fixture?.items ?? []).map(item => <Paper key={item.id} withBorder p="xs"><Group justify="space-between"><Text>{item.label}</Text><Text fw={700}>{item.value}</Text></Group></Paper>)}</Stack>}</Stack>`,
  });
  const missingSecretDefinition = customWidgetDefinitionSchema.parse({
    ...definition,
    name: "Release v2 QA missing secret",
    description: "Valid bearer-auth definition intentionally stored without a secret.",
    sources: {
      default: { name: "QA protected fixture", baseUrl: fixtureUrl, networkScope: "loopback", auth: "bearer" },
    },
  });
  const definitions = [
    { id: customDefinitionId, definition, enabled: true },
    { id: disabledCustomDefinitionId, definition: { ...definition, name: "Release v2 QA disabled" }, enabled: false },
    { id: missingSecretCustomDefinitionId, definition: missingSecretDefinition, enabled: true },
  ];
  for (const row of definitions) {
    await upsertById(
      db.query.customWidgetDefinitions as never,
      customWidgetDefinitions as never,
      {
        id: row.id,
        name: row.definition.name,
        description: row.definition.description ?? null,
        iconUrl: null,
        sources: stringify(row.definition.sources),
        requests: stringify(row.definition.requests),
        options: stringify(row.definition.options),
        template: row.definition.template,
        enabled: row.enabled,
        createdAt: new Date(0),
        updatedAt: new Date(0),
        creatorId: userId("avery-admin"),
      } as typeof customWidgetDefinitions.$inferSelect,
    );
  }
};

const sourceOptionsByKindAsync = async () => {
  let sourceBoard = await db.query.boards.findFirst({ where: eq(boards.name, "default"), with: { items: true } });
  sourceBoard ??= await db.query.boards.findFirst({ where: eq(boards.name, "dashboard"), with: { items: true } });
  if (!sourceBoard) throw new Error("Production seed did not create a widget gallery board");
  const result = new Map<WidgetKind, string>();
  for (const kind of widgetKinds) {
    const source = sourceBoard.items.find((item) => item.kind === kind);
    result.set(kind, source?.options ?? emptySuperJSON);
  }
  result.set("app", stringify({ appId: qaAppIds[0], openInNewTab: true, showTitle: true, pingEnabled: false }));
  result.set("bookmarks", stringify({ title: "QA bookmarks", layout: "grid", items: qaAppIds, openNewTab: true }));
  result.set(
    "customApi",
    stringify({ definitionId: customDefinitionId, configuration: {}, configurationVersion: 1, refreshInterval: 1 }),
  );
  return result;
};

const boardLayouts = (board: BoardDefinition) => board.layouts ?? defaultLayouts;

const emptySectionOffset = (sectionHandle: string) => {
  if (sectionHandle === "left") return -1;
  if (sectionHandle === "right") return 1;
  return 0;
};

const mainLaneColumnCount = (layout: LayoutDefinition) => getBoardLaneColumnCount(layout, "main");

const sectionColumnCount = (layout: LayoutDefinition, sectionHandle: string) => {
  if (["root", "left", "right"].includes(sectionHandle)) {
    return getBoardLaneColumnCount(layout, getRootSectionLane(emptySectionOffset(sectionHandle)));
  }
  const mainColumns = mainLaneColumnCount(layout);
  if (sectionHandle === "overflow") return Math.min(mainColumns, 6);
  if (sectionHandle === "level-1") return mainColumns;
  if (sectionHandle === "level-2") return Math.max(1, mainColumns - 1);
  if (sectionHandle === "level-3") return Math.max(1, mainColumns - 2);
  if (sectionHandle.startsWith("sibling-")) return Math.min(mainColumns, 2);
  throw new Error(`Unknown QA section handle: ${sectionHandle}`);
};

const resolveItemSectionHandle = (layout: LayoutDefinition, requestedHandle: string) => {
  if (!["left", "right"].includes(requestedHandle)) return requestedHandle;
  if (sectionColumnCount(layout, requestedHandle) > 0) return requestedHandle;
  return "root";
};

const packPositions = (itemDefinitions: ItemDefinition[], board: BoardDefinition): Position[] => {
  return boardLayouts(board).flatMap((layout) => {
    const cursors = new Map<string, { xOffset: number; yOffset: number; rowHeight: number }>();
    return itemDefinitions.map((item) => {
      const sectionHandle = resolveItemSectionHandle(layout, item.sectionHandle ?? "root");
      const columnCount = sectionColumnCount(layout, sectionHandle);
      const width = Math.min(item.width, columnCount);
      const cursor = cursors.get(sectionHandle) ?? { xOffset: 0, yOffset: 0, rowHeight: 0 };
      if (cursor.xOffset + width > columnCount) {
        cursor.xOffset = 0;
        cursor.yOffset += cursor.rowHeight;
        cursor.rowHeight = 0;
      }
      const position = {
        boardHandle: item.boardHandle,
        itemHandle: item.handle,
        layoutHandle: layout.handle,
        sectionHandle,
        xOffset: cursor.xOffset,
        yOffset: cursor.yOffset,
        width,
        height: item.height,
      };
      cursor.xOffset += width;
      cursor.rowHeight = Math.max(cursor.rowHeight, item.height);
      cursors.set(sectionHandle, cursor);
      return position;
    });
  });
};

const denseCollisionPlacementGeometry = (columnCount: number) => {
  if (columnCount < 3) throw new Error("The dense collision fixture requires at least three columns");
  if (columnCount === 3) {
    return [
      { xOffset: 0, yOffset: 0, width: 1, height: 2 },
      { xOffset: 1, yOffset: 0, width: 2, height: 1 },
      { xOffset: 1, yOffset: 1, width: 1, height: 1 },
      { xOffset: 0, yOffset: 2, width: 2, height: 1 },
      { xOffset: 2, yOffset: 2, width: 1, height: 2 },
      { xOffset: 0, yOffset: 3, width: 1, height: 1 },
      { xOffset: 0, yOffset: 4, width: 3, height: 1 },
      { xOffset: 0, yOffset: 5, width: 1, height: 2 },
      { xOffset: 1, yOffset: 5, width: 1, height: 1 },
      { xOffset: 2, yOffset: 5, width: 1, height: 2 },
      { xOffset: 1, yOffset: 6, width: 1, height: 1 },
      { xOffset: 0, yOffset: 7, width: 2, height: 2 },
    ];
  }

  const laneBoundary = (lane: number) => Math.floor((columnCount * lane) / 4);
  const fromLanes = (startLane: number, endLane: number, yOffset: number, height: number) => ({
    xOffset: laneBoundary(startLane),
    yOffset,
    width: laneBoundary(endLane) - laneBoundary(startLane),
    height,
  });
  return [
    fromLanes(0, 1, 0, 2),
    fromLanes(1, 3, 0, 1),
    fromLanes(3, 4, 0, 2),
    fromLanes(1, 2, 1, 1),
    fromLanes(0, 2, 2, 1),
    fromLanes(2, 3, 2, 2),
    fromLanes(3, 4, 2, 1),
    fromLanes(0, 1, 3, 2),
    fromLanes(1, 2, 3, 1),
    fromLanes(3, 4, 3, 2),
    fromLanes(1, 3, 4, 1),
    fromLanes(0, 3, 5, 2),
  ];
};

const itemForKind = (
  boardHandle: string,
  handle: string,
  kind: WidgetKind,
  optionsByKind: Map<WidgetKind, string>,
): ItemDefinition => {
  const defaultConfig = getDefaultWidgetConfig(kind);
  let options = optionsByKind.get(kind) ?? emptySuperJSON;
  if (options === emptySuperJSON && defaultConfig.options) options = stringify(defaultConfig.options);
  return {
    boardHandle,
    handle,
    kind,
    options,
    width: defaultConfig.width,
    height: defaultConfig.height,
  };
};

const buildItems = (optionsByKind: Map<WidgetKind, string>) => {
  const result = new Map<string, ItemDefinition[]>();
  for (const board of homeBoards) {
    result.set(
      board.handle,
      (["clock", "weather", "bookmarks"] as WidgetKind[]).map((kind, index) =>
        itemForKind(board.handle, `${kind}-${index + 1}`, kind, optionsByKind),
      ),
    );
  }
  result.set(
    "grid-24",
    Array.from({ length: 24 }, (_, index) => ({
      ...itemForKind("grid-24", `cell-${String(index + 1).padStart(2, "0")}`, "clock", optionsByKind),
      width: index + 1,
      height: (index % 6) + 1,
    })),
  );
  result.set("scroll", [
    ...Array.from({ length: 30 }, (_, index) => ({
      ...itemForKind(
        "scroll",
        `row-${String(index + 1).padStart(2, "0")}`,
        index % 2 === 0 ? "notebook" : "weather",
        optionsByKind,
      ),
      sectionHandle: ["left", "root", "right"][index % 3],
    })),
    ...Array.from({ length: 12 }, (_, index) => ({
      ...itemForKind("scroll", `overflow-${index + 1}`, index % 2 === 0 ? "clock" : "app", optionsByKind),
      sectionHandle: "overflow",
    })),
  ]);
  result.set(
    "dense-collisions",
    Array.from({ length: 12 }, (_, index) =>
      itemForKind("dense-collisions", `collision-${index + 1}`, "clock", optionsByKind),
    ),
  );
  result.set("nested-containers", [
    ...(["clock", "weather", "bookmarks"] as WidgetKind[]).map((kind, index) => ({
      ...itemForKind("nested-containers", `nested-${index + 1}`, kind, optionsByKind),
      sectionHandle: "level-3",
    })),
    ...(["notebook", "app", "countdown"] as WidgetKind[]).map((kind, index) => ({
      ...itemForKind("nested-containers", `sibling-${index + 1}`, kind, optionsByKind),
      sectionHandle: `sibling-${index + 1}`,
    })),
    itemForKind("nested-containers", "root-zone", "clock", optionsByKind),
  ]);
  result.set(
    "layout-boundaries",
    widgetKinds
      .slice(0, 16)
      .map((kind, index) => itemForKind("layout-boundaries", `boundary-${index + 1}`, kind, optionsByKind)),
  );
  result.set("icons-bookmarks", [
    {
      ...itemForKind("icons-bookmarks", "bookmarks-grid", "bookmarks", optionsByKind),
      options: stringify({ title: "QA grid", layout: "grid", items: qaAppIds, openNewTab: true }),
    },
    {
      ...itemForKind("icons-bookmarks", "bookmarks-list", "bookmarks", optionsByKind),
      options: stringify({ title: "QA list", layout: "column", items: qaAppIds, openNewTab: false }),
    },
    {
      ...itemForKind("icons-bookmarks", "bookmarks-empty-title", "bookmarks", optionsByKind),
      options: stringify({ title: "", layout: "icons", items: qaAppIds.slice(0, 4), openNewTab: true }),
    },
    {
      ...itemForKind("icons-bookmarks", "bookmarks-custom-title", "bookmarks", optionsByKind),
      options: stringify({
        title: "External and relative",
        layout: "row",
        items: qaAppIds.slice(2, 6),
        openNewTab: false,
      }),
    },
    ...qaAppIds.slice(0, 6).map((id, index) => ({
      ...itemForKind("icons-bookmarks", `app-${index + 1}`, "app", optionsByKind),
      options: stringify({
        appId: id,
        openInNewTab: index % 2 === 0,
        showTitle: index >= 3,
        pingEnabled: index !== 1,
      }),
    })),
  ]);
  widgetGalleryGroups.forEach((group, groupIndex) => {
    const boardHandle = `widgets-${String(groupIndex + 1).padStart(2, "0")}`;
    result.set(
      boardHandle,
      group.map((kind, kindIndex) =>
        itemForKind(boardHandle, `${String(kindIndex + 1).padStart(2, "0")}-${kind}`, kind, optionsByKind),
      ),
    );
  });
  result.set("custom-widget-assistant", [
    {
      ...itemForKind("custom-widget-assistant", "custom-compact", "customApi", optionsByKind),
      width: 3,
      height: 2,
    },
    {
      ...itemForKind("custom-widget-assistant", "custom-standard-disabled", "customApi", optionsByKind),
      options: stringify({
        definitionId: disabledCustomDefinitionId,
        configuration: {},
        configurationVersion: 1,
        refreshInterval: 1,
      }),
      width: 6,
      height: 4,
    },
    {
      ...itemForKind("custom-widget-assistant", "custom-wide-missing-secret", "customApi", optionsByKind),
      options: stringify({
        definitionId: missingSecretCustomDefinitionId,
        configuration: {},
        configurationVersion: 1,
        refreshInterval: 1,
      }),
      width: 12,
      height: 4,
    },
    {
      ...itemForKind("custom-widget-assistant", "custom-invalid-option", "customApi", optionsByKind),
      options: stringify({
        definitionId: customDefinitionId,
        configuration: { unsupportedOption: "qa-invalid" },
        configurationVersion: 1,
        refreshInterval: 1,
      }),
      width: 6,
      height: 3,
    },
    { ...itemForKind("custom-widget-assistant", "assistant-compact", "assistant", optionsByKind), width: 3, height: 2 },
    {
      ...itemForKind("custom-widget-assistant", "assistant-standard", "assistant", optionsByKind),
      width: 6,
      height: 4,
    },
    { ...itemForKind("custom-widget-assistant", "assistant-wide", "assistant", optionsByKind), width: 12, height: 4 },
  ]);
  result.set("permissions-public", [
    itemForKind("permissions-public", "clock", "clock", optionsByKind),
    itemForKind("permissions-public", "bookmarks", "bookmarks", optionsByKind),
  ]);
  result.set("download-upload", [
    { ...itemForKind("download-upload", "downloads", "downloads", optionsByKind), width: 6, height: 3 },
    {
      ...itemForKind("download-upload", "download-link", "app", optionsByKind),
      options: stringify({ appId: qaAppIds[0], openInNewTab: true, showTitle: true, pingEnabled: false }),
    },
  ]);
  return result;
};

const assertSeededGeometryAsync = async () => {
  const geometryLayouts = await db
    .select({
      id: layouts.id,
      boardId: layouts.boardId,
      columnCount: layouts.columnCount,
      leftGutterColumnCount: layouts.leftGutterColumnCount,
      rightGutterColumnCount: layouts.rightGutterColumnCount,
      role: layouts.role,
    })
    .from(layouts)
    .where(inArray(layouts.id, qaLayoutIds));
  const geometrySections = await db
    .select({
      id: sections.id,
      boardId: sections.boardId,
      kind: sections.kind,
      xOffset: sections.xOffset,
    })
    .from(sections)
    .where(inArray(sections.boardId, qaBoardIds));
  const geometrySectionLayouts = await db
    .select({
      sectionId: sectionLayouts.sectionId,
      layoutId: sectionLayouts.layoutId,
      parentSectionId: sectionLayouts.parentSectionId,
      xOffset: sectionLayouts.xOffset,
      yOffset: sectionLayouts.yOffset,
      width: sectionLayouts.width,
      height: sectionLayouts.height,
    })
    .from(sectionLayouts)
    .where(inArray(sectionLayouts.layoutId, qaLayoutIds));
  const geometryItems = await db
    .select({ id: items.id, boardId: items.boardId })
    .from(items)
    .where(inArray(items.boardId, qaBoardIds));
  const itemBoardById = new Map(geometryItems.map((item) => [item.id, item.boardId]));
  const geometryItemLayouts = await db
    .select({
      itemId: itemLayouts.itemId,
      sectionId: itemLayouts.sectionId,
      layoutId: itemLayouts.layoutId,
      xOffset: itemLayouts.xOffset,
      yOffset: itemLayouts.yOffset,
      width: itemLayouts.width,
      height: itemLayouts.height,
    })
    .from(itemLayouts)
    .where(inArray(itemLayouts.layoutId, qaLayoutIds));
  const geometryErrors = findFixtureGeometryErrors({
    layouts: geometryLayouts,
    sections: geometrySections,
    sectionLayouts: geometrySectionLayouts,
    itemLayouts: geometryItemLayouts.map((itemLayout) => ({
      ...itemLayout,
      boardId: itemBoardById.get(itemLayout.itemId) ?? "<unknown>",
    })),
  });
  if (geometryErrors.length > 0) {
    throw new Error(`Generated QA fixture geometry is invalid: ${geometryErrors.join("; ")}`);
  }
};

const seedBoardsAsync = async (optionsByKind: Map<WidgetKind, string>) => {
  for (const board of qaBoards) {
    const name = boardName(board.handle);
    await upsertById(
      db.query.boards as never,
      boards as never,
      {
        id: boardId(board.handle),
        name,
        isPublic: board.isPublic ?? false,
        creatorId: userId(board.ownerHandle),
        pageTitle: board.label,
        metaTitle: board.label,
        logoImageUrl: null,
        faviconImageUrl: null,
        backgroundImageUrl: null,
        backgroundImageAttachment: "fixed",
        backgroundImageRepeat: "no-repeat",
        backgroundImageSize: "cover",
        primaryColor: "#748ffc",
        secondaryColor: "#22b8cf",
        opacity: 95,
        customCss: null,
        iconColor: null,
        itemRadius: "md",
        disableStatus: false,
      } as typeof boards.$inferSelect,
    );
  }

  await db.delete(items).where(inArray(items.boardId, qaBoardIds));
  await db.delete(sections).where(inArray(sections.boardId, qaBoardIds));
  await db.delete(layouts).where(inArray(layouts.boardId, qaBoardIds));

  const allItems = buildItems(optionsByKind);
  const positionRows: Position[] = [];
  for (const board of qaBoards) {
    await db.insert(layouts).values(
      boardLayouts(board).map((layout) => ({
        id: layoutId(board.handle, layout.handle),
        name: layout.name,
        boardId: boardId(board.handle),
        columnCount: layout.columnCount,
        leftGutterColumnCount: layout.leftGutterColumnCount ?? 0,
        rightGutterColumnCount: layout.rightGutterColumnCount ?? 0,
        breakpoint: layout.breakpoint,
        role: layout.role,
      })),
    );
    await db.insert(sections).values({
      id: sectionId(board.handle, "root"),
      boardId: boardId(board.handle),
      kind: "empty",
      xOffset: 0,
      yOffset: 0,
      name: null,
      options: emptySuperJSON,
    });
    if (board.handle === "scroll") {
      await db.insert(sections).values([
        {
          id: sectionId(board.handle, "left"),
          boardId: boardId(board.handle),
          kind: "empty",
          xOffset: -1,
          yOffset: 0,
          name: "Left rail",
          options: emptySuperJSON,
        },
        {
          id: sectionId(board.handle, "right"),
          boardId: boardId(board.handle),
          kind: "empty",
          xOffset: 1,
          yOffset: 0,
          name: "Right rail",
          options: emptySuperJSON,
        },
        {
          id: sectionId(board.handle, "overflow"),
          boardId: boardId(board.handle),
          kind: "container",
          xOffset: null,
          yOffset: null,
          name: "Scrollable container",
          options: stringify({ showLabel: true, collapsible: true, scrollable: true, showOpenAll: true }),
        },
      ]);
      await db.insert(sectionLayouts).values(
        boardLayouts(board).map((layout) => ({
          sectionId: sectionId(board.handle, "overflow"),
          layoutId: layoutId(board.handle, layout.handle),
          parentSectionId: sectionId(board.handle, "root"),
          xOffset: 0,
          yOffset: 0,
          width: sectionColumnCount(layout, "overflow"),
          height: 4,
        })),
      );
    }
    if (board.handle === "nested-containers") {
      const containerHandles = ["level-1", "level-2", "level-3", "sibling-1", "sibling-2", "sibling-3"];
      await db.insert(sections).values(
        containerHandles.map((handle, index) => ({
          id: sectionId(board.handle, handle),
          boardId: boardId(board.handle),
          kind: "container" as const,
          xOffset: null,
          yOffset: null,
          name: index < 3 ? `Nested level ${index + 1}` : `Sibling zone ${index - 2}`,
          options: stringify({
            showLabel: index !== 4,
            collapsible: index !== 5,
            scrollable: index === 2 || index === 4,
            showOpenAll: index === 3,
          }),
        })),
      );
      await db.insert(sectionLayouts).values(
        boardLayouts(board).flatMap((layout) =>
          containerHandles.map((handle, index) => {
            const width = sectionColumnCount(layout, handle);
            const parentHandle = index === 0 ? "root" : index < 3 ? `level-${index}` : "root";
            const parentColumns = sectionColumnCount(layout, parentHandle);
            return {
              sectionId: sectionId(board.handle, handle),
              layoutId: layoutId(board.handle, layout.handle),
              parentSectionId: sectionId(board.handle, parentHandle),
              xOffset: index < 3 ? 0 : Math.max(0, Math.min((index - 3) * 2, parentColumns - width)),
              yOffset: index < 3 ? 0 : 7,
              width,
              height: index < 3 ? 6 - index : 3,
            };
          }),
        ),
      );
    }
    const boardItems = allItems.get(board.handle) ?? [];
    if (boardItems.length > 0) {
      await db.insert(items).values(
        boardItems.map((item) => ({
          id: itemId(board.handle, item.handle),
          boardId: boardId(board.handle),
          kind: item.kind,
          options: item.options,
          advancedOptions: item.advancedOptions ?? emptySuperJSON,
        })),
      );
    }
    if (board.handle === "dense-collisions") {
      positionRows.push(
        ...boardLayouts(board).flatMap((layout) => {
          const placements = denseCollisionPlacementGeometry(mainLaneColumnCount(layout));
          if (placements.length !== boardItems.length) {
            throw new Error(`Dense collision placement count does not match the item count in layout ${layout.handle}`);
          }
          return boardItems.map((item, index) => {
            const placement = placements.at(index);
            if (!placement) throw new Error(`Missing dense collision placement ${index + 1}`);
            return {
              boardHandle: board.handle,
              itemHandle: item.handle,
              layoutHandle: layout.handle,
              sectionHandle: "root",
              ...placement,
            };
          });
        }),
      );
    } else {
      positionRows.push(...packPositions(boardItems, board));
    }
  }

  if (positionRows.length > 0) {
    await db.insert(itemLayouts).values(
      positionRows.map((position) => {
        return {
          itemId: itemId(position.boardHandle, position.itemHandle),
          sectionId: sectionId(position.boardHandle, position.sectionHandle),
          layoutId: layoutId(position.boardHandle, position.layoutHandle),
          xOffset: position.xOffset,
          yOffset: position.yOffset,
          width: position.width,
          height: position.height,
        };
      }),
    );
  }
  await assertSeededGeometryAsync();

  const mockKinds = new Set(getWidgetKindsForIntegration("mock"));
  const mockItemIds = [...allItems.entries()].flatMap(([boardHandle, definitions]) =>
    definitions.filter((item) => mockKinds.has(item.kind)).map((item) => itemId(boardHandle, item.handle)),
  );
  if (mockItemIds.length > 0) {
    await db
      .insert(integrationItems)
      .values(mockItemIds.map((currentItemId) => ({ itemId: currentItemId, integrationId: mockIntegrationId })));
  }

  await db.delete(boardUserPermissions).where(inArray(boardUserPermissions.boardId, qaBoardIds));
  await db.delete(boardGroupPermissions).where(inArray(boardGroupPermissions.boardId, qaBoardIds));
  const permissionRows: Array<{ boardId: string; userId: string; permission: BoardPermission }> = [];
  const personaByName = new Map(personas.map((persona) => [persona.name, persona]));
  const boardByName = new Map(sharedBoards.map((board) => [boardName(board.handle), board]));
  for (const [personaName, boardAccess] of Object.entries(expectedBoardAccess)) {
    const persona = personaByName.get(personaName);
    if (!persona) throw new Error(`Unknown QA persona in board access assignment: ${personaName}`);
    for (const [name, permission] of Object.entries(boardAccess)) {
      const board = boardByName.get(name);
      if (!board) throw new Error(`Unknown QA board in access assignment: ${name}`);
      if (permission === "none" || persona.permissions.includes("admin") || board.ownerHandle === persona.handle)
        continue;
      permissionRows.push({ boardId: boardId(board.handle), userId: userId(persona.handle), permission });
    }
  }
  if (permissionRows.length > 0) await db.insert(boardUserPermissions).values(permissionRows);

  for (const persona of personas) {
    await db
      .update(users)
      .set({ homeBoardId: boardId(`home-${persona.handle}`), mobileHomeBoardId: boardId(`home-${persona.handle}`) })
      .where(eq(users.id, userId(persona.handle)));
  }
};

const createManifest = (
  profile: Profile,
  candidateSha: string,
  fixtureUrl: string,
  seeded: boolean,
  profileFlags: ReleaseV2QaProfileFlags,
) => {
  const allItems = seeded ? buildItems(new Map(widgetKinds.map((kind) => [kind, emptySuperJSON]))) : new Map();
  const boardEntries = seeded
    ? qaBoards.map((board) => ({
        id: boardId(board.handle),
        handle: board.handle,
        name: boardName(board.handle),
        label: board.label,
        owner: board.ownerHandle,
        isPublic: board.isPublic ?? false,
        layouts: boardLayouts(board).map((layout) => layoutId(board.handle, layout.handle)),
        itemCount: allItems.get(board.handle)?.length ?? 0,
        flags: {
          home: board.handle.startsWith("home-"),
          shared: !board.handle.startsWith("home-"),
          collisionFixture: board.handle === "dense-collisions",
          nestedContainers: board.handle === "nested-containers",
          scrollableContainer: board.handle === "scroll",
          leftRightRails: board.handle === "scroll",
        },
      }))
    : [];
  const layoutEntries = seeded
    ? qaBoards.flatMap((board) =>
        boardLayouts(board).map((layout) => ({
          id: layoutId(board.handle, layout.handle),
          boardId: boardId(board.handle),
          handle: layout.handle,
          role: layout.role,
          breakpoint: layout.breakpoint,
          columnCount: layout.columnCount,
          leftGutterColumnCount: layout.leftGutterColumnCount ?? 0,
          rightGutterColumnCount: layout.rightGutterColumnCount ?? 0,
        })),
      )
    : [];
  return {
    schemaVersion: 1,
    candidateSha,
    profile,
    personas: seeded
      ? personas.map((persona) => ({
          id: userId(persona.handle),
          handle: persona.handle,
          name: persona.name,
          loginUsername: persona.handle,
          email: `qa-v2-${persona.handle}@example.test`,
          homeBoardId: boardId(`home-${persona.handle}`),
          permissions: persona.permissions,
        }))
      : [],
    boards: boardEntries,
    layouts: layoutEntries,
    expectedBoardPermissions: {
      "rowan-owner": "full",
      "eden-editor": "modify",
      "vivian-viewer": "view",
      "nolan-outsider": "none",
    },
    packetBoardAccess: releaseV2QaPacketBoardAccess,
    expectedBoardAccess: seeded ? expectedBoardAccess : {},
    counts: {
      personas: seeded ? personas.length : 0,
      boards: boardEntries.length,
      homeBoards: seeded ? homeBoards.length : 0,
      sharedBoards: seeded ? sharedBoards.length : 0,
      layouts: layoutEntries.length,
      items: seeded ? [...allItems.values()].reduce((sum, rows) => sum + rows.length, 0) : 0,
      widgetKinds: seeded ? widgetKinds.length : 0,
      apps: seeded ? qaAppIds.length : 0,
      icons: seeded ? qaIconIds.length : 0,
      customWidgets: seeded ? customDefinitionIds.length : 0,
    },
    customWidgetVariants: seeded
      ? {
          enabled: customDefinitionId,
          disabled: disabledCustomDefinitionId,
          missingSecret: missingSecretCustomDefinitionId,
          invalidOptionItem: itemId("custom-widget-assistant", "custom-invalid-option"),
          sizes: ["compact", "standard", "wide"],
        }
      : null,
    limitations: ["No plaintext Custom Widget secret is seeded; the missing-secret state is intentional."],
    flags: {
      credentialsCreated: seeded,
      readOnly: profile === "main-readonly",
      onboardingFresh: profile === "onboarding-fresh",
      degraded: profile === "degraded",
      mockIntegration: seeded,
      allWidgetKindsCovered: seeded,
      demoMode: profileFlags.demoMode,
      demoReadOnly: profileFlags.demoReadOnly,
      unsafeMockIntegration: profileFlags.unsafeMockIntegration,
      fixtureOrigin: new URL(fixtureUrl).origin,
    },
  };
};

const main = async () => {
  const options = parseCli();
  validateQaBoardDefinitions();
  const coverageManifest = JSON.parse(
    await readFile(resolve(repoRoot, "qa/release-v2/coverage-manifest.json"), "utf8"),
  ) as ReleaseV2QaCoverageAccessManifest;
  const accessErrors = validateReleaseV2QaPacketBoardAccess(coverageManifest, releaseV2QaPacketBoardAccess);
  if (accessErrors.length > 0) throw new Error(`Invalid QA packet board access: ${accessErrors.join("; ")}`);
  const galleryKinds = widgetGalleryGroups.flat();
  if (
    galleryKinds.length !== widgetKinds.length ||
    new Set(galleryKinds).size !== widgetKinds.length ||
    widgetKinds.some((kind) => !galleryKinds.includes(kind))
  ) {
    throw new Error("Widget gallery groups must contain every canonical widget kind exactly once");
  }
  const profile = options.profile ?? (process.env.QA_PROFILE as Profile | undefined);
  if (!profile || !profiles.includes(profile)) throw new Error(`QA_PROFILE must be one of: ${profiles.join(", ")}`);
  const profileFlags = assertReleaseV2QaProfileEnvironment(profile, process.env);
  const checkoutSha = resolveCheckoutCandidateSha(repoRoot);
  const suppliedCandidateSha = options.candidateSha ?? process.env.QA_CANDIDATE_SHA?.trim();
  const candidateSha = suppliedCandidateSha ? validateCandidateSha(suppliedCandidateSha, checkoutSha) : checkoutSha;
  const fixtureUrl = validateFixtureUrl(requiredEnv("QA_FIXTURE_URL"));
  const manifestPath = resolveManifestPath(options);

  const populated = profile !== "onboarding-fresh";
  await runInTransactionAsync(async () => {
    if (options.reset) await resetQaRowsAsync();
    await setOnboardingStepAsync(profile);
    if (populated) {
      const password = await requiredQaPassword();
      const passwordHash = await resolvePasswordHashAsync(password);
      await seedPersonasAsync(passwordHash);
      await seedGlobalFixturesAsync(fixtureUrl);
      const optionsByKind = await sourceOptionsByKindAsync();
      await seedBoardsAsync(optionsByKind);
      return;
    }
    await resetQaRowsAsync();
  });

  const manifest = createManifest(profile, candidateSha, fixtureUrl, populated, profileFlags);
  await mkdir(dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  console.log(`Release v2 QA seed complete for profile '${profile}' (${manifest.counts.boards} QA boards)`);
  console.log(`Fixture manifest written to ${manifestPath}`);
};

const closeDatabaseAsync = async () => {
  const client = rootDb.$client as unknown as {
    close?: () => void;
    end?: () => Promise<void> | void;
  };
  if (typeof client.close === "function") {
    client.close();
    return;
  }
  if (typeof client.end === "function") await client.end();
};

try {
  await main();
} catch (error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown seed failure";
  console.error(`Release v2 QA seed failed: ${message}`);
  process.exitCode = 1;
} finally {
  await closeDatabaseAsync();
}

process.exit(process.exitCode ?? 0);
