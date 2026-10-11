import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const beforeRoot = resolve(repositoryRoot, "audit-evidence/2026-10-11/production-analyzer-before");
const afterRoot = resolve(repositoryRoot, "apps/nextjs/.next/diagnostics/analyze/data");

async function readData(filePath) {
  const buffer = await readFile(filePath);
  const jsonLength = buffer.readUInt32BE(0);
  return { header: JSON.parse(buffer.subarray(4, 4 + jsonLength).toString()), binary: buffer.subarray(4 + jsonLength) };
}

function edgeIndexes(binary, reference, index) {
  if (reference.length === 0) return [];
  const count = binary.readUInt32BE(reference.offset);
  if (index < 0 || index >= count) return [];
  const offsetTable = reference.offset + 4;
  const previous = index === 0 ? 0 : binary.readUInt32BE(offsetTable + (index - 1) * 4);
  const end = binary.readUInt32BE(offsetTable + index * 4);
  const edgesStart = offsetTable + count * 4;
  return Array.from({ length: end - previous }, (_, edgeIndex) =>
    binary.readUInt32BE(edgesStart + (previous + edgeIndex) * 4),
  );
}

function analyzeIndex({ header, binary }) {
  const fullPath = (index) => {
    const source = header.sources[index];
    if (source.parent_source_index === null) return source.path;
    return `${fullPath(source.parent_source_index)}${source.path}`;
  };
  const sources = header.sources.map((source, index) => ({ ...source, index, fullPath: fullPath(index) }));
  const outputTotals = new Map();
  for (const [outputIndex, output] of header.output_files.entries()) {
    const parts = header.chunk_parts.filter((part) => part.output_file_index === outputIndex);
    const current = { raw: 0, compressed: 0 };
    for (const part of parts) {
    current.raw += part.size;
    current.compressed += part.compressed_size;
    }
    outputTotals.set(outputIndex, { path: output.filename, ...current });
  }
  const sourceEvidence = (source) => {
    const chunkParts = edgeIndexes(binary, header.source_chunk_parts, source.index).map((index) => header.chunk_parts[index]);
    const outputs = new Map();
    for (const partIndex of edgeIndexes(binary, header.source_chunk_parts, source.index)) {
      const part = header.chunk_parts[partIndex];
      const output = header.output_files[part.output_file_index];
      const current = outputs.get(part.output_file_index) ?? { path: output.filename, raw: 0, compressed: 0 };
      current.raw += part.size;
      current.compressed += part.compressed_size;
      outputs.set(part.output_file_index, current);
    }
    return {
      source: source.fullPath,
      source_chunk_bytes: {
        raw: chunkParts.reduce((sum, part) => sum + part.size, 0),
        compressed: chunkParts.reduce((sum, part) => sum + part.compressed_size, 0),
      },
      chunks: [...outputs].map(([outputIndex, bytes]) => ({ ...bytes, total: outputTotals.get(outputIndex) })),
    };
  };
  return { sources, sourceEvidence };
}

async function project(root, route) {
  const routePath = resolve(root, route, "analyze.data");
  const routeData = analyzeIndex(await readData(routePath));
  const matcher = (name) => (source) => source.fullPath.includes(name);
  const selected = (analysis, names) => names.flatMap((name) => analysis.sources.filter(matcher(name)).map(analysis.sourceEvidence));
  return {
    route_file: routePath,
    selected_route_chunks: selected(routeData, [
      "component-catalog.generated.json",
      "component-catalog.runtime.generated.json",
      "component-registry.ts",
      "analyzer-jsx.ts",
      "runtime-components.tsx",
    ]),
  };
}

