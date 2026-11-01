// One transparent WebGL canvas, fixed over the page, that draws every prop
// into the box of its placeholder element. Each prop has its own scene and
// camera; the renderer scissors to the placeholder's on-screen rectangle.
// One GPU context however many objects a page has, and nothing is drawn
// (or even ticked) while no placeholder is near the viewport.
//
// Placeholders are tracked every frame from getBoundingClientRect inside the
// GSAP ticker, which also drives Lenis, so the objects move in the same frame
// as the page they sit on.

import gsap from "gsap";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { buildProp, type BuiltProp } from "./kinds";
import type { PropKind } from "./manifest";

export interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/** What a prop sees each frame. */
export interface Frame {
  /** seconds since the stage started */
  t: number;
  /** seconds since the last frame, clamped */
  dt: number;
  /** progress of the placeholder through the viewport, 0..1 (or the page's own measure) */
  p: number;
  /** smoothed scroll velocity, px per second */
  v: number;
  /** pointer relative to the placeholder centre, about -1..1, smoothed */
  px: number;
  py: number;
  /** entrance, 0..1 */
  reveal: number;
  /** prefers-reduced-motion */
  still: boolean;
}

export interface MountOptions {
  kind: PropKind;
  el: HTMLElement;
  /** Override the scroll progress (sticky and pinned sections). */
  progress?: () => number | null;
  /** Visible region in viewport px, for placeholders that other content covers. */
  clip?: () => Box | null | undefined;
  /** 0..1 darkening, e.g. a card receding under the next one. */
  dim?: () => number;
}

interface View {
  opts: MountOptions;
  near: boolean;
  built: BuiltProp | null;
  loading: boolean;
  revealAt: number;
  px: number;
  py: number;
  dead: boolean;
}

const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));

class Stage {
  canvas: HTMLCanvasElement;
  renderer: THREE.WebGLRenderer;
  env: THREE.Texture;
  views = new Set<View>();
  io: IntersectionObserver;
  running = false;
  dirty = false;
  w = 0;
  h = 0;
  t0 = performance.now();
  lastT = 0;
  lastY = window.scrollY;
  vel = 0;
  pointer = { x: -1, y: -1, has: false };
  still = still();
  byEl = new Map<Element, View>();

