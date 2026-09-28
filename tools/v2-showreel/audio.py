"""Synthesize the showreel soundtrack from out/cues.json → out/soundtrack.wav.

Music: 120 BPM bed whose arrangement follows the scenes. SFX: one synth per cue kind.
Everything is deterministic (seeded noise).
"""

import json
import math
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import maximum_filter1d, uniform_filter1d
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).parent
SR = 48000
rng = np.random.default_rng(7)

data = json.loads((ROOT / "out/cues.json").read_text())
DUR = data["duration"] + 1.5
N = int(DUR * SR)
scenes = {s["name"]: (s["start"], s["end"]) for s in data["scenes"]}

BEAT = 0.5
BAR = 2.0
# Put a downbeat exactly where the intro hands over to Custom Widgets.
GRID0 = scenes["custom-widgets"][0] % BAR

music = np.zeros((2, N))
drums = np.zeros((2, N))
sfx = np.zeros((2, N))
send = np.zeros((2, N))  # reverb send


def t_arr(dur):
    return np.arange(int(dur * SR)) / SR


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100), "low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, min(hi, SR / 2 - 100)], "band", fs=SR, output="sos"), x)


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


def noise(dur):
    return rng.standard_normal(int(dur * SR))


def svf_sweep(x, f0, f1, q=2.0, curve="exp"):
    """Band-pass with a swept centre frequency (per-sample state-variable filter)."""
    n = len(x)
    u = np.linspace(0, 1, n)
    fc = f0 * (f1 / f0) ** u if curve == "exp" else f0 + (f1 - f0) * u
    g = np.tan(np.pi * np.clip(fc, 20, SR * 0.45) / SR)
    k = 1 / q
    out = np.empty(n)
    ic1 = ic2 = 0.0
    for i in range(n):
        gi = g[i]
        a1 = 1 / (1 + gi * (gi + k))
        v3 = x[i] - ic2
        v1 = a1 * ic1 + gi * a1 * v3
        v2 = ic2 + gi * v1
        ic1 = 2 * v1 - ic1
        ic2 = 2 * v2 - ic2
        out[i] = v1
    return out


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---------------------------------------------------------------- drums
def kick():
    t = t_arr(0.5)
    f = 46 + 110 * np.exp(-t * 30)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 6.5)
    click = hp(noise(0.5), 3000) * np.exp(-t * 400) * 0.25
    return np.tanh((body + click) * 1.6) * 0.9


def clap():
    t = t_arr(0.35)
    env = np.zeros_like(t)
    for d in (0, 0.011, 0.022):
        env += np.where(t >= d, np.exp(-(t - d) * (60 if d < 0.02 else 16)), 0)
    return bp(noise(0.35), 900, 3500) * env * 0.6


def hat(open_=False):
    t = t_arr(0.35 if open_ else 0.08)
    return hp(noise(len(t) / SR), 7500, 4) * np.exp(-t * (11 if open_ else 70)) * 0.35


KICK, CLAP, HAT, OHAT = kick(), clap(), hat(), hat(True)

# ---------------------------------------------------------------- arrangement
# Per-scene instrument levels.
ARR = {
    "intro": dict(kick=0, clap=0, hat=0, ohat=0, bass=0, pad=0.9, arp=0, cut=900),
    "custom-widgets": dict(kick=1, clap=0.9, hat=1, ohat=0, bass=1, pad=0.55, arp=0.8, cut=2400),
    "workshop": dict(kick=1, clap=1, hat=1, ohat=0.8, bass=1, pad=0.55, arp=1, cut=3000),
    "front-door": dict(kick=1, clap=0.6, hat=0.8, ohat=0.4, bass=1, pad=0.8, arp=0.5, cut=1600),
    "ntfy": dict(kick=0.55, clap=0, hat=0.55, ohat=0, bass=0.6, pad=0.7, arp=0.9, cut=2000),
    "assistant": dict(kick=0.8, clap=0.5, hat=0.7, ohat=0.3, bass=0.8, pad=0.7, arp=0.8, cut=2200),
    "board": dict(kick=1, clap=0.9, hat=1, ohat=0.5, bass=1, pad=0.5, arp=0.9, cut=2800),
    "advanced": dict(kick=1, clap=0.7, hat=1, ohat=0.3, bass=1, pad=0.5, arp=0.8, cut=2600),
    "rest": dict(kick=1, clap=1, hat=1, ohat=0.8, bass=1, pad=0.55, arp=1, cut=3200),
    "stats": dict(kick=1, clap=0.9, hat=1, ohat=1, bass=1, pad=0.8, arp=1, cut=3600),
    "outro": dict(kick=0, clap=0, hat=0, ohat=0, bass=0.7, pad=1, arp=0.6, cut=2600),
}


