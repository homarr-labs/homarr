import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { marked } from "marked";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = join(repository, "docs/notes/native-workers");
const options = {};
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  const value = process.argv[index + 1];
  if (!key?.startsWith("--") || !value)
    throw new Error("Expected --output PATH [--demo-url URL] [--demo-command COMMAND]");
  options[key.slice(2)] = value;
}
if (!options.output) throw new Error("Pass --output with the report destination directory");
const destination = resolve(options.output);
const demoUrl = options["demo-url"] ?? "https://brainzilla.llama-stonecat.ts.net:8445/";
const demoGuideUrl = "#try";
const demoCommand =
  options["demo-command"] ??
  "bash scripts/native-demo.sh up --public-url https://brainzilla.llama-stonecat.ts.net:8445";
let sampleUrl = demoUrl;
let hasSample = false;
if (options["demo-link-file"]) {
  const supplied = new URL((await readFile(options["demo-link-file"], "utf8")).trim());
  const fragment = new URLSearchParams(supplied.hash.slice(1));
  if (supplied.protocol !== "https:" || fragment.has("claim") || fragment.has("invite") || fragment.has("grant"))
    throw new Error("The report may publish only an HTTPS read-only sample share");
  const token = fragment.get("share");
  const [body, signature, extra] = (token ?? "").split(".");
  if (!body || !signature || extra) throw new Error("The sample must contain a worker-issued dashboard share");
  const grant = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (
    grant.role !== "viewer" ||
    grant.type !== "share" ||
    grant.subject !== "bearer" ||
    grant.anonymous === false ||
    !Array.isArray(grant.boardIds) ||
    !grant.boardIds.length ||
    !Number.isSafeInteger(grant.expiresAt) ||
    grant.expiresAt <= Date.now()
  )
    throw new Error("The sample must be an unexpired anonymous viewer share of selected dashboards");
  const publicJwk = JSON.parse(Buffer.from(fragment.get("key") ?? "", "base64url").toString("utf8"));
  const publicKey = await crypto.subtle.importKey("jwk", publicJwk, { name: "ECDSA", namedCurve: "P-256" }, false, [
    "verify",
  ]);
  if (
    !(await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      Buffer.from(signature, "base64url"),
      Buffer.from(body),
    ))
  )
    throw new Error("The sample share signature does not match its pinned worker");
  sampleUrl = supplied.href;
  hasSample = true;
}
const escape = (value) =>
  String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const stylesheet = `
:root{color-scheme:light;--ink:#242d49;--muted:#56617a;--paper:#f3f5fc;--line:#dbe1f0;--purple:#633ac7;--pink:#c93671;--white:#fff}
*{box-sizing:border-box}body{margin:0;color:var(--ink);background:var(--paper);font:16px/1.65 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:#5530b4;text-underline-offset:3px}a:hover{color:#3c2087}a:focus-visible,summary:focus-visible{outline:3px solid var(--pink);outline-offset:5px}main{max-width:1120px;margin:auto;padding:30px 28px 72px}h1,h2,h3{font-family:"Trebuchet MS",ui-rounded,system-ui,sans-serif;line-height:1.15;letter-spacing:-.025em}h1{font-size:clamp(2rem,4.6vw,3.65rem);max-width:860px;margin:15px 0 22px}h2{font-size:1.65rem;margin:2em 0 .7em}h3{font-size:1.18rem}p{max-width:80ch}nav{display:flex;gap:12px 24px;flex-wrap:wrap;align-items:center;margin-bottom:34px;font-size:.9rem}.brand{color:var(--ink);font-weight:750;text-decoration:none;margin-right:auto}.eyebrow{color:var(--purple);font-size:.84rem;font-weight:700;text-transform:uppercase;letter-spacing:.12em}.lead{font-size:1.23rem;line-height:1.6;max-width:65ch;color:var(--muted)}.actions{display:flex;flex-wrap:wrap;gap:15px 22px;align-items:center;margin:28px 0 10px}.button{display:inline-flex;align-items:center;justify-content:center;background:var(--purple);color:white;border:2px solid var(--purple);border-radius:10px;padding:11px 21px;text-decoration:none;font-weight:650}.button:hover{background:#4d28aa;color:white}.small{font-size:.9rem;color:var(--muted)}.diagram{margin:30px 0;background:var(--white);border:1px solid var(--line);border-radius:18px;padding:24px}.diagram svg{display:block;width:100%;height:auto}.diagram figcaption{font-size:.92rem;color:var(--muted);margin:12px 0 0}.steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:26px;margin:22px 0 30px;padding:0;list-style:none;counter-reset:steps}.steps li{counter-increment:steps;border-top:3px solid var(--line);padding-top:17px}.steps li::before{content:counter(steps);display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:#eae3fc;color:var(--purple);font-weight:750}.steps h3{margin:13px 0 9px}.steps p{color:var(--muted);margin:0}.facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;border-block:1px solid var(--line);padding:19px 0;margin:32px 0}.facts strong{display:block;font-size:1.2rem}.facts span{font-size:.9rem;color:var(--muted)}details{margin:20px 0;border:1px solid var(--line);border-radius:12px;background:white;padding:15px 19px}summary{cursor:pointer;font-weight:650}.evidence{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px 24px;padding-left:20px}.technical h1{font-size:2.35rem}.technical h2{margin-top:2em}.technical table{display:block;overflow:auto;border-collapse:collapse;background:white;max-width:100%;margin:24px 0;font-size:14px}.technical th,.technical td{border:1px solid var(--line);padding:10px 13px;text-align:left;vertical-align:top}.technical th{background:#e9edf8}.technical pre,pre.command{overflow:auto;background:#e9edf7;padding:16px;border-radius:8px;white-space:pre;line-height:1.55}code{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.88em;overflow-wrap:anywhere}.technical blockquote{margin-left:0;border-left:4px solid #ac98e3;padding-left:18px;color:var(--muted)}footer{margin-top:45px;border-top:1px solid var(--line);padding-top:20px;color:var(--muted);font-size:.88rem}.technical aside{border-block:1px solid var(--line);margin-top:40px;padding-top:5px}.technical .evidence{font-size:.93rem}.diagram-source pre{font-size:.8rem}.skip{position:absolute;left:-10000px}.skip:focus{left:15px;top:10px;background:white;padding:10px;z-index:2}
@media(max-width:720px){main{padding:22px 18px 48px}nav{gap:10px 15px;margin-bottom:28px}.brand{flex-basis:100%}.steps,.facts{grid-template-columns:1fr;gap:20px}.evidence{grid-template-columns:repeat(2,minmax(0,1fr))}.diagram{padding:12px;margin:22px 0}.technical h1{font-size:1.8rem}.lead{font-size:1.1rem}.steps li{padding-top:12px}.technical table{font-size:13px}.button{width:100%}}
@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important}}
`;

