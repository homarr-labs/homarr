#!/usr/bin/env python3
"""Render measured command data without hiding failures or mixing cache states."""
import argparse
from collections import defaultdict
import json
from pathlib import Path
from statistics import median


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input")
    parser.add_argument("--output")
    args = parser.parse_args()
    data = json.loads(Path(args.input).read_text())
    metadata = data["metadata"]
    measurements = data["measurements"]
    lines = ["## Package manager benchmark", "", f"Revisions: pnpm `{metadata['revisions']['pnpm']}`, Bun `{metadata['revisions']['bun']}`.",
             f"Versions: Node {metadata['versions']['node']}, pnpm {metadata['versions']['pnpm']}, Bun {metadata['versions']['bun']}.",
             "", metadata["method"], "", "Times below are medians of successful trials; failures are counted explicitly.",
             "", "| Scope / command | Manager | Passed / total | Median seconds | Range seconds | Peak RSS MiB (median) |",
             "|---|---|---:|---:|---:|---:|"]
    groups = defaultdict(list)
    for record in measurements:
        if record["phase"] != "workspace-typecheck":
            scope = record.get("tool", record.get("case", record.get("workspace", "repository")))
            phase = record["phase"]
            if phase == "workspace-build":
                phase += "-first" if record["repetition"] == 1 else "-repeat"
            if phase == "repository-lint":
                phase += "-first" if record["repetition"] == 1 else "-cached"
            groups[scope, phase, record["manager"]].append(record)
    for (scope, phase, manager), records in sorted(groups.items()):
        passed = [r for r in records if r["exit_code"] == 0]
        if not passed:
            lines.append(f"| {scope}: {phase} | {manager} | 0 / {len(records)} | — | — | — |")
            continue
        timings = [r["wall_seconds"] for r in passed]
        rss = [r["peak_rss_kib"] / 1024 for r in passed]
        lines.append(f"| {scope}: {phase} | {manager} | {len(passed)} / {len(records)} | {median(timings):.3f} | {min(timings):.3f}–{max(timings):.3f} | {median(rss):.1f} |")
    lines += ["", "## Workspace typecheck memory and time", "", "First run: one trial per manager script. Incremental: two trials per manager script. RSS is maximum process RSS; library workspaces do not have independent production processes.", metadata.get("workspace_runtime_note", ""),
              "", "| Workspace | First seconds pnpm / Bun | First peak MiB pnpm / Bun | Incremental median seconds pnpm / Bun | Incremental peak MiB pnpm / Bun | Passed / total |",
              "|---|---:|---:|---:|---:|---:|"]
    workspaces = defaultdict(lambda: defaultdict(list))
    for r in measurements:
        if r["phase"] == "workspace-typecheck":
            workspaces[r["workspace"]][r["manager"]].append(r)
    for workspace, variants in sorted(workspaces.items()):
        values = []
        for warm, field, divisor in [(False, "wall_seconds", 1), (False, "peak_rss_kib", 1024), (True, "wall_seconds", 1), (True, "peak_rss_kib", 1024)]:
            pair = []
            for manager in ["pnpm", "bun"]:
                rows = [r for r in variants[manager] if (r["repetition"] > 1) == warm and r["exit_code"] == 0]
                value = f"{median(r[field] / divisor for r in rows):.2f}" if rows else "—"
                pair.append(value)
            values.append(" / ".join(pair))
        rows = [r for records in variants.values() for r in records]
        lines.append(f"| {workspace} | " + " | ".join(values) + f" | {sum(r['exit_code'] == 0 for r in rows)} / {len(rows)} |")
    lines += ["", "## Disk and sharing", "", "Sizes deduplicate hardlinks by device/inode and include directory blocks. Cache archives use local tar/zstd; restore timings exclude network transfer.", ""]
    for manager, sizes in metadata.get("installation_sizes", {}).items():
        lines.append(f"- {manager}: modules {sizes['modules']['allocated_bytes'] / 1024**2:.1f} MiB; cache {sizes['cache']['allocated_bytes'] / 1024**2:.1f} MiB; combined unique-inode allocation {sizes['cache_and_modules_unique_inodes']['allocated_bytes'] / 1024**2:.1f} MiB.")
    for manager, lock in metadata.get("lockfiles", {}).items():
        lines.append(f"- {manager} lock: {lock['bytes']:,} bytes, {lock['lines']:,} lines.")
    for manager, rows in metadata.get("shared_resolution", {}).items():
        for dependency in ["react", "@mantine/core"]:
            resolutions = [r for r in rows if r["dependency"] == dependency]
            paths = {r.get("path") for r in resolutions}
            errors = sum("error" in r for r in resolutions)
            lines.append(f"- {manager} {dependency}: {len(resolutions)} workspace probes, {len(paths)} distinct resolved paths, {errors} errors.")
    lines += ["", "## Conflict resolution", "", "Measured policy: merge both manifest additions; choose the right-hand version for a competing dependency; regenerate from the left lock; run a frozen install. Human effort is not measured.", "", "| Case | Manager | Conflict files (range) | Conflict hunks (range) | Version decisions | Unexpected new versions | Intent + frozen validation |", "|---|---|---:|---:|---:|---:|---|"]
    conflicts = defaultdict(list)
    for r in measurements:
        if r["phase"] == "conflict-regenerate":
            conflicts[r["case"], r["manager"]].append(r)
    for (case, manager), rows in sorted(conflicts.items()):
        files = [len(r["conflict_files"]) for r in rows]
        hunks = [r["conflict_hunks"] for r in rows]
        decisions = max(r["human_version_decisions"] for r in rows)
        unexpected = max(len(r.get("unexpected_added_versions", [])) for r in rows)
        passes = sum(r["manifest_intent_preserved"] and r["frozen_validation_exit_code"] == 0 for r in rows)
        lines.append(f"| {case} | {manager} | {min(files)}–{max(files)} | {min(hunks)}–{max(hunks)} | {decisions} | {unexpected} | {passes} / {len(rows)} |")
    failures = [r for r in measurements if r["exit_code"]]
    if failures:
        lines += ["", "## Recorded failures", ""]
        for r in failures:
            lines.append(f"- {r['manager']} {r['phase']} trial {r['repetition']}: exit {r['exit_code']}; `{r['log']}`.")
    text = "\n".join(lines) + "\n"
    if args.output:
        Path(args.output).write_text(text)
    else:
        print(text, end="")


if __name__ == "__main__":
    main()
