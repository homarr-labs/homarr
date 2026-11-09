import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gitShow, refExists } from "./git";
import { REPO_ROOT, warn } from "./runtime";
import type { Item } from "./types";

const INTEGRATION_FILE = "packages/definitions/src/integration.ts";
const WIDGET_FILE = "packages/definitions/src/widget.ts";
const WIDGET_SLUG_FILE = "packages/definitions/src/docs/widget-doc-slugs.ts";
const TABLER_DIR = join(REPO_ROOT, "node_modules/@tabler/icons");

interface IntegrationDef {
  key: string;
  name: string;
  iconUrl: string | null;
  docsSlug: string | null;
}

interface DocsMeta {
  name: string | null;
  description: string | null;
  iconUrl: string | null;
  tablerIcon: string | null;
}

const stringLiteral = /"((?:[^"\\]|\\.)*)"/;

const parseLiteral = (raw: string | undefined) => {
  if (raw === undefined) return null;
  try {
    const value: unknown = JSON.parse(`"${raw}"`);
    if (typeof value === "string") return value;
  } catch {
    return null;
  }
  return null;
};

const captures = (pattern: RegExp, text: string) => [...text.matchAll(pattern)].flatMap((match) => match[1] ?? []);

const lineString = (block: string, prop: string) => {
  const match = new RegExp(`^ {4}${prop}: ${stringLiteral.source}`, "m").exec(block);
  return parseLiteral(match?.[1]);
};

const parseIntegrationDefs = (src: string): IntegrationDef[] => {
  const lines = src.split("\n");
  const start = lines.findIndex((line) => line.startsWith("export const integrationDefs"));
  if (start === -1) return [];
  const defs: IntegrationDef[] = [];
  let key: string | null = null;
  let block: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("}")) break;
    const open = /^ {2}(\w+): \{$/.exec(line);
    if (open && key === null) {
      key = open[1] ?? null;
      block = [];
      continue;
    }
    if (key !== null && /^ {2}\},?$/.test(line)) {
      const text = block.join("\n");
      const name = lineString(text, "name");
      if (name)
        defs.push({ key, name, iconUrl: lineString(text, "iconUrl"), docsSlug: lineString(text, "documentationSlug") });
      key = null;
      continue;
    }
    if (key !== null) block.push(line);
  }
  return defs;
};

const parseWidgetKinds = (src: string) => {
  const start = src.indexOf("export const widgetKinds = [");
  if (start === -1) return [];
  const end = src.indexOf("] as const", start);
  if (end === -1) return [];
  return captures(/"([^"]+)"/g, src.slice(start, end));
};

const parseWidgetSlugs = (src: string | null) => {
  const slugs = new Map<string, string | null>();
  if (src === null) return slugs;
  for (const line of src.split("\n")) {
    const match = /^ {2}(?:"([^"]+)"|(\w+)): (?:"([^"]+)"|null),?$/.exec(line);
    const kind = match?.[1] ?? match?.[2];
    if (kind) slugs.set(kind, match?.[3] ?? null);
  }
  return slugs;
};

const docsString = (src: string, prop: string) => {
  const match = new RegExp(`^ {2}${prop}:\\s*${stringLiteral.source}`, "m").exec(src);
  return parseLiteral(match?.[1]);
};

const parseDocsMeta = (src: string): DocsMeta => ({
  name: docsString(src, "name"),
  description: docsString(src, "description"),
  iconUrl: docsString(src, "iconUrl"),
  tablerIcon: /^ {2}icon: (Icon\w+)/m.exec(src)?.[1] ?? null,
});

