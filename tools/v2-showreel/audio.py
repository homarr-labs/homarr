"""Build the showreel soundtrack from the music track and out/cues.json → out/soundtrack.wav.

Music: MOKKA – Synthetic Pleasures (93 BPM). Scene lengths are whole bars of it, so the track plays on the video's
bar grid. The video opens on the phrase crash at music bar 8, so the drop (bar 16) lands on Assistant. Two edits
(CUTS): "board" opens on the crash after the breakdown (bar 32), which puts the globe on the crash at bar 40, and the
end card jumps to the track's final hit (bar 48).
SFX: the scenes' cue lists. The intro, front door and globe keep their whooshes, risers, reversed swells and
explosions; elsewhere whooshes are quiet and bells become short blips. The music ducks under the effects.
Also writes assets/music-env.json, a kick envelope on video time that drives the per-kick camera push in main.ts.
"""

import json
import math
import subprocess
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d, uniform_filter1d
from scipy.signal import butter, fftconvolve, lfilter, sosfilt

ROOT = Path(__file__).parent
SR = 48000
TRACK = ROOT / "music/synthetic-pleasures-preview.mp3"
BPM = 93
BAR = 4 * 60 / BPM
OFFSET = 0.0  # the track's bar 0 is at t≈0 (measured from the hi-hat phase)
START_BAR = 8  # music bar at video 0
CUTS = {"board": 32, "outro": 48}  # scene → music bar that plays from its start
rng = np.random.default_rng(7)

data = json.loads((ROOT / "out/cues.json").read_text())
DUR = data["duration"] + 0.3
N = int(DUR * SR)
scenes = {s["name"]: (s["start"], s["end"]) for s in data["scenes"]}
starts = sorted(s["start"] for s in data["scenes"])


def t_arr(dur):
    return np.arange(int(dur * SR)) / SR


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def add(buf, sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N or gain == 0:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    n = min(len(sig), N - i)
    if n <= 0:
        return
    a = (pan + 1) * math.pi / 4
    buf[0, i : i + n] += sig[:n] * gain * math.cos(a)
    buf[1, i : i + n] += sig[:n] * gain * math.sin(a)


# ---------------------------------------------------------------- music edit
pcm = subprocess.run(["ffmpeg", "-v", "error", "-i", str(TRACK), "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"], capture_output=True, check=True).stdout
raw = np.frombuffer(pcm, dtype=np.float32).reshape(-1, 2).T.astype(np.float64)


def raw_at(t0, n):
    """n samples of the track starting at raw time t0 (zero-padded outside the file)."""
    out = np.zeros((2, n))
    i = int(round(t0 * SR))
    a, b = max(0, i), min(raw.shape[1], i + n)
    if b > a:
        out[:, a - i : b - i] = raw[:, a:b]
    return out


# Piecewise map from video time to track time: (video start, music bar) per stretch.
edits = [(0.0, START_BAR)]
for name, bar in CUTS.items():
    c = scenes[name][0]
    assert abs(c / BAR - round(c / BAR)) < 0.01, f"{name} must start on a bar line"
    edits.append((c, bar))
edits.sort()
XF = int(0.03 * SR)
u = np.linspace(0, 1, XF)
music = np.zeros((2, N))
for j, (v0, bar) in enumerate(edits):
    v1 = edits[j + 1][0] if j + 1 < len(edits) else DUR
    i0, i1 = int(round(v0 * SR)), min(N, int(round(v1 * SR)))
    part = raw_at(bar * BAR + OFFSET, i1 - i0)
    if j:
        # Short equal-power crossfade from the previous stretch; the cue on the cut masks it.
        pv0, pbar = edits[j - 1]
        tail = raw_at(pbar * BAR + OFFSET + (v0 - pv0), XF)
        part[:, :XF] = tail * np.cos(u * math.pi / 2) + part[:, :XF] * np.sin(u * math.pi / 2)
    music[:, i0:i1] = part
    print(f"video bar {v0 / BAR:5.2f} → music bar {bar}")

# ---------------------------------------------------------------- SFX
sfx = np.zeros((2, N))
send = np.zeros((2, N))


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def svf_sweep(x, f0, f1, q=2.0):
    n = len(x)
    f = f0 * (f1 / f0) ** np.linspace(0, 1, n)
    g = np.tan(np.pi * np.minimum(f, SR * 0.45) / SR)
    k = 1 / q
    ic1 = ic2 = 0.0
    y = np.empty(n)
    for i in range(n):
        gi = g[i]
        a1 = 1 / (1 + gi * (gi + k))
        v3 = x[i] - ic2
        v1 = a1 * ic1 + gi * a1 * v3
        v2 = ic2 + gi * v1
        ic1 = 2 * v1 - ic1
        ic2 = 2 * v2 - ic2
        y[i] = v1
    return y


def sfx_hit():
    t = t_arr(1.2)
    thump = np.sin(2 * np.pi * np.cumsum(50 + 90 * np.exp(-t * 25)) / SR) * np.exp(-t * 6)
    snap = bp(noise(1.2), 1500, 6000) * np.exp(-t * 40) * 0.5
    return np.tanh(thump * 1.4) * 0.8 + snap


def sfx_boom():
    """Explosion: falling sub, a broadband blast and a crash tail."""
    t = t_arr(3.0)
    f = 28 + 40 * np.exp(-t * 3)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.1)
    rumble = lp(noise(3.0), 180) * np.exp(-t * 1.6) * 0.8
    blast = bp(noise(3.0), 150, 1800) * np.exp(-t * 5) * 0.6
    crash = hp(noise(3.0), 2500) * np.exp(-t * 1.3) * 0.25
    return np.tanh((sub + rumble + blast) * 1.5) * 0.9 + crash


