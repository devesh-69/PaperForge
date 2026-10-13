import React, { useEffect } from 'react';
import { PublicPageView } from '../components/public/PublicPageView';
import { applyHead } from '../seo/applyHead';
import type { PublicPage } from '../seo/pages';

/** Route element for a public page: renders it and keeps the head tags in step on client-side navigation. */
export const PublicRoute: React.FC<{ page: PublicPage }> = ({ page }) => {
  useEffect(() => { applyHead(page); }, [page]);
  return <PublicPageView page={page} />;
};
