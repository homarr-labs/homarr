#!/usr/bin/env python3
"""Summarize completed manifests without extrapolating a capacity ceiling."""
import argparse
import json
import pathlib
import statistics


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("directories", nargs="+", type=pathlib.Path)
args = parser.parse_args()
rows = []
for directory in args.directories:
    manifest = json.loads((directory / "manifest.json").read_text())
    for entry in manifest["results"]:
        result = entry["result"]
        resources = json.loads((directory / entry["resourcesFile"]).read_text())
        samples = resources["samples"]
        active = [sample for sample in samples if result["measurementBeginUnixMs"] <= sample["unixMs"] <= result["measurementEndUnixMs"]]
        cpu_cores = None
        if len(active) >= 2:
            first, last = active[0], active[-1]
            cpu_seconds = (last["cpuTicks"] - first["cpuTicks"]) / manifest["clockTicksPerSecond"]
            cpu_cores = cpu_seconds / (last["monotonic"] - first["monotonic"])
        rss = [sample["VmRSS"] for sample in samples if "VmRSS" in sample]
        peak_fds = [sample["openFds"] for sample in samples if "openFds" in sample]
        row = {"runtime": manifest["runtime"], "case": entry["case"], "directory": str(directory), "readyWorkers": result["connections"]["readyWorkers"], "readyClients": result["connections"]["readyClients"], "verifiedRps": result["messages"]["successfulRoundtripsPerSecond"], "rttP50Ms": result["latencyMs"]["p50"], "rttP95Ms": result["latencyMs"]["p95"], "rttP99Ms": result["latencyMs"]["p99"], "missing": result["messages"]["missing"], "corrupt": result["messages"]["mismatches"], "unknownMessages": result["messages"]["unknownMessages"], "sendErrors": result["messages"]["sendErrors"], "openClientsAtEnd": result["connections"]["openClientsAtEnd"], "deadlineExceededReceived": result["messages"].get("deadlineExceededReceived", 0), "handshakeFailures": sum(result["failures"].values()), "closes": result["closes"], "peakRssMiB": max(rss, default=0) / 1024, "peakFds": max(peak_fds, default=None), "activeAverageCpuCores": cpu_cores, "generatorCpuMs": result["generator"]["userCpuMs"] + result["generator"]["systemCpuMs"], "generatorSchedulingP99Ms": result["schedulingLagMs"]["p99"], "oomKilled": resources["containerState"]["OOMKilled"]}
        rows.append(row)
groups = []
for runtime, case in sorted({(row["runtime"], row["case"]) for row in rows}):
    values = [row for row in rows if row["runtime"] == runtime and row["case"] == case]
    medians = {}
    for key in ["verifiedRps", "rttP50Ms", "rttP95Ms", "rttP99Ms", "peakRssMiB", "activeAverageCpuCores", "generatorSchedulingP99Ms"]:
        numbers = [row[key] for row in values if row[key] is not None]
        medians[key] = None
        if numbers:
            medians[key] = statistics.median(numbers)
    groups.append({"runtime": runtime, "case": case, "repeats": len(values), "medianOfRuns": medians})
print(json.dumps({"schemaVersion": 1, "runs": rows, "groups": groups}, indent=2))