def level(name, t):
    """Smoothly crossfaded instrument level at global time t."""
    total = 0.0
    for sc, (a, b) in scenes.items():
        w = min(1, max(0, (t - a + 0.15) / 0.3)) * min(1, max(0, (b - t + 0.15) / 0.3))
        total += w * ARR[sc][name]
    return total


# Drums drop out just before big impacts (intro → CW, stats → outro).
def drum_gate(t):
    rs, re = scenes["stats"]
    if re - 1.1 < t < re:
        return 0.0
    os_, oe = scenes["outro"]
    # Half-time kick under the recap in the outro.
    return 1.0


# Chords: Am(add9) F(maj7) C(add9) G(6), two bars each.
CHORDS = [
    [57, 60, 64, 71],  # A C E B
    [53, 57, 60, 64],  # F A C E
    [48, 55, 60, 62],  # C G C D
    [55, 59, 62, 64],  # G B D E
]
ROOTS = [33, 29, 36, 31]


def chord_at(t):
    k = int(math.floor((t - GRID0) / (2 * BAR))) % 4
    return k


kick_times = []
nbeats = int(DUR / BEAT) + 2
for b in range(-4, nbeats):
    t = GRID0 + b * BEAT
    if t < 0 or t >= DUR - 1:
        continue
    beat_in_bar = b % 4
    g = drum_gate(t)
    kl = level("kick", t) * g
    os_, oe = scenes["outro"]
    if os_ + 3.5 < t < os_ + 9 and beat_in_bar in (0,):
        kl = 0.7
    if kl > 0.02:
        add(drums, KICK, t, 0.95 * kl)
        kick_times.append((t, kl))
    cl = level("clap", t) * g
    if cl > 0.02 and beat_in_bar in (1, 3):
        add(drums, CLAP, t, 0.55 * cl, 0.05)
        add(send, CLAP, t, 0.15 * cl)
    hl = level("hat", t) * g
    if hl > 0.02:
        add(drums, HAT, t + BEAT / 2, 0.5 * hl, 0.25)
        if hl > 0.9:
            add(drums, HAT, t + BEAT / 4, 0.18 * hl, -0.25)
            add(drums, HAT, t + 3 * BEAT / 4, 0.18 * hl, -0.25)
    ol = level("ohat", t) * g
    if ol > 0.02 and beat_in_bar in (1, 3):
        add(drums, OHAT, t + BEAT / 2, 0.3 * ol, 0.3)

# Sidechain envelope from kicks.
duck = np.ones(N)
for kt, kl in kick_times:
    i = int(kt * SR)
    n = min(int(0.35 * SR), N - i)
    if n <= 0:
        continue
    env = 1 - 0.65 * kl * np.exp(-np.arange(n) / SR / 0.11)
    duck[i : i + n] = np.minimum(duck[i : i + n], env)

