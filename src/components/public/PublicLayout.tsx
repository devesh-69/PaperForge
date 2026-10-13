import React from 'react';
import { PublicFooter } from './PublicFooter';
import { PublicHeader } from './PublicHeader';

/** Frame for public pages (landing, tool pages, about, privacy). Works with or without a router outlet. */
export const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="pub-page">
    <a className="skip-link" href="#main">Skip to content</a>
    <PublicHeader />
    <main id="main" className="pub-main">{children}</main>
    <PublicFooter />
  </div>
);
