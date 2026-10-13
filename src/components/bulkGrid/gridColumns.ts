import { renderTextEditor } from 'react-data-grid';
import type { Column } from 'react-data-grid';
import type { Question, Template } from '../../types';
import {
  findBlock,
  isFieldLocked,
  getMaxOptions,
  getVisibleOptionSlots,
} from '../../utils/resolveLockedFields';
import { htmlToText } from '../../utils/html';
import { OPTION_COLUMN_COUNT } from './gridFields';

interface ColumnBuilderArgs {
  template: Template;
}

export function buildGridColumns({
  template,
}: ColumnBuilderArgs): Column<Question>[] {
  const isLocked = (row: Question, field: Parameters<typeof isFieldLocked>[1]) =>
    isFieldLocked(findBlock(template, row.qNumber), field);

  const getCellClassName = (row: Question, field: Parameters<typeof isFieldLocked>[1]) =>
    isLocked(row, field) ? 'grid-cell-locked' : 'grid-cell-editable';

  // A column only becomes editable when it has a renderEditCell.
  const textEditable = (field: Parameters<typeof isFieldLocked>[1]): Partial<Column<Question>> => ({
    editable: (row: Question) => !isLocked(row, field),
    renderEditCell: renderTextEditor,
    cellClass: (row: Question) => getCellClassName(row, field),
  });

  const cols: Column<Question>[] = [
    {
      key: 'qNumber',
      name: 'S No.',
      width: 60,
      frozen: true,
      cellClass: 'grid-cell-readonly font-mono fw-700',
    },
    { key: 'subject', name: 'SUBJECT', width: 140, ...textEditable('subject') },
    { key: 'topic', name: 'TOPIC', width: 120, ...textEditable('topic') },
    {
      key: 'tags',
      name: 'TAGS',
      width: 130,
      ...textEditable('tags'),
      renderCell: ({ row }) => (row.tags ?? []).join(', '),
    },
    { key: 'questionType', name: 'QUESTION TYPE', width: 150, ...textEditable('questionType') },
    {
      key: 'questionText',
      name: 'QUESTION TEXT',
      width: 250,
      cellClass: 'grid-cell-rich',
      renderCell: ({ row }) => {
        const text = htmlToText(row.questionText.html);
        return `📝 ${text || '(empty question text)'}`;
      },
    },
  ];

  // Option 1 to Option 10 columns
  for (let i = 1; i <= OPTION_COLUMN_COUNT; i++) {
    const optIdx = i - 1;
    cols.push({
      key: `option_${i}`,
      name: `OPTION${i}`,
      width: 150,
      cellClass: (row) => (optIdx < getVisibleOptionSlots(row) ? 'grid-cell-rich' : 'grid-cell-disabled'),
      renderCell: ({ row }) => {
        if (optIdx >= getVisibleOptionSlots(row)) return '';
        const opt = row.options[optIdx];
        if (!opt) return optIdx < getMaxOptions(row.questionType) ? '＋ add option' : '';
        const text = htmlToText(opt.html);
        return text || `(Option ${i} empty)`;
      },
    });
  }

  cols.push(
    {
      key: 'rightAnswer',
      name: 'RIGHT ANSWER',
      width: 140,
      editable: true,
      renderEditCell: renderTextEditor,
      cellClass: 'grid-cell-editable font-mono',
    },
    {
      key: 'explanation',
      name: 'EXPLANATION',
      width: 200,
      cellClass: 'grid-cell-rich',
      renderCell: ({ row }) => {
        const text = htmlToText(row.explanation.html);
        return text ? `💡 ${text}` : '(no explanation)';
      },
    },
    {
      key: 'correctMarks',
      name: 'CORRECT MARKS',
      width: 110,
      ...textEditable('correctMarks'),
      renderCell: ({ row }) => (Number.isFinite(row.correctMarks) ? String(row.correctMarks) : ''),
    },
    {
      key: 'negativeMarks',
      name: 'NEGATIVE MARKS',
      width: 110,
      ...textEditable('negativeMarks'),
      renderCell: ({ row }) => (Number.isFinite(row.negativeMarks) ? String(row.negativeMarks) : ''),
    },
    { key: 'difficulty', name: 'DIFFICULTY', width: 110, ...textEditable('difficulty') }
  );

  return cols;
}
