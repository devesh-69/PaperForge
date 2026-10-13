import React from 'react';
import type { Faq } from '../../seo/pages';

/** Questions and answers as native <details> (works without JavaScript and is accessible). */
export const FaqList: React.FC<{ items: Faq[] }> = ({ items }) => (
  <section aria-labelledby="faq-heading" className="pub-section">
    <h2 id="faq-heading">Frequently asked questions</h2>
    <div className="pub-faq">
      {items.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  </section>
);
