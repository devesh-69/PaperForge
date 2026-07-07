import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { NavBar } from './components/layout/NavBar';
import { TemplatesPage } from './pages/TemplatesPage';
import { TemplateBuilderPage } from './pages/TemplateBuilderPage';
import { NewQuestionSetPage } from './pages/NewQuestionSetPage';
import { QuestionEntryPage } from './pages/QuestionEntryPage';
import { ImportPage } from './pages/ImportPage';
import { QuestionSetsListPage } from './pages/QuestionSetsListPage';
import { useStorageEstimate } from './hooks/useStorageEstimate';
import './styles/custom.css';

export const App: React.FC = () => {
  const { isStorageLow, usagePct } = useStorageEstimate();

  return (
    <Router>
      {/* 
        Copyright © 2026 Devesh Tatkare. All Rights Reserved.
        Contributions: PaperForge is proprietary. Please do not submit PRs with derivative works.
      */}
      <div className="min-vh-100 d-flex flex-column">
        <Toaster position="top-right" />
        <NavBar />
        {isStorageLow && (
          <div className="alert alert-warning m-0 text-center rounded-0 border-0 border-bottom border-warning" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <strong>Storage Warning:</strong> Your browser storage is {usagePct.toFixed(1)}% full. 
            Consider deleting old templates or question sets to free up space.
          </div>
        )}
        <main className="flex-grow-1">
          <Routes>
            <Route path="/" element={<TemplatesPage />} />
            <Route path="/templates/new" element={<TemplateBuilderPage />} />
            <Route path="/templates/edit/:id" element={<TemplateBuilderPage />} />
            <Route path="/question-sets" element={<QuestionSetsListPage />} />
            <Route path="/new-question-set" element={<NewQuestionSetPage />} />
            <Route path="/question-set/:id" element={<QuestionEntryPage />} />
            <Route path="/question-set/:id/import" element={<ImportPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <footer className="app-footer">
          <div className="container d-flex justify-content-between align-items-center">
            <div>
              PaperForge v0.1.0 &nbsp;·&nbsp; Browser-only, powered by IndexedDB
            </div>
            <div className="d-flex align-items-center gap-3">
              <span className="text-muted">Created by Devesh Tatkare</span>
              <div>
                <a href="https://github.com/devesh-69" target="_blank" rel="noreferrer" className="text-muted me-2" title="GitHub">
                  <i className="bi bi-github fs-5"></i>
                </a>
                <a href="https://www.linkedin.com/in/deveshtatkare/" target="_blank" rel="noreferrer" className="text-muted" title="LinkedIn">
                  <i className="bi bi-linkedin fs-5"></i>
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;
