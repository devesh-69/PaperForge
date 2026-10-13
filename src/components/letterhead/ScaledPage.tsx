import React, { useLayoutEffect, useRef, useState } from 'react';
import { fontCss } from '../../letterhead/defaults';
import type { PageGeometry } from '../../letterhead/blocks';

interface Props {
  page: PageGeometry;
  fontFamily: string;
  /** crop the page to this height (px, after scaling) — used for card thumbnails */
  maxHeight?: number;
  children: React.ReactNode;
}

/** A page drawn at real size and scaled down to fit the width of its column. */
export const ScaledPage: React.FC<Props> = ({ page, fontFamily, maxHeight, children }) => {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(page.heightPx);

  useLayoutEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const update = () => {
      const s = Math.min(1, wrap.clientWidth / page.widthPx);
      setScale(s);
      const h = (pageRef.current?.offsetHeight ?? page.heightPx) * s;
      setHeight(maxHeight ? Math.min(h, maxHeight) : h);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    if (pageRef.current) ro.observe(pageRef.current);
    return () => ro.disconnect();
  }, [page, maxHeight]);

  return (
    <div className="lh-scaler" ref={wrapRef} style={{ height }}>
      <div
        ref={pageRef}
        className="lh-page"
        style={{
          width: page.widthPx,
          minHeight: page.heightPx,
          padding: page.marginPx,
          transform: `scale(${scale})`,
          fontFamily: fontCss(fontFamily),
        }}
      >
        {children}
      </div>
    </div>
  );
};
