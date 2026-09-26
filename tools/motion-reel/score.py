"""Soundtrack for the time-remapped cuts.

Music is written on the output beat grid; every SFX is authored in reel time (the choreography in
reel.js) and placed through the warp, so it stays glued to its on-screen event.
Usage: python3 score.py global|v2cut  ->  soundtrack-<version>.wav
The v2 cut starts on a black pre-roll that rises into the "Now in v2" impact.
"""
import json
import sys

import numpy as np
from scipy import signal
from scipy.io import wavfile

from synth import (BAR, BEAT, E8, S16, SR, adsr, bass, bell, clap, click, crash, glide, hat, hp, impact, kick, lp, mtof,
                   nf, noise, pad, pluck, pop, revcym, riser, snare, thud, tt, tv_biquad, whoosh)

VERSION = sys.argv[1] if len(sys.argv) > 1 else 'global'
W = json.load(open(f'warp-{VERSION}.json'))
PRE = W.get('pre', 0.0)
TT = np.array(W['t'][int(round(PRE / W['du'])):])
UU = PRE + np.arange(len(TT)) * W['du']
DUR = W['duration']
N = int(round(DUR * SR))
SB = {s['name'].split()[0]: int(round((s['u0'] - PRE) / BEAT)) for s in W['shots']}  # shot start beats
HAS_A = 'S1' in SB  # the global cut opens with the original reel
U = lambda t: float(np.interp(t, TT, UU))    # reel time -> output time
D = lambda t, d: max(0.02, U(t + d) - U(t))  # output length of a reel-time span
bt = lambda b: PRE + b * BEAT                # output beat -> seconds
IMP, SLAM = 2 * BEAT, 7 * BAR + 2 * BEAT
R = np.random.default_rng(42)
seg = lambda t, a, b: min(1.0, max(0.0, (t - a) / (b - a)))
out_cubic = lambda x: 1 - (1 - x) ** 3
out_quint = lambda x: 1 - (1 - x) ** 5

music = np.zeros((N, 2))
sfx = np.zeros((N, 2))
verb = np.zeros((N, 2))
kicks = []


def place(dst, sig, u, gain=1.0, pan=0.0, send=0.0):
    if sig.ndim == 1:
        th = (pan + 1) * np.pi / 4
        sig = np.stack([sig * np.cos(th), sig * np.sin(th)], 1) * np.sqrt(2)
    st = sig * gain
    i = int(round(u * SR))
    if i < 0:
        st, i = st[-i:], 0
    n = min(len(st), N - i)
    if n <= 0:
        return
    dst[i:i + n] += st[:n]
    if send:
        verb[i:i + n] += st[:n] * send


def fx(sig, t, g=1.0, pan=0.0, send=0.0):
    """SFX at reel time t; events before the cut's first shot are dropped."""
    if t >= TT[0] - 1e-9:
        place(sfx, sig, U(t), g, pan, send)


def groove(b0, b1, chords, no_kick=(), hats16=False, lead=None):
    """Four-on-the-floor from beat b0 to b1; chords maps a beat to (notes, root), lead maps a beat to 4 notes or None."""
    for b in range(b0, b1):
        t = bt(b)
        if b not in no_kick:
            place(music, kick(), t, 0.95)
            kicks.append(t)
            if (b - b0) % 2 == 1:
                place(music, clap(), t, 0.55, send=0.25)
        place(music, hat(), t + E8, 0.55, pan=0.25)
        if hats16:
            place(music, hat(), t + S16, 0.2, pan=-0.2)
            place(music, hat(), t + 3 * S16, 0.28, pan=-0.3)
        notes, root = chords(b)
        if b not in no_kick:
            place(music, bass(nf(root), E8 * 0.9), t + E8, 0.6)
            place(music, bass(nf(root) * 2, S16 * 0.8), t + E8 + S16, 0.25)
        if lead and lead(b):
            for i in range(4):
                place(music, pluck(nf(lead(b)[i]), 0.3, 1.0), t + i * S16, 0.1 if i == 0 else 0.065, pan=0.4 * np.sin((b * 4 + i) * 1.3), send=0.3)
    # pads: one per chord span
    b = b0
    while b < b1:
        notes, root = chords(b)
        e = b + 1
        while e < b1 and chords(e) == (notes, root):
            e += 1
        place(music, pad([nf(n) for n in notes], bt(e) - bt(b), 1700), bt(b), 0.5)
        b = e


