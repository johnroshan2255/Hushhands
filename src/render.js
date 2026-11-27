// The look: Fogbash's black silhouettes in grey-teal fog, here with the fog turned up bright and the
// only warm thing the amber thread. One world shader lights
// vertex-coloured meshes with a faint moon, a dim ambient and up to NL point lights (candles, lamps,
// lanterns), then fogs them toward the sky by depth. Every material can be faded with a dither
// (the cutaway into a house: its front wall dissolves). WebGL 2 only.
import * as pc from 'playcanvas';

export let NL = 16;
/** low-end devices: fewer lights per pixel (call before any material is made) */
export function setLightCount(n) { NL = n; }
/** the lightest picture, for the weakest phones (call before any material is made): the lights are
 *  worked out at the corners of each shape and spread across it, not at every pixel; fog banks and
 *  glows lose their second layer of noise. The world is black shapes in fog, so little of it shows. */
export let LITE = false;
export function setLite(on) { LITE = !!on; }
const range = (n) => Array.from({ length: n }, (_, i) => i);

const HASH = `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), f.x), mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), f.x), f.y);
}`;

// the loading-screen sky; uDawn pales it toward a grey-rose morning
const SKY = `
uniform vec2 uRes;
uniform float uDawn;
vec3 sky(vec2 uv) {
  float t = length((uv - vec2(0.5, 0.56)) / vec2(0.95, 0.74));
  vec3 c0 = vec3(0.80, 0.84, 0.82), c1 = vec3(0.63, 0.68, 0.66), c2 = vec3(0.40, 0.45, 0.435), c3 = vec3(0.20, 0.23, 0.225);
  vec3 c = t < 0.38 ? mix(c0, c1, t / 0.38) : t < 0.78 ? mix(c1, c2, (t - 0.38) / 0.4) : mix(c2, c3, clamp((t - 0.78) / 0.22, 0.0, 1.0));
  vec3 d = mix(vec3(0.72, 0.66, 0.62), vec3(0.42, 0.45, 0.47), clamp(uv.y * 1.3 - 0.1, 0.0, 1.0));
  return mix(c, d, uDawn * uDawn);
}`;

const LIGHTS = () => `
uniform vec3 uAmb;
uniform vec3 uMoonDir;
uniform vec3 uMoonCol;
${range(NL).map((i) => `uniform vec4 uL${i};\nuniform vec4 uC${i};`).join('\n')}
vec3 pointL(vec4 L, vec4 C, vec3 w, vec3 n) {
  vec3 d = L.xyz - w;
  float l = length(d) + 0.0001;
  float a = clamp(1.0 - l / max(L.w, 0.01), 0.0, 1.0);
  float lam = 0.35 + 0.65 * max(dot(n, d / l), 0.0);
  return C.rgb * C.w * a * a * lam;
}
vec3 lightAt(vec3 w, vec3 n) {
  vec3 L = uAmb * (0.75 + 0.25 * n.y) + uMoonCol * max(dot(n, uMoonDir), 0.0);
${range(NL).map((i) => `  L += pointL(uL${i}, uC${i}, w, n);`).join('\n')}
  return L;
}`;

