import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, readFile, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { chromium, expect } from "@playwright/test";
import type { Browser, Page } from "@playwright/test";
import type { createHomarrContainer as CreateHomarrContainer } from "../../e2e/shared/create-homarr-container.ts";
import { getSanityDeterministicStatus, parseSanityReport } from "../../packages/boards/src/sanity-report.ts";
import type {
  SanityCapture,
  SanityCheck,
  SanityIdentity,
  SanityReport,
} from "../../packages/boards/src/sanity-report.ts";
import { fixtureHash, fixtureId, fixtureTime, mobilePlacements, placements, scenarios } from "./fixtures.mts";
import { checkGeometry } from "./geometry.mts";
import { verifyImageSource } from "./provenance.mts";
import type { InspectedImage } from "./provenance.mts";
import { seedFixtures, readPersistedPlacement, readPersistedCollapse } from "./seed.mts";
import type { CoverageDecision } from "./select.mts";
import { selectChanges } from "./select.mts";

const { createHomarrContainer } = createRequire(import.meta.url)("../../e2e/shared/create-homarr-container.ts") as {
  createHomarrContainer: typeof CreateHomarrContainer;
};

interface TargetConfig {
  label: string;
  sourceRef: string;
  image?: string;
  url?: string;
  databasePath?: string;
  cookieName?: string;
}
interface RunConfig {
  disposable: true;
  mode: "pr" | "release";
  base: TargetConfig;
  candidate: TargetConfig;
  additionalScenarios?: string[];
  captureSnapshots?: boolean;
  coverageDecisions?: CoverageDecision[];
}
interface Target {
  identity: SanityIdentity;
  databasePath: string;
  fixture: ReturnType<typeof seedFixtures>;
  cookieName: string;
}
const argument = (flag: string) => {
  const index = process.argv.indexOf(flag);
  const value = process.argv[index + 1];
  if (index < 0 || !value) throw new Error(`Missing ${flag}`);
  return value;
};
const config = JSON.parse(await readFile(argument("--config"), "utf8")) as RunConfig;
if (config.disposable !== true) throw new Error("Set disposable:true only for dedicated synthetic fixture instances");
if (!["pr", "release"].includes(config.mode)) throw new Error("mode must be pr or release");
if (process.platform !== "linux") throw new Error("The pinned initial sanity environment is Chromium on Linux");
const output = path.resolve(argument("--output"));
const selection = selectChanges(
  config.base.sourceRef,
  config.candidate.sourceRef,
  config.additionalScenarios,
  config.coverageDecisions,
);
const runId = randomUUID();
const cleanups: (() => Promise<unknown>)[] = [];
const startup = performance.now();
let browser: Browser | undefined;

try {
  if (
    config.base.databasePath &&
    config.candidate.databasePath &&
    (await realpath(config.base.databasePath)) === (await realpath(config.candidate.databasePath))
  ) {
    throw new Error("Before and after must use separate databases");
  }
  const base = await startTarget(config.base, selection.baseSha);
  const candidate = await startTarget(config.candidate, selection.headSha);
  if ((await realpath(base.databasePath)) === (await realpath(candidate.databasePath)))
    throw new Error("Before and after must use separate databases");
  browser = await chromium.launch();
  const startupMs = Math.round(performance.now() - startup);
  const checksStarted = performance.now();
  const results: SanityReport["scenarios"] = [];
  // Two independent boards run at a time; each before/after page owns its browser context.
  for (let index = 0; index < selection.scenarios.length; index += 2) {
    const batch = await Promise.all(
      selection.scenarios.slice(index, index + 2).map(async (selected) => {
        const scenario = scenarios.find((entry) => entry.id === selected.id);
        if (!scenario) throw new Error(`Selected unknown scenario ${selected.id}`);
        const [before, after] = await Promise.all([
          captureScenario(base, scenario),
          captureScenario(candidate, scenario),
        ]);
        return { id: scenario.id, title: scenario.title, viewport: scenario.viewport, before, after };
      }),
    );
    results.push(...batch);
  }
  const report: SanityReport = {
    schemaVersion: 1,
    runId,
    createdAt: new Date().toISOString(),
    mode: config.mode,
    base: base.identity,
    candidate: candidate.identity,
    fixture: { id: fixtureId, sha256: fixtureHash },
    browser: { name: "chromium", version: browser.version(), platform: "linux" },
    selection,
    scenarios: results,
    deterministicStatus: "blocked",
    visualReview: { status: "pending" },
    timings: { startupMs, checksMs: Math.round(performance.now() - checksStarted) },
  };
  report.deterministicStatus = getSanityDeterministicStatus(report);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  parseSanityReport(serialized);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, serialized);
  console.log(
    JSON.stringify({
      output,
      deterministicStatus: report.deterministicStatus,
      visualReview: "pending",
      scenarios: results.length,
      unmappedPaths: selection.unmappedPaths,
      timings: report.timings,
    }),
  );
  if (report.deterministicStatus === "failed") process.exitCode = 1;
  if (report.deterministicStatus === "blocked") process.exitCode = 2;
} finally {
  await browser?.close();
  for (const cleanup of cleanups.toReversed()) await cleanup();
}

