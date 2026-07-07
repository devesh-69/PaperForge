import type { Column } from 'react-data-grid';
import type { Question } from '../../types';
import { findBlock, isFieldLocked, getOptionsCount } from '../../utils/resolveLockedFields';

function stripHtml(html: string): string {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || '';
}

interface ColumnBuilderArgs {
  template: any;
}

export function buildGridColumns({
  template,
}: ColumnBuilderArgs): Column<Question>[] {
  const isLocked = (row: Question, field: keyof Question) => {
    const block = findBlock(template, row.qNumber);
    return isFieldLocked(block, field as any);
  };

  const getCellClassName = (row: Question, field: keyof Question) => {
    return isLocked(row, field) ? 'grid-cell-locked' : 'grid-cell-editable';
  };

  const cols: Column<Question>[] = [
    {
      key: 'qNumber',
      name: 'S No.',
      width: 60,
      frozen: true,
      cellClass: 'grid-cell-readonly font-mono fw-700',
    },
    {
      key: 'subject',
      name: 'SUBJECT',
      width: 140,
      editable: (row) => !isLocked(row, 'subject'),
      cellClass: (row) => getCellClassName(row, 'subject'),
    },
    {
      key: 'topic',
      name: 'TOPIC',
      width: 120,
      editable: (row) => !isLocked(row, 'topic'),
      cellClass: (row) => getCellClassName(row, 'topic'),
    },
    {
      key: 'tags',
      name: 'TAGS',
      width: 130,
      editable: (row) => !isLocked(row, 'tags'),
      cellClass: (row) => getCellClassName(row, 'tags'),
      renderCell: ({ row }) => (row.tags ?? []).join(', '),
    },
    {
      key: 'questionType',
      name: 'QUESTION TYPE',
      width: 150,
      editable: (row) => !isLocked(row, 'questionType'),
      cellClass: (row) => getCellClassName(row, 'questionType'),
    },
    {
      key: 'questionText',
      name: 'QUESTION TEXT',
      width: 250,
      cellClass: 'grid-cell-rich',
      renderCell: ({ row }) => {
        const text = stripHtml(row.questionText.html);
        return `📝 ${text || '(empty question text)'}`;
      },
    },
  ];


  // Option 1 to Option 10 columns
  for (let i = 1; i <= 10; i++) {
    const optIdx = i - 1;
    cols.push({
      key: `option_${i}`,
      name: `OPTION${i}`,
      width: 150,
      cellClass: (row) => {
        const count = getOptionsCount(row.questionType);
        return optIdx < count ? 'grid-cell-rich' : 'grid-cell-disabled';
      },
      renderCell: ({ row }) => {
        const count = getOptionsCount(row.questionType);
        if (optIdx >= count) return '';
        const opt = row.options[optIdx];
        const text = opt ? stripHtml(opt.html) : '';
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
      cellClass: 'grid-cell-editable font-mono',
    },
    {
      key: 'explanation',
      name: 'EXPLANATION',
      width: 200,
      cellClass: 'grid-cell-rich',
      renderCell: ({ row }) => {
        const text = stripHtml(row.explanation.html);
        return text ? `💡 ${text}` : '(no explanation)';
      },
    },
    {
      key: 'correctMarks',
      name: 'CORRECT MARKS',
      width: 110,
      editable: (row) => !isLocked(row, 'correctMarks'),
      cellClass: (row) => getCellClassName(row, 'correctMarks'),
      renderCell: ({ row }) => String(row.correctMarks),
    },
    {
      key: 'negativeMarks',
      name: 'NEGATIVE MARKS',
      width: 110,
      editable: (row) => !isLocked(row, 'negativeMarks'),
      cellClass: (row) => getCellClassName(row, 'negativeMarks'),
      renderCell: ({ row }) => String(row.negativeMarks),
    },
    {
      key: 'difficulty',
      name: 'DIFFICULTY',
      width: 110,
      editable: (row) => !isLocked(row, 'difficulty'),
      cellClass: (row) => getCellClassName(row, 'difficulty'),
    }
  );

  return cols;
}
