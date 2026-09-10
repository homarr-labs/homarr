import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";
import { printErrors, readFiles, validateFiles, type ScanResult } from "next-validate-link";

const outputDirectory = path.resolve("out");

const toContentUrl = (file: string) => {
  const normalized = file.replaceAll(path.sep, "/");

  if (normalized.startsWith("docs/")) {
    const slug = normalized
      .slice("docs/".length)
      .replace(/\/(index)?\.mdx?$/, "")
      .replace(/\.mdx?$/, "");
    return `/docs${slug ? `/${slug}` : ""}/`;
  }

  if (normalized.includes("06-22-documentation")) return "/blog/documentation-migration/";
  if (normalized.includes("08-28-translation")) return "/blog/translations/";

  const match = /^blog\/(\d{4})\/(\d{2})-(\d{2})-(.+)\/index\.mdx?$/.exec(normalized);
  return match ? `/blog/${match[1]}/${match[2]}/${match[3]}/${match[4]}/` : undefined;
};

const files = await readFiles(["docs/**/*.{md,mdx}", "blog/**/*.{md,mdx}"], { pathToUrl: toContentUrl });
const output = await readdir(outputDirectory, { recursive: true, withFileTypes: true });
const urls = new Map<string, object>();
const renderedPages: { file: string; url: string }[] = [];

for (const entry of output) {
  if (!entry.isFile()) continue;
  const file = path.join(entry.parentPath, entry.name);
  const relative = path.relative(outputDirectory, file).replaceAll(path.sep, "/");
  if (entry.name !== "index.html") {
    urls.set(`/${relative}`, {});
    continue;
  }
  const url = `/${relative.replace(/\/?index\.html$/, "")}`.replace(/\/$/, "") || "/";
  urls.set(url, {});
  urls.set(`${url}/`, {});
  renderedPages.push({ file, url });
}

const scanned: ScanResult = { urls, fallbackUrls: [] };
const results = await validateFiles(files, {
  scanned,
  checkExternal: false,
  checkRelativePaths: "exists",
  ignoreFragment: true,
  markdown: {
    components: {
      Link: { attributes: ["href", "to"] },
    },
  },
  whitelist: (url) =>
    /^(?:https?:|mailto:|tel:|#)/.test(url) ||
    /^\/(?:api\/|custom-widgets\/|data\/|img\/|workshop(?:\/|$)|llms(?:-|\.|\/)|robots\.txt|sitemap\.xml)/.test(url),
});

printErrors(
  results.filter((result) => result.errors.length > 0),
  true,
);

const renderedLinkErrors = new Set<string>();

for (const page of renderedPages) {
  const $ = load(await readFile(page.file, "utf8"));

  $("main a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href || /^(?:https?:|mailto:|tel:|#)/.test(href)) return;

    const target = new URL(href, `https://homarr.dev${page.url}`).pathname;
    if (/^\/(?:_next\/|api\/|custom-widgets\/|data\/|img\/|videos\/)/.test(target)) return;
    if (/\.(?:avif|gif|jpe?g|json|md|mp4|png|svg|webm|webp)$/i.test(target)) return;
    if (urls.has(target) || urls.has(target.replace(/\/$/, "")) || urls.has(`${target}/`)) return;

    renderedLinkErrors.add(`${page.url}: ${href} resolves to missing route ${target}`);
  });
}

if (renderedLinkErrors.size > 0) {
  console.error(`\n${renderedLinkErrors.size} broken rendered link(s):`);
  for (const error of renderedLinkErrors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("0 broken rendered links");
}
