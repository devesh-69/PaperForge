import React from 'react';
import { Link } from 'react-router-dom';
import { CREATE_ACTIONS } from '../layout/navConfig';

/** One-click starting points for every tool. */
export const QuickStart: React.FC = () => (
  <section aria-labelledby="quick-start">
    <h2 id="quick-start" className="section-label">Start something</h2>
    <div className="row g-3">
      {CREATE_ACTIONS.map((a, i) => (
        <div key={a.to} className="col-12 col-sm-6 col-xl-3">
          <Link to={a.to} className="qs-tile">
            <span className={`icon-chip ${i === 1 ? 'dark' : ''}`}><i className={`bi ${a.icon}`}></i></span>
            <span><b>{a.label}</b><span className="sub">{a.hint}</span></span>
          </Link>
        </div>
      ))}
    </div>
  </section>
);
