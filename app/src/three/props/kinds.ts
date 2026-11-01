// The three tool-card objects: how each is made (a CC0 model from
// public/props, or built here), posed and framed, and how it moves with
// scroll, pointer and time.
//
// All props share one rig and one light: they fade and settle in on first
// sight, lean a little toward the pointer, turn slightly as their section
// scrolls past, and are lit with the same warm key and cool rim as the
// rooftop hero. Motion stays slow and small; the content does the talking.

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import type { PropKind } from "./manifest";
import type { Frame } from "./stage";

export interface BuiltProp {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  update(f: Frame, aspect: number, dim: number): void;
  dispose(): void;
}

interface Ctx {
  scene: THREE.Scene;
  rig: THREE.Group;
  pose: THREE.Group;
  model: THREE.Object3D;
}

interface Spec {
  make(): Promise<THREE.Object3D>;
  /** model pose (radians) */
  yaw?: number;
  pitch?: number;
  roll?: number;
  /** camera elevation, radians; negative looks up from below */
  cam?: number;
  fov?: number;
  /** framing margin; bigger = smaller on screen */
  fit?: number;
  /** extra turn across the section's scroll, radians */
  spin?: number;
  /** pointer tilt strength */
  tilt?: number;
  /** idle bob, in model radii */
  float?: number;
  /** contact shadow opacity; 0 for none */
  shadow?: number;
  /** move the picture inside its box, in model radii */
  shift?: [number, number];
  /** built here rather than loaded, so its geometry and textures are its own */
  owned?: boolean;
  hook?(ctx: Ctx): ((f: Frame) => void) | void;
}

/* ---------------- helpers ---------------- */

const BASE = import.meta.env.BASE_URL ?? "./";
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map<string, Promise<THREE.Group>>();
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const outCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const outExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

/** A seeded random, so every load of a prop looks the same. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function glb(name: string): Promise<THREE.Object3D> {
  let p = cache.get(name);
  if (!p) {
    p = loader.loadAsync(`${BASE}props/${name}.glb`).then((g) => {
      // Glass: transmission needs its own render pass, which doesn't mix with
      // a scissored, multi-view canvas. A cool, clear-coated sheet stands in:
      // light enough to see through, tinted enough to read as glass on haldi.
      g.scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        mats.forEach((mat, i) => {
          const phys = mat as THREE.MeshPhysicalMaterial;
          if (phys.transmission > 0) {
            const glass = new THREE.MeshPhysicalMaterial({
              color: 0xe4ecff,
              roughness: 0.04,
              metalness: 0,
              clearcoat: 1,
              specularIntensity: 1,
              transparent: true,
              opacity: 0.38,
              depthWrite: false,
              side: THREE.DoubleSide,
              envMapIntensity: 1.8,
            });
            glass.name = mat.name;
            if (Array.isArray(m.material)) m.material[i] = glass;
            else m.material = glass;
            m.renderOrder = 2;
          }
        });
      });
      return g.scene;
    });
    cache.set(name, p);
  }
  return p.then((s) => s.clone(true));
}

let shadowTex: THREE.Texture | null = null;
function contactShadow(): THREE.Texture {
  if (shadowTex) return shadowTex;
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(10,14,30,0.7)");
  grd.addColorStop(0.4, "rgba(10,14,30,0.24)");
  grd.addColorStop(1, "rgba(10,14,30,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(c);
  return shadowTex;
}

function canvasTex(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  draw(c.getContext("2d")!, size);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------------- procedural: solar panel ---------------- */

const PANEL = { cols: 10, rows: 6, pitch: 1.05 };

function cellTexture() {
  return canvasTex(256, (g, s) => {
    g.fillStyle = "#e9edf3";
    g.fillRect(0, 0, s, s);
    // Mono PERC cell: a square with clipped corners.
    const k = 34;
    g.beginPath();
    g.moveTo(k, 2);
    g.lineTo(s - k, 2);
    g.lineTo(s - 2, k);
    g.lineTo(s - 2, s - k);
    g.lineTo(s - k, s - 2);
    g.lineTo(k, s - 2);
    g.lineTo(2, s - k);
    g.lineTo(2, k);
    g.closePath();
    const grd = g.createLinearGradient(0, 0, s, s);
    grd.addColorStop(0, "#0d1836");
    grd.addColorStop(0.5, "#16295a");
    grd.addColorStop(1, "#0a1430");
    g.fillStyle = grd;
    g.fill();
    g.save();
    g.clip();
    g.strokeStyle = "rgba(150,170,220,0.22)";
    g.lineWidth = 1;
    for (let y = 6; y < s; y += 7) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(s, y);
      g.stroke();
    }
    g.fillStyle = "#c8d0dc";
    for (let i = 0; i < 5; i++) g.fillRect(((i + 0.5) / 5) * s - 1.5, 0, 3, s);
    g.restore();
  });
}

