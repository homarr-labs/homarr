import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { marked } from "marked";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = join(repository, "docs/notes/remote");
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
const demoUrl = options["demo-url"] ?? "https://brainzilla.llama-stonecat.ts.net:8443/remote/";
const demoGuideUrl = new URL("try", demoUrl).href;
const demoCommand =
  options["demo-command"] ??
  "bash deployments/demo/demo.sh up --public-url https://brainzilla.llama-stonecat.ts.net:8443";
const pairCommand = "bash deployments/demo/demo.sh pair";
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
<rect x="55" y="108" width="210" height="94" rx="16" class="node"/><text x="160" y="147" text-anchor="middle" class="label">Your browser</text><text x="160" y="173" text-anchor="middle" class="note">The frontend you choose</text>
<rect x="355" y="108" width="210" height="94" rx="16" class="relay"/><text x="460" y="147" text-anchor="middle" class="label">Optional relay</text><text x="460" y="173" text-anchor="middle" class="note">Passes sealed messages</text>
<rect x="655" y="108" width="210" height="94" rx="16" class="worker"/><text x="760" y="147" text-anchor="middle" class="label">Your server</text><text x="760" y="173" text-anchor="middle" class="note">The small Homarr worker</text>
<path d="M276 155H343" class="wire" marker-start="url(#arrow)" marker-end="url(#arrow)"/><path d="M576 155H643" class="wire" marker-start="url(#arrow)" marker-end="url(#arrow)"/>
<path d="M160 211V250H760V211" class="wire" marker-start="url(#arrow)" marker-end="url(#arrow)"/><rect x="294" y="238" width="332" height="25" rx="10" fill="#fff"/><text x="460" y="256" text-anchor="middle" class="small-label">Or connect directly with HTTPS / Tailscale</text>
${supplementary}</svg>`;
  const mobile = `<svg class="flow-small" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 515" role="img" aria-labelledby="mobile-title-${technical} mobile-desc-${technical}"><title id="mobile-title-${technical}">Browser, optional relay and private worker</title><desc id="mobile-desc-${technical}">Your browser connects to your private worker through an optional blind relay, or directly using HTTPS or Tailscale. Account sign-in is separate. Your database and integrations stay on your server.</desc><defs><marker id="mobile-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0 0L8 4L0 8" fill="#7882a0"/></marker></defs><style>.m-box{fill:white;stroke:#dbe1f0;stroke-width:2}.m-relay{fill:#f8f9fd;stroke:#a1abc6;stroke-width:2;stroke-dasharray:6 5}.m-worker{fill:#eee8fc;stroke:#ab94e4;stroke-width:2}.m-line{fill:none;stroke:#7882a0;stroke-width:2}.m-title{font:700 23px system-ui,sans-serif;fill:#242d49}.m-note{font:16px system-ui,sans-serif;fill:#56617a}</style><rect x="92" y="30" width="310" height="85" rx="15" class="m-box"/><text x="247" y="65" text-anchor="middle" class="m-title">Your browser</text><text x="247" y="91" text-anchor="middle" class="m-note">The frontend you choose</text><path d="M247 125V175" class="m-line" marker-start="url(#mobile-arrow)" marker-end="url(#mobile-arrow)"/><rect x="92" y="185" width="310" height="85" rx="15" class="m-relay"/><text x="247" y="220" text-anchor="middle" class="m-title">Optional relay</text><text x="247" y="246" text-anchor="middle" class="m-note">Passes sealed messages</text><path d="M247 280V330" class="m-line" marker-start="url(#mobile-arrow)" marker-end="url(#mobile-arrow)"/><rect x="92" y="340" width="310" height="85" rx="15" class="m-worker"/><text x="247" y="375" text-anchor="middle" class="m-title">Your server</text><text x="247" y="401" text-anchor="middle" class="m-note">The small Homarr worker</text><path d="M82 72H46V382H82" class="m-line" marker-start="url(#mobile-arrow)" marker-end="url(#mobile-arrow)"/><text x="25" y="227" transform="rotate(-90 25 227)" text-anchor="middle" class="m-note">Or direct HTTPS / Tailscale</text><text x="220" y="464" text-anchor="middle" class="m-note">Account sign-in stays separate.</text><text x="220" y="490" text-anchor="middle" class="m-note">Your server decides who can connect.</text></svg>`;
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
const imageMiB = /\|\s*Final native worker image\s*\|[^|]+\|\s*([\d.]+)/.exec(report)?.[1];
let sizeFact = "The frontend runs separately";
if (imageMiB) sizeFact = `${escape(imageMiB)} MiB worker image`;
let sampleLabel = "Open the demo";
let sampleHelp = "This demo is on the private Tailscale network. A pairing link connects your browser to its worker.";
let steps = `<li><h3>Start the demo</h3><p>Run the command below in the Homarr checkout. It starts the website, relay and a disposable worker, then prints your private pairing link.</p></li><li><h3>Open your pairing link</h3><p>Open that link in your browser to connect. If you opened the demo first, paste the link into its connection form.</p></li><li><h3>Browse, then share</h3><p>View the sample dashboards. Create an invitation or a dashboard share, and try it in a second browser window.</p></li>`;
if (hasSample) {
  sampleLabel = "Open sample dashboard";
  sampleHelp =
    "One click, no GitHub sign-in needed. This view-only sample is reachable on the private Tailscale network.";
  steps = `<li><h3>Open the sample</h3><p>Use the button above. Its sharing link connects your browser to the sample worker automatically.</p></li><li><h3>Explore the dashboard</h3><p>Browse the sample widgets and images. The website reads them from the worker through the relay.</p></li><li><h3>Try the owner controls</h3><p>Use a private owner invitation from this chat, or start your own disposable demo below to try invitations, sharing and revocation.</p></li>`;
}
const introduction = `<span class="eyebrow">Homarr, with the pieces separated</span><h1>Your server does the work.<br>Your browser chooses the view.</h1><p class="lead">Run a small Homarr service on your own server. Open it from a separate website, keep your integrations at home, and share only the dashboards you choose.</p>
<div class="actions"><a class="button" href="${escape(sampleUrl)}">${sampleLabel} <span aria-hidden="true">&nbsp;↗</span></a><a href="#try">What to try</a></div><p class="small">${sampleHelp}</p>
<figure class="diagram">${flowDiagram()}<figcaption>The relay cannot open the messages. You can skip it and connect directly.</figcaption></figure>
<section id="try" aria-labelledby="try-title"><h2 id="try-title">Try it in three steps</h2><ol class="steps">${steps}</ol>
<details><summary>Run your own disposable demo</summary><p>You need <strong>Docker with Docker Compose</strong> and a checkout of this Homarr branch. From that checkout, run:</p><pre class="command"><code>bash deployments/demo/demo.sh up</code></pre><p>The command starts the demo and prints your private first-launch pairing link. Open the complete link in your browser to get owner controls.</p><p>Already running? Check how to connect:</p><pre class="command"><code>${escape(pairCommand)}</code></pre><p>Once a browser owns the worker, use that browser or an invitation from it. Restarting the demo keeps its access settings.</p><details><summary>Command for this Tailscale development server</summary><p>From <code>/home/habs/.codex/worktrees/headless-hono/homarr</code>:</p><pre class="command"><code>${escape(demoCommand)}</code></pre></details><p class="small">Keep the pairing link private. The report contains only a view-only sample share, never the worker's owner access.</p></details></section>
<section class="facts" aria-label="What is different"><div><strong>Your data stays with your server</strong><span>Your integrations and dashboard data live in the worker.</span></div><div><strong>${sizeFact}</strong><span>Stored Docker image size; running memory is measured separately.</span></div><div><strong>A separate frontend</strong><span>Use the remote viewer now, or build another frontend on the same backend.</span></div></section>
<details><summary>What this demo includes</summary><p>A working connection screen, remembered devices, a read-only dashboard viewer, invitations, dashboard shares and private images. The original dashboard editor is a separate optional frontend. This viewer does not reproduce every widget's visual design or interactive controls.</p><p>Account login helps remember workers. It does not grant access to a private worker by itself. Connecting locally with a pairing link does not require testing the live GitHub sign-in.</p><p>Demo data is disposable. The launcher uses its own containers and volumes; it does not connect this page to your existing Homarr installation.</p></details>
<section id="notes" aria-labelledby="evidence-title"><h2 id="evidence-title">Want the details?</h2><p><a href="report.html">Read the full technical report</a> for the size breakdown, test results and limitations. The individual evidence notes are here:</p>${noteLinks()}</section>`;
await writeFile(join(destination, "index.html"), document("Try Homarr's independent worker", introduction));
console.log(
  `Rendered ${notes.length} evidence pages, a friendly introduction and static SVG diagrams in ${destination}`,
);