  constructor() {
    const canvas = document.createElement("canvas");
    canvas.className = "prop-stage";
    canvas.setAttribute("aria-hidden", "true");
    document.body.appendChild(canvas);
    this.canvas = canvas;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      premultipliedAlpha: true,
    });
    const small = window.matchMedia("(max-width: 760px)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.autoClear = false;
    this.renderer = renderer;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    this.env = pmrem.fromScene(room, 0.035).texture;
    room.dispose?.();
    pmrem.dispose();

    this.io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = this.byEl.get(e.target);
          if (!v) continue;
          v.near = e.isIntersecting;
          if (v.near) this.load(v);
        }
        this.wake();
      },
      { rootMargin: "120% 60% 120% 60%" },
    );

    window.addEventListener(
      "pointermove",
      (e) => {
        if (e.pointerType === "touch") return;
        this.pointer.x = e.clientX;
        this.pointer.y = e.clientY;
        this.pointer.has = true;
      },
      { passive: true },
    );
    canvas.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      this.sleep();
    });
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", () => (this.still = still()));
  }

  mount(opts: MountOptions): () => void {
    const v: View = {
      opts,
      near: false,
      built: null,
      loading: false,
      revealAt: -1,
      px: 0,
      py: 0,
      dead: false,
    };
    this.views.add(v);
    this.byEl.set(opts.el, v);
    this.io.observe(opts.el);
    return () => {
      v.dead = true;
      this.io.unobserve(opts.el);
      this.byEl.delete(opts.el);
      this.views.delete(v);
      v.built?.dispose();
      v.built = null;
      this.dirty = true;
      this.wake();
    };
  }

  private load(v: View) {
    if (v.built || v.loading) return;
    v.loading = true;
    buildProp(v.opts.kind, this.env)
      .then((b) => {
        if (v.dead) return b.dispose();
        v.built = b;
        this.renderer.compile(b.scene, b.camera);
        this.wake();
      })
      .catch((err) => {
        console.warn(`[props] ${v.opts.kind} failed to load`, err);
      })
      .finally(() => (v.loading = false));
  }

  private tick = () => this.frame();

  private wake() {
    const any = [...this.views].some((v) => v.near);
    if (any && !this.running) {
      this.running = true;
      this.lastT = performance.now();
      gsap.ticker.add(this.tick);
    } else if (!any && this.running) {
      this.sleep();
    } else if (!any && this.dirty) {
      this.clear();
    }
  }

  private sleep() {
    this.running = false;
    gsap.ticker.remove(this.tick);
    this.clear();
  }

  private clear() {
    this.dirty = false;
    this.renderer.setScissorTest(false);
    this.renderer.clear(true, true, true);
  }

  private resize() {
    const w = document.documentElement.clientWidth;
    const h = window.innerHeight;
    if (w === this.w && h === this.h) return;
    this.w = w;
    this.h = h;
    this.renderer.setSize(w, h, false);
  }

  private frame() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - this.lastT) / 1000) || 1 / 60;
    this.lastT = now;
    const t = (now - this.t0) / 1000;
    const y = window.scrollY;
    const raw = (y - this.lastY) / dt;
    this.lastY = y;
    this.vel += (raw - this.vel) * (1 - Math.exp(-dt * 10));

    this.resize();
    const { w: W, h: H, renderer } = this;
    renderer.setScissorTest(false);
    renderer.clear(true, true, true);
    renderer.setScissorTest(true);
    let drew = false;

    for (const v of this.views) {
      const b = v.built;
      if (!v.near || !b) continue;
      const r = v.opts.el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      let L = Math.max(r.left, 0);
      let R = Math.min(r.right, W);
      let T = Math.max(r.top, 0);
      let B = Math.min(r.bottom, H);
      const c = v.opts.clip?.();
      if (c === null) continue;
      if (c) {
        L = Math.max(L, c.left);
        R = Math.min(R, c.right);
        T = Math.max(T, c.top);
        B = Math.min(B, c.bottom);
      }
      if (R - L < 1 || B - T < 1) continue;

      if (v.revealAt < 0) v.revealAt = t;
      const k = 1 - Math.exp(-dt * 5);
      if (this.pointer.has) {
        const tx = clamp((this.pointer.x - (r.left + r.width / 2)) / Math.max(r.width, 320), -1, 1);
        const ty = clamp((this.pointer.y - (r.top + r.height / 2)) / Math.max(r.height, 320), -1, 1);
        v.px += (tx - v.px) * k;
        v.py += (ty - v.py) * k;
      } else {
        // Touch screens: a slow sway instead of pointer tilt.
        v.px = Math.sin(t * 0.5 + r.top * 0.01) * 0.35;
        v.py = Math.cos(t * 0.4) * 0.15;
      }
      const custom = v.opts.progress?.();
      const p = custom ?? clamp((H - r.top) / (H + r.height));
      const f: Frame = {
        t,
        dt,
        p,
        v: this.vel,
        px: this.still ? 0 : v.px,
        py: this.still ? 0 : v.py,
        reveal: this.still ? 1 : clamp((t - v.revealAt) / 1.5),
        still: this.still,
      };
      b.update(f, r.width / r.height, clamp(v.opts.dim?.() ?? 0));

      renderer.setViewport(r.left, H - r.bottom, r.width, r.height);
      renderer.setScissor(L, H - B, R - L, B - T);
      renderer.render(b.scene, b.camera);
      drew = true;
    }
    this.dirty = drew;
  }
}

let stage: Stage | null = null;

/** Start drawing a prop into `el`. Returns the cleanup. */
export function mountProp(opts: MountOptions): () => void {
  stage ??= new Stage();
  if (import.meta.env.DEV) (window as unknown as { __props?: Stage }).__props = stage;
  return stage.mount(opts);
}
