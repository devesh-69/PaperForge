import React, { useMemo } from 'react';
import { useAssetUrls } from '../../../hooks/useAssetUrls';
import { assetIdsOf } from '../../../letterhead/assets';
import { createPaperDoc } from '../../../letterhead/defaults';
import { buildDocument } from '../../../letterhead/layout';
import type { Letterhead } from '../../../letterhead/types';
import { BlockView } from '../LayoutBlocks';
import { ScaledPage } from '../ScaledPage';

export const THUMB_HEIGHT = 190;

/** A small picture of the design (top of the page), drawn from the same layout as the real output. */
export const DesignThumb: React.FC<{ design: Letterhead }> = ({ design }) => {
  const assets = useAssetUrls(assetIdsOf(design));
  const built = useMemo(() => buildDocument(design, createPaperDoc(design), 'preview', assets), [design, assets]);
  return (
    <ScaledPage page={built.page} fontFamily={design.body.fontFamily} maxHeight={THUMB_HEIGHT}>
      {built.header && <BlockView block={built.header} />}
      {built.header && <div className="lh-header-gap" />}
      {built.body.map((b, i) => <BlockView key={i} block={b} />)}
    </ScaledPage>
  );
};
