import React from 'react';
import { Link } from 'react-router-dom';
import { APP_HOME } from '../../seo/pages';

const LINKS = [
  { to: '/tools/question-paper-maker', label: 'Question papers' },
  { to: '/tools/letterhead-maker', label: 'Letterheads' },
  { to: '/tools/exam-paper-maker', label: 'Exam papers' },
  { to: '/about', label: 'About' },
];

export const PublicHeader: React.FC = () => (
  <header className="pub-header">
    <div className="pub-wrap pub-header-row">
      <Link to="/" className="pub-brand" aria-label="PaperForge home">
        <img src="/paperforge-64x64.ico" alt="" width="28" height="28" />
        <span>PaperForge</span>
      </Link>
      <nav className="pub-nav" aria-label="Main">
        {LINKS.map((l) => <Link key={l.to} to={l.to}>{l.label}</Link>)}
      </nav>
      <Link to={APP_HOME} className="btn-orange text-decoration-none">Open PaperForge</Link>
    </div>
  </header>
);