async function moduleGraphPaths() {
  const data = await readData(resolve(afterRoot, "modules.data"));
  const { header, binary } = data;
  const readEdges = (reference, index) => {
    if (reference.length === 0) return [];
    const count = binary.readUInt32BE(reference.offset);
    if (index < 0 || index >= count) return [];
    const offsetsStart = reference.offset + 4;
    const previous = index === 0 ? 0 : binary.readUInt32BE(offsetsStart + (index - 1) * 4);
    const end = binary.readUInt32BE(offsetsStart + index * 4);
    const edgesStart = offsetsStart + count * 4;
    return Array.from({ length: end - previous }, (_, edgeIndex) =>
      binary.readUInt32BE(edgesStart + (previous + edgeIndex) * 4),
    );
  };
  const findPath = (sourceNeedle, targetNeedle, includeAsync) => {
    const startIndexes = header.modules.flatMap((module, index) => (module.path.includes(sourceNeedle) ? [index] : []));
    const targetIndexes = new Set(
      header.modules.flatMap((module, index) => (module.path.includes(targetNeedle) ? [index] : [])),
    );
    for (const start of startIndexes) {
      const queue = [[start, [start]]];
      const visited = new Set([start]);
      while (queue.length > 0) {
        const [index, path] = queue.shift();
        if (targetIndexes.has(index)) return path.map((moduleIndex) => header.modules[moduleIndex].path);
        const dependents = [
          ...readEdges(header.module_dependents, index),
          ...(includeAsync ? readEdges(header.async_module_dependents, index) : []),
        ];
        for (const dependent of dependents) {
          if (visited.has(dependent)) continue;
          visited.add(dependent);
          queue.push([dependent, [...path, dependent]]);
        }
      }
    }
    return null;
  };
  return {
    static_importers: {
      full_authoring_catalog_to_jsx_renderer: findPath(
        "component-catalog.generated.json",
        "packages/custom-widgets/src/runtime/custom-jsx-renderer.tsx",
        false,
      ),
      runtime_projection_to_jsx_renderer: findPath(
        "component-catalog.runtime.generated.json",
        "packages/custom-widgets/src/runtime/custom-jsx-renderer.tsx",
        false,
      ),
      full_authoring_catalog_to_board_edit_actions: findPath(
        "component-catalog.generated.json",
        "apps/nextjs/src/app/[locale]/boards/(content)/_edit-actions.tsx",
        false,
      ),
    },
    static_or_async_importers: {
      full_authoring_catalog_to_jsx_renderer: findPath(
        "component-catalog.generated.json",
        "packages/custom-widgets/src/runtime/custom-jsx-renderer.tsx",
        true,
      ),
      runtime_projection_to_jsx_renderer: findPath(
        "component-catalog.runtime.generated.json",
        "packages/custom-widgets/src/runtime/custom-jsx-renderer.tsx",
        true,
      ),
      full_authoring_catalog_to_board_edit_actions: findPath(
        "component-catalog.generated.json",
        "apps/nextjs/src/app/[locale]/boards/(content)/_edit-actions.tsx",
        true,
      ),
    },
  };
}

const result = {
  analyzer: "Next.js 16.3.6 experimental-analyze; selected source-to-chunk contributions",
  before: await project(beforeRoot, "[locale]"),
  before_custom_widget_workbench: await project(beforeRoot, "[locale]/manage/custom-widgets"),
  after_locale_root: await project(afterRoot, "[locale]"),
  after_board: await project(afterRoot, "[locale]/boards/[name]"),
  after_custom_widget_workbench: await project(afterRoot, "[locale]/manage/custom-widgets"),
  after_module_importer_paths: await moduleGraphPaths(),
  measurement_limits: [
    "Analyzer source-to-chunk contributions and route graph only; no browser network trace or transfer timings.",
    "Compressed values use Next analyzer compressed_size (gzip-oriented estimate); Brotli and browser heap are not measured.",
    "Repeated source occurrences across route compilation entries are reported separately; do not sum across routes as global transfer.",
  ],
};

await writeFile(
  resolve(repositoryRoot, "audit-evidence/2026-10-11/overview_a-after-projection.json"),
  `${JSON.stringify(result, null, 2)}\n`,
);
console.log(JSON.stringify({ before: result.before, after: result.after }, null, 2));
