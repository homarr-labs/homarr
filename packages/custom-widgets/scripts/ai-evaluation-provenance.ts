import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRootUrl = new URL("../../../", import.meta.url);
const evaluatorDependencyExtensions = new Set([".json", ".ts", ".tsx"]);

const evaluatorScriptUrls = [
  new URL("./evaluate-ai-authoring.ts", import.meta.url),
  new URL("./ai-assistant-evaluation.ts", import.meta.url),
  new URL("./ai-evaluation-provenance.ts", import.meta.url),
  new URL("./assistant-prompt-bundle.ts", import.meta.url),
  new URL("./ai-evaluation.ts", import.meta.url),
  new URL("./ai-evaluation-cases.ts", import.meta.url),
  new URL("./ai-evaluation-suites.ts", import.meta.url),
  new URL("./ai-integration-evaluation-cases.ts", import.meta.url),
  new URL("./ai-universal-integration-evaluation-cases.ts", import.meta.url),
  new URL("./benchmark-report.ts", import.meta.url),
  new URL("./benchmark-paired-report.ts", import.meta.url),
  new URL("./rejudge-ai-authoring.ts", import.meta.url),
];

const evaluatorDependencyDirectoryUrls = [
  new URL("../src/core/", import.meta.url),
  new URL("../src/jsx/", import.meta.url),
  new URL("../../api/src/router/custom-widget/", import.meta.url),
];

const evaluatorExternalDependencyUrls = [
  new URL("../../definitions/src/integration.ts", import.meta.url),
  new URL("../../definitions/src/widget.ts", import.meta.url),
  new URL("../package.json", import.meta.url),
  new URL("../../definitions/package.json", import.meta.url),
  new URL("../../../package.json", import.meta.url),
  new URL("../../../pnpm-lock.yaml", import.meta.url),
  new URL("../../../apps/nextjs/src/app/api/assistant/chat/assistant-chat-input.ts", import.meta.url),
  new URL("../../../apps/nextjs/src/app/api/assistant/chat/assistant-model-lookup.ts", import.meta.url),
  new URL("../../../apps/nextjs/src/app/api/assistant/chat/assistant-openrouter.ts", import.meta.url),
  new URL("../../../apps/nextjs/src/app/api/assistant/chat/assistant-provider-options.ts", import.meta.url),
  new URL("../../../apps/nextjs/src/app/api/assistant/chat/assistant-reasoning.ts", import.meta.url),
  new URL("../../../apps/nextjs/src/app/api/assistant/chat/assistant-tool-error.ts", import.meta.url),
  new URL("../../../apps/nextjs/src/app/api/assistant/chat/assistant-tool-groups.ts", import.meta.url),
  new URL("../../../apps/nextjs/src/app/api/assistant/chat/assistant-tool-input-repair.ts", import.meta.url),
  new URL("../../../apps/nextjs/src/app/api/assistant/chat/assistant-tool-output.ts", import.meta.url),
  new URL("../../../apps/nextjs/src/app/api/assistant/chat/assistant-tool-policy.ts", import.meta.url),
  new URL("../../../apps/nextjs/src/app/api/assistant/chat/assistant-tool-schema.ts", import.meta.url),
  new URL("../../../apps/nextjs/src/app/api/assistant/chat/custom-widget-authoring-context.ts", import.meta.url),
  new URL("../../../apps/nextjs/src/app/api/assistant/chat/route.ts", import.meta.url),
];

const collectDependencyUrls = async (directoryUrl: URL): Promise<URL[]> => {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const urls: URL[] = [];
  for (const entry of entries) {
    const entryUrl = new URL(entry.name, directoryUrl);
    if (entry.isDirectory()) {
      urls.push(...(await collectDependencyUrls(new URL(`${entry.name}/`, directoryUrl))));
      continue;
    }
    if (entry.isFile() && evaluatorDependencyExtensions.has(path.extname(entry.name))) urls.push(entryUrl);
  }
  return urls;
};

const getRepositoryRelativePath = (url: URL) =>
  path.relative(fileURLToPath(repositoryRootUrl), fileURLToPath(url)).replaceAll(path.sep, "/");

export function getAiEvaluationHarnessHash(files: readonly { path: string; content: string | Buffer }[]) {
  const hash = createHash("sha256");
  for (const file of [...files].toSorted((left, right) => left.path.localeCompare(right.path))) {
    hash.update(file.path, "utf8");
    hash.update("\0", "utf8");
    hash.update(file.content);
    hash.update("\0", "utf8");
  }
  return hash.digest("hex");
}

export async function createAiEvaluationHarnessSnapshot() {
  const directoryUrls = await Promise.all(evaluatorDependencyDirectoryUrls.map(collectDependencyUrls));
  const urls = [...evaluatorScriptUrls, ...directoryUrls.flat(), ...evaluatorExternalDependencyUrls].toSorted(
    (left, right) => left.pathname.localeCompare(right.pathname),
  );
  const files = await Promise.all(
    urls.map(async (url) => ({
      path: getRepositoryRelativePath(url),
      content: await readFile(url),
    })),
  );
  return {
    sha256: getAiEvaluationHarnessHash(files),
    files: files.map((file) => file.path),
  };
}
