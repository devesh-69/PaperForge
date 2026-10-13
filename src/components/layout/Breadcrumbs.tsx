import React from 'react';
import { Link } from 'react-router-dom';
import type { RouteHandle } from '../../routes/routeMeta';

/** "Question bank › Templates › New template" built from the route's handle. */
export const Breadcrumbs: React.FC<{ handle: RouteHandle }> = ({ handle }) => (
  <nav className="crumbs" aria-label="Breadcrumb">
    {handle.parent && (
      <>
        <Link to={handle.parent.to} className="crumbs-parent">{handle.parent.label}</Link>
        <i className="bi bi-chevron-right crumbs-parent" aria-hidden="true"></i>
      </>
    )}
    <span aria-current="page">{handle.title}</span>
  </nav>
);
