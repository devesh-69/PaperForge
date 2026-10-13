import { useEffect, type RefObject } from 'react';

/** Closes a popup (menu, dropdown) on outside click or Escape while it is open. */
export function useDismissable(open: boolean, close: () => void, ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close, ref]);
}
