import { useEffect, useRef, useState, type RefObject } from 'react';

interface FittedPageSizeOptions {
  min?: number;
  max?: number;
  rowSelector?: string;
}

export interface FittedPageSizeResult {
  size: number;
  rowHeight: number | undefined;
}

const DEFAULT_MIN = 5;
const DEFAULT_MAX = 50;
const DEFAULT_ROW_SELECTOR = '[data-record-row]';

/**
 * Computes how many rows fit the container's current height by measuring an
 * already-rendered row (real line-height/border included), instead of a
 * hardcoded pixel guess that drifts whenever the row's CSS changes. It also
 * returns `rowHeight`, so every row can be forced to that exact height (via a
 * CSS custom property) and fill the pane evenly instead of varying with each
 * row's own content (secondary text, meta, ...).
 *
 * `rowHeight` never goes below the row's natural rendered height (captured
 * once, before any override is applied) — it only stretches rows to fill
 * leftover space, it never compresses them. `size` is however many rows
 * actually fit at that natural height (capped by `max`); `min` is only a
 * fallback for the degenerate case where the container isn't measurable yet,
 * never a floor forcing more rows than actually fit — that would force
 * `rowHeight` back down below natural and reintroduce an internal scrollbar.
 *
 * `itemCount` should be the length of the list currently rendered inside
 * `containerRef`, so a recompute is triggered right after a fetch renders
 * fresh rows to measure against.
 */
export function useFittedPageSize(
  containerRef: RefObject<HTMLElement | null>,
  itemCount: number,
  initialSize: number,
  options?: FittedPageSizeOptions,
): FittedPageSizeResult {
  const min = options?.min ?? DEFAULT_MIN;
  const max = options?.max ?? DEFAULT_MAX;
  const rowSelector = options?.rowSelector ?? DEFAULT_ROW_SELECTOR;
  const [result, setResult] = useState<FittedPageSizeResult>({ size: initialSize, rowHeight: undefined });
  const naturalHeightRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const compute = () => {
      if (naturalHeightRef.current === undefined) {
        const rowEl = el.querySelector<HTMLElement>(rowSelector);
        const measured = rowEl?.getBoundingClientRect().height;
        if (!measured) return;
        naturalHeightRef.current = measured;
      }
      const natural = naturalHeightRef.current;
      const naturalRows = Math.floor(el.clientHeight / natural);
      const rows = naturalRows > 0 ? Math.min(max, naturalRows) : min;
      const rowHeight = Math.max(natural, el.clientHeight / rows);
      setResult((current) => (current.size === rows && current.rowHeight === rowHeight ? current : { size: rows, rowHeight }));
    };

    compute();
    const observer = new ResizeObserver(compute);
    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, itemCount, rowSelector, min, max]);

  return result;
}
