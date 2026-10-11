# Performance audit benchmarks

Run actual source from immutable baseline `bab37f76c607e70d871fb7bdde259fa527051b58` and the changed checkout on Node **24.18.0**. These focused fixtures measure the operation identified by each finding; they do not claim production request latency or whole-dashboard performance.

## Reproduce

From this checkout, install the lockfile with pinned Bun **1.4.2**, create the baseline archive, and install the benchmark-only compiler. The application's TypeScript 7 package does not expose the JavaScript compiler APIs used for source extraction.

```bash
mise exec -- bun install --frozen-lockfile
mkdir -p /tmp/homarr-performance-before-bab37f7
git archive bab37f76c607e70d871fb7bdde259fa527051b58 | tar -x -C /tmp/homarr-performance-before-bab37f7
mkdir -p /tmp/homarr-performance-compiler
printf '%s\n' '{"name":"homarr-performance-compiler","private":true,"dependencies":{"typescript":"5.9.3"}}' > /tmp/homarr-performance-compiler/package.json
audit_bun="$(mise which bun)"
(cd /tmp/homarr-performance-compiler && "$audit_bun" install)
export BENCH_COMPILER_ROOT=/tmp/homarr-performance-compiler
```

Cases execute extracted source with explicit dependency bindings. When a case imports baseline workspace packages, link dependencies to the installed checkout while keeping `@homarr/*` links pointed at the baseline packages:

```bash
mise exec -- node --input-type=module <<'NODE'
import { existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync } from 'node:fs';
import { join } from 'node:path';
const after = process.cwd();
const before = '/tmp/homarr-performance-before-bab37f7';
mkdirSync(join(before, 'node_modules', '@homarr'), { recursive: true });
for (const entry of readdirSync(join(after, 'node_modules'))) {
  if (entry === '@homarr' || entry === '.bin') continue;
  const destination = join(before, 'node_modules', entry);
  if (!existsSync(destination)) symlinkSync(join(after, 'node_modules', entry), destination);
}
for (const directory of ['apps', 'packages', 'tooling']) {
  for (const entry of readdirSync(join(before, directory))) {
    const manifest = join(before, directory, entry, 'package.json');
    if (!existsSync(manifest)) continue;
    const { name } = JSON.parse(readFileSync(manifest, 'utf8'));
    if (!name?.startsWith('@homarr/')) continue;
    const destination = join(before, 'node_modules', name);
    if (!existsSync(destination)) symlinkSync(join(before, directory, entry), destination);
  }
}
NODE
```

List cases, then run each lane in a fresh process after other CPU-intensive work has stopped. Every timed run also checks the actual-source outputs and assertions. The initial combined process exhausted its Node heap after 67 completed cases; separate lane processes avoid retaining all fixtures together.

```bash
mise exec -- node --expose-gc scripts/benchmarks/performance-audit/run.mts --list
mkdir -p /tmp/homarr-reproduced-audit
for audit_lane in api_core api_io assistant board_forms custom_widgets management notebook_timers routes_assets services widget_aggregates widget_lookups widget_render accessibility; do
  mise exec -- node --expose-gc scripts/benchmarks/performance-audit/run.mts --lane "$audit_lane" --warmup 3 --trials 9 --out "/tmp/homarr-reproduced-audit/$audit_lane.json"
done
mise exec -- node scripts/benchmarks/performance-audit/report.mts --results /tmp/homarr-reproduced-audit
```

Use `--verify-only` for assertions and counters without timing samples. The report requires complete paired measurements unless explicitly run with `--allow-incomplete`.

Use `--before DIR` and `--after DIR` for other locations, `--lane assistant` for one case module, and `--case ID` for a finding plus its `ID:variant` fixtures. `--iterations N` overrides case batch sizes; retain the override with the result. A new baseline requires changing the runner's baseline SHA deliberately.

## Case contract

Each `cases/*.mts` module exports `cases: BenchmarkCase[]` using `benchmarkPair`. `prepare(context)` creates `before` and `after` operations, optional `verify(beforeResult, afterResult)` semantic/accessibility assertions, numeric `metrics(result, side)`, and optional `cleanup()`.

- `context.source(side, path)` reads actual source and records its hash.
- `context.extract(side, path, selector)` selects actual declarations or spans and records offsets, lines and hashes.
- `context.evaluate(side, path, selector, bindings, options)` transpiles the selected source, injects explicit dependencies, and returns the selected value. String selectors name declarations; arrays include helpers; `{ kind: 'method', name, className }` selects a class method.
- For inline bodies, use `{ kind: 'span', start, end, includeStart, includeEnd }` or one-based `{ kind: 'lines', start, end }`. Start markers must be unique. End markers select the first match after the start. Spans include the start and exclude the end by default.
- **Inline spans must execute per operation.** Set `options: { asFunction: true, parameters: ['fixture'], returnExpression: 'result' }` to obtain a callable that reruns the actual span. Parameters also imply a callable. Returning `() => result` after evaluating a span once measures cached preparation output.
- Set `async: true` when operations return promises. Set `timing: false` for deterministic counts or structural outcomes; those cases must expose measured numeric metrics. Declare units in `metricUnits` and document fixture sizes, dependency stubs, simulated delays and clocks in `fixture`.

No handwritten replacement implementation belongs in a benchmark. Dependency stubs provide controlled inputs and observe operations. Before-source hashes are validated against `git show <baseline>:<path>` before fixture operations run. New files may exist only on the changed side, but each case needs source provenance for both sides.

## Read the results

The JSON retains case/harness/source hashes, source spans, runtime/platform details, invocation flags, numeric outputs, semantic-assertion presence, and raw paired samples. Extracted source uses the recorded TypeScript compiler, ES2022/CommonJS and classic React JSX; it does not include Next.js production bundling or React Compiler transforms. Timed cases warm up and alternate before/after order for each trial; summaries report medians per operation. CPU measures process CPU consumed by the operation batch, including harness loop overhead. Timings of simulated I/O describe the declared simulation.

Heap and RSS are process snapshots around each batch, not allocation counts, peaks, or production memory estimates. Heap deltas can be negative when garbage collection occurs. With `--expose-gc`, samples also retain post-GC heap deltas. RSS and dependency state are shared across serial cases; use a fresh `--case` process when fixture isolation requires it. Tiny timings should be treated as supporting evidence and read alongside operation counts and the raw distribution.

Verification mode collects metrics and executes assertions without wall/CPU samples. The runner saves partial results after every case, continues after individual failures, runs provided cleanup, and exits nonzero if any case fails.

## Audit artifacts

- [Parallel dispatch blueprint](DISPATCH.md)
- [Before/after report and methodology](REPORT.md)
- [All 62 findings](FINDINGS_TABLE.md)
- [All 101 scenario measurements](VARIANTS.md)
- [Rejected prototypes](REJECTED_CANDIDATES.md)
- [Focused validation](VALIDATION.md)
