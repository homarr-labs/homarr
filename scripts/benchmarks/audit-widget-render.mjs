/**
 * Static audit of every widget for render-cost anti-patterns.
 *
 * Measuring widgets one at a time found real problems — a Popover mounted per card, 80 cards
 * rendered into a tile showing 7 — but it needs a board that happens to use the widget and data that
 * happens to be large. This sweeps the source instead, so a widget nobody has on a test board is
 * still covered.
 *
 * Every finding is a *candidate*, not a defect: the patterns below cost something when a list is long
 * and nothing when it has three rows. Sorted so the ones inside a `.map()` come first, since those
 * multiply by row count.
 *
 *   node scripts/benchmarks/audit-widget-render.mjs
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = "packages/widgets/src";

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

/** Finds the body of each `.map(` callback by tracking bracket depth from the opening paren. */
const mapBodies = (source) => {
  const bodies = [];
  const pattern = /\.map\(/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    let depth = 0;
    let index = match.index + match[0].length - 1;
    const start = index;
    for (; index < source.length; index++) {
      const char = source[index];
      if (char === "(") depth++;
      else if (char === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    if (index > start) bodies.push({ start, end: index, text: source.slice(start, index) });
  }
  return bodies;
};

const lineOf = (source, offset) => source.slice(0, offset).split("\n").length;

const findings = [];
for (const file of walk(root)) {
  if (!/\.tsx$/.test(file) || /\.spec\./.test(file)) continue;
  const source = readFileSync(file, "utf8");
  const bodies = mapBodies(source);

  for (const body of bodies) {
    const line = lineOf(source, body.start);

    // Mantine mounts a Popover per Tooltip/Menu even when disabled, so one per row is one per row.
    const overlay = [...body.text.matchAll(/<(Tooltip|TooltipFloating|Popover|Menu|HoverCard)\b/g)].map((m) => m[1]);
    if (overlay.length > 0) {
      findings.push({ file, line, inMap: true, kind: "overlay-per-row", detail: [...new Set(overlay)].join(", ") });
    }

    // A fresh object literal per row defeats any memoisation below it and re-triggers style diffing.
    const inlineStyles = (body.text.match(/style=\{\{/g) ?? []).length;
    if (inlineStyles > 0) {
      findings.push({ file, line, inMap: true, kind: "inline-style-per-row", detail: `${inlineStyles} literal(s)` });
    }

    // An index key makes React reuse the wrong row when the list reorders, remounting subtrees.
    if (/key=\{(\s*)(index|i|idx|\w*Index)\s*\}/.test(body.text) || /key=\{`[^`]*\$\{(index|i|idx|\w*Index)\}/.test(body.text)) {
      findings.push({ file, line, inMap: true, kind: "index-key", detail: "key derived from array index" });
    }

    // An arrow prop is a new function per row per render; harmless alone, costly under a memo.
    const inlineHandlers = (body.text.match(/on[A-Z]\w+=\{\(\)\s*=>/g) ?? []).length;
    if (inlineHandlers > 2) {
      findings.push({ file, line, inMap: true, kind: "inline-handlers-per-row", detail: `${inlineHandlers} handlers` });
    }
  }

  // A component declared inside another component is a new type every render, so React unmounts and
  // remounts its whole subtree rather than updating it.
  for (const match of source.matchAll(/^(\s+)const\s+([A-Z]\w+)\s*=\s*\(?[^=]*\)?\s*=>\s*[({]/gm)) {
    if (match[1].length >= 2) {
      findings.push({
        file,
        line: lineOf(source, match.index),
        inMap: false,
        kind: "nested-component",
        detail: match[2],
      });
    }
  }
}

const byKind = new Map();
for (const finding of findings) {
  const key = `${finding.kind}`;
  byKind.set(key, (byKind.get(key) ?? 0) + 1);
}

console.log("=== findings by kind ===");
for (const [kind, count] of [...byKind.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${kind}`);
}

const inMap = findings.filter((finding) => finding.inMap);
const byFile = new Map();
for (const finding of inMap) {
  const list = byFile.get(finding.file) ?? [];
  list.push(finding);
  byFile.set(finding.file, list);
}

console.log(`\n=== inside a .map(), so multiplied by row count — worst files first ===`);
for (const [file, list] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 18)) {
  console.log(`\n  ${file.replace("packages/widgets/src/", "")}  (${list.length})`);
  for (const finding of list) console.log(`      :${finding.line}  ${finding.kind}  — ${finding.detail}`);
}
