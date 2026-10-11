import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

interface RequestMeasurement {
  name: string;
  status: number;
  requestBytesRaw: number;
  requestBytesGzipEstimate: number;
  responseBytesRaw: number;
  responseBytesGzipEstimate: number;
}

const server = await createServer({ configFile: new URL("./vite.config.mts", import.meta.url).pathname });
await server.listen();

const results: object[] = [];
let activeBrowser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
const pairArgument = process.argv.find((argument) => argument.startsWith("--pairs="));
const pairCount = pairArgument ? Number(pairArgument.slice("--pairs=".length)) : 1;
assert(Number.isInteger(pairCount) && pairCount > 0, "--pairs must be a positive integer");
const baselineSource = resolve(import.meta.dirname, "../../baseline-source/apps/nextjs/src/app/[locale]/manage/boards/_components/board-card.tsx");
const productionSource = resolve(import.meta.dirname, "../../../../apps/nextjs/src/app/[locale]/manage/boards/_components/board-card.tsx");
const baselineSourceSha256 = createHash("sha256").update(readFileSync(baselineSource)).digest("hex");
const productionSourceSha256 = createHash("sha256").update(readFileSync(productionSource)).digest("hex");
const gitRevision = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const chromeArgs = ["--renderer-process-limit=2"];

const takeSnapshotAsync = async (page: import("@playwright/test").Page, cdp: import("@playwright/test").CDPSession) => {
  await cdp.send("HeapProfiler.collectGarbage");
  const heap = await cdp.send("Runtime.getHeapUsage");
  const pageState = await page.evaluate(() => {
    const queries = window.__boardAudit.queryClient
      .getQueryCache()
      .getAll()
      .filter((query) => query.queryKey[0] === "board.exists");
    return {
      domNodes: document.getElementsByTagName("*").length,
      queryCount: queries.length,
      queryObservers: queries.reduce((sum, query) => sum + query.getObserversCount(), 0),
      retainedQueryJsonBytes: new TextEncoder().encode(JSON.stringify(queries.map((query) => query.state.data))).byteLength,
      queryStates: queries.map((query) => ({
        name: query.queryKey[1],
        status: query.state.status,
        hasData: query.state.data !== undefined,
        observers: query.getObserversCount(),
      })),
      mutationCalls: window.__boardAudit.mutationCalls.length,
      transitionEvents: [...window.__boardAudit.transitions],
      collapseInlineStyles: Array.from(document.querySelectorAll(`[data-testid="board-card-0"] *`))
        .map((element) => ({ height: (element as HTMLElement).style.height, transition: (element as HTMLElement).style.transition }))
        .filter(({ height, transition }) => height.length > 0 || transition.length > 0)
        .slice(0, 4),
    };
  });
  return { heapUsedBytesAfterGc: heap.usedSize, ...pageState };
};

