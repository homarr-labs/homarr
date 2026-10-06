import { readFile } from "node:fs/promises";
import vm from "node:vm";

const read = (path) => readFile(path, "utf8");

const hookUtilsModule = { exports: {} };
vm.runInNewContext(await read("apps/workshop/pb_hooks/workshop-utils.js"), { module: hookUtilsModule });
const socialHtml = hookUtilsModule.exports.renderWorkshopSocialHtml(
  '<html><head><title data-rh="true">Homarr documentation</title><meta name="robots" content="noindex"/><meta data-rh="true" property="og:title" content="Homarr documentation"><meta data-rh="true" name="description" content="Generic"><link data-rh="true" rel="canonical" href="https://homarr.dev/"></head></html>',
  {
    title: "Ocean <Glow> · Homarr Workshop",
    description: "Custom CSS for Homarr. Calm & readable.",
    url: "https://preview.example/workshop/abc",
    image: "https://preview.example/api/files/submissions/abc/preview.png",
    section: "Custom CSS",
    submissionTitle: "Ocean <Glow>",
  },
);
for (const expected of [
  "<title>Ocean &lt;Glow&gt; · Homarr Workshop</title>",
  'property="og:description" content="Custom CSS for Homarr. Calm &amp; readable."',
  'rel="canonical" href="https://preview.example/workshop/abc"',
  'property="og:image" content="https://preview.example/api/files/submissions/abc/preview.png"',
  'name="twitter:card" content="summary_large_image"',
  'property="article:section" content="Custom CSS"',
]) {
  if (!socialHtml.includes(expected)) throw new Error(`Workshop social metadata is missing: ${expected}`);
}
if (socialHtml.includes("Homarr documentation")) throw new Error("Workshop social metadata must replace generic tags");
if (socialHtml.includes("noindex")) throw new Error("Published Workshop details must not inherit the 404 noindex tag");

console.log("Workshop social metadata rendering passed");