async function startTarget(input: TargetConfig, sourceSha: string): Promise<Target> {
  const identity: SanityIdentity = { label: input.label, sourceSha };
  let url = input.url;
  let databasePath = input.databasePath;
  if (input.image) {
    if (url || databasePath) throw new Error("Choose image or external URL/database for each target");
    // Inspect first: no image rebuild and no mutable-tag resolution during startup.
    const inspected = JSON.parse(
      execFileSync("docker", ["image", "inspect", input.image], { encoding: "utf8" }),
    )[0] as InspectedImage;
    const verified = verifyImageSource(inspected, sourceSha);
    identity.imageDigest = verified.digest;
    identity.sourceVerification = verified.source;
    const directory = await mkdtemp(path.join(tmpdir(), "homarr-sanity-"));
    await mkdir(path.join(directory, "db"), { recursive: true, mode: 0o777 });
    cleanups.push(() => rm(directory, { recursive: true, force: true }));
    const previousImage = process.env.HOMARR_E2E_IMAGE;
    process.env.HOMARR_E2E_IMAGE = inspected.Id;
    let containerBuilder: ReturnType<typeof createHomarrContainer>;
    try {
      containerBuilder = createHomarrContainer({
        mounts: { "/appdata": directory },
        environment: { AUTH_PROVIDERS: "credentials", ENABLE_BOARD_DEBUG: "true", TZ: "UTC" },
      });
    } finally {
      if (previousImage === undefined) delete process.env.HOMARR_E2E_IMAGE;
      else process.env.HOMARR_E2E_IMAGE = previousImage;
    }
    const container = await containerBuilder.start();
    cleanups.push(() => container.stop());
    url = `http://${container.getHost()}:${container.getMappedPort(7575)}`;
    databasePath = path.join(directory, "db", "db.sqlite");
  }
  if (!url || !databasePath)
    throw new Error("Each target requires an already-built image or URL plus migrated SQLite databasePath");
  if (config.mode === "release" && !identity.imageDigest)
    throw new Error("Release verification requires exact already-built images");
  const origin = new URL(url);
  if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password)
    throw new Error("Invalid fixture origin");
  identity.url = origin.origin;
  databasePath = await realpath(databasePath);
  const fixture = seedFixtures(databasePath, `sanity-${runId.slice(0, 8)}`);
  return { identity, databasePath, fixture, cookieName: input.cookieName ?? "homarr.session-token" };
}

