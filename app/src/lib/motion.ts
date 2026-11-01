// Shared motion vocabulary. One set of eases and one reveal pattern for the
// whole product, so every page moves the same way.
//
//   out   – entrances (expo-ish settle)
//   inOut – things travelling between two on-screen states
//   drawer – the route curtain

import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { formatCount, parseCount } from "./count";
import { prefersReducedMotion } from "./env";

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

export const EASE = {
  out: CustomEase.create("chhat-out", "M0,0 C0.16,1 0.3,1 1,1"),
  inOut: CustomEase.create("chhat-inout", "M0,0 C0.76,0 0.24,1 1,1"),
  drawer: CustomEase.create("chhat-drawer", "M0,0 C0.32,0.72 0,1 1,1"),
};

export { gsap, ScrollTrigger, SplitText };

const fine = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/**
 * Line-by-line masked reveal for display type. Splits after fonts load,
 * re-splits on resize (autoSplit) and restores the DOM on cleanup.
 */
export function revealLines(
  el: HTMLElement,
  opts: { delay?: number; stagger?: number; duration?: number; scroll?: boolean; start?: string } = {},
): () => void {
  if (prefersReducedMotion()) return () => {};
  const { delay = 0, stagger = 0.09, duration = 1.05, scroll = true, start = "top 88%" } = opts;
  let split: SplitText | null = null;
  let cancelled = false;
  // Hide until the split is ready so there is no flash of unsplit text.
  gsap.set(el, { autoAlpha: 0 });
  document.fonts.ready.then(() => {
    if (cancelled) return;
    gsap.set(el, { autoAlpha: 1 });
    split = SplitText.create(el, {
      type: "lines",
      mask: "lines",
      linesClass: "split-line",
      autoSplit: true,
      onSplit(self) {
        return gsap.from(self.lines, {
          yPercent: 110,
          duration,
          ease: EASE.out,
          stagger,
          delay,
          scrollTrigger: scroll ? { trigger: el, start, once: true } : undefined,
        });
      },
    });
  });
  return () => {
    cancelled = true;
    split?.revert();
  };
}

/** Reveal every `[data-reveal]` inside a container as it scrolls into view. */
export function useReveals(root: RefObject<HTMLElement>, deps: unknown[] = []) {
  useLayoutEffect(() => {
    const host = root.current;
    if (!host || prefersReducedMotion()) return;
    const undo: (() => void)[] = [];
    const ctx = gsap.context(() => {
      host.querySelectorAll<HTMLElement>("[data-reveal='lines']").forEach((el) => undo.push(revealLines(el)));
      const fades = host.querySelectorAll<HTMLElement>("[data-reveal='up']");
      if (fades.length) {
        gsap.set(fades, { autoAlpha: 0, y: 28 });
        ScrollTrigger.batch(fades, {
          start: "top 90%",
          once: true,
          onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.9, ease: EASE.out, stagger: 0.07, overwrite: true }),
        });
      }
    }, host);
    return () => {
      undo.forEach((f) => f());
      ctx.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/** Buttons that lean toward the pointer, then spring back. Fine pointers only. */
export function useMagnetic<T extends HTMLElement>(strength = 0.32) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !fine() || prefersReducedMotion()) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.45)" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.45)" });
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * strength);
      yTo((e.clientY - (r.top + r.height / 2)) * strength);
    };
    const leave = () => {
      xTo(0);
      yTo(0);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
      gsap.set(el, { x: 0, y: 0 });
    };
  }, [strength]);
  return ref;
}

/**
 * Count a number up when it scrolls into view. The element's text is the
 * final value; prefix, suffix and Indian digit grouping are preserved.
 */
export function countUp(el: HTMLElement): () => void {
  const final = el.textContent ?? "";
  const spec = parseCount(final);
  if (!spec || prefersReducedMotion()) return () => {};
  const obj = { v: 0 };
  el.textContent = formatCount(spec, 0);
  const tween = gsap.to(obj, {
    v: spec.target,
    duration: 1.6,
    ease: "power3.out",
    scrollTrigger: { trigger: el, start: "top 92%", once: true },
    onUpdate: () => {
      el.textContent = formatCount(spec, obj.v);
    },
    onComplete: () => {
      el.textContent = final;
    },
  });
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    el.textContent = final;
  };
}

// ---------------------------------------------------------------- page reveals
//
// A tool page reveals in blocks: every outermost <section>, plus anything
// marked data-reveal ("clip" opens like a window instead of rising).
// Children of a [data-stagger] list follow their block one by one, and a
// [data-stamp] (a grade, a verdict mark) lands like a rubber stamp.
// Only opacity and transform move, so text stays readable to tests and
// screen readers the whole time.

const BLOCK = "section, [data-reveal]";
const FROM_UP = { opacity: 0, y: 28 };
const FROM_CLIP = { opacity: 0, clipPath: "inset(6% 4% 6% 4% round 28px)" };
const FROM_ITEM = { opacity: 0, y: 12 };
// Relative, so a mark that rests at an angle (the grade sits at -8deg) lands back on it.
const FROM_STAMP = { opacity: 0, scale: 1.4, rotate: "-=12" };

function outermost(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(BLOCK)].filter((el) => {
    if (el.closest(".page__head")) return false;
    const up = el.parentElement?.closest(BLOCK);
    return !up || !root.contains(up);
  });
}

function itemsOf(block: HTMLElement): HTMLElement[] {
  const lists = [...block.querySelectorAll<HTMLElement>("[data-stagger]")];
  if (block.matches("[data-stagger]")) lists.unshift(block);
  return lists.flatMap((l) => [...l.children] as HTMLElement[]);
}

