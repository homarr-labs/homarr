import { existsSync } from "node:fs";
import { readFile, readdir, realpath } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import type { LayoutRole } from "../../packages/definitions/index.ts";
import { boardNameSchema } from "../../packages/validation/src/board.ts";
import { findFixtureGeometryErrors } from "./geometry.mts";
import {
  getReleaseV2QaExpectedBoardAccess,
  releaseV2QaPacketBoardAccess,
  validateReleaseV2QaPacketBoardAccess,
} from "./permissions.mts";
import type {
  ReleaseV2QaBoardAccess,
  ReleaseV2QaCoverageAccessManifest,
  ReleaseV2QaPacketBoardAccess,
} from "./permissions.mts";
import { resolveCheckoutCandidateSha } from "./provenance.mts";
import { collectHumanWidgetStatusErrors, normalizeReportMetadata } from "./report-integrity.mts";
import { assertSafeReportPath, readSafeReportFile, validateResolvedArtifactPath } from "./report-path-integrity.mts";
import { createCandidateBuildPaths, validateRuntimeExecutionContract } from "./runtime.mts";

import { assertSafeRunRoot, isPathWithin, validateFixtureUrl } from "./safety.mts";

type Status = "passed" | "failed" | "blocked" | "not-reached";
type Severity = "P0" | "P1" | "P2" | "P3";

interface Finding {
  severity: Severity;
  title: string;
  caseIds?: string[];
  evidence?: string[];
}

interface Packet {
  id: string;
  wave: string;
  prRefs: number[];
  personas: string[];
  boards: string[];
  profiles: string[];
  viewports: string[];
  zooms: number[];
  inputs: string[];
  widgetKinds?: string[];
  cases: string[];
}

interface Manifest {
  statuses: Status[];
  pullRequests: { number: number }[];
  viewports: { id: string }[];
  zooms: number[];
  inputs: string[];
  profiles: { id: string }[];
  personas: string[];
  boards: { id: string; handle: string }[];
  wavePacketCounts: Record<string, number>;
  caseDimensions: Record<string, { id: string; expected: string }[]>;
  packets: Packet[];
}

interface ReportMetadata {
  packetId: string;
  status: Status;
  caseStatuses: Record<string, Status>;
  execution: {
    candidateSha: string | null;
    url: string | null;
    actualPort: number | null;
    runtimeProfile: string | null;
    runtimeFlags: string[];
    persona: string | null;
    sessionId: string | null;
    timestamp: string | null;
    viewport: string | null;
    input: string | null;
    zoom: number | null;
  };
  findings: Finding[];
  artifacts: string[];
  widgetChecks: {
    widgetKind: string;
    viewport: string;
    sizeRequirement: string;
    status: Status;
  }[];
  performance: {
    measurements: {
      name: string;
      value: number | null;
      unit: string;
      threshold: string;
      status: Status;
      evidence: string[];
    }[];
    limitations: string[];
  };
  independentReproductions: {
    findingFingerprint: string;
    agentId: string;
    outcome: "reproduced" | "not-reproduced" | "blocked" | "not-reached";
    evidence: string[];
    notes: string;
  }[];
  notes: string;
}

interface Ledger {
  packetStatuses: Record<string, { status: Status; cases: Record<string, Status> }>;
}

interface RuntimeManifest {
  schemaVersion: number;
  runId: string;
  status: "running" | "stopped";
  candidateSha: string;
  slot: number;
  profile: string;
  repoRoot: string;
  runRoot: string;
  slotDir: string;
  dbPath: string;
  trustedCertificatePath: string;
  fixtureManifestPath: string;
  nextDistDir: string;
  url: string;
  fixtureUrl: string;
  ports: { app: number; fixture: number; redis: number };
  flags: { demoMode: boolean; demoReadOnly: boolean; unsafeMockIntegration: boolean };
  runtimeMode: string;
  bundler: string;
  watcher: unknown;
  build: { candidateSha: string; serverPath: string };
  processes: {
    app: { pid: number; logPath: string };
    fixture: { pid: number; logPath: string };
  };
}

interface FixtureManifest {
  schemaVersion: number;
  candidateSha: string;
  profile: string;
  personas: { id: string; handle: string; name: string; loginUsername: string }[];
  boards: { id: string; handle: string; name: string; label: string; layouts: string[]; flags: { shared: boolean } }[];
  layouts: { id: string; boardId: string; columnCount: number }[];
  expectedBoardPermissions: Record<string, string>;
  packetBoardAccess: ReleaseV2QaPacketBoardAccess;
  expectedBoardAccess: Record<string, Record<string, ReleaseV2QaBoardAccess>>;
  counts: Record<string, number>;
  flags: {
    demoMode: boolean;
    demoReadOnly: boolean;
    unsafeMockIntegration: boolean;
    allWidgetKindsCovered: boolean;
    fixtureOrigin: string;
  };
}

