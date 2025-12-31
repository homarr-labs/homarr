import * as cheerio from "cheerio";
import * as fs from "fs";

// Extract a list of pathnames, given a fs path to a sitemap.xml file
// Docusaurus generates a build/sitemap.xml file for you!
export function extractSitemapPathnames(sitemapPath: string): string[] {
  const sitemap = fs.readFileSync(sitemapPath).toString();
  const $ = cheerio.load(sitemap, { xmlMode: true });
  const urls: string[] = [];
  $("loc").each(function handleLoc() {
    urls.push($(this).text());
  });
  const filteredUrls = urls.filter((url) => {
    // Remove all the /docs/tags/* urls and the /blog/tags/
    return !url.includes("/docs/tags/") && !url.includes("/blog/tags/");
  });
  return filteredUrls.map((url) => new URL(url).pathname);
}

// Converts a pathname to a decent screenshot name
export function pathnameToArgosName(pathname: string): string {
  return pathname.replace(/^\/|\/$/g, "") || "index";
}
