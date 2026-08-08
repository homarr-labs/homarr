/**
 * Dashboard stress benchmark.
 *
 * Measures container memory for a *populated* Homarr rather than an empty one:
 * boots a fresh container, restores a real backup through the onboarding
 * restore UI (the same flow a user takes, including the "I understand"
 * confirmation), signs in, opens the busiest board, then hammers navigation and
 * soaks idle while sampling cgroup memory.
 *
 * The backup is supplied by path and never copied into the repo — it contains
 * real integration secrets.
 *
 * Usage:
 *   STRESS_IMAGE=homarr-bench:baseline \
 *   STRESS_BACKUP_ZIP=~/Downloads/homarr-backup.zip \
 *   node --experimental-strip-types scripts/benchmarks/stress-restore.mts
 */
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { chromium } from "@playwright/test";
import type { Page } from "@playwright/test";

import { parseStressSnapshot, stressMemoryScript, summarizeStress, toMiB } from "./stress-restore-lib.mts";
import type { StressCheckpoint } from "./stress-restore-lib.mts";

const execFileAsync = promisify(execFile);

const requireEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const image = requireEnv("STRESS_IMAGE");
const backupZip = path.resolve(requireEnv("STRESS_BACKUP_ZIP").replace(/^~/, os.homedir()));
const label = process.env.STRESS_LABEL ?? image.replace(/[^a-z0-9]+/gi, "-");
const memoryLimit = process.env.STRESS_MEMORY_LIMIT ?? "2g";
const heapMb = process.env.STRESS_HEAP_MB ?? "";
const navIterations = Number(process.env.STRESS_NAV_ITERATIONS ?? 6);
const soakMs = Number(process.env.STRESS_SOAK_MS ?? 120_000);
const soakIntervalMs = Number(process.env.STRESS_SOAK_INTERVAL_MS ?? 20_000);
const keepContainer = process.env.STRESS_KEEP_CONTAINER === "true";
const outputDirectory = path.resolve(process.env.STRESS_OUTPUT ?? `.bench/stress/${label}`);

const password = process.env.STRESS_PASSWORD ?? "demodemo";
const username = process.env.STRESS_USERNAME ?? "demo";
/** Board to stress. The backup's busiest board (28 items / 16 widget kinds). */
const boardName = process.env.STRESS_BOARD ?? "default";

const containerName = `homarr-stress-${Date.now()}`;
const checkpoints: StressCheckpoint[] = [];
let startedAt = Date.now();

const log = (message: string) => console.log(`[stress:${label}] ${message}`);

const captureAsync = async (name: string) => {
  const { stdout } = await execFileAsync("docker", ["exec", containerName, "sh", "-c", stressMemoryScript], {
    maxBuffer: 8 * 1024 * 1024,
  });
  await writeFile(path.join(outputDirectory, `${name}.txt`), stdout);
  const checkpoint = parseStressSnapshot(name, Date.now() - startedAt, stdout);
  checkpoints.push(checkpoint);
  log(`${name}: container=${toMiB(checkpoint.container.currentBytes)} MiB`);
  return checkpoint;
};

