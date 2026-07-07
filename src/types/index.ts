// ---------- Enums ----------

export type QuestionType =
  | 'SINGLECORRECT'
  | 'MULTICORRECT'
  | 'NUMERICAL'
  | 'FILLINTHEBLANK'
  | 'TRUE_OR_FALSE';

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Default';

export const QUESTION_TYPES: QuestionType[] = [
  'SINGLECORRECT',
  'MULTICORRECT',
  'NUMERICAL',
  'FILLINTHEBLANK',
  'TRUE_OR_FALSE',
];

export const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Default'];

// ---------- Rich Content ----------

// Rich text fields store sanitized HTML from Tiptap, plus a registry of
// embedded images referenced by the HTML (as data-image-id attributes)
// so the Export Engine can pull raw image bytes without re-parsing HTML.
export interface RichContent {
  html: string;                       // Tiptap output HTML
  images: EmbeddedImage[];            // images referenced within `html`
}

export interface EmbeddedImage {
  id: string;                         // matches data-image-id in html
  base64: string;                     // raw base64 (no data: prefix)
  mimeType: string;                   // e.g. 'image/png'
  widthPx?: number;
  heightPx?: number;
}

// ---------- Template ----------

export interface SubjectBlock {
  id: string;
  startQ: number;                     // inclusive
  endQ: number;                       // inclusive
  subject: string;
  topic?: string;
  tags?: string[];
  questionType?: QuestionType;        // locked if present
  correctMarks?: number;              // locked if present
  negativeMarks?: number;             // locked if present
  difficulty?: Difficulty;            // locked if present
}

export interface Template {
  id: string;
  name: string;                       // used as base filename on export
  tags: string[];
  createdAt: string;                  // ISO date
  updatedAt: string;                  // ISO date
  maxQuestions: number | null;        // null = unlimited
  subjectBlocks: SubjectBlock[];
  // Which SubjectBlock keys are "locked" (disabled in entry UI) is derived
  // per-block from which optional fields are set (see Phase 2 spec) —
  // there is no separate global lockedFields list; locking is per-block,
  // per-field, based on presence of a value.
}

// ---------- Question ----------

export interface Question {
  id: string;
  questionSetId: string;
  qNumber: number;                    // 1-based, drives ordering

  // Resolved fields — pulled from matching SubjectBlock if locked there,
  // otherwise editable per-question. Always populated at save time
  // (never left undefined) so export never has to re-resolve.
  subject: string;
  topic: string;                      // '' allowed -> renders as N/A
  tags: string[];
  questionType: QuestionType;
  correctMarks: number;
  negativeMarks: number;
  difficulty: Difficulty;

  // Always per-question, never locked by template
  questionText: RichContent;
  options: RichContent[];             // length depends on questionType (see rules below)
  rightAnswer: string;                // format depends on questionType (see rules below)
  explanation: RichContent;

  status: 'valid' | 'error' | 'unvalidated';
  errors: QuestionFieldError[];
}

export interface QuestionFieldError {
  field: keyof Question | 'options';
  message: string;
}

// ---------- Question Set (one generated/generatable paper) ----------

export interface QuestionSet {
  id: string;
  templateId: string;
  title: string;                      // becomes the .docx filename
  createdAt: string;
  lastGeneratedAt?: string;
  questions: Question[];
}
