import React, { useEffect, useRef, useState } from 'react';

interface Props {
  /** reserved height so the layout does not jump when the content appears */
  minHeight: number;
  children: React.ReactNode;
}

/** Renders its children only once scrolled near the viewport (keeps big lists cheap). */
export const LazyMount: React.FC<Props> = ({ minHeight, children }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) { setVisible(true); io.disconnect(); } },
      { rootMargin: '200px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  return <div ref={ref} style={visible ? undefined : { minHeight }}>{visible ? children : null}</div>;
};