const waitForReadyAsync = async (baseUrl: string, timeoutMs = 180_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/api/health/ready`);
      if (response.ok) return;
    } catch {
      // Socket not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error(`Container never became ready at ${baseUrl}`);
};

/**
 * The restored backup's boards are private and owned by another account, and
 * the demo user has no home board. Grant access explicitly so the measurement
 * targets a fully-populated board instead of an empty state.
 */
const applyAccessFixtureAsync = async () => {
  const script = `
const Database = require("/app/node_modules/better-sqlite3");
const db = new Database("/appdata/db/db.sqlite");
const user = db.prepare("SELECT id FROM user WHERE name = ?").get(process.argv[1]);
if (!user) throw new Error("user not found: " + process.argv[1]);
const board = db.prepare("SELECT id FROM board WHERE name = ?").get(process.argv[2]);
if (!board) throw new Error("board not found: " + process.argv[2]);
const adminGroup = db.prepare("SELECT group_id AS id FROM groupPermission WHERE permission = 'admin' LIMIT 1").get();
if (adminGroup) {
  db.prepare("INSERT OR IGNORE INTO groupMember (group_id, user_id) VALUES (?, ?)").run(adminGroup.id, user.id);
}
db.prepare("UPDATE user SET home_board_id = ?, mobile_home_board_id = ? WHERE id = ?").run(board.id, board.id, user.id);
db.close();
console.log("fixture-applied");
`;
  const { stdout } = await execFileAsync("docker", ["exec", containerName, "node", "-e", script, username, boardName]);
  if (!stdout.includes("fixture-applied")) throw new Error(`Access fixture failed: ${stdout}`);
  log("access fixture applied (admin group + home board)");
};

const restoreBackupAsync = async (page: Page, baseUrl: string) => {
  // networkidle (not domcontentloaded): the toggle below is a client component, and
  // clicking it before hydration silently does nothing.
  await page.goto(`${baseUrl}/init`, { waitUntil: "networkidle" });

  // The onboarding start step hides the restore dropzone behind a toggle. Retry the
  // click until the dropzone's file input exists, so a slow hydration cannot make the
  // whole run fail.
  const expandRestore = page.getByRole("button", { name: /restore.*sqlite|sqlite.*restore|restore.*backup/i });
  const fileInput = page.locator('input[type="file"]');
  for (let attempt = 1; attempt <= 3; attempt++) {
    if ((await fileInput.count()) > 0) break;
    await expandRestore.first().click({ timeout: 30_000 });
    await fileInput
      .first()
      .waitFor({ state: "attached", timeout: 10_000 })
      .catch(() => log(`restore toggle click ${attempt} did not reveal the dropzone, retrying`));
  }
  await fileInput.first().waitFor({ state: "attached", timeout: 30_000 });

  await fileInput.first().setInputFiles(backupZip);
  log("backup uploaded, waiting for analysis");

  const continueButton = page.getByRole("button", { name: /continue to restore|continue/i });
  await continueButton.first().waitFor({ state: "visible", timeout: 180_000 });
  await continueButton.first().click();

  const confirmInput = page.locator('input[placeholder="I understand"]');
  await confirmInput.waitFor({ state: "visible", timeout: 30_000 });
  await confirmInput.fill("I understand");
  log('typed "I understand"');

  const submit = page.getByRole("button", { name: /restore|confirm/i }).last();
  await submit.click();
  log("restore submitted; server will exit and be restarted by run.sh");
};

const loginAsync = async (page: Page, baseUrl: string) => {
  await page.goto(`${baseUrl}/auth/login`, { waitUntil: "domcontentloaded" });
  // Selectors mirror e2e/lazy-widgets.spec.ts: getByLabel(/password/i) is ambiguous
  // because Mantine's PasswordInput also renders a visibility-toggle button.
  await page.getByLabel("Username").fill(username);
  await page.locator("#password").fill(password);
  await page.locator("css=button[type='submit']").click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/login"), { timeout: 60_000 });
  log(`signed in as ${username}`);
};

const waitForBoardAsync = async (page: Page) => {
  const boardSelector = "[data-homarr-dev-benchmark-board]";
  await page.locator(boardSelector).waitFor({ state: "visible", timeout: 120_000 });
  // Every grid item must have mounted its content (ready or explicitly errored),
  // otherwise memory is sampled mid-render and understates the real cost.
  await page
    .waitForFunction(
      (selector) => {
        const board = document.querySelector(selector);
        const items = [...(board?.querySelectorAll('[data-type="item"]') ?? [])];
        return (
          items.length > 0 &&
          items.every(
            (item) =>
              item.querySelector("[data-homarr-widget-ready]") !== null ||
              item.querySelector("[data-homarr-widget-error]") !== null,
          )
        );
      },
      boardSelector,
      { timeout: 120_000 },
    )
    .catch(() => log("warning: not all widgets reported ready/error before timeout"));
  const outcome = await page.evaluate((selector) => {
    const board = document.querySelector(selector);
    const items = [...(board?.querySelectorAll('[data-type="item"]') ?? [])];
    return {
      items: items.length,
      ready: items.filter((item) => item.querySelector("[data-homarr-widget-ready]") !== null).length,
      errored: items.filter((item) => item.querySelector("[data-homarr-widget-error]") !== null).length,
    };
  }, boardSelector);
  log(`board rendered: ${outcome.items} items (${outcome.ready} ready, ${outcome.errored} errored)`);
  return outcome;
};

const main = async () => {
  await rm(outputDirectory, { recursive: true, force: true });
  await mkdir(outputDirectory, { recursive: true });
  await readFile(backupZip); // Fail fast if the backup path is wrong.

  log(`image=${image} memoryLimit=${memoryLimit} heapMb=${heapMb || "(image default)"}`);

  const runArgs = [
    "run",
    "-d",
    "--name",
    containerName,
    "--cpus",
    process.env.STRESS_CPUS ?? "4",
    "--memory",
    memoryLimit,
    "--memory-swap",
    memoryLimit,
    "-p",
    "0:7575",
    // Restore re-encrypts the backup's secrets to this key, so any 64-hex value works.
    "-e",
    `SECRET_ENCRYPTION_KEY=${"0".repeat(64)}`,
    // Silences Homarr's own outbound work (update check, icon repos, analytics) so
    // the measurement is not perturbed by internet reachability. Integration widget
    // requests are NOT gated by this flag, so integration clients still load.
    "-e",
    "NO_EXTERNAL_CONNECTION=true",
    "-e",
    "LOG_LEVEL=warn",
  ];
  if (heapMb) runArgs.push("-e", `HOMARR_MAX_OLD_SPACE_SIZE=${heapMb}`);
  runArgs.push(image);

  await execFileAsync("docker", runArgs);
  startedAt = Date.now();

  const browser = await chromium.launch();
  try {
    const { stdout: portOut } = await execFileAsync("docker", ["port", containerName, "7575"]);
    const mappedPort = portOut.trim().split("\n")[0]?.split(":").pop();
    if (!mappedPort) throw new Error(`Could not resolve mapped port from: ${portOut}`);
    const baseUrl = `http://127.0.0.1:${mappedPort}`;
    log(`container up at ${baseUrl}`);

    await waitForReadyAsync(baseUrl);
    // Let boot-time work (cron registration, first GC) settle before the idle baseline.
    await new Promise((resolve) => setTimeout(resolve, 15_000));
    await captureAsync("01-boot-idle");

    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const page = await context.newPage();

    await restoreBackupAsync(page, baseUrl);
    // The import route exits the process; run.sh restarts it.
    await new Promise((resolve) => setTimeout(resolve, 5_000));
    await waitForReadyAsync(baseUrl);
    await captureAsync("02-post-restore");

    await applyAccessFixtureAsync();

    await context.close();
    const freshContext = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    const freshPage = await freshContext.newPage();

    await loginAsync(freshPage, baseUrl);
    await captureAsync("03-post-login");

    await freshPage.goto(`${baseUrl}/boards/${boardName}`, { waitUntil: "domcontentloaded" });
    const boardOutcome = await waitForBoardAsync(freshPage);
    await captureAsync("04-board-loaded");

    log(`stress: ${navIterations} reload iterations`);
    for (let iteration = 0; iteration < navIterations; iteration++) {
      await freshPage.goto(`${baseUrl}/boards/${boardName}`, { waitUntil: "domcontentloaded" });
      await waitForBoardAsync(freshPage);
      await captureAsync(`nav-${String(iteration + 1).padStart(2, "0")}`);
    }
    await captureAsync("05-after-stress");

    log(`soak: ${soakMs}ms idle with board open`);
    const soakDeadline = Date.now() + soakMs;
    let soakIndex = 0;
    while (Date.now() < soakDeadline) {
      await new Promise((resolve) => setTimeout(resolve, soakIntervalMs));
      await captureAsync(`soak-${String(++soakIndex).padStart(2, "0")}`);
    }
    await captureAsync("06-final");

    const summary = {
      label,
      image,
      imageRevision: (
        await execFileAsync("docker", [
          "image",
          "inspect",
          image,
          "--format",
          '{{index .Config.Labels "org.opencontainers.image.revision"}}',
        ])
      ).stdout.trim(),
      imageSizeBytes: Number(
        (await execFileAsync("docker", ["image", "inspect", image, "--format", "{{.Size}}"])).stdout.trim(),
      ),
      config: { memoryLimit, heapMb: heapMb || null, navIterations, soakMs, soakIntervalMs, boardName },
      // Recorded so an A/B pair can be rejected if the two runs rendered
      // different amounts of the board (e.g. more widgets errored on one side).
      board: boardOutcome,
      ...summarizeStress(checkpoints),
    };
    await writeFile(path.join(outputDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
    await writeFile(path.join(outputDirectory, "checkpoints.json"), `${JSON.stringify(checkpoints, null, 2)}\n`);
    console.log(JSON.stringify(summary, null, 2));

    await freshContext.close();
  } finally {
    await browser.close().catch(() => undefined);
    await execFileAsync("docker", ["logs", containerName])
      .then(({ stdout, stderr }) => writeFile(path.join(outputDirectory, "container.log"), `${stdout}\n${stderr}`))
      .catch(() => undefined);
    if (keepContainer) {
      log(`keeping container ${containerName}`);
    } else {
      // -v also drops the anonymous /appdata volume so repeated runs start clean.
      await execFileAsync("docker", ["rm", "-fv", containerName]).catch(() => undefined);
    }
  }
};

await main();
