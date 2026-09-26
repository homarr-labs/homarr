"""Readable-cut time remaps: output time u -> reel time t.

Each shot keeps transitions and actions near normal speed, then slows to a drift once its
content is fully on screen. Shot lengths are whole beats at 128 BPM, so cuts stay on the grid.
Segment speeds: a number = fixed speed, ('H', w) = hold (solved so the shot fills its beats).
"""
import json
import sys

import numpy as np

BEAT = 60 / 128
B = BAR = 4 * BEAT
SLAM = 7 * B + 2 * BEAT
H = lambda w=1: ('H', w)

FIRST_HALF = [
    ('S1 logo', 5, [(0, 0.9375, 0.9), (0.9375, 1.45, 0.75), (1.45, 1.52, H()), (1.52, B, 1.0)]),
    ('S2 services', 8, [(B, 2 * B, H())]),  # one card per beat
    ('S3 one place', 5, [(2 * B, 4.3, 0.85), (4.3, 4.78, H()), (4.78, 3 * B, 0.8)]),
    ('S4 drag & drop', 5, [(3 * B, 7.12, 0.75), (7.12, 7.26, H()), (7.26, 4 * B, 1.0)]),
    ('S5 live data', 6, [(4 * B, 8.36, 0.75), (8.36, 9.15, 0.8), (9.15, 9.26, H()), (9.26, 5 * B, 1.0)]),
    ('S6 integrations', 5, [(5 * B, 10.4, 0.8), (10.4, 10.98, H()), (10.98, 6 * B, 1.0)]),
    ('S7 features', 6, [(6 * B, 11.45, 1.0), (11.45, 12.7, 0.65), (12.7, 12.88, H()), (12.88, 7 * B, 0.9)]),
]
FA = 11 * B  # front door, diagram
FB = 13 * B  # front door, live demo
V2_HALF = [
    ('S8 now in v2', 6, [(7 * B, SLAM, 2 / 3), (SLAM, 14.5, 0.8), (14.5, 14.8, H()), (14.8, 8 * B, 1.0)]),
    ('S9 custom widgets', 6, [(8 * B, 15.2, 1.0), (15.2, 16.3, 0.6), (16.3, 16.675, H()), (16.675, 9 * B, 1.0)]),
    ('S10 workshop', 6, [(9 * B, 17.075, 1.0), (17.075, 18.2, 0.65), (18.2, 18.55, H()), (18.55, 10 * B, 1.0)]),
    ('S11 assistant', 7, [(10 * B, 18.95, 1.0), (18.95, 20.42, 0.55), (20.42, 20.525, H()), (20.525, 11 * B, 1.0)]),
    ('FDA endpoint diagram', 16, [(FA, FA + 0.3, 1.0), (FA + 0.3, FA + 0.95, 0.6), (FA + 0.95, FA + 0.96, H(1)), (FA + 0.96, FA + 2.7, 0.45),
                                  (FA + 2.7, FA + 3.52, 0.7), (FA + 3.52, FA + 3.55, H(1.5)), (FA + 3.55, 13 * B, 1.0)]),
    ('FDB ntfy demo', 16, [(FB, FB + 0.3, 1.0), (FB + 0.3, FB + 1.0, 0.45), (FB + 1.0, FB + 1.9, 0.5), (FB + 1.9, FB + 3.1, 0.5),
                           (FB + 3.1, FB + 3.55, H()), (FB + 3.55, 15 * B, 1.0)]),
    ('S12 board editing', 7, [(15 * B, 28.325, 1.0), (28.325, 28.75, 0.65), (28.75, 28.965, H(1)), (28.965, 29.605, 0.65), (29.605, 29.8, H(2)), (29.8, 16 * B, 1.0)]),
    ('S13 setup studio', 6, [(16 * B, 30.2, 1.0), (30.2, 31.47, 0.65), (31.47, 31.675, H()), (31.675, 17 * B, 1.0)]),
    ('S14 +31', 6, [(17 * B, 33.45, 0.7), (33.45, 33.55, H()), (33.55, 18 * B, 1.0)]),
    ('S15 also in v2', 7, [(18 * B, 33.95, 1.0), (33.95, 35.37, 0.65), (35.37, 35.425, H()), (35.425, 19 * B, 0.8)]),
    ('S16 end card', 8, [(19 * B, 36.4, 0.6), (36.4, 37.03, H()), (37.03, 20 * B, 1.0)]),
]

