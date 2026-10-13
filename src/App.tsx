import React, { lazy } from 'react';
import { createBrowserRouter, redirect, RouterProvider, type RouteObject } from 'react-router-dom';
import { PublicRouteLayout } from './components/public/PublicRouteLayout';
import { NotFoundPage } from './pages/NotFoundPage';
import { PublicRoute } from './pages/PublicRoute';
import { EXAM_TOOL, LETTER_TOOL } from './letterhead/tools';
import type { RouteHandle } from './routes/routeMeta';
import { APP_HOME, PUBLIC_PAGES } from './seo/pages';
import { hasVisited } from './utils/visited';
import './styles/custom.css';

/*
  Copyright © 2026 Devesh Tatkare. All Rights Reserved.
  Contributions: PaperForge is proprietary. Please do not submit PRs with derivative works.
*/

// Each page is loaded when first visited, so opening the app only downloads what the
// first screen needs (the editor, Word and spreadsheet libraries are large).
const page = <T extends Record<string, React.ComponentType>>(load: () => Promise<T>, name: keyof T & string) =>
  lazy(async () => ({ default: (await load())[name] }));

const HomePage = page(() => import('./pages/HomePage'), 'HomePage');
const BackupPage = page(() => import('./pages/BackupPage'), 'BackupPage');
const TemplatesPage = page(() => import('./pages/TemplatesPage'), 'TemplatesPage');
const TemplateBuilderPage = page(() => import('./pages/TemplateBuilderPage'), 'TemplateBuilderPage');
const NewQuestionSetPage = page(() => import('./pages/NewQuestionSetPage'), 'NewQuestionSetPage');
const QuestionEntryPage = page(() => import('./pages/QuestionEntryPage'), 'QuestionEntryPage');
const ImportPage = page(() => import('./pages/ImportPage'), 'ImportPage');
const QuestionSetsListPage = page(() => import('./pages/QuestionSetsListPage'), 'QuestionSetsListPage');
const LetterheadsPage = page(() => import('./pages/LetterheadsPage'), 'LetterheadsPage');
const ExamPapersPage = page(() => import('./pages/ExamPapersPage'), 'ExamPapersPage');
const LetterheadBuilderPage = page(() => import('./pages/LetterheadBuilderRoute'), 'LetterheadBuilderPage');
const ExamPaperBuilderPage = page(() => import('./pages/LetterheadBuilderRoute'), 'ExamPaperBuilderPage');
const PaperEditorPage = page(() => import('./pages/PaperEditorPage'), 'PaperEditorPage');

// Returning visitors who open the bare address go straight to their Home. Only the page the
// tab was opened on can redirect, so links back to the landing page from inside the app work.
let landingRedirectArmed = typeof window !== 'undefined' && window.location.pathname === '/';
const landingLoader = () => {
  const go = landingRedirectArmed && hasVisited();
  landingRedirectArmed = false;
  return go ? redirect(APP_HOME) : null;
};

const route = (path: string, element: React.ReactNode, handle: RouteHandle): RouteObject => ({ path, element, handle });

const BANK = { label: 'Question bank', to: '/templates' };
const SETS = { label: 'Question sets', to: '/question-sets' };
const LETTERS = { label: LETTER_TOOL.navLabel, to: LETTER_TOOL.base };
const PAPERS = { label: EXAM_TOOL.navLabel, to: EXAM_TOOL.base };

// A data router (rather than <BrowserRouter>) so pages can block in-app navigation while
// there are unsaved edits (useBlocker) and carry route metadata (`handle`).
const router = createBrowserRouter([
  // Public, indexable pages (also prerendered to static HTML at build time)
  {
    element: <PublicRouteLayout />,
    children: [
      ...PUBLIC_PAGES.map<RouteObject>((page) => ({
        path: page.path,
        element: <PublicRoute page={page} />,
        loader: page.path === '/' ? landingLoader : undefined,
      })),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  // The app (private working screens)
  // The shell (and the database layer it pulls in) is loaded on demand, so the public pages
  // do not download it.
  {
    lazy: async () => ({ Component: (await import('./components/layout/AppShell')).AppShell }),
    children: [
      route(APP_HOME, <HomePage />, { title: 'Home', section: 'home' }),

      // Question bank (layouts frozen: only the shell around them is new)
      route('/templates', <TemplatesPage />, { title: 'Templates', section: 'templates', parent: BANK }),
      route('/templates/new', <TemplateBuilderPage />, { title: 'New template', section: 'templates', parent: { label: 'Templates', to: '/templates' } }),
      route('/templates/edit/:id', <TemplateBuilderPage />, { title: 'Edit template', section: 'templates', parent: { label: 'Templates', to: '/templates' } }),
      route('/question-sets', <QuestionSetsListPage />, { title: 'Question sets', section: 'questionSets', parent: BANK }),
      route('/new-question-set', <NewQuestionSetPage />, { title: 'New question set', section: 'questionSets', parent: SETS }),
      route('/question-set/:id', <QuestionEntryPage />, { title: 'Question entry', section: 'questionSets', parent: SETS, rail: true }),
      route('/question-set/:id/import', <ImportPage />, { title: 'Import questions', section: 'questionSets', parent: SETS }),

      // Letterheads (letters and notices)
      route(LETTER_TOOL.base, <LetterheadsPage />, { title: LETTER_TOOL.navLabel, section: 'letters' }),
      route(`${LETTER_TOOL.base}/new`, <LetterheadBuilderPage />, { title: 'New letterhead', section: 'letters', parent: LETTERS }),
      route(`${LETTER_TOOL.base}/edit/:id`, <LetterheadBuilderPage />, { title: 'Edit letterhead', section: 'letters', parent: LETTERS }),
      route(`${LETTER_TOOL.docBase}/:id`, <PaperEditorPage />, { title: 'Letter', section: 'letters', parent: LETTERS }),

      // Exam papers (a separate tool)
      route(EXAM_TOOL.base, <ExamPapersPage />, { title: EXAM_TOOL.navLabel, section: 'papers' }),
      route(`${EXAM_TOOL.base}/new`, <ExamPaperBuilderPage />, { title: 'New paper format', section: 'papers', parent: PAPERS }),
      route(`${EXAM_TOOL.base}/edit/:id`, <ExamPaperBuilderPage />, { title: 'Edit paper format', section: 'papers', parent: PAPERS }),
      route(`${EXAM_TOOL.docBase}/:id`, <PaperEditorPage />, { title: 'Exam paper', section: 'papers', parent: PAPERS }),

      route('/backup', <BackupPage />, { title: 'Backup & restore', section: 'backup' }),
    ],
  },
]);

const App: React.FC = () => <RouterProvider router={router} />;

export default App;
