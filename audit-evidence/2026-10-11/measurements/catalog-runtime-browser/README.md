# Runtime catalog browser measurement

This isolated fixture compares the pre-projection registry snapshot at `overview_a-before/component-registry.ts` with the current runtime registry entry. It bundles each actual registry entry with the repository-installed esbuild in production/minified browser mode. The browser receives only the supported registry and binding lookup functions; authoring prompt/catalog APIs are not imported through a package barrel or exported to the page.

The runner writes bundles, compressed bundle artifacts, source/tool provenance, raw per-run CDP measurements, and an aggregate JSON report here. It performs nine alternating before/after pairs (18 fresh Chromium processes and pages). Each process first measures an empty fixture page, then loads one registry bundle in that same page, forces GC, and records V8 heap usage, DOM counters, window/document/body listeners, binding/registry structural bytes, module evaluation time, and cold script-request time. A local HTTP server negotiates gzip or Brotli and serves only these fixture bundles. CDP `Network.dataReceived.encodedDataLength` is retained as the browser-observed compressed body count; the server-side encoded body size is also recorded for cross-checking. These are isolated loopback fixture results, not a deployed Next.js route measurement.

The semantic snapshot compares component names, supported props, blocked props, safety/package metadata, denied reasons, bindable names, and binding return values for the common scalar/multiple/range modes. The report must show any mismatch; bundle/heap measurements are not meaningful as an implementation comparison if parity fails.

## Run

From the repository root, after the runtime generated JSON exists and the measurement slot is released:

```sh
node audit-evidence/2026-10-11/measurements/catalog-runtime-browser/run.mjs
```

The harness adds no dependencies and makes no production changes. It requires the installed Playwright Chromium browser. It is a measurement tool, not a test suite.
