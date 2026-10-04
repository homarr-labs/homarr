"""Beat grid and structure of a music track for syncing the reel.

python3 music/analyze.py music/track.mp3 [bpm-hint] -> music/analysis.json + a per-bar table on stdout.
Finds the tempo and beat phase from a spectral-flux onset envelope, the downbeat from low-end kicks, then per-bar
loudness, sub-bass, highs and a novelty score so drops and section changes can be picked by bar number.
"""

import json
import subprocess
import sys

import numpy as np
from scipy.signal import stft

SR = 22050
HOP = 256
src = sys.argv[1]
hint = float(sys.argv[2]) if len(sys.argv) > 2 else None

pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", src, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
x = np.frombuffer(pcm, dtype=np.float32)
dur = len(x) / SR

f, t, Z = stft(x, fs=SR, nperseg=2048, noverlap=2048 - HOP, boundary=None)
S = np.abs(Z)
fps = SR / HOP
band = lambda lo, hi: S[(f >= lo) & (f < hi)].sum(axis=0)
sub = band(30, 120)
low = band(30, 200)
high = band(5000, 11000)
rms = np.sqrt((S**2).mean(axis=0))

# Onset envelope: log spectral flux, half-wave rectified.
L = np.log1p(S * 10)
flux = np.maximum(0, np.diff(L, axis=1)).sum(axis=0)
flux = np.concatenate([[0], flux])
flux = flux - np.convolve(flux, np.ones(16) / 16, mode="same")
flux = np.maximum(flux, 0)
kick = np.maximum(0, np.diff(np.log1p(low), prepend=0))

# Tempo: autocorrelation of the onset envelope, weighted towards the hint (or 80-160 BPM).
ac = np.correlate(flux, flux, mode="full")[len(flux) - 1 :]
lags = np.arange(len(ac))
bpms = 60 * fps / np.maximum(lags, 1)
ok = (bpms > 60) & (bpms < 200)
w = np.exp(-0.5 * (np.log2(bpms / (hint or 120)) / 0.3) ** 2)
score = np.where(ok, ac * w, 0)
lag0 = int(np.argmax(score))
# Refine the period to sub-frame precision by scanning around the peak.
cands = np.linspace(lag0 - 1.5, lag0 + 1.5, 301)


def comb(period, phase, env):
    idx = np.arange(phase, len(env) - 1, period)
    return env[np.round(idx).astype(int)].sum() / max(1, len(idx))


best = max(((comb(p, ph, flux), p, ph) for p in cands for ph in np.linspace(0, p, 48, endpoint=False)))
_, period, phase = best
bpm = 60 * fps / period
beats = np.arange(phase, len(flux) - 1, period) / fps

# Downbeat: which of the 4 beat offsets carries the most kick energy.
kick_at = lambda times: np.array([kick[min(len(kick) - 1, int(round(b * fps)))] for b in times])
kb = kick_at(beats)
off = int(np.argmax([kb[i::4].mean() for i in range(4)]))
bars = beats[off::4]
if off > 0 and bars[0] - 4 * period / fps > -period / fps:
    bars = np.concatenate([[bars[0] - 4 * period / fps], bars])


def seg_mean(v, a, b):
    i, j = int(a * fps), max(int(a * fps) + 1, int(b * fps))
    return float(v[i:j].mean())


rows = []
for i, a in enumerate(bars):
    b = a + 4 * period / fps
    if b > dur + 0.01:
        break
    rows.append({"bar": i, "t": round(float(a), 3), "rms": seg_mean(rms, a, b), "sub": seg_mean(sub, a, b), "high": seg_mean(high, a, b), "onset": seg_mean(flux, a, b)})
for k in ("rms", "sub", "high", "onset"):
    m = max(r[k] for r in rows) or 1
    for r in rows:
        r[k] = round(r[k] / m, 3)
# Novelty: jump in the feature vector versus the previous bar (big positive = a drop or new section).
for i, r in enumerate(rows):
    p = rows[i - 1] if i else r
    r["nov"] = round((r["rms"] - p["rms"]) + (r["sub"] - p["sub"]) + 0.5 * (r["high"] - p["high"]), 3)

out = {"src": src, "duration": round(dur, 3), "bpm": round(bpm, 3), "beat": round(period / fps, 5), "beats": [round(float(b), 3) for b in beats], "bars": rows}
json.dump(out, open("music/analysis.json", "w"), indent=1)
print(f"duration {dur:.2f}s  bpm {bpm:.2f}  beat {period / fps:.4f}s  bar {4 * period / fps:.3f}s  first downbeat {rows[0]['t']:.3f}s")
print(" bar     t    rms   sub  high onset   nov")
for r in rows:
    flag = " <== drop" if r["nov"] > 0.35 else (" <-- rise" if r["nov"] > 0.18 else (" --> dip" if r["nov"] < -0.3 else ""))
    bar_ = "#" * int(r["rms"] * 20)
    print(f"{r['bar']:4d} {r['t']:6.2f}  {r['rms']:.2f}  {r['sub']:.2f}  {r['high']:.2f}  {r['onset']:.2f} {r['nov']:+.2f} {bar_}{flag}")
