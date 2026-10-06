import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

function useInfiniteCarousel(itemCount, itemsPerView, enabled) {
  const carouselRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const copyCount = itemCount < 2
    ? 1
    : itemCount >= itemsPerView
      ? 3
      : Math.ceil(itemsPerView / itemCount) + 5;
  const copies = Array.from({ length: copyCount }, (_, index) => index);

  const getCycleWidth = useCallback((carousel) => {
    const firstCard = carousel?.firstElementChild;
    if (!carousel || !firstCard) return 0;

    const gap = Number.parseFloat(window.getComputedStyle(carousel).columnGap) || 0;
    return (firstCard.getBoundingClientRect().width + gap) * itemCount;
  }, [itemCount]);

  const scroll = useCallback((direction = 1) => {
    const carousel = carouselRef.current;
    const firstCard = carousel?.firstElementChild;
    if (!carousel || !firstCard) return;

    const gap = Number.parseFloat(window.getComputedStyle(carousel).columnGap) || 0;
    carousel.scrollBy({
      left: direction * (firstCard.getBoundingClientRect().width + gap),
      behavior: 'smooth',
    });
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = window.setTimeout(() => {
      const carousel = carouselRef.current;
      const cycleWidth = getCycleWidth(carousel);
      if (!carousel || !cycleWidth) return;

      const rightBoundary = carousel.scrollWidth - carousel.clientWidth - cycleWidth;
      if (rightBoundary <= cycleWidth) return;

      let nextScrollLeft = carousel.scrollLeft;
      while (nextScrollLeft < cycleWidth) nextScrollLeft += cycleWidth;
      while (nextScrollLeft > rightBoundary) nextScrollLeft -= cycleWidth;
      if (nextScrollLeft === carousel.scrollLeft) return;

      const previousScrollBehavior = carousel.style.scrollBehavior;
      carousel.style.scrollBehavior = 'auto';
      carousel.scrollLeft = nextScrollLeft;
      requestAnimationFrame(() => {
        carousel.style.scrollBehavior = previousScrollBehavior;
      });
    }, 120);
  }, [getCycleWidth]);

  useLayoutEffect(() => {
    const carousel = carouselRef.current;
    const cycleWidth = getCycleWidth(carousel);
    if (!carousel || !cycleWidth) return;
    carousel.scrollLeft = cycleWidth * Math.floor(copyCount / 2);
  }, [copyCount, getCycleWidth]);

  useEffect(() => () => {
    if (scrollTimeoutRef.current) window.clearTimeout(scrollTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!enabled || itemCount < 2
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const intervalId = window.setInterval(() => {
      const carousel = carouselRef.current;
      if (!carousel || carousel.matches(':hover')
        || carousel.contains(document.activeElement)
        || document.visibilityState !== 'visible') return;
      scroll();
    }, 3000);

    return () => window.clearInterval(intervalId);
  }, [enabled, itemCount, scroll]);

  return { carouselRef, copies, handleScroll, scroll };
}

export default useInfiniteCarousel;
