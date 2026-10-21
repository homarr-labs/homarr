#!/usr/bin/env python3
"""Isolated native Nginx connection-policy probe; no production endpoints."""
import argparse
import importlib.util
import json
import os
import pathlib
import subprocess
import time


parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--output", type=pathlib.Path, required=True)
parser.add_argument("--duration", type=int, default=15)
parser.add_argument("--bun-image", default="homarr:native-relay-local")
parser.add_argument("--nginx-image", default="nginx:1.30.6-alpine")
args = parser.parse_args()
root = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("relay_runner", pathlib.Path(__file__).with_name("run.py"))
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
command = runner.command
output = args.output.resolve()
output.mkdir(parents=True, exist_ok=True)
prefix = f"homarr-relay-bench-20261021-{os.getpid()}-proxy"
relay, proxy, load = prefix + "-relay", prefix + "-nginx", prefix + "-load"
created = []
states = {}
samples = []
failure = None
driver = None
nginx_config = """worker_processes 1;
pid /var/run/nginx.pid;
error_log /dev/stderr warn;
events { worker_connections 1024; }
http {
  include /etc/nginx/mime.types;
  default_type application/octet-stream;
  access_log off;
  sendfile on;
  map $http_upgrade $connection_upgrade { default upgrade; '' close; }
  server {
    listen 127.0.0.1:44081;
    location / {
      proxy_pass http://127.0.0.1:44080;
      proxy_http_version 1.1;
      proxy_set_header Upgrade $http_upgrade;
      proxy_set_header Connection $connection_upgrade;
      proxy_read_timeout 3600s;
    }
  }
}
"""
(output / "nginx.conf").write_text(nginx_config)
config = {"url": "ws://127.0.0.1:44081", "origin": "https://benchmark.invalid", "registrationToken": "benchmark-local-only", "workers": 64, "channelsPerWorker": 8, "hz": 1, "payloadBytes": 1024, "durationMs": args.duration * 1000, "concurrency": 8}
(output / "load.config.json").write_text(json.dumps(config, indent=2) + "\n")
manifest = {"schemaVersion": 1, "gitCommit": command(["git", "rev-parse", "HEAD"], cwd=root), "config": config, "proxy": {"workerProcesses": 1, "workerConnections": 1024, "configurationSource": "deployments/native/nginx.conf worker_processes/events; benchmark-only loopback forwarding location", "connectionAccounting": "Each established proxied WebSocket consumes a downstream and an upstream Nginx connection. Listening/internal connections also use resources; the exact observed admission count is measured, not assumed.", "fileDescriptorLimitTheory": "worker_connections and RLIMIT_NOFILE are separate limits; socket admission observations do not constitute an actual FD count."}, "cpuAffinityEnforced": False, "network": "All three isolated containers share relay namespace; no published host ports.", "samples": samples}


def create(name, image, cpus, memory, extra, entrypoint, argv, network):
    cmd = ["docker", "create", "--pull=never", "--name", name, "--network", network, "--cpus", str(cpus), "--memory", str(memory), "--memory-swap", str(memory), "--pids-limit", "128", "--read-only", "--tmpfs", "/tmp:rw,size=16m"]
    cmd.extend(extra)
    cmd.extend(["--entrypoint", entrypoint, image, *argv])
    command(cmd)
    created.append(name)
    info = json.loads(command(["docker", "inspect", name]))[0]
    limits = {key: info["HostConfig"].get(key) for key in ["Memory", "MemorySwap", "NanoCpus", "PidsLimit"]}
    expected = {"Memory": memory, "MemorySwap": memory, "NanoCpus": int(cpus * 1e9), "PidsLimit": 128}
    states[name] = {"image": info["Image"], "hostConfig": limits, "state": info["State"]}
    if limits != expected:
        raise RuntimeError(f"Resource mismatch for {name}: {limits}, expected {expected}")