try {
  for (const size of [1, 25, 100]) {
    for (const permission of ["create", "none"] as const) {
      for (let pairIndex = 0; pairIndex < pairCount; pairIndex++) {
        const variants = pairIndex % 2 === 0 ? (["baseline", "candidate"] as const) : (["candidate", "baseline"] as const);
        for (const variant of variants) {
        const browser = await chromium.launch({ headless: true, args: chromeArgs });
        activeBrowser = browser;
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        const requests: RequestMeasurement[] = [];
        const pageErrors: string[] = [];
        page.on("pageerror", (error) => pageErrors.push(error.message));
        page.on("requestfailed", (request) => pageErrors.push(`FAILED ${request.url()}: ${request.failure()?.errorText ?? "unknown request failure"}`));
        page.on("console", (message) => {
          if (message.type() === "error") pageErrors.push(message.text());
        });
        page.on("response", async (response) => {
          if (response.status() >= 400 || response.url().includes("board-card.tsx")) {
            pageErrors.push(`HTTP ${response.status()} ${response.url()} ${await response.text().catch(() => "<unreadable response>")}`);
          }
        });

        await page.route("**/__synthetic/board.exists", async (route) => {
          const requestBody = route.request().postDataBuffer() ?? Buffer.alloc(0);
          const input = JSON.parse(requestBody.toString("utf8")) as { name: string };
          const forbidden = permission === "none";
          const responseBody = Buffer.from(JSON.stringify(forbidden ? { error: "FORBIDDEN" } : /^Board-\d+$/u.test(input.name)));
          const responseBytesGzip = gzipSync(responseBody);
          requests.push({
            name: input.name,
            status: forbidden ? 403 : 200,
            requestBytesRaw: requestBody.byteLength,
            requestBytesGzipEstimate: gzipSync(requestBody).byteLength,
            responseBytesRaw: responseBody.byteLength,
            responseBytesGzipEstimate: responseBytesGzip.byteLength,
          });
          await route.fulfill({
            status: forbidden ? 403 : 200,
            headers: { "content-type": "application/json" },
            body: responseBody,
          });
        });

        await page.goto(
          `${server.resolvedUrls.local[0]}?size=${size}&variant=${variant}&permission=${permission}`,
          { waitUntil: "networkidle" },
        );
        try {
          await page.getByTestId("board-card-0").waitFor({ state: "attached" });
        } catch {
          throw new Error(`BoardCard did not mount (${variant}, ${size} boards): ${pageErrors.join("\n")}`);
        }
        await page.waitForTimeout(500);
        const snapshots = [{ stage: "initial-collapsed", ...(await takeSnapshotAsync(page, cdp)) }];
        const measurementsBeforeCycles = requests.length;
        const mutationCountBeforeCycles = await page.evaluate(() => window.__boardAudit.mutationCalls.length);
        const semantics: object[] = [];
        const openLatencyMeasurements: { cycle: number; menuItemToVisibleInputMs: number }[] = [];

        for (let cycle = 0; cycle < 5; cycle++) {
          if (permission === "create") {
            const boardIndex = cycle % size;
            const card = page.getByTestId(`board-card-${boardIndex}`);
            await card.getByRole("button", { name: "Settings" }).click();
            const openStart = await page.evaluate(() => performance.now());
            await page.getByRole("menuitem", { name: "Duplicate board" }).click();
            const form = card.locator("form");
            const input = form.getByRole("textbox", { name: "Name" });
            await input.waitFor({ state: "visible" });
            const inputVisibleAt = await page.evaluate(() => performance.now());
            openLatencyMeasurements.push({ cycle, menuItemToVisibleInputMs: inputVisibleAt - openStart });
            try {
              await form.getByText("Board name already exists").waitFor({ state: "visible", timeout: 5000 });
            } catch {
              throw new Error(
                `Expected existing-name validation; observed form text=${JSON.stringify(await form.innerText())}, synthetic requests=${JSON.stringify(requests)}`,
              );
            }
            const initialName = await input.inputValue();
            const submitButton = form.getByRole("button", { name: "Duplicate board" });
            const initialSubmitDisabled = await submitButton.isDisabled();
            snapshots.push({ stage: `open-cycle-${cycle + 1}`, ...(await takeSnapshotAsync(page, cdp)) });
            if (cycle === 0) {
              await input.fill("Fresh-0");
              await form.getByText("Name Fresh-0 is available").waitFor({ state: "visible" });
              const availableSubmitEnabled = await submitButton.isEnabled();
              await submitButton.click();
              const mutationCount = await page.evaluate(() => window.__boardAudit.mutationCalls.length);
              semantics.push({
                cycle,
                initialName,
                initialSubmitDisabled,
                existingNameValidation: "Board name already exists",
                availableNameValidation: "Name Fresh-0 is available",
                availableSubmitEnabled,
                submitted: mutationCount === mutationCountBeforeCycles + 1,
              });
            } else {
              if (cycle === 1) {
                await input.fill("Unsubmitted draft");
                await form.getByRole("button", { name: "Cancel" }).click();
                await page.waitForTimeout(250);

                await card.getByRole("button", { name: "Settings" }).click();
                await page.getByRole("menuitem", { name: "Duplicate board" }).click();
                const reopenedInput = card.locator("form").getByRole("textbox", { name: "Name" });
                await reopenedInput.waitFor();
                const reopenedName = await reopenedInput.inputValue();
                assert.equal(reopenedName, initialName, "Reopening after cancel should reset the draft to the board name");
                await card.locator("form").getByRole("button", { name: "Cancel" }).click();
                semantics.push({
                  cycle,
                  initialName,
                  initialSubmitDisabled,
                  cancelled: true,
                  editedDraft: "Unsubmitted draft",
                  reopenedName,
                  draftResetOnReopen: reopenedName === initialName,
                });
              } else {
                await form.getByRole("button", { name: "Cancel" }).click();
                semantics.push({ cycle, initialName, initialSubmitDisabled, cancelled: true });
              }
            }
            await page.waitForTimeout(250);
          }

          await page.getByTestId("navigate-away").click();
          await page.getByTestId("navigate-back").click();
          await page.getByTestId("board-card-0").waitFor();
          await page.waitForTimeout(50);
          snapshots.push({ stage: `after-cycle-${cycle + 1}-navigation`, ...(await takeSnapshotAsync(page, cdp)) });
        }

        const mutationCountAfterCycles = await page.evaluate(() => window.__boardAudit.mutationCalls.length);
        results.push({
          size,
          pairIndex,
          variant,
          permission,
          browserVersion: browser.version(),
          requestCountInitial: measurementsBeforeCycles,
          requestCountTotal: requests.length,
          requestBytesRawTotal: requests.reduce((sum, request) => sum + request.requestBytesRaw, 0),
          requestBytesGzipEstimateTotal: requests.reduce((sum, request) => sum + request.requestBytesGzipEstimate, 0),
          responseBytesRawTotal: requests.reduce((sum, request) => sum + request.responseBytesRaw, 0),
          responseBytesGzipEstimateTotal: requests.reduce((sum, request) => sum + request.responseBytesGzipEstimate, 0),
          forbiddenRequestCount: requests.filter((request) => request.status === 403).length,
          mutatedOnceDuringValidationScenario:
            permission === "create" && mutationCountAfterCycles - mutationCountBeforeCycles === 1,
          semantics,
          openLatencyMeasurements,
          requests,
          snapshots,
        });
        await context.close();
        await browser.close();
        activeBrowser = undefined;
        }
      }
    }
  }

  for (const size of [1, 25, 100]) {
    for (const permission of ["create", "none"] as const) {
      for (let pairIndex = 0; pairIndex < pairCount; pairIndex++) {
        const baseline = results.find((entry) => {
          const run = entry as { size: number; pairIndex: number; variant: string; permission: string };
          return run.size === size && run.pairIndex === pairIndex && run.variant === "baseline" && run.permission === permission;
        }) as { semantics: object[] };
        const candidate = results.find((entry) => {
          const run = entry as { size: number; pairIndex: number; variant: string; permission: string };
          return run.size === size && run.pairIndex === pairIndex && run.variant === "candidate" && run.permission === permission;
        }) as { semantics: object[] };
        assert.deepEqual(candidate.semantics, baseline.semantics, `Visible form labels, validation, submit, cancel, and draft reset should match at ${size} boards (${permission}, pair ${pairIndex + 1})`);
      }
    }
  }

  const artifact = {
        environment: {
          browser: "Recorded per run; each variant ran in a fresh headless Chromium process",
          browserLaunchArgs: chromeArgs,
          processIsolation: "Fresh Chromium process and BrowserContext for every baseline/candidate variant; renderer process cap 2",
          nodeVersion: process.version,
          gitRevision,
          baselineBoardCardSourceSha256: baselineSourceSha256,
          productionBoardCardSourceSha256: productionSourceSha256,
          harness: "Vite dev server, ReactDOM client render, installed Mantine 9.6.0 Collapse, React 19 Activity, TanStack Query 5.101.2",
          browserData: "Synthetic BoardCard props; no Homarr server, database, images, thumbnails, or remote integrations",
          targetComponents: "BoardCard from frozen baseline snapshot; live DuplicateBoardForm and live useBoardNameStatus/BoardNameAvailability",
          candidateDelta: "Instrumentation-only transform adds keepMounted={false} to the baseline Collapse prop",
          transport: "Synthetic HTTP POST intercepted by Playwright with raw JSON bodies; gzip sizes are calculated estimates and are not browser-measured compressed transfer bytes",
          staleTimeMs: 30_000,
          gcTimeMs: 300_000,
          afterGcMethod: "CDP HeapProfiler.collectGarbage followed by Runtime.getHeapUsage",
          runs: `1, 25, 100 boards x ${pairCount} alternating baseline/candidate pairs x board-create/no-board-create; five open/close/navigation cycles; each run uses a fresh Chromium process and BrowserContext`,
        },
        results,
      };
  const outputPath = resolve(import.meta.dirname, `../board-card-browser-${pairCount === 1 ? "results" : `pairs-${pairCount}`}.json`);
  writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(artifact, null, 2)}\n`);
} finally {
  await activeBrowser?.close();
  await server.close();
}
