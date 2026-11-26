# The Collector: a giant in a long ragged coat, hunched, its small head thrust forward under a brimmed
# pointed hat; on its back, the cages it fills. Only the body is modelled: its long legs and arms
# are moved by the game (two-bone IK). Origin at the hips, facing +X, about 3 m from hip to hat.
#   blender -b -P art/blender/collector.py
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import reset, sphere, chain, join, smooth, export

reset()
random.seed(3)
INK = (0.04, 0.043, 0.042, 0.0)

# the coat: a hunched sack along a bent spine, wide at the hem, ragged
spine = [(-0.1, 0, -0.9, 0.62), (0.05, 0, -0.2, 0.95), (0.35, 0, 0.5, 1.05), (0.7, 0, 1.25, 0.85), (0.95, 0, 1.75, 0.5), (1.05, 0, 2.0, 0.32)]
coat = chain('coat', spine)
hem = [chain(f'rag{i}', [(-0.1 + math.cos(a) * 0.7, math.sin(a) * 0.55, -0.85, 0.1), (-0.1 + math.cos(a) * 0.8, math.sin(a) * 0.6, -1.3 - random.random() * 0.35, 0.04)]) for i, a in enumerate([k * 0.7 for k in range(9)])]
# the head, small and forward; a long hooked nose; the brimmed, pointed hat
head = sphere('head', (1.3, 0, 1.78), (0.34, 0.3, 0.38), seg=12, rings=8)
nose = chain('nose', [(1.55, 0, 1.78, 0.08), (1.82, 0, 1.68, 0.05), (1.9, 0, 1.52, 0.02)])
brim = sphere('brim', (1.25, 0, 2.12), (0.78, 0.7, 0.05), seg=16, rings=4)
crown = chain('crown', [(1.25, 0, 2.12, 0.36), (1.2, 0, 2.5, 0.24), (1.05, 0, 2.85, 0.08), (0.85, 0, 3.0, 0.02)])
# the cages on its back, strapped on
bars = []
for (cx, cz, s) in [(-1.05, 1.0, 1.0), (-0.95, -0.25, 0.8)]:
    for i in range(6):
        a = i / 6 * math.pi * 2
        x, y = cx + math.cos(a) * 0.42 * s, math.sin(a) * 0.42 * s
        bars.append(chain(f'bar{cx}{i}', [(x, y, cz - 0.5 * s, 0.03), (x, y, cz + 0.5 * s, 0.03)]))
    bars.append(sphere(f'lid{cx}', (cx, 0, cz + 0.52 * s), (0.48 * s, 0.48 * s, 0.07), seg=12, rings=4))
    bars.append(sphere(f'base{cx}', (cx, 0, cz - 0.52 * s), (0.48 * s, 0.48 * s, 0.05), seg=12, rings=4))
    bars.append(chain(f'strap{cx}', [(cx + 0.3, 0, cz + 0.4, 0.05), (0.2, 0, cz + 0.9, 0.05)]))
for o in (head, brim):
    smooth(o, 1)
body = join('body', [coat, head, nose, brim, crown] + hem + bars, 2600)
export('collector', {'body': (body, INK)}, meta={'head': [1.3, 1.78, 0]})
