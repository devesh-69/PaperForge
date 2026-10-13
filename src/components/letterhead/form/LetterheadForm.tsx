import React, { useMemo, useState } from 'react';
import type { Letterhead } from '../../../letterhead/types';
import type { ToolConfig } from '../../../letterhead/tools';
import { Tabs, type TabItem } from '../../common/Tabs';
import { BasicsCard } from './BasicsCard';
import { BodyCard } from './BodyCard';
import { ColoursCard } from './ColoursCard';
import { DefaultBodyCard } from './DefaultBodyCard';
import { DetailFieldsCard } from './DetailFieldsCard';
import { ElementsCard } from './ElementsCard';

type Section = 'basics' | 'colours' | 'header' | 'details' | 'body';

const SECTIONS: TabItem<Section>[] = [
  { id: 'basics', label: 'Basics' },
  { id: 'colours', label: 'Colours' },
  { id: 'header', label: 'Header' },
  { id: 'details', label: 'Details table' },
  { id: 'body', label: 'Body' },
];

interface Props {
  tool: ToolConfig;
  value: Letterhead;
  onChange: (next: Letterhead) => void;
  nameError?: string;
}

/** The whole designer, one section at a time (tabs) instead of one long scroll. */
export const LetterheadForm: React.FC<Props> = ({ tool, value, onChange, nameError }) => {
  const [section, setSection] = useState<Section>('basics');
  const set = (patch: Partial<Letterhead>) => onChange({ ...value, ...patch });
  // a name error lives on the Basics tab, so bring the user back to it
  const current: Section = nameError ? 'basics' : section;
  const tabs = useMemo(() => SECTIONS, []);

  return (
    <>
      <Tabs tabs={tabs} value={current} onChange={setSection} ariaLabel={`${tool.designSingular} sections`} />
      {current === 'basics' && <BasicsCard tool={tool} lh={value} set={set} nameError={nameError} />}
      {current === 'colours' && <ColoursCard lh={value} set={set} />}
      {current === 'header' && <ElementsCard lh={value} set={set} />}
      {current === 'details' && <DetailFieldsCard lh={value} set={set} />}
      {current === 'body' && (
        <>
          {value.kind === 'letter' && <DefaultBodyCard lh={value} set={set} />}
          <BodyCard lh={value} set={set} />
        </>
      )}
    </>
  );
};