# ---------------------------------------------------------------- pads
seg_len = 2 * BAR
k0 = int(math.floor((0 - GRID0) / seg_len))
k1 = int(math.ceil((DUR - GRID0) / seg_len))
for k in range(k0, k1):
    t0 = GRID0 + k * seg_len
    ci = k % 4
    L = seg_len + 1.2
    tt = t_arr(L)
    mid = t0 + seg_len / 2
    lvl = level("pad", max(0, mid))
    if lvl < 0.02:
        continue
    env = np.minimum(1, tt / 0.35) * np.clip((L - tt) / 1.0, 0, 1)
    sig = np.zeros((2, len(tt)))
    for m in CHORDS[ci] + [CHORDS[ci][0] + 12]:
        for v, det in enumerate((-0.12, -0.05, 0.0, 0.06, 0.13)):
            f = midi(m) * 2 ** (det / 12)
            ph = rng.uniform(0, 1)
            saw = 2 * ((tt * f + ph) % 1) - 1
            pan = (v - 2) / 2 * 0.8
            a = (pan + 1) * math.pi / 4
            sig[0] += saw * math.cos(a)
            sig[1] += saw * math.sin(a)
    cut = level("cut", max(0, mid))
    for c in range(2):
        sig[c] = lp(sig[c], cut, 2) * env * 0.035 * lvl
    add(music, sig[0], t0, 1, -1)
    add(music, sig[1], t0, 1, 1)
    add(send, (sig[0] + sig[1]) * 0.5, t0, 0.6)

# ---------------------------------------------------------------- bass (off-beat eighths)
for b in range(-4, nbeats):
    t = GRID0 + b * BEAT + BEAT / 2
    if t < 0 or t >= DUR - 1:
        continue
    lvl = level("bass", t) * (drum_gate(t) if level("kick", t) > 0.1 else 1)
    if lvl < 0.02:
        continue
    root = ROOTS[chord_at(t)]
    tt = t_arr(0.26)
    f = midi(root + 12)
    saw = 2 * ((tt * f) % 1) - 1
    sq = np.sign(np.sin(2 * np.pi * tt * f / 2))
    env = np.exp(-tt * 7) * np.clip((0.26 - tt) / 0.03, 0, 1)
    sig = lp(saw * 0.7 + sq * 0.3, 380 + 900 * np.exp(0), 2) * env
    sub = np.sin(2 * np.pi * tt * midi(root)) * env
    add(music, (sig * 0.5 + sub * 0.55) * 0.55 * lvl, t)

# Outro: sustained sub under the final chords.
os_, oe = scenes["outro"]
tt = t_arr(oe - os_ + 1)
env = np.minimum(1, tt / 0.1) * np.exp(-tt * 0.18)
add(music, np.sin(2 * np.pi * midi(33) * tt) * env * 0.35, os_)

# ---------------------------------------------------------------- arp (16ths)
PAT = [0, 2, 1, 3, 2, 4, 1, 3]
for s16 in range(-16, int(DUR / (BEAT / 4)) + 4):
    t = GRID0 + s16 * BEAT / 4
    if t < 0 or t >= DUR - 1:
        continue
    lvl = level("arp", t)
    if lvl < 0.02:
        continue
    notes = CHORDS[chord_at(t)] + [CHORDS[chord_at(t)][0] + 12]
    m = notes[PAT[s16 % 8]] + 12
    tt = t_arr(0.22)
    f = midi(m)
    tone = (2 * ((tt * f) % 1) - 1) * 0.5 + np.sin(2 * np.pi * f * tt)
    env = np.exp(-tt * 20)
    sig = lp(tone, 3200, 2) * env * 0.05 * lvl * (1.15 if s16 % 4 == 0 else 0.85)
    pan = 0.35 * math.sin(s16 * 0.7)
    add(music, sig, t, 1, pan)
    add(send, sig, t + 0.1875, 0.5, -pan)  # dotted-eighth echo into the reverb

# ---------------------------------------------------------------- SFX
PENTA = [0, 3, 5, 7, 10]


def sfx_hit():
    t = t_arr(1.6)
    thump = np.sin(2 * np.pi * np.cumsum(50 + 90 * np.exp(-t * 25)) / SR) * np.exp(-t * 5)
    crash = hp(noise(1.6), 3500) * np.exp(-t * 2.6) * 0.35
    return np.tanh(thump * 1.4) * 0.8 + crash


def sfx_boom():
    t = t_arr(3.0)
    f = 28 + 40 * np.exp(-t * 3)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 1.1)
    rumble = lp(noise(3.0), 180) * np.exp(-t * 1.6) * 0.8
    crash = hp(noise(3.0), 2500) * np.exp(-t * 1.3) * 0.25
    return np.tanh((sub + rumble) * 1.5) * 0.9 + crash


