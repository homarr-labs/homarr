import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Item } from "./items";

const REPO_ROOT = join(import.meta.dirname, "../..");
const INTEGRATION_FILE = "packages/definitions/src/integration.ts";
const WIDGET_FILE = "packages/definitions/src/widget.ts";
const WIDGET_SLUG_FILE = "packages/definitions/src/docs/widget-doc-slugs.ts";
const TABLER_DIR = join(REPO_ROOT, "node_modules/@tabler/icons");

class Identifier {
  constructor(readonly name: string) {}
}

type Value = string | Value[] | Map<string, Value> | Identifier | null;

const QUOTE = /["'`]/;
const OPENER = /[([{]/;
const CLOSER = /[)\]}]/;
const TERMINATOR = /[,}\]]/;
const IDENTIFIER = /[\w$]+/y;
const TRIVIA = /(?:\s+|\/\/[^\n]*|\/\*[\s\S]*?(?:\*\/|$))+/y;
const ESCAPE = /\\(u\{[0-9a-fA-F]+\}|u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|\r?\n|[\s\S])/g;
const SIMPLE_ESCAPES: Record<string, string> = { n: "\n", t: "\t", r: "\r", b: "\b", f: "\f", v: "\v", "0": "\0" };

const unescape = (raw: string) =>
  raw.replace(ESCAPE, (_, escape: string) => {
    if (escape.startsWith("u{")) return String.fromCodePoint(Number.parseInt(escape.slice(2, -1), 16));
    if (escape.length > 1 && /^[ux]/.test(escape)) return String.fromCharCode(Number.parseInt(escape.slice(1), 16));
    if (/^\r?\n$/.test(escape)) return "";
    return SIMPLE_ESCAPES[escape] ?? escape;
  });

class Parser {
  constructor(
    private readonly src: string,
    private i: number,
  ) {}

  value(): Value {
    this.skip();
    const ch = this.src[this.i];
    if (ch === undefined) return null;
    if (QUOTE.test(ch)) return this.string();
    if (ch === "[") return this.array();
    if (ch === "{") return this.object();
    const word = this.word();
    if (word === null || word === "null") return null;
    return new Identifier(word);
  }

  private skip() {
    TRIVIA.lastIndex = this.i;
    const match = TRIVIA.exec(this.src);
    if (match) this.i += match[0].length;
  }

  private word() {
    IDENTIFIER.lastIndex = this.i;
    const found = IDENTIFIER.exec(this.src)?.[0];
    if (found === undefined) return null;
    this.i += found.length;
    return found;
  }

  private string() {
    const quote = this.src.charAt(this.i);
    this.i++;
    const start = this.i;
    while (this.i < this.src.length) {
      const ch = this.src.charAt(this.i);
      if (ch === "\\") {
        this.i += 2;
        continue;
      }
      if (ch === quote || (ch === "\n" && quote !== "`")) break;
      this.i++;
    }
    const raw = this.src.slice(start, this.i);
    this.i++;
    if (quote === "`" && raw.includes("${")) return null;
    return unescape(raw);
  }

  private key() {
    if (QUOTE.test(this.src.charAt(this.i))) return this.string();
    return this.word();
  }

  private member(): Value {
    const result = this.value();
    this.skip();
    const next = this.src[this.i];
    if (next === undefined || TERMINATOR.test(next)) return result;
    this.skipExpression();
    return null;
  }

  private skipExpression() {
    let depth = 0;
    for (;;) {
      this.skip();
      const ch = this.src[this.i];
      if (ch === undefined) return;
      if (QUOTE.test(ch)) {
        this.string();
        continue;
      }
      if (OPENER.test(ch)) depth++;
      if (CLOSER.test(ch)) {
        if (depth === 0) return;
        depth--;
      }
      if (ch === "," && depth === 0) return;
      this.i++;
    }
  }

  private array() {
    const items: Value[] = [];
    this.i++;
    for (;;) {
      this.skip();
      const ch = this.src[this.i];
      if (ch === undefined) return items;
      if (ch === "]") {
        this.i++;
        return items;
      }
      if (ch === ",") {
        this.i++;
        continue;
      }
      const start = this.i;
      items.push(this.member());
      if (this.i === start) this.i++;
    }
  }

  private object() {
    const entries = new Map<string, Value>();
    this.i++;
    for (;;) {
      this.skip();
      const ch = this.src[this.i];
      if (ch === undefined) return entries;
      if (ch === "}") {
        this.i++;
        return entries;
      }
      if (ch === ",") {
        this.i++;
        continue;
      }
      const start = this.i;
      const key = this.key();
      this.skip();
      const next = this.src.charAt(this.i);
      if (key !== null && next === ":") {
        this.i++;
        entries.set(key, this.member());
      } else if (key !== null && /[,}]/.test(next)) {
        entries.set(key, new Identifier(key));
      } else {
        this.skipExpression();
      }
      if (this.i === start) this.i++;
    }
  }
}

const parseDeclarations = (src: string, name = "[\\w$]+") =>
  [...src.matchAll(new RegExp(`^export const ${name}\\b[^=]*=(?![=>])`, "gm"))].map((match) =>
    new Parser(src, match.index + match[0].length).value(),
  );

const parseDeclaration = (src: string, name: string): Value => parseDeclarations(src, name)[0] ?? null;

const field = (value: Value | undefined, key: string) => {
  if (value instanceof Map) return value.get(key);
  return undefined;
};

const text = (value: Value | undefined) => {
  if (typeof value === "string") return value;
  return null;
};

const identifier = (value: Value | undefined) => {
  if (value instanceof Identifier) return value.name;
  return null;
};

interface IntegrationDef {
  key: string;
  name: string | null;
  iconUrl: string | null;
  docsSlug: string | null;
}

