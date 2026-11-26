# The Moth Mother: the largest thing in the Loom. A furred body, a feathered head, and two pairs of
# great dusty wings with an eye on each, which is all you see of her rising up the tower beneath you.
# Parts: body, wing (one forewing + hindwing, mirrored by the game), eye (the pale eye-spot, glowing).
#   blender -b -P art/blender/mothmother.py
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import reset, sphere, chain, join, smooth, export
import bpy

reset()
random.seed(5)
INK = (0.04, 0.042, 0.04, 0.0)

# ---- the body: thorax, a long furred abdomen hanging down, a head with feathered antennae
thorax = sphere('thorax', (0, 0, 0), (0.9, 0.8, 1.0), seg=14, rings=10)
abd = chain('abd', [(0, 0, -0.6, 0.75), (0, 0, -1.6, 0.8), (0, 0, -2.6, 0.62), (0, 0, -3.4, 0.35), (0, 0, -3.9, 0.12)])
head = sphere('head', (0, 0, 1.05), (0.55, 0.5, 0.45), seg=12, rings=8)
fur = [chain(f'fur{i}', [(math.cos(a) * 0.8, math.sin(a) * 0.5, z, 0.08), (math.cos(a) * 1.05, math.sin(a) * 0.7, z - 0.25, 0.02)]) for i, (a, z) in enumerate((random.uniform(0, 6.28), random.uniform(-2.8, 0.6)) for _ in range(22))]
ants = []
for s in (1, -1):
    ants.append(chain(f'ant{s}', [(0.2 * s, 0, 1.4, 0.05), (0.8 * s, 0, 2.3, 0.04), (1.3 * s, 0, 2.9, 0.02)]))
    for k in range(7):
        t = 0.15 + k * 0.12
        x, z = (0.2 + 1.1 * t) * s, 1.4 + 1.5 * t
        ants.append(chain(f'af{s}{k}', [(x, 0, z, 0.02), (x + 0.25 * s, 0, z - 0.12, 0.006)]))
        ants.append(chain(f'ag{s}{k}', [(x, 0, z, 0.02), (x - 0.05 * s, 0, z + 0.28, 0.006)]))
for o in (thorax, head):
    smooth(o, 1)
body = join('body', [thorax, abd, head] + fur + ants, 2200)

# ---- a wing pair (the right side; the game mirrors it): a broad forewing and a rounded hindwing,
# flattened discs pulled into shape, with ribs
fore = sphere('fore', (2.6, 0, 0.6), (2.6, 0.06, 1.5), seg=20, rings=10)
fore.rotation_euler = (0, math.radians(-18), 0)
hind = sphere('hind', (2.0, 0, -1.4), (1.9, 0.05, 1.3), seg=18, rings=8)
hind.rotation_euler = (0, math.radians(20), 0)
ribs = [chain(f'rib{k}', [(0.3, 0.06, 0.2, 0.05), (2.0 + k * 0.5, 0.06, 1.6 - k * 0.7, 0.035), (4.4 - k * 0.3, 0.06, 1.4 - k * 1.0, 0.015)]) for k in range(5)]
for o in (fore, hind):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(rotation=True)
wing = join('wing', [fore, hind] + ribs, 900)

# ---- the eye-spot on the forewing: rings
eye_outer = sphere('eo', (3.0, 0.1, 0.9), (0.7, 0.03, 0.7), seg=18, rings=6)
eye_inner = sphere('ei', (3.0, 0.14, 0.9), (0.3, 0.03, 0.3), seg=14, rings=5)
eye = join('eye', [eye_outer], 200)
pupil = join('pupil', [eye_inner], 120)


def wing_col(x, y, z):
    # dust: a little lighter toward the edges
    d = min(1.0, math.hypot(x - 1.5, z) / 4.5)
    k = 0.05 + d * 0.06
    return (k, k * 1.02, k * 0.98, 0.0)


export('mothmother', {
    'body': (body, INK),
    'wing': (wing, wing_col),
    'eye': (eye, (0.62, 0.64, 0.56, 0.5)),
    'pupil': (pupil, (0.03, 0.03, 0.03, 0.0)),
}, meta={'span': 9.5})
