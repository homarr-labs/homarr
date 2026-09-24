import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = await mkdtemp(path.join(tmpdir(), "homarr-docs-links-"));
const validator = fileURLToPath(new URL("./validate-links.ts", import.meta.url));

try {
  await mkdir(path.join(directory, "docs"));
  await mkdir(path.join(directory, "out/docs/child"), { recursive: true });
  await writeFile(path.join(directory, "out/docs/child/index.html"), '<h1 id="child">Child</h1>');
  await writeFile(path.join(directory, "out/asset.svg"), "<svg />");

  const cases = [
    { name: "valid anchors, relative routes, assets and external URLs", href: "#section", expected: 0 },
    { name: "same-page generated anchor", href: "#missing", expected: 1 },
    { name: "cross-page anchor", href: "/docs/child/#missing", expected: 1 },
    { name: "rendered route", href: "/missing", expected: 1 },
    { name: "same-origin absolute route", href: "https://homarr.dev/missing", expected: 1 },
    { name: "rendered asset", href: "/missing.svg", expected: 1 },
    { name: "source-only link", href: "#section", source: "[Missing](/missing)", expected: 1 },
    { name: "source-only anchor", href: "#section", source: "[Missing](/docs/#missing)", expected: 1 },
  ];

  for (const test of cases) {
    await writeFile(path.join(directory, "docs/index.mdx"), test.source ?? "[Valid](/docs/#section)");
    await writeFile(
      path.join(directory, "out/docs/index.html"),
      `<main><h1 id="section">Section</h1><a href="${test.href}">Test</a>
      <a href="child/#child">Child</a><a href="/asset.svg">Asset</a>
      <a href="https://example.com/missing">External</a><a href="#top">Top</a></main>`,
    );
    const result = spawnSync(process.execPath, ["--import", import.meta.resolve("tsx"), validator], {
      cwd: directory,
      encoding: "utf8",
    });
    assert.equal(result.status, test.expected, `${test.name}\n${result.stdout}\n${result.stderr}`);
  }
  console.log(`${cases.length} link validation checks passed`);
} finally {
  await rm(directory, { recursive: true, force: true });
}
