import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

import { benchmarkPair } from "../lib.mts";
import type { BenchmarkCase, BenchmarkContext, Side } from "../lib.mts";

const schemaFile = "packages/custom-widgets/src/core/custom-jsx-schema.ts";
const editorFile = "packages/custom-widgets/src/workbench/analyzer.ts";
const analyzerFiles = [
  schemaFile,
  "packages/custom-widgets/src/jsx/analyzer.ts",
  "packages/custom-widgets/src/jsx/analyzer-jsx.ts",
  "packages/custom-widgets/src/jsx/analyzer-diagnostics.ts",
];
type ParseResult = { success: true; data: unknown } | { success: false; error: { issues: unknown[] } };
type Diagnostic = { code: string; line?: number; column?: number; index?: number; value?: string };
type WidgetModules = {
  customWidgetDefinitionSchema: { safeParse(input: unknown): ParseResult };
  customWidgetPreviewDefinitionSchema: { safeParse(input: unknown): ParseResult };
  validateCustomJsxTemplate: (template: string) => unknown[];
  getCustomJsxBindingType: (name: string) => unknown;
  CUSTOM_JSX_LIMITS: { templateLength: number; operations: number };
};

// Bundle the real schema/analyzer graph with the same pinned external packages on both sides.
function loadWidgetModules(ctx: BenchmarkContext, side: Side) {
  const root = ctx.roots[side];
  const require = createRequire(pathToFileURL(join(ctx.roots.after, "package.json")));
  const esbuild = require("esbuild");
  const acorn = require("acorn");
  let parseCalls = 0;
  class CountingParser extends acorn.Parser {
    static extend(...plugins: unknown[]) {
      const Parser = acorn.Parser.extend(...plugins);
      return class extends Parser {
        static parse(...args: unknown[]) {
          parseCalls += 1;
          return super.parse(...args);
        }
      };
    }
  }
  const result = esbuild.buildSync({
    stdin: {
      contents: [
        `export * from ${JSON.stringify(join(root, schemaFile))};`,
        `export { validateCustomJsxTemplate } from ${JSON.stringify(join(root, "packages/custom-widgets/src/jsx/analyzer.ts"))};`,
        `export { getCustomJsxBindingType } from ${JSON.stringify(join(root, "packages/custom-widgets/src/core/component-registry.ts"))};`,
        `export { CUSTOM_JSX_LIMITS } from ${JSON.stringify(join(root, "packages/custom-widgets/src/jsx/policy.ts"))};`,
      ].join("\n"),
      resolveDir: root,
      loader: "ts",
    },
    absWorkingDir: root,
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    metafile: true,
    nodePaths: [join(ctx.roots.after, "node_modules")],
    external: ["acorn", "acorn-jsx", "zod/v4"],
    alias: { "@homarr/definitions/integration": join(root, "packages/definitions/src/integration.ts") },
  });
  for (const input of Object.keys(result.metafile.inputs)) {
    if (input === "<stdin>") continue;
    const file = relative(root, join(root, input));
    if (!file.startsWith("..") && !file.includes("node_modules")) ctx.source(side, file);
  }
  const module = { exports: {} };
  const controlledRequire = (name: string) => {
    if (name === "acorn") return { ...acorn, Parser: CountingParser };
    return require(name);
  };
  new Function("module", "exports", "require", result.outputFiles[0].text)(module, module.exports, controlledRequire);
  return {
    api: module.exports as WidgetModules,
    reset() {
      parseCalls = 0;
    },
    parseCalls() {
      return parseCalls;
    },
  };
}

function canonical(result: ParseResult) {
  if (result.success) return { success: true, data: result.data };
  return { success: false, issues: result.error.issues };
}
function definition(template: string) {
  return {
    $schema: "homarr-custom-widget-v2",
    name: "Measured Custom Widget",
    sources: { default: { baseUrl: "https://example.com", networkScope: "public" } },
    requests: { search: { path: "/search", trigger: "manual", query: { q: { $param: "q" } } } },
    template,
  };
}
function cappedTemplate(row: string, cap = 50_000) {
  const count = Math.floor((cap - "<Stack>\n\n</Stack>".length) / row.length);
  const start = `<Stack>\n${row.repeat(count)}`;
  return `${start}${" ".repeat(cap - start.length - "</Stack>".length)}</Stack>`;
}
const typicalTemplate =
  '<Stack>\n<TextInput bind="q" defaultValue="" />\n<SubFetch requestId="search" params={{ q: inputs.q }}>{result => <Text>{result.title}</Text>}</SubFetch>\n</Stack>';
const cappedValidTemplate = cappedTemplate('<Text>{data.title ?? "Ready"}</Text>\n');
const cappedDiagnosticTemplate = cappedTemplate(
  '<SubFetch requestId="missing" />\n<TextInput bind={inputs.q} />\n<Switch bind="q" />\n<TextInput bind="q" />\n',
);

function verifySchemaSemantics(before: WidgetModules, after: WidgetModules) {
  const mismatched = '<SubFetch requestId="search" params={{ wrong: 1 }}><Unknown /></SubFetch>';
  const operationBudgetTemplate = "{[" + "1,".repeat(25_005) + "1]}";
  const candidates = [
    definition(typicalTemplate),
    definition(cappedValidTemplate),
    definition(mismatched),
    { ...definition(mismatched), name: 8 },
    { ...definition(mismatched), requests: null },
    { ...definition(mismatched), unexpected: true },
    definition(""),
    definition(operationBudgetTemplate),
    definition("<Unknown />" + " ".repeat(50_000)),
    definition("<Stack>\u200b<Text>Cafe\u0301 {1 ?? \u03040}</Text></Stack>"),
    definition('<Stack>\n<Text>{data.constructor}</Text>\n<SubFetch requestId="search" params={{}} />\n</Stack>'),
    definition('<SubFetch requestId="search" params={{ q: inputs.q, ...inputs.extra }} />'),
    definition('<SubFetch requestId="search" params={{ q: inputs.q, stale: 1, ...inputs.extra }} />'),
    {
      ...definition(
        '<ToggleSwitch requestId="toggle" enabledParams={{ wrong: true }} disabledParams={{ enabled: false }} />',
      ),
      requests: {
        toggle: { kind: "action", method: "POST", path: "/toggle", body: { enabled: { $param: "enabled" } } },
      },
    },
    definition("<Box>".repeat(70) + "<Text />" + "</Box>".repeat(70)),
    definition(cappedTemplate("<Text>{[" + "1,".repeat(120) + "1]}</Text>\n")),
  ];
  for (const candidate of candidates) {
    assert.deepEqual(
      canonical(after.customWidgetDefinitionSchema.safeParse(candidate)),
      canonical(before.customWidgetDefinitionSchema.safeParse(candidate)),
    );
    assert.deepEqual(
      canonical(after.customWidgetPreviewDefinitionSchema.safeParse(candidate)),
      canonical(before.customWidgetPreviewDefinitionSchema.safeParse(candidate)),
    );
  }
  assert.equal(
    before.customWidgetDefinitionSchema.safeParse(definition('<SubFetch requestId="search" params={{}} />')).success,
    true,
  );
  assert.equal(
    after.customWidgetPreviewDefinitionSchema.safeParse(definition('<SubFetch requestId="search" params={{}} />'))
      .success,
    false,
  );
  assert.ok(
    (after.validateCustomJsxTemplate(operationBudgetTemplate) as { message: string }[]).some((entry) =>
      entry.message.includes("operation limit"),
    ),
  );
  assert.equal(after.CUSTOM_JSX_LIMITS.operations, before.CUSTOM_JSX_LIMITS.operations);
  assert.equal(after.CUSTOM_JSX_LIMITS.templateLength, 50_000);
}