DU = 1 / 480


def build(scenes):
    segs, shots, u = [], [], 0.0
    for name, beats, parts in scenes:
        D = beats * BEAT
        fixed = sum((b - a) / s for a, b, s in parts if not isinstance(s, tuple))
        weights = sum(s[1] for a, b, s in parts if isinstance(s, tuple))
        hold = D - fixed
        assert hold > 0.05, (name, hold)
        u0 = u
        for a, b, s in parts:
            dur = hold * s[1] / weights if isinstance(s, tuple) else (b - a) / s
            segs.append((u, u + dur, (b - a) / dur))
            u += dur
        shots.append({'name': name, 'u0': u0, 'u1': u, 't0': parts[0][0], 't1': parts[-1][1], 'beats': beats})
    n = int(round(u / DU))
    uc = (np.arange(n) + 0.5) * DU
    speed = np.zeros(n)
    for a, b, s in segs:
        speed[(uc >= a) & (uc < b)] = s
    # soften speed changes (no visible lurches), then re-fit each shot to its exact reel span
    k = np.exp(-0.5 * (np.arange(-60, 61) * DU / 0.06) ** 2)
    speed = np.convolve(np.pad(speed, 60, mode='edge'), k / k.sum(), mode='valid')
    for sh in shots:
        i0, i1 = int(round(sh['u0'] / DU)), int(round(sh['u1'] / DU))
        speed[i0:i1] *= (sh['t1'] - sh['t0']) / (speed[i0:i1].sum() * DU)
    t = scenes[0][2][0][0] + np.concatenate([[0.0], np.cumsum(speed) * DU])
    return {'du': DU, 'duration': n * DU, 't': np.round(t, 6).tolist(), 'shots': shots}


PRE = 56 / 60  # v2 cut: black pre-roll (whole frames) with a riser into the "Now in v2" impact


def join(a, b):
    """Concatenate two warps (a ends exactly where b starts, in both reel and output time)."""
    off = a['duration']
    assert abs(a['t'][-1] - b['t'][0]) < 1e-6
    return {'du': DU, 'duration': off + b['duration'], 't': a['t'] + b['t'][1:],
            'shots': a['shots'] + [{**s, 'u0': s['u0'] + off, 'u1': s['u1'] + off} for s in b['shots']]}


if __name__ == '__main__':
    A, Bw = build(FIRST_HALF), build(V2_HALF)
    assert round(A['duration'] * 60, 6) == int(A['duration'] * 60), 'first half must be whole frames'
    json.dump(A, open('warp-a.json', 'w'))
    json.dump(Bw, open('warp-b.json', 'w'))
    G = join(A, Bw)
    json.dump(G, open('warp-global.json', 'w'))
    n = int(round(PRE / DU))
    C = {'du': DU, 'duration': PRE + Bw['duration'], 't': [Bw['t'][0]] * n + Bw['t'], 'pre': PRE,
         'shots': [{**s, 'u0': s['u0'] + PRE, 'u1': s['u1'] + PRE} for s in Bw['shots']]}
    json.dump(C, open('warp-v2cut.json', 'w'))
    for name, w in (('a', A), ('b', Bw), ('global', G), ('v2cut', C)):
        print(name, f"{w['duration']:.3f}s", f"{w['duration'] * 60:.2f} frames", sum(s['beats'] for s in w['shots']), 'beats')
    for s in G['shots']:
        ti = G['t'][int(round(s['u1'] / DU))]
        print(f"  {s['name']:22s} u {s['u0']:7.3f}-{s['u1']:7.3f}  t_end {ti:7.3f} (want {s['t1']:.3f})")
    sys.exit(0)