def sfx_whoosh(dur=0.7, lo=300, hi=3200, q=1.4):
    x = noise(dur)
    n = len(x)
    up = svf_sweep(x[: n // 2 + 1], lo, hi, q)
    dn = svf_sweep(x[n // 2 :], hi, lo * 2, q)
    y = np.concatenate([up, dn])[:n]
    return y * np.sin(np.pi * np.linspace(0, 1, n)) ** 1.6 * 0.7


def sfx_riser(dur):
    dur = max(dur, 0.4)
    u = t_arr(dur) / dur
    x = svf_sweep(noise(dur), 200, 7000, 3)
    tone = np.sin(2 * np.pi * np.cumsum(110 * 2 ** (u * 2)) / SR) * 0.25
    return (x * 0.8 + tone) * u**2.2 * 0.8


def sfx_click():
    t = t_arr(0.03)
    return (np.sin(2 * np.pi * 3200 * t) * 0.6 + hp(noise(0.03), 2000) * 0.5) * np.exp(-t * 260)


def sfx_pop(pitch=0):
    t = t_arr(0.12)
    k = 2 ** (pitch / 24)
    f = (320 + 700 * np.exp(-t * 60)) * k
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32) * 0.7


def sfx_tock():
    """Unpitched wooden tick (replaces the old pentatonic bell ticks)."""
    t = t_arr(0.05)
    return (bp(noise(0.05), 1800, 5000) * 0.7 + np.sin(2 * np.pi * 950 * t) * 0.35) * np.exp(-t * 140)


def sfx_key(pitch=0):
    t = t_arr(0.09)
    click = hp(noise(0.09), 2500) * np.exp(-t * 300) * 0.5
    thock = np.sin(2 * np.pi * (170 * 2 ** (pitch / 12)) * t) * np.exp(-t * 45)
    return click + thock * 0.8


def sfx_type(dur):
    out = np.zeros(int((dur + 0.1) * SR))
    t = 0.0
    while t < dur:
        s = sfx_key(rng.uniform(-3, 5)) * rng.uniform(0.25, 0.45)
        i = int(t * SR)
        n = min(len(s), len(out) - i)
        out[i : i + n] += s[:n]
        t += rng.uniform(0.045, 0.09)
    return out


def sfx_zap(dur=0.3):
    dur = max(dur, 0.15)
    t = t_arr(dur)
    f = 900 + np.sin(2 * np.pi * 37 * t) * 400 + 1500 * (1 - t / dur)
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    crackle = hp(noise(dur), 4000) * (rng.random(len(t)) > 0.97)
    env = np.minimum(1, t / 0.01) * np.clip((dur - t) / (dur * 0.6), 0, 1)
    return (bp(saw, 500, 5000) * 0.5 + crackle * 0.6) * env * 0.35


def sfx_buzz():
    t = t_arr(0.75)
    gate = ((t < 0.28) | ((t > 0.4) & (t < 0.68))).astype(float)
    gate = uniform_filter1d(gate, int(0.01 * SR))
    tone = np.tanh(np.sin(2 * np.pi * 165 * t) * 3) * 0.5 + lp(noise(0.75), 400) * 0.3
    return tone * gate * 0.45


def sfx_stamp():
    t = t_arr(0.3)
    thump = np.sin(2 * np.pi * np.cumsum(70 + 80 * np.exp(-t * 40)) / SR) * np.exp(-t * 16)
    click = bp(noise(0.3), 1200, 5000) * np.exp(-t * 120) * 0.6
    return np.tanh((thump + click) * 1.5) * 0.7


def sfx_reverse(length=1.3):
    u = t_arr(length) / length
    return hp(noise(length), 3000) * u**3.2 * 0.5


# The intro, front door and globe keep the full whooshes, risers, reversed swells into the explosions and reverb.
# Elsewhere whooshes and risers stay quiet, bells (chime) become short blips, and bursts of ticks and zaps are thinned
# so they read as texture rather than melody. Push transitions get a whoosh of their own.
BIG = ("intro", "front-door", "stats")
push = [s["start"] for s in data["scenes"] if s["name"] in ("custom-widgets", "rest", "stats")]
for t in push:
    add(sfx, sfx_whoosh(), t - 0.35, 0.25, -0.2)
last = {}
MIN_GAP = {"tick": 0.09, "zap": 0.12, "pop": 0.06}
dropped = kept = 0
for c in data["cues"]:
    k, t, g = c["kind"], c["t"], c.get("gain", 1.0)
    p = c.get("pitch", 0) or 0
    pan = c.get("pan", 0) or 0
    d = c.get("dur", 0) or 0
    big = any(scenes[n][0] - 0.5 <= t < scenes[n][1] for n in BIG)
    if k == "glitch" or (k == "reverse" and not big):
        dropped += 1
        continue
    if k in MIN_GAP and t - last.get(k, -9) < MIN_GAP[k] and not scenes["front-door"][0] <= t < scenes["front-door"][1]:
        dropped += 1
        continue
    last[k] = t
    kept += 1
    if k == "hit":
        s = sfx_hit()
        add(sfx, s, t, 0.6 * g, pan)
        add(send, s, t, 0.15 * g)
    elif k == "boom":
        s = sfx_boom()
        add(sfx, s, t, 0.9 * g, pan)
        add(send, s, t, 0.25 * g)
    elif k == "whoosh" and big:
        s = sfx_whoosh(0.9, 250, 3500, 1.6)
        add(sfx, s, t - 0.45, 0.6 * g, pan - 0.3)
        add(send, s, t - 0.45, 0.15 * g)
    elif k == "whoosh":
        add(sfx, sfx_whoosh(0.6), t - 0.3, 0.2 * g, pan - 0.2)
    elif k == "riser":
        s = sfx_riser(d or 1.0)
        add(sfx, s, t, (0.5 if big else 0.25) * g, pan)
        add(send, s, t, (0.2 if big else 0.08) * g)
    elif k == "reverse":
        L = 1.3
        add(sfx, sfx_reverse(L), t - L, 0.55 * g, pan)
    elif k == "swish":
        add(sfx, sfx_whoosh(0.3, 900 * 2 ** (p / 24), 6000), t - 0.1, (0.3 if big else 0.2) * g, pan + 0.2)
    elif k == "click":
        add(sfx, sfx_click(), t, 0.6 * g, pan)
    elif k == "pop":
        add(sfx, sfx_pop(p), t, 0.5 * g, pan)
    elif k == "chime":
        add(sfx, sfx_pop(p + 10), t, 0.35 * g, pan)
        add(sfx, sfx_tock(), t + 0.07, 0.3 * g, pan)
    elif k == "tick":
        add(sfx, sfx_tock(), t, 0.5 * g, pan + 0.15 * math.sin(p))
    elif k == "type":
        add(sfx, sfx_type(d or 0.5), t, 0.75 * g, pan)
    elif k == "key":
        add(sfx, sfx_key(p), t, 0.75 * g, pan)
    elif k == "zap":
        add(sfx, sfx_zap(d or 0.3), t, 0.5 * g, pan)
    elif k == "buzz":
        add(sfx, sfx_buzz(), t, 0.8 * g, pan)
    elif k == "stamp":
        add(sfx, sfx_stamp(), t, 0.7 * g, pan)
    else:
        print("unknown cue", k)
# Hard cuts without a cue of their own get a hit so the jump lands.
for name in ("assistant", "board"):
    add(sfx, sfx_hit(), scenes[name][0], 0.45)
print(f"sfx: kept {kept} cues, dropped {dropped}")

# ---------------------------------------------------------------- mix
irt = t_arr(2.2)
ir = [lp(noise(2.2), 6000) * np.exp(-irt * 2.6) for _ in range(2)]
for x in ir:
    x /= np.sqrt(np.sum(x**2))
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)]) * 0.5
# Sidechain: the music dips under the effects (fast attack, ~180 ms release), up to 6 dB under the big hits.
lvl = maximum_filter1d(np.max(np.abs(sfx), axis=0), int(0.02 * SR))
rel = math.exp(-1 / (0.18 * SR))
env = np.maximum(lfilter([1 - rel], [1, -rel], lvl), uniform_filter1d(lvl, int(0.01 * SR)))
duck = 1 - 0.5 * np.clip(env / 0.6, 0, 1)
mix = music * duck * 0.5 + sfx * 1.25 + wet

