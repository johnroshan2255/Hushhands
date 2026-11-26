# A Gnawer: one small rat, seen by the hundred. ~150 triangles: a body, a pointed head with ears,
# a long tail as a separate part (it whips). Origin at the feet, facing +X, about 0.5 m nose to rump.
#   blender -b -P art/blender/rat.py
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import reset, sphere, chain, join, export

reset()
INK = (0.035, 0.036, 0.035, 0.0)
body = sphere('body', (0, 0, 0.11), (0.17, 0.08, 0.09), seg=10, rings=6)
haunch = sphere('haunch', (-0.08, 0, 0.11), (0.11, 0.085, 0.1), seg=8, rings=6)
head = chain('head', [(0.12, 0, 0.13, 0.065), (0.22, 0, 0.11, 0.045), (0.3, 0, 0.085, 0.012)])
ears = [sphere(f'ear{s}', (0.15, 0.04 * s, 0.2), (0.022, 0.012, 0.03), seg=6, rings=4) for s in (1, -1)]
legs = [chain(f'leg{i}', [(x, 0.05 * s, 0.08, 0.018), (x + 0.02, 0.05 * s, 0.0, 0.012)]) for i, (x, s) in enumerate([(0.08, 1), (0.08, -1), (-0.09, 1), (-0.09, -1)])]
rat = join('rat', [body, haunch, head] + ears + legs, 130)
tail = join('tail', [chain('tail', [(0, 0, 0, 0.014), (-0.12, 0, -0.03, 0.01), (-0.26, 0, -0.04, 0.006), (-0.4, 0, -0.02, 0.003)])], 30)
export('rat', {'body': (rat, INK), 'tail': (tail, INK)}, meta={'tailRoot': [-0.17, 0.1, 0.0]})
