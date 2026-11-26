# The Needle-Crawler: a blind thing that hangs from the ceiling. A segmented body with a ridge of
# spines along its back (which faces down, toward you), a head with no eyes, mandibles, and the socket
# its needle comes out of. Only the body is modelled; the eight legs and the needle are the game's.
# Origin at the body's middle, facing +X, about 1.4 m long.
#   blender -b -P art/blender/crawler.py
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import reset, sphere, chain, join, smooth, export

reset()
random.seed(9)
INK = (0.04, 0.043, 0.042, 0.0)
segs = []
for k in range(6):
    t = k / 5
    x = 0.45 - t * 1.3
    r = 0.26 + math.sin(t * math.pi) * 0.22
    segs.append(sphere(f'seg{k}', (x, 0, 0), (0.24, r * 0.9, r * 0.75), seg=12, rings=8))
head = sphere('head', (0.62, 0, -0.05), (0.26, 0.22, 0.2), seg=10, rings=8)
mand = [chain(f'mand{s}', [(0.78, 0.08 * s, -0.12, 0.04), (0.95, 0.12 * s, -0.22, 0.03), (0.98, 0.05 * s, -0.32, 0.01)]) for s in (1, -1)]
socket = sphere('socket', (0.4, 0, -0.32), (0.1, 0.1, 0.12), seg=8, rings=6)
# spines down the back (the back hangs downward: -Z in its frame is toward the floor)
spines = [chain(f'sp{i}', [(0.3 - i * 0.18, 0, -0.25, 0.04), (0.28 - i * 0.18 + random.uniform(-0.05, 0.05), 0, -0.48 - random.random() * 0.12, 0.005)]) for i in range(8)]
for o in segs + [head]:
    smooth(o, 1)
body = join('body', segs + [head, socket] + mand + spines, 1600)
export('crawler', {'body': (body, INK)}, meta={})
