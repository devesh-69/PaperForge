import React from 'react';
import { BackupCard } from '../components/backup/BackupCard';
import { PageHeader } from '../components/common/PageHeader';
import { useWorkspaceCounts } from '../hooks/useWorkspaceCounts';

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** One place to back up or restore any part of the workspace. */
export const BackupPage: React.FC = () => {
  const { counts: c } = useWorkspaceCounts();
  return (
    <div>
      <PageHeader title="Backup & restore" subtitle="Everything you make is saved only in this browser. Keep a copy somewhere safe." />
      <div className="status-banner warn mb-4" role="note">
        <i className="bi bi-exclamation-triangle-fill"></i>
        <span>Clearing browser data or switching computers removes your work. A backup file is the only way to bring it back.</span>
      </div>
      <div className="row g-3">
        <div className="col-md-6">
          <BackupCard
            icon="bi-collection" title="Question bank" description="Templates and question sets"
            summary={`${plural(c.templates, 'template')} · ${plural(c.questionSets, 'question set')}`} scope="questions" slug="questions"
          />
        </div>
        <div className="col-md-6">
          <BackupCard
            icon="bi-envelope-paper" title="Letterheads" description="Letterheads and the letters written on them"
            summary={`${plural(c.letterheads, 'letterhead')} · ${plural(c.letters, 'letter')}`} scope="letters" slug="letterheads"
          />
        </div>
        <div className="col-md-6">
          <BackupCard
            icon="bi-journal-text" title="Exam papers" description="Paper formats and the papers made from them"
            summary={`${plural(c.examFormats, 'paper format')} · ${plural(c.papers, 'exam paper')}`} scope="examPapers" slug="exam_papers"
          />
        </div>
        <div className="col-md-6">
          <BackupCard icon="bi-box-seam" title="Everything" description="All of the above in one file" summary="Your whole workspace" scope="all" slug="all" />
        </div>
      </div>
    </div>
  );
};
