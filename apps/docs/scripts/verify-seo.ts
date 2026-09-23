import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { load } from "cheerio";

const outputDirectory = path.resolve("out");
const origin = new URL(process.env.HOMARR_WEBSITE_URL ?? "https://homarr.dev").origin;
const sitemap = load(await readFile(path.join(outputDirectory, "sitemap.xml"), "utf8"), { xml: true });
const locations = sitemap("url > loc")
  .toArray()
  .map((element) => sitemap(element).text());
const indexed = new Set(locations);
assert.equal(indexed.size, locations.length, "Duplicate sitemap URLs");
const robots = await readFile(path.join(outputDirectory, "robots.txt"), "utf8");
assert(robots.includes(`Sitemap: ${origin}/sitemap.xml`), "Robots must advertise this site's sitemap");
assert(!/^Disallow:\s*\/\s*$/m.test(robots), "Robots must not block the entire public site");

const files = (await readdir(outputDirectory, { recursive: true })).filter((file) => /(?:^|\/)index\.html$/.test(file));
const canonicalPages = new Set<string>();
let excluded = 0;

for (const file of files) {
  const pathname = `/${file.replace(/index\.html$/, "")}`;
  const $ = load(await readFile(path.join(outputDirectory, file), "utf8"));
  const noindex = /\bnoindex\b/.test($("meta[name=robots]").attr("content") ?? "");
  const isExcluded =
    /^\/(?:404|_not-found|blog|workshop\/admin)\/$/.test(pathname) || pathname.startsWith("/docs/category/");
  assert.equal(noindex, isExcluded, `${pathname}: unexpected robots indexing policy`);
  if (isExcluded) {
    assert(!indexed.has(`${origin}${pathname}`), `${pathname}: noindex page in sitemap`);
    if (pathname === "/blog/" || pathname.startsWith("/docs/category/")) {
      const canonical = $("link[rel=canonical]").attr("href");
      assert(canonical && indexed.has(canonical), `${pathname}: redirect destination must be indexed`);
      const destination = new URL(canonical);
      assert.equal(destination.origin, origin, `${pathname}: redirect must stay on this site`);
      assert.notEqual(destination.pathname, pathname, `${pathname}: redirect must not point to itself`);
      assert(
        $("a[href]")
          .toArray()
          .some((link) => {
            const href = $(link).attr("href");
            return href !== undefined && new URL(href, origin).href === canonical;
          }),
        `${pathname}: missing no-JavaScript redirect link`,
      );
      await access(path.join(outputDirectory, destination.pathname, "index.html"));
    }
    excluded++;
    continue;
  }

  const title = $("title").text();
  assert.equal($("h1").length, 1, `${pathname}: expected one document heading`);
  const description = $("meta[name=description]").attr("content");
  assert(title.trim() && description?.trim(), `${pathname}: missing title or description`);
  assert.equal($("link[rel=canonical]").length, 1, `${pathname}: expected one canonical URL`);
  const canonical = $("link[rel=canonical]").attr("href");
  assert.equal(canonical, `${origin}${pathname}`, `${pathname}: canonical must match exported route`);
  assert(indexed.has(canonical), `${pathname}: missing from sitemap`);
  canonicalPages.add(canonical);
  const isArticle = pathname.startsWith("/blog/") && pathname !== "/blog/";
  const socialImage = $("meta[property='og:image']").attr("content");
  const twitterCard = socialImage === `${origin}/img/logo.png` ? "summary" : "summary_large_image";

  for (const [selector, expected] of [
    ['meta[property="og:title"]', title],
    ['meta[property="og:description"]', description],
    ['meta[property="og:url"]', canonical],
    ['meta[name="twitter:title"]', title],
    ['meta[name="twitter:description"]', description],
    ['meta[name="twitter:card"]', twitterCard],
  ]) {
    assert.equal($(selector).attr("content"), expected, `${pathname}: incorrect ${selector}`);
  }
  assert.equal(
    $("meta[property='og:type']").attr("content"),
    isArticle ? "article" : "website",
    `${pathname}: OG type`,
  );
  if (isArticle) {
    const published = $("meta[property='article:published_time']").attr("content");
    assert(published && !Number.isNaN(Date.parse(published)), `${pathname}: missing article publication date`);
    assert.equal(
      published.slice(0, 10),
      $("time[datetime]").first().attr("datetime"),
      `${pathname}: incorrect publication date`,
    );
  }
  for (const selector of ['meta[property="og:image"]', 'meta[name="twitter:image"]']) {
    const href = $(selector).attr("content");
    assert(href, `${pathname}: missing ${selector}`);
    const image = new URL(href);
    assert.equal(image.origin, origin, `${pathname}: social image must use this site's origin`);
    await access(path.join(outputDirectory, decodeURIComponent(image.pathname)));
  }
}

for (const url of indexed)
  assert(canonicalPages.has(url), `${url}: sitemap does not resolve to an indexable exported page`);
for (const file of ["api/search", "llms.txt", "llms-full.txt", "workshop-runtime-config.js"]) {
  await access(path.join(outputDirectory, file));
}
console.log(
  `SEO verified: ${canonicalPages.size} canonical pages, matching social metadata and sitemap; ${excluded} noindex pages.`,
);
