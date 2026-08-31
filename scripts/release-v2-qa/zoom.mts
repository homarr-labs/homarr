import { lstat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { assertSafeZoomOutput } from "./safety.mts";

const allowedFactorStrings = new Set(["0.8", "1", "1.25", "2"]);

interface ZoomOptions {
  origin: string;
  factor: number;
  outputDirectory: string;
}

const usage = () => {
  console.log("Usage: zoom.mts --origin <http(s)-origin> --factor <0.8|1|1.25|2> --output <new-absolute-directory>");
};

const validateOrigin = (value: string) => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("--origin must be a valid HTTP(S) origin");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("--origin must use http: or https:");
  }
  if (url.username || url.password) {
    throw new Error("--origin must not contain credentials");
  }
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("--origin must not contain a path, query, or fragment");
  }

  return url.origin;
};

const validateOutputDirectory = async (value: string) => {
  if (!path.isAbsolute(value)) {
    throw new Error("--output must be an absolute path to a new directory");
  }

  const outputDirectory = await assertSafeZoomOutput(value, { allowMissing: true });

  let outputExists = true;
  try {
    await lstat(outputDirectory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    outputExists = false;
  }
  if (outputExists) throw new Error(`--output must not already exist: ${outputDirectory}`);
  return outputDirectory;
};

export const parseZoomOptions = async (rawArguments: string[]): Promise<ZoomOptions> => {
  const args = rawArguments.filter((argument) => argument !== "--");
  let origin: string | undefined;
  let factorString: string | undefined;
  let output: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = args[index + 1];
    if (argument === "--origin" && value) {
      origin = value;
      index += 1;
      continue;
    }
    if (argument === "--factor" && value) {
      factorString = value;
      index += 1;
      continue;
    }
    if (argument === "--output" && value) {
      output = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown or incomplete argument: ${argument ?? "<missing>"}`);
  }

  if (!origin) throw new Error("--origin is required");
  if (!factorString) throw new Error("--factor is required");
  if (!allowedFactorStrings.has(factorString)) {
    throw new Error("--factor must be one of 0.8, 1, 1.25, or 2");
  }
  if (!output) throw new Error("--output is required");

  return {
    origin: validateOrigin(origin),
    factor: Number(factorString),
    outputDirectory: await validateOutputDirectory(output),
  };
};

export const createZoomExtensionContent = (origin: string, factor: number) => {
  const manifest = {
    manifest_version: 3,
    name: "Homarr release v2 native zoom",
    version: "1.0.0",
    permissions: ["tabs"],
    host_permissions: [`${origin}/*`],
    background: { service_worker: "background.js" },
  };
  const background = `const TARGET_ORIGIN = ${JSON.stringify(origin)};
const ZOOM_FACTOR = ${JSON.stringify(factor)};

function applyZoom(tab) {
  if (tab?.id == null || !tab.url) return;

  let origin;
  try {
    origin = new URL(tab.url).origin;
  } catch {
    return;
  }
  if (origin !== TARGET_ORIGIN) return;

  chrome.tabs.setZoom(tab.id, ZOOM_FACTOR, () => {
    void chrome.runtime.lastError;
  });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== "complete") return;
  applyZoom({ ...tab, id: tabId });
});

chrome.tabs.query({}, (tabs) => {
  tabs.forEach(applyZoom);
});
`;

  return {
    manifest: `${JSON.stringify(manifest, null, 2)}\n`,
    background,
  };
};

export const generateZoomExtension = async (options: ZoomOptions) => {
  const content = createZoomExtensionContent(options.origin, options.factor);
  await assertSafeZoomOutput(options.outputDirectory, { allowMissing: true });
  await mkdir(options.outputDirectory, { mode: 0o700 });
  await assertSafeZoomOutput(options.outputDirectory);
  await Promise.all([
    writeFile(path.join(options.outputDirectory, "manifest.json"), content.manifest, { flag: "wx", mode: 0o600 }),
    writeFile(path.join(options.outputDirectory, "background.js"), content.background, { flag: "wx", mode: 0o600 }),
  ]);
};

const main = async () => {
  const rawArguments = process.argv.slice(2);
  if (rawArguments.includes("--help") || rawArguments.includes("-h")) {
    usage();
    return;
  }

  const options = await parseZoomOptions(rawArguments);
  await generateZoomExtension(options);
  console.log(`Generated release-v2 native zoom extension`);
  console.log(`Origin: ${options.origin}`);
  console.log(`Factor: ${options.factor}`);
  console.log(`Output: ${options.outputDirectory}`);
};

const isDirectExecution = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(fileURLToPath(import.meta.url)).href
  : false;
if (isDirectExecution) await main();
