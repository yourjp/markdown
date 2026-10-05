import { useState, useEffect, useRef } from 'react';
import { HeadingItem } from '../types';

export function useActiveHeading(
  headings: HeadingItem[],
  containerRef: React.RefObject<HTMLDivElement | null>
): [string, (id: string) => void] {
  const [activeId, setActiveId] = useState<string>('');
  const tickingRef = useRef<boolean>(false);
  const isProgrammaticRef = useRef<boolean>(false);
  const timerRef = useRef<number | null>(null);

  const manualSetActiveId = (id: string) => {
    setActiveId(id);
    isProgrammaticRef.current = true;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      isProgrammaticRef.current = false;
    }, 400);
  };

  useEffect(() => {
    if (!containerRef.current || headings.length === 0) return;

    const container = containerRef.current;

    const updateActiveHeading = () => {
      if (isProgrammaticRef.current) {
        tickingRef.current = false;
        return;
      }

      const containerRect = container.getBoundingClientRect();
      const headingElements = headings
        .map((h) => ({ id: h.id, el: document.getElementById(h.id) }))
        .filter((h): h is { id: string; el: HTMLElement } => h.el !== null);

      if (headingElements.length === 0) {
        tickingRef.current = false;
        return;
      }

      let currentActiveId = headingElements[0].id;
      for (const h of headingElements) {
        const rect = h.el.getBoundingClientRect();
        if (rect.top <= containerRect.top + 100) {
          currentActiveId = h.id;
        } else {
          break;
        }
      }

      setActiveId(currentActiveId);
      tickingRef.current = false;
    };

    const handleScroll = () => {
      if (!tickingRef.current && !isProgrammaticRef.current) {
        tickingRef.current = true;
        requestAnimationFrame(updateActiveHeading);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    updateActiveHeading();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [headings, containerRef]);

  return [activeId, manualSetActiveId];
}
