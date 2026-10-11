import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { isAbsolute, join, relative, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { pathToFileURL } from "node:url";

export type Side = "before" | "after";
type MaybePromise<T> = T | Promise<T>;

export type SourceSelector =
  | string
  | string[]
  | { kind: "method"; name: string; className?: string }
  | { kind: "span"; start: string; end: string; includeStart?: boolean; includeEnd?: boolean }
  | { kind: "lines"; start: number; end: number };

export interface SourceEvidence {
  side: Side;
  file: string;
  fileSha256: string;
  selector: SourceSelector | "file";
  spans: { start: number; end: number; startLine: number; endLine: number; sha256: string }[];
}

export interface PreparedPair {
  before: () => unknown;
  after: () => unknown;
  verify?: (before: unknown, after: unknown) => MaybePromise<void>;
  metrics?: (result: unknown, side: Side) => MaybePromise<Record<string, number>>;
  cleanup?: () => MaybePromise<void>;
}

export interface BenchmarkCase {
  id: string;
  title: string;
  files: string[];
  description?: string;
  /** Set false for structural/operation metrics that do not benefit from a microbenchmark. */
  timing?: boolean;
  /** Set true when either operation returns a Promise. */
  async?: boolean;
  iterations?: number;
  metricUnits?: Record<string, string>;
  /** Explicitly describe fixture scale and any simulated I/O or dependency behavior. */
  fixture?: string;
  prepare: (context: BenchmarkContext) => MaybePromise<PreparedPair>;
}

export function benchmarkPair<T extends BenchmarkCase>(benchmark: T): T {
  return benchmark;
}

export function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

export function median(values: number[]): number {
  if (values.length === 0) throw new Error("Cannot take the median of an empty sample");
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const upper = sorted[middle];
  if (upper === undefined) throw new Error("Invalid median index");
  if (sorted.length % 2 !== 0) return upper;
  const lower = sorted[middle - 1];
  if (lower === undefined) throw new Error("Invalid median index");
  return (lower + upper) / 2;
}

export class BenchmarkContext {
  readonly evidence: SourceEvidence[] = [];
  readonly compilerVersion: string;
  readonly roots: Record<Side, string>;
  private readonly cache = new Map<string, string>();
  private readonly ts: any;

  constructor(roots: Record<Side, string>) {
    this.roots = roots;
    const dependencyRoot = process.env.BENCH_COMPILER_ROOT ?? process.env.BENCH_DEPENDENCY_ROOT ?? roots.after;
    const require = createRequire(pathToFileURL(join(dependencyRoot, "package.json")));
    this.ts = require("typescript");
    this.compilerVersion = this.ts.version;
    if (typeof this.ts.createSourceFile !== "function" || typeof this.ts.transpileModule !== "function") {
      throw new Error(
        "Compiler APIs are unavailable. Set BENCH_COMPILER_ROOT to an isolated typescript@5.9.3 install.",
      );
    }
  }

  source(side: Side, file: string): string {
    const source = this.read(side, file);
    this.record(side, file, "file", [{ start: 0, end: source.length }]);
    return source;
  }

  /** Extract exact source text; spans are UTF-16 offsets into the recorded file. */
  extract(side: Side, file: string, selector: SourceSelector): string {
    const source = this.read(side, file);
    const spans = this.select(file, source, selector);
    this.record(side, file, selector, spans);
    return spans.map(({ start, end }) => source.slice(start, end)).join("\n");
  }

  /** Execute extracted declarations with explicit dependency/fixture bindings. */
  evaluate<T>(
    side: Side,
    file: string,
    selector: SourceSelector,
    bindings: Record<string, unknown> = {},
    options: { returnExpression?: string; asFunction?: boolean; parameters?: string[] } = {},
  ): T {
    let extracted = this.extract(side, file, selector);
    let returnExpression = options.returnExpression;
    if (typeof selector === "string") returnExpression ??= selector;
    if (Array.isArray(selector)) returnExpression ??= selector.at(-1);

    if (typeof selector === "object" && !Array.isArray(selector) && selector.kind === "method") {
      let target = "__ExtractedMethod.prototype";
      if (/^\s*static\s/u.test(extracted)) target = "__ExtractedMethod";
      extracted = `class __ExtractedMethod {\n${extracted}\n}`;
      returnExpression ??= `${target}[${JSON.stringify(selector.name)}]`;
    }
    if (!returnExpression) {
      throw new Error(`${file}: spans/lines need options.returnExpression`);
    }

    // Imports are deliberately absent; injected dependencies remain visible in each case.
    extracted = extracted.replace(/(^|\n)(\s*)export\s+(?:default\s+)?/gu, "$1$2");
    const compiled = this.ts.transpileModule(extracted, {
      fileName: file,
      compilerOptions: {
        target: this.ts.ScriptTarget.ES2022,
        module: this.ts.ModuleKind.CommonJS,
        jsx: this.ts.JsxEmit.React,
        jsxFactory: "React.createElement",
        jsxFragmentFactory: "React.Fragment",
      },
      reportDiagnostics: true,
    });
    const errors = compiled.diagnostics?.filter((entry: any) => entry.category === this.ts.DiagnosticCategory.Error);
    if (errors?.length) {
      throw new Error(
        this.ts.formatDiagnosticsWithColorAndContext(errors, {
          getCanonicalFileName: (name: string) => name,
          getCurrentDirectory: () => this.roots[side],
          getNewLine: () => "\n",
        }),
      );
    }
    const names = Object.keys(bindings);
    for (const name of names) {
      if (!/^[A-Za-z_$][\w$]*$/u.test(name)) throw new Error(`Invalid binding name ${name}`);
    }
    if (options.asFunction || options.parameters) {
      const parameters = options.parameters ?? [];
      for (const name of parameters) {
        if (!/^[A-Za-z_$][\w$]*$/u.test(name)) throw new Error(`Invalid parameter name ${name}`);
      }
      const body = `return function(${parameters.join(",")}) {\n${compiled.outputText}\nreturn (${returnExpression});\n}`;
      return new Function(...names, body)(...Object.values(bindings)) as T;
    }
    return new Function(...names, `${compiled.outputText}\nreturn (${returnExpression});`)(
      ...Object.values(bindings),
    ) as T;
  }

  private read(side: Side, file: string): string {
    const fullPath = resolve(this.roots[side], file);
    const fromRoot = relative(this.roots[side], fullPath);
    if (isAbsolute(file) || fromRoot.startsWith(".."))
      throw new Error(`Source must be inside the ${side} root: ${file}`);
    const key = `${side}:${file}`;
    let source = this.cache.get(key);
    if (source === undefined) {
      source = readFileSync(fullPath, "utf8");
      this.cache.set(key, source);
    }
    return source;
  }

  private select(file: string, source: string, selector: SourceSelector): { start: number; end: number }[] {
    if (typeof selector === "object" && !Array.isArray(selector) && selector.kind === "span") {
      const markerStart = source.indexOf(selector.start);
      if (markerStart < 0) throw new Error(`${file}: start marker not found: ${selector.start}`);
      if (source.indexOf(selector.start, markerStart + selector.start.length) >= 0) {
        throw new Error(`${file}: start marker is ambiguous: ${selector.start}`);
      }
      const markerEnd = source.indexOf(selector.end, markerStart + selector.start.length);
      if (markerEnd < 0) throw new Error(`${file}: end marker not found after start: ${selector.end}`);
      let start = markerStart;
      let end = markerEnd;
      if (selector.includeStart === false) start += selector.start.length;
      if (selector.includeEnd === true) end += selector.end.length;
      return [{ start, end }];
    }
    if (typeof selector === "object" && !Array.isArray(selector) && selector.kind === "lines") {
      const lines = source.split(/(?<=\n)/u);
      if (selector.start < 1 || selector.end < selector.start || selector.end > lines.length) {
        throw new Error(`${file}: invalid line selection ${selector.start}-${selector.end}`);
      }
      return [
        {
          start: lines.slice(0, selector.start - 1).join("").length,
          end: lines.slice(0, selector.end).join("").length,
        },
      ];
    }
    const ts = this.ts;
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const isMethod = typeof selector === "object" && !Array.isArray(selector);
    let names: string[];
    if (typeof selector === "string") names = [selector];
    else if (Array.isArray(selector)) names = selector;
    else names = [selector.name];
    const found = new Map<string, { start: number; end: number }[]>();
    const visit = (node: any) => {
      if (isMethod) {
        const methodSelector = selector as { kind: "method"; name: string; className?: string };
        if (ts.isMethodDeclaration(node) && node.name?.getText(ast) === methodSelector.name) {
          const parentName = node.parent?.name?.getText(ast);
          if (!methodSelector.className || parentName === methodSelector.className) {
            const matches = found.get(methodSelector.name) ?? [];
            matches.push({ start: node.getStart(ast), end: node.end });
            found.set(methodSelector.name, matches);
          }
        }
      } else {
        const declared: string[] = [];
        if (ts.isVariableStatement(node)) {
          for (const declaration of node.declarationList.declarations) {
            declared.push(declaration.name.getText(ast));
          }
        } else if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node) || ts.isEnumDeclaration(node)) {
          if (node.name) declared.push(node.name.getText(ast));
        }
        for (const name of declared) {
          if (!names.includes(name)) continue;
          const matches = found.get(name) ?? [];
          matches.push({ start: node.getStart(ast), end: node.end });
          found.set(name, matches);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(ast);
    const spans = names.map((name) => {
      const matches = found.get(name) ?? [];
      if (matches.length !== 1)
        throw new Error(`${file}: expected one declaration of ${name}, found ${matches.length}`);
      const match = matches[0];
      if (!match) throw new Error(`${file}: missing declaration of ${name}`);
      return match;
    });
    return spans
      .filter((span, index) => spans.findIndex((other) => other.start === span.start) === index)
      .toSorted((a, b) => a.start - b.start);
  }

  private record(
    side: Side,
    file: string,
    selector: SourceSelector | "file",
    spans: { start: number; end: number }[],
  ): void {
    const source = this.read(side, file);
    const evidence: SourceEvidence = {
      side,
      file,
      fileSha256: sha256(source),
      selector,
      spans: spans.map(({ start, end }) => ({
        start,
        end,
        startLine: source.slice(0, start).split("\n").length,
        endLine: source.slice(0, Math.max(start, end - 1)).split("\n").length,
        sha256: sha256(source.slice(start, end)),
      })),
    };
    if (!this.evidence.some((entry) => JSON.stringify(entry) === JSON.stringify(evidence)))
      this.evidence.push(evidence);
  }
}

export interface Sample {
  trial: number;
  side: Side;
  order: number;
  iterations: number;
  wallMs: number;
  cpuUserMs: number;
  cpuSystemMs: number;
  heapUsedBeforeBytes: number;
  heapUsedAfterBytes: number;
  heapUsedDeltaBytes: number;
  heapUsedAfterGcBytes?: number;
  heapRetainedDeltaBytes?: number;
  rssBeforeBytes: number;
  rssAfterBytes: number;
  rssDeltaBytes: number;
}

async function invoke(operation: () => unknown, isAsync: boolean, iterations: number): Promise<unknown> {
  let value: unknown;
  if (isAsync) {
    for (let index = 0; index < iterations; index++) value = await operation();
    return value;
  }
  for (let index = 0; index < iterations; index++) value = operation();
  if (value && typeof (value as Promise<unknown>).then === "function") {
    throw new Error("Operation returned a Promise; set async: true on its benchmark case");
  }
  return value;
}

export async function runCase(
  benchmark: BenchmarkCase,
  roots: Record<Side, string>,
  options: {
    warmup: number;
    trials: number;
    iterations?: number;
    verifyOnly: boolean;
    validateBaseline?: (file: string, sha256: string) => void;
  },
) {
  const context = new BenchmarkContext(roots);
  for (const file of benchmark.files) {
    for (const side of ["before", "after"] as const) {
      if (existsSync(resolve(roots[side], file))) context.source(side, file);
    }
  }
  const pair = await benchmark.prepare(context);
  const isAsync = benchmark.async ?? false;
  const iterations = options.iterations ?? benchmark.iterations ?? 1000;
  const samples: Sample[] = [];
  try {
    for (const entry of context.evidence) {
      if (entry.side === "before") options.validateBaseline?.(entry.file, entry.fileSha256);
    }
    const initialBefore = await invoke(pair.before, isAsync, 1);
    const initialAfter = await invoke(pair.after, isAsync, 1);
    await pair.verify?.(initialBefore, initialAfter);
    const metrics: Record<Side, Record<string, number>> = { before: {}, after: {} };
    for (const side of ["before", "after"] as const) {
      let value = initialBefore;
      if (side === "after") value = initialAfter;
      const measured = (await pair.metrics?.(value, side)) ?? {};
      for (const [name, amount] of Object.entries(measured)) {
        if (!Number.isFinite(amount)) throw new Error(`${benchmark.id}: metric ${name} must be finite`);
      }
      metrics[side] = measured;
    }
    const metricNames = Object.keys(metrics.before).toSorted();
    if (JSON.stringify(metricNames) !== JSON.stringify(Object.keys(metrics.after).toSorted())) {
      throw new Error(`${benchmark.id}: before/after metric names differ`);
    }
    if (benchmark.timing === false && metricNames.length === 0) {
      throw new Error(`${benchmark.id}: cases without timing must provide measured numeric metrics`);
    }
    if (benchmark.timing !== false && !options.verifyOnly) {
      for (let warmup = 0; warmup < options.warmup; warmup++) {
        let sides: Side[] = ["before", "after"];
        if (warmup % 2 !== 0) sides = ["after", "before"];
        for (const side of sides) await invoke(pair[side], isAsync, iterations);
      }
      for (let trial = 0; trial < options.trials; trial++) {
        let sides: Side[] = ["before", "after"];
        if (trial % 2 !== 0) sides = ["after", "before"];
        for (const [order, side] of sides.entries()) {
          globalThis.gc?.();
          const memoryBefore = process.memoryUsage();
          const cpuBefore = process.cpuUsage();
          const started = performance.now();
          await invoke(pair[side], isAsync, iterations);
          const wallMs = performance.now() - started;
          const cpu = process.cpuUsage(cpuBefore);
          const memoryAfter = process.memoryUsage();
          const sample: Sample = {
            trial,
            side,
            order,
            iterations,
            wallMs,
            cpuUserMs: cpu.user / 1000,
            cpuSystemMs: cpu.system / 1000,
            heapUsedBeforeBytes: memoryBefore.heapUsed,
            heapUsedAfterBytes: memoryAfter.heapUsed,
            heapUsedDeltaBytes: memoryAfter.heapUsed - memoryBefore.heapUsed,
            rssBeforeBytes: memoryBefore.rss,
            rssAfterBytes: memoryAfter.rss,
            rssDeltaBytes: memoryAfter.rss - memoryBefore.rss,
          };
          if (globalThis.gc) {
            globalThis.gc();
            sample.heapUsedAfterGcBytes = process.memoryUsage().heapUsed;
            sample.heapRetainedDeltaBytes = sample.heapUsedAfterGcBytes - memoryBefore.heapUsed;
          }
          samples.push(sample);
        }
      }
    }
    const summaries: Record<string, unknown> = {};
    for (const side of ["before", "after"] as const) {
      const sideSamples = samples.filter((sample) => sample.side === side);
      if (sideSamples.length === 0) continue;
      summaries[side] = {
        wallMsPerOperation: median(sideSamples.map((sample) => sample.wallMs / iterations)),
        cpuMsPerOperation: median(sideSamples.map((sample) => (sample.cpuUserMs + sample.cpuSystemMs) / iterations)),
        heapUsedDeltaBytesPerBatch: median(sideSamples.map((sample) => sample.heapUsedDeltaBytes)),
        rssDeltaBytesPerBatch: median(sideSamples.map((sample) => sample.rssDeltaBytes)),
      };
    }
    if (
      context.evidence.every((entry) => entry.side !== "before") ||
      context.evidence.every((entry) => entry.side !== "after")
    ) {
      throw new Error(`${benchmark.id}: missing actual-source provenance for either side`);
    }
    return {
      id: benchmark.id,
      title: benchmark.title,
      description: benchmark.description,
      fixture: benchmark.fixture,
      verification: "passed",
      semanticAssertions: Boolean(pair.verify),
      compilerVersion: context.compilerVersion,
      timing: benchmark.timing !== false && !options.verifyOnly,
      iterations,
      metricUnits: benchmark.metricUnits ?? {},
      metrics,
      summaries,
      samples,
      source: context.evidence,
    };
  } finally {
    await pair.cleanup?.();
  }
}
