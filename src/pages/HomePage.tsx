import React from 'react';
import { BackupStatusCard } from '../components/home/BackupStatusCard';
import { QuickStart } from '../components/home/QuickStart';
import { RecentActivity } from '../components/home/RecentActivity';
import { StatTiles } from '../components/home/StatTiles';
import { PageHeader } from '../components/common/PageHeader';

export const HomePage: React.FC = () => (
  <div>
    <PageHeader title="Home" subtitle="Pick up where you left off, or start something new." />
    <div className="d-grid gap-4">
      <QuickStart />
      <StatTiles />
      <div className="row g-3">
        <div className="col-lg-7"><RecentActivity /></div>
        <div className="col-lg-5"><BackupStatusCard /></div>
      </div>
    </div>
  </div>
);
