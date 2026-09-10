import { useState, useEffect } from 'react';
import { HeadingItem } from '../types';

export function useActiveHeading(headings: HeadingItem[], containerRef: React.RefObject<HTMLDivElement | null>) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    if (!containerRef.current || headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        root: containerRef.current,
        rootMargin: '0px 0px -70% 0px',
        threshold: 0.1,
      }
    );

    const headingElements = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);

    headingElements.forEach((el) => observer.observe(el));

    return () => {
      headingElements.forEach((el) => observer.unobserve(el));
    };
  }, [headings, containerRef]);

  return activeId;
}
