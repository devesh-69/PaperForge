// Content of the public (indexable) pages. One source for the React pages, the prerendered
// HTML, the sitemap and the structured data, so they can never disagree.
// Write only what the product really does.

export interface Section {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  steps?: string[];
}

export interface Faq {
  q: string;
  a: string;
}

export interface PublicPage {
  /** URL path, e.g. /tools/letterhead-maker */
  path: string;
  /** <title>, keep under about 60 characters */
  title: string;
  /** meta description, about 110 to 155 characters */
  description: string;
  h1: string;
  lead: string;
  /** short name used in breadcrumbs and links */
  label: string;
  kind: 'landing' | 'tool' | 'info';
  /** the app route the call-to-action opens */
  appPath?: string;
  sections: Section[];
  faq?: Faq[];
  /** paths of related public pages */
  related?: string[];
  features?: string[];
}

export const APP_HOME = '/home';

const COMMON_FAQ: Faq[] = [
  { q: 'Is PaperForge free?', a: 'Yes. You can use it for personal, educational and institutional work at no cost. See the license on the About page for what is and is not allowed.' },
  { q: 'Is my data uploaded anywhere?', a: 'No. PaperForge runs entirely in your browser and saves everything on your own computer. Nothing is sent to a server, and no account is needed.' },
  { q: 'What happens if I clear my browser data?', a: 'Your work is removed with it, because it is stored in the browser. Use Backup & restore to download a file and bring your work back later or on another computer.' },
];

