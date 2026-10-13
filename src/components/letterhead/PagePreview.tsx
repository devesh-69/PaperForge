import React, { useMemo } from 'react';
import { useAssetUrls } from '../../hooks/useAssetUrls';
import { assetIdsOf } from '../../letterhead/assets';
import { buildDocument } from '../../letterhead/layout';
import type { Letterhead, PaperDoc } from '../../letterhead/types';
import { BlockView } from './LayoutBlocks';
import { ScaledPage } from './ScaledPage';

interface Props {
  letterhead: Letterhead;
  doc: PaperDoc;
}

/** Live A4 / Letter preview. Shares its layout model with the .docx and PDF output. */
export const PagePreview: React.FC<Props> = ({ letterhead, doc }) => {
  const ids = assetIdsOf(letterhead, doc);
  const assets = useAssetUrls(ids);
  const built = useMemo(() => buildDocument(letterhead, doc, 'preview', assets), [letterhead, doc, assets]);

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="text-muted small fw-600">Preview ({letterhead.page.size})</span>
        {letterhead.placement === 'header' && (
          <span className="text-muted small"><i className="bi bi-arrow-repeat me-1"></i>Header repeats on every page</span>
        )}
      </div>
      <ScaledPage page={built.page} fontFamily={letterhead.body.fontFamily}>
        {built.header && <BlockView block={built.header} />}
        {built.header && <div className="lh-header-gap" />}
        {built.body.map((b, i) => <BlockView key={i} block={b} />)}
      </ScaledPage>
    </div>
  );
};
