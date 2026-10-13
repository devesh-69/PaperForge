import React from 'react';
import { Link } from 'react-router-dom';
import { useWorkspaceCounts } from '../../hooks/useWorkspaceCounts';
import { EXAM_TOOL, LETTER_TOOL } from '../../letterhead/tools';

/** How much is in the workspace, each number links to its list. */
export const StatTiles: React.FC = () => {
  const { counts } = useWorkspaceCounts();
  const tiles = [
    { label: 'Templates', value: counts.templates, to: '/templates' },
    { label: 'Question sets', value: counts.questionSets, to: '/question-sets' },
    { label: 'Letters', value: counts.letters, to: `${LETTER_TOOL.base}?tab=documents` },
    { label: 'Exam papers', value: counts.papers, to: `${EXAM_TOOL.base}?tab=documents` },
  ];
  return (
    <section aria-label="Workspace totals">
      <div className="row g-3">
        {tiles.map((t) => (
          <div key={t.label} className="col-6 col-xl-3">
            <Link to={t.to} className="card stat-tile d-block text-decoration-none text-reset">
              <span className="num">{t.value}</span>
              <span className="label">{t.label}</span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
};