const stampsOf = (block: HTMLElement) => [...block.querySelectorAll<HTMLElement>("[data-stamp]")];

function enterBlock(b: HTMLElement, delay: number) {
  if (b.dataset.reveal === "clip") {
    gsap.to(b, { opacity: 1, duration: 0.3, delay, ease: "none" });
    gsap.to(b, { clipPath: "inset(0% 0% 0% 0% round 0px)", duration: 1.15, delay, ease: EASE.out, clearProps: "clipPath,opacity" });
  } else {
    gsap.to(b, { opacity: 1, y: 0, duration: 0.75, delay, ease: EASE.out, clearProps: "opacity,transform" });
  }
  stampsOf(b).forEach((s) => gsap.to(s, { opacity: 1, scale: 1, rotate: "+=12", duration: 0.55, delay: delay + 0.2, ease: EASE.out, clearProps: "opacity,transform" }));
}

function enterItems(items: HTMLElement[], delay: number) {
  gsap.to(items, { opacity: 1, y: 0, duration: 0.5, delay, ease: EASE.out, stagger: Math.min(0.05, 0.36 / items.length), clearProps: "opacity,transform" });
}

/**
 * Entrance for a tool page. The title rises line by line once the route
 * curtain has lifted and the rest of the header follows. Blocks already on
 * screen arrive in reading order right behind it, quick enough that nobody
 * waits on them; the rest arrive as they scroll into view.
 */
export function usePageIntro<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root || prefersReducedMotion()) return;
    const undo: (() => void)[] = [];
    let raf = 0;
    let refresh = 0;
    const ctx = gsap.context(() => {
      const title = root.querySelector<HTMLElement>(".page__title");
      if (title) undo.push(revealLines(title, { scroll: false, delay: 0.32, stagger: 0.08 }));
      const rest = root.querySelectorAll<HTMLElement>(".page__head > :not(.page__title):not(.art)");
      if (rest.length) gsap.from(rest, { autoAlpha: 0, y: 16, duration: 0.8, ease: EASE.out, stagger: 0.06, delay: 0.42 });

      const blocks = outermost(root);
      if (!blocks.length) return;
      const clips = blocks.filter((b) => b.dataset.reveal === "clip");
      gsap.set(blocks.filter((b) => !clips.includes(b)), FROM_UP);
      gsap.set(clips, FROM_CLIP);
      gsap.set(blocks.flatMap(itemsOf), FROM_ITEM);
      gsap.set(blocks.flatMap(stampsOf), FROM_STAMP);

      // The router scrolls to the top after this runs, so measure against the document.
      const fold = window.innerHeight * 0.95;
      const top = (el: HTMLElement) => el.getBoundingClientRect().top + window.scrollY;
      const onScreen = blocks
        .filter((b) => top(b) < fold)
        .sort((a, b) => top(a) - top(b) || a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      const shown = new Set<HTMLElement>();
      onScreen.forEach((b, i) => {
        const d = 0.34 + Math.min(i, 4) * 0.06;
        enterBlock(b, d);
        const items = itemsOf(b).filter((k) => top(k) < fold);
        items.forEach((k) => shown.add(k));
        if (items.length) enterItems(items, d + 0.12);
      });
      const laterBlocks = blocks.filter((b) => !onScreen.includes(b));
      const laterItems = blocks.flatMap(itemsOf).filter((k) => !shown.has(k));

      // Wait two frames so the scroll reset has happened before triggers measure.
      raf = requestAnimationFrame(() => {
        raf = requestAnimationFrame(() =>
          ctx.add(() => {
            if (laterBlocks.length)
              ScrollTrigger.batch(laterBlocks, { start: "top 92%", once: true, onEnter: (batch) => batch.forEach((b, i) => enterBlock(b as HTMLElement, i * 0.07)) });
            // Same start line as blocks, so a list never plays before its card is visible.
            if (laterItems.length) ScrollTrigger.batch(laterItems, { start: "top 92%", once: true, onEnter: (batch) => enterItems(batch as HTMLElement[], 0.12) });
          }),
        );
      });
    }, root);
    // Late content (fonts, the 3D view, a parsed document) moves blocks down; keep triggers honest.
    const ro = new ResizeObserver(() => {
      clearTimeout(refresh);
      refresh = window.setTimeout(() => ScrollTrigger.refresh(), 200);
    });
    ro.observe(root);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(refresh);
      ro.disconnect();
      undo.forEach((f) => f());
      ctx.revert();
    };
  }, []);
  return ref;
}

/** Re-stamp a verdict mark when its value changes. The first stamp belongs to the page intro. */
export function useRestamp<T extends HTMLElement>(key: unknown) {
  const ref = useRef<T>(null);
  const first = useRef(true);
  useLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    gsap.from(el, { opacity: 0.3, scale: 1.25, rotate: "-=6", duration: 0.45, ease: EASE.out, overwrite: true, clearProps: "opacity,transform" });
  }, [key]);
  return ref;
}

/** Fade in list items that were not there last render (a new finding after an edit). */
export function useNewItems<T extends HTMLElement>(key: string) {
  const ref = useRef<T>(null);
  const seen = useRef<Set<string> | null>(null);
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    const kids = [...host.children] as HTMLElement[];
    const before = seen.current;
    seen.current = new Set(kids.map((k) => k.dataset.key ?? ""));
    if (!before || prefersReducedMotion()) return;
    const fresh = kids.filter((k) => !before.has(k.dataset.key ?? ""));
    if (fresh.length) gsap.fromTo(fresh, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.45, ease: EASE.out, stagger: 0.04, clearProps: "opacity,transform" });
  }, [key]);
  return ref;
}
