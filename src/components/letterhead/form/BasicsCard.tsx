import React from 'react';
import type { ToolConfig } from '../../../letterhead/tools';
import { TagInput } from '../../templateBuilder/TagInput';
import { FormCard } from '../FormCard';
import { NumField, SegmentedControl } from '../fields';
import type { CardProps } from './cardProps';
import { FileNameField } from './FileNameField';

interface Props extends CardProps {
  tool: ToolConfig;
  nameError?: string;
}

export const BasicsCard: React.FC<Props> = ({ tool, lh, set, nameError }) => (
  <FormCard icon="bi-info-circle" title="Basics">
    <div>
      <label className="form-label" htmlFor="lh-name">Name <span className="text-danger">*</span></label>
      <input
        id="lh-name"
        className={`form-control ${nameError ? 'is-invalid' : ''}`}
        placeholder={tool.kind === 'paper' ? 'e.g. NIOS practical paper' : 'e.g. School letterhead'}
        value={lh.name}
        onChange={(e) => set({ name: e.target.value })}
      />
      {nameError && <div className="invalid-feedback">{nameError}</div>}
    </div>
    <div>
      <label className="form-label">Tags</label>
      <TagInput tags={lh.tags} onChange={(tags) => set({ tags })} />
      <div className="form-text">Tags help you find and filter your {tool.designPlural} later.</div>
    </div>
    <FileNameField lh={lh} set={set} />
    <div className="d-flex flex-wrap gap-4">
      <SegmentedControl
        label="Header placement"
        value={lh.placement}
        options={[
          { value: 'body', label: 'First page only', title: 'Part of the page, like normal text' },
          { value: 'header', label: 'Every page', title: 'Inside the Word page header, repeated on every page' },
        ]}
        onChange={(placement) => set({ placement })}
      />
      <SegmentedControl
        label="Paper size"
        value={lh.page.size}
        options={[{ value: 'A4', label: 'A4' }, { value: 'Letter', label: 'Letter' }]}
        onChange={(size) => set({ page: { ...lh.page, size } })}
      />
    </div>
    <div className="row g-3">
      <div className="col-6 col-md-4">
        <NumField
          label="Page margins"
          value={Math.round(lh.page.marginMm * 10) / 10}
          min={10}
          max={50}
          step={0.5}
          suffix="mm"
          onChange={(n) => set({ page: { ...lh.page, marginMm: n } })}
        />
      </div>
      {lh.kind === 'paper' && (
        <div className="col-6 col-md-4">
          <label className="lh-fill-label" htmlFor="lh-unit">Marks unit</label>
          <input id="lh-unit" className="form-control form-control-sm" maxLength={6} value={lh.marksUnit} onChange={(e) => set({ marksUnit: e.target.value })} />
        </div>
      )}
    </div>
  </FormCard>
);
