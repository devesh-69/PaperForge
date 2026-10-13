import React from 'react';
import { Link } from 'react-router-dom';
import { PUBLIC_PAGES } from '../../seo/pages';

const ICONS: Record<string, string> = {
  '/tools/question-paper-maker': 'bi-collection',
  '/tools/letterhead-maker': 'bi-envelope-paper',
  '/tools/exam-paper-maker': 'bi-journal-text',
};

/** The three tools, each linking to its own page. */
export const ToolCards: React.FC = () => (
  <section aria-labelledby="tools-heading" className="pub-section">
    <h2 id="tools-heading">Three tools, one place</h2>
    <div className="pub-cards">
      {PUBLIC_PAGES.filter((p) => p.kind === 'tool').map((p) => (
        <Link key={p.path} to={p.path} className="pub-card">
          <span className="icon-chip"><i className={`bi ${ICONS[p.path] ?? 'bi-file-earmark'}`}></i></span>
          <h3>{p.label}</h3>
          <p>{p.lead}</p>
          <span className="pub-card-link">Learn more <i className="bi bi-arrow-right"></i></span>
        </Link>
      ))}
    </div>
  </section>
);
