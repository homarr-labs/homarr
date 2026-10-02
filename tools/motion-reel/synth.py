"""Procedural instruments and effects for the reel soundtrack (128 BPM). score.py arranges them."""
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
BPM = 128
BEAT = 60 / BPM
BAR = 4 * BEAT
E8 = BEAT / 2
S16 = BEAT / 4
rng = np.random.default_rng(7)

def tt(d):
    return np.arange(int(d * SR)) / SR


def noise(d):
    return rng.standard_normal(int(d * SR))


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}


def nf(name):  # 'A4' -> Hz
    return mtof(12 * (int(name[-1]) + 1) + NOTE[name[:-1]])


def sos(kind, f, order=2):
    return signal.butter(order, f, kind, fs=SR, output='sos')


def lp(x, f, order=2):
    return signal.sosfilt(sos('low', f, order), x, axis=0)


def hp(x, f, order=2):
    return signal.sosfilt(sos('high', f, order), x, axis=0)


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], 'band', fs=SR, output='sos'), x, axis=0)


def tv_biquad(x, fc, q=1.0, kind='bp', block=64):
    """Time-varying RBJ biquad; fc is an array (Hz) the length of x."""
    y = np.zeros_like(x)
    zi = np.zeros(2)
    for i in range(0, len(x), block):
        f = float(np.clip(fc[min(i + block // 2, len(fc) - 1)], 20, SR * 0.45))
        w0 = 2 * np.pi * f / SR
        al = np.sin(w0) / (2 * q)
        c = np.cos(w0)
        if kind == 'bp':
            b = [al, 0, -al]
        elif kind == 'lp':
            b = [(1 - c) / 2, 1 - c, (1 - c) / 2]
        else:
            b = [(1 + c) / 2, -(1 + c), (1 + c) / 2]
        a = [1 + al, -2 * c, 1 - al]
        y[i:i + block], zi = signal.lfilter(np.array(b) / a[0], np.array(a) / a[0], x[i:i + block], zi=zi)
    return y


def saw(freq, d, maxh=40, phase=0.0):
    t = tt(d)
    out = np.zeros_like(t)
    K = int(min(maxh, (SR / 2 - 200) // freq))
    for k in range(1, K + 1):
        out += np.sin(2 * np.pi * k * freq * t + phase * k) / k
    return out * (2 / np.pi)


def adsr(d, a=0.005, r=0.05, tau=None):
    t = tt(d)
    e = np.minimum(1, t / max(a, 1e-4))
    if tau:
        e = e * np.exp(-t / tau)
    rel = np.clip((d - t) / r, 0, 1)
    return e * rel


# ─────────────────────────── instruments ───────────────────────────
def kick(d=0.45):
    t = tt(d)
    f = 46 + (190 - 46) * np.exp(-t / 0.026)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.26)
    ck = hp(noise(0.012), 2500) * np.exp(-tt(0.012) / 0.0025) * 0.5
    body[:len(ck)] += ck
    return np.tanh(body * 1.8) * 0.85


def clap(d=0.4):
    t = tt(d)
    n = bp(noise(d), 900, 3200)
    env = np.zeros_like(t)
    for o in (0, 0.010, 0.021):
        env += np.where(t >= o, np.exp(-(t - o) / 0.007), 0)
    env += np.where(t >= 0.028, np.exp(-(t - 0.028) / 0.11), 0) * 0.7
    return n * env * 0.45


def snare(d=0.25):
    t = tt(d)
    tone = np.sin(2 * np.pi * (190 + 60 * np.exp(-t / 0.02)) * t) * np.exp(-t / 0.06)
    n = bp(noise(d), 1500, 9000) * np.exp(-t / 0.09)
    return (tone * 0.5 + n * 0.6) * 0.6


def hat(d=0.08, open_=False):
    n = hp(noise(d), 7500, 4)
    return n * np.exp(-tt(d) / (0.11 if open_ else 0.02)) * 0.22


def bass(freq, d):
    t = tt(d)
    s = saw(freq, d, 24) * 0.55 + np.sin(2 * np.pi * freq * t) * 0.9
    s = lp(s, 420)
    return np.tanh(s * adsr(d, 0.004, 0.03, 0.5) * 1.4) * 0.7


def pad(freqs, d, cutoff=1700, a=0.12, r=0.35):
    L = np.zeros(int(d * SR))
    R = np.zeros(int(d * SR))
    for f in freqs:
        for k, det in enumerate((-9, -3, 4, 10)):
            s = saw(f * 2 ** (det / 1200), d, 30, phase=rng.uniform(0, 6))
            (L if k % 2 == 0 else R)[:] += s
    st = np.stack([L, R], 1) / (len(freqs) * 2)
    st = lp(st, cutoff)
    return st * adsr(d, a, r)[:, None]


def pluck(freq, d=0.5, bright=1.0):
    t = tt(d)
    out = np.zeros_like(t)
    K = int(min(16, (SR / 2 - 500) // freq))
    for k in range(1, K + 1):
        out += np.sin(2 * np.pi * k * freq * t) / k * np.exp(-t * (4 + k * 7 / bright))
    return out * np.minimum(1, t / 0.002) * 0.5


def bell(freq, d=1.2):
    t = tt(d)
    out = sum(a * np.sin(2 * np.pi * freq * r * t) * np.exp(-t / dcy) for r, a, dcy in
              ((1, 1, 0.9), (2.0, 0.45, 0.5), (3.01, 0.25, 0.3), (4.2, 0.15, 0.18), (5.43, 0.08, 0.1)))
    return out * np.minimum(1, t / 0.002) * 0.35


def impact(d=2.2, big=1.0):
    t = tt(d)
    f = 28 + (95 - 28) * np.exp(-t / 0.22)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.55 * big))
    nz = lp(noise(d), 2200) * np.exp(-t / 0.22) * 0.55
    crack = hp(noise(d), 2500) * np.exp(-t / 0.045) * 0.5
    return np.tanh((boom * 1.3 + nz + crack) * 1.4) * 0.9


def crash(d=1.6):
    t = tt(d)
    n = lp(hp(noise(d), 4500, 3), 12000) * np.exp(-t / 0.42)
    n2 = lp(hp(noise(d), 4500, 3), 12000) * np.exp(-t / 0.42)
    return np.stack([n, n2], 1) * 0.11


def whoosh(d, f0, f1, q=1.4, curve=2.0, pan0=0.0, pan1=0.0, peak=0.5):
    t = tt(d)
    x = t / d
    fc = f0 * (f1 / f0) ** x
    n = tv_biquad(noise(d), fc, q, 'bp')
    env = np.where(x < peak, (x / peak) ** curve, ((1 - x) / (1 - peak)) ** 1.5)
    s = n * env
    pan = pan0 + (pan1 - pan0) * x
    th = (pan + 1) * np.pi / 4
    return np.stack([s * np.cos(th), s * np.sin(th)], 1) * np.sqrt(2) * 0.9


def riser(d, f0=250, f1=2400):
    t = tt(d)
    x = t / d
    fc = f0 * (f1 / f0) ** x
    n = tv_biquad(noise(d), fc * 3, 2.5, 'bp')
    tone = np.sin(2 * np.pi * np.cumsum(fc) / SR) * 0.25
    env = x ** 2.2
    return (n * 0.7 + tone) * env


def revcym(d):
    x = tt(d) / d
    n = hp(noise(d), 3500, 3)
    return np.stack([n, hp(noise(d), 3500, 3)], 1) * (x ** 3)[:, None] * 0.35


def click(freq=3200, d=0.03, tau=0.005):
    t = tt(d)
    return (np.sin(2 * np.pi * freq * t) * np.exp(-t / tau) + hp(noise(d), 4000) * np.exp(-t / 0.0015) * 0.4) * 0.6


def pop(f0=380, f1=950, d=0.12):
    t = tt(d)
    f = f0 + (f1 - f0) * (1 - np.exp(-t / 0.02))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.04) * 0.6


def thud(d=0.3):
    t = tt(d)
    f = 55 + 110 * np.exp(-t / 0.03)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.09) + lp(noise(d), 900) * np.exp(-t / 0.03) * 0.3) * 0.8


def glide(f0, f1, d):
    t = tt(d)
    f = f0 * (f1 / f0) ** (t / d)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * adsr(d, 0.02, 0.1) * 0.3


