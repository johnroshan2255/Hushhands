# The Glutton: a mouth under the floor. Only its jaws ever come up through the boards: two great
# lumpy jaws, rows of crooked teeth, a fat tongue. Each jaw is a part (the game opens them), origin
# at the hinge, the mouth facing +Z (up out of the floor), about 2.2 m across.
#   blender -b -P art/blender/glutton.py
import sys, os, math, random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import reset, sphere, chain, join, smooth, export

reset()
random.seed(11)
INK = (0.035, 0.036, 0.035, 0.0)


def jaw(name, side):
    # a heavy curved jaw: a lumpy ridge of flesh along x, curving up at the ends
    ridge = chain(f'{name}ridge', [(-1.1, 0, 0.15, 0.22), (-0.6, 0, 0.0, 0.32), (0, 0, -0.05, 0.36), (0.6, 0, 0.0, 0.32), (1.1, 0, 0.15, 0.22)])
    lumps = [sphere(f'{name}l{i}', (-0.9 + i * 0.45, 0.12 * side, -0.12 + random.random() * 0.1), (0.2, 0.18, 0.18), seg=8, rings=6) for i in range(5)]
    teeth = []
    for i in range(11):
        x = -1.0 + i * 0.2 + random.uniform(-0.04, 0.04)
        h = 0.25 + random.random() * 0.22 + (0.12 if i in (2, 8) else 0)
        lean = random.uniform(-0.12, 0.12)
        teeth.append(chain(f'{name}t{i}', [(x, 0, 0.25, 0.06), (x + lean * 0.5, 0, 0.25 + h * 0.6, 0.035), (x + lean, 0, 0.25 + h, 0.006)]))
    for o in lumps:
        smooth(o, 1)
    j = join(name, [ridge] + lumps + teeth, 900)
    if side < 0:  # the lower jaw: mirrored so its teeth point up and the upper's point down
        j.scale = (1, 1, -1)
        import bpy
        bpy.ops.object.select_all(action='DESELECT'); j.select_set(True); bpy.context.view_layer.objects.active = j
        bpy.ops.object.transform_apply(scale=True)
    return j


upper = jaw('upper', 1)
lower = jaw('lower', -1)
tongue = join('tongue', [chain('tongue', [(-0.6, 0, 0, 0.16), (0, 0, 0.05, 0.24), (0.55, 0, 0.12, 0.14)])], 160)
export('glutton', {'upper': (upper, INK), 'lower': (lower, INK), 'tongue': (tongue, (0.16, 0.03, 0.025, 0.08))}, meta={'width': 2.2})
