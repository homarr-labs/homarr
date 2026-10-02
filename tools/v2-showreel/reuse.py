"""Carry unchanged scenes over from the previous render so only edited scenes are rendered again.

Usage: python3 reuse.py out/cues-prev.json out/cues.json scene [scene ...]
Moves out/seg to out/seg-prev, then fills out/seg with the new chunks that lie entirely inside a listed scene
(clear of push transitions), cut from the old chunks at that scene's old position. Scenes must keep their length.
"""
import json, os, shutil, subprocess, sys

FPS, CHUNK, PUSH = 60, 120, 0.45
old, new = (json.load(open(f)) for f in sys.argv[1:3])
names = sys.argv[3:]
osc = {s["name"]: s for s in old["scenes"]}
nsc = {s["name"]: s for s in new["scenes"]}
spans = []
for n in names:
    a, b = osc[n], nsc[n]
    assert abs((a["end"] - a["start"]) - (b["end"] - b["start"])) < 1e-3, f"{n} changed length"
    spans.append((b["start"] + PUSH / 2, b["end"] - PUSH / 2, a["start"] - b["start"]))

os.replace("out/seg", "out/seg-prev")
os.makedirs("out/seg")
prev = sorted(f for f in os.listdir("out/seg-prev") if f.endswith(".mkv") and ".part" not in f)
with open("out/seg-prev/list.txt", "w") as f:
    f.writelines(f"file '{p}'\n" for p in prev)
total = round(new["duration"] * FPS)
reused = 0
for g in range(0, total, CHUNK):
    t0, t1 = g / FPS, min(total, g + CHUNK) / FPS
    hit = next((s for s in spans if s[0] <= t0 and t1 <= s[1]), None)
    if not hit:
        continue
    out = f"out/seg/f{g:06d}.mkv"
    src = f"out/seg-prev/f{g:06d}.mkv"
    if abs(hit[2]) < 1e-6 and os.path.exists(src):
        shutil.copy(src, out)
    else:
        start = round((t0 + hit[2]) * FPS) / FPS
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", "out/seg-prev/list.txt", "-ss", f"{start:.6f}",
             "-frames:v", str(min(total, g + CHUNK) - g), "-c:v", "libx264", "-preset", "fast", "-crf", "8", "-pix_fmt", "yuv444p", "-threads", "2", out],
            check=True,
        )
    reused += 1
print(f"reused {reused} of {-(-total // CHUNK)} chunks")
