import React from 'react';
import { MAX_PALETTE } from '../../../letterhead/defaults';
import { FormCard } from '../FormCard';
import { ColorField, NumField } from '../fields';
import type { CardProps } from './cardProps';

export const ColoursCard: React.FC<CardProps> = ({ lh, set }) => (
  <FormCard icon="bi-palette" title="Colours" hint="Brand colours show up as one-click swatches in every colour field. You can also type any hex code.">
    <div>
      <div className="lh-fill-label">Palette ({lh.palette.length}/{MAX_PALETTE})</div>
      <div className="lh-color">
        {lh.palette.map((c, i) => (
          <span key={i} className="d-inline-flex align-items-center gap-1">
            <input
              type="color"
              aria-label={`Palette colour ${i + 1}`}
              value={c}
              onChange={(e) => set({ palette: lh.palette.map((p, j) => (j === i ? e.target.value.toLowerCase() : p)) })}
            />
            <button
              type="button"
              className="btn-icon danger lh-palette-remove"
              aria-label={`Remove palette colour ${i + 1}`}
              onClick={() => set({ palette: lh.palette.filter((_, j) => j !== i) })}
            >
              <i className="bi bi-x"></i>
            </button>
          </span>
        ))}
        {lh.palette.length < MAX_PALETTE && (
          <button type="button" className="btn-icon" onClick={() => set({ palette: [...lh.palette, '#334155'] })}>
            <i className="bi bi-plus-lg"></i>Add colour
          </button>
        )}
      </div>
    </div>

    <div>
      <div className="form-check mb-2">
        <input
          id="lh-band"
          className="form-check-input"
          type="checkbox"
          checked={lh.bandColor !== null}
          onChange={(e) => set({ bandColor: e.target.checked ? (lh.palette[0] ?? '#fff7ed') : null })}
        />
        <label className="form-check-label" htmlFor="lh-band">Coloured background behind the header</label>
      </div>
      {lh.bandColor !== null && (
        <ColorField label="Background colour" value={lh.bandColor} palette={lh.palette} onChange={(c) => set({ bandColor: c })} />
      )}
    </div>

    <div>
      <div className="form-check mb-2">
        <input
          id="lh-frame"
          className="form-check-input"
          type="checkbox"
          checked={lh.frame.enabled}
          onChange={(e) => set({ frame: { ...lh.frame, enabled: e.target.checked } })}
        />
        <label className="form-check-label" htmlFor="lh-frame">Border around the header</label>
      </div>
      {lh.frame.enabled && (
        <div className="d-flex flex-wrap gap-3 align-items-start">
          <ColorField label="Border colour" value={lh.frame.color} palette={lh.palette} onChange={(c) => set({ frame: { ...lh.frame, color: c } })} />
          <div className="lh-narrow-field">
            <NumField label="Thickness" value={lh.frame.widthPt} min={0.25} max={8} step={0.25} suffix="pt" onChange={(n) => set({ frame: { ...lh.frame, widthPt: n } })} />
          </div>
        </div>
      )}
    </div>
  </FormCard>
);