function previewCase(id: string, title: string, template: string, iterations: number): BenchmarkCase {
  return benchmarkPair({
    id,
    title,
    files: analyzerFiles,
    iterations,
    fixture: `${template.length} character template; full real Zod preview schema and Acorn analyzer.`,
    metricUnits: { astPasses: "Acorn parses per preview", templateCharacters: "UTF-16 characters" },
    prepare(ctx) {
      const before = loadWidgetModules(ctx, "before");
      const after = loadWidgetModules(ctx, "after");
      verifySchemaSemantics(before.api, after.api);
      const fixture = definition(template);
      const run = (loaded: ReturnType<typeof loadWidgetModules>) => {
        loaded.reset();
        const result = canonical(loaded.api.customWidgetPreviewDefinitionSchema.safeParse(fixture));
        return { result, astPasses: loaded.parseCalls() };
      };
      return {
        before: () => run(before),
        after: () => run(after),
        verify(beforeValue, afterValue) {
          const b = beforeValue as ReturnType<typeof run>;
          const a = afterValue as ReturnType<typeof run>;
          assert.deepEqual(a.result, b.result);
          assert.equal(a.result.success, true);
          assert.equal(b.astPasses, 2);
          assert.equal(a.astPasses, 1);
        },
        metrics(result) {
          return { astPasses: (result as ReturnType<typeof run>).astPasses, templateCharacters: template.length };
        },
      };
    },
  });
}

function loadEditor(ctx: BenchmarkContext, side: Side) {
  const loaded = loadWidgetModules(ctx, side);
  const source = ctx.source(side, editorFile);
  const declarations = [
    "networkComponentPattern",
    "inputBindingPattern",
    "CUSTOM_JSX_TEMPLATE_LIMIT",
    "analyzeJsxTemplate",
  ];
  if (source.includes("function createLineAt")) declarations.push("createLineAt");
  else declarations.push("lineAt");
  const analyze = ctx.evaluate<(template: string, options?: { requestIds: string[] }) => Diagnostic[]>(
    side,
    editorFile,
    declarations,
    {
      validateCustomJsxTemplate: loaded.api.validateCustomJsxTemplate,
      getCustomJsxBindingType: loaded.api.getCustomJsxBindingType,
      CUSTOM_JSX_LIMITS: loaded.api.CUSTOM_JSX_LIMITS,
    },
    { returnExpression: "analyzeJsxTemplate" },
  );
  return { ...loaded, analyze };
}
function editorCase(id: string, title: string, template: string, iterations: number): BenchmarkCase {
  return benchmarkPair({
    id,
    title,
    files: [...analyzerFiles, editorFile],
    iterations,
    fixture: `${template.length} character editor template; actual complete AST and regex diagnostics.`,
    metricUnits: {
      astPasses: "Acorn parses",
      diagnosticCount: "diagnostics",
      locatedDiagnostics: "diagnostics with line/index",
    },
    prepare(ctx) {
      const before = loadEditor(ctx, "before");
      const after = loadEditor(ctx, "after");
      const boundaryFixtures = [
        '<SubFetch />\n<TextInput bind={inputs.q} />\n<Switch bind="q" />\n<TextInput bind="q" />',
        "\n<SubFetch />\r\n<TextInput bind={inputs.q} />",
        "<SubFetch /><TextInput bind={inputs.q} />",
        "<TextInput bind={inputs.q} />\n<SubFetch />",
        "plain text with no newlines",
      ];
      for (const fixture of boundaryFixtures) assert.deepEqual(after.analyze(fixture), before.analyze(fixture));
      const run = (loaded: ReturnType<typeof loadEditor>) => {
        loaded.reset();
        return { diagnostics: loaded.analyze(template, { requestIds: ["search"] }), astPasses: loaded.parseCalls() };
      };
      return {
        before: () => run(before),
        after: () => run(after),
        verify(beforeValue, afterValue) {
          const b = beforeValue as ReturnType<typeof run>;
          const a = afterValue as ReturnType<typeof run>;
          assert.deepEqual(a, b);
          for (const diagnostic of a.diagnostics) {
            if (diagnostic.index === undefined || diagnostic.line === undefined) continue;
            assert.equal(diagnostic.line, template.slice(0, diagnostic.index).split("\n").length);
          }
          assert.equal(a.astPasses, 1);
        },
        metrics(result) {
          const value = result as ReturnType<typeof run>;
          return {
            astPasses: value.astPasses,
            diagnosticCount: value.diagnostics.length,
            locatedDiagnostics: value.diagnostics.filter(
              (entry) => entry.line !== undefined && entry.index !== undefined,
            ).length,
          };
        },
      };
    },
  });
}