async function makePanel(): Promise<THREE.Object3D> {
  const { cols, rows, pitch } = PANEL;
  const W = cols * pitch;
  const D = rows * pitch;
  const group = new THREE.Group();
  const cellMat = new THREE.MeshPhysicalMaterial({
    map: cellTexture(),
    roughness: 0.32,
    metalness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
  });
  const cells = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.08, 1), cellMat, cols * rows);
  cells.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  cells.frustumCulled = false;
  group.add(cells);

  const alu = new THREE.MeshStandardMaterial({
    color: 0xc9cfd8,
    metalness: 1,
    roughness: 0.32,
  });
  const back = new THREE.MeshStandardMaterial({
    color: 0xf1f3f6,
    roughness: 0.8,
  });
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(W + 0.1, 0.06, D + 0.1), back);
  sheet.position.y = -0.09;
  group.add(sheet);
  const t = 0.24;
  const h = 0.36;
  const frame = new THREE.Group();
  [
    [W + 2 * t, D / 2 + t / 2, 0],
    [W + 2 * t, -D / 2 - t / 2, 0],
    [t, 0, W / 2 + t / 2],
    [t, 0, -W / 2 - t / 2],
  ].forEach(([len, z, x], i) => {
    const geo = i < 2 ? new THREE.BoxGeometry(len, h, t) : new THREE.BoxGeometry(t, h, D);
    const m = new THREE.Mesh(geo, alu);
    m.position.set(i < 2 ? 0 : x, -0.06, i < 2 ? z : 0);
    frame.add(m);
  });
  group.add(frame);
  // Two rails underneath, as if it has just come off the roof stand.
  [-W * 0.28, W * 0.28].forEach((x) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, D * 0.9), alu);
    rail.position.set(x, -0.3, 0);
    group.add(rail);
  });

  const r = rng(7);
  const targets: THREE.Vector3[] = [];
  const starts: THREE.Vector3[] = [];
  const spins: THREE.Euler[] = [];
  const delays: number[] = [];
  for (let i = 0; i < cols * rows; i++) {
    const c = i % cols;
    const row = Math.floor(i / cols);
    const target = new THREE.Vector3((c - (cols - 1) / 2) * pitch, 0, (row - (rows - 1) / 2) * pitch);
    targets.push(target);
    const dir = new THREE.Vector3(r() - 0.5, 0, r() - 0.5).normalize();
    // Each cell is lowered into its slot from just above, in a diagonal wave.
    starts.push(target.clone().add(new THREE.Vector3(dir.x * (0.4 + r() * 0.6), 2.4 + r() * 1.6, dir.z * (0.4 + r() * 0.6))));
    spins.push(new THREE.Euler((r() - 0.5) * 0.7, (r() - 0.5) * 0.7, (r() - 0.5) * 0.7));
    delays.push(((c + (rows - 1 - row)) / (cols + rows - 2)) * 0.55);
  }
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const pos = new THREE.Vector3();
  const one = new THREE.Vector3(1, 1, 1);
  group.userData.assemble = (a: number) => {
    for (let i = 0; i < targets.length; i++) {
      const k = outCubic(clamp((a - delays[i]) / 0.45));
      pos.lerpVectors(starts[i], targets[i], k);
      e.set(spins[i].x * (1 - k), spins[i].y * (1 - k), spins[i].z * (1 - k));
      q.setFromEuler(e);
      const sc = 0.7 + 0.3 * k;
      m4.compose(pos, q, one.set(sc, sc, sc));
      cells.setMatrixAt(i, m4);
    }
    cells.instanceMatrix.needsUpdate = true;
  };
  // Framing is measured from the finished panel, not the scattered cells.
  group.userData.assemble(1);
  return group;
}

/* ---------------- the catalogue ---------------- */