def sfx_whoosh(dur=0.9, lo=250, hi=3500):
    x = noise(dur)
    n = len(x)
    u = np.linspace(0, 1, n)
    up = svf_sweep(x[: n // 2 + 1], lo, hi, 1.6)
    dn = svf_sweep(x[n // 2 :], hi, lo * 2, 1.6)
    y = np.concatenate([up, dn])[:n]
    env = np.sin(np.pi * u) ** 1.6
    return y * env * 0.7


def sfx_riser(dur):
    dur = max(dur, 0.4)
    tt = t_arr(dur)
    u = tt / dur
    x = svf_sweep(noise(dur), 200, 7000, 3)
    f = 110 * 2 ** (u * 2)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    return (x * 0.8 + tone) * u**2.2 * 0.8


def sfx_click():
    t = t_arr(0.03)
    return (np.sin(2 * np.pi * 3200 * t) * 0.6 + hp(noise(0.03), 2000) * 0.5) * np.exp(-t * 260)


def sfx_pop(pitch=0):
    t = t_arr(0.12)
    k = 2 ** (pitch / 12)
    f = (320 + 700 * np.exp(-t * 60)) * k
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 32) * 0.7


def sfx_tick(pitch=0):
    t = t_arr(0.06)
    p = int(pitch)
    f = midi(81 + PENTA[p % 5] + 12 * (p // 5 % 2))
    return (np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)) * np.exp(-t * 70) * 0.35


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
    mod = np.sin(2 * np.pi * 37 * t) * 400
    f = 900 + mod + 1500 * (1 - t / dur)
    saw = 2 * ((np.cumsum(f) / SR) % 1) - 1
    crackle = hp(noise(dur), 4000) * (rng.random(len(t)) > 0.97)
    env = np.minimum(1, t / 0.01) * np.clip((dur - t) / (dur * 0.6), 0, 1)
    return (bp(saw, 500, 5000) * 0.5 + crackle * 0.6) * env * 0.35


def sfx_chime(pitch=0):
    t = t_arr(1.8)
    p = int(pitch)
    f0 = midi(76 + PENTA[p % 5] + 12 * (p // 5))
    y = np.zeros_like(t)
    for ratio, amp, dec in ((1, 1, 2.2), (2.0, 0.45, 3.2), (2.76, 0.3, 4.5), (5.4, 0.12, 7)):
        y += np.sin(2 * np.pi * f0 * ratio * t) * amp * np.exp(-t * dec)
    y2 = np.zeros_like(t)
    f1 = f0 * 2 ** (7 / 12)
    i = int(0.09 * SR)
    y2[i:] = (np.sin(2 * np.pi * f1 * t[: len(t) - i]) * np.exp(-t[: len(t) - i] * 2.4)) * 0.7
    return (y + y2) * 0.22


def sfx_buzz():
    t = t_arr(0.75)
    gate = ((t < 0.28) | ((t > 0.4) & (t < 0.68))).astype(float)
    gate = uniform_filter1d(gate, int(0.01 * SR))
    tone = np.tanh(np.sin(2 * np.pi * 165 * t) * 3) * 0.5 + lp(noise(0.75), 400) * 0.3
    return tone * gate * 0.45


def sfx_glitch():
    t = t_arr(0.25)
    x = noise(0.25)
    hold = np.repeat(x[:: 180], 180)[: len(t)]
    crushed = np.round(hold * 3) / 3
    gate = (np.sin(2 * np.pi * 24 * t) > 0).astype(float)
    return crushed * gate * np.exp(-t * 6) * 0.25


def sfx_stamp():
    t = t_arr(0.3)
    thump = np.sin(2 * np.pi * np.cumsum(70 + 80 * np.exp(-t * 40)) / SR) * np.exp(-t * 16)
    click = bp(noise(0.3), 1200, 5000) * np.exp(-t * 120) * 0.6
    return np.tanh((thump + click) * 1.5) * 0.7


def sfx_reverse(length=1.3):
    t = t_arr(length)
    u = t / length
    return hp(noise(length), 3000) * u**3.2 * 0.5


for c in data["cues"]:
    k = c["kind"]
    t = c["t"]
    g = c.get("gain", 1.0)
    p = c.get("pitch", 0) or 0
    pan = c.get("pan", 0) or 0
    d = c.get("dur", 0) or 0
    if k == "hit":
        s = sfx_hit()
        add(sfx, s, t, 0.8 * g, pan)
        add(send, s, t, 0.25 * g)
    elif k == "boom":
        add(sfx, sfx_boom(), t, 0.9 * g, pan)
        add(send, sfx_boom(), t, 0.2 * g)
    elif k == "whoosh":
        s = sfx_whoosh(0.9)
        add(sfx, s, t - 0.45, 0.45 * g, pan - 0.3)
        add(send, s, t - 0.45, 0.15 * g)
    elif k == "swish":
        add(sfx, sfx_whoosh(0.35, 800 * 2 ** (p / 24), 6000), t - 0.12, 0.35 * g, pan + 0.2)
    elif k == "riser":
        s = sfx_riser(d or 1.0)
        add(sfx, s, t, 0.5 * g, pan)
        add(send, s, t, 0.2 * g)
    elif k == "click":
        add(sfx, sfx_click(), t, 0.55 * g, pan)
    elif k == "pop":
        add(sfx, sfx_pop(p), t, 0.5 * g, pan)
    elif k == "tick":
        s = sfx_tick(p)
        add(sfx, s, t, 0.5 * g, pan + 0.15 * math.sin(p))
        add(send, s, t, 0.2 * g)
    elif k == "type":
        add(sfx, sfx_type(d or 0.5), t, 0.7 * g, pan)
    elif k == "zap":
        add(sfx, sfx_zap(d or 0.3), t, 0.55 * g, pan)
    elif k == "chime":
        s = sfx_chime(p)
        add(sfx, s, t, 0.7 * g, pan)
        add(send, s, t, 0.45 * g)
    elif k == "buzz":
        add(sfx, sfx_buzz(), t, 0.8 * g, pan)
    elif k == "glitch":
        add(sfx, sfx_glitch(), t, 0.7 * g, pan)
    elif k == "stamp":
        add(sfx, sfx_stamp(), t, 0.7 * g, pan)
    elif k == "key":
        add(sfx, sfx_key(p), t, 0.7 * g, pan)
    elif k == "reverse":
        L = 1.3
        add(sfx, sfx_reverse(L), t - L, 0.55 * g, pan)
    else:
        print("unknown cue", k)

# ---------------------------------------------------------------- mix
# Reverb: exponentially decaying stereo noise IR.
irt = t_arr(2.6)
ir = [lp(noise(2.6), 6000) * np.exp(-irt * 2.4) for _ in range(2)]
for x in ir:
    x /= np.sqrt(np.sum(x**2))
wet = np.stack([fftconvolve(send[c], ir[c])[:N] for c in range(2)]) * 0.55

music *= duck
bed = music + drums * 0.9
bed = np.stack([hp(bed[c], 30) for c in range(2)])
mix = bed * 0.8 + sfx * 0.9 + wet

# Fade in/out and gentle bus glue.
fade = np.ones(N)
fi = int(0.05 * SR)
fade[:fi] = np.linspace(0, 1, fi)
fo_start = int((data["duration"] - 0.8) * SR)
fade[fo_start:] = np.linspace(1, 0, N - fo_start) ** 2
mix *= fade

# Limiter: peak envelope with smoothed gain, then soft clip.
thr = 0.89
peak = maximum_filter1d(np.max(np.abs(mix), axis=0), int(0.004 * SR))
gain = np.minimum(1.0, thr / np.maximum(peak, 1e-9))
gain = -maximum_filter1d(-gain, int(0.01 * SR))
gain = uniform_filter1d(gain, int(0.008 * SR))
mix *= gain
pre = np.max(np.abs(mix))
mix = np.tanh(mix / 0.95) * 0.95
mix /= max(1e-9, np.max(np.abs(mix))) / 0.94

rms = np.sqrt(np.mean(mix**2))
print(f"duration {DUR:.1f}s  peak(before clip) {pre:.2f}  rms {20 * math.log10(rms):.1f} dBFS")
wavfile.write(ROOT / "out/soundtrack.wav", SR, (mix.T * 32767).astype(np.int16))
print("wrote out/soundtrack.wav")
