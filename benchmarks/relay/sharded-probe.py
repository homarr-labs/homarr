#!/usr/bin/env python3
"""Two- or three-generator isolated relay load; no capacity extrapolation."""
import argparse
import hashlib
import importlib.util
import json
import os
import pathlib
import subprocess
import time


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--runtime", choices=["bun", "go"], required=True)
parser.add_argument("--go-binary", type=pathlib.Path)
parser.add_argument("--label")
parser.add_argument("--output", type=pathlib.Path, required=True)
parser.add_argument("--duration", type=int, default=15)
parser.add_argument("--shards", type=int, choices=[2, 3], default=2)
parser.add_argument("--bun-image", default="homarr:native-relay-local")
args = parser.parse_args()
if args.runtime == "go" and not args.go_binary:
    parser.error("--go-binary required for Go")
root = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("relay_runner", pathlib.Path(__file__).with_name("run.py"))
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
command = runner.command
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=True)
prefix = f"homarr-relay-bench-20261021-{os.getpid()}-sharded"
relay = prefix + "-relay"
generators = [prefix + f"-load{index}" for index in range(args.shards)]
created, states, drivers, samples, files = [], {}, {}, [], []
failure = None
manifest = {"schemaVersion": 1, "runtime": args.label or args.runtime, "implementation": args.runtime, "gitCommit": command(["git", "rev-parse", "HEAD"], cwd=root), "cpuAffinityEnforced": False, "network": "Separate generator cgroups share the isolated relay network namespace; no published ports.", "workload": {"shards": args.shards, "workersPerShard": 128, "channelsPerWorker": 8, "hz": 10, "payloadBytes": 4096, "durationMs": args.duration * 1000, "targetTotalRoundtripsPerSecond": args.shards * 10240}, "samples": samples}
manifest["sourceSha256"] = {path: hashlib.sha256((root / path).read_bytes()).hexdigest() for path in ["apps/relay/src/relay.ts", "apps/relay-go/main.go", "benchmarks/relay/load.ts", "benchmarks/relay/sharded-probe.py"]}
if args.go_binary:
    manifest["goBinarySha256"] = hashlib.sha256(args.go_binary.read_bytes()).hexdigest()


def create(name, cpus, memory, extra, entrypoint, argv, network):
    cmd = ["docker", "create", "--pull=never", "--name", name, "--network", network, "--cpus", str(cpus), "--memory", str(memory), "--memory-swap", str(memory), "--pids-limit", "128", "--read-only", "--tmpfs", "/tmp:rw,size=16m", "--mount", f"type=bind,src={root},dst=/repo,readonly", "--workdir", "/repo"]
    cmd.extend(extra)
    cmd.extend(["--entrypoint", entrypoint, args.bun_image, *argv])
    command(cmd)
    created.append(name)
    info = json.loads(command(["docker", "inspect", name]))[0]
    limits = {key: info["HostConfig"].get(key) for key in ["Memory", "MemorySwap", "NanoCpus", "PidsLimit"]}
    states[name] = {"image": info["Image"], "hostConfig": limits, "state": info["State"]}
    expected = {"Memory": memory, "MemorySwap": memory, "NanoCpus": int(cpus * 1e9), "PidsLimit": 128}
    if limits != expected:
        raise RuntimeError(f"Resource mismatch for {name}: {limits}; expected {expected}")


