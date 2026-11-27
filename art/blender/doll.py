# The doll: a little sack of cloth, stuffed, stitched, tied at the waist with the thread. Every part
# is its own mesh with the pivot the game's rig turns it about (src/chars.js), so the rig's walking,
# creeping, hanging and dying all move it as before:
#   torso: from the pelvis up (y -0.24 hem .. 0.48 neck)   pelvis: at the hips
#   head0..3: from the neck up (four shapes: tied tuft, ears, hood, square)
#   armU / armL, legU / legL: hanging down from their pivot   foot: a shoe, at the ankle
# Blender: Z up, the doll faces -Y (which the game turns to face where it walks).
#   blender -b -P art/blender/doll.py
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import reset, sphere, chain, join, smooth, export

reset()
random.seed(21)
SACK = (0.05, 0.048, 0.044, 0.0)
SEAM = (0.13, 0.12, 0.105, 0.0)
KNOT = (1.0, 0.66, 0.26, 1.0)


def stitches(name, pts, w=0.018):
    """little cross-stitches along a line of points (x, y, z) on a surface"""
    out = []
    for i, (x, y, z) in enumerate(pts):
        out.append(chain(f'{name}{i}a', [(x - w, y, z - w, 0.006), (x + w, y, z + w, 0.006)]))
        out.append(chain(f'{name}{i}b', [(x - w, y, z + w, 0.006), (x + w, y, z - w, 0.006)]))
    return out


# ---- torso: a stuffed sack, wider at the belly, a ragged hem, a seam down the front, the thread knotted at the hips
body = chain('sack', [(0, 0, -0.22, 0.22), (0, 0, -0.05, 0.235), (0, 0, 0.12, 0.215), (0, 0, 0.3, 0.19), (0, 0, 0.42, 0.13), (0, 0, 0.48, 0.07)])
body.scale = (1, 0.84, 1)
rags = [chain(f'rag{k}', [(math.cos(a) * 0.2, math.sin(a) * 0.17, -0.22, 0.035), (math.cos(a) * 0.23, math.sin(a) * 0.19, -0.3 - random.random() * 0.08, 0.012)]) for k, a in enumerate([i * math.pi * 2 / 9 for i in range(9)])]
belt = chain('belt', [(-0.24, 0, 0.06, 0.03), (0, -0.215, 0.06, 0.03), (0.24, 0, 0.06, 0.03)])
seam = stitches('fs', [(0, -0.19, z) for z in (0.12, 0.2, 0.28, 0.36)])
patch = sphere('patch', (0.09, -0.175, 0.2), (0.07, 0.02, 0.06), seg=8, rings=4)
torso = join('torso', [body, belt, patch] + rags + seam, 700)
knots = join('knots', [sphere(f'knot{s}', (0.2 * s, -0.04, 0.06), (0.065, 0.065, 0.065), seg=8, rings=6) for s in (1, -1)], 120)

# ---- pelvis
pelvis = join('pelvis', [sphere('pelv', (0, 0, -0.04), (0.16, 0.13, 0.1), seg=10, rings=6)], 140)


# ---- heads: a stuffed ball with a stitched mouth and two button eyes (one hanging by its thread)
def head(v):
    parts = [sphere(f'h{v}', (0, 0, 0.23), (0.28, 0.26, 0.26), seg=14, rings=10)]
    smooth(parts[0], 1)
    parts += stitches(f'm{v}', [(x, -0.255, 0.12) for x in (-0.1, -0.05, 0, 0.05, 0.1)], 0.014)
    parts.append(sphere(f'eyeL{v}', (-0.09, -0.255, 0.27), (0.05, 0.015, 0.05), seg=10, rings=4))
    parts.append(sphere(f'eyeR{v}', (0.1, -0.252, 0.2), (0.045, 0.015, 0.045), seg=10, rings=4))  # (sagging: one stitch left)
    parts.append(chain(f'eyeT{v}', [(0.09, -0.26, 0.26, 0.005), (0.1, -0.258, 0.22, 0.005)]))
    if v == 0:  # tied off at the top: a tuft
        parts.append(chain('tuft', [(0, 0, 0.44, 0.1), (0, 0, 0.5, 0.05), (0, 0, 0.58, 0.07), (0.02, 0, 0.68, 0.14)]))
        parts.append(chain('tie', [(-0.07, 0, 0.5, 0.02), (0.07, 0, 0.5, 0.02)]))
    elif v == 1:  # two long corners, like ears
        for s in (1, -1):
            parts.append(chain(f'ear{s}', [(0, 0.12 * s, 0.36, 0.1), (0, 0.22 * s, 0.52, 0.06), (0, 0.3 * s, 0.7, 0.02)]))
    elif v == 2:  # a tall hood, its point drooping behind
        parts.append(chain('hood', [(0, 0, 0.3, 0.26), (0, 0.05, 0.48, 0.18), (0, 0.15, 0.64, 0.1), (0, 0.32, 0.74, 0.05), (0, 0.48, 0.7, 0.015)]))
    else:  # a square sack: flat on top, a knot at each corner
        sq = sphere('sq', (0, 0, 0.42), (0.23, 0.25, 0.12), seg=8, rings=6)
        parts.append(sq)
        for s in (1, -1):
            parts.append(sphere(f'sk{s}', (0, 0.27 * s, 0.56), (0.09, 0.09, 0.09), seg=6, rings=4))
    return join(f'head{v}', parts, 900)


heads = [head(v) for v in range(4)]


# ---- limbs, hanging down from their pivot: soft stuffed tubes, a cuff of stitches
def limb(name, length, r0, r1, hand=False):
    parts = [chain(name, [(0, 0, 0, r0), (0, 0, -length * 0.5, (r0 + r1) / 2 * 1.05), (0, 0, -length, r1)])]
    if hand:
        parts.append(sphere(f'{name}h', (0, 0, -length - 0.03), (0.075, 0.07, 0.07), seg=8, rings=6))
    parts += stitches(f'{name}c', [(0, -r1, -length * 0.85)], 0.012)
    return join(name, parts, 220)


armU, armL = limb('armU', 0.25, 0.06, 0.052), limb('armL', 0.23, 0.052, 0.048, hand=True)
legU, legL = limb('legU', 0.36, 0.075, 0.062), limb('legL', 0.34, 0.062, 0.055)
foot = join('foot', [sphere('shoe', (0, -0.06, 0), (0.08, 0.14, 0.06), seg=10, rings=6), chain('sole', [(0, 0.04, -0.055, 0.03), (0, -0.18, -0.055, 0.03)])], 200)

parts = {'torso': (torso, SACK), 'knots': (knots, KNOT), 'pelvis': (pelvis, SACK), 'armU': (armU, SACK), 'armL': (armL, SACK), 'legU': (legU, SACK), 'legL': (legL, SACK), 'foot': (foot, SACK)}
for v, h in enumerate(heads):
    parts[f'head{v}'] = (h, SACK)
export('doll', parts, meta={})