interface DocsMeta {
  name: string | null;
  description: string | null;
  iconUrl: string | null;
  icon: string | null;
}

const parseIntegrations = (src: string): IntegrationDef[] => {
  const defs = parseDeclaration(src, "integrationDefs");
  if (!(defs instanceof Map)) return [];
  return [...defs]
    .filter(([, def]) => def instanceof Map)
    .map(([key, def]) => ({
      key,
      name: text(field(def, "name")),
      iconUrl: text(field(def, "iconUrl")),
      docsSlug: text(field(def, "documentationSlug")),
    }));
};

const parseWidgetKinds = (src: string) => {
  const kinds = parseDeclaration(src, "widgetKinds");
  if (!Array.isArray(kinds)) return [];
  return kinds.filter((kind): kind is string => typeof kind === "string");
};

const parseWidgetSlugs = (src: string | null) => {
  const slugs = new Map<string, string>();
  const table = parseDeclaration(src ?? "", "widgetDocSlugs");
  if (!(table instanceof Map)) return slugs;
  for (const [kind, slug] of table) {
    if (typeof slug === "string") slugs.set(kind, slug);
  }
  return slugs;
};

const parseDocs = (src: string): DocsMeta => {
  const doc = parseDeclarations(src).find((value) => field(value, "name") !== undefined);
  return {
    name: text(field(doc, "name")),
    description: text(field(doc, "description")),
    iconUrl: text(field(doc, "iconUrl")),
    icon: identifier(field(doc, "icon")),
  };
};

const git = (args: string[]) =>
  execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    stdio: ["ignore", "pipe", "ignore"],
  });

const gitShow = (ref: string, path: string) => {
  try {
    return git(["show", `${ref}:${path}`]);
  } catch {
    return null;
  }
};

const refExists = (ref: string) => {
  try {
    git(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`]);
    return true;
  } catch {
    return false;
  }
};

const kebab = (value: string) => value.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const humanize = (kind: string) =>
  kebab(kind)
    .split(/[-\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const collapse = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();

const tablerIconUrl = (component: string | null) => {
  if (component === null) return null;
  const base = kebab(component.replace(/^Icon/, ""));
  const stem = base.replace(/-filled$/, "");
  let style = "outline";
  if (stem !== base) style = "filled";
  const dir = join(TABLER_DIR, "icons", style);
  if (!existsSync(dir)) return null;
  const found = [stem.replace(/([a-z])(\d)/g, "$1-$2"), stem].find((name) => existsSync(join(dir, `${name}.svg`)));
  if (!found) return null;
  const { version } = JSON.parse(readFileSync(join(TABLER_DIR, "package.json"), "utf8")) as { version: string };
  return `https://cdn.jsdelivr.net/npm/@tabler/icons@${version}/icons/${style}/${found}.svg`;
};

const readDocs = (ref: string, area: "integrations" | "widgets", slugs: Array<string | null | undefined>) => {
  for (const slug of new Set(slugs)) {
    if (!slug) continue;
    for (const file of ["index.ts", "index.tsx"]) {
      const src = gitShow(ref, `apps/docs/docs/${area}/${slug}/${file}`);
      if (src !== null) return { slug, meta: parseDocs(src) };
    }
  }
  return null;
};

const readDefinitions = <T>(ref: string, file: string, parse: (src: string) => T[]) => {
  const src = gitShow(ref, file);
  if (src === null) {
    console.error(`detect: ${file} not found at ${ref}; skipping`);
    return null;
  }
  const parsed = parse(src);
  if (parsed.length === 0) throw new Error(`no definitions parsed from ${file} at ${ref}`);
  return parsed;
};

const added = <T>(before: T[], after: T[], key: (entry: T) => string) => {
  const known = new Set(before.map(key));
  return after.filter((entry) => !known.has(key(entry)));
};

const detectIntegrations = (from: string, to: string): Item[] => {
  const before = readDefinitions(from, INTEGRATION_FILE, parseIntegrations);
  const after = readDefinitions(to, INTEGRATION_FILE, parseIntegrations);
  if (!before || !after) return [];
  return added(before, after, (def) => def.key).map((def): Item => {
    const docs = readDocs(to, "integrations", [def.docsSlug, def.key.toLowerCase(), kebab(def.key)]);
    return {
      kind: "integration",
      slug: docs?.slug ?? def.docsSlug ?? def.key,
      name: collapse(docs?.meta.name) || def.name || def.key,
      description: collapse(docs?.meta.description),
      iconUrl: docs?.meta.iconUrl ?? def.iconUrl,
    };
  });
};

const detectWidgets = (from: string, to: string): Item[] => {
  const before = readDefinitions(from, WIDGET_FILE, parseWidgetKinds);
  const after = readDefinitions(to, WIDGET_FILE, parseWidgetKinds);
  if (!before || !after) return [];
  const slugs = parseWidgetSlugs(gitShow(to, WIDGET_SLUG_FILE));
  return added(before, after, (kind) => kind).map((kind): Item => {
    const docs = readDocs(to, "widgets", [slugs.get(kind), kebab(kind)]);
    return {
      kind: "widget",
      slug: docs?.slug ?? slugs.get(kind) ?? kind,
      name: collapse(docs?.meta.name) || humanize(kind),
      description: collapse(docs?.meta.description),
      iconUrl: tablerIconUrl(docs?.meta.icon ?? null),
    };
  });
};

export const detect = (from: string, to: string): Item[] => {
  for (const ref of [from, to]) {
    if (ref.startsWith("-") || !refExists(ref)) throw new Error(`unknown git ref: ${ref}`);
  }
  return [...detectIntegrations(from, to), ...detectWidgets(from, to)];
};
