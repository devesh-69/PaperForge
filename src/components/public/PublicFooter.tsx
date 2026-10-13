import React from 'react';
import { Link } from 'react-router-dom';
import { AUTHOR } from '../../seo/site';

export const PublicFooter: React.FC = () => (
  <footer className="pub-footer">
    <div className="pub-wrap pub-footer-row">
      <div>
        <strong>PaperForge</strong>
        <p className="mb-0">Question papers, letterheads and exam papers in your browser. Your data stays on your computer.</p>
      </div>
      <nav aria-label="Footer">
        <Link to="/tools/question-paper-maker">Question paper maker</Link>
        <Link to="/tools/letterhead-maker">Letterhead maker</Link>
        <Link to="/tools/exam-paper-maker">Exam paper maker</Link>
        <Link to="/about">About</Link>
        <Link to="/privacy">Privacy</Link>
      </nav>
      <p className="pub-credit mb-0">
        Created by <a href={AUTHOR.url} rel="noopener">{AUTHOR.name}</a>
      </p>
    </div>
  </footer>
);