const SPECS: Record<PropKind, Spec> = {
  // Roof Report: the panel assembles as the card arrives.
  panel: {
    make: makePanel,
    owned: true,
    pitch: 0.62,
    yaw: -0.42,
    cam: 0.32,
    fit: 1.0,
    spin: 0.35,
    tilt: 0.22,
    float: 0.015,
    shadow: 0.3,
    hook({ model }) {
      const assemble = model.userData.assemble as (a: number) => void;
      return (f) => assemble(f.still ? 1 : smooth(0.02, 0.48, f.p));
    },
  },
  // Quote Check: a lens over the quotation.
  magnifier: {
    make: () => glb("magnifier"),
    yaw: -0.35,
    roll: -0.55,
    cam: 0.12,
    fit: 1.0,
    spin: 0.3,
    tilt: 0.3,
    float: 0.015,
    shadow: 0.25,
    hook({ pose }) {
      const r0 = pose.rotation.z;
      return (f) => {
        if (f.still) return;
        // Slowly reading along the lines.
        pose.position.x = Math.sin(f.t * 0.5) * 0.08;
        pose.rotation.z = r0 + Math.sin(f.t * 0.5) * 0.05;
      };
    },
  },
  // Bill Audit: the meter that checks the arithmetic.
  multimeter: {
    make: () => glb("multimeter"),
    yaw: -0.5,
    cam: 0.16,
    fit: 1.0,
    spin: 0.4,
    tilt: 0.25,
    float: 0.015,
    shadow: 0.3,
  },
};

/* ---------------- framing ---------------- */

/** A sample of the model's surface points (rig space), for tight framing. */
function samplePoints(root: THREE.Object3D, budget = 4000): THREE.Vector3[] {
  root.updateMatrixWorld(true);
  const parts: THREE.Object3D[] = [];
  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh || (o as THREE.Sprite).isSprite) parts.push(o);
  });
  const out: THREE.Vector3[] = [];
  const per = Math.max(32, Math.floor(budget / Math.max(1, parts.length)));
  const box = new THREE.Box3();
  for (const o of parts) {
    const m = o as THREE.Mesh;
    const pos = m.geometry?.getAttribute("position");
    if ((m as THREE.InstancedMesh).isInstancedMesh || (o as THREE.Sprite).isSprite || !pos) {
      box.setFromObject(o);
      for (let i = 0; i < 8; i++) out.push(new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z));
      continue;
    }
    const step = Math.max(1, Math.floor(pos.count / per));
    for (let i = 0; i < pos.count; i += step) out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  }
  return out;
}

/**
 * For a camera raised by `elev` and looking at the origin, each point's depth
 * toward the camera and its offsets across and up the picture. Taken at a few
 * turns of the model so it stays in frame as it turns with scroll and pointer.
 */
function framingTable(points: THREE.Vector3[], elev: number, turn: number): Float32Array {
  const yaws = turn > 0.01 ? [-turn, -turn / 2, 0, turn / 2, turn] : [0];
  const t = new Float32Array(points.length * yaws.length * 3);
  const c = Math.cos(elev);
  const s = Math.sin(elev);
  let k = 0;
  for (const yaw of yaws) {
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    for (const p of points) {
      const x = p.x * cy + p.z * sy;
      const z = -p.x * sy + p.z * cy;
      t[k++] = p.y * s + z * c; // depth toward the camera
      t[k++] = Math.abs(x);
      t[k++] = Math.abs(p.y * c - z * s);
    }
  }
  return t;
}

/** Camera distance that fits every point in the table, with a margin. */
function fitDistance(t: Float32Array, tanV: number, tanH: number, margin: number) {
  let d = 0;
  for (let i = 0; i < t.length; i += 3) d = Math.max(d, t[i] + Math.max(t[i + 1] / tanH, t[i + 2] / tanV) * margin);
  return d;
}

/* ---------------- build ---------------- */