fade = np.ones(N)
fi = int(0.02 * SR)
fade[:fi] = np.linspace(0, 1, fi)
fo = int((data["duration"] - 1.2) * SR)
fade[fo:] = np.linspace(1, 0, N - fo) ** 2
mix *= fade

thr = 0.89
peak = maximum_filter1d(np.max(np.abs(mix), axis=0), int(0.004 * SR))
gain = np.minimum(1.0, thr / np.maximum(peak, 1e-9))
gain = -maximum_filter1d(-gain, int(0.01 * SR))
gain = uniform_filter1d(gain, int(0.008 * SR))
mix *= gain
mix = np.tanh(mix / 0.95) * 0.95
mix /= max(1e-9, np.max(np.abs(mix))) / 0.94
rms = np.sqrt(np.mean(mix**2))
print(f"duration {DUR:.1f}s  rms {20 * math.log10(rms):.1f} dBFS")
wavfile.write(ROOT / "out/soundtrack.wav", SR, (mix.T * 32767).astype(np.int16))
print("wrote out/soundtrack.wav")

# ---------------------------------------------------------------- beat envelope for the visuals
# The kick is buried in the bassline, so timing comes from the bar grid and strength from the measured low end:
# each beat pulses with the bass energy of that beat (breakdowns stay still, drops push hardest), downbeats a bit more.
RATE = 100
BEAT = BAR / 4
low = lp(hp(music.mean(axis=0), 40, 2), 200, 4)
beats = np.arange(0, DUR - BEAT, BEAT)
en = np.array([np.sqrt(np.mean(low[int(b * SR) : int((b + BEAT) * SR)] ** 2)) for b in beats])
lo_, hi_ = np.percentile(en, 15), np.percentile(en, 90)
score = np.clip((en - lo_) / (hi_ - lo_), 0, 1) ** 1.5 * np.where(np.arange(len(beats)) % 4 == 0, 1.0, 0.65)
frames = int(DUR * RATE)
tt = np.arange(frames) / RATE
kick = np.zeros(frames)
for b, sc in zip(beats, score):
    i = int(round(b * RATE))
    kick[i:] = np.maximum(kick[i:], sc * np.exp(-(tt[i:] - b) * 9))
print("beat strength per bar:", " ".join("".join(" .:-=#"[min(5, int(x * 5.99))] for x in score[i : i + 4]) for i in range(0, len(score), 4)))
(ROOT / "assets/music-env.json").write_text(json.dumps({"rate": RATE, "kick": [round(float(k), 3) for k in kick]}, separators=(",", ":")))
print(f"wrote assets/music-env.json ({frames} frames)")
