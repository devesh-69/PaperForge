import React from 'react';

const LINKS = [
  { href: 'https://github.com/devesh-69', title: 'GitHub', icon: 'bi-github' },
  { href: 'https://www.linkedin.com/in/deveshtatkare/', title: 'LinkedIn', icon: 'bi-linkedin' },
  { href: 'https://deveshtatkare.com/', title: 'Official website', icon: 'bi-globe' },
];

export const Footer: React.FC = () => (
  <footer className="app-footer">
    <div className="container d-flex justify-content-between align-items-center">
      <div>PaperForge v0.1.0 &nbsp;·&nbsp; Browser-only, Storage by IndexedDB</div>
      <div className="d-flex align-items-center gap-3">
        <span className="text-muted">Created by Devesh Tatkare</span>
        <div className="footer-social">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} title={l.title} aria-label={l.title} target="_blank" rel="noopener noreferrer">
              <i className={`bi ${l.icon}`}></i>
            </a>
          ))}
        </div>
      </div>
    </div>
  </footer>
);
