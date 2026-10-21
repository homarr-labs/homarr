#!/usr/bin/env python3
"""Bounded, isolated relay comparison. Requires existing images; never builds/pulls."""
import argparse
import hashlib
import json
import os
import pathlib
import subprocess
import time


def command(args, **kwargs):
    return subprocess.run(args, check=True, text=True, capture_output=True, **kwargs).stdout.strip()


def cgroup_values(pid):
    result = {}
    memberships = pathlib.Path(f"/proc/{pid}/cgroup").read_text().splitlines()
    mounts = []
    for line in pathlib.Path("/proc/self/mountinfo").read_text().splitlines():
        before, after = line.split(" - ", 1)
        left, right = before.split(), after.split()
        if right[0] in ["cgroup", "cgroup2"]:
            mounts.append((left[3], pathlib.Path(left[4]), right[0], right[2].split(",")))
    for membership in memberships:
        _, controllers, group = membership.split(":", 2)
        for mount_root, mountpoint, kind, options in mounts:
            filenames = []
            if not controllers and kind == "cgroup2":
                filenames = ["memory.current", "memory.peak", "memory.events", "memory.max", "memory.swap.max", "cpu.stat", "cpuset.cpus.effective", "pids.max"]
            elif controllers and kind == "cgroup":
                intersection = set(controllers.split(",")) & set(options)
                if "memory" in intersection:
                    filenames.extend(["memory.usage_in_bytes", "memory.max_usage_in_bytes", "memory.limit_in_bytes", "memory.memsw.limit_in_bytes", "memory.failcnt", "memory.oom_control"])
                if "cpuacct" in intersection:
                    filenames.extend(["cpuacct.usage", "cpuacct.stat"])
                if "cpu" in intersection:
                    filenames.extend(["cpu.stat", "cpu.cfs_period_us", "cpu.cfs_quota_us"])
                if "cpuset" in intersection:
                    filenames.append("cpuset.cpus")
                if "pids" in intersection:
                    filenames.append("pids.max")
            if not filenames:
                continue
            relative = group.lstrip("/")
            if mount_root != "/":
                try:
                    relative = str(pathlib.PurePosixPath(group).relative_to(mount_root))
                except ValueError:
                    continue
            directory = mountpoint / relative
            for filename in filenames:
                try:
                    result[filename] = (directory / filename).read_text().strip()
                except OSError:
                    pass
    return result


