// Scroll measures for 3D props in the sticky tool cards, which stop moving
// while the page scrolls on. Each takes the prop's box and is called once a
// frame by the stage.

import type { Box } from "../three/props/stage";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

let stickCache = new WeakMap<Element, number>();
let listening = false;
function stickTop(card: Element) {
  if (!listening) {
    listening = true;
    window.addEventListener("resize", () => (stickCache = new WeakMap()), {
      passive: true,
    });
  }
  let v = stickCache.get(card);
  if (v === undefined) {
    v = parseFloat(getComputedStyle(card).top) || 0;
    stickCache.set(card, v);
  }
  return v;
}

function arrival(card: Element, H: number) {
  return clamp01((H - card.getBoundingClientRect().top) / Math.max(1, H - stickTop(card)));
}

/** Sticky stack cards: 0 to 0.5 while a card slides into place, 0.5 to 1 while the next one covers it. */
export function stackProgress(el: HTMLElement): number | null {
  const card = el.closest(".stack-card");
  if (!card) return null;
  const H = window.innerHeight;
  const next = card.nextElementSibling;
  return arrival(card, H) * 0.5 + (next ? arrival(next, H) * 0.5 : 0);
}

/** The part of a sticky card that the next card hasn't covered yet. */
export function stackClip(el: HTMLElement): Box | undefined {
  const next = el.closest(".stack-card")?.nextElementSibling?.querySelector(".stack-card__inner");
  if (!next) return undefined;
  return {
    left: -1e5,
    top: -1e5,
    right: 1e5,
    bottom: next.getBoundingClientRect().top,
  };
}

/** Matches the dark shade a receding card gets, so the object darkens with its card. */
export function stackDim(el: HTMLElement): number {
  const shade = el.closest(".stack-card")?.querySelector<HTMLElement>(".stack-card__shade");
  return shade ? (parseFloat(shade.style.opacity) || 0) / 0.85 : 0;
}

