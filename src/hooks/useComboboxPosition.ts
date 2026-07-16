import { useEffect, useState, type RefObject } from 'react';

interface ComboboxPosition {
  openUpward: boolean;
  maxHeight: number;
}

const DEFAULT_MAX_HEIGHT = 260;
const MIN_HEIGHT = 120;
const VIEWPORT_MARGIN = 16;

export function useComboboxPosition(wrapperRef: RefObject<HTMLElement | null>, isOpen: boolean): ComboboxPosition {
  const [position, setPosition] = useState<ComboboxPosition>({ openUpward: false, maxHeight: DEFAULT_MAX_HEIGHT });

  useEffect(() => {
    if (!isOpen || !wrapperRef.current) return;

    const rect = wrapperRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    const spaceAbove = rect.top - VIEWPORT_MARGIN;

    if (spaceBelow >= MIN_HEIGHT || spaceBelow >= spaceAbove) {
      setPosition({ openUpward: false, maxHeight: Math.max(MIN_HEIGHT, Math.min(DEFAULT_MAX_HEIGHT, spaceBelow)) });
    } else {
      setPosition({ openUpward: true, maxHeight: Math.max(MIN_HEIGHT, Math.min(DEFAULT_MAX_HEIGHT, spaceAbove)) });
    }
  }, [isOpen, wrapperRef]);

  return position;
}
