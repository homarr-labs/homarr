#!/usr/bin/env python3
"""Measure image bytes and local transfer work without pruning shared Docker data."""
import argparse
import json
from pathlib import Path
import subprocess
import tarfile
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("manifest")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    manifest_path = Path(args.manifest).resolve()
    manifest = json.loads(manifest_path.read_text())
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    report = {
        "revisions": manifest["revisions"],
        "method": "Sequential immutable-image exports; three single-thread zstd -3 compressions and three local loads per image. Docker load uses an already populated layer store. These are warm local import timings, not cold pulls, registry compression, or network transfer measurements.",
        "images": {}, "measurements": [],
    }

    def measure(label, phase, repetition, command):
        name = f"{label}-{phase}-{repetition}"
        timing = output / f"{name}.time"
        started = time.monotonic()
        with (output / f"{name}.log").open("w") as log:
            process = subprocess.run(["/usr/bin/time", "-f", "%e %U %S %M", "-o", str(timing), *command],
                                     stdout=log, stderr=subprocess.STDOUT)
        values = timing.read_text().splitlines()[-1].split()
        record = {"label": label, "phase": phase, "repetition": repetition,
                  "exit_code": process.returncode, "wall_seconds": time.monotonic() - started,
                  "user_seconds": float(values[1]), "system_seconds": float(values[2]),
                  "peak_rss_kib": int(values[3]), "log": f"{name}.log"}
        report["measurements"].append(record)
        (output / "image-transfer.json").write_text(json.dumps(report, indent=2) + "\n")
        print(json.dumps(record), flush=True)
        if process.returncode:
            raise RuntimeError(f"Image transfer failed: {name}")

    for label in ["baseline", "candidate"]:
        entry = next(e for e in manifest["builds"] if e["label"] == label and e["phase"] == "warmup" and e["exit_code"] == 0)
        result_path = Path(entry["result"])
        if not result_path.is_absolute():
            result_path = manifest_path.parent / result_path
        build = json.loads(result_path.read_text())
        image_id = build["image"]["id"]
        inspection = json.loads(subprocess.check_output(["docker", "image", "inspect", image_id], text=True))[0]
        report["images"][label] = {"id": image_id, "size_bytes": inspection["Size"],
                                   "architecture": inspection["Architecture"],
                                   "layer_ids": inspection["RootFS"]["Layers"],
                                   "revision": build["image"]["revision"]}
        tar_path = output / f"{label}.tar"
        archive_path = output / f"{label}.tar.zst"
        measure(label, "docker-save", 1, ["docker", "save", "--output", str(tar_path), image_id])
        report["images"][label]["docker_save_tar_bytes"] = tar_path.stat().st_size
        with tarfile.open(tar_path) as archive:
            image_manifest = json.load(archive.extractfile("manifest.json"))[0]
            report["images"][label]["layer_tar_bytes"] = [archive.getmember(layer).size for layer in image_manifest["Layers"]]
        for repetition in range(1, 4):
            measure(label, "zstd-compress", repetition, ["zstd", "-T1", "-3", "-f", str(tar_path), "-o", str(archive_path)])
        report["images"][label]["zstd_archive_bytes"] = archive_path.stat().st_size
    for repetition in range(1, 4):
        order = ["baseline", "candidate"]
        if repetition % 2 == 0:
            order.reverse()
        for label in order:
            archive_path = output / f"{label}.tar.zst"
            measure(label, "warm-docker-load", repetition,
                    ["bash", "-o", "pipefail", "-c", 'zstd -dc "$1" | docker load', "benchmark", str(archive_path)])
    (output / "image-transfer.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
