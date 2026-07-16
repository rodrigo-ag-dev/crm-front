import { useEffect, useRef } from 'react';

export const useFocusFirstInput = (dependency: any = true) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dependency) return;

    const timer = setTimeout(() => {
      if (containerRef.current) {
        const focusableElements = containerRef.current.querySelectorAll(
          'input, textarea, select'
        ) as NodeListOf<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;

        if (focusableElements.length > 0) {
          focusableElements[0].focus();
        }
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [dependency]);

  return containerRef;
};