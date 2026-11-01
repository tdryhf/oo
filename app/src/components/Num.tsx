// A figure that moves to its new value instead of jumping, so changing an
// input reads as cause and effect. With `count` it also counts up from zero
// the first time it scrolls into view. Screen readers and live regions only
// ever get the final value.

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../lib/env";
import { EASE, gsap } from "../lib/motion";

export function Num({ value, format, count = false, testId }: { value: number; format: (v: number) => string; count?: boolean; testId?: string }) {
  const still = prefersReducedMotion();
  const [shown, setShown] = useState(() => (count && !still ? 0 : value));
  const cur = useRef(shown);
  const target = useRef(value);
  const seen = useRef(!count || still);
  const el = useRef<HTMLSpanElement>(null);
  const tween = useRef<gsap.core.Tween | null>(null);

  const go = (to: number, duration: number) => {
    tween.current?.kill();
    if (!Number.isFinite(to) || !Number.isFinite(cur.current)) {
      cur.current = to;
      setShown(to);
      return;
    }
    const o = { v: cur.current };
    tween.current = gsap.to(o, {
      v: to,
      duration,
      ease: EASE.out,
      onUpdate: () => {
        cur.current = o.v;
        setShown(o.v);
      },
    });
  };

  // Count up once, the first time the figure is on screen.
  useEffect(() => {
    if (seen.current || !el.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        seen.current = true;
        go(target.current, 1.3);
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el.current);
    return () => io.disconnect();
  }, []);

  // Glide to a changed value.
  useEffect(() => {
    target.current = value;
    if (!seen.current) return;
    if (still) {
      cur.current = value;
      setShown(value);
      return;
    }
    if (value !== cur.current) go(value, 0.55);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => () => void tween.current?.kill(), []);

  return (
    <span className="num" ref={el}>
      <span aria-hidden="true" data-testid={testId}>
        {format(shown)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}