const WORLD_VS = `
attribute vec3 vertex_position;
attribute vec3 vertex_normal;
attribute vec4 vertex_color;
uniform mat4 matrix_model;
uniform mat4 matrix_viewProjection;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vCol;
void main(void) {
  vec4 wp = matrix_model * vec4(vertex_position, 1.0);
  vWorld = wp.xyz;
  vNormal = normalize(mat3(matrix_model) * vertex_normal);
  vCol = vertex_color;
  gl_Position = matrix_viewProjection * wp;
}`;
const WORLD_VS_LITE = () => `
attribute vec3 vertex_position;
attribute vec3 vertex_normal;
attribute vec4 vertex_color;
uniform mat4 matrix_model;
uniform mat4 matrix_viewProjection;
varying vec3 vWorld;
varying vec3 vLight;
varying vec4 vCol;
${LIGHTS()}
void main(void) {
  vec4 wp = matrix_model * vec4(vertex_position, 1.0);
  vWorld = wp.xyz;
  vLight = lightAt(wp.xyz, normalize(mat3(matrix_model) * vertex_normal));
  vCol = vertex_color;
  gl_Position = matrix_viewProjection * wp;
}`;
const WORLD_FS = () => (LITE ? WORLD_FS_LITE : WORLD_FS_FULL());
// (the same picture, with the light handed down from the corners)
const WORLD_FS_LITE = `
uniform float uFade;
uniform vec4 uTint;
uniform vec4 uDis;
uniform float uFogStart;
uniform float uFogMul;
uniform float uExpo;
varying vec3 vWorld;
varying vec3 vLight;
varying vec4 vCol;
${HASH}
${SKY}
void main(void) {
  if (uFade > 0.001) {
    float h = hash12(floor(gl_FragCoord.xy * 0.5));
    if (h < uFade) discard;
  }
  float burn = 0.0;
  if (uDis.w > 0.001) {
    float d = distance(vWorld.xy, uDis.xy) + (vnoise(vWorld.xy * 1.7) - 0.5) * 1.6;
    if (d < uDis.w) discard;
    burn = 1.0 - smoothstep(0.0, 0.55, d - uDis.w);
  }
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 c = vCol.rgb * uTint.rgb * vLight;
  float glow = clamp(vCol.a + uTint.a, 0.0, 2.0);
  c += vCol.rgb * glow * 1.4;
  float depth = max(0.0, uFogStart - vWorld.z);
  float fogK = (1.0 - exp(-depth / 13.0)) * uFogMul;
  c = mix(c, sky(uv) * 0.94, clamp(fogK, 0.0, 0.97) * (1.0 - clamp(glow, 0.0, 1.0) * 0.6));
  c *= uExpo;
  c = c / (1.0 + max(c - 0.7, 0.0) * 0.6);
  c += vec3(1.0, 0.55, 0.18) * burn * burn * 1.6;
  gl_FragColor = vec4(c, 1.0);
}`;
const WORLD_FS_FULL = () => `
uniform float uFade;
uniform vec4 uTint;      // rgb multiplies the albedo, a adds glow
uniform vec4 uDis;       // burn-away: xyz = where it starts, w = how far it has spread (0 = off)
uniform float uFogStart; // world z where the fog starts (the play plane)
uniform float uFogMul;   // 1 outside, less inside a house
uniform float uExpo;     // brightness
uniform vec3 uCam;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec4 vCol;
${HASH}
${SKY}
${LIGHTS()}
void main(void) {
  if (uFade > 0.001) {
    float h = hash12(floor(gl_FragCoord.xy * 0.5));
    if (h < uFade) discard;
  }
  float burn = 0.0;
  if (uDis.w > 0.001) {
    float d = distance(vWorld.xy, uDis.xy) + (vnoise(vWorld.xy * 1.7) - 0.5) * 1.6;
    if (d < uDis.w) discard;
    burn = 1.0 - smoothstep(0.0, 0.55, d - uDis.w);
  }
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 alb = vCol.rgb * uTint.rgb;
  vec3 c = alb * lightAt(vWorld, n);
  float glow = clamp(vCol.a + uTint.a, 0.0, 2.0);
  c += vCol.rgb * glow * 1.4;
  float depth = max(0.0, uFogStart - vWorld.z);
  float fogK = (1.0 - exp(-depth / 13.0)) * uFogMul;
  vec3 fogC = sky(uv) * 0.94;
  c = mix(c, fogC, clamp(fogK, 0.0, 0.97) * (1.0 - clamp(glow, 0.0, 1.0) * 0.6));
  c *= uExpo;
  c = c / (1.0 + max(c - 0.7, 0.0) * 0.6); // a soft shoulder so lamps don't clip
  c += vec3(1.0, 0.55, 0.18) * burn * burn * 1.6;
  gl_FragColor = vec4(c, 1.0);
}`;

const SKY_VS = `
attribute vec3 vertex_position;
void main(void) { gl_Position = vec4(vertex_position.xy, 0.99999, 1.0); }`;
const SKY_FS = `
uniform float uTime;
uniform float uExpo;
uniform vec4 uMoon; // screen uv xy, radius (fraction of height), visible
${HASH}
${SKY}
void main(void) {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 c = sky(uv);
  vec2 q = (uv - uMoon.xy) * vec2(uRes.x / uRes.y, 1.0);
  float d = length(q);
  float disc = smoothstep(uMoon.z, uMoon.z * 0.96, d);
  float mott = 0.85 + 0.15 * vnoise(q * 40.0);
  c = mix(c, vec3(0.78, 0.8, 0.76) * mott, disc * uMoon.w * (1.0 - uDawn));
  c += vec3(0.5, 0.55, 0.52) * exp(-d * d / (uMoon.z * uMoon.z * 9.0)) * 0.18 * uMoon.w * (1.0 - uDawn);
  gl_FragColor = vec4(c * mix(1.0, uExpo, 0.6), 1.0);
}`;

