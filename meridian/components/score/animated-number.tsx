"use client";

import * as React from "react";
import { animate, useReducedMotion } from "motion/react";

/**
 * A number that counts up to its value.
 *
 * Under a reduced-motion preference it renders the final value immediately —
 * the count is decoration, and the number is the content. The animated value
 * is only ever written from Motion's own callback, so React is never asked to
 * re-render itself in a loop.
 */
export function AnimatedNumber({
  value,
  duration = 1.1,
  decimals = 0,
  format,
  className,
}: {
  value: number;
  duration?: number;
  decimals?: number;
  format?: (n: number) => string;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const [animated, setAnimated] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (reduceMotion) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setAnimated,
    });
    return () => controls.stop();
  }, [value, duration, reduceMotion]);

  const display = reduceMotion ? value : (animated ?? 0);
  const rendered = format ? format(display) : display.toFixed(decimals);

  return (
    <span className={className} aria-hidden>
      {rendered}
    </span>
  );
}
