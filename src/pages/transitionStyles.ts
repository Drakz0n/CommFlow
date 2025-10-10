export type SlideDirection = 'left' | 'right' | 'up' | 'down';

/**
 * Animation configuration for smooth view transitions.
 * Creates polished UX that makes navigation feel responsive rather than jarring.
 */
export const slideTransitionStyles: Record<SlideDirection, { enter: string; exit: string }> = {
  left: {
    enter: 'slide-in-left',
    exit: 'slide-out-right',
  },
  right: {
    enter: 'slide-in-right',
    exit: 'slide-out-left',
  },
  up: {
    enter: 'slide-in-up',
    exit: 'slide-out-down',
  },
  down: {
    enter: 'slide-in-down',
    exit: 'slide-out-up',
  },
};