function oversizedPreviewCase(): BenchmarkCase {
  return benchmarkPair({
    id: "CW-1:oversized",
    title: "Preview schema: preserve oversized-template diagnostics and parser behavior",
    files: analyzerFiles,
    timing: false,
    fixture: "50001–50043 character templates with unknown JSX, request mismatch, and invalid sibling field types.",
    metricUnits: { scenarios: "schema inputs", ordinaryAstPasses: "Acorn parses", previewAstPasses: "Acorn parses" },
    prepare(ctx) {
      const before = loadWidgetModules(ctx, "before");
      const after = loadWidgetModules(ctx, "after");
      const inputs = [
        "x".repeat(50_001),
        "<Unknown />" + " ".repeat(50_000),
        '<SubFetch requestId="search" params={{}} />' + " ".repeat(50_000),
      ].flatMap((template) => [
        definition(template),
        { ...definition(template), name: 8 },
        { ...definition(template), requests: null },
      ]);
      const run = (loaded: ReturnType<typeof loadWidgetModules>) =>
        inputs.map((input) => {
          loaded.reset();
          const ordinary = canonical(loaded.api.customWidgetDefinitionSchema.safeParse(input));
          const ordinaryAstPasses = loaded.parseCalls();
          loaded.reset();
          const preview = canonical(loaded.api.customWidgetPreviewDefinitionSchema.safeParse(input));
          return { ordinary, preview, ordinaryAstPasses, previewAstPasses: loaded.parseCalls() };
        });
      return {
        before: () => run(before),
        after: () => run(after),
        verify(beforeValue, afterValue) {
          const b = beforeValue as ReturnType<typeof run>;
          const a = afterValue as ReturnType<typeof run>;
          for (const [index, value] of a.entries()) {
            const prior = b[index];
            assert.ok(prior);
            assert.deepEqual(value.ordinary, prior.ordinary);
            assert.deepEqual(value.preview, prior.preview);
            assert.equal(value.ordinaryAstPasses, 1);
            assert.equal(prior.ordinaryAstPasses, 1);
            assert.equal(value.previewAstPasses, 1);
            // Baseline max-length checks are continuable; invalid sibling types skip its second pass.
            let expectedPriorPasses = 1;
            if (index % 3 === 0) expectedPriorPasses = 2;
            assert.equal(prior.previewAstPasses, expectedPriorPasses);
            assert.equal(value.preview.success, false);
            assert.ok((value.preview.issues as { code: string }[]).some((issue) => issue.code === "too_big"));
          }
          const unknownComponent = a[3];
          const mismatchedRequest = a[6];
          assert.ok(unknownComponent);
          assert.ok(mismatchedRequest);
          assert.ok(
            (unknownComponent.preview.issues as { message: string }[]).some((issue) =>
              issue.message.includes("UNKNOWN_COMPONENT"),
            ),
          );
          assert.ok(
            (mismatchedRequest.preview.issues as { message: string }[]).some((issue) =>
              issue.message.includes("REQUEST_PARAMS_MISMATCH"),
            ),
          );
        },
        metrics(value) {
          const results = value as ReturnType<typeof run>;
          return {
            scenarios: results.length,
            ordinaryAstPasses: results.reduce((total, entry) => total + entry.ordinaryAstPasses, 0),
            previewAstPasses: results.reduce((total, entry) => total + entry.previewAstPasses, 0),
          };
        },
      };
    },
  });
}

export const cases: BenchmarkCase[] = [
  oversizedPreviewCase(),
  previewCase("CW-1", "Preview schema: one AST pass for a typical valid template", typicalTemplate, 500),
  previewCase("CW-1:capped", "Preview schema: one AST pass for a capped valid template", cappedValidTemplate, 20),
  editorCase("FW-001", "Editor diagnostics: streaming line lookup for a typical template", typicalTemplate, 500),
  editorCase(
    "FW-001:capped",
    "Editor diagnostics: streaming line lookup for dense capped diagnostics",
    cappedDiagnosticTemplate,
    20,
  ),
];
