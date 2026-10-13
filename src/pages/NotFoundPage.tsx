import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { APP_HOME } from '../seo/pages';

/** Shown for any address that does not exist. Not indexed. */
export const NotFoundPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Page not found · PaperForge';
    let tag = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!tag) { tag = document.createElement('meta'); tag.name = 'robots'; document.head.appendChild(tag); }
    tag.content = 'noindex,nofollow';
  }, []);

  return (
    <div className="pub-wrap pub-article text-center">
      <h1>Page not found</h1>
      <p className="pub-lead">That address does not exist. It may have moved, or the link may be mistyped.</p>
      <div className="pub-cta justify-content-center">
        <Link to={APP_HOME} className="btn-orange text-decoration-none">Open PaperForge</Link>
        <Link to="/" className="btn-outline-black text-decoration-none">Back to the home page</Link>
      </div>
    </div>
  );
};