async function captureScenario(target: Target, scenario: (typeof scenarios)[number]): Promise<SanityCapture> {
  const started = performance.now();
  if (!browser || !target.identity.url) throw new Error("Fixture browser is not ready");
  const context = await browser.newContext({
    viewport: scenario.viewport,
    reducedMotion: "reduce",
    colorScheme: "dark",
    locale: "en-US",
    timezoneId: "UTC",
    deviceScaleFactor: 1,
  });
  await context.addCookies([
    {
      name: target.cookieName,
      value: target.fixture.sessionToken,
      url: target.identity.url,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  await page.clock.setFixedTime(fixtureTime);
  const boardName = target.fixture.boardName(scenario.id);
  const checks: SanityCheck[] = [];
  const result: SanityCapture = { status: "complete", checks, durationMs: 0 };
  const errors: string[] = [];
  let reachedBoard = false;
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto(`${target.identity.url}/en/boards/${boardName}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator(`[data-grid-item-id='${boardName}-empty']`)).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    // Fixture assets are local; Date is fixed while animation and browser timers keep running.
    await expect(page.locator(`[data-grid-item-id='${boardName}-clock-0']`)).toContainText("12:00", { timeout: 15000 });
    reachedBoard = true;
    let expectedPlacements = placements;
    if (scenario.viewport.width < 768) expectedPlacements = mobilePlacements;
    checks.push(...(await geometry(page, boardName, expectedPlacements)));
    if (scenario.edit) await editBoard(page, target, boardName, checks);
    else {
      const scroll = page.locator(`[data-section-id='${boardName}-scrollable']`);
      const scrollResult = await scroll.evaluate((element) => {
        const before = element.scrollTop;
        element.scrollTop = element.scrollHeight;
        return { before, after: element.scrollTop, overflow: element.scrollHeight > element.clientHeight };
      });
      addCheck(
        checks,
        "scrollable",
        "Scrollable container keeps its cap and scrolls",
        "overflow and positive scrollTop",
        JSON.stringify(scrollResult),
        scrollResult.overflow && scrollResult.after > 0,
      );
      await scroll.evaluate((element) => {
        element.scrollTop = 0;
      });
    }
    addCheck(checks, "runtime-errors", "No uncaught browser errors", "[]", JSON.stringify(errors), errors.length === 0);
    result.image = `data:image/png;base64,${(await page.screenshot({ fullPage: true, animations: "disabled" })).toString("base64")}`;
    if (config.captureSnapshots) result.snapshot = await snapshot(page);
  } catch (error) {
    const message = String(error).slice(0, 4000);
    if (reachedBoard) {
      addCheck(
        checks,
        "scenario-actions",
        "Selected board interactions complete",
        "All requested actions and persistence checks complete",
        message,
        false,
      );
    } else {
      result.status = "error";
      result.error = message;
    }
    result.image = `data:image/png;base64,${(await page.screenshot({ fullPage: true, animations: "disabled" }).catch(() => Buffer.alloc(0))).toString("base64")}`;
    if (result.image.endsWith("base64,")) delete result.image;
  } finally {
    result.durationMs = Math.round(performance.now() - started);
    await context.close();
  }
  return result;
}

async function geometry(page: Page, boardName: string, expected: typeof placements) {
  const observed = await page.locator("[data-grid-item-id][data-grid-item-type='section']").evaluateAll(
    (elements, prefix) =>
      elements.map((element) => {
        const parent = element.parentElement?.closest("[data-grid-section-id]");
        const rect = element.getBoundingClientRect();
        return {
          id: (element.getAttribute("data-grid-item-id") ?? "").replace(`${prefix}-`, ""),
          parent: (parent?.getAttribute("data-grid-section-id") ?? "").replace(`${prefix}-`, ""),
          x: Number(element.getAttribute("data-grid-x")),
          y: Number(element.getAttribute("data-grid-y")),
          w: Number(element.getAttribute("data-grid-w")),
          h: Number(element.getAttribute("data-grid-h")),
          bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        };
      }),
    boardName,
  );
  return checkGeometry(expected, observed);
}

async function editBoard(page: Page, target: Target, boardName: string, checks: SanityCheck[]) {
  await page.getByRole("button", { name: "Edit board", exact: true }).click();
  const entry = page.locator(`[data-grid-item-id='${boardName}-editable']`);
  await expect(entry).toHaveAttribute("data-editor-grid-entry", "true");
  await entry.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Shift+ArrowUp");
  await expect(entry).toHaveAttribute("data-grid-h", "1");
  await page.keyboard.press("ArrowRight");
  await expect(entry).toHaveAttribute("data-grid-x", "1");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Save board", exact: true }).click();
  await expect(page.getByRole("button", { name: "Edit board", exact: true })).toBeVisible();
  const expectedPlacement = { x: 1, y: 5, w: 2, h: 1 };
  await expect
    .poll(() => readPersistedPlacement(target.databasePath, boardName, "editable"))
    .toEqual(expectedPlacement);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(entry).toHaveAttribute("data-grid-h", "1");
  await expect(entry).toHaveAttribute("data-grid-x", "1");
  addCheck(
    checks,
    "save-reload",
    "Keyboard resize and move survive save/reload",
    JSON.stringify(expectedPlacement),
    JSON.stringify(readPersistedPlacement(target.databasePath, boardName, "editable")),
    true,
  );
  const editedPlacements = placements.map((placement) => {
    if (placement.id === "editable") return { ...placement, ...expectedPlacement };
    return placement;
  });
  checks.push(
    ...(await geometry(page, boardName, editedPlacements)).map((check) => ({ ...check, id: `after-save:${check.id}` })),
  );
  const collapse = page.locator(`[data-grid-item-id='${boardName}-collapsible'] button[aria-expanded]`);
  await collapse.click();
  await expect(collapse).toHaveAttribute("aria-expanded", "false");
  await expect.poll(() => readPersistedCollapse(target.databasePath, boardName)).toBe(1);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(collapse).toHaveAttribute("aria-expanded", "false");
  await collapse.click();
  await expect(collapse).toHaveAttribute("aria-expanded", "true");
  addCheck(
    checks,
    "collapse-reload",
    "Container collapse survives reload and can expand",
    "collapsed after reload; expanded after click",
    "collapsed after reload; expanded after click",
    true,
  );
}

async function snapshot(page: Page): Promise<string | undefined> {
  await page.keyboard.press("Control+K");
  const input = page.locator("input:visible").first();
  await input.fill("Take snapshot of board state");
  const action = page.getByText("Take snapshot of board state", { exact: true });
  if (!(await action.count())) {
    await page.keyboard.press("Escape");
    return;
  }
  const downloadPromise = page.waitForEvent("download");
  await action.click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  if (!downloadPath) throw new Error("Board snapshot download did not complete");
  const serialized = await readFile(downloadPath, "utf8");
  if (Buffer.byteLength(serialized) > 10 * 1024 * 1024) throw new Error("Board snapshot exceeds 10 MiB");
  return serialized;
}

function addCheck(
  checks: SanityCheck[],
  id: string,
  label: string,
  expected: string,
  observed: string,
  passed: boolean,
) {
  let status: SanityCheck["status"] = "failed";
  if (passed) status = "passed";
  checks.push({ id, label, status, expected, observed });
}
