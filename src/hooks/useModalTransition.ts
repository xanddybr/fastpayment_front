import { useEffect, useState } from 'react';

const TRANSITION_MS = 250;

/** Keeps a modal mounted long enough to play its exit transition before unmounting. */
export function useModalTransition(open: boolean, durationMs: number = TRANSITION_MS) {
  const [mounted, setMounted] = useState(open);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setShow(true));
      return () => cancelAnimationFrame(raf);
    }

    setShow(false);
    const timeout = setTimeout(() => setMounted(false), durationMs);
    return () => clearTimeout(timeout);
  }, [open, durationMs]);

  return { mounted, show };
}