export async function buildProp(kind: PropKind, env: THREE.Texture): Promise<BuiltProp> {
  const spec = SPECS[kind];
  const model = await spec.make();

  // Each prop gets its own copies of its materials, so it can fade in on its
  // own; geometry and textures stay shared with the cache.
  const fades: { m: THREE.Material; opacity: number; transparent: boolean }[] = [];
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const own = (m: THREE.Material) => {
      const c = m.clone();
      fades.push({ m: c, opacity: c.opacity, transparent: c.transparent });
      if (spec.owned) m.dispose();
      return c;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(own) : own(mesh.material);
  });
  let faded = -1;
  const fade = (a: number) => {
    if (a === faded) return;
    faded = a;
    for (const x of fades) {
      const see = a < 1 || x.transparent;
      if (x.m.transparent !== see) {
        x.m.transparent = see;
        x.m.needsUpdate = true;
      }
      x.m.opacity = x.opacity * a;
    }
  };

  // Centre on the origin and scale to a bounding radius of 1.
  const holder = new THREE.Group();
  holder.add(model);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const r = size.length() / 2 || 1;
  const center = box.getCenter(new THREE.Vector3());
  model.position.sub(center);
  holder.scale.setScalar(1 / r);

  const pose = new THREE.Group();
  pose.rotation.set(spec.pitch ?? 0, spec.yaw ?? 0, spec.roll ?? 0, "YXZ");
  pose.add(holder);
  const rig = new THREE.Group();
  rig.add(pose);

  const scene = new THREE.Scene();
  scene.environment = env;
  scene.environmentIntensity = 0.85;
  scene.add(rig);

  const hemi = new THREE.HemisphereLight(0xe6eeff, 0xf3d6aa, 0.65);
  const key = new THREE.DirectionalLight(0xfff0d6, 2.5);
  key.position.set(-3, 5, 4);
  const rim = new THREE.DirectionalLight(0xa9bcff, 1.5);
  rim.position.set(4, 2.5, -4);
  scene.add(hemi, key, rim);
  const base = {
    hemi: hemi.intensity,
    key: key.intensity,
    rim: rim.intensity,
    env: scene.environmentIntensity,
  };

  // Extents after posing, for framing and the contact shadow.
  pose.updateMatrixWorld(true);
  const posed = new THREE.Box3().setFromObject(pose);
  const half = posed.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const mid = posed.getCenter(new THREE.Vector3());
  pose.position.sub(mid);
  const rxz = Math.hypot(half.x, half.z);

  let shadow: THREE.Mesh | null = null;
  const shadowOpacity = spec.shadow ?? 0.3;
  if (shadowOpacity > 0) {
    shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        map: contactShadow(),
        transparent: true,
        depthWrite: false,
        opacity: shadowOpacity,
        toneMapped: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -half.y - 0.02;
    shadow.scale.set(rxz * 1.7, rxz * 1.15, 1);
    shadow.renderOrder = -2;
    scene.add(shadow);
  }

  const fov = spec.fov ?? 30;
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.05, 100);
  const cam = spec.cam ?? 0.15;
  const fit = spec.fit ?? 1;
  const shift = spec.shift ?? [0, 0];
  const turnRange = Math.min(0.9, (spec.spin ?? 0.6) * 0.5 + (spec.tilt ?? 0.4) * 0.5);
  const table = framingTable(samplePoints(pose), cam, turnRange);
  const tanV = Math.tan(THREE.MathUtils.degToRad(fov) / 2);
  let lastAspect = -1;
  let dist = 4;
  const hook = spec.hook?.({ scene, rig, pose, model }) ?? null;
  const seed = Math.random() * 10;

  return {
    scene,
    camera,
    update(f, aspect, dim) {
      // Framing: the nearest camera that keeps every sampled point in the box.
      if (Math.abs(aspect - lastAspect) > 1e-3) {
        lastAspect = aspect;
        dist = Math.max(0.5, fitDistance(table, tanV, tanV * aspect, 1.06 * fit));
      }
      camera.aspect = aspect;
      camera.position.set(shift[0], Math.sin(cam) * dist + shift[1], Math.cos(cam) * dist);
      camera.lookAt(shift[0], shift[1], 0);
      camera.updateProjectionMatrix();

      // First sight: fade up and settle, a touch low and small to start.
      const rv = f.reveal;
      const settle = 1 - outExpo(rv);
      fade(outCubic(rv));
      rig.scale.setScalar(1 - settle * 0.06);
      const spin = (spec.spin ?? 0.6) * (f.p - 0.5);
      const tilt = spec.tilt ?? 0.4;
      rig.rotation.y = (f.still ? 0 : spin) + f.px * tilt - settle * 0.3;
      rig.rotation.x = f.py * tilt * 0.45;
      const bob = f.still ? 0 : Math.sin(f.t * 1.1 + seed) * (spec.float ?? 0.03);
      rig.position.y = bob - settle * 0.1;
      if (shadow) {
        const k = 1 - bob * 2;
        shadow.scale.set(rxz * 1.7 * k, rxz * 1.15 * k, 1);
        (shadow.material as THREE.MeshBasicMaterial).opacity = shadowOpacity * outCubic(rv) * (1 - dim * 0.6);
      }
      const light = 1 - dim * 0.85;
      hemi.intensity = base.hemi * light;
      key.intensity = base.key * light;
      rim.intensity = base.rim * light;
      scene.environmentIntensity = base.env * light;
      hook?.(f);
    },
    dispose() {
      // Loaded models share geometry and textures with the cache, so only the
      // material copies go; a prop built here takes its geometry and textures.
      if (spec.owned) {
        model.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
        for (const x of fades) for (const v of Object.values(x.m)) if ((v as THREE.Texture)?.isTexture) (v as THREE.Texture).dispose();
      }
      for (const x of fades) x.m.dispose();
      shadow?.geometry.dispose();
      (shadow?.material as THREE.Material | undefined)?.dispose();
      scene.clear();
    },
  };
}
