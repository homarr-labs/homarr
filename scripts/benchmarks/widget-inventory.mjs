/**
 * Per-widget inventory: one row per widget, with the signals that predict a performance problem.
 *
 * The earlier audit (audit-widget-render.mjs) looks for specific anti-patterns. This one answers a
 * different question — "which widgets deserve a closer look, and why" — so that a sweep of all of
 * them can be worked through in a defensible order instead of alphabetically.
 *
 * Every column is a *signal*, not a defect. A widget with 6 maps and no memo is fine if it renders
 * three rows; the point is to rank where to spend attention.
 *
 *   node scripts/benchmarks/widget-inventory.mjs            # ranked table
 *   node scripts/benchmarks/widget-inventory.mjs --markdown # checklist for docs/perf/WIDGET-AUDIT.md
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = "packages/widgets/src";
const asMarkdown = process.argv.includes("--markdown");

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });

const count = (source, pattern) => (source.match(pattern) ?? []).length;

/** Refetch intervals live in a registry keyed by tRPC path, not by widget folder. */
const refetchIntervals = () => {
  const source = readFileSync(path.join(root, "refetch-intervals.ts"), "utf8");
  const entries = new Map();
  const pattern = /\[\["(?:widget|docker)",\s*"(\w+)"\]\],\s*intervalSeconds:\s*(\d+|null)/g;
  let match;
  while ((match = pattern.exec(source)) !== null) {
    entries.set(match[1].toLowerCase(), match[2] === "null" ? null : Number(match[2]));
  }
  return entries;
};

const intervals = refetchIntervals();

/** `mediaRequests` in the registry is the `media-requests` folder. */
const lookupInterval = (widget) => {
  const flattened = widget.replaceAll("-", "");
  for (const [key, value] of intervals) {
    if (key === flattened || key.startsWith(flattened) || flattened.startsWith(key)) return value;
  }
  return undefined;
};

const widgets = readdirSync(root)
  .filter((entry) => statSync(path.join(root, entry)).isDirectory())
  .filter((entry) => !["_inputs", "common", "errors", "modals", "test"].includes(entry));

const rows = widgets.map((widget) => {
  const files = walk(path.join(root, widget)).filter((file) => /\.tsx?$/.test(file) && !file.includes(".spec."));
  const sources = files.map((file) => readFileSync(file, "utf8"));
  const all = sources.join("\n");
  const componentSource = sources.filter((_, index) => /component\.tsx$/.test(files[index])).join("\n");

  const overlays = count(all, /<(Tooltip|HoverCard|Popover|Menu)[\s>]/g);
  // An overlay or image inside a `.map()` repeats per row, which is what turns a small cost into a
  // large one.
  // The parameter list may itself contain parens - `.map(({ id }) =>` - so the arrow is matched
  // loosely rather than by excluding `)`.
  const perRow = count(all, /\.map\([\s\S]{0,80}?=>[\s\S]{0,400}?<(Tooltip|HoverCard|Popover|Menu)[\s>]/g);

  return {
    widget,
    files: files.length,
    loc: all.split("\n").length,
    maps: count(all, /\.map\(/g),
    overlays,
    perRow,
    images: count(all, /<img[\s>]|<Image[\s>]|MaskedOrNormalImage|backgroundImage/g),
    lazy: /loading="lazy"|offscreenRowStyle|contentVisibility/.test(all),
    scrollArea: /<ScrollArea/.test(all),
    memo: count(all, /\bmemo\(/g),
    useMemo: count(all, /useMemo\(/g),
    subscription: /useSubscription|onData|\.subscribe\(/.test(all),
    interval: lookupInterval(widget),
    hasComponent: componentSource.length > 0,
  };
});

/**
 * Heuristic priority. Weighted so that repetition beats size: a per-row overlay in a scrolling list
 * outranks a big file that renders once.
 */
const score = (row) =>
  row.perRow * 12 +
  (row.scrollArea && !row.lazy ? 8 : 0) +
  (row.images > 0 && !row.lazy ? 6 : 0) +
  row.overlays * 2 +
  row.maps +
  (row.subscription ? 5 : 0) +
  (row.interval !== undefined && row.interval !== null && row.interval <= 5 ? 6 : 0) +
  (row.memo === 0 && row.useMemo === 0 && row.maps > 2 ? 4 : 0) +
  Math.floor(row.loc / 200);

rows.sort((a, b) => score(b) - score(a) || a.widget.localeCompare(b.widget));

const describe = (row) => {
  const notes = [];
  if (row.perRow > 0) notes.push(`${row.perRow} overlay/row`);
  if (row.scrollArea && !row.lazy) notes.push("scrolls, not lazy");
  if (row.images > 0 && !row.lazy) notes.push(`${row.images} image sites, not lazy`);
  if (row.subscription) notes.push("live subscription");
  if (row.interval !== undefined && row.interval !== null && row.interval <= 5) notes.push(`refetch ${row.interval}s`);
  // Counting only `memo(` reported the downloads widget as unmemoised when it in fact uses useMemo
  // for its data, columns and stats. Either form counts.
  if (row.memo === 0 && row.useMemo === 0 && row.maps > 2) notes.push(`${row.maps} maps, no memoisation`);
  if (row.lazy) notes.push("lazy applied");
  return notes.join(", ") || "-";
};

if (asMarkdown) {
  console.log("| # | widget | LOC | maps | overlays | images | notes |");
  console.log("| --- | --- | --- | --- | --- | --- | --- |");
  rows.forEach((row, index) => {
    console.log(
      `| ${index + 1} | \`${row.widget}\` | ${row.loc} | ${row.maps} | ${row.overlays} | ${row.images} | ${describe(row)} |`,
    );
  });
} else {
  console.log(`${rows.length} widgets, ranked by predicted render cost\n`);
  console.log(
    `${"widget".padEnd(24)}${"score".padStart(6)}${"LOC".padStart(6)}${"maps".padStart(6)}${"ovl".padStart(5)}${"img".padStart(5)}  notes`,
  );
  for (const row of rows) {
    console.log(
      `${row.widget.padEnd(24)}${String(score(row)).padStart(6)}${String(row.loc).padStart(6)}` +
        `${String(row.maps).padStart(6)}${String(row.overlays).padStart(5)}${String(row.images).padStart(5)}  ${describe(row)}`,
    );
  }
  const totals = rows.reduce(
    (accumulator, row) => ({
      loc: accumulator.loc + row.loc,
      maps: accumulator.maps + row.maps,
      overlays: accumulator.overlays + row.overlays,
      perRow: accumulator.perRow + row.perRow,
    }),
    { loc: 0, maps: 0, overlays: 0, perRow: 0 },
  );
  console.log(
    `\n${totals.loc} lines, ${totals.maps} maps, ${totals.overlays} overlays, ${totals.perRow} of them per-row`,
  );
  console.log(`${rows.filter((row) => row.scrollArea && !row.lazy).length} widgets scroll without lazy rendering`);
}
