import { useCallback, useEffect, useRef } from 'react';
import { useBlocker } from 'react-router-dom';

const MESSAGE = 'You have unsaved changes. Leave without saving?';

/**
 * Asks before the user leaves the page (tab close, back button, navbar links)
 * while `dirty` is true. Call `markClean()` right before navigating away on purpose.
 */
export function useUnsavedGuard(dirty: boolean): { markClean: () => void } {
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => dirtyRef.current && currentLocation.pathname !== nextLocation.pathname,
  );
  useEffect(() => {
    if (blocker.state !== 'blocked') return;
    if (window.confirm(MESSAGE)) blocker.proceed();
    else blocker.reset();
  }, [blocker]);

  const markClean = useCallback(() => {
    dirtyRef.current = false;
  }, []);
  return { markClean };
}
