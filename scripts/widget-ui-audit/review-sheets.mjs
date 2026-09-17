import { readFile, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const beforePath = resolve(process.argv[2]);
const afterPath = resolve(process.argv[3]);
const destination = resolve(process.argv[4]);
const selected = process.argv.slice(5);
if (!selected.length) throw new Error("Specify widget IDs to compare");
const before = JSON.parse(await readFile(beforePath));
const after = JSON.parse(await readFile(afterPath));
await mkdir(destination, { recursive: true });
for (const kind of selected) {
  const previous = before.widgets.find((widget) => widget.id === kind);
  const current = after.widgets.find((widget) => widget.id === kind);
  if (!previous || !current) throw new Error(`Unknown widget: ${kind}`);
  for (const viewport of after.viewports) {
    const args = ["-background", "#dfe5ee", "-fill", "#263448", "-font", "DejaVu-Sans", "-pointsize", "15"];
    for (const size of after.sizes) {
      for (const [label, widget, manifestPath] of [
        ["Before", previous, beforePath],
        ["After", current, afterPath],
      ]) {
        const path = widget.screenshots[size]?.[viewport.id]?.path;
        if (!path) throw new Error(`Missing ${label}: ${kind}/${size}/${viewport.id}`);
        args.push(
          "(",
          join(dirname(manifestPath), path),
          "-thumbnail",
          "400x400>",
          "-gravity",
          "center",
          "-extent",
          "400x400",
          "-set",
          "label",
          `${label} · ${kind} · ${size}`,
          ")",
        );
      }
    }
    const output = join(destination, `${kind}--${viewport.id}.png`);
    execFileSync("montage", [...args, "-tile", "4x5", "-geometry", "+8+8", output]);
    console.log(output);
  }
}