const COL_VS = `
attribute vec3 vertex_position;
attribute vec4 vertex_color;
uniform mat4 matrix_model;
uniform mat4 matrix_viewProjection;
varying vec3 vWorld;
varying vec4 vCol;
void main(void) {
  vec4 wp = matrix_model * vec4(vertex_position, 1.0);
  vWorld = wp.xyz;
  vCol = vertex_color;
  gl_Position = matrix_viewProjection * wp;
}`;
// additive light: halos, flames, ripples, window glass
const GLOW_FS = () => `
uniform float uGain;
uniform vec4 uTint;
uniform float uTime;
uniform float uFade;
varying vec3 vWorld;
varying vec4 vCol;
${HASH}
void main(void) {
  float n = ${LITE ? '1.0' : '0.85 + 0.3 * vnoise(vWorld.xy * 1.3 + vec2(uTime * 0.7, uTime * 0.3))'};
  gl_FragColor = vec4(vCol.rgb * uTint.rgb * vCol.a * uTint.a * uGain * n * (1.0 - uFade), 1.0);
}`;
// drifting fog banks: sky-coloured, noisy alpha
const FOG_FS = () => `
uniform float uTime;
uniform float uDensity;
uniform float uExpo;
varying vec3 vWorld;
varying vec4 vCol;
${HASH}
${SKY}
void main(void) {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = vWorld.xy * vec2(0.035, 0.11) + vec2(uTime * 0.012 * (1.0 + vWorld.z * 0.01), 0.0);
  float n = ${LITE ? 'vnoise(p)' : 'vnoise(p) * 0.65 + vnoise(p * 2.3 + 7.1) * 0.35'};
  float a = vCol.a * smoothstep(0.32, 0.8, n) * uDensity;
  gl_FragColor = vec4(sky(uv) * 1.1 * mix(1.0, uExpo, 0.6), a);
}`;
// flat colour with alpha (smoke, shadows)
const TINT_FS = `
uniform vec4 uTint;
varying vec3 vWorld;
varying vec4 vCol;
void main(void) { gl_FragColor = vec4(vCol.rgb * uTint.rgb, vCol.a * uTint.a); }`;

const ATTR = { vertex_position: pc.SEMANTIC_POSITION, vertex_normal: pc.SEMANTIC_NORMAL, vertex_color: pc.SEMANTIC_COLOR };
const ATTR_C = { vertex_position: pc.SEMANTIC_POSITION, vertex_color: pc.SEMANTIC_COLOR };

export function worldMaterial({ tint = [1, 1, 1, 0], fade = 0, cull = false } = {}) {
  const m = new pc.ShaderMaterial({ uniqueName: `hhWorld${NL}${LITE ? 'L' : ''}`, vertexGLSL: LITE ? WORLD_VS_LITE() : WORLD_VS, fragmentGLSL: WORLD_FS(), attributes: ATTR });
  m.setParameter('uTint', new Float32Array(tint));
  m.setParameter('uFade', fade);
  m.setParameter('uDis', new Float32Array([0, 0, 0, 0]));
  m.cull = cull ? pc.CULLFACE_BACK : pc.CULLFACE_NONE;
  m.update();
  return m;
}
export function setTint(m, r, g, b, glow = 0) { m.setParameter('uTint', new Float32Array([r, g, b, glow])); }

export function glowMaterial(gain = 1) {
  const m = new pc.ShaderMaterial({ uniqueName: `hhGlow${LITE ? 'L' : ''}`, vertexGLSL: COL_VS, fragmentGLSL: GLOW_FS(), attributes: ATTR_C });
  m.blendState = new pc.BlendState(true, pc.BLENDEQUATION_ADD, pc.BLENDMODE_ONE, pc.BLENDMODE_ONE);
  m.depthWrite = false;
  m.cull = pc.CULLFACE_NONE;
  m.setParameter('uGain', gain);
  m.setParameter('uTint', new Float32Array([1, 1, 1, 1]));
  m.setParameter('uFade', 0);
  m.update();
  return m;
}
export function fogMaterial(density = 1) {
  const m = new pc.ShaderMaterial({ uniqueName: `hhFog${LITE ? 'L' : ''}`, vertexGLSL: COL_VS, fragmentGLSL: FOG_FS(), attributes: ATTR_C });
  m.blendType = pc.BLEND_NORMAL;
  m.depthWrite = false;
  m.cull = pc.CULLFACE_NONE;
  m.setParameter('uDensity', density);
  m.update();
  return m;
}
export function tintMaterial() {
  const m = new pc.ShaderMaterial({ uniqueName: 'hhTint', vertexGLSL: COL_VS, fragmentGLSL: TINT_FS, attributes: ATTR_C });
  m.blendType = pc.BLEND_NORMAL;
  m.depthWrite = false;
  m.cull = pc.CULLFACE_NONE;
  m.setParameter('uTint', new Float32Array([1, 1, 1, 1]));
  m.update();
  return m;
}
export function skyMaterial() {
  const m = new pc.ShaderMaterial({ uniqueName: 'hhSky', vertexGLSL: SKY_VS, fragmentGLSL: SKY_FS, attributes: { vertex_position: pc.SEMANTIC_POSITION } });
  m.cull = pc.CULLFACE_NONE;
  m.depthWrite = false;
  m.update();
  return m;
}

