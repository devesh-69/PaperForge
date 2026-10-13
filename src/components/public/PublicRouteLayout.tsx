import React from 'react';
import { Outlet } from 'react-router-dom';
import { PublicLayout } from './PublicLayout';

/** Router layout for public pages. */
export const PublicRouteLayout: React.FC = () => (
  <PublicLayout>
    <Outlet />
  </PublicLayout>
);
