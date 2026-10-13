// Single source of truth for grid column order, shared by the column
// definitions and the clipboard paste handler so they can never drift apart.
export const OPTION_COLUMN_COUNT = 10;

export const GRID_FIELD_ORDER: string[] = [
  'qNumber',
  'subject',
  'topic',
  'tags',
  'questionType',
  'questionText',
  ...Array.from({ length: OPTION_COLUMN_COUNT }, (_, i) => `option_${i + 1}`),
  'rightAnswer',
  'explanation',
  'correctMarks',
  'negativeMarks',
  'difficulty',
];
