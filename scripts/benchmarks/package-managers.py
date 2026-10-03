#!/usr/bin/env python3
"""Compare pinned repository revisions without changing their manifests or shared caches.

Results include command failures. Cache restoration measures local tar/zstd extraction,
not GitHub cache transfer latency. Workspace RSS is command peak RSS, not runtime RSS.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import shlex
import stat as stat_module
import subprocess
import time


def capture(argv, cwd=None, env=None):
    return subprocess.check_output(argv, cwd=cwd, env=env, text=True).strip()


def tree_size(path):
    paths = path if isinstance(path, list) else [path]
    seen = set()
    apparent = allocated = files = 0
    for path in paths:
        for parent, dirs, names in os.walk(path):
            for name in [".", *dirs, *names]:
                item = Path(parent) / name
                stat = item.lstat()
                identity = (stat.st_dev, stat.st_ino)
                if identity in seen:
                    continue
                seen.add(identity)
                apparent += stat.st_size
                allocated += stat.st_blocks * 512
                if not stat_module.S_ISDIR(stat.st_mode):
                    files += 1
    return {"apparent_bytes": apparent, "allocated_bytes": allocated, "files": files}


class Benchmark:
    def __init__(self, args):
        self.args = args
        self.root = Path(args.work_dir).resolve()
        self.root.mkdir(parents=True, exist_ok=True)
        shim_directory = self.root / "manager-bin"
        shim_directory.mkdir(exist_ok=True)
        pnpm_shim = shim_directory / "pnpm"
        pnpm_shim.write_text("#!/bin/sh\nexec " + shlex.quote(str(Path(args.node).resolve())) + " " +
                             shlex.quote(str(Path(args.pnpm).resolve())) + ' "$@"\n')
        pnpm_shim.chmod(0o755)
        self.output = Path(args.output).resolve()
        self.output.mkdir(parents=True, exist_ok=True)
        self.records = []
        self.variants = []
        for manager, ref in [("pnpm", args.base), ("bun", args.head)]:
            try:
                sha = capture(["git", "rev-parse", "--verify", "--end-of-options", ref + "^{commit}"])
            except subprocess.CalledProcessError:
                sha = capture(["git", "rev-parse", "--verify", "--end-of-options", "origin/" + ref + "^{commit}"])
            path = self.root / manager
            if not path.exists():
                path.mkdir()
                archive = subprocess.Popen(["git", "archive", sha], stdout=subprocess.PIPE)
                subprocess.run(["tar", "-x", "-C", str(path)], stdin=archive.stdout, check=True)
                archive.stdout.close()
                if archive.wait():
                    raise RuntimeError("git archive failed")
            lock_name = "pnpm-lock.yaml" if manager == "pnpm" else "bun.lock"
            for filename in ["package.json", lock_name]:
                expected = capture(["git", "show", sha + ":" + filename])
                if (path / filename).read_text().strip() != expected:
                    raise RuntimeError(f"Existing checkout does not match {sha}: {filename}")
            cache = self.root / (manager + "-cache")
            cache.mkdir(exist_ok=True)
            env = os.environ.copy()
            for variable in ["TURBO_API", "TURBO_TEAM", "TURBO_TOKEN", "TURBO_REMOTE_CACHE_SIGNATURE_KEY"]:
                env.pop(variable, None)
            env.update({"CI": "true", "NEXT_TELEMETRY_DISABLED": "1", "TURBO_TELEMETRY_DISABLED": "1",
                        "BUN_INSTALL_CACHE_DIR": str(cache), "XDG_CACHE_HOME": str(self.root / (manager + "-metadata"))})
            env["PATH"] = str(shim_directory) + ":" + str(Path(args.node).parent) + ":" + str(Path(args.bun).parent) + ":" + env["PATH"]
            command = [args.node, args.pnpm] if manager == "pnpm" else [args.bun]
            self.variants.append(dict(manager=manager, sha=sha, path=path, cache=cache, env=env, command=command))
        self.metadata = {"started_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                         "platform": platform.platform(), "cpu_count": os.cpu_count(),
                         "cpu": capture(["sh", "-c", "lscpu | sed -n '/Model name:/p'"]),
                         "memory": capture(["sh", "-c", "sed -n '/MemTotal:/p' /proc/meminfo"]),
                         "load_at_start": list(os.getloadavg()), "repetitions": args.repetitions,
                         "versions": {"node": capture([args.node, "--version"]),
                                      "bun": capture([args.bun, "--version"]),
                                      "pnpm": capture([args.node, args.pnpm, "--version"], cwd="/tmp")},
                         "revisions": {v["manager"]: v["sha"] for v in self.variants},
                         "nested_pnpm": "Task-owned PATH shim invokes the same pinned Node and pnpm entrypoint as top-level measurements",
                         "method": "Sequential paired trials; alternate manager order. Cold means empty task-owned package cache and node_modules, not a dropped OS page cache. GNU time reports maximum process RSS including child resource accounting, not the sum of simultaneously running processes. Full repository graphs differ with the migration."}
        previous = self.output / "package-managers.json"
        if previous.exists():
            saved = json.loads(previous.read_text())
            if saved["metadata"]["revisions"] != self.metadata["revisions"]:
                raise RuntimeError("Output directory belongs to different revisions")
            saved["metadata"]["method"] = self.metadata["method"]
            saved["metadata"]["nested_pnpm"] = self.metadata["nested_pnpm"]
            self.metadata = saved["metadata"]
            self.records = saved["measurements"]
        self.save()

    def save(self):
        data = {"metadata": self.metadata, "measurements": self.records}
        destination = self.output / "package-managers.json"
        temporary = destination.with_suffix(".tmp")
        temporary.write_text(json.dumps(data, indent=2) + "\n")
        temporary.replace(destination)

    def measure(self, variant, phase, repetition, argv, cwd=None, detail=None):
        manager = variant["manager"]
        index = len(self.records)
        log = self.output / f"{index:03d}-{manager}-{phase}-{repetition}.log"
        timing = log.with_suffix(".time")
        started = time.monotonic()
        with log.open("w") as stream:
            result = subprocess.run(["/usr/bin/time", "-f", "%e %U %S %M", "-o", str(timing), *argv],
                                    cwd=cwd or variant["path"], env=variant["env"], stdout=stream, stderr=subprocess.STDOUT)
        values = timing.read_text().splitlines()[-1].split()
        record = {"manager": manager, "phase": phase, "repetition": repetition, "exit_code": result.returncode,
                  "wall_seconds": time.monotonic() - started, "user_seconds": float(values[1]),
                  "system_seconds": float(values[2]), "peak_rss_kib": int(values[3]),
                  "load": list(os.getloadavg()), "log": log.name, "command": argv}
        if detail:
            record.update(detail)
        self.records.append(record)
        self.save()
        print(json.dumps({key: record[key] for key in ["manager", "phase", "repetition", "exit_code", "wall_seconds", "peak_rss_kib"]}), flush=True)
        return record

    def install_command(self, variant, scripts=True, offline=False):
        argv = variant["command"] + ["install", "--frozen-lockfile"]
        if variant["manager"] == "bun":
            argv += ["--concurrent-scripts=1"]
        if variant["manager"] == "pnpm":
            argv += ["--store-dir", str(variant["cache"]), "--reporter=append-only", "--child-concurrency=1"]
        if not scripts:
            argv += ["--ignore-scripts"]
        if offline:
            argv += ["--offline"]
        return argv

    def clear_modules(self, variant):
        for path in [variant["path"] / "node_modules", *variant["path"].glob("apps/*/node_modules"),
                     *variant["path"].glob("packages/*/node_modules"), *variant["path"].glob("tooling/*/node_modules")]:
            if path.is_symlink():
                path.unlink()
            elif path.exists():
                shutil.rmtree(path)

    def installs(self):
        for repetition in range(1, self.args.repetitions + 1):
            variants = self.variants if repetition % 2 else list(reversed(self.variants))
            for v in variants:
                self.clear_modules(v)
                shutil.rmtree(Path(v["env"]["XDG_CACHE_HOME"]), ignore_errors=True)
                shutil.rmtree(v["cache"])
                v["cache"].mkdir()
                for name in ["cold", "warm", "no-op"]:
                    if name == "warm":
                        self.clear_modules(v)
                    result = self.measure(v, "install-" + name, repetition, self.install_command(v))
                    result["cache"] = tree_size(v["cache"])
                    result["modules"] = tree_size(v["path"] / "node_modules")
                    self.save()
                    if result["exit_code"]:
                        print((self.output / result["log"]).read_text()[-4000:], flush=True)
                        raise RuntimeError("Frozen installation failed; comparison cannot continue")
                self.clear_modules(v)
                self.measure(v, "install-warm-ignore-scripts", repetition, self.install_command(v, scripts=False))
        for v in self.variants:
            cache = v["cache"]
            archive = self.root / (v["manager"] + "-cache.tar.zst")
            self.measure(v, "cache-archive", 1, ["tar", "--zstd", "-cf", str(archive), "-C", str(cache), "."])
            self.records[-1]["archive_bytes"] = archive.stat().st_size
            self.records[-1]["cache"] = tree_size(cache)
            self.save()
            for repetition in range(1, self.args.repetitions + 1):
                shutil.rmtree(cache)
                cache.mkdir()
                self.measure(v, "cache-restore", repetition, ["tar", "--zstd", "-xf", str(archive), "-C", str(cache)])
                self.clear_modules(v)
                self.measure(v, "install-restored-offline", repetition, self.install_command(v, offline=True))
            self.shared(v)

    def shared(self, v):
        script = "const fs=require('fs');const out=[];for(const p of ['apps/nextjs','apps/docs','packages/ui','packages/widgets']){for(const d of ['react','@mantine/core']){try{const resolved=require.resolve(d,{paths:[process.cwd()+'/'+p]});const s=fs.statSync(resolved);let folder=require('path').dirname(resolved);while(!fs.existsSync(folder+'/package.json')||JSON.parse(fs.readFileSync(folder+'/package.json')).name!==d){const parent=require('path').dirname(folder);if(parent===folder)throw new Error('Package manifest not found');folder=parent;}out.push({workspace:p,dependency:d,path:fs.realpathSync(resolved).replace(process.cwd(),'CHECKOUT'),device:s.dev,inode:s.ino,version:JSON.parse(fs.readFileSync(folder+'/package.json')).version});}catch(e){out.push({workspace:p,dependency:d,error:String(e)})}}}console.log(JSON.stringify(out))"
        data = json.loads(capture([self.args.node, "-e", script], cwd=v["path"], env=v["env"]))
        self.metadata.setdefault("shared_resolution", {})[v["manager"]] = data
        runtime = self.args.node
        if v["manager"] == "bun" and not json.loads((v["path"] / "package.json").read_text()).get("engines", {}).get("node"):
            runtime = self.args.bun
        inventory_script = Path(__file__).resolve().parent / "workspace-sharing.mjs"
        inventory = json.loads(capture([runtime, str(inventory_script), str(v["path"])], cwd=v["path"], env=v["env"]))
        self.metadata.setdefault("complete_workspace_sharing", {})[v["manager"]] = inventory
        modules = [v["path"] / "node_modules", *v["path"].glob("apps/*/node_modules"), *v["path"].glob("packages/*/node_modules"), *v["path"].glob("tooling/*/node_modules")]
        self.metadata.setdefault("installation_sizes", {})[v["manager"]] = {"modules": tree_size(modules), "cache": tree_size(v["cache"]), "cache_and_modules_unique_inodes": tree_size([v["cache"], *modules])}
        lock = v["path"] / ("pnpm-lock.yaml" if v["manager"] == "pnpm" else "bun.lock")
        self.metadata.setdefault("lockfiles", {})[v["manager"]] = {"bytes": lock.stat().st_size, "lines": len(lock.read_text().splitlines()), "sha256": hashlib.sha256(lock.read_bytes()).hexdigest()}
        self.save()

    def workspaces(self):
        for v in self.variants:
            self.shared(v)
        manifests = []
        for pattern in ["apps/*/package.json", "packages/*/package.json", "tooling/*/package.json"]:
            manifests.extend(self.variants[1]["path"].glob(pattern))
        inventory = []
        for manifest in sorted(manifests):
            relative = manifest.parent.relative_to(self.variants[1]["path"])
            candidate = json.loads(manifest.read_text())
            base_manifest = self.variants[0]["path"] / relative / "package.json"
            if not base_manifest.exists():
                inventory.append({"workspace": str(relative), "status": "candidate-only"})
                continue
            baseline = json.loads(base_manifest.read_text())
            if "typecheck" not in candidate.get("scripts", {}) or "typecheck" not in baseline.get("scripts", {}):
                inventory.append({"workspace": str(relative), "status": "no paired typecheck script"})
                continue
            inventory.append({"workspace": str(relative), "status": "paired", "name": candidate["name"]})
            for repetition in range(1, self.args.repetitions + 1):
                variants = self.variants if repetition % 2 else list(reversed(self.variants))
                for v in variants:
                    path = v["path"] / relative
                    if repetition == 1:
                        (path / "node_modules/.cache/tsbuildinfo.json").unlink(missing_ok=True)
                        for buildinfo in path.glob("**/*.tsbuildinfo"):
                            if "node_modules" not in buildinfo.parts:
                                buildinfo.unlink()
                    argv = v["command"] + ["run", "typecheck"]
                    self.measure(v, "workspace-typecheck", repetition, argv, cwd=path,
                                 detail={"workspace": str(relative), "cache_state": "first" if repetition == 1 else "incremental"})
        self.metadata["workspace_inventory"] = inventory
        self.save()


    def tools(self):
        npm = Path(self.args.node).resolve().parent.parent / "lib/node_modules/npm/bin/npm-cli.js"
        if not npm.exists():
            raise RuntimeError("Pinned Node distribution must include npm")
        for tool in ["tools/mysql-to-sqlite", "tools/v2-showreel"]:
            for repetition in range(1, self.args.repetitions + 1):
                originals = self.variants if repetition % 2 else list(reversed(self.variants))
                for original in originals:
                    v = dict(original)
                    if v["manager"] == "pnpm":
                        v["manager"] = "npm"
                        v["command"] = [self.args.node, str(npm)]
                    v["path"] = original["path"] / tool
                    v["cache"] = self.root / (v["manager"] + "-" + Path(tool).name + "-cache")
                    v["env"] = dict(original["env"])
                    v["env"]["BUN_INSTALL_CACHE_DIR"] = str(v["cache"])
                    if v["cache"].exists():
                        shutil.rmtree(v["cache"])
                    v["cache"].mkdir()
                    def clear():
                        shutil.rmtree(v["path"] / "node_modules", ignore_errors=True)
                    clear()
                    for phase in ["cold", "warm", "no-op"]:
                        if phase == "warm":
                            clear()
                        if v["manager"] == "npm":
                            operation = "install" if phase == "no-op" else "ci"
                            command = v["command"] + [operation, "--cache", str(v["cache"]), "--no-audit", "--no-fund"]
                        else:
                            command = self.install_command(v)
                        result = self.measure(v, "tool-install-" + phase, repetition, command, detail={"tool": tool})
                        result["modules"] = tree_size(v["path"] / "node_modules")
                        result["cache"] = tree_size(v["cache"])
                        self.save()
                        if result["exit_code"]:
                            raise RuntimeError("Standalone tool frozen install failed")
                    if tool.endswith("v2-showreel"):
                        result = self.measure(v, "tool-build", repetition, v["command"] + ["run", "build"], detail={"tool": tool})
                        result["output_bytes"] = tree_size(v["path"] / "dist")["apparent_bytes"]
                        self.save()
                    else:
                        runtime = self.args.node if json.loads((v["path"] / "package.json").read_text()).get("engines", {}).get("node") else self.args.bun
                        self.measure(v, "tool-help", repetition, [runtime, "src/cli.mjs", "--help"], detail={"tool": tool})

    def commands(self):
        for repetition in range(1, self.args.repetitions + 1):
            variants = self.variants if repetition % 2 else list(reversed(self.variants))
            for v in variants:
                self.shared(v)
                for name in ["lint", "format"]:
                    self.measure(v, "repository-" + name, repetition, v["command"] + ["run", name],
                                 detail={"cache_state": "turbo cache allowed"})
                runtime = [self.args.node, "--expose-gc", "--import", str(v["path"] / "node_modules/tsx/dist/loader.mjs")] if json.loads((v["path"] / "package.json").read_text()).get("engines", {}).get("node") else [self.args.bun, "--expose-gc"]
                # One common workload and accounting method; import production code
                # relative to the corresponding revision's checkout.
                source = Path("scripts/benchmarks/request-handler-memory.mts").read_text()
                target = v["path"] / "scripts/benchmarks/migration-request-memory.mts"
                target.write_text(source)
                self.measure(v, "request-handler-retention", repetition, runtime + [str(target)])

    def builds(self):
        for repetition in range(1, self.args.repetitions + 1):
            variants = self.variants if repetition % 2 else list(reversed(self.variants))
            for v in variants:
                for workspace in ["apps/docs", "packages/cli"]:
                    if any(r["phase"] == "workspace-build" and r["manager"] == v["manager"] and r["workspace"] == workspace and r["repetition"] == repetition for r in self.records):
                        continue
                    if repetition == 1 and workspace == "apps/docs":
                        for directory in [".next", "out"]:
                            shutil.rmtree(v["path"] / workspace / directory, ignore_errors=True)
                    result = self.measure(v, "workspace-build", repetition, v["command"] + ["run", "build"],
                                          cwd=v["path"] / workspace,
                                          detail={"workspace": workspace, "cache_state": "first build; empty Next output/cache" if repetition == 1 else "repeat build; Next cache retained", "prior_typecheck_artifacts": "retained"})
                    if result["exit_code"] == 0:
                        artifact = v["path"] / workspace / ("out" if workspace == "apps/docs" else "cli.cjs")
                        result["artifact"] = tree_size(artifact) if artifact.is_dir() else {"bytes": artifact.stat().st_size}
                        self.save()

    def lock_versions(self, v, contents):
        parser = self.variants[1]["path"] / "node_modules" / ("yaml" if v["manager"] == "pnpm" else "json5")
        script = "const fs=require('fs');const parser=require(process.argv[1]);const lock=parser.parse(fs.readFileSync(0,'utf8'));const versions=process.argv[2]==='pnpm'?Object.keys(lock.packages):Object.values(lock.packages).map(v=>v[0]);console.log(JSON.stringify([...new Set(versions)].sort()))"
        result = subprocess.run([self.args.node, "-e", script, str(parser), v["manager"]], input=contents,
                                text=True, check=True, stdout=subprocess.PIPE, env=v["env"])
        return set(json.loads(result.stdout))

    def conflicts(self):
        cases = ["different-workspaces", "same-workspace", "competing-version"]
        for case in cases:
            for repetition in range(1, self.args.repetitions + 1):
                variants = self.variants if repetition % 2 else list(reversed(self.variants))
                for original in variants:
                    v = dict(original)
                    completed = any(r["phase"] == "conflict-regenerate" and r["manager"] == v["manager"] and r.get("case") == case and r["repetition"] == repetition and "frozen_validation_exit_code" in r for r in self.records)
                    if completed:
                        continue
                    root = self.root / f"conflict-{v['manager']}-{case}-{repetition}"
                    if root.exists():
                        raise RuntimeError(f"Conflict fixture already exists: {root}")
                    root.mkdir()
                    for pattern in ["package.json", "bun.lock", "bunfig.toml", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".npmrc", "patches/*", "apps/*/package.json", "packages/*/package.json", "tooling/*/package.json"]:
                        for source in original["path"].glob(pattern):
                            target = root / source.relative_to(original["path"])
                            target.parent.mkdir(parents=True, exist_ok=True)
                            shutil.copy2(source, target)
                    v["path"] = root
                    def git(*arguments, check=True):
                        return subprocess.run(["git", *arguments], cwd=root, check=check, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True).stdout
                    git("init", "-b", "base")
                    git("config", "user.name", "Benchmark fixture")
                    git("config", "user.email", "benchmark@example.invalid")
                    git("add", ".")
                    git("commit", "-m", "base")
                    lock_command = v["command"] + ["install", "--lockfile-only", "--ignore-scripts"]
                    if v["manager"] == "pnpm":
                        lock_command += ["--store-dir", str(v["cache"]), "--no-frozen-lockfile", "--reporter=append-only"]
                    paths = ["packages/common/package.json", "packages/analytics/package.json"]
                    if case != "different-workspaces":
                        paths[1] = paths[0]
                    for branch, dependency in [("left", "clsx"), ("right", "yaml")]:
                        git("checkout", "-b", branch, "base")
                        index = 0 if branch == "left" else 1
                        manifest = root / paths[index]
                        data = json.loads(manifest.read_text())
                        if case == "competing-version":
                            dependency = "is-number"
                            version = "6.0.0" if branch == "left" else "7.0.0"
                        else:
                            version = "catalog:"
                        data.setdefault("dependencies", {})[dependency] = version
                        data["dependencies"] = dict(sorted(data["dependencies"].items()))
                        manifest.write_text(json.dumps(data, indent=2) + "\n")
                        result = self.measure(v, "conflict-parent-lock", repetition, lock_command, detail={"case": case, "branch": branch})
                        if result["exit_code"]:
                            raise RuntimeError("Parent lock generation failed")
                        git("add", ".")
                        git("commit", "-m", branch)
                    lock_name = "pnpm-lock.yaml" if v["manager"] == "pnpm" else "bun.lock"
                    left_versions = self.lock_versions(v, git("show", "left:" + lock_name))
                    right_versions = self.lock_versions(v, git("show", "right:" + lock_name))
                    git("checkout", "left")
                    merge_started = time.monotonic()
                    merge_output = git("merge", "--no-commit", "--no-ff", "right", check=False)
                    conflict_files = git("diff", "--name-only", "--diff-filter=U").splitlines()
                    conflict_hunks = sum((root / name).read_text().count("<<<<<<<") for name in conflict_files)
                    manifest_conflicts = [name for name in conflict_files if name.endswith("package.json")]
                    for name in set(paths):
                        left = json.loads(git("show", "left:" + name))
                        right = json.loads(git("show", "right:" + name))
                        merged = dict(left)
                        dependencies = dict(left.get("dependencies", {}))
                        dependencies.update(right.get("dependencies", {}))
                        merged["dependencies"] = dict(sorted(dependencies.items()))
                        (root / name).write_text(json.dumps(merged, indent=2) + "\n")
                    lock_name = "pnpm-lock.yaml" if v["manager"] == "pnpm" else "bun.lock"
                    # Deterministic policy: preserve the left lock, merge manifest intentions,
                    # choose right for a competing version, then regenerate and validate.
                    (root / lock_name).write_text(git("show", "left:" + lock_name) + "\n")
                    result = self.measure(v, "conflict-regenerate", repetition, lock_command,
                        detail={"case": case, "conflict_files": conflict_files, "conflict_hunks": conflict_hunks,
                                "manifest_conflicts": manifest_conflicts, "merge_seconds": time.monotonic() - merge_started,
                                "human_version_decisions": int(case == "competing-version"),
                                "resolution_policy": "Merge both manifest additions; choose right for competing version; regenerate from left lock", "merge_output": merge_output})
                    frozen = self.measure(v, "conflict-frozen-validation", repetition,
                                          self.install_command(v, scripts=False), detail={"case": case})
                    intent_ok = True
                    for name in set(paths):
                        actual = json.loads((root / name).read_text())["dependencies"]
                        if case == "competing-version":
                            intent_ok = intent_ok and actual.get("is-number") == "7.0.0"
                        else:
                            expected = ["clsx", "yaml"] if paths[0] == paths[1] else ["clsx" if name == paths[0] else "yaml"]
                            intent_ok = intent_ok and all(actual.get(key) == "catalog:" for key in expected)
                    final_versions = self.lock_versions(v, (root / lock_name).read_text())
                    expected_union = left_versions | right_versions
                    result["unexpected_added_versions"] = sorted(final_versions - expected_union)
                    result["removed_parent_versions"] = sorted(expected_union - final_versions)
                    result["manifest_intent_preserved"] = intent_ok
                    result["frozen_validation_exit_code"] = frozen["exit_code"]
                    self.save()
                    # Keep logs and exact manifests/locks, release the installed package tree.
                    self.clear_modules(v)
                    if result["exit_code"] or not intent_ok:
                        raise RuntimeError("Conflict resolution failed manifest/lock validation")
                    if frozen["exit_code"]:
                        print((self.output / frozen["log"]).read_text()[-4000:], flush=True)
                        if v["manager"] == "bun":
                            raise RuntimeError("Candidate frozen conflict installation failed")
                        # A baseline installer failure is benchmark evidence; retain it
                        # and measure the other scenarios instead of hiding the failure.


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="origin/dev")
    parser.add_argument("--head", default="HEAD")
    parser.add_argument("--work-dir", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--node", default="node")
    parser.add_argument("--bun", default="bun")
    parser.add_argument("--pnpm", required=True, help="Pinned pnpm.cjs entrypoint")
    parser.add_argument("--repetitions", type=int, default=3)
    parser.add_argument("--phase", choices=["install", "workspaces", "conflicts", "commands", "tools", "builds", "all"], default="all")
    args = parser.parse_args()
    if args.repetitions < 3:
        parser.error("Use at least three repetitions")
    benchmark = Benchmark(args)
    if args.phase in ["install", "all"]:
        benchmark.installs()
    if args.phase in ["workspaces", "all"]:
        benchmark.workspaces()
    if args.phase in ["conflicts", "all"]:
        benchmark.conflicts()
    if args.phase in ["commands", "all"]:
        benchmark.commands()
    if args.phase in ["tools", "all"]:
        benchmark.tools()
    if args.phase in ["builds", "all"]:
        benchmark.builds()
    candidate_failures = [r for r in benchmark.records if r["manager"] == "bun" and r["exit_code"]]
    if candidate_failures:
        raise RuntimeError("Candidate benchmark commands failed; preserved measurements cannot pass the benchmark gate: " +
                           ", ".join(r["log"] for r in candidate_failures))


if __name__ == "__main__":
    main()
