#!/usr/bin/env python3
"""Compare actual Node Next development startup, authenticated pages, HMR and process-group PSS."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import signal
import subprocess
import time


def memory(group):
    processes = []
    for directory in Path("/proc").iterdir():
        if not directory.name.isdigit():
            continue
        try:
            fields = (directory / "stat").read_text().rsplit(")", 1)[1].split()
            if int(fields[2]) != group:
                continue
            values = {}
            for line in (directory / "smaps_rollup").read_text().splitlines():
                parts = line.split()
                if parts[0] in ["Rss:", "Pss:"]:
                    values[parts[0][:-1].lower() + "_kib"] = int(parts[1])
            command = (directory / "cmdline").read_bytes().replace(b"\0", b" ").decode(errors="replace")
            processes.append({"pid": int(directory.name), "command": command, **values})
        except (OSError, ValueError, IndexError):
            continue
    return {"elapsed_seconds": time.monotonic(), "pss_kib": sum(p.get("pss_kib", 0) for p in processes),
            "rss_kib": sum(p.get("rss_kib", 0) for p in processes), "processes": processes}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--work-dir", required=True, help="Prepared pnpm and bun checkouts from package-managers.py")
    parser.add_argument("--fixture", required=True, help="Seeded eight-widget demo SQLite database")
    parser.add_argument("--output", required=True)
    parser.add_argument("--package-results", required=True, help="package-managers.json identifying prepared source revisions")
    parser.add_argument("--node", required=True)
    parser.add_argument("--bun", required=True)
    parser.add_argument("--pnpm", required=True)
    parser.add_argument("--redis-port", type=int, required=True)
    parser.add_argument("--port", type=int, default=3197)
    parser.add_argument("--repetitions", type=int, default=3)
    args = parser.parse_args()
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    work = Path(args.work_dir).resolve()
    harness = Path(__file__).with_suffix(".mts").resolve()
    result = {"method": "Sequential alternating managers; Node 24.18 for both. Cold removes .next; warm restarts retain the Next dev cache. First login and authenticated eight-widget board exercise compilation. Five DOM-confirmed source edits per server. PSS sums the entire dev launch process group, including package-manager wrappers, sampling once per second; browser and external Redis excluded. Sixty-second post-HMR idle period. No OS page-cache flush or production-memory claim.",
              "revisions": json.loads(Path(args.package_results).read_text())["metadata"]["revisions"],
              "harness_sha256": {file.name: hashlib.sha256(file.read_bytes()).hexdigest() for file in [Path(__file__), harness]},
              "versions": {"node": subprocess.check_output([args.node, "--version"], text=True).strip(),
                           "bun": subprocess.check_output([args.bun, "--version"], text=True).strip()}, "trials": []}
    destination = output / "dev-package-managers.json"
    if destination.exists():
        raise RuntimeError("Use a fresh output directory to preserve independent measurements")
    for repetition in range(1, args.repetitions + 1):
        managers = ["pnpm", "bun"]
        if repetition % 2 == 0:
            managers.reverse()
        for manager in managers:
            workspace = work / manager
            database = output / f"{manager}-{repetition}.sqlite"
            shutil.copyfile(args.fixture, database)
            shutil.rmtree(workspace / "apps/nextjs/.next", ignore_errors=True)
            defaults = json.loads(subprocess.check_output(
                [args.node, "-e", "const fs=require('fs');console.log(JSON.stringify(require(process.argv[1]).parse(fs.readFileSync(process.argv[2]))))",
                 str(workspace / "node_modules/dotenv"), str(workspace / ".env.example")], text=True))
            env = {**defaults, **os.environ}
            for key in ["TURBO_TOKEN", "TURBO_TEAM", "TURBO_API"]:
                env.pop(key, None)
            env.update({"PATH": str(work / "manager-bin") + ":" + str(Path(args.node).parent) + ":" + str(Path(args.bun).parent) + ":" + env["PATH"],
                        "PORT": str(args.port), "NODE_ENV": "development", "NEXT_TELEMETRY_DISABLED": "1",
                        "TURBO_TELEMETRY_DISABLED": "1", "SKIP_ENV_VALIDATION": "true", "DB_DRIVER": "better-sqlite3",
                        "DB_DIALECT": "sqlite", "DB_URL": str(database), "REDIS_IS_EXTERNAL": "true",
                        "REDIS_HOST": "127.0.0.1", "REDIS_PORT": str(args.redis_port), "DEMO_MODE": "true",
                        "DEMO_READ_ONLY": "false", "UNSAFE_ENABLE_MOCK_INTEGRATION": "true", "NO_EXTERNAL_CONNECTION": "true",
                        "SECRET_ENCRYPTION_KEY": "0" * 64, "AUTH_SECRET": "local-package-manager-benchmark",
                        "AUTH_URL": f"http://localhost:{args.port}", "AUTH_PROVIDERS": "credentials", "LOG_LEVEL": "warn"})
            command = [args.node, args.pnpm, "run", "dev"]
            if manager == "bun":
                command = [args.bun, "run", "dev"]
            for state in ["cold", "warm"]:
                label = f"{manager}-{state}-{repetition}"
                log = output / (label + ".log")
                browser_result = output / (label + "-browser.json")
                samples = []
                browser = None
                with log.open("w") as stream:
                    started = time.monotonic()
                    server = subprocess.Popen(command, cwd=workspace, env=env, stdout=stream, stderr=subprocess.STDOUT, start_new_session=True)
                    try:
                        while not re.search(r"Ready in", log.read_text()):
                            samples.append(memory(server.pid))
                            if server.poll() is not None or time.monotonic() - started > 180:
                                raise RuntimeError(f"Dev server failed to start: {log}")
                            time.sleep(0.1)
                        ready_ms = (time.monotonic() - started) * 1000
                        browser_env = {**env, "DEV_PM_URL": f"http://localhost:{args.port}", "DEV_PM_WORKSPACE": str(workspace),
                                       "DEV_PM_BROWSER_OUTPUT": str(browser_result)}
                        browser_log = output / (label + "-browser.log")
                        with browser_log.open("w") as browser_stream:
                            browser = subprocess.Popen([args.bun, str(harness)], env=browser_env, stdout=browser_stream, stderr=subprocess.STDOUT)
                            while browser.poll() is None:
                                if server.poll() is not None:
                                    raise RuntimeError(f"Dev server exited during browser measurements: {log}")
                                samples.append(memory(server.pid))
                                if time.monotonic() - started > 900:
                                    raise RuntimeError(f"Dev browser timed out: {browser_log}")
                                time.sleep(1)
                        if browser.returncode:
                            raise RuntimeError(f"Dev browser failed: {browser_log}")
                        idle_started = time.monotonic()
                        settled = []
                        while time.monotonic() - idle_started < 60:
                            if server.poll() is not None:
                                raise RuntimeError(f"Dev server exited during memory settling: {log}")
                            sample = memory(server.pid)
                            samples.append(sample)
                            if time.monotonic() - idle_started >= 30:
                                settled.append(sample["pss_kib"])
                            time.sleep(1)
                        for sample in samples:
                            sample["elapsed_seconds"] -= started
                        trial = {"manager": manager, "cache": state, "repetition": repetition, "ready_ms": ready_ms,
                                 "peak_pss_kib": max(s["pss_kib"] for s in samples),
                                 "settled_pss_kib": sorted(settled)[len(settled) // 2],
                                 "browser": json.loads(browser_result.read_text()), "samples": samples}
                        result["trials"].append(trial)
                        destination.write_text(json.dumps(result, indent=2) + "\n")
                        print(json.dumps({k: trial[k] for k in ["manager", "cache", "repetition", "ready_ms", "peak_pss_kib", "settled_pss_kib"]}), flush=True)
                    finally:
                        if browser is not None and browser.poll() is None:
                            browser.terminate()
                            browser.wait(timeout=20)
                        try:
                            os.killpg(server.pid, signal.SIGTERM)
                        except ProcessLookupError:
                            pass
                        try:
                            server.wait(timeout=20)
                        except subprocess.TimeoutExpired:
                            os.killpg(server.pid, signal.SIGKILL)
                            server.wait(timeout=20)
                        time.sleep(2)


if __name__ == "__main__":
    main()
