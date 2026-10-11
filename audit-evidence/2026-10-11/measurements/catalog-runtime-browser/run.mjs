import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { brotliCompressSync, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import path from "node:path";
import process from "node:process";
import esbuild from "esbuild";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../");
const outputDir = path.dirname(fileURLToPath(import.meta.url));
const baselineRegistry = path.join(root, "audit-evidence/2026-10-11/overview_a-before/component-registry.ts");
const currentCore = path.join(root, "packages/custom-widgets/src/core");
const afterRegistry = path.join(currentCore, "component-registry.ts");
const generatedRuntimeCatalog = path.join(currentCore, "component-catalog.runtime.generated.json");
const sourceFiles = [
  baselineRegistry,
  afterRegistry,
  path.join(currentCore, "component-catalog.ts"),
  path.join(currentCore, "component-catalog.generated.json"),
  path.join(currentCore, "component-catalog.runtime.generated.json"),
];
const repetitions = 9;
const variants = ["before", "after"];
const modeProps = [{}, { type: "multiple" }, { type: "range" }, { multiple: true }, { mode: "checkbox" }];

await mkdir(path.join(outputDir, "bundles"), { recursive: true });
await mkdir(path.join(outputDir, "raw"), { recursive: true });

try {
  await readFile(generatedRuntimeCatalog);
} catch {
  throw new Error(`Runtime catalog not available yet: ${generatedRuntimeCatalog}`);
}

const tools = {
  node: process.version,
  esbuild: esbuild.version,
  playwright: JSON.parse(await readFile(path.join(root, "node_modules/playwright/package.json"), "utf8")).version,
  chromium: chromium.executablePath(),
  platform: process.platform,
  arch: process.arch,
};

const sourceHashes = {};
for (const file of sourceFiles) {
  const bytes = await readFile(file);
  sourceHashes[path.relative(root, file)] = createHash("sha256").update(bytes).digest("hex");
}

const makeEntry = (registryPath) => `
import {
  customJsxComponentRegistry,
  customJsxBindableComponentNames,
  getCustomJsxBindingType,
  resolveCustomJsxComponentName,
} from ${JSON.stringify(registryPath)};

const modeProps = ${JSON.stringify(modeProps)};
const bindingModes = [...customJsxBindableComponentNames].flatMap((name) =>
  modeProps.map((props) => ({ name, props, type: getCustomJsxBindingType(name, props) })),
);
const registry = customJsxComponentRegistry.map((component) => ({
  name: component.name,
  package: component.package,
  safety: component.safety,
  supportedProps: [...component.supportedProps],
  blockedProps: component.blockedProps.map(({ name, reason }) => ({ name, reason })),
  reason: component.reason ?? null,
}));
const semantic = {
  registry,
  bindableNames: [...customJsxBindableComponentNames],
  bindingModes,
};
globalThis.catalogRuntime = {
  semantic,
  resolve: resolveCustomJsxComponentName,
  bindingType: getCustomJsxBindingType,
  snapshotBytes: new TextEncoder().encode(JSON.stringify(semantic)).byteLength,
};
globalThis.catalogEvaluationEnd = performance.now();
`;

async function buildVariant(variant) {
  const sourcePath = variant === "before" ? baselineRegistry : afterRegistry;
  const result = await esbuild.build({
    absWorkingDir: root,
    stdin: { contents: makeEntry(sourcePath), resolveDir: root, sourcefile: `catalog-${variant}.ts`, loader: "ts" },
    bundle: true,
    minify: true,
    treeShaking: true,
    legalComments: "none",
    platform: "browser",
    format: "iife",
    target: ["es2022"],
    write: false,
    metafile: true,
    plugins: [
      {
        name: "baseline-catalog-import-resolution",
        setup(build) {
          build.onResolve({ filter: /^\.\/component-catalog$/ }, (args) => {
            if (variant !== "before" || path.resolve(args.importer) !== path.resolve(baselineRegistry)) return;
            return { path: path.join(currentCore, "component-catalog.ts") };
          });
        },
      },
    ],
  });
  const bytes = result.outputFiles[0].contents;
  const bundleDir = path.join(outputDir, "bundles");
  await writeFile(path.join(bundleDir, `${variant}.js`), bytes);
  await writeFile(path.join(bundleDir, `${variant}.js.gz`), gzipSync(bytes, { level: 9 }));
  await writeFile(path.join(bundleDir, `${variant}.js.br`), brotliCompressSync(bytes));
  return {
    variant,
    bundlePath: path.join(bundleDir, `${variant}.js`),
    rawBytes: bytes.byteLength,
    gzipBytes: gzipSync(bytes, { level: 9 }).byteLength,
    brotliBytes: brotliCompressSync(bytes).byteLength,
    inputBytes: Object.entries(result.metafile.inputs).reduce((total, [name, input]) => total + input.bytes, 0),
    inputs: Object.keys(result.metafile.inputs),
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

const bundles = {};
for (const variant of variants) bundles[variant] = await buildVariant(variant);

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  const variant = url.searchParams.get("variant");
  if (request.method !== "GET") {
    response.writeHead(405).end();
    return;
  }
  if (url.pathname === "/") {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    response.end("<!doctype html><html><head><meta charset=utf-8><title>Catalog measurement</title></head><body><main id=fixture>Empty catalog fixture</main></body></html>");
    return;
  }
  if (url.pathname !== "/catalog.js" || !variants.includes(variant)) {
    response.writeHead(404).end();
    return;
  }
  const bytes = await readFile(bundles[variant].bundlePath);
  const acceptEncoding = request.headers["accept-encoding"] ?? "";
  let contentEncoding = "identity";
  let body = bytes;
  if (/\bbr\b/.test(acceptEncoding)) {
    contentEncoding = "br";
    body = brotliCompressSync(bytes);
  } else if (/\bgzip\b/.test(acceptEncoding)) {
    contentEncoding = "gzip";
    body = gzipSync(bytes, { level: 9 });
  }
  const headers = {
    "content-type": "text/javascript; charset=utf-8",
    "content-length": body.byteLength,
    "cache-control": "no-store",
    "x-fixture-variant": variant,
    "x-fixture-content-encoding": contentEncoding,
    "x-fixture-encoded-body-length": body.byteLength,
  };
  if (contentEncoding !== "identity") headers["content-encoding"] = contentEncoding;
  response.writeHead(200, headers);
  response.end(body);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const baseUrl = `http://127.0.0.1:${address.port}`;
const rawRuns = [];

async function measureRun(variant, pair, order) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("HeapProfiler.enable");
    await cdp.send("DOM.enable");
    let scriptRequest = null;
    const dataEvents = [];
    cdp.on("Network.requestWillBeSent", (event) => {
      if (event.request.url.includes("/catalog.js")) {
        scriptRequest = { requestId: event.requestId, startTimestamp: event.timestamp };
      }
    });
    cdp.on("Network.responseReceived", (event) => {
      if (event.response.url.includes("/catalog.js")) {
        if (scriptRequest?.requestId === event.requestId) {
          scriptRequest.response = {
            status: event.response.status,
            mimeType: event.response.mimeType,
            encodedDataLength: event.response.encodedDataLength,
            headers: event.response.headers,
          };
        }
      }
    });
    cdp.on("Network.dataReceived", (event) => {
      if (scriptRequest?.requestId === event.requestId) {
        dataEvents.push({ encodedDataLength: event.encodedDataLength, dataLength: event.dataLength });
      }
    });
    cdp.on("Network.loadingFinished", (event) => {
      if (scriptRequest?.requestId === event.requestId) scriptRequest.endTimestamp = event.timestamp;
    });

    await page.goto(baseUrl, { waitUntil: "load" });
    await cdp.send("HeapProfiler.collectGarbage");
    const beforeHeap = await cdp.send("Runtime.getHeapUsage");
    const beforeDom = await cdp.send("Memory.getDOMCounters");
    const beforeListeners = await getListenerCounts(cdp);

    await page.evaluate(() => {
      globalThis.catalogEvaluationStart = performance.now();
    });
    const browserLoadStart = Date.now();
    await page.addScriptTag({ url: `${baseUrl}/catalog.js?variant=${variant}&pair=${pair}` });
    const scriptLoadWallMs = Date.now() - browserLoadStart;
    await cdp.send("HeapProfiler.collectGarbage");
    const afterHeap = await cdp.send("Runtime.getHeapUsage");
    const afterDom = await cdp.send("Memory.getDOMCounters");
    const afterListeners = await getListenerCounts(cdp);
    const result = await page.evaluate(() => ({
      semantic: globalThis.catalogRuntime.semantic,
      snapshotBytes: globalThis.catalogRuntime.snapshotBytes,
      evalMs: globalThis.catalogEvaluationEnd - globalThis.catalogEvaluationStart,
      nodeCount: document.querySelectorAll("*").length,
    }));
    let responseBodyBytes = null;
    if (scriptRequest?.requestId) {
      try {
        const responseBody = await cdp.send("Network.getResponseBody", { requestId: scriptRequest.requestId });
        responseBodyBytes = responseBody.base64Encoded
          ? Buffer.from(responseBody.body, "base64").byteLength
          : Buffer.byteLength(responseBody.body);
      } catch {
        // CDP may evict the body after collection; encoded Network.dataReceived remains archived.
      }
    }
    const encodedDataLength = dataEvents.reduce((total, event) => total + event.encodedDataLength, 0);
    const row = {
      pair,
      order,
      variant,
      heap: {
        beforeBytes: beforeHeap.usedSize,
        afterBytes: afterHeap.usedSize,
        deltaBytes: afterHeap.usedSize - beforeHeap.usedSize,
      },
      dom: {
        before: beforeDom,
        after: afterDom,
        fixtureElementCount: result.nodeCount,
      },
      listeners: { before: beforeListeners, after: afterListeners },
      catalog: { semantic: result.semantic, snapshotBytes: result.snapshotBytes },
      timing: {
        scriptLoadWallMs,
        requestToFixtureInitializationMs: result.evalMs,
        cdpColdRequestMs:
          scriptRequest?.endTimestamp !== undefined && scriptRequest.startTimestamp !== undefined
            ? (scriptRequest.endTimestamp - scriptRequest.startTimestamp) * 1000
            : null,
      },
      transfer: {
        requestUrl: `${baseUrl}/catalog.js?variant=${variant}&pair=${pair}`,
        contentEncoding: scriptRequest?.response?.headers?.["x-fixture-content-encoding"] ?? null,
        responseHeaderEncodedLength: scriptRequest?.response?.headers?.["x-fixture-encoded-body-length"] ?? null,
        cdpEncodedBodyBytes: encodedDataLength,
        cdpBodyDecodedBytes: responseBodyBytes,
        dataEvents,
      },
    };
    rawRuns.push(row);
    await writeFile(path.join(outputDir, "raw", `pair-${String(pair).padStart(2, "0")}-${variant}.json`), JSON.stringify(row, null, 2));
    return row;
  } finally {
    await browser.close();
  }
}

async function getListenerCounts(cdp) {
  const counts = {};
  for (const target of ["window", "document", "document.body"]) {
    const { result } = await cdp.send("Runtime.evaluate", { expression: target, objectGroup: "catalog-listeners" });
    if (!result.objectId) {
      counts[target] = null;
      continue;
    }
    try {
      const listeners = await cdp.send("DOMDebugger.getEventListeners", { objectId: result.objectId, depth: 0 });
      counts[target] = listeners.listeners.length;
    } finally {
      await cdp.send("Runtime.releaseObject", { objectId: result.objectId });
    }
  }
  await cdp.send("Runtime.releaseObjectGroup", { objectGroup: "catalog-listeners" });
  return counts;
}

try {
  for (let pair = 1; pair <= repetitions; pair += 1) {
    const order = pair % 2 === 1 ? variants : [...variants].reverse();
    for (const variant of order) await measureRun(variant, pair, order.join("-"));
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}

const beforeRows = rawRuns.filter((row) => row.variant === "before");
const afterRows = rawRuns.filter((row) => row.variant === "after");
const parity = JSON.stringify(beforeRows[0]?.catalog.semantic) === JSON.stringify(afterRows[0]?.catalog.semantic);
const summary = {
  scope: "isolated loopback catalog fixture; not a deployed Next.js route",
  repetitionsPerVariant: repetitions,
  parity,
  tools,
  sourceHashes,
  bundles: Object.fromEntries(variants.map((variant) => [variant, bundles[variant]])),
  metrics: Object.fromEntries(
    variants.map((variant) => {
      const rows = rawRuns.filter((row) => row.variant === variant);
      return [
        variant,
        {
          heapDeltaBytes: stats(rows.map((row) => row.heap.deltaBytes)),
          postLoadHeapBytes: stats(rows.map((row) => row.heap.afterBytes)),
          moduleDataJsonBytes: stats(rows.map((row) => row.catalog.snapshotBytes)),
          domNodeCount: stats(rows.map((row) => row.dom.after.nodes)),
          listenerCounts: rows[0]?.listeners,
          cdpEncodedBodyBytes: stats(rows.map((row) => row.transfer.cdpEncodedBodyBytes)),
          cdpDecodedBodyBytes: stats(rows.map((row) => row.transfer.cdpBodyDecodedBytes).filter(Number.isFinite)),
          coldRequestMs: stats(rows.map((row) => row.timing.cdpColdRequestMs).filter(Number.isFinite)),
          requestToFixtureInitializationMs: stats(rows.map((row) => row.timing.requestToFixtureInitializationMs)),
        },
      ];
    }),
  ),
  runFiles: rawRuns.map((row) => `raw/pair-${String(row.pair).padStart(2, "0")}-${row.variant}.json`),
};
await writeFile(path.join(outputDir, "provenance.json"), JSON.stringify({ tools, sourceHashes }, null, 2));
await writeFile(path.join(outputDir, "raw-runs.jsonl"), `${rawRuns.map((row) => JSON.stringify(row)).join("\n")}\n`);
await writeFile(path.join(outputDir, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ parity, bundles: summary.bundles, metrics: summary.metrics }, null, 2));

function stats(values) {
  const sorted = values.toSorted((left, right) => left - right);
  if (!sorted.length) return { count: 0, median: null, min: null, max: null, values };
  return {
    count: sorted.length,
    median: sorted[Math.floor(sorted.length / 2)],
    min: sorted[0],
    max: sorted.at(-1),
    values,
  };
}