const kebab = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const humanize = (kind: string) =>
  kebab(kind)
    .split(/[-\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const tablerIconUrl = (component: string | null) => {
  if (component === null) return null;
  const base = kebab(component.replace(/^Icon/, ""));
  const style = base.endsWith("-filled") ? "filled" : "outline";
  const stem = base.replace(/-filled$/, "");
  const dir = join(TABLER_DIR, "icons", style);
  if (!existsSync(dir)) return null;
  const candidates = [stem.replace(/([a-z])(\d)/g, "$1-$2"), stem];
  const found = candidates.find((name) => existsSync(join(dir, `${name}.svg`)));
  if (!found) return null;
  const { version } = JSON.parse(readFileSync(join(TABLER_DIR, "package.json"), "utf8")) as { version: string };
  return `https://cdn.jsdelivr.net/npm/@tabler/icons@${version}/icons/${style}/${found}.svg`;
};

const readDocsMeta = (ref: string, area: "integrations" | "widgets", slugs: Array<string | null | undefined>) => {
  for (const slug of new Set(slugs)) {
    if (!slug) continue;
    const src = gitShow(ref, `apps/docs/docs/${area}/${slug}/index.ts`);
    if (src !== null) return { slug, meta: parseDocsMeta(src) };
  }
  return null;
};

const clean = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

const newKeys = (before: string[], after: string[]) => {
  const known = new Set(before);
  return after.filter((key) => !known.has(key));
};

const detectIntegrations = (from: string, to: string): Item[] => {
  const before = gitShow(from, INTEGRATION_FILE);
  const after = gitShow(to, INTEGRATION_FILE);
  if (before === null || after === null) {
    warn(`detect: ${INTEGRATION_FILE} not readable at ${before === null ? from : to}; skipping integrations`);
    return [];
  }
  const beforeDefs = parseIntegrationDefs(before);
  const afterDefs = parseIntegrationDefs(after);
  if (beforeDefs.length === 0 || afterDefs.length === 0) {
    warn(`detect: no integration definitions parsed from ${INTEGRATION_FILE}; skipping integrations`);
    return [];
  }
  const fresh = new Set(
    newKeys(
      beforeDefs.map((def) => def.key),
      afterDefs.map((def) => def.key),
    ),
  );
  return afterDefs
    .filter((def) => fresh.has(def.key))
    .map((def): Item => {
      const docs = readDocsMeta(to, "integrations", [def.docsSlug, def.key.toLowerCase(), kebab(def.key)]);
      return {
        kind: "integration",
        slug: docs?.slug ?? def.docsSlug ?? def.key,
        name: clean(docs?.meta.name) || def.name,
        description: clean(docs?.meta.description),
        iconUrl: docs?.meta.iconUrl ?? def.iconUrl,
      };
    });
};

const detectWidgets = (from: string, to: string): Item[] => {
  const before = gitShow(from, WIDGET_FILE);
  const after = gitShow(to, WIDGET_FILE);
  if (before === null || after === null) {
    warn(`detect: ${WIDGET_FILE} not readable at ${before === null ? from : to}; skipping widgets`);
    return [];
  }
  const beforeKinds = parseWidgetKinds(before);
  const afterKinds = parseWidgetKinds(after);
  if (beforeKinds.length === 0 || afterKinds.length === 0) {
    warn(`detect: no widget kinds parsed from ${WIDGET_FILE}; skipping widgets`);
    return [];
  }
  const slugs = parseWidgetSlugs(gitShow(to, WIDGET_SLUG_FILE));
  return newKeys(beforeKinds, afterKinds).map((kind): Item => {
    const docs = readDocsMeta(to, "widgets", [slugs.get(kind), kebab(kind)]);
    return {
      kind: "widget",
      slug: docs?.slug ?? slugs.get(kind) ?? kind,
      name: clean(docs?.meta.name) || humanize(kind),
      description: clean(docs?.meta.description),
      iconUrl: tablerIconUrl(docs?.meta.tablerIcon ?? null),
    };
  });
};

export const detect = (from: string, to: string): Item[] => {
  for (const ref of [from, to]) {
    if (!refExists(ref)) throw new Error(`unknown git ref: ${ref}`);
  }
  return [...detectIntegrations(from, to), ...detectWidgets(from, to)];
};
