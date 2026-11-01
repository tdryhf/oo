// A box on the page that a 3D object is drawn into. The drawing happens on
// one shared canvas (src/three/props/stage.ts), loaded only when the first
// prop mounts, so pages that name a prop don't pull three.js in up front.

import { useEffect, useLayoutEffect, useRef } from "react";
import { hasWebGL } from "../lib/env";
import type { PropKind } from "../three/props/manifest";
import type { Box } from "../three/props/stage";
import "../styles/props.css";

export interface Prop3DProps {
  kind: PropKind;
  className?: string;
  /** Override scroll progress 0..1 (pinned or sticky sections). Called every frame with the box. */
  progress?: (el: HTMLElement) => number | null;
  /** Visible region in viewport px when other content covers the box. */
  clip?: (el: HTMLElement) => Box | null | undefined;
  /** 0..1 darkening. */
  dim?: (el: HTMLElement) => number;
}

export function Prop3D({ kind, className, progress, clip, dim }: Prop3DProps) {
  const ref = useRef<HTMLDivElement>(null);
  const fns = useRef({ progress, clip, dim });
  useLayoutEffect(() => {
    fns.current = { progress, clip, dim };
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || !hasWebGL()) return;
    let off: (() => void) | null = null;
    let dead = false;
    import("../three/props/stage")
      .then(({ mountProp }) => {
        if (dead) return;
        off = mountProp({
          kind,
          el,
          progress: () => fns.current.progress?.(el) ?? null,
          clip: () => fns.current.clip?.(el),
          dim: () => fns.current.dim?.(el) ?? 0,
        });
      })
      .catch(() => {
        /* no 3D is fine: the box stays empty */
      });
    return () => {
      dead = true;
      off?.();
    };
  }, [kind]);

  // Without WebGL there is nothing to draw, so the box takes no room either.
  if (!hasWebGL()) return null;
  return <div ref={ref} className={`prop${className ? ` ${className}` : ""}`} data-prop={kind} aria-hidden="true" />;
}