try:
    relay_extra = []
    for key, value in {"GOMAXPROCS": "2", "PORT": "44080", "HOST": "127.0.0.1", "RELAY_ALLOWED_ORIGINS": "https://benchmark.invalid", "RELAY_REGISTRATION_TOKEN": "benchmark-local-only", "RELAY_MAX_WORKERS": "1000", "RELAY_MAX_CONNECTIONS": "4096", "RELAY_MAX_CONNECTIONS_PER_IP": "4096", "RELAY_MAX_UPGRADES_PER_MINUTE": "100000"}.items():
        relay_extra.extend(["--env", f"{key}={value}"])
    entrypoint, argv = "/usr/local/bin/bun", ["apps/relay/src/index.ts"]
    if args.go_binary:
        relay_extra.extend(["--mount", f"type=bind,src={args.go_binary.resolve()},dst=/relay-go,readonly"])
        entrypoint, argv = "/relay-go", []
    create(relay, 2, 536870912, relay_extra, entrypoint, argv, "host")
    command(["docker", "start", relay])
    last_error = None
    for _ in range(50):
        probe = subprocess.run(["docker", "exec", relay, "/usr/local/bin/bun", "-e", 'const r=await fetch("http://127.0.0.1:44080/health/ready",{signal:AbortSignal.timeout(1000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);'], capture_output=True, text=True)
        if probe.returncode == 0:
            break
        last_error = probe.stderr
        time.sleep(.1)
    else:
        raise RuntimeError(f"Relay readiness failed: {last_error}")
    relay_pid = int(command(["docker", "inspect", "--format", "{{.State.Pid}}", relay]))
    manifest["baseline"] = runner.sample(relay_pid)
    try:
        manifest["relayProcessLimits"] = pathlib.Path(f"/proc/{relay_pid}/limits").read_text()
    except OSError:
        pass
    for shard, name in enumerate(generators):
        create(name, 2, 1073741824, ["--mount", f"type=bind,src={output},dst=/bench-config,readonly"], "/usr/local/bin/bun", ["/repo/benchmarks/relay/load.ts", f"/bench-config/shard{shard}.config.json"], f"container:{relay}")
    start_at = int(time.time() * 1000) + 10000
    manifest["startAtUnixMs"] = start_at
    for shard, name in enumerate(generators):
        config = {"url": "ws://127.0.0.1:44080", "origin": "https://benchmark.invalid", "registrationToken": "benchmark-local-only", "workers": 128, "channelsPerWorker": 8, "hz": 10, "payloadBytes": 4096, "durationMs": args.duration * 1000, "concurrency": 8, "startAtUnixMs": start_at, "messageIdPrefix": f"shard{shard}:"}
        (output / f"shard{shard}.config.json").write_text(json.dumps(config, indent=2) + "\n")
        stdout = (output / f"shard{shard}.json").open("w")
        stderr = (output / f"shard{shard}.stderr.log").open("w")
        files.extend([stdout, stderr])
        drivers[name] = subprocess.Popen(["docker", "start", "--attach", name], stdout=stdout, stderr=stderr)
    deadline = time.monotonic() + args.duration + 180
    generator_pids = {}
    while any(driver.poll() is None for driver in drivers.values()):
        for name in generators:
            if name not in generator_pids:
                info = json.loads(command(["docker", "inspect", name]))[0]
                pid = int(info["State"]["Pid"])
                if pid > 0:
                    generator_pids[name] = pid
        samples.append({"unixMs": time.time() * 1000, "relay": runner.sample(relay_pid), "generators": {name: runner.sample(pid) for name, pid in generator_pids.items()}})
        if time.monotonic() > deadline:
            raise RuntimeError("Sharded probe wall-clock deadline")
        time.sleep(.25)
    results = []
    for shard, name in enumerate(generators):
        info = json.loads(command(["docker", "inspect", name]))[0]
        if drivers[name].returncode or info["State"]["ExitCode"] != 0:
            raise RuntimeError(f"Shard {shard} failed: Docker attachment exit={drivers[name].returncode}, container={info['State']}")
        results.append(json.loads((output / f"shard{shard}.json").read_text()))
    rtt = [result["latencyMs"]["p99"] for result in results if result["latencyMs"]["p99"] is not None]
    lag = [result["schedulingLagMs"]["p99"] for result in results if result["schedulingLagMs"]["p99"] is not None]
    summary = {"verifiedRoundtripsPerSecond": sum(result["messages"]["successfulRoundtripsPerSecond"] for result in results), "maxOfShardRttP99Ms": max(rtt, default=None), "maxOfShardSchedulingP99Ms": max(lag, default=None), "startSkewMs": max(result["measurementBeginUnixMs"] for result in results) - min(result["measurementBeginUnixMs"] for result in results), "readyWorkers": sum(result["connections"]["readyWorkers"] for result in results), "readyClients": sum(result["connections"]["readyClients"] for result in results), "missing": sum(result["messages"]["missing"] for result in results), "mismatches": sum(result["messages"]["mismatches"] for result in results), "unknownMessages": sum(result["messages"]["unknownMessages"] for result in results), "handshakeFailures": sum(sum(result["failures"].values()) for result in results), "deadlineExceededReceived": sum(result["messages"].get("deadlineExceededReceived", 0) for result in results), "sendErrors": sum(result["messages"]["sendErrors"] for result in results), "startBarrierMaxLatenessMs": max(result["measurementBeginUnixMs"] - start_at for result in results), "shards": results, "percentileNote": "Maximum of independently measured shard p99 values; not a combined histogram percentile. Throughput is the sum of each shard's verified count divided by its own active duration."}
    summary["openClientsAtEnd"] = sum(result["connections"]["openClientsAtEnd"] for result in results)
    summary["unexpectedCloses"] = {}
    for result in results:
        for reason, count in result["closes"].items():
            summary["unexpectedCloses"][reason] = summary["unexpectedCloses"].get(reason, 0) + count
    manifest["summary"] = summary
    (output / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps({key: value for key, value in summary.items() if key != "shards"}))
except Exception as error:
    failure = repr(error)
    raise
finally:
    for name, driver in drivers.items():
        if driver.poll() is None:
            subprocess.run(["docker", "kill", name], capture_output=True)
            driver.kill()
            driver.wait()
    for handle in files:
        handle.close()
    for name in reversed(created):
        inspect = subprocess.run(["docker", "inspect", name], capture_output=True, text=True)
        if inspect.returncode == 0:
            info = json.loads(inspect.stdout)[0]
            states.setdefault(name, {})["state"] = info["State"]
        logs = subprocess.run(["docker", "logs", name], capture_output=True, text=True)
        (output / f"{name.rsplit('-', 1)[-1]}.log").write_text(logs.stdout + logs.stderr)
        subprocess.run(["docker", "rm", "--force", name], capture_output=True)
    manifest["containers"] = states
    manifest["runFailure"] = failure
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