# ─────────────────────────── MUSIC ───────────────────────────
S8, S9, FA, FB, S12, S16_ = SB['S8'], SB['S9'], SB['FDA'], SB['FDB'], SB['S12'], SB['S16']
if HAS_A:
    S2, S5, S6 = SB['S2'], SB['S5'], SB['S6']
    # intro: drone + stroke sparkles, riser into the logo impact
    place(music, (np.sin(2 * np.pi * 55 * tt(U(IMP) + 0.1)) * 0.6 + lp(np.sin(2 * np.pi * 110 * tt(U(IMP) + 0.1)), 260) * 0.3) * adsr(U(IMP) + 0.1, 0.4, 0.08), 0, 0.35)
    for i, n in enumerate(['A4', 'C5', 'E5', 'G5', 'A5', 'C6']):
        place(music, pluck(nf(n), 0.7, 1.4), U(0.234 + i * S16), 0.16, pan=-0.5 + i * 0.2, send=0.5)
    place(music, pad([nf(n) for n in ['A2', 'E3', 'A3', 'C4', 'E4']], bt(S2) - U(IMP), 1400, a=0.3), U(IMP), 0.35, send=0.4)
    A_CH = [(['A3', 'C4', 'E4', 'G4'], 'A1'), (['F3', 'A3', 'C4', 'E4'], 'F1'), (['E3', 'G3', 'C4', 'B3'], 'C2'), (['D3', 'G3', 'B3', 'E4'], 'G1')]
    chA = lambda b: A_CH[((b - S2) // 4) % 4]
    groove(S2, S8, chA, no_kick={S6 - 1, S8 - 1})
    for b in range(S5, S8):  # 16th hats from the live-data shot on
        place(music, hat(), bt(b) + S16, 0.2, pan=-0.2)
        place(music, hat(), bt(b) + 3 * S16, 0.28, pan=-0.3)
    for i, n in enumerate(['A4', 'C5', 'E5', 'G5', 'A5', 'C6', 'E6', 'G6']):  # one pluck per service card
        place(music, pluck(nf(n), 0.4, 1.2), bt(S2 + i), 0.3, pan=(-0.4 if i % 2 else 0.4), send=0.3)
    for b in range(S6, S8):  # sparkle arp over the ring and the features grid
        arp = ['A5', 'E5', 'C6', 'E5'] if chA(b)[1] in ('A1', 'C2') else ['A5', 'F5', 'C6', 'F5']
        for i in range(4):
            place(music, pluck(nf(arp[i]), 0.25, 0.8), bt(b) + i * S16, 0.08, pan=0.5 * np.sin(b * 4 + i), send=0.3)
else:
    # pre-roll: sub swell and reversed cymbal into the impact
    place(music, np.sin(2 * np.pi * 55 * tt(PRE)) * np.linspace(0, 1, len(tt(PRE))) ** 2, 0, 0.3)
    place(sfx, riser(PRE, 180, 2600), 0, 0.5)
    place(sfx, revcym(PRE), 0, 0.9)
    place(sfx, whoosh(PRE, 300, 4000, 1.6, 2.5, 0, 0, 0.97), 0, 0.5)

# "Now in v2": groove drops out, held chord, slam on the beat
place(music, pad([nf(n) for n in ['A2', 'E3', 'A3', 'B3', 'C4', 'E4', 'G4']], bt(S9) - bt(S8) + 0.1, 2400, a=0.01, r=0.3), bt(S8), 0.6, send=0.5)
place(music, bass(nf('A1'), 1.2), bt(S8), 0.9)
place(music, kick(), U(SLAM), 1.0)
kicks.append(U(SLAM))
place(music, clap(), U(SLAM), 0.7, send=0.4)
place(music, bass(nf('A1'), 1.0), U(SLAM), 0.9)
for i, n in enumerate(['E5', 'A5', 'B5', 'E6']):
    place(music, pluck(nf(n), 0.5, 1.2), U(SLAM) + 0.15 + i * S16, 0.14, pan=-0.4 + i * 0.25, send=0.5)
# v2 groove, lined up backwards so the bar before the end card is E7; the endpoint diagram drops the lead
B_CYC = [(['F3', 'A3', 'C4', 'E4'], 'F1'), (['D3', 'G3', 'B3', 'E4'], 'G1'), (['A3', 'C4', 'E4', 'G4'], 'A1'), (['E3', 'G3', 'C4', 'B3'], 'C2'),
         (['F3', 'A3', 'C4', 'E4'], 'F1'), (['D3', 'G3', 'B3', 'E4'], 'G1'), (['A3', 'C4', 'E4', 'G4'], 'A1'), (['E3', 'G#3', 'B3', 'D4'], 'E1')]
LEADS = {'F1': ['C6', 'A5', 'F5', 'A5'], 'G1': ['B5', 'G5', 'D5', 'G5'], 'A1': ['C6', 'A5', 'E5', 'A5'], 'C2': ['B5', 'G5', 'E5', 'G5'], 'E1': ['B5', 'G#5', 'E5', 'D6']}
chB = lambda b: B_CYC[(7 - (S16_ - 1 - b) // 4) % 8]
groove(S9, S16_, chB, no_kick={S16_ - 1}, hats16=True, lead=lambda b: None if FA <= b < FB else LEADS[chB(b)[1]])
for i in range(8):  # fill into the end card
    place(music, snare(), bt(S16_ - 1) + i * BEAT / 8, 0.2 + 0.4 * i / 7, send=0.2)
# the front door gets a bell counter-melody on top
for b in range(FA, S12):
    if (b - FA) % 2 == 0:
        n = {'F1': 'A6', 'G1': 'B6', 'A1': 'C7', 'C2': 'G6', 'E1': 'G#6'}[chB(b)[1]]
        place(music, bell(nf(n), 0.9), bt(b), 0.1, pan=0.3 * np.sin(b), send=0.5)
# end card: resolve to A major
fin_len = DUR - bt(S16_)
place(music, pad([nf(n) for n in ['A2', 'E3', 'A3', 'C#4', 'E4', 'B4']], fin_len, 2800, a=0.01, r=0.8), bt(S16_), 0.8, send=0.5)
place(music, bass(nf('A1'), fin_len) * adsr(fin_len, 0.004, 0.8), bt(S16_), 0.9)
kicks.append(bt(S16_))
place(music, kick(), bt(S16_), 1.0)
for i, n in enumerate(['A5', 'C#6', 'E6', 'A6']):
    place(music, bell(nf(n), 1.2), U(19 * BAR + 0.78 + i * 0.07), 0.3, pan=-0.3 + i * 0.2, send=0.6)

# sidechain pump
sc = np.ones(N)
for kt in kicks:
    i = int(kt * SR)
    n = min(int(0.3 * SR), N - i)
    if n > 0:
        sc[i:i + n] = np.minimum(sc[i:i + n], 1 - 0.55 * np.exp(-np.arange(n) / SR / 0.09))
kick_bus = np.zeros((N, 2))
for kt in kicks:
    place(kick_bus, kick(), kt, 0.95)
music = (music - kick_bus) * sc[:, None] + kick_bus
if HAS_A:  # rack-focus low-pass (live-data headline), opening again as a build into the ring
    a, b = int(U(8.3) * SR), int(U(5 * BAR) * SR)
    fc = np.array([20000 * (650 / 20000) ** (out_cubic(seg(t, 8.36, 8.62)) * (1 - seg(t, 8.9, 9.36) ** 2)) for t in np.interp(np.arange(a, b) / SR, UU, TT)])
    for ch in range(2):
        music[a:b, ch] = tv_biquad(music[a:b, ch], fc, 0.8, 'lp', 128)

# ─────────────────────────── SFX, original reel (reel-time authored) ───────────────────────────
fx(click(1800, 0.05, 0.01), 0.0, 0.4)
fx(whoosh(D(0, 0.5), 600, 6000, 1.2, 1.4, -0.4, 0.4, 0.55), 0.0, 0.45)
fx(riser(D(0.1, IMP - 0.1), 200, 2000), 0.1, 0.35)
fx(impact(2.4, 1.2), IMP, 1.0, send=0.35)
fx(crash(1.6), IMP, 1.0, send=0.3)
for i in range(6):
    fx(click(2400 + i * 260, 0.03, 0.004), 1.0 + i * 0.045, 0.22, pan=-0.5 + i * 0.2)
fx(bell(nf('E6'), 0.8), 1.22, 0.12, send=0.5)
fx(revcym(D(1.52, BAR - 1.52)), 1.52, 0.9)
fx(whoosh(D(1.52, BAR - 1.52), 300, 4000, 1.6, 2.5, 0, 0, 0.97), 1.52, 0.7)
for i in range(8):
    fx(whoosh(0.14, 3000, 900, 1.5, 1.0, 0.6 * (-1) ** i, -0.6 * (-1) ** i, 0.15), BAR + i * E8 - 0.012, 0.25)
# one place: burst, tile rain, morph
fx(impact(1.6, 0.8), 2 * BAR, 0.7, send=0.3)
fx(whoosh(0.5, 5000, 400, 1.0, 1.0, 0, 0, 0.08), 2 * BAR, 0.6)
for k in range(87):
    fx(click(R.uniform(2600, 5200), 0.02, 0.003), 2 * BAR + 0.56 + R.uniform(0, 0.24) + R.uniform(-0.02, 0.02), 0.07, pan=R.uniform(-0.8, 0.8))
fx(whoosh(D(4.0, 0.35), 800, 3000, 1.4, 1.0, -0.3, 0.3, 0.6), 4.0, 0.25)
fx(revcym(D(4.45, 0.45)), 4.45, 0.5)
for k in range(7):
    fx(pop(300 + k * 40, 800 + k * 60, 0.1), 5.0 + k * 0.045, 0.16, pan=-0.6 + k * 0.2)
# drag & drop
fx(click(3000, 0.04, 0.006), 5.64, 0.45)
fx(whoosh(D(5.70, 0.38), 500, 1800, 1.3, 1.2, -0.5, 0.5, 0.5), 5.70, 0.3)
fx(thud(), 6.094, 0.55)
fx(click(2200, 0.04, 0.006), 6.094, 0.35)
fx(click(3000, 0.04, 0.006), 6.50, 0.45, pan=0.3)
fx(glide(900, 500, D(6.563, 0.39)), 6.563, 0.35, pan=0.3)
fx(click(2200, 0.04, 0.006), 6.95, 0.35, pan=0.3)
fx(pop(350, 1100, 0.15), 7.031, 0.5, pan=0.4)
fx(glide(300, 1400, D(7.08, 0.38)), 7.08, 0.28, pan=0.4)
fx(bell(nf('E6'), 0.7), 7.12, 0.22, pan=0.4, send=0.4)
fx(bell(nf('A6'), 0.7), 7.19, 0.22, pan=0.4, send=0.4)
fx(whoosh(D(7.26, 0.24), 400, 5000, 1.2, 2.2, 0, 0, 0.9), 7.26, 0.6)
# live data
for i, p in enumerate((-0.7, 0.7, -0.7, 0.7)):
    fx(whoosh(D(7.5 + i * 0.117, 0.22), 4000, 800, 1.4, 1.0, p, p * 0.3, 0.2), 7.5 + i * 0.117, 0.3)
fx(impact(1.0, 0.5) * 0.6, 8.42, 0.45, send=0.4)
fx(impact(1.0, 0.5) * 0.6, 8.62, 0.45, send=0.4)
if HAS_A:
    for i in range(12):  # snare roll in the last output beat before the ring
        place(sfx, snare(), bt(S6 - 1) + i * BEAT / 12, 0.2 + 0.45 * i / 11, send=0.2)
    place(sfx, riser(BEAT * 1.5, 400, 3000), bt(S6) - BEAT * 1.5, 0.7)
# ring
fx(impact(1.8, 1.0), 5 * BAR, 0.85, send=0.35)
fx(crash(1.6), 5 * BAR, 0.9, send=0.3)
prev = 0
for i in range(1, 4000):
    t = 5 * BAR + i / 4000 * 1.0
    v = int(87 * out_quint(seg(t, 5 * BAR + 0.06, 5 * BAR + 0.95)))
    if v != prev:
        fx(click(3800 + v * 12, 0.02, 0.0025), t, 0.1, pan=0.3 * np.sin(v))
        prev = v
fx(bell(nf('A5'), 0.8), 5 * BAR + 1.0, 0.18, send=0.5)
fx(whoosh(D(10.95, 0.5), 300, 5500, 1.1, 1.6, 0.9, -0.9, 0.5), 10.95, 1.0)
# features bento
for k, a0 in enumerate((11.2, 11.32, 11.6, 11.72, 12.0)):
    fx(thud(0.2), a0 + 0.02, 0.28, pan=[-0.4, 0.4, 0.1, 0.6, 0][k])
    fx(pop(260, 700, 0.1), a0 + 0.02, 0.12, pan=[-0.4, 0.4, 0.1, 0.6, 0][k])
fx(click(5200, 0.03, 0.003), 11.62, 0.4, pan=-0.5)
fx(click(4200, 0.02, 0.003), 11.635, 0.3, pan=-0.5)
for i in range(3):
    fx(pop(500, 1300, 0.08), 11.4 + i * 0.07, 0.12, pan=-0.5)
for i in range(2):
    fx(click(2600, 0.03, 0.004), 11.85 + i * 0.12, 0.3, pan=-0.5)
prev = 0
for i in range(1, 6000):
    t = 11.38 + i / 6000 * 1.37
    r = int(round(19 * out_cubic(seg(t, 11.38, 12.75))))
    if r != prev:
        fx(click(3300, 0.02, 0.003), t, 0.14, pan=0.2)
        prev = r
for i in range(5):
    fx(click(R.uniform(1800, 2600), 0.02, 0.003), 11.86 + i * 0.07, 0.25, pan=0.6)
for i in range(0, 45, 2):
    fx(click(R.uniform(1600, 2800), 0.015, 0.002), 12.12 + i * 0.0105, 0.16, pan=-0.2)
fx(bell(nf('C6'), 0.6), 12.66, 0.2, send=0.4)
fx(bell(nf('G6'), 0.6), 12.72, 0.16, send=0.4)
fx(revcym(D(7 * BAR - 0.5, 0.5)), 7 * BAR - 0.5, 1.0)
fx(whoosh(D(12.88, 0.3), 5000, 300, 1.3, 1.0, 0, 0, 0.8), 12.88, 0.45)

# ─────────────────────────── SFX, v2 ───────────────────────────
fx(impact(2.4, 1.4), 7 * BAR, 1.0, send=0.4)
fx(crash(1.9), 7 * BAR, 1.1, send=0.4)
fx(whoosh(D(7 * BAR, 1.0), 3000, 250, 1.2, 1.2, -0.6, 0.6, 0.25), 7 * BAR, 0.5)
for c in (7 * BAR + 0.55, SLAM, SLAM + 0.5):
    clk = click(1500, 0.06, 0.012)
    clk[int(0.03 * SR):] += click(1100, 0.06, 0.012)[:len(clk) - int(0.03 * SR)]
    fx(clk, c + 0.28, 0.45, pan=-0.3)
for i in range(6):
    fx(click(2600 + i * 200, 0.03, 0.004), 13.92 + i * 0.04, 0.14, pan=0.2 + i * 0.1)
fx(impact(1.8, 1.0), SLAM, 0.9, send=0.4)
fx(whoosh(D(SLAM - 0.02, 0.35), 6000, 500, 1.2, 1.0, 0, 0, 0.1), SLAM - 0.02, 0.5)
fx(riser(D(14.35, 0.45), 300, 3000), 14.35, 0.35)
# transitions: vertical whips, slab wipes, horizontal whip
for c in (14.8, 13 * BAR - 0.2):
    fx(whoosh(D(c, 0.4), 300, 5000, 1.1, 1.6, 0, 0, 0.5), c, 0.8)
for c, d in ((9 * BAR, 1), (10 * BAR, -1), (15 * BAR, 1), (16 * BAR, -1), (18 * BAR, 1)):
    fx(whoosh(D(c - 0.225, 0.45), 700, 5000, 1.2, 1.4, -0.7 * d, 0.7 * d, 0.5), c - 0.225, 0.55)
fx(whoosh(D(11 * BAR - 0.12, 0.42), 300, 5500, 1.1, 1.6, 0.8, -0.8, 0.5), 11 * BAR - 0.12, 0.8)
# custom widgets
T = 8 * BAR
LT = lambda i: T + 0.1 + i * 0.086
for i in range(13):
    for j in range(3):
        fx(click(R.uniform(1800, 2600), 0.015, 0.002), LT(i) + j * 0.026, 0.09, pan=-0.4)
fx(pop(380, 950, 0.1), LT(2) + 0.06, 0.2, pan=0.4)
fx(pop(500, 1200, 0.08), LT(3) + 0.06, 0.14, pan=0.5)
for i in range(4):
    fx(pop(300 + i * 60, 800 + i * 90, 0.09), LT(8) + 0.05 + i * 0.07, 0.15, pan=0.4)
fx(glide(400, 900, D(LT(11) + 0.08, 0.5)), LT(11) + 0.08, 0.15, pan=0.4)
# workshop
T = 9 * BAR
for i in range(21):
    fx(click(R.uniform(2800, 4200), 0.02, 0.003), T + 0.14 + i * 0.025, 0.05, pan=0.5)
fx(pop(250, 700, 0.14), T + 0.62, 0.25, pan=0.4)
fx(click(3000, 0.04, 0.006), T + 1.02, 0.45, pan=0.4)
fx(bell(nf('E6'), 0.6), T + 1.07, 0.2, pan=0.4, send=0.4)
fx(bell(nf('B6'), 0.6), T + 1.14, 0.18, pan=0.4, send=0.4)
fx(click(4200, 0.02, 0.003), T + 1.27, 0.2, pan=0.4)
# assistant
T = 10 * BAR
CLICK = T + 1.0
for i in range(0, 33, 2):
    fx(click(R.uniform(1800, 2800), 0.015, 0.002), T + 0.08 + i * 0.0125, 0.1, pan=0.5)
for a0, b0 in ((T + 0.5, T + 0.64), (T + 0.62, T + 0.76), (CLICK + 0.1, CLICK + 0.22)):
    fx(pop(400, 900, 0.08), a0, 0.12, pan=0.4)
    fx(bell(nf('A6'), 0.4), b0, 0.1, pan=0.4, send=0.3)
fx(pop(260, 720, 0.14), T + 0.74, 0.22, pan=0.4)
fx(click(3000, 0.04, 0.006), CLICK, 0.45, pan=0.4)
fx(bell(nf('E6'), 0.7), CLICK + 0.04, 0.2, pan=0.4, send=0.4)
fx(bell(nf('A6'), 0.7), CLICK + 0.11, 0.18, pan=0.4, send=0.4)
fx(pop(300, 850, 0.12), CLICK + 0.33, 0.2, pan=0.3)
# front door, diagram: request in, auth checks, secret from the vault, service hit, response back
T = 11 * BAR
O = lambda x: T + x
fx(pop(300, 800, 0.12), O(0.24), 0.3, pan=0.4)
fx(click(2600, 0.03, 0.004), O(0.24), 0.25, pan=0.4)
for k, a0 in enumerate((0.44, 0.5, 0.52, 0.6)):
    fx(thud(0.2), O(a0) + 0.02, 0.22, pan=[-0.6, -0.6, 0, 0.6][k])
for i in range(5):
    fx(click(3200 + i * 200, 0.02, 0.003), O(0.7 + i * 0.03), 0.12, pan=[-0.2, 0.2, 0.6, -0.6, -0.6][i])
FLOWS = [  # appear, go, checks, token, go to service, hit, back, gain
    (0.95, (1.0, 1.35), (1.42, 1.5, 1.58), (1.6, 1.8), (1.84, 2.12), 2.12, (2.22, 2.64), 1.0),
    (2.72, (2.74, 2.96), (2.97,), (2.97, 3.09), (3.1, 3.26), 3.26, (3.3, 3.52), 0.75),
]
for appear, go, checks, tok, go2, hit, back, g in FLOWS:
    fx(pop(500, 1300, 0.08), O(appear), 0.22 * g, pan=-0.6)
    fx(whoosh(D(O(go[0]), go[1] - go[0]), 900, 2600, 1.2, 1.2, -0.6, 0, 0.5), O(go[0]), 0.3 * g)
    for k, c in enumerate(checks):
        fx(bell(mtof(81 + [0, 4, 7][k]), 0.4), O(c), 0.12, pan=0.05, send=0.3)
    fx(glide(500, 1300, D(O(tok[0]), tok[1] - tok[0])), O(tok[0]), 0.2 * g)
    fx(click(1800, 0.05, 0.008), O(tok[1]), 0.4 * g)
    fx(whoosh(D(O(go2[0]), go2[1] - go2[0]), 900, 3200, 1.2, 1.2, 0, 0.7, 0.5), O(go2[0]), 0.3 * g)
    fx(thud(0.25), O(hit), 0.35 * g, pan=0.7)
    fx(pop(300, 900, 0.1), O(hit) + 0.06, 0.2 * g, pan=0.7)
    fx(whoosh(D(O(back[0]), back[1] - back[0]), 2600, 800, 1.2, 1.2, 0.7, -0.6, 0.5), O(back[0]), 0.3 * g)
    fx(bell(nf('E6'), 0.6), O(back[1]), 0.18 * g, pan=-0.6, send=0.4)
    fx(bell(nf('A6'), 0.6), O(back[1]) + 0.05, 0.15 * g, pan=-0.6, send=0.4)
for i, a0 in enumerate((0.95, 1.32, 1.6, 1.84, 2.22)):  # numbered steps light up
    fx(click(2000 + i * 250, 0.03, 0.004), O(a0), 0.15, pan=-0.8 + i * 0.4)
# front door, live: prompt, tool calls, results table, phone pings
T = 13 * BAR
for i in range(0, 112, 3):
    fx(click(R.uniform(1800, 2800), 0.015, 0.002), O(0.3) + i * 0.006, 0.09, pan=0.5)
for i, (a0, b0) in enumerate(((1.05, 1.17), (1.25, 1.37), (1.45, 1.62), (1.7, 1.85))):
    fx(pop(400 + i * 40, 900 + i * 80, 0.08), O(a0), 0.13, pan=0.4)
    fx(bell(nf('A6'), 0.4), O(b0), 0.1, pan=0.4, send=0.3)
for i in range(7):
    fx(click(2400 + i * 160, 0.03, 0.004), O(1.9 + i * 0.13), 0.18, pan=0.5)
    fx(bell(mtof(81 + [0, 2, 4, 7, 9, 12, 14][i]), 0.35), O(2.0 + i * 0.13), 0.07, pan=0.5, send=0.3)
for i in range(2):  # two ntfy pings
    fx(bell(nf('E6'), 0.5), O(2.8 + i * 0.12), 0.24, pan=-0.5, send=0.3)
    fx(bell(nf('B6'), 0.5), O(2.8 + i * 0.12) + 0.03, 0.2, pan=-0.5, send=0.3)
fx(pop(220, 520, 0.16), O(3.05), 0.25, pan=0.4)
# board editing
T = 15 * BAR
fx(click(3000, 0.04, 0.006), T + 0.27, 0.4, pan=0.4)
fx(glide(500, 950, D(T + 0.32, 0.3)), T + 0.32, 0.3, pan=0.4)
fx(click(2200, 0.04, 0.006), T + 0.62, 0.35, pan=0.4)
fx(thud(0.25), T + 0.62, 0.3, pan=0.4)
fx(whoosh(D(T + 0.84, 0.64), 2500, 400, 1.3, 1.3, 0.2, 0.6, 0.45), T + 0.84, 0.45)
fx(glide(1100, 380, D(T + 0.84, 0.64)), T + 0.84, 0.25, pan=0.5)
# setup studio
T = 16 * BAR
for i in range(6):
    fx(pop(420 + i * 60, 1000 + i * 120, 0.08), T + 0.3 + i * 0.14, 0.16, pan=-0.4)
for i in range(7):
    fx(click(2400 + i * 180, 0.03, 0.004), T + 0.62 + i * 0.12, 0.2, pan=0.5)
    fx(bell(mtof(81 + [0, 2, 4, 7, 9, 12, 14][i]), 0.35), T + 0.63 + i * 0.12, 0.07, pan=0.5, send=0.3)
# +31
T = 17 * BAR
fx(impact(1.2, 0.6), T, 0.6, send=0.3)
prev = 0
for i in range(1, 3000):
    t = T + i / 3000 * 0.9
    v = int(31 * out_quint(seg(t, T + 0.05, T + 0.85)))
    if v != prev:
        fx(click(3600 + v * 20, 0.02, 0.0025), t, 0.12, pan=-0.4)
        prev = v
for d in range(11):
    fx(click(R.uniform(3000, 4600), 0.02, 0.003), T + 0.18 + d * 0.035, 0.07, pan=0.5)
for i in range(4):
    fx(whoosh(0.2, 3500, 900, 1.4, 1.0, -0.6 + i * 0.4, -0.6 + i * 0.4, 0.3), T + 0.7 + i * 0.07, 0.18)
# also in v2
T = 18 * BAR
fx(impact(1.0, 0.5), T + 0.12, 0.45, send=0.3)
for i in range(12):
    fx(click(R.uniform(2200, 3400), 0.025, 0.004), T + 0.2 + i * 0.07, 0.13, pan=0.3 + 0.2 * np.sin(i))
fx(revcym(D(19 * BAR - 0.5, 0.5)), 19 * BAR - 0.5, 1.0)
fx(whoosh(D(19 * BAR - 0.25, 0.3), 5000, 300, 1.3, 1.0, 0, 0, 0.8), 19 * BAR - 0.25, 0.45)
fx(impact(2.4, 1.4), 19 * BAR, 1.0, send=0.4)
fx(crash(1.9), 19 * BAR, 1.1, send=0.4)

# ─────────────────────────── reverb + master ───────────────────────────
ir_d = 1.8
it = tt(ir_d)
ir = np.stack([lp(noise(ir_d), 6000), lp(noise(ir_d), 6000)], 1) * np.exp(-it / 0.45)[:, None]
ir /= np.sqrt((ir ** 2).sum(0))
wet = np.stack([signal.fftconvolve(verb[:, c], ir[:, c])[:N] for c in range(2)], 1)
mix = hp(music * 0.8 + sfx * 0.85 + wet * 0.45, 25)
fade = np.ones(N)
fa = int((DUR - 0.25) * SR)
fade[fa:] = (1 - np.linspace(0, 1, N - fa)) ** 2
mix *= fade[:, None]
mix = np.tanh(mix / np.abs(mix).max() * 1.6) / np.tanh(1.6)
mix *= 10 ** (-1 / 20) / np.abs(mix).max()
wavfile.write(f'soundtrack-{VERSION}.wav', SR, (mix * 32767).astype(np.int16))
print(VERSION, f'{DUR:.3f}s', 'peak', round(float(np.abs(mix).max()), 3), 'rms dB', round(20 * np.log10(np.sqrt((mix ** 2).mean())), 1))