export const PUBLIC_PAGES: PublicPage[] = [
  {
    path: '/',
    kind: 'landing',
    label: 'Home',
    title: 'PaperForge – Question Paper, Letterhead & Exam Paper Maker',
    description: 'Make question papers, letterheads and exam papers in your browser. Import Word or Excel, download .docx or PDF. No sign-up – your data stays on your computer.',
    h1: 'Make question papers, letterheads and exam papers in your browser',
    lead: 'PaperForge is a free, browser-based toolkit for teachers and institutions. Build a template once, fill it in for every paper, and download a clean Word or PDF file. Nothing to install, no account, and your work never leaves your computer.',
    appPath: APP_HOME,
    features: ['Works in your browser', 'No sign-up', 'Your data stays on your computer', 'Word (.docx) and PDF downloads'],
    sections: [
      {
        heading: 'How it works',
        steps: [
          'Set up a template, a letterhead or a paper format once: subjects and marks, or your logo, name and colours.',
          'Fill it in for each document: type questions, import them from Word, Excel or CSV, or write a letter on your letterhead.',
          'Download the finished file as .docx or PDF, named automatically (for example “247 Maths”).',
        ],
      },
      {
        heading: 'Built for real exam work',
        bullets: [
          'Questions with rich text, images, options, explanations, marks and negative marks that can never exceed the correct marks.',
          'Import from Word, Excel or CSV and see exactly what will be added before you confirm.',
          'Letterheads with logo beside the heading, brand colours, and a rich letter editor with tables and lists.',
          'Exam papers with a details table, instructions, questions with figures, and a viva line.',
          'Backup and restore so your work is never trapped in one browser.',
        ],
      },
    ],
    faq: [
      ...COMMON_FAQ,
      { q: 'Which file formats can I download?', a: 'Word (.docx) for everything, and PDF for letters and exam papers. Question sets export to .docx in the structured question format.' },
      { q: 'Can I use it on a phone or tablet?', a: 'The layout adapts to small screens, but entering many questions is easiest on a computer.' },
    ],
    related: ['/tools/question-paper-maker', '/tools/letterhead-maker', '/tools/exam-paper-maker'],
  },
  {
    path: '/tools/question-paper-maker',
    kind: 'tool',
    label: 'Question paper maker',
    title: 'Question Paper Maker – Templates, Import & .docx Export',
    description: 'Build question sets from reusable templates, import from Word, Excel or CSV, validate marks and export a structured .docx. Free, in your browser.',
    h1: 'Question paper maker with templates, import and .docx export',
    lead: 'Define the subjects, question ranges and marks once as a template, then create as many question sets from it as you need. PaperForge checks your questions as you go and exports a structured Word file.',
    appPath: '/templates',
    features: ['Reusable templates', 'Single form and bulk grid entry', 'Import Word, Excel, CSV', 'Validation before export'],
    sections: [
      {
        heading: 'What you can do',
        bullets: [
          'Create templates with subject blocks that lock subject, marks, question type and difficulty for a range of question numbers.',
          'Enter questions one at a time in a form, or paste many at once into a spreadsheet-style grid.',
          'Use rich text, images, options and explanations in every question.',
          'Type negative marks as a positive number; they are saved as a deduction and cannot exceed the correct marks.',
          'Reorder, duplicate and delete questions, and see which ones still need attention.',
          'Export to .docx directly from the list, without opening the editor.',
        ],
      },
      {
        heading: 'Import without surprises',
        paragraphs: ['Upload a Word, Excel or CSV file and review every question, with notices for anything unusual, before anything is added. Locked values from the template are applied for you.'],
      },
    ],
    faq: [
      { q: 'What does the exported file look like?', a: 'A Word document where each question is a block of labelled fields, from the question number and subject to the right answer, marks and difficulty.' },
      { q: 'Can I import questions I already wrote?', a: 'Yes. Import from a Word document in the same field format, or from Excel or CSV with columns such as Question Text, Option1 to Option4, Right Answer and Marks. Sample files are provided inside the tool.' },
      ...COMMON_FAQ.slice(0, 2),
    ],
    related: ['/tools/exam-paper-maker', '/tools/letterhead-maker'],
  },
  {
    path: '/tools/letterhead-maker',
    kind: 'tool',
    label: 'Letterhead maker',
    title: 'Letterhead Maker – Design Once, Write Letters & Download',
    description: 'Design a letterhead with your logo, colours and text, then write letters and notices with a rich editor. Download Word or PDF instantly. Free, in your browser.',
    h1: 'Letterhead maker: design once, write letters on it',
    lead: 'Build your letterhead from scratch with a logo, text lines, a divider and brand colours, then write letters and notices on it. Download a Word or PDF file in one click.',
    appPath: '/letterheads',
    features: ['Logo beside or above the heading', 'Brand colour palette', 'Rich letter editor with tables', 'Word and PDF download'],
    sections: [
      {
        heading: 'Design it your way',
        bullets: [
          'Place your logo on its own row, or beside the heading on the left or right.',
          'Choose fonts, sizes, bold, italic, underline and colours for every line, with a saved palette of brand colours.',
          'Add a coloured background or border, a divider line, and a details table such as Reference No. and Date.',
          'Show the header on the first page only, or repeat it on every page.',
        ],
      },
      {
        heading: 'Write letters quickly',
        paragraphs: ['Write in a rich editor with headings, lists, colours, alignment and tables, or paste from Word and keep the formatting. Pre-fill a standard letter text for notices you send often.'],
      },
    ],
    faq: [
      { q: 'Will it work with Hindi, Marathi or other languages?', a: 'The PDF is drawn by your browser, so any script your computer can display comes out correctly. In Word files, fonts must be installed on the computer that opens the file.' },
      { q: 'Can the header repeat on every page?', a: 'Yes. Choose “Every page” and the letterhead is placed in the page header of the Word file.' },
      ...COMMON_FAQ.slice(0, 2),
    ],
    related: ['/tools/exam-paper-maker', '/tools/question-paper-maker'],
  },
  {
    path: '/tools/exam-paper-maker',
    kind: 'tool',
    label: 'Exam paper maker',
    title: 'Exam Paper Maker – Formats, Questions & Instant Download',
    description: 'Set up an exam paper format once, then make papers with instructions, questions, figures and marks. Download .docx or PDF named by subject code. Free.',
    h1: 'Exam paper maker: set up a format once, make every paper fast',
    lead: 'Create a paper format with your school name, details table and instructions, then fill in the subject, questions and marks for each exam. The file downloads named like “247 Maths”.',
    appPath: '/exam-papers',
    features: ['Reusable paper formats', 'Questions with images and marks', '12-hour time fields', 'Automatic file names'],
    sections: [
      {
        heading: 'From format to finished paper',
        steps: [
          'Design the paper format: header, details table (subject, code, time, date), default instructions and marks line.',
          'For each exam, fill in the details, edit the instructions and add questions with marks and optional figures.',
          'Download .docx or PDF. The file name comes from the subject code and subject.',
        ],
      },
      {
        heading: 'Details that matter',
        bullets: [
          'Time is always entered in a clear 12-hour format with AM and PM.',
          'Paste or drop an image into any question to add a figure, sized small, medium, large or full width.',
          'Totals are shown as you type, including the viva marks.',
          'Your papers are listed with search, so older ones are easy to find and reuse.',
        ],
      },
    ],
    faq: [
      { q: 'Can I reuse a paper from last year?', a: 'Open the paper from the list, change what you need and download it again. Your original stays untouched unless you edit it.' },
      { q: 'How is the file named?', a: 'By default from the subject code and subject, for example “247 Maths”. You can set your own pattern in the format, or type a name for one paper.' },
      ...COMMON_FAQ.slice(0, 2),
    ],
    related: ['/tools/letterhead-maker', '/tools/question-paper-maker'],
  },
  {
    path: '/about',
    kind: 'info',
    label: 'About',
    title: 'About PaperForge – Made by Devesh Tatkare',
    description: 'PaperForge is a free browser-based toolkit for question papers, letterheads and exam papers, created by Devesh Tatkare. Learn how it works and its license.',
    h1: 'About PaperForge',
    lead: 'PaperForge was created by Devesh Tatkare to take the repetitive work out of preparing question papers, letters and exam papers.',
    appPath: APP_HOME,
    sections: [
      {
        heading: 'Who made it',
        paragraphs: ['PaperForge is designed and built by Devesh Tatkare. You can find more of his work at deveshtatkare.com.'],
      },
      {
        heading: 'License in short',
        paragraphs: ['You may install and use PaperForge for personal, educational and institutional work, create question papers with it, and export the documents it produces. You may not redistribute, sell, modify or repackage the software, or remove its branding and notices. The full text is in the project’s README.'],
      },
      { heading: 'Feedback', paragraphs: ['Bug reports are welcome. Please do not send pull requests with feature additions or derivative work.'] },
    ],
    related: ['/tools/question-paper-maker', '/privacy'],
  },
  {
    path: '/privacy',
    kind: 'info',
    label: 'Privacy',
    title: 'Privacy – PaperForge Keeps Your Data on Your Computer',
    description: 'PaperForge runs in your browser and stores your work only on your computer. No account, no uploads, no tracking of your documents.',
    h1: 'Privacy',
    lead: 'Short version: your documents stay on your computer.',
    appPath: APP_HOME,
    sections: [
      {
        heading: 'Where your data lives',
        paragraphs: ['Templates, question sets, letterheads, letters, exam papers and images are saved in your browser’s own storage (IndexedDB). They are not sent to a server, and PaperForge has no accounts.'],
      },
      {
        heading: 'What this means for you',
        bullets: [
          'Clearing browser data removes your work. Download a backup from Backup & restore to keep a copy.',
          'Your work is not shared between computers or browsers unless you restore a backup there.',
          'The Inter typeface is self-hosted and served directly from this site. No fonts are loaded from Google Fonts or any other third party.',
        ],
      },
    ],
    related: ['/about', '/tools/question-paper-maker'],
  },
];

export const pageByPath = (path: string): PublicPage | undefined => PUBLIC_PAGES.find((p) => p.path === path);
