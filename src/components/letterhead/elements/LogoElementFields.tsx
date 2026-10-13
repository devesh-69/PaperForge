import React, { useRef } from 'react';
import toast from 'react-hot-toast';
import { useAssetUrls } from '../../../hooks/useAssetUrls';
import { saveAsset } from '../../../letterhead/assets';
import { LOGO_MAX_PX } from '../../../letterhead/defaults';
import type { LetterheadElement, LogoElement, LogoPlacement } from '../../../letterhead/types';
import { processImageFile } from '../../../utils/imageUtils';
import { NumField, SegmentedControl } from '../fields';
import { ALIGN_OPTIONS } from './alignOptions';

interface Props {
  element: LogoElement;
  onChange: (el: LetterheadElement) => void;
}

const PLACEMENT_OPTIONS: { value: LogoPlacement; label: string; title: string }[] = [
  { value: 'above', label: 'Own row', title: 'The logo sits on its own row above the text' },
  { value: 'left', label: 'Left of heading', title: 'The logo sits beside the text lines that follow it' },
  { value: 'right', label: 'Right of heading', title: 'The logo sits beside the text lines that follow it' },
];

export const LogoElementFields: React.FC<Props> = ({ element: el, onChange }) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const placement = el.placement ?? 'above';
  const urls = useAssetUrls(el.assetId ? [el.assetId] : []);
  const thumb = el.assetId ? urls.get(el.assetId) : undefined;

  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      const img = await processImageFile(file, LOGO_MAX_PX);
      const assetId = await saveAsset(img.dataUrl, img.mimeType);
      onChange({ ...el, assetId, mimeType: img.mimeType, naturalW: img.widthPx, naturalH: img.heightPx });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not add the image.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <>
      <div className="d-flex align-items-center gap-3 flex-wrap">
        {thumb ? <img src={thumb} alt="Logo" className="lh-logo-thumb" /> : <div className="text-muted small">{el.assetId ? 'Loading…' : 'No image yet.'}</div>}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0])} />
        <button type="button" className="btn-outline-black" onClick={() => fileRef.current?.click()}>
          <i className="bi bi-upload"></i>{el.assetId ? 'Replace image' : 'Upload image'}
        </button>
        {el.assetId && (
          <button
            type="button"
            className="btn-icon danger"
            onClick={() => onChange({ ...el, assetId: undefined, mimeType: undefined, naturalW: undefined, naturalH: undefined })}
          >
            <i className="bi bi-x-lg"></i>Remove
          </button>
        )}
      </div>

      <SegmentedControl label="Logo position" value={placement} options={PLACEMENT_OPTIONS} onChange={(p) => onChange({ ...el, placement: p })} />
      {placement === 'above' ? (
        <SegmentedControl label="Align on the row" value={el.align} options={ALIGN_OPTIONS} onChange={(v) => onChange({ ...el, align: v })} />
      ) : (
        <div className="form-text mt-0">
          The logo sits beside the text lines that come right after it (up to the next divider), so put your heading, address and contact lines below it.
        </div>
      )}

      <div className="row g-2 align-items-start">
        <div className="col-sm-4"><NumField label="Width" value={el.widthMm} min={5} max={200} suffix="mm" onChange={(n) => onChange({ ...el, widthMm: n })} /></div>
        <div className="col-sm-4"><NumField label="Space before" value={el.spaceBeforePt} min={0} max={100} suffix="pt" onChange={(n) => onChange({ ...el, spaceBeforePt: n })} /></div>
        <div className="col-sm-4"><NumField label="Space after" value={el.spaceAfterPt} min={0} max={100} suffix="pt" onChange={(n) => onChange({ ...el, spaceAfterPt: n })} /></div>
      </div>
    </>
  );
};
