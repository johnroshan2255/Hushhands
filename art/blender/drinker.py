# The Drinker: a mosquito the size of a dog. One shape no other creature has: the needle.
# Parts (each moved by the game): body (thorax, head, eyes, feathered antennae), abdomen (hangs from
# the waist and swells red as it drinks), needle (the proboscis, from the mouth), wing, leg (one long
# jointed leg, used six times; its knee is at the middle).
#   blender -b -P art/blender/drinker.py
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import reset, sphere, chain, join, smooth, export

reset()
INK = (0.04, 0.043, 0.042, 0.0)

# ---- body: a humped thorax, a small head thrust forward and down, two great eyes, antennae
thorax = sphere('thorax', (0, 0, 0), (0.34, 0.24, 0.3))
hump = sphere('hump', (-0.05, 0, 0.13), (0.26, 0.2, 0.2))
neck = chain('neck', [(0.2, 0, -0.02, 0.09), (0.34, 0, -0.08, 0.07)])
head = sphere('head', (0.42, 0, -0.1), (0.14, 0.13, 0.13))
eyeL = sphere('eyeL', (0.46, 0.08, -0.07), (0.1, 0.07, 0.1))
eyeR = sphere('eyeR', (0.46, -0.08, -0.07), (0.1, 0.07, 0.1))
ants = []
for s in (1, -1):
    pts = [(0.52, 0.03 * s, -0.04, 0.012), (0.66, 0.1 * s, 0.1, 0.01), (0.76, 0.16 * s, 0.26, 0.006)]
    ants.append(chain(f'ant{s}', pts))
    # feathering: little barbs along the antenna
    for k in range(5):
        t = 0.2 + k * 0.17
        x, y, z = 0.52 + 0.24 * t, (0.03 + 0.13 * t) * s, -0.04 + 0.3 * t
        ants.append(chain(f'barb{s}{k}', [(x, y, z, 0.006), (x + 0.03, y + 0.05 * s, z + 0.07, 0.003)]))
# the palps beside the needle
palps = [chain(f'palp{s}', [(0.5, 0.03 * s, -0.16, 0.018), (0.68, 0.04 * s, -0.27, 0.014), (0.78, 0.04 * s, -0.33, 0.01)]) for s in (1, -1)]
for o in (thorax, hump, head, eyeL, eyeR):
    smooth(o, 1)
body = join('body', [thorax, hump, neck, head, eyeL, eyeR] + ants + palps, 1400)

# ---- abdomen: a long segmented sack from the waist (origin) backward, tapering, slightly drooped
segs = []
n = 7
for k in range(n):
    t = k / (n - 1)
    x = -0.12 - t * 1.05
    z = -0.02 - math.sin(t * math.pi * 0.8) * 0.12 + t * 0.05
    r = 0.19 * (1 - t * 0.75) * (1.0 if k % 2 == 0 else 0.93)
    segs.append((x, 0, z, r))
abd = chain('abdomen', [(0, 0, 0, 0.08)] + segs + [(-1.28, 0, 0.02, 0.025)])
abdomen = join('abdomen', [abd], 500)

# ---- the needle: thin, long, a little curved, sharp
needle = join('needle', [chain('needle', [(0, 0, 0, 0.022), (0.3, 0, -0.06, 0.016), (0.6, 0, -0.16, 0.01), (0.88, 0, -0.3, 0.004)])], 140)

# ---- a wing: a long narrow leaf with veins (flattened sphere; the veins as fine tubes on it)
wing = sphere('wingskin', (0.45, 0, 0), (0.48, 0.12, 0.012), seg=20, rings=8)
veins = [chain(f'vein{k}', [(0.02, 0, 0, 0.008), (0.3 + 0.1 * k, (k - 1.5) * 0.04, 0, 0.006), (0.85, (k - 1.5) * 0.02, 0, 0.003)]) for k in range(4)]
wing = join('wing', [wing] + veins, 260)

# ---- a leg: from the hip (origin) to the knee (x=0.55, z=0) to the foot (x=1.1): thin, with a knee knob
leg = join('leg', [chain('leg', [(0, 0, 0, 0.028), (0.27, 0, 0, 0.02), (0.55, 0, 0, 0.016), (0.82, 0, 0, 0.01), (1.1, 0, 0, 0.005)]), sphere('knee', (0.55, 0, 0), (0.03, 0.03, 0.03), seg=8, rings=6)], 160)


def abdomen_col(x, y, z):
    # ink, with a deep red that only shows when the game lights it (it fills as the Drinker drinks)
    return (0.09, 0.015, 0.012, 0.0)


export('drinker', {
    'body': (body, INK),
    'abdomen': (abdomen, abdomen_col),
    'needle': (needle, (0.05, 0.05, 0.05, 0.0)),
    'wing': (wing, (0.62, 0.68, 0.66, 0.3)),
    'leg': (leg, INK),
}, meta={'waist': [-0.12, 0.0, 0.0], 'mouth': [0.5, -0.16, 0.0], 'wingRoot': [0.0, 0.18, 0.0], 'hips': [[0.12, -0.12], [0.0, -0.14], [-0.12, -0.12]], 'legLen': 1.1, 'knee': 0.55})