def sample(pid):
    try:
        fields = pathlib.Path(f"/proc/{pid}/stat").read_text().rsplit(")", 1)[1].split()
        status = pathlib.Path(f"/proc/{pid}/status").read_text().splitlines()
        memory = {}
        for line in status:
            if line.startswith(("VmRSS:", "VmHWM:", "Threads:")):
                key, value = line.split(":", 1)
                memory[key] = int(value.strip().split()[0])
        try:
            memory["openFds"] = len(list(pathlib.Path(f"/proc/{pid}/fd").iterdir()))
        except OSError:
            pass
        result = {"unixMs": time.time() * 1000, "monotonic": time.monotonic(), "cpuTicks": int(fields[11]) + int(fields[12]), **memory}
        try:
            result.update(cgroup_values(pid))
        except OSError:
            pass
        return result
    except (OSError, ValueError, IndexError):
        return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime", choices=["bun", "go"], required=True)
    parser.add_argument("--output", type=pathlib.Path, required=True)
    parser.add_argument("--label", help="Record an exact compiler/runtime label, e.g. go1.27.3")
    parser.add_argument("--bun-image", default="homarr:native-relay-local")
    parser.add_argument("--go-binary", type=pathlib.Path)
    parser.add_argument("--relay-cpus", type=float, default=2, help="CPU quota, not CPU affinity")
    parser.add_argument("--generator-cpus", type=float, default=4, help="CPU quota, not CPU affinity")
    parser.add_argument("--bun", default="bun")
    parser.add_argument("--port", type=int, default=44080)
    parser.add_argument("--duration", type=int, default=15)
    parser.add_argument("--cases", default="defaults,idle256,idle1024,idle2048,active128,active512,active1024,fanin192,fanin320,reconnect")
    args = parser.parse_args()
    if not 44080 <= args.port <= 44179:
        parser.error("benchmark ports must be 44080..44179")
    root = pathlib.Path(__file__).resolve().parents[2]
    args.output.mkdir(parents=True, exist_ok=True)
    matrix = {
        "defaults": {"workers": 4, "channelsPerWorker": 35, "hz": 0, "admission": "defaults"},
        "idle256": {"workers": 32, "channelsPerWorker": 8, "hz": 0},
        "idle1024": {"workers": 128, "channelsPerWorker": 8, "hz": 0},
        "idle2048": {"workers": 256, "channelsPerWorker": 8, "hz": 0},
        "active128": {"workers": 16, "channelsPerWorker": 8, "hz": 2, "payloadBytes": 1024},
        "active512": {"workers": 64, "channelsPerWorker": 8, "hz": 5, "payloadBytes": 4096},
        "active1024": {"workers": 128, "channelsPerWorker": 8, "hz": 10, "payloadBytes": 4096},
        "active2048": {"workers": 256, "channelsPerWorker": 8, "hz": 10, "payloadBytes": 4096},
        "active3072": {"workers": 384, "channelsPerWorker": 8, "hz": 10, "payloadBytes": 4096},
        "active512-12k": {"workers": 64, "channelsPerWorker": 8, "hz": 5, "payloadBytes": 12288},
        "active512-64k": {"workers": 64, "channelsPerWorker": 8, "hz": 5, "payloadBytes": 65536},
        "fanin192": {"workers": 1, "channelsPerWorker": 32, "hz": 6, "payloadBytes": 1024},
        "fanin320": {"workers": 1, "channelsPerWorker": 32, "hz": 10, "payloadBytes": 1024},
        "reconnect": {"workers": 128, "channelsPerWorker": 0, "hz": 0, "reconnect": True},
    }
    selected = args.cases.split(",")
    if any(name not in matrix for name in selected):
        parser.error("unknown case")
    manifest = {"schemaVersion": 1, "runtime": args.label or args.runtime, "implementation": args.runtime, "gitCommit": command(["git", "rev-parse", "HEAD"], cwd=root), "host": command(["uname", "-a"]), "cpuCount": os.cpu_count(), "clockTicksPerSecond": os.sysconf("SC_CLK_TCK"), "relayCpuQuota": args.relay_cpus, "generatorCpuQuota": args.generator_cpus, "cpuAffinityEnforced": False, "cpuIsolationNote": "Docker CPU quotas bound consumed CPU time; neither process is physically pinned. Shared-host scheduling interference remains.", "memoryLimitBytes": 536870912, "generatorMemoryLimitBytes": 2147483648, "durationSeconds": args.duration, "bunVersion": command([args.bun, "--version"]), "network": "Generator container shares relay network namespace; no published-port proxy. Rootless host networking may be rootlesskit namespace rather than physical host loopback.", "results": []}
    manifest["sourceSha256"] = {str(path): hashlib.sha256((root / path).read_bytes()).hexdigest() for path in [pathlib.Path("apps/relay/src/relay.ts"), pathlib.Path("apps/relay-go/main.go"), pathlib.Path("benchmarks/relay/load.ts"), pathlib.Path("benchmarks/relay/run.py")]}
    if args.go_binary:
        manifest["goBinarySha256"] = hashlib.sha256(args.go_binary.read_bytes()).hexdigest()
    for name in selected:
        case = matrix[name]
        container = f"homarr-relay-bench-20261021-{os.getpid()}-{args.runtime}"
        generator_container = container + "-load"
        env = {"GOMAXPROCS": "2", "PORT": str(args.port), "HOST": "127.0.0.1", "RELAY_ALLOWED_ORIGINS": "https://benchmark.invalid", "RELAY_REGISTRATION_TOKEN": "benchmark-local-only"}
        if case.get("admission") != "defaults":
            env.update(RELAY_MAX_WORKERS="1000", RELAY_MAX_CONNECTIONS="4096", RELAY_MAX_CHANNELS_PER_WORKER="64", RELAY_MAX_CONNECTIONS_PER_IP="4096", RELAY_MAX_UPGRADES_PER_MINUTE="100000")
        docker = ["docker", "run", "--detach", "--pull=never", "--name", container, "--network", "host", "--cpus", str(args.relay_cpus), "--memory", "512m", "--memory-swap", "512m", "--pids-limit", "128", "--read-only", "--tmpfs", "/tmp:rw,size=16m", "--mount", f"type=bind,src={root},dst=/repo,readonly", "--workdir", "/repo"]
        for key, value in env.items():
            docker.extend(["--env", f"{key}={value}"])
        if args.runtime == "go":
            if not args.go_binary:
                parser.error("--go-binary required")
            docker.extend(["--mount", f"type=bind,src={args.go_binary.resolve()},dst=/relay-go,readonly", "--entrypoint", "/relay-go", args.bun_image])
        else:
            docker.extend(["--entrypoint", "/usr/local/bin/bun", args.bun_image, "apps/relay/src/index.ts"])
        config = {**case, "url": f"ws://127.0.0.1:{args.port}", "registrationToken": env["RELAY_REGISTRATION_TOKEN"], "origin": env["RELAY_ALLOWED_ORIGINS"], "durationMs": args.duration * 1000, "concurrency": 8}
        config_path = args.output / f"{name}.config.json"
        config_path.write_text(json.dumps(config, indent=2) + "\n")
        samples = []
        baseline = None
        process_limits = None
        limits = {}
        budget_verified = False
        initial = None
        run_error = None
        generator_info = None
        try:
            command(docker)
            initial = json.loads(command(["docker", "inspect", container]))[0]
            limits = {key: initial["HostConfig"].get(key) for key in ["Memory", "MemorySwap", "NanoCpus", "PidsLimit"]}
            (args.output / f"{name}.container.json").write_text(json.dumps({"hostConfig": limits, "containerState": initial["State"], "image": initial["Image"]}, indent=2) + "\n")
            expected_limits = {"Memory": 536870912, "MemorySwap": 536870912, "NanoCpus": int(args.relay_cpus * 1_000_000_000), "PidsLimit": 128}
            if limits != expected_limits:
                raise RuntimeError(f"Docker resource limits do not match required budget: expected {expected_limits}, received {limits}")
            budget_verified = True
            pid = int(initial["State"]["Pid"])
            try:
                process_limits = pathlib.Path(f"/proc/{pid}/limits").read_text()
            except OSError:
                pass
            readiness_error = "no successful readiness response"
            for _ in range(50):
                probe = subprocess.run(["docker", "exec", container, "/usr/local/bin/bun", "-e", f'const r=await fetch("http://127.0.0.1:{args.port}/health/ready",{{signal:AbortSignal.timeout(1000)}}); if(r.status!==200)throw new Error(`HTTP ${{r.status}}`);'], capture_output=True, text=True)
                if probe.returncode == 0:
                    break
                readiness_error = probe.stderr.strip() or probe.stdout.strip() or f"docker exec exited {probe.returncode}"
                time.sleep(.1)
            else:
                raise RuntimeError(f"relay readiness timeout: {readiness_error}")
            baseline = sample(pid)
            generator_docker = ["docker", "create", "--pull=never", "--name", generator_container, "--network", f"container:{container}", "--cpus", str(args.generator_cpus), "--memory", "2g", "--memory-swap", "2g", "--pids-limit", "128", "--read-only", "--tmpfs", "/tmp:rw,size=16m", "--mount", f"type=bind,src={root},dst=/repo,readonly", "--mount", f"type=bind,src={args.output.resolve()},dst=/bench-config,readonly", "--workdir", "/repo", "--entrypoint", "/usr/local/bin/bun", args.bun_image, "/repo/benchmarks/relay/load.ts", f"/bench-config/{config_path.name}"]
            command(generator_docker)
            generator_info = json.loads(command(["docker", "inspect", generator_container]))[0]
            manifest["generatorImage"] = generator_info["Image"]
            generator_limits = {key: generator_info["HostConfig"].get(key) for key in ["Memory", "MemorySwap", "NanoCpus", "PidsLimit"]}
            expected_generator_limits = {"Memory": 2147483648, "MemorySwap": 2147483648, "NanoCpus": int(args.generator_cpus * 1_000_000_000), "PidsLimit": 128}
            if generator_limits != expected_generator_limits:
                raise RuntimeError(f"Generator resource limits mismatch: {generator_limits}")
            manifest["generatorHostConfig"] = generator_limits
            with (args.output / f"{name}.stderr.log").open("w") as stderr, (args.output / f"{name}.json").open("w") as stdout:
                driver = subprocess.Popen(["docker", "start", "--attach", generator_container], cwd=root, text=True, stdout=stdout, stderr=stderr)
                deadline = time.monotonic() + args.duration + 180
                while driver.poll() is None:
                    current = sample(pid)
                    if current:
                        samples.append(current)
                    if time.monotonic() > deadline:
                        subprocess.run(["docker", "kill", generator_container], capture_output=True)
                        driver.kill()
                        driver.wait()
                        raise RuntimeError("generator wall-clock safety deadline")
                    time.sleep(.25)
                if driver.returncode:
                    raise RuntimeError(f"generator exited {driver.returncode}")
            generator_info = json.loads(command(["docker", "inspect", generator_container]))[0]
            if generator_info["State"]["ExitCode"] != 0:
                raise RuntimeError(f"generator container exited {generator_info['State']['ExitCode']}; OOMKilled={generator_info['State']['OOMKilled']}")
            result = json.loads((args.output / f"{name}.json").read_text())
            manifest["results"].append({"case": name, "result": result, "resourcesFile": f"{name}.resources.json"})
            print(f"{args.runtime} {name}: ready={result['connections']['readyClients']} rps={result['messages']['successfulRoundtripsPerSecond']:.1f} missing={result['messages']['missing']} closes={result['closes']}", flush=True)
        except Exception as error:
            run_error = repr(error)
            manifest.setdefault("failures", []).append({"case": name, "reason": run_error, "resourcesFile": f"{name}.resources.json"})
            raise
        finally:
            generator_inspection = subprocess.run(["docker", "inspect", generator_container], capture_output=True, text=True)
            if generator_inspection.returncode == 0:
                generator_info = json.loads(generator_inspection.stdout)[0]
            state = initial
            inspection = subprocess.run(["docker", "inspect", container], capture_output=True, text=True)
            if inspection.returncode == 0:
                state = json.loads(inspection.stdout)[0]
            resources = {"baseline": baseline, "samples": samples, "processLimits": process_limits, "containerHostConfig": limits, "dockerBudgetVerified": budget_verified, "containerState": None, "containerImage": None, "environment": env, "runFailure": run_error}
            if state:
                resources["containerState"] = state["State"]
                resources["containerImage"] = state["Image"]
            if generator_info:
                resources["generatorContainer"] = {"image": generator_info["Image"], "state": generator_info["State"], "hostConfig": {key: generator_info["HostConfig"].get(key) for key in ["Memory", "MemorySwap", "NanoCpus", "PidsLimit", "NetworkMode"]}}
            (args.output / f"{name}.resources.json").write_text(json.dumps(resources, indent=2) + "\n")
            logs = subprocess.run(["docker", "logs", container], capture_output=True, text=True)
            (args.output / f"{name}.relay.log").write_text(logs.stdout + logs.stderr)
            subprocess.run(["docker", "rm", "--force", generator_container], capture_output=True)
            subprocess.run(["docker", "rm", "--force", container], capture_output=True)
            (args.output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        # Stop a ramp on corruption, loss, upgrade errors, or p99 >100ms. The
        # explicit fan-in policy probe remains individually selectable.
        if name.startswith(("active", "idle")):
            latency = result["latencyMs"]["p99"]
            if result["failures"] or result["closes"] or result["messages"]["missing"] or result["messages"]["mismatches"] or result["messages"]["unknownMessages"] or (latency is not None and latency > 100):
                print("Stopping selected ramp after material error/SLO threshold; run later policy cases explicitly.", flush=True)
                break


if __name__ == "__main__":
    main()
