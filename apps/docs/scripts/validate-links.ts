import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";
import { printErrors, readFiles, validateFiles, type ScanResult, type UrlMeta } from "next-validate-link";

const outputDirectory = path.resolve("out");

const toContentUrl = (file: string) => {
  const normalized = file.replaceAll(path.sep, "/");

  if (normalized.startsWith("docs/")) {
    const slug = normalized
      .slice("docs/".length)
      .replace(/(?:^|\/)index\.mdx?$/, "")
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
const urls = new Map<string, UrlMeta>();
const renderedPages: { url: string; links: string[] }[] = [];

for (const entry of output) {
  if (!entry.isFile()) continue;
  const file = path.join(entry.parentPath, entry.name);
  const relative = path.relative(outputDirectory, file).replaceAll(path.sep, "/");
  if (entry.name !== "index.html") {
    urls.set(`/${relative}`, {});
    continue;
  }
  const url = `/${relative.replace(/\/?index\.html$/, "")}`.replace(/\/$/, "") || "/";
  const $ = load(await readFile(file, "utf8"));
  const hashes = $("[id], a[name]")
    .toArray()
    .flatMap((element) => [$(element).attr("id"), $(element).attr("name")].filter((value) => value !== undefined));
  const meta = { hashes };
  urls.set(url, meta);
  urls.set(url === "/" ? url : `${url}/`, meta);
  renderedPages.push({
    url,
    links: $("a[href]")
      .toArray()
      .map((element) => $(element).attr("href"))
      .filter((href) => href !== undefined),
  });
}

const scanned: ScanResult = { urls, fallbackUrls: [] };
const results = await validateFiles(files, {
  scanned,
  checkExternal: false,
  checkRelativePaths: "exists",
  markdown: {
    components: {
      Link: { attributes: ["href", "to"] },
    },
  },
  whitelist: (url) => /^(?:https?:|mailto:|tel:)/.test(url),
});

const sourceErrors = results.filter((result) => result.errors.length > 0);
printErrors(sourceErrors);
if (sourceErrors.length > 0) process.exitCode = 1;

const renderedLinkErrors = new Set<string>();

for (const page of renderedPages) {
  for (const href of page.links) {
    if (!href) continue;
    try {
      // The export serves directories with trailing slashes, including relative links.
      const target = new URL(href, `https://homarr.dev${page.url.replace(/\/$/, "")}/`);
      if (target.origin !== "https://homarr.dev") continue;
      const pathname = decodeURI(target.pathname);
      const meta = urls.get(pathname) ?? urls.get(pathname.replace(/\/$/, "")) ?? urls.get(`${pathname}/`);
      if (!meta) {
        renderedLinkErrors.add(`${page.url}: ${href} resolves to missing route ${pathname}`);
        continue;
      }
      // Text fragments do not refer to element IDs; validate any preceding anchor.
      const hash = decodeURIComponent(target.hash.slice(1).split(":~:text=")[0]);
      if (hash && hash !== "top" && meta.hashes && !meta.hashes.includes(hash)) {
        renderedLinkErrors.add(`${page.url}: ${href} resolves to missing anchor #${hash} on ${pathname}`);
      }
    } catch {
      renderedLinkErrors.add(`${page.url}: invalid URL ${href}`);
    }
  }
}

if (renderedLinkErrors.size > 0) {
  console.error(`\n${renderedLinkErrors.size} broken rendered link(s):`);
  for (const error of renderedLinkErrors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log("0 broken rendered links");
}
