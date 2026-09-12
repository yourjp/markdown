import { useState, useEffect, useRef } from 'react';
import { HeadingItem } from '../types';

export function useActiveHeading(
  headings: HeadingItem[],
  containerRef: React.RefObject<HTMLDivElement | null>
): [string, (id: string) => void] {
  const [activeId, setActiveId] = useState<string>('');
  const tickingRef = useRef<boolean>(false);

  useEffect(() => {
    if (!containerRef.current || headings.length === 0) return;

    const container = containerRef.current;

    const updateActiveHeading = () => {
      const headingElements = headings
        .map((h) => ({ id: h.id, el: document.getElementById(h.id) }))
        .filter((h): h is { id: string; el: HTMLElement } => h.el !== null);

      if (headingElements.length === 0) return;

      let currentActiveId = headingElements[0].id;
      for (const h of headingElements) {
        if (h.el.offsetTop <= container.scrollTop + 80) {
          currentActiveId = h.id;
        } else {
          break;
        }
      }

      setActiveId(currentActiveId);
      tickingRef.current = false;
    };

    const handleScroll = () => {
      if (!tickingRef.current) {
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

  return [activeId, setActiveId];
}