try:
    relay_extra = ["--mount", f"type=bind,src={root},dst=/repo,readonly", "--workdir", "/repo"]
    for key, value in {"PORT": "44080", "HOST": "127.0.0.1", "RELAY_ALLOWED_ORIGINS": config["origin"], "RELAY_REGISTRATION_TOKEN": config["registrationToken"], "RELAY_MAX_WORKERS": "1000", "RELAY_MAX_CONNECTIONS": "4096", "RELAY_MAX_CONNECTIONS_PER_IP": "4096", "RELAY_MAX_UPGRADES_PER_MINUTE": "100000"}.items():
        relay_extra.extend(["--env", f"{key}={value}"])
    create(relay, args.bun_image, 2, 536870912, relay_extra, "/usr/local/bin/bun", ["apps/relay/src/index.ts"], "host")
    command(["docker", "start", relay])
    create(proxy, args.nginx_image, 2, 134217728, ["--tmpfs", "/var/run:rw,size=1m", "--tmpfs", "/var/cache/nginx:rw,size=16m", "--mount", f"type=bind,src={output / 'nginx.conf'},dst=/etc/nginx/nginx.conf,readonly"], "/usr/sbin/nginx", ["-g", "daemon off;"], f"container:{relay}")
    command(["docker", "start", proxy])
    readiness_error = None
    for _ in range(50):
        probe = subprocess.run(["docker", "exec", relay, "/usr/local/bin/bun", "-e", 'const r=await fetch("http://127.0.0.1:44081/health/ready",{signal:AbortSignal.timeout(1000)});if(!r.ok)throw new Error(`HTTP ${r.status}`);'], capture_output=True, text=True)
        if probe.returncode == 0:
            break
        readiness_error = probe.stderr
        time.sleep(.1)
    else:
        raise RuntimeError(f"Proxy readiness failed: {readiness_error}")
    version = subprocess.run(["docker", "exec", proxy, "nginx", "-V"], capture_output=True, text=True)
    manifest["nginxVersion"] = version.stdout + version.stderr
    limits_probe = subprocess.run(["docker", "exec", proxy, "/bin/sh", "-c", 'for p in /proc/[0-9]*; do if [ "$(cat "$p/comm" 2>/dev/null)" = nginx ]; then echo "$p"; cat "$p/limits"; fi; done'], capture_output=True, text=True)
    (output / "nginx-process-limits.txt").write_text(limits_probe.stdout + limits_probe.stderr)
    create(load, args.bun_image, 4, 2147483648, ["--mount", f"type=bind,src={root},dst=/repo,readonly", "--mount", f"type=bind,src={output},dst=/bench-config,readonly", "--workdir", "/repo"], "/usr/local/bin/bun", ["/repo/benchmarks/relay/load.ts", "/bench-config/load.config.json"], f"container:{relay}")
    relay_pid = int(command(["docker", "inspect", "--format", "{{.State.Pid}}", relay]))
    proxy_pid = int(command(["docker", "inspect", "--format", "{{.State.Pid}}", proxy]))
    with (output / "result.json").open("w") as stdout, (output / "generator.stderr.log").open("w") as stderr:
        driver = subprocess.Popen(["docker", "start", "--attach", load], stdout=stdout, stderr=stderr)
        deadline = time.monotonic() + args.duration + 180
        while driver.poll() is None:
            samples.append({"unixMs": time.time() * 1000, "relay": runner.sample(relay_pid), "nginxMaster": runner.sample(proxy_pid)})
            if time.monotonic() > deadline:
                raise RuntimeError("Proxy probe wall-clock deadline")
            time.sleep(.25)
        if driver.returncode:
            raise RuntimeError(f"Load generator attachment exited {driver.returncode}")
    info = json.loads(command(["docker", "inspect", load]))[0]
    if info["State"]["ExitCode"] != 0:
        raise RuntimeError(f"Load generator container exited {info['State']['ExitCode']}")
    result = json.loads((output / "result.json").read_text())
    manifest["result"] = result
    print(json.dumps({"readyWorkers": result["connections"]["readyWorkers"], "readyClients": result["connections"]["readyClients"], "failures": result["failures"], "closes": result["closes"]}))
except Exception as error:
    failure = repr(error)
    raise
finally:
    if driver and driver.poll() is None:
        subprocess.run(["docker", "kill", load], capture_output=True)
        driver.kill()
        driver.wait()
    for name in reversed(created):
        inspect = subprocess.run(["docker", "inspect", name], capture_output=True, text=True)
        if inspect.returncode == 0:
            info = json.loads(inspect.stdout)[0]
            states[name]["state"] = info["State"]
        logs = subprocess.run(["docker", "logs", name], capture_output=True, text=True)
        (output / f"{name.rsplit('-', 1)[-1]}.log").write_text(logs.stdout + logs.stderr)
        subprocess.run(["docker", "rm", "--force", name], capture_output=True)
    manifest["containers"] = states
    manifest["runFailure"] = failure
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
