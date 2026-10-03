#!/usr/bin/env python3
"""Run the existing provenance-checked production harness in a balanced sequence."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--baseline", required=True, help="Clean, pinned Git worktree")
    parser.add_argument("--candidate", required=True, help="Clean, pinned Git worktree")
    parser.add_argument("--output", required=True)
    parser.add_argument("--bun", default="bun")
    parser.add_argument("--phase", choices=["build", "runtime", "all"], default="all")
    parser.add_argument("--builder-prefix", default="homarr-migration-benchmark")
    parser.add_argument("--runtime-repetitions", type=int, default=3)
    args = parser.parse_args()
    if args.runtime_repetitions < 3:
        parser.error("Use at least three runtime trials")
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    manifest_path = output / "production-migration.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {"builds": [], "runtimes": []}
    variants = {}
    for label, directory in [("baseline", args.baseline), ("candidate", args.candidate)]:
        path = Path(directory).resolve()
        sha = subprocess.check_output(["git", "-C", str(path), "rev-parse", "HEAD"], text=True).strip()
        if subprocess.check_output(["git", "-C", str(path), "status", "--porcelain"], text=True).strip():
            raise RuntimeError(f"Production checkout must be clean: {path}")
        variants[label] = {"path": path, "sha": sha, "builder": args.builder_prefix + "-" + label}
    revisions = {label: v["sha"] for label, v in variants.items()}
    if "revisions" in manifest and manifest["revisions"] != revisions:
        raise RuntimeError("Output directory belongs to different source revisions")
    manifest["revisions"] = revisions

    def save():
        temporary = manifest_path.with_suffix(".tmp")
        temporary.write_text(json.dumps(manifest, indent=2) + "\n")
        temporary.replace(manifest_path)

    def run(label, phase, repetition, env):
        destination = output / f"{label}-{phase}-{repetition}"
        destination.mkdir(exist_ok=True)
        key = "builds" if phase != "runtime" else "runtimes"
        previous = [r for r in manifest[key] if r["label"] == label and r["phase"] == phase and r["repetition"] == repetition]
        successful = [r for r in previous if r["exit_code"] == 0 and r["result"]]
        if successful:
            result = json.loads(Path(successful[-1]["result"]).read_text())
            if phase == "runtime" and not result["claimEligible"]:
                raise RuntimeError(f"Saved runtime trial is ineligible: {result['claimIneligibleReasons']}")
            return result
        variable = "BUILD_BENCHMARK_OUTPUT_DIR" if key == "builds" else "RUNTIME_BENCHMARK_OUTPUT_DIR"
        if previous:
            destination = destination / f"attempt-{len(previous) + 1}"
            destination.mkdir(exist_ok=True)
        env = {**os.environ, **env, variable: str(destination)}
        script = "docker-build.mts" if key == "builds" else "docker-runtime.mts"
        log = destination / "driver.log"
        started = time.monotonic()
        with log.open("w") as stream:
            process = subprocess.run([args.bun, "scripts/benchmarks/" + script], env=env,
                                     stdout=stream, stderr=subprocess.STDOUT)
        results = sorted(destination.glob("build-*.json" if key == "builds" else "runtime-*.json"))
        entry = {"label": label, "phase": phase, "repetition": repetition,
                 "exit_code": process.returncode, "wall_seconds": time.monotonic() - started,
                 "result": str(results[-1]) if results else None, "log": str(log)}
        manifest[key].append(entry)
        save()
        print(json.dumps(entry), flush=True)
        if process.returncode or not results:
            print(log.read_text()[-5000:], flush=True)
            raise RuntimeError("Production benchmark failed; see preserved log")
        result = json.loads(results[-1].read_text())
        if phase == "runtime" and not result["claimEligible"]:
            raise RuntimeError(f"Runtime trial is ineligible: {result['claimIneligibleReasons']}")
        return result

    if args.phase in ["build", "all"]:
        config = output / "buildkitd.toml"
        config.write_text('[worker.oci]\n  gc = true\n  reservedSpace = "4GB"\n  maxUsedSpace = "24GB"\n  minFreeSpace = "12GB"\n')
        for label, v in variants.items():
            builders = subprocess.check_output(["docker", "buildx", "ls", "--format", "{{.Name}}"], text=True).splitlines()
            if v["builder"] not in builders:
                subprocess.run(["docker", "buildx", "create", "--driver", "docker-container", "--name", v["builder"], "--buildkitd-config", str(config)], check=True)
        # The existing comparator requires cold baseline/candidate warmups followed
        # by ABBA warm source changes. Keep the warmup images for runtime trials.
        sequence = [("baseline", "warmup", 0), ("candidate", "warmup", 0),
                    ("baseline", "source-change", 1), ("candidate", "source-change", 1),
                    ("candidate", "source-change", 2), ("baseline", "source-change", 2)]
        for label, phase, repetition in sequence:
            v = variants[label]
            env = {"BUILD_BENCHMARK_CONTEXT": str(v["path"]), "BUILD_BENCHMARK_REVISION": v["sha"],
                   "BUILD_BENCHMARK_MODE": "cached" if phase == "warmup" else "source-change",
                   "BUILD_BENCHMARK_CACHE_STATE": "cold" if phase == "warmup" else "warm",
                   "BUILD_BENCHMARK_REPETITION": str(max(1, repetition)), "BUILD_BENCHMARK_TOTAL_REPETITIONS": "2",
                   "BUILD_BENCHMARK_SERIES_ID": "bun-migration", "BUILD_BENCHMARK_RUN_LABEL": label,
                   "BUILD_BENCHMARK_IMAGE": f"homarr-migration-benchmark:{label}-{phase}-{repetition}",
                   "BUILD_BENCHMARK_BUILDER": v["builder"]}
            if phase != "warmup":
                env["BUILD_BENCHMARK_SOURCE_CHANGE_ID"] = f"bun-migration-{repetition}"
            run(label, phase, repetition, env)
    if args.phase in ["runtime", "all"]:
        for repetition in range(1, args.runtime_repetitions + 1):
            order = ["baseline", "candidate"] if repetition % 2 else ["candidate", "baseline"]
            for label in order:
                warmup = next(r for r in manifest["builds"] if r["label"] == label and r["phase"] == "warmup")
                build = json.loads(Path(warmup["result"]).read_text())
                env = {"RUNTIME_BENCHMARK_IMAGE": build["image"]["id"],
                       "RUNTIME_BENCHMARK_SHA": build["image"]["revision"],
                       "RUNTIME_BENCHMARK_SOURCE_FINGERPRINT": build["image"]["sourceFingerprint"],
                       "RUNTIME_BENCHMARK_SETTLE_MS": "600000", "RUNTIME_BENCHMARK_SAMPLE_INTERVAL_MS": "30000",
                       "RUNTIME_BENCHMARK_PAGE_ITERATIONS": "20", "RUNTIME_BENCHMARK_LCP_OBSERVATION_MS": "5000",
                       "RUNTIME_BENCHMARK_INTERACTION_ITERATIONS": "7", "RUNTIME_BENCHMARK_REQUIRE_READY_MARKERS": "true",
                       "RUNTIME_BENCHMARK_SPOTLIGHT_IDLE_POLICY": "preload-only",
                       "RUNTIME_BENCHMARK_WIDGET_KINDS": "clock,countdown,downloads,notebook,healthMonitoring,systemResources,systemDisks,bookmarks"}
                run(label, "runtime", repetition, env)
    if args.phase in ["runtime", "all"]:
        for repetition in range(1, args.runtime_repetitions + 1):
            command = [args.bun, "scripts/benchmarks/benchmark-compare.mts", "--comparison", "runtime-migration"]
            for label in ["baseline", "candidate"]:
                warmup = next(r for r in manifest["builds"] if r["label"] == label and r["phase"] == "warmup" and r["exit_code"] == 0)
                command += [f"--{label}-warmup", warmup["result"]]
                for build in manifest["builds"]:
                    if build["label"] == label and build["phase"] == "source-change" and build["exit_code"] == 0:
                        command += [f"--{label}-build", build["result"]]
                runtime = next(r for r in manifest["runtimes"] if r["label"] == label and r["repetition"] == repetition and r["exit_code"] == 0)
                command += [f"--{label}-runtime", runtime["result"]]
            command += ["--output", str(output / f"comparison-{repetition}.json")]
            with (output / f"comparison-{repetition}.log").open("w") as stream:
                subprocess.run(command, stdout=stream, stderr=subprocess.STDOUT, check=True)
    save()


if __name__ == "__main__":
    main()