function flowDiagram(technical = false) {
  let supplementary = `<text x="460" y="307" text-anchor="middle" class="note">Account sign-in saves your workers. Your server still decides who can connect.</text>`;
  if (technical)
    supplementary = `<path d="M160 108V51H420" class="account" marker-end="url(#arrow)"/><rect x="423" y="20" width="208" height="65" rx="12" class="account-box"/><text x="527" y="47" text-anchor="middle" class="small-label">Homarr account service</text><text x="527" y="68" text-anchor="middle" class="note">Existing PocketBase / GitHub</text><text x="278" y="39" text-anchor="middle" class="note">Sign-in and worker names</text><path d="M865 180H898V324H875" class="wire" marker-end="url(#arrow)"/><rect x="655" y="295" width="210" height="58" rx="12" class="account-box"/><text x="760" y="319" text-anchor="middle" class="small-label">Database + integrations</text><text x="760" y="339" text-anchor="middle" class="note">Remain on your server</text>`;
  let viewBox = "0 0 920 335";
  if (technical) viewBox = "0 0 920 380";
  const desktop = `<svg class="flow-wide" xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-labelledby="diagram-title-${technical} diagram-desc-${technical}">
<title id="diagram-title-${technical}">Your browser connects to your Homarr worker, directly or through an optional relay</title><desc id="diagram-desc-${technical}">Your browser and private server open the messages. An optional relay passes encrypted messages between them. Direct HTTPS or Tailscale skips the Homarr relay. Account sign-in is separate from private dashboard traffic.${technical ? " Your database and integrations remain attached to the private worker." : ""}</desc>
<defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0 0L8 4L0 8" fill="#7882a0"/></marker></defs><style>.node{fill:#fff;stroke:#dbe1f0;stroke-width:2}.worker{fill:#eee8fc;stroke:#ab94e4;stroke-width:2}.relay{fill:#f8f9fd;stroke:#a1abc6;stroke-width:2;stroke-dasharray:6 5}.wire{fill:none;stroke:#7882a0;stroke-width:2}.account{fill:none;stroke:#ac98e3;stroke-width:2;stroke-dasharray:5 5}.account-box{fill:#f8f9fd;stroke:#dbe1f0;stroke-width:1.5}.label{font:700 20px system-ui,sans-serif;fill:#242d49}.small-label{font:650 15px system-ui,sans-serif;fill:#242d49}.note{font:14px system-ui,sans-serif;fill:#56617a}.accent{fill:#633ac7}</style>
<rect x="55" y="108" width="210" height="94" rx="16" class="node"/><text x="160" y="147" text-anchor="middle" class="label">Your browser</text><text x="160" y="173" text-anchor="middle" class="note">Normal Homarr frontend</text>
<rect x="355" y="108" width="210" height="94" rx="16" class="relay"/><text x="460" y="147" text-anchor="middle" class="label">Optional relay</text><text x="460" y="173" text-anchor="middle" class="note">Passes sealed messages</text>
<rect x="655" y="108" width="210" height="94" rx="16" class="worker"/><text x="760" y="147" text-anchor="middle" class="label">Your workers</text><text x="760" y="173" text-anchor="middle" class="note">Primary + integrations</text>
<path d="M276 155H343" class="wire" marker-start="url(#arrow)" marker-end="url(#arrow)"/><path d="M576 155H643" class="wire" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
<path d="M160 211V250H760V211" class="wire" marker-start="url(#arrow)" marker-end="url(#arrow)"/><rect x="294" y="238" width="332" height="25" rx="10" fill="#fff"/><text x="460" y="256" text-anchor="middle" class="small-label">Or connect directly with HTTPS / Tailscale</text>
${supplementary}</svg>`;
  const mobile = `<svg class="flow-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 515" role="img" aria-labelledby="mobile-title-${technical} mobile-desc-${technical}"><title id="mobile-title-${technical}">Browser, optional relay and private worker</title><desc id="mobile-desc-${technical}">Your browser connects to your private worker through an optional blind relay, or directly using HTTPS or Tailscale. Account sign-in is separate. Your database and integrations stay on your server.</desc><defs><marker id="mobile-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0 0L8 4L0 8" fill="#7882a0"/></marker></defs><style>.m-box{fill:white;stroke:#dbe1f0;stroke-width:2}.m-relay{fill:#f8f9fd;stroke:#a1abc6;stroke-width:2;stroke-dasharray:6 5}.m-worker{fill:#eee8fc;stroke:#ab94e4;stroke-width:2}.m-line{fill:none;stroke:#7882a0;stroke-width:2}.m-title{font:700 23px system-ui,sans-serif;fill:#242d49}.m-note{font:16px system-ui,sans-serif;fill:#56617a}</style><rect x="92" y="30" width="310" height="85" rx="15" class="m-box"/><text x="247" y="65" text-anchor="middle" class="m-title">Your browser</text><text x="247" y="91" text-anchor="middle" class="m-note">Normal Homarr frontend</text><path d="M247 125V175" class="m-line" marker-start="url(#mobile-arrow)" marker-end="url(#mobile-arrow)"/><rect x="92" y="185" width="310" height="85" rx="15" class="m-relay"/><text x="247" y="220" text-anchor="middle" class="m-title">Optional relay</text><text x="247" y="246" text-anchor="middle" class="m-note">Passes sealed messages</text><path d="M247 280V330" class="m-line" marker-start="url(#mobile-arrow)" marker-end="url(#mobile-arrow)"/><rect x="92" y="340" width="310" height="85" rx="15" class="m-worker"/><text x="247" y="375" text-anchor="middle" class="m-title">Your workers</text><text x="247" y="401" text-anchor="middle" class="m-note">Primary + integrations</text><path d="M82 72H46V382H82" class="m-line" marker-start="url(#mobile-arrow)" marker-end="url(#mobile-arrow)"/><text x="25" y="227" transform="rotate(-90 25 227)" text-anchor="middle" class="m-note">Or direct HTTPS / Tailscale</text><text x="220" y="464" text-anchor="middle" class="m-note">Account sign-in stays separate.</text><text x="220" y="490" text-anchor="middle" class="m-note">Your server decides who can connect.</text></svg>`;
  return desktop + mobile;
}

