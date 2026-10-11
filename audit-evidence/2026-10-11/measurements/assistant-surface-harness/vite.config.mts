import { createHash } from "node:crypto";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig, transformWithEsbuild } from "vite";
import ts from "typescript-compiler-api";

const harnessRoot = import.meta.dirname;
const repositoryRoot = resolve(harnessRoot, "../../../../");
const mockAssistantUi = resolve(harnessRoot, "src/mocks/assistant-ui.ts");
const mockNotifications = resolve(harnessRoot, "src/mocks/notifications.ts");
const mockTranslation = resolve(harnessRoot, "src/mocks/translation.ts");
const baselinePath = resolve(
  repositoryRoot,
  "audit-evidence/2026-10-11/baseline-source/apps/nextjs/src/components/assistant/assistant-runtime-provider.tsx",
);
const expectedSnapshotHash = "daa626be904117a790bdad03c713bdf451496952581fc2f7bfe50ac64c479204";
const sourceMode = process.env.ASSISTANT_SURFACE_SOURCE_MODE ?? "baseline";
if (sourceMode !== "baseline" && sourceMode !== "live") throw new Error(`Unknown source mode: ${sourceMode}`);
const sourcePath = sourceMode === "baseline"
  ? baselinePath
  : resolve(repositoryRoot, "apps/nextjs/src/components/assistant/assistant-runtime-provider.tsx");

const selectedNames = new Set([
  "AssistantComposerSurfaceContext",
  "surfaceElements",
  "lastFocusedSurfaceElement",
  "lastFocusedSurfaceAt",
  "AssistantSurfaceScrollPosition",
  "captureAssistantSurfaceScrollPositions",
  "restoreAssistantSurfaceScrollPositions",
  "getSurfaceIdForElement",
  "getClipboardAttachmentName",
  "AssistantComposerSurfaceEvents",
  "AssistantComposerSurfaceBoundary",
  "AssistantRunFocusPreserver",
]);

const getDeclarationName = (node: ts.Statement): string | undefined => {
  if (ts.isVariableStatement(node)) {
    const declaration = node.declarationList.declarations.find((candidate) => ts.isIdentifier(candidate.name));
    return declaration && ts.isIdentifier(declaration.name) ? declaration.name.text : undefined;
  }
  if (ts.isFunctionDeclaration(node) || ts.isInterfaceDeclaration(node)) return node.name?.text;
  return undefined;
};

const extractedBoundaryPlugin = (): Plugin => ({
  name: "assistant-surface-extract-production-boundary",
  enforce: "pre",
  resolveId(source) {
    if (source === "virtual:assistant-surface-boundary") return "\0assistant-surface-boundary.tsx";
    return undefined;
  },
  load(id) {
    if (id !== "\0assistant-surface-boundary.tsx") return undefined;

    const source = ts.sys.readFile(sourcePath);
    if (!source) throw new Error(`Missing selected source: ${sourcePath}`);
    const snapshotHash = createHash("sha256").update(source).digest("hex");
    if (sourceMode === "baseline" && snapshotHash !== expectedSnapshotHash) {
      throw new Error(`Frozen source hash mismatch: expected ${expectedSnapshotHash}, got ${snapshotHash}`);
    }
    const sourceFile = ts.createSourceFile(sourcePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const declarations = sourceFile.statements.filter((node) => {
      const name = getDeclarationName(node);
      return name !== undefined && selectedNames.has(name);
    });
    const foundNames = new Set(declarations.map(getDeclarationName));
    const missingNames = [...selectedNames].filter((name) => !foundNames.has(name));
    if (missingNames.length > 0) throw new Error(`Production snapshot extraction missed: ${missingNames.join(", ")}`);

    return `
import { createContext, useContext, useEffect, useId, useLayoutEffect, useMemo, useRef } from "react";
import type { ClipboardEvent, PropsWithChildren } from "react";
import { useAui, useAuiEvent } from ${JSON.stringify(mockAssistantUi)};
import { showErrorNotification } from ${JSON.stringify(mockNotifications)};
import { useI18n } from ${JSON.stringify(mockTranslation)};

export const __auditSourceMetadata = ${JSON.stringify({ sourceMode, sourcePath, sourceHash: snapshotHash })};
\n${declarations.map((node) => {
      const text = node.getText(sourceFile);
      return text.startsWith("export ") ? text : `export ${text}`;
    }).join("\n\n")}

// Narrow test instrumentation only: expose the existing state for assertions.
export const __auditRuntimeState = () => ({
  surfaceIds: [...surfaceElements.keys()],
  lastFocusedSurfaceElement,
  lastFocusedSurfaceAt,
});
`;
  },
  async transform(code, id) {
    if (id !== "\0assistant-surface-boundary.tsx") return undefined;
    return transformWithEsbuild(code, id, { loader: "tsx", jsx: "automatic", jsxImportSource: "react" });
  },
});

export default defineConfig({
  root: harnessRoot,
  appType: "spa",
  plugins: [extractedBoundaryPlugin(), react()],
  server: {
    host: "127.0.0.1",
    port: 0,
    strictPort: false,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
});
