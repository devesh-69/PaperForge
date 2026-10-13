import React from 'react';
import { Link } from 'react-router-dom';
import { pageByPath, type PublicPage } from '../../seo/pages';
import { FaqList } from './FaqList';
import { ToolCards } from './ToolCards';

/** The content of one public page, rendered from `PublicPage` data. */
export const PublicPageView: React.FC<{ page: PublicPage }> = ({ page }) => {
  const related = (page.related ?? []).map(pageByPath).filter((p): p is PublicPage => !!p);
  const landing = page.kind === 'landing';

  return (
    <article className="pub-wrap pub-article">
      {!landing && (
        <nav aria-label="Breadcrumb" className="pub-crumbs">
          <Link to="/">Home</Link>
          <i className="bi bi-chevron-right" aria-hidden="true"></i>
          <span aria-current="page">{page.label}</span>
        </nav>
      )}

      <header className={`pub-hero ${landing ? 'is-landing' : ''}`}>
        <h1>{page.h1}</h1>
        <p className="pub-lead">{page.lead}</p>
        {page.appPath && (
          <div className="pub-cta">
            <Link to={page.appPath} className="btn-orange text-decoration-none">
              {landing ? 'Open PaperForge' : 'Open this tool'}<i className="bi bi-arrow-right"></i>
            </Link>
            {landing && <Link to="/tools/question-paper-maker" className="btn-outline-black text-decoration-none">See what it does</Link>}
          </div>
        )}
        {page.features && (
          <ul className="pub-features">
            {page.features.map((f) => <li key={f}><i className="bi bi-check2-circle"></i>{f}</li>)}
          </ul>
        )}
      </header>

      {landing && <ToolCards />}

      {page.sections.map((s) => (
        <section key={s.heading} className="pub-section">
          <h2>{s.heading}</h2>
          {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}
          {s.steps && <ol className="pub-steps">{s.steps.map((x) => <li key={x}>{x}</li>)}</ol>}
          {s.bullets && <ul className="pub-bullets">{s.bullets.map((x) => <li key={x}>{x}</li>)}</ul>}
        </section>
      ))}

      {page.faq && <FaqList items={page.faq} />}

      {related.length > 0 && (
        <section className="pub-section" aria-labelledby="related-heading">
          <h2 id="related-heading">Related</h2>
          <ul className="pub-related">
            {related.map((r) => <li key={r.path}><Link to={r.path}>{r.label}</Link></li>)}
          </ul>
        </section>
      )}
    </article>
  );
};
