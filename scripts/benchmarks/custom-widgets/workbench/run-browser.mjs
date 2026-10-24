import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const base = resolve(process.env.OUTPUT ?? `${import.meta.dirname}/../output/workbench`);
await mkdir(base, { recursive: true });
const environment = { ...process.env, AGENT_BROWSER_SESSION: process.env.AGENT_BROWSER_SESSION ?? "cw-workbench-perf" };
const origin = process.env.ORIGIN ?? "http://127.0.0.1:4187";
const labels = (process.env.LABELS ?? "before,after,before,after").split(",");
for (const label of labels) {
  const run = label === "ported" ? 2 : (globalThis[label] = (globalThis[label] ?? 0) + 1);
  execFileSync("agent-browser", ["open", `${origin}/${label}/index.html`], { env: environment });
  const raw = execFileSync(
    "agent-browser",
    [
      "eval",
      `(async()=>{window.mount('editor');await new Promise(r=>setTimeout(r,1000));const initial={...window.__counts};const editor=await window.runEditor();const openedReference=await window.runOpenedReference();const completions=window.runCompletions();window.mount('response');await new Promise(r=>setTimeout(r,300));const responseInitial={...window.__counts};const response=await window.runResponse();window.mount('form');await new Promise(r=>setTimeout(r,300));const form=await window.runForm();return {initial,editor,openedReference,completions,responseInitial,response,form};})()`,
    ],
    { env: environment, encoding: "utf8", maxBuffer: 1000000 },
  );
  await writeFile(`${base}/browser-${label}${run}.json`, raw);
  const data = JSON.parse(raw);
  const summary = (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    return { median: sorted[Math.floor(sorted.length * 0.5)], p95: sorted[Math.floor(sorted.length * 0.95)] };
  };
  console.log(
    JSON.stringify({
      label,
      run,
      initial: data.initial,
      editor: { ...summary(data.editor.samples), counts: data.editor.counts, editors: data.editor.editors },
      response: { ...summary(data.response.samples), counts: data.response.counts },
      responseInitial: data.responseInitial,
      openedReference: { ...summary(data.openedReference.samples), counts: data.openedReference.counts },
      form: data.form,
      completions: { ...summary(data.completions.samples), counts: data.completions.counts },
    }),
  );
}