/** The engine, a camera, the sky and the global uniforms (time, lights, fog, dawn). */
export class Renderer {
  constructor(app) {
    this.app = app;
    const device = app.graphicsDevice;
    this.device = device;
    const scope = device.scope;
    const U = (n) => scope.resolve(n);
    this.u = { expo: U('uExpo'), time: U('uTime'), res: U('uRes'), dawn: U('uDawn'), amb: U('uAmb'), moonDir: U('uMoonDir'), moonCol: U('uMoonCol'), fogStart: U('uFogStart'), fogMul: U('uFogMul'), moon: U('uMoon'), cam: U('uCam') };
    this.n = NL;
    this.L = range(NL).map((i) => U(`uL${i}`));
    this.C = range(NL).map((i) => U(`uC${i}`));
    this.Lv = range(NL).map(() => new Float32Array(4));
    this.Cv = range(NL).map(() => new Float32Array(4));
    this.res = new Float32Array(2);
    this.cam = new pc.Entity('camera');
    this.cam.addComponent('camera', { clearColor: new pc.Color(0.02, 0.025, 0.024), fov: 16, nearClip: 0.5, farClip: 400 });
    app.root.addChild(this.cam);
    const sky = new pc.Entity('sky');
    const { quadMesh } = SKYQ;
    sky.addComponent('render', { meshInstances: [new pc.MeshInstance(quadMesh(device), skyMaterial())], castShadows: false });
    sky.render.meshInstances[0].cull = false;
    sky.render.meshInstances[0].drawOrder = 0;
    app.root.addChild(sky);
    this.state = { amb: [0.02, 0.024, 0.024], moon: [0.05, 0.06, 0.06], fogStart: 0, fogMul: 1, dawn: 0 };
  }

  resized() {
    const d = this.device;
    if (this.res[0] === d.width && this.res[1] === d.height) return;
    this.res[0] = d.width; this.res[1] = d.height;
    this.u.res.setValue(this.res);
  }

  /** lights: [{ x, y, z, r, col: [r,g,b], k }] near the camera's focus; the NL nearest are used */
  setLights(lights, fx, fy) {
    const n = this.n;
    const score = (l) => ((l.x - fx) ** 2 + ((l.y - fy) * 1.5) ** 2) / (l.r * l.r) - (l.pri || 0);
    const pick = lights.length > n ? lights.slice().sort((a, b) => score(a) - score(b)).slice(0, n) : lights;
    for (let i = 0; i < n; i++) {
      const l = pick[i];
      if (l) { this.Lv[i].set([l.x, l.y, l.z, l.r]); this.Cv[i].set([l.col[0], l.col[1], l.col[2], l.k]); } else { this.Lv[i].fill(0); this.Cv[i].fill(0); }
      this.L[i].setValue(this.Lv[i]);
      this.C[i].setValue(this.Cv[i]);
    }
  }

  frame(time, { amb, moon, fogStart, fogMul, dawn, moonUv, expo = 1 }) {
    this.resized();
    this.u.time.setValue(time);
    this.u.expo.setValue(expo);
    this.u.amb.setValue(new Float32Array(amb));
    this.u.moonDir.setValue(new Float32Array([0.35, 0.75, 0.56]));
    this.u.moonCol.setValue(new Float32Array(moon));
    this.u.fogStart.setValue(fogStart);
    this.u.fogMul.setValue(fogMul);
    this.u.dawn.setValue(dawn);
    this.u.moon.setValue(new Float32Array(moonUv || [0.78, 0.8, 0.07, 1]));
    const p = this.cam.getPosition();
    this.u.cam.setValue(new Float32Array([p.x, p.y, p.z]));
  }
}

const SKYQ = {
  quadMesh(device) {
    const mesh = new pc.Mesh(device);
    mesh.setPositions([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
    mesh.setIndices([0, 1, 2, 0, 2, 3]);
    mesh.update(pc.PRIMITIVE_TRIANGLES);
    return mesh;
  },
};

export async function createApp(canvas, { antialias = true, dpr = 2 } = {}) {
  const device = await pc.createGraphicsDevice(canvas, { deviceTypes: [pc.DEVICETYPE_WEBGL2], antialias, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance' });
  device.maxPixelRatio = Math.min(window.devicePixelRatio || 1, dpr);
  const opts = new pc.AppOptions();
  opts.graphicsDevice = device;
  opts.componentSystems = [pc.RenderComponentSystem, pc.CameraComponentSystem];
  opts.resourceHandlers = [];
  const app = new pc.AppBase(canvas);
  app.init(opts);
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  window.addEventListener('resize', () => app.resizeCanvas());
  return app;
}
