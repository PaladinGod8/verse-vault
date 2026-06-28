import { vi } from 'vitest';

/**
 * jsdom has no IntersectionObserver. This stub captures the callback passed by the
 * component under test so a test can manually fire an intersection (simulating scroll-to-bottom).
 *
 * Headless UI's floating-ui anchor positioning also constructs its own IntersectionObserver,
 * so we can't just grab "the latest instance" - we match on the observed target instead.
 */
export function installIntersectionObserverStub() {
  const instances: { callback: IntersectionObserverCallback; target: Element; }[] = [];

  class IntersectionObserverStub {
    callback: IntersectionObserverCallback;
    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback;
    }
    observe(target: Element): void {
      instances.push({ callback: this.callback, target });
    }
    unobserve(): void {
      return undefined;
    }
    disconnect(): void {
      return undefined;
    }
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }

  vi.stubGlobal('IntersectionObserver', IntersectionObserverStub);

  return {
    triggerIntersection(target: Element, isIntersecting = true): void {
      const match = instances.find((instance) => instance.target === target);
      match?.callback(
        [{ isIntersecting } as IntersectionObserverEntry],
        match as unknown as IntersectionObserver,
      );
    },
  };
}
