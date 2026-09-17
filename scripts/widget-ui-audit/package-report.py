"""Package the built review site and its React source, retaining published evidence only."""
import json
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED

root = Path(__file__).resolve().parents[2]
project = root / "tools/widget-ui-report"
built = project / "dist"
archive = built / "widget-ui-review-website.zip"
if not (built / "comparison.json").is_file():
    raise SystemExit("Build the matched comparison report first")

with ZipFile(archive, "w", ZIP_DEFLATED, compresslevel=6) as bundle:
    for path in sorted(built.rglob("*")):
        if not path.is_file() or path == archive:
            continue
        relative = path.relative_to(built)
        if relative.parts[0] == "screenshots" or relative.name.startswith("manifest-") or relative == Path("manifest.json"):
            continue
        if relative.parts[0] == "runs" and relative.parts[1] not in {"before", "after", "original"}:
            continue
        bundle.write(path, relative)
    comparison = json.loads((built / "comparison.json").read_text())
    bundle.writestr("manifest.json", json.dumps(comparison["after"]))
    for name in ["index.html", "package.json", "vite.config.js", "README.md"]:
        bundle.write(project / name, Path("source") / name)
    for path in sorted((project / "src").rglob("*")):
        if path.is_file():
            bundle.write(path, Path("source") / path.relative_to(project))
    bundle.writestr("source/LOCAL-DEVELOPMENT.txt", """The built report runs directly from the archive root; see ../RUN.txt.

To edit the React report, open a terminal in source/ and prepare its public data:
  mkdir -p public
  cp ../manifest.json ../comparison.json public/
  cp -R ../runs public/
  pnpm install
  pnpm dev

Evidence is stored once in the ZIP to keep the download smaller.
""")
    bundle.writestr("RUN.txt", """Homarr widget review — matched before/after comparison

Unzip this folder, open a terminal in it, then run:
  python3 -m http.server 4174 --bind 127.0.0.1

Open http://localhost:4174 in your browser.
No Homarr server, account, database, or Node installation is needed.

Reviews are stored in this browser's localStorage. Keep the same origin and port
when reopening to retain progress. A new run starts unreviewed. Original audit
confirmations remain historical; capture readiness is not visual approval.

The React source is in source/. Evidence is in runs/before, runs/after and
runs/original. comparison.json records matching images and run provenance.
The findings and verification documents accompany the after run.
""")
print(f"{archive} ({archive.stat().st_size:,} bytes)")