const notes = [];
for (const filename of (await readdir(sourceDirectory)).filter((name) => name.endsWith(".md")).toSorted()) {
  const markdown = await readFile(join(sourceDirectory, filename), "utf8");
  const title = /^#\s+(.+)$/m.exec(markdown)?.[1] ?? filename;
  notes.push({ filename, markdown, title });
}
const navigation = `<nav aria-label="Report navigation"><a class="brand" href="index.html">Homarr · independent worker</a><a href="${escape(demoGuideUrl)}">Start here</a><a href="${escape(demoUrl)}">Open demo</a><a href="report.html">Technical report</a><a href="index.html#notes">Evidence notes</a></nav>`;
const noteLinks = () =>
  `<ul class="evidence">${notes
    .filter((note) => note.filename !== "report.md")
    .map((note) => `<li><a href="${escape(note.filename.replace(/\.md$/, ".html"))}">${escape(note.title)}</a></li>`)
    .join("")}</ul>`;
const document = (title, content, className = "") =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="referrer" content="no-referrer"><title>${escape(title)}</title><style>${stylesheet}h1{max-width:1000px}.diagram .flow-small{display:none}@media(max-width:720px){.diagram .flow-wide{display:none}.diagram .flow-small{display:block}}</style></head><body><a class="skip" href="#main">Skip to content</a><main id="main" class="${className}">${navigation}${content}<footer>Local development demonstration · 16 October 2026 · Full implementation details and limitations are in the technical report.</footer></main></body></html>`;

function renderMarkdown(markdown) {
  const diagrams = [];
  const prepared = markdown.replace(/```mermaid\s*\n([\s\S]*?)```/g, (_match, source) => {
    if (!source.includes("Browser[") || !source.includes("Worker[") || !source.includes("Relay["))
      throw new Error("Unrecognized report diagram: add a static SVG renderer before publishing");
    const marker = `HOMARR_REPORT_DIAGRAM_${diagrams.length}`;
    diagrams.push(
      `<figure class="diagram">${flowDiagram(true)}<figcaption>Private dashboard traffic goes between your browser and worker. Account sign-in follows a separate path.</figcaption></figure><details class="diagram-source"><summary>Diagram source</summary><pre><code>${escape(source.trim())}</code></pre></details>`,
    );
    return `\n\n${marker}\n\n`;
  });
  let html = marked.parse(prepared);
  for (let index = 0; index < diagrams.length; index++)
    html = html.replace(`<p>HOMARR_REPORT_DIAGRAM_${index}</p>`, diagrams[index]);
  return html.replace(/href="([^":?#]+)\.md((?:#[^"]*)?)"/g, 'href="$1.html$2"');
}

await mkdir(destination, { recursive: true });
for (const note of notes) {
  await writeFile(join(destination, note.filename), note.markdown);
  const sourceLink = `<p class="small"><a href="${escape(note.filename)}">Read the Markdown source</a></p>`;
  const related = `<aside aria-labelledby="notes-title"><h2 id="notes-title">Evidence and notes</h2>${noteLinks()}</aside>`;
  await writeFile(
    join(destination, note.filename.replace(/\.md$/, ".html")),
    document(note.title, sourceLink + renderMarkdown(note.markdown) + related, "technical"),
  );
}

const report = notes.find((note) => note.filename === "report.md")?.markdown ?? "";
const imageMiB = /\|\s*Headless worker image\s*\|\s*([\d.]+)\s*MiB/.exec(report)?.[1];
let sizeFact = "A small Bun worker";
if (imageMiB) sizeFact = `${escape(imageMiB)} MiB worker image`;
let sampleLabel = "Open normal Homarr";
let sampleHelp =
  "Use your private setup link from this chat to connect the demo workers. This demo is on your private Tailscale network.";
if (hasSample) {
  sampleLabel = "Try the normal Homarr board";
  sampleHelp =
    "Open the sample and press Connect worker to see the normal Homarr interface. Use your separate private owner link to try editing and worker setup.";
}
const introduction = `<span class="eyebrow">Normal Homarr · independent workers</span><h1>The Homarr you know.<br>Workers wherever you need them.</h1>
<p class="lead">Keep the normal board editor, widgets, Custom Widgets and settings. Manage workers on the Your Homarr workers page, with a small header switcher. One worker stores your boards; other workers can provide integrations.</p>
<div class="actions"><a class="button" href="${escape(sampleUrl)}">${sampleLabel} <span aria-hidden="true">&nbsp;↗</span></a><a href="#try">How to try it</a></div><p class="small">${sampleHelp}</p>
<figure class="diagram">${flowDiagram()}<figcaption>Your browser connects to your workers. The routing relay passes encrypted messages. Hosted MCP uses the relay as a separately approved client.</figcaption></figure>
<section id="try" aria-labelledby="try-title"><h2 id="try-title">Three things to try</h2><ol class="steps">
<li><h3>Open normal Homarr</h3><p>Use the sample above, or open your private owner link and press Connect worker to try editing. The board, editor and settings are the normal Homarr frontend.</p></li>
<li><h3>Open worker management</h3><p>Open Management → Your Homarr workers. Add your second private worker link; the primary stays selected. Use the header switcher when you want to open another worker’s boards.</p></li>
<li><h3>Use another worker's services</h3><p>On the primary, open Integrations. Choose services from your other worker and approve them. They appear in the normal widget picker.</p></li></ol>
<details><summary>Run your own two-worker demo</summary><p>From this Homarr checkout, with Docker running:</p><pre class="command"><code>bash scripts/native-demo.sh up
bash scripts/native-demo.sh pair primary
bash scripts/native-demo.sh pair integrations</code></pre><p>Open the complete private link printed for the primary, then add the second in Worker setup. No GitHub sign-in is needed for local pairing. Stopping the demo keeps its data and keys:</p><pre class="command"><code>bash scripts/native-demo.sh down</code></pre><details><summary>Command for this Tailscale development server</summary><pre class="command"><code>${escape(demoCommand)}</code></pre></details><p class="small">Keep owner links private. A public sample link is read-only and limited to its selected demo board.</p></details></section>
<section class="facts" aria-label="What changed"><div><strong>Normal Homarr</strong><span>The existing editor and widgets, with worker connections.</span></div><div><strong>${sizeFact}</strong><span>Docker image storage. Running memory is a separate measurement.</span></div><div><strong>Independent services</strong><span>The frontend can start with no worker, database or Redis.</span></div></section>
<details><summary>Accounts, organizations and MCP</summary><p>A worker-local organization supports invitations and username/password users without GitHub. An optional Workshop/GitHub account organizes workers across servers. Private access is still approved by each worker. Global OAuth MCP discovers approved services and always uses the encrypted relay.</p><p>The relay cannot decrypt requests. The separately approved hosted MCP gateway handles the tool data it returns. Your browser's owner key is not copied to it. Live GitHub sign-in and deployment to homarr.dev were excluded from this local verification.</p></details>
<section id="notes" aria-labelledby="evidence-title"><h2 id="evidence-title">Report and checks</h2><p><a href="report.html">Read the implementation report</a>. The scratchpad, agreed scope and baseline test audit are separate notes:</p>${noteLinks()}</section>`;
await writeFile(join(destination, "index.html"), document("Normal Homarr with independent workers", introduction));
console.log(
  `Rendered ${notes.length} native-worker notes and a short guide with static SVG diagrams in ${destination}`,
);