interface VerifyOptions {
  runRoot?: string;
  manifestPaths: string[];
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const qaRoot = join(repoRoot, "qa/release-v2");
const reportsRoot = join(qaRoot, "reports");
const campaignCandidateSha = resolveCheckoutCandidateSha(repoRoot);
const exhaustiveSizeWidgetKinds = new Set([
  "downloads",
  "calendar",
  "mediaServer",
  "mediaRequests-requestList",
  "mediaRequests-requestStats",
  "systemResources",
  "systemDisks",
  "dockerContainers",
  "networkControllerSummary",
  "networkControllerStatus",
  "beszelSystemStats",
  "uptimeKuma",
  "bookmarks",
  "notebook",
  "iframe",
  "customApi",
  "assistant",
]);
const expectedWidgetGroups: Record<string, string[]> = {
  "widgets-01": ["clock", "weather", "airQuality", "countdown", "timer"],
  "widgets-02": ["app", "iframe", "video", "minecraftServerStatus", "stockPrice"],
  "widgets-03": ["notebook", "anchorNote", "bookmarks", "rssFeed", "timetable"],
  "widgets-04": ["downloads", "dockerContainers", "indexerManager", "dnsHoleSummary", "dnsHoleControls"],
  "widgets-05": [
    "smartHome-entityState",
    "smartHome-executeAutomation",
    "healthMonitoring",
    "systemResources",
    "systemDisks",
  ],
  "widgets-06": ["firewall", "notifications", "networkControllerSummary", "networkControllerStatus", "uptimeKuma"],
  "widgets-07": ["beszelSystemTable", "beszelSystemGrid", "beszelAlerts", "beszelSystemStats", "wud"],
  "widgets-08": ["ups", "vpn", "speedtestTracker", "traefik", "umami"],
  "widgets-09": ["calendar", "mediaServer", "mediaRequests-requestList", "mediaRequests-requestStats", "mediaMissing"],
  "widgets-10": ["mediaReleases", "mediaTranscoding", "immich-serverStats", "immich-albumCarousel", "audioStats"],
  "widgets-11": ["paperlessNgx", "patchmon", "bazarr", "tracearr", "releases"],
  "widgets-12": ["coolify", "archiveTeamWarrior", "customApi", "assistant"],
};
const expectedProfileFlags: Record<string, string[]> = {
  "main-writable": ["DEMO_MODE=true", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
  "main-readonly": ["DEMO_MODE=true", "DEMO_READ_ONLY=true", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
  "onboarding-fresh": ["DEMO_MODE=false", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
  degraded: ["DEMO_MODE=true", "DEMO_READ_ONLY=false", "UNSAFE_ENABLE_MOCK_INTEGRATION=true"],
};
const expectedBoardAccess = getReleaseV2QaExpectedBoardAccess(releaseV2QaPacketBoardAccess);
const errors: string[] = [];

const parseOptions = (): VerifyOptions => {
  const args = process.argv.slice(2).filter((argument) => argument !== "--");
  const options: VerifyOptions = { manifestPaths: [] };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = args[index + 1];
    if (argument === "--run-root" && value) {
      options.runRoot = resolve(value);
      index += 1;
      continue;
    }
    if ((argument === "--manifest" || argument === "--runtime-manifest") && value) {
      options.manifestPaths.push(resolve(value));
      index += 1;
      continue;
    }
    throw new Error(`Unknown or incomplete argument: ${argument ?? "<missing>"}`);
  }
  return options;
};

const readJson = async <T,>(path: string): Promise<T> => JSON.parse(await readFile(path, "utf8")) as T;

const sameSet = <T,>(actual: T[], expected: T[]): boolean =>
  actual.length === expected.length && actual.every((value) => expected.includes(value));

const requiredSizeInstruction = (widgetKind: string) => {
  if (exhaustiveSizeWidgetKinds.has(widgetKind)) return "every width 1-24 × every height 1-6";
  return "minimum / canonical / wide / tall / maximum / overflow / behavior-changing thresholds";
};

const duplicateValues = <T,>(values: T[]): T[] => values.filter((value, index) => values.indexOf(value) !== index);

const expandedCases = (manifest: Manifest, packet: Packet): { id: string; expected: string }[] => {
  const dimensions = manifest.caseDimensions[packet.wave] ?? [];
  return packet.cases.flatMap((baseId) =>
    dimensions.map((dimension) => ({ id: `${baseId}-${dimension.id}`, expected: dimension.expected })),
  );
};

const expectedRollup = (statuses: Status[]): Status => {
  if (statuses.includes("failed")) return "failed";
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("not-reached")) return "not-reached";
  return "passed";
};

const parseReportMetadata = (content: string, packetId: string): unknown | undefined => {
  const match = content.match(/<!-- release-v2-qa-report\n([\s\S]*?)\n-->/);
  if (!match?.[1]) {
    errors.push(`${packetId}: report metadata block is missing`);
    return undefined;
  }

  try {
    return JSON.parse(match[1]) as unknown;
  } catch (error) {
    errors.push(`${packetId}: report metadata is invalid JSON (${String(error)})`);
    return undefined;
  }
};

const assertReferences = <T,>(packet: Packet, field: keyof Packet, values: T[], allowed: T[]): void => {
  for (const value of values) {
    if (!allowed.includes(value)) errors.push(`${packet.id}: unknown ${String(field)} value ${String(value)}`);
  }
};

const booleanProfileFlags = (profile: string) => ({
  demoMode: profile !== "onboarding-fresh",
  demoReadOnly: profile === "main-readonly",
  unsafeMockIntegration: true,
});

const validateFixtureEndpoint = async (fixtureUrl: string, label: string) => {
  try {
    const response = await fetch(`${fixtureUrl}/health`, { signal: AbortSignal.timeout(5_000) });
    if (!response.ok) {
      errors.push(`${label}: fixture health returned HTTP ${response.status}`);
      return;
    }
    const body = (await response.json()) as { status?: string; fixture?: string };
    if (body.status !== "ok" || body.fixture !== "release-v2-qa") {
      errors.push(`${label}: fixture health payload is not the release-v2 QA fixture`);
    }
  } catch {
    errors.push(`${label}: fixture health endpoint is unreachable`);
  }
};

const validateFixtureManifest = async (
  fixture: FixtureManifest,
  fixturePath: string,
  sourceWidgetKinds: string[],
  checkEndpoint: boolean,
  expectedSharedBoardNames: Map<string, string>,
) => {
  const label = `fixture manifest ${fixturePath}`;
  if (fixture.schemaVersion !== 1) errors.push(`${label}: unsupported schema version`);
  if (fixture.candidateSha !== campaignCandidateSha) errors.push(`${label}: candidate does not match the campaign`);
  if (!expectedProfileFlags[fixture.profile]) errors.push(`${label}: unknown profile ${fixture.profile}`);
  const expectedFlags = booleanProfileFlags(fixture.profile);
  for (const [flag, expected] of Object.entries(expectedFlags)) {
    if (fixture.flags?.[flag as keyof typeof expectedFlags] !== expected) {
      errors.push(`${label}: ${flag} does not match profile ${fixture.profile}`);
    }
  }

  if (!Array.isArray(fixture.personas) || fixture.counts?.personas !== fixture.personas.length) {
    errors.push(`${label}: persona count does not match the persona manifest`);
  }
  if (!Array.isArray(fixture.boards) || fixture.counts?.boards !== fixture.boards.length) {
    errors.push(`${label}: board count does not match the board manifest`);
  }
  if (!Array.isArray(fixture.layouts) || fixture.counts?.layouts !== fixture.layouts.length) {
    errors.push(`${label}: layout count does not match the layout manifest`);
  }
  if (duplicateValues((fixture.personas ?? []).map((persona) => persona.id)).length > 0) {
    errors.push(`${label}: duplicate persona IDs`);
  }
  if (duplicateValues((fixture.personas ?? []).map((persona) => persona.loginUsername)).length > 0) {
    errors.push(`${label}: duplicate persona login usernames`);
  }
  if (duplicateValues((fixture.boards ?? []).map((board) => board.id)).length > 0) {
    errors.push(`${label}: duplicate board IDs`);
  }
  if (duplicateValues((fixture.boards ?? []).map((board) => board.name)).length > 0) {
    errors.push(`${label}: duplicate board names`);
  }
  if (duplicateValues((fixture.layouts ?? []).map((layout) => layout.id)).length > 0) {
    errors.push(`${label}: duplicate layout IDs`);
  }

  const boardIds = new Set((fixture.boards ?? []).map((board) => board.id));
  const layoutIds = new Set((fixture.layouts ?? []).map((layout) => layout.id));
  for (const layout of fixture.layouts ?? []) {
    if (!boardIds.has(layout.boardId)) errors.push(`${label}: layout ${layout.id} references an unknown board`);
    if (!Number.isInteger(layout.columnCount) || layout.columnCount < 1 || layout.columnCount > 24) {
      errors.push(`${label}: layout ${layout.id} has an invalid column count`);
    }
  }
  for (const board of fixture.boards ?? []) {
    if (!boardNameSchema.safeParse(board.name).success) {
      errors.push(`${label}: board ${board.id} has an invalid board name ${String(board.name)}`);
    }
    if (!board.label?.trim()) errors.push(`${label}: board ${board.id} is missing its human-readable label`);
    if (board.flags.shared && board.name !== expectedSharedBoardNames.get(board.handle)) {
      errors.push(`${label}: shared board ${board.handle} name differs from the coverage manifest`);
    }
    if (board.layouts.some((layoutId) => !layoutIds.has(layoutId))) {
      errors.push(`${label}: board ${board.id} references an unknown layout`);
    }
  }

  const populated = fixture.profile !== "onboarding-fresh";
  if (populated) {
    if (fixture.personas.length !== 14) errors.push(`${label}: expected 14 seeded personas`);
    for (const persona of fixture.personas) {
      if (!persona.name) errors.push(`${label}: persona ${persona.id} is missing its human-readable name`);
      if (persona.loginUsername !== persona.handle || persona.loginUsername !== persona.loginUsername.toLowerCase()) {
        errors.push(`${label}: persona ${persona.id} has an invalid login username`);
      }
    }
    if (fixture.boards.length !== 35) errors.push(`${label}: expected 35 seeded boards`);
    if (fixture.counts.widgetKinds !== sourceWidgetKinds.length || !fixture.flags.allWidgetKindsCovered) {
      errors.push(`${label}: widget-kind coverage does not match the canonical source`);
    }
    if (fixture.counts.apps !== 8 || fixture.counts.icons !== 8 || fixture.counts.customWidgets !== 3) {
      errors.push(`${label}: fixture object counts are incomplete`);
    }
    const expectedPermissions = {
      "rowan-owner": "full",
      "eden-editor": "modify",
      "vivian-viewer": "view",
      "nolan-outsider": "none",
    };
    if (JSON.stringify(fixture.expectedBoardPermissions) !== JSON.stringify(expectedPermissions)) {
      errors.push(`${label}: expected board permissions are incorrect`);
    }
    if (JSON.stringify(fixture.packetBoardAccess) !== JSON.stringify(releaseV2QaPacketBoardAccess)) {
      errors.push(`${label}: packet board access differs from the campaign assignment`);
    }
    if (JSON.stringify(fixture.expectedBoardAccess) !== JSON.stringify(expectedBoardAccess)) {
      errors.push(`${label}: effective assigned board access differs from the campaign assignment`);
    }
  } else {
    const emptyFixtureCounts = [
      "personas",
      "boards",
      "homeBoards",
      "sharedBoards",
      "layouts",
      "items",
      "widgetKinds",
      "apps",
      "icons",
      "customWidgets",
    ];
    const hasPopulatedFixtureCount = emptyFixtureCounts.some((countName) => fixture.counts[countName] !== 0);
    if (
      fixture.personas.length !== 0 ||
      fixture.boards.length !== 0 ||
      fixture.layouts.length !== 0 ||
      hasPopulatedFixtureCount ||
      fixture.flags.allWidgetKindsCovered
    ) {
      errors.push(`${label}: onboarding-fresh must not contain populated QA fixtures`);
    }
    if (Object.keys(fixture.expectedBoardAccess ?? {}).length > 0) {
      errors.push(`${label}: onboarding-fresh must not declare seeded board access`);
    }
  }

  let fixtureOrigin: URL | undefined;
  try {
    fixtureOrigin = new URL(validateFixtureUrl(fixture.flags.fixtureOrigin));
  } catch {
    errors.push(`${label}: fixture origin must be credential-free loopback HTTP`);
  }
  if (checkEndpoint && fixtureOrigin) await validateFixtureEndpoint(fixtureOrigin.origin, label);
};

const validateSqliteState = async (runtime: RuntimeManifest, fixture: FixtureManifest, sourceWidgetKinds: string[]) => {
  const label = `runtime slot ${runtime.slot}`;
  if (!existsSync(runtime.dbPath)) {
    errors.push(`${label}: SQLite database is missing`);
    return;
  }
  const sqliteModule = await import("better-sqlite3");
  type DatabaseLike = {
    prepare: (sql: string) => {
      get: (...parameters: unknown[]) => unknown;
      all: (...parameters: unknown[]) => unknown[];
    };
    close: () => void;
  };
  const Database = sqliteModule.default as unknown as new (
    filename: string,
    options: { readonly: boolean; fileMustExist: boolean },
  ) => DatabaseLike;
  const database = new Database(runtime.dbPath, { readonly: true, fileMustExist: true });
  const count = (sql: string, ...parameters: unknown[]) =>
    (database.prepare(sql).get(...parameters) as { count: number }).count;
  try {
    const qaUserCount = count(`select count(*) as count from "user" where id like 'qa-v2-user-%'`);
    const qaBoardCount = count(`select count(*) as count from board where id like 'qa-v2-board-%'`);
    const qaLayoutCount = count(`select count(*) as count from layout where board_id like 'qa-v2-board-%'`);
    const qaItemCount = count(`select count(*) as count from item where board_id like 'qa-v2-board-%'`);
    if (qaUserCount !== fixture.counts.personas) errors.push(`${label}: SQLite persona count differs from manifest`);
    if (qaBoardCount !== fixture.counts.boards) errors.push(`${label}: SQLite board count differs from manifest`);
    if (qaLayoutCount !== fixture.counts.layouts) errors.push(`${label}: SQLite layout count differs from manifest`);
    if (qaItemCount !== fixture.counts.items) errors.push(`${label}: SQLite item count differs from manifest`);

    const populated = fixture.profile !== "onboarding-fresh";
    if (!populated) {
      const qaFixtureCounts = [
        count(`select count(*) as count from "group" where id like 'qa-v2-%'`),
        count(`select count(*) as count from app where id like 'qa-v2-%'`),
        count(`select count(*) as count from icon where id like 'qa-v2-%'`),
        count(`select count(*) as count from integration where id like 'qa-v2-%'`),
        count(`select count(*) as count from custom_widget_v2_definition where id like 'qa-v2-%'`),
      ];
      if (qaFixtureCounts.some((fixtureCount) => fixtureCount !== 0)) {
        errors.push(`${label}: onboarding-fresh contains QA-scoped fixture records`);
      }
      if (count(`select count(*) as count from "user"`) !== 0) {
        errors.push(`${label}: onboarding-fresh must not contain users`);
      }
      const onboardingRows = database.prepare(`select step, previous_step as previousStep from onboarding`).all() as {
        step: string;
        previousStep: string | null;
      }[];
      if (
        onboardingRows.length !== 1 ||
        onboardingRows[0]?.step !== "start" ||
        onboardingRows[0]?.previousStep !== null
      ) {
        errors.push(`${label}: onboarding-fresh is not at the initial onboarding step`);
      }
    }

    const qaUsers = database.prepare(`select id, name from "user" where id like 'qa-v2-user-%'`).all() as {
      id: string;
      name: string;
    }[];
    const loginUsernameById = new Map(fixture.personas.map((persona) => [persona.id, persona.loginUsername]));
    for (const user of qaUsers) {
      if (user.name !== loginUsernameById.get(user.id)) {
        errors.push(`${label}: SQLite persona ${user.id} login username differs from manifest`);
      }
    }

    const qaBoards = database
      .prepare(`select id, name, creator_id as creatorId from board where id like 'qa-v2-board-%'`)
      .all() as {
      id: string;
      name: string;
      creatorId: string | null;
    }[];
    const boardNameById = new Map(fixture.boards.map((board) => [board.id, board.name]));
    if (duplicateValues(qaBoards.map((board) => board.name)).length > 0) {
      errors.push(`${label}: SQLite contains duplicate QA board names`);
    }
    for (const board of qaBoards) {
      if (!boardNameSchema.safeParse(board.name).success) {
        errors.push(`${label}: SQLite board ${board.id} has an invalid board name ${board.name}`);
      }
      if (board.name !== boardNameById.get(board.id)) {
        errors.push(`${label}: SQLite board ${board.id} name differs from manifest`);
      }
    }

    const missingPlacements = count(
      `select count(*) as count
       from item i
       join layout l on l.board_id = i.board_id
       left join item_layout il on il.item_id = i.id and il.layout_id = l.id
       where i.board_id like 'qa-v2-board-%' and il.item_id is null`,
    );
    if (missingPlacements !== 0) errors.push(`${label}: ${missingPlacements} item/layout placements are missing`);
    const geometryLayouts = database
      .prepare(
        `select id, board_id as boardId, column_count as columnCount,
                left_gutter_column_count as leftGutterColumnCount,
                right_gutter_column_count as rightGutterColumnCount, role
         from layout where board_id like 'qa-v2-board-%'`,
      )
      .all() as {
      id: string;
      boardId: string;
      columnCount: number;
      leftGutterColumnCount: number;
      rightGutterColumnCount: number;
      role: LayoutRole;
    }[];
    const geometrySections = database
      .prepare(
        `select id, board_id as boardId, kind, x_offset as xOffset
         from section where board_id like 'qa-v2-board-%'`,
      )
      .all() as {
      id: string;
      boardId: string;
      kind: "empty" | "container";
      xOffset: number | null;
    }[];
    const geometrySectionLayouts = database
      .prepare(
        `select sl.section_id as sectionId, sl.layout_id as layoutId,
                sl.parent_section_id as parentSectionId, sl.x_offset as xOffset,
                sl.y_offset as yOffset, sl.width, sl.height
         from section_layout sl
         join layout l on l.id = sl.layout_id
         where l.board_id like 'qa-v2-board-%'`,
      )
      .all() as {
      sectionId: string;
      layoutId: string;
      parentSectionId: string | null;
      xOffset: number;
      yOffset: number;
      width: number;
      height: number;
    }[];
    const geometryItemLayouts = database
      .prepare(
        `select il.item_id as itemId, i.board_id as boardId, il.section_id as sectionId,
                il.layout_id as layoutId, il.x_offset as xOffset, il.y_offset as yOffset,
                il.width, il.height
         from item_layout il
         join item i on i.id = il.item_id
         where i.board_id like 'qa-v2-board-%'`,
      )
      .all() as {
      itemId: string;
      boardId: string;
      sectionId: string;
      layoutId: string;
      xOffset: number;
      yOffset: number;
      width: number;
      height: number;
    }[];
    const geometryErrors = findFixtureGeometryErrors({
      layouts: geometryLayouts,
      sections: geometrySections,
      sectionLayouts: geometrySectionLayouts,
      itemLayouts: geometryItemLayouts,
    });
    if (geometryErrors.length > 0) {
      errors.push(`${label}: invalid fixture geometry (${geometryErrors.join("; ")})`);
    }

    if (populated) {
      const actualWidgetKinds = database
        .prepare(`select distinct kind from item where board_id like 'qa-v2-board-widgets-%' order by kind`)
        .all()
        .map((row) => (row as { kind: string }).kind);
      if (!sameSet(actualWidgetKinds, sourceWidgetKinds)) {
        errors.push(`${label}: widget gallery does not contain every canonical widget kind exactly once`);
      }

      const personaHandleByName = new Map(fixture.personas.map((persona) => [persona.name, persona.handle]));
      const boardByName = new Map(fixture.boards.map((board) => [board.name, board]));
      const creatorByBoardId = new Map(qaBoards.map((board) => [board.id, board.creatorId]));
      const expectedDirectPermissions: string[] = [];
      for (const [personaName, assignedBoards] of Object.entries(fixture.expectedBoardAccess)) {
        const personaHandle = personaHandleByName.get(personaName);
        if (!personaHandle) {
          errors.push(`${label}: assigned board access references unknown persona ${personaName}`);
          continue;
        }
        const currentUserId = `qa-v2-user-${personaHandle}`;
        for (const [boardName, permission] of Object.entries(assignedBoards)) {
          const board = boardByName.get(boardName);
          if (!board) {
            errors.push(`${label}: assigned board access references unknown board ${boardName}`);
            continue;
          }
          const isAdmin = personaHandle === "avery-admin";
          const isOwner = creatorByBoardId.get(board.id) === currentUserId;
          if (permission === "none") {
            const anyPermissionCount = count(
              `select count(*) as count from boardUserPermission where board_id = ? and user_id = ?`,
              board.id,
              currentUserId,
            );
            if (anyPermissionCount !== 0 || isAdmin || isOwner) {
              errors.push(`${label}: ${personaHandle} unexpectedly has assigned access to ${board.handle}`);
            }
            continue;
          }
          if (isAdmin || isOwner) {
            if (permission !== "full") {
              errors.push(
                `${label}: ${personaHandle} has implicit full access but ${permission} was declared for ${board.handle}`,
              );
            }
            continue;
          }
          expectedDirectPermissions.push(`${board.id}\t${currentUserId}\t${permission}`);
        }
      }

      const actualDirectPermissions = database
        .prepare(
          `select board_id as boardId, user_id as userId, permission
           from boardUserPermission
           where board_id like 'qa-v2-board-%' and user_id like 'qa-v2-user-%'
           order by board_id, user_id, permission`,
        )
        .all()
        .map((row) => {
          const permission = row as { boardId: string; userId: string; permission: string };
          return `${permission.boardId}\t${permission.userId}\t${permission.permission}`;
        });
      if (JSON.stringify(actualDirectPermissions) !== JSON.stringify(expectedDirectPermissions.toSorted())) {
        errors.push(`${label}: direct QA board permission rows differ from the packet access assignment`);
      }

      const averyAdminPermissionCount = count(
        `select count(*) as count
         from groupMember gm
         join groupPermission gp on gp.group_id = gm.group_id
         where gm.user_id = ? and gp.permission = 'admin'`,
        "qa-v2-user-avery-admin",
      );
      if (averyAdminPermissionCount !== 1) errors.push(`${label}: Avery Admin lacks the admin fixture role`);

      const nolanSharedBoardAccess = count(
        `select count(*) as count
         from boardUserPermission bup
         join board b on b.id = bup.board_id
         where bup.user_id = ? and b.id not like 'qa-v2-board-home-%'`,
        "qa-v2-user-nolan-outsider",
      );
      const nolanGlobalBoardAccess = count(
        `select count(*) as count
         from groupMember gm
         join groupPermission gp on gp.group_id = gm.group_id
         where gm.user_id = ? and (gp.permission = 'admin' or gp.permission like 'board-%')`,
        "qa-v2-user-nolan-outsider",
      );
      if (nolanSharedBoardAccess !== 0 || nolanGlobalBoardAccess !== 0) {
        errors.push(`${label}: Nolan Outsider has protected fixture board access`);
      }

      const vivianEditAccess = count(
        `select count(*) as count
         from boardUserPermission
         where user_id = ? and permission in ('modify', 'full')`,
        "qa-v2-user-vivian-viewer",
      );
      const vivianGlobalEditAccess = count(
        `select count(*) as count
         from groupMember gm
         join groupPermission gp on gp.group_id = gm.group_id
         where gm.user_id = ? and gp.permission in ('admin', 'board-modify-all', 'board-full-all')`,
        "qa-v2-user-vivian-viewer",
      );
      if (vivianEditAccess !== 0 || vivianGlobalEditAccess !== 0) {
        errors.push(`${label}: Vivian Viewer has board edit access`);
      }
    }
  } finally {
    database.close();
  }
};

const validateRuntimeManifest = async (
  runtime: RuntimeManifest,
  manifestPath: string,
  sourceWidgetKinds: string[],
  expectedSharedBoardNames: Map<string, string>,
) => {
  const label = `runtime manifest ${manifestPath}`;
  if (runtime.schemaVersion !== 1) errors.push(`${label}: unsupported schema version`);
  if (runtime.candidateSha !== campaignCandidateSha) errors.push(`${label}: candidate does not match the campaign`);
  if (![1, 2, 3].includes(runtime.slot)) errors.push(`${label}: slot must be 1, 2, or 3`);
  if (!expectedProfileFlags[runtime.profile]) errors.push(`${label}: unknown profile ${runtime.profile}`);
  const expectedFlags = booleanProfileFlags(runtime.profile);
  if (JSON.stringify(runtime.flags) !== JSON.stringify(expectedFlags)) {
    errors.push(`${label}: runtime flags do not match profile ${runtime.profile}`);
  }
  for (const executionError of validateRuntimeExecutionContract(runtime)) {
    errors.push(`${label}: ${executionError}`);
  }
  if (resolve(runtime.repoRoot) !== repoRoot) errors.push(`${label}: repoRoot does not match this checkout`);
  try {
    await assertSafeRunRoot(runtime.runRoot);
  } catch {
    errors.push(`${label}: runRoot is not a safe release-v2 QA temporary root`);
  }

  const expectedSlotDir = join(runtime.runRoot, "slots", String(runtime.slot));
  const expectedManifestPath = join(expectedSlotDir, "runtime-manifest.json");
  const expectedDbPath = join(expectedSlotDir, "db.sqlite");
  const expectedTrustedCertificatePath = join(expectedSlotDir, "trusted-certificates");
  const expectedFixtureManifestPath = join(expectedSlotDir, "fixture-manifest.json");
  const expectedBuild = createCandidateBuildPaths(campaignCandidateSha);
  if (resolve(runtime.slotDir) !== resolve(expectedSlotDir))
    errors.push(`${label}: slotDir is outside the selected slot`);
  if (resolve(manifestPath) !== resolve(expectedManifestPath))
    errors.push(`${label}: runtime manifest is outside the selected slot`);
  if (resolve(runtime.dbPath) !== resolve(expectedDbPath)) errors.push(`${label}: dbPath is outside the selected slot`);
  if (resolve(runtime.trustedCertificatePath ?? "") !== resolve(expectedTrustedCertificatePath)) {
    errors.push(`${label}: trusted certificate path is outside the selected slot`);
  }
  if (resolve(runtime.fixtureManifestPath) !== resolve(expectedFixtureManifestPath)) {
    errors.push(`${label}: fixture manifest path is outside the selected slot`);
  }
  if (resolve(runtime.nextDistDir) !== resolve(expectedBuild.buildDir)) {
    errors.push(`${label}: Next dist directory is not the candidate-pinned shared build`);
  }
  if (
    runtime.build?.candidateSha !== campaignCandidateSha ||
    resolve(runtime.build?.serverPath ?? "") !== resolve(expectedBuild.serverPath)
  ) {
    errors.push(`${label}: standalone build metadata does not match the campaign candidate`);
  }
  for (const processRecord of Object.values(runtime.processes ?? {})) {
    if (!isPathWithin(expectedSlotDir, resolve(processRecord.logPath))) {
      errors.push(`${label}: process log path escapes the selected slot`);
    }
  }
  try {
    if ((await realpath(runtime.runRoot)) !== resolve(runtime.runRoot))
      errors.push(`${label}: runRoot must not be a symlink`);
    if ((await realpath(runtime.slotDir)) !== resolve(runtime.slotDir))
      errors.push(`${label}: slotDir must not be a symlink`);
    if ((await realpath(runtime.trustedCertificatePath)) !== resolve(runtime.trustedCertificatePath)) {
      errors.push(`${label}: trusted certificate path must exist inside the selected slot and must not be a symlink`);
    }
  } catch {
    errors.push(`${label}: runRoot, slotDir, or trusted certificate path is missing`);
  }

  let appUrl: URL | undefined;
  let fixtureUrl: URL | undefined;
  try {
    appUrl = new URL(runtime.url);
    fixtureUrl = new URL(runtime.fixtureUrl);
  } catch {
    errors.push(`${label}: runtime URLs are invalid`);
  }
  for (const [name, url] of [
    ["app", appUrl],
    ["fixture", fixtureUrl],
  ] as const) {
    if (!url) continue;
    try {
      validateFixtureUrl(url.href);
    } catch {
      errors.push(`${label}: ${name} URL must be credential-free loopback HTTP`);
    }
  }
  if (appUrl && Number(appUrl.port) !== runtime.ports.app) errors.push(`${label}: app URL and port differ`);
  if (fixtureUrl && Number(fixtureUrl.port) !== runtime.ports.fixture)
    errors.push(`${label}: fixture URL and port differ`);

  if (!existsSync(runtime.fixtureManifestPath)) {
    errors.push(`${label}: fixture manifest is missing`);
    return;
  }
  const fixture = await readJson<FixtureManifest>(runtime.fixtureManifestPath);
  if (fixture.profile !== runtime.profile) errors.push(`${label}: runtime and fixture profiles differ`);
  if (fixture.candidateSha !== runtime.candidateSha) errors.push(`${label}: runtime and fixture candidates differ`);
  await validateFixtureManifest(
    fixture,
    runtime.fixtureManifestPath,
    sourceWidgetKinds,
    runtime.status === "running",
    expectedSharedBoardNames,
  );
  await validateSqliteState(runtime, fixture, sourceWidgetKinds);

  if (runtime.status === "running" && appUrl) {
    try {
      const response = await fetch(`${appUrl.origin}/api/health/ready`, { signal: AbortSignal.timeout(5_000) });
      if (!response.ok) errors.push(`${label}: application readiness returned HTTP ${response.status}`);
    } catch {
      errors.push(`${label}: application readiness endpoint is unreachable`);
    }
  }
};

const validateRequestedRuntime = async (
  options: VerifyOptions,
  sourceWidgetKinds: string[],
  expectedSharedBoardNames: Map<string, string>,
) => {
  const manifestPaths = [...options.manifestPaths];
  if (options.runRoot) {
    try {
      options.runRoot = await assertSafeRunRoot(options.runRoot);
    } catch {
      errors.push(`run-root is not a safe release-v2 QA temporary root: ${options.runRoot}`);
    }
    const markerPath = join(options.runRoot, ".homarr-release-v2-qa-root.json");
    if (!existsSync(markerPath)) {
      errors.push(`run-root marker is missing: ${markerPath}`);
    } else {
      const marker = await readJson<{ schemaVersion?: number; repoRoot?: string; runRoot?: string }>(markerPath);
      if (marker.schemaVersion !== 1 || resolve(marker.repoRoot ?? "") !== repoRoot) {
        errors.push(`run-root marker does not belong to this checkout: ${markerPath}`);
      }
      if (marker.runRoot && resolve(marker.runRoot) !== options.runRoot) {
        errors.push(`run-root marker records a different root: ${markerPath}`);
      }
    }
    const slotsRoot = join(options.runRoot, "slots");
    if (existsSync(slotsRoot)) {
      const slotEntries = await readdir(slotsRoot, { withFileTypes: true });
      for (const entry of slotEntries) {
        if (!entry.isDirectory() || !["1", "2", "3"].includes(entry.name)) {
          errors.push(`run-root contains an unexpected slot entry: ${entry.name}`);
          continue;
        }
        const runtimePath = join(slotsRoot, entry.name, "runtime-manifest.json");
        if (!existsSync(runtimePath)) {
          errors.push(`slot ${entry.name} contains incomplete state without a runtime manifest`);
          continue;
        }
        manifestPaths.push(runtimePath);
      }
    }
  }

  const uniqueManifestPaths = new Set(manifestPaths);
  if (options.runRoot && uniqueManifestPaths.size === 0) {
    errors.push(`run-root contains no runtime manifests: ${options.runRoot}`);
  }
  for (const manifestPath of uniqueManifestPaths) {
    const value = await readJson<RuntimeManifest | FixtureManifest>(manifestPath);
    if ("runId" in value) {
      await validateRuntimeManifest(value, manifestPath, sourceWidgetKinds, expectedSharedBoardNames);
      continue;
    }
    await validateFixtureManifest(value, manifestPath, sourceWidgetKinds, true, expectedSharedBoardNames);
  }
};

const main = async (): Promise<void> => {
  const options = parseOptions();
  const manifest = await readJson<Manifest>(join(qaRoot, "coverage-manifest.json"));
  errors.push(
    ...validateReleaseV2QaPacketBoardAccess(
      manifest as Manifest & ReleaseV2QaCoverageAccessManifest,
      releaseV2QaPacketBoardAccess,
    ),
  );
  const ledgerPath = join(qaRoot, "ledger.json");
  await assertSafeReportPath(qaRoot, ledgerPath, "release-v2 QA ledger path");
  await assertSafeReportPath(qaRoot, join(qaRoot, "master-report.md"), "release-v2 QA master report path");
  const ledger = JSON.parse(await readSafeReportFile(qaRoot, ledgerPath, "release-v2 QA ledger path")) as Ledger;
  const allowedStatuses: Status[] = ["passed", "failed", "blocked", "not-reached"];
  const expectedCounts = { preflight: 3, board: 9, widgets: 12, "core-v2": 8, "whole-product": 9, performance: 4 };

  if (!sameSet(manifest.statuses, allowedStatuses))
    errors.push("manifest statuses do not match the required status vocabulary");
  if (manifest.packets.length !== 45) errors.push(`expected 45 packets, found ${manifest.packets.length}`);
  if (JSON.stringify(manifest.wavePacketCounts) !== JSON.stringify(expectedCounts))
    errors.push("wavePacketCounts is not 3/9/12/8/9/4");

  const packetIds = manifest.packets.map((packet) => packet.id);
  for (const duplicate of new Set(duplicateValues(packetIds))) errors.push(`duplicate packet id ${duplicate}`);

  for (const wave of Object.keys(expectedCounts)) {
    const dimensions = manifest.caseDimensions[wave] ?? [];
    if (dimensions.length < 3) errors.push(`${wave}: expected at least three explicit case dimensions`);
    if (duplicateValues(dimensions.map((dimension) => dimension.id)).length > 0)
      errors.push(`${wave}: duplicate case dimension IDs`);
    if (dimensions.some((dimension) => dimension.expected.trim().length === 0))
      errors.push(`${wave}: empty case expectation`);
  }

  const allCases = manifest.packets.flatMap((packet) => expandedCases(manifest, packet).map(({ id }) => id));
  for (const duplicate of new Set(duplicateValues(allCases))) errors.push(`duplicate case id ${duplicate}`);

  const prNumbers = manifest.pullRequests.map((pullRequest) => pullRequest.number);
  const profileIds = manifest.profiles.map((profile) => profile.id);
  const viewportIds = manifest.viewports.map((viewport) => viewport.id);
  const boardIds = manifest.boards.map((board) => board.id);
  const boardHandles = manifest.boards.map((board) => board.handle);
  for (const duplicate of new Set(duplicateValues(boardIds))) errors.push(`duplicate board name ${duplicate}`);
  for (const duplicate of new Set(duplicateValues(boardHandles))) errors.push(`duplicate board handle ${duplicate}`);
  for (const board of manifest.boards) {
    if (!boardNameSchema.safeParse(board.id).success) errors.push(`invalid coverage board name ${board.id}`);
  }
  const expectedSharedBoardNames = new Map(manifest.boards.map((board) => [board.handle, board.id]));

  for (const [wave, expected] of Object.entries(expectedCounts)) {
    const actual = manifest.packets.filter((packet) => packet.wave === wave).length;
    if (actual !== expected) errors.push(`${wave}: expected ${expected} packets, found ${actual}`);
  }

  for (const packet of manifest.packets) {
    if (packet.cases.length === 0 || expandedCases(manifest, packet).length < 3)
      errors.push(`${packet.id}: insufficient cases assigned`);
    assertReferences(packet, "prRefs", packet.prRefs, prNumbers);
    assertReferences(packet, "personas", packet.personas, manifest.personas);
    assertReferences(packet, "boards", packet.boards, boardIds);
    assertReferences(packet, "profiles", packet.profiles, profileIds);
    assertReferences(packet, "viewports", packet.viewports, viewportIds);
    assertReferences(packet, "zooms", packet.zooms, manifest.zooms);
    assertReferences(packet, "inputs", packet.inputs, manifest.inputs);
    if (packet.widgetKinds) {
      const expectedGroup = expectedWidgetGroups[packet.id];
      if (!expectedGroup || JSON.stringify(packet.widgetKinds) !== JSON.stringify(expectedGroup)) {
        errors.push(`${packet.id}: widget allocation does not match the required group`);
      }
      if (JSON.stringify(packet.viewports) !== JSON.stringify(viewportIds)) {
        errors.push(`${packet.id}: every widget kind must cover all ${viewportIds.length} required viewports`);
      }
    }
  }

  for (const prNumber of prNumbers) {
    if (!manifest.packets.some((packet) => packet.prRefs.includes(prNumber)))
      errors.push(`PR #${prNumber} has no packet coverage`);
  }

  const widgetSource = await readFile(join(repoRoot, "packages/definitions/src/widget.ts"), "utf8");
  const widgetBlock = widgetSource.match(/export const widgetKinds = \[([\s\S]*?)\] as const;/)?.[1];
  if (!widgetBlock) throw new Error("Could not parse widgetKinds from packages/definitions/src/widget.ts");
  const sourceWidgetKinds = [...widgetBlock.matchAll(/"([^"]+)"/g)].map((match) => match[1]);
  const assignedWidgetKinds = manifest.packets.flatMap((packet) => packet.widgetKinds ?? []);

  for (const widgetKind of sourceWidgetKinds) {
    const count = assignedWidgetKinds.filter((assigned) => assigned === widgetKind).length;
    if (count !== 1) errors.push(`widget ${widgetKind}: expected exactly one assignment, found ${count}`);
  }
  for (const widgetKind of assignedWidgetKinds) {
    if (!sourceWidgetKinds.includes(widgetKind)) errors.push(`unknown widget assignment ${widgetKind}`);
  }
  if (assignedWidgetKinds.length !== sourceWidgetKinds.length) {
    errors.push(
      `widget coverage count differs: ${assignedWidgetKinds.length} assigned, ${sourceWidgetKinds.length} declared`,
    );
  }

  await validateRequestedRuntime(options, sourceWidgetKinds, expectedSharedBoardNames);

  for (const packet of manifest.packets) {
    const reportPath = join(reportsRoot, packet.id, "report.md");
    await assertSafeReportPath(qaRoot, reportPath, `${packet.id} report path`);
    let content: string;
    try {
      content = await readSafeReportFile(qaRoot, reportPath, `${packet.id} report path`);
    } catch {
      errors.push(`${packet.id}: report.md is missing`);
      continue;
    }

    const rawMetadata = parseReportMetadata(content, packet.id);
    if (rawMetadata === undefined) continue;
    const expectedWidgetChecks = (packet.widgetKinds ?? []).flatMap((widgetKind) =>
      packet.viewports.map((viewport) => ({
        widgetKind,
        viewport,
        sizeRequirement: requiredSizeInstruction(widgetKind),
        status: "not-reached" as const,
      })),
    );
    const normalized = normalizeReportMetadata(rawMetadata, {
      packetId: packet.id,
      expectedCaseIds: expandedCases(manifest, packet).map(({ id }) => id),
      expectedWidgetChecks,
    });
    errors.push(...normalized.errors);
    const metadata = normalized.metadata as ReportMetadata;
    errors.push(...collectHumanWidgetStatusErrors(content, packet.id, metadata.widgetChecks));
    if (metadata.packetId !== packet.id) errors.push(`${packet.id}: metadata packetId is ${metadata.packetId}`);
    if (!allowedStatuses.includes(metadata.status))
      errors.push(`${packet.id}: invalid report status ${String(metadata.status)}`);
    if (!Array.isArray(metadata.findings)) errors.push(`${packet.id}: findings must be an array`);
    if (!Array.isArray(metadata.artifacts)) errors.push(`${packet.id}: artifacts must be an array`);
    if (metadata.execution?.candidateSha !== campaignCandidateSha) {
      errors.push(`${packet.id}: candidateSha must equal the pinned campaign candidate ${campaignCandidateSha}`);
    }
    if (!content.includes(`| Candidate SHA | ${campaignCandidateSha} |`)) {
      errors.push(`${packet.id}: human metadata must show the pinned campaign candidate`);
    }
    if (!metadata.execution || typeof metadata.execution !== "object")
      errors.push(`${packet.id}: execution metadata is missing`);
    if (!content.includes("## Dogfood evidence")) errors.push(`${packet.id}: dogfood evidence section is missing`);
    if (!content.includes(resolve(repoRoot, ".screenshots/release-v2", packet.id))) {
      errors.push(`${packet.id}: absolute artifact directory link is missing`);
    }
    if (!content.includes(`| Status | ${metadata.status} |`))
      errors.push(`${packet.id}: human metadata status differs from report metadata`);

    const packetCases = expandedCases(manifest, packet).map(({ id }) => id);
    if (!sameSet(Object.keys(metadata.caseStatuses), packetCases))
      errors.push(`${packet.id}: case status IDs differ from manifest`);
    for (const [caseId, status] of Object.entries(metadata.caseStatuses)) {
      if (!allowedStatuses.includes(status))
        errors.push(`${packet.id}/${caseId}: invalid case status ${String(status)}`);
      if (!content.includes(`| ${caseId} | ${status} |`))
        errors.push(`${packet.id}/${caseId}: human evidence row/status is missing`);
    }
    const rollup = expectedRollup(Object.values(metadata.caseStatuses));
    if (metadata.status !== rollup)
      errors.push(`${packet.id}: report status ${metadata.status} does not match case rollup ${rollup}`);

    for (const finding of Array.isArray(metadata.findings) ? metadata.findings : []) {
      if (!["P0", "P1", "P2", "P3"].includes(finding.severity))
        errors.push(`${packet.id}: finding has invalid severity ${String(finding.severity)}`);
      if (typeof finding.title !== "string" || finding.title.trim().length === 0)
        errors.push(`${packet.id}: finding title is required`);
      for (const caseId of finding.caseIds ?? []) {
        if (!packetCases.includes(caseId)) errors.push(`${packet.id}: finding references unknown case ${caseId}`);
      }
      for (const evidence of finding.evidence ?? []) {
        const artifactError = await validateResolvedArtifactPath(
          resolve(repoRoot, ".screenshots/release-v2", packet.id),
          evidence,
          `${packet.id}: finding evidence`,
        );
        if (artifactError) errors.push(artifactError);
      }
    }

    if (packet.widgetKinds) {
      const checks = Array.isArray(metadata.widgetChecks) ? metadata.widgetChecks : [];
      const expectedCheckKeys = packet.widgetKinds.flatMap((widgetKind) =>
        packet.viewports.map((viewport) => `${widgetKind}\u0000${viewport}`),
      );
      const actualCheckKeys = checks.map((check) => `${check.widgetKind}\u0000${check.viewport}`);
      if (!sameSet(actualCheckKeys, expectedCheckKeys)) {
        errors.push(`${packet.id}: structured widget checks do not match the assigned kind × viewport matrix`);
      }
      if (duplicateValues(actualCheckKeys).length > 0) {
        errors.push(`${packet.id}: structured widget checks contain duplicate kind × viewport rows`);
      }
      for (const check of checks) {
        if (!allowedStatuses.includes(check.status)) {
          errors.push(`${packet.id}/${check.widgetKind}/${check.viewport}: invalid widget check status`);
        }
        const expectedInstruction = requiredSizeInstruction(check.widgetKind);
        if (check.sizeRequirement !== expectedInstruction) {
          errors.push(`${packet.id}/${check.widgetKind}: incorrect size-threshold instruction`);
        }
      }
      for (const heading of [
        "Size",
        "States",
        "Permission/read-only",
        "Options/persistence",
        "Recovery",
        "Evidence",
        "Status",
      ]) {
        if (!content.includes(heading)) errors.push(`${packet.id}: widget checklist is missing ${heading}`);
      }
    } else if ((metadata.widgetChecks?.length ?? 0) > 0) {
      errors.push(`${packet.id}: non-widget report must not contain widget checks`);
    }

    if (!metadata.performance || !Array.isArray(metadata.performance.measurements)) {
      errors.push(`${packet.id}: performance measurements must be an array`);
    } else {
      for (const measurement of metadata.performance.measurements) {
        if (!measurement.name?.trim() || !measurement.unit?.trim() || !measurement.threshold?.trim()) {
          errors.push(`${packet.id}: performance measurement name, unit, and threshold are required`);
        }
        if (measurement.value !== null && !Number.isFinite(measurement.value)) {
          errors.push(`${packet.id}: performance measurement value must be finite or null`);
        }
        if (!allowedStatuses.includes(measurement.status)) {
          errors.push(`${packet.id}: performance measurement has invalid status`);
        }
        for (const evidence of measurement.evidence ?? []) {
          const artifactError = await validateResolvedArtifactPath(
            resolve(repoRoot, ".screenshots/release-v2", packet.id),
            evidence,
            `${packet.id}: performance evidence`,
          );
          if (artifactError) errors.push(artifactError);
        }
      }
    }
    if (!Array.isArray(metadata.performance?.limitations)) {
      errors.push(`${packet.id}: performance limitations must be an array`);
    }
    if (!Array.isArray(metadata.independentReproductions)) {
      errors.push(`${packet.id}: independentReproductions must be an array`);
    } else {
      for (const reproduction of metadata.independentReproductions) {
        if (!reproduction.findingFingerprint?.trim() || !reproduction.agentId?.trim()) {
          errors.push(`${packet.id}: independent reproduction requires a finding fingerprint and agent ID`);
        }
        if (!["reproduced", "not-reproduced", "blocked", "not-reached"].includes(reproduction.outcome)) {
          errors.push(`${packet.id}: independent reproduction has invalid outcome`);
        }
        for (const evidence of reproduction.evidence ?? []) {
          const artifactError = await validateResolvedArtifactPath(
            resolve(repoRoot, ".screenshots/release-v2", packet.id),
            evidence,
            `${packet.id}: reproduction evidence`,
          );
          if (artifactError) errors.push(artifactError);
        }
      }
    }

    if (metadata.status !== "not-reached" && metadata.execution) {
      const execution = metadata.execution;
      const requiredText = [
        execution.candidateSha,
        execution.url,
        execution.runtimeProfile,
        execution.persona,
        execution.sessionId,
        execution.timestamp,
        execution.viewport,
        execution.input,
      ];
      if (requiredText.some((value) => typeof value !== "string" || value.trim().length === 0)) {
        errors.push(`${packet.id}: completed/blocked report has incomplete execution metadata`);
      }
      if (!Number.isInteger(execution.actualPort) || (execution.actualPort ?? 0) <= 0)
        errors.push(`${packet.id}: actualPort is required after execution`);
      if (!Number.isFinite(execution.zoom) || (execution.zoom ?? 0) <= 0)
        errors.push(`${packet.id}: zoom is required after execution`);
      if (execution.viewport && !packet.viewports.includes(execution.viewport))
        errors.push(`${packet.id}: execution viewport is outside packet coverage`);
      if (execution.input && !packet.inputs.includes(execution.input))
        errors.push(`${packet.id}: execution input is outside packet coverage`);
      if (execution.zoom && !packet.zooms.includes(execution.zoom))
        errors.push(`${packet.id}: execution zoom is outside packet coverage`);
      if (execution.persona && !packet.personas.includes(execution.persona))
        errors.push(`${packet.id}: execution persona is outside packet coverage`);
      if (execution.runtimeProfile && !packet.profiles.includes(execution.runtimeProfile))
        errors.push(`${packet.id}: execution profile is outside packet coverage`);
      const expectedFlags = execution.runtimeProfile ? expectedProfileFlags[execution.runtimeProfile] : undefined;
      if (!expectedFlags || !sameSet(execution.runtimeFlags, expectedFlags)) {
        errors.push(
          `${packet.id}: runtime flags do not exactly match profile ${execution.runtimeProfile ?? "unknown"}`,
        );
      }
      if (!execution.url?.match(/^https?:\/\//)) errors.push(`${packet.id}: URL must be absolute HTTP(S)`);
      if (!execution.timestamp || Number.isNaN(Date.parse(execution.timestamp)))
        errors.push(`${packet.id}: timestamp must be ISO-compatible`);
      for (const value of [...requiredText, execution.actualPort, execution.zoom]) {
        if (value !== null && value !== undefined && !content.includes(String(value)))
          errors.push(`${packet.id}: human metadata does not include execution value ${String(value)}`);
      }
      if (metadata.artifacts.length === 0) errors.push(`${packet.id}: executed report must link at least one artifact`);
      for (const artifact of metadata.artifacts) {
        const artifactError = await validateResolvedArtifactPath(
          resolve(repoRoot, ".screenshots/release-v2", packet.id),
          artifact,
          `${packet.id}: artifact`,
        );
        if (artifactError) errors.push(artifactError);
      }
    }

    const ledgerEntry = ledger.packetStatuses[packet.id];
    if (!ledgerEntry) {
      errors.push(`${packet.id}: ledger entry is missing`);
      continue;
    }
    if (ledgerEntry.status !== metadata.status) errors.push(`${packet.id}: ledger/report packet statuses differ`);
    if (JSON.stringify(ledgerEntry.cases) !== JSON.stringify(metadata.caseStatuses)) {
      errors.push(`${packet.id}: ledger/report case statuses differ`);
    }
  }

  for (const ledgerPacketId of Object.keys(ledger.packetStatuses)) {
    if (!packetIds.includes(ledgerPacketId)) errors.push(`ledger contains unknown packet ${ledgerPacketId}`);
  }

  if (errors.length > 0) {
    console.error(`release-v2 QA verification failed with ${errors.length} error(s):`);
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `release-v2 QA verification passed: ${manifest.packets.length} packets, ${allCases.length} cases, ${sourceWidgetKinds.length} widgets`,
  );
};

await main();
