import React, { useState, useRef, useMemo, useCallback } from 'react';
import { DataGrid } from 'react-data-grid';
import type { CalculatedColumn, RowsChangeData } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import toast from 'react-hot-toast';
import type { Question, Template, RichContent } from '../../types';
import { QUESTION_TYPES } from '../../types';
import { buildGridColumns } from './gridColumns';
import { RichCellEditorModal } from './RichCellEditorModal';
import { parsePasteData, applyPasteToGrid } from './pasteHandler';
import {
  buildEmptyQuestion,
  getMaxOptions,
  applyTemplateLocks,
  reconcileOptions,
  hasQuestionContent,
} from '../../utils/resolveLockedFields';
import { toNegativeMarks } from '../../utils/marks';
import {
  normalizeDifficulty,
  normalizeRightAnswer,
  normalizeType,
  parseMarks,
  parseTags,
} from '../../import/normalize';

interface Props {
  template: Template;
  questions: Question[];
  onChange: (questions: Question[]) => Promise<void>;
  questionSetId: string;
}

interface RichEditState {
  rowIdx: number;
  field: 'questionText' | 'explanation' | { optionIdx: number };
  initialValue: RichContent;
}

const DEFAULT_MAX_ROWS = 100;

export const QuestionGrid: React.FC<Props> = ({
  template,
  questions,
  onChange,
  questionSetId,
}) => {
  const [selectedCell, setSelectedCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [richEdit, setRichEdit] = useState<RichEditState | null>(null);
  const [pasteNotices, setPasteNotices] = useState<string[]>([]);
  // Rows the user asked for with "Add Row" that hold no data yet (never persisted)
  const [minRows, setMinRows] = useState(1);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Stable ids for placeholder rows so the grid does not remount rows on every save
  const phantomIds = useRef(new Map<number, string>());

  const maxRows = template.maxQuestions ?? DEFAULT_MAX_ROWS;

  // Display rows include placeholder empty rows for UX — these are NEVER saved directly.
  const displayRows = useMemo(() => {
    const maxSavedQ = questions.reduce((max, q) => Math.max(max, q.qNumber), 0);
    const displayCount = Math.min(Math.max(maxSavedQ, minRows, 1), maxRows);
    const byNumber = new Map(questions.map((q) => [q.qNumber, q]));
    const rows: Question[] = [];
    for (let i = 1; i <= displayCount; i++) {
      const existing = byNumber.get(i);
      if (existing) {
        rows.push(existing);
        continue;
      }
      const empty = buildEmptyQuestion(i, template, questionSetId);
      const stableId = phantomIds.current.get(i);
      if (stableId) empty.id = stableId;
      else phantomIds.current.set(i, empty.id);
      rows.push(empty);
    }
    return rows;
  }, [questions, minRows, maxRows, template, questionSetId]);

  // Persist only questions with real content
  const persistRows = useCallback(
    async (allRows: Question[]) => {
      const toSave = allRows.filter((q) => hasQuestionContent(q, template));
      toSave.forEach((q) => phantomIds.current.delete(q.qNumber));
      await onChange(toSave);
    },
    [onChange, template]
  );

  const handleRowsChange = useCallback(
    async (newRows: Question[], _data: RowsChangeData<Question>) => {
      const problems = new Set<string>();

      const cleaned = newRows.map((row, idx) => {
        const prev = displayRows[idx];
        const next: Question = { ...row };
        const r = row as unknown as Record<string, unknown>;

        // The text editor hands back strings; convert them back to proper types.
        if (typeof r.tags === 'string') next.tags = parseTags(r.tags);

        if (typeof next.questionType === 'string' && !(QUESTION_TYPES as string[]).includes(next.questionType)) {
          const t = normalizeType(next.questionType);
          if (t) {
            next.questionType = t;
          } else {
            problems.add(`Q${row.qNumber}: "${row.questionType}" is not a valid question type`);
            next.questionType = prev.questionType;
          }
        }
        if (next.questionType !== prev.questionType) {
          next.options = reconcileOptions(next.questionType, next.options, prev.questionType);
        }

        for (const key of ['correctMarks', 'negativeMarks'] as const) {
          if (typeof r[key] === 'string') {
            const n = parseMarks(r[key] as string);
            if (n === undefined || Number.isNaN(n)) {
              problems.add(`Q${row.qNumber}: ${key === 'correctMarks' ? 'Correct' : 'Negative'} Marks must be a number`);
              next[key] = prev[key];
            } else {
              next[key] = key === 'negativeMarks' ? toNegativeMarks(n) : n;
            }
          }
        }

        const d = normalizeDifficulty(next.difficulty);
        if (d) {
          next.difficulty = d;
        } else {
          problems.add(`Q${row.qNumber}: "${row.difficulty}" is not a valid difficulty`);
          next.difficulty = prev.difficulty;
        }

        next.rightAnswer = normalizeRightAnswer(next.questionType, next.rightAnswer);
        return applyTemplateLocks(next, template);
      });

      problems.forEach((p) => toast.error(p));
      await persistRows(cleaned);
    },
    [persistRows, template, displayRows]
  );

  const openRichEditor = useCallback(
    (row: Question, columnKey: string) => {
      const rowIdx = displayRows.findIndex((r) => r.id === row.id);
      if (rowIdx < 0) return;
      if (columnKey === 'questionText') {
        setRichEdit({ rowIdx, field: 'questionText', initialValue: row.questionText });
      } else if (columnKey === 'explanation') {
        setRichEdit({ rowIdx, field: 'explanation', initialValue: row.explanation });
      } else if (columnKey.startsWith('option_')) {
        const optionIdx = parseInt(columnKey.split('_')[1], 10) - 1;
        if (optionIdx < getMaxOptions(row.questionType)) {
          setRichEdit({
            rowIdx,
            field: { optionIdx },
            initialValue: row.options[optionIdx] || { html: '', images: [] },
          });
        }
      }
    },
    [displayRows]
  );

  const handleSaveRichCell = async (value: RichContent) => {
    if (!richEdit) return;
    const { rowIdx, field } = richEdit;
    const targetQ = { ...displayRows[rowIdx] };

    if (field === 'questionText') {
      targetQ.questionText = value;
    } else if (field === 'explanation') {
      targetQ.explanation = value;
    } else {
      const { optionIdx } = field;
      const newOpts = [...targetQ.options];
      while (newOpts.length <= optionIdx) newOpts.push({ html: '', images: [] });
      newOpts[optionIdx] = value;
      targetQ.options = newOpts;
    }

    const updatedDisplay = displayRows.map((r, idx) => (idx === rowIdx ? targetQ : r));
    await persistRows(updatedDisplay);
    setRichEdit(null);
  };

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const target = e.target as HTMLElement;
      // Only the grid itself: not the rich-text modal (a portal still bubbles here) or a cell editor
      if (richEdit || !target.closest('.react-grid-wrapper') || target.closest('input, textarea, [contenteditable]')) return;

      e.preventDefault();
      if (!selectedCell) {
        toast('Select a cell first, then paste.');
        return;
      }
      const pasteGrid = parsePasteData(e.clipboardData.getData('text'));
      if (pasteGrid.length === 0) return;

      const { updatedQuestions, notices } = applyPasteToGrid(
        selectedCell.rowIdx,
        selectedCell.colIdx,
        pasteGrid,
        displayRows,
        template,
        questionSetId
      );

      await persistRows(updatedQuestions);
      if (notices.length > 0) {
        setPasteNotices(notices);
        clearTimeout(noticeTimer.current);
        noticeTimer.current = setTimeout(() => setPasteNotices([]), 8000);
      }
    },
    [richEdit, selectedCell, displayRows, template, questionSetId, persistRows]
  );

  const handleAddRow = () => {
    if (displayRows.length >= maxRows) {
      toast.error(`Cannot add row. Template limit is ${maxRows} questions.`);
      return;
    }
    // Empty rows are display-only; they are saved as soon as they get content.
    setMinRows(displayRows.length + 1);
  };

  const handleRemoveLastRow = async () => {
    const last = displayRows[displayRows.length - 1];
    if (!last) return;
    if (hasQuestionContent(last, template)) {
      if (!window.confirm(`Remove Q${last.qNumber}? Its content will be deleted.`)) return;
      await onChange(questions.filter((q) => q.qNumber !== last.qNumber));
    }
    setMinRows(Math.max(1, displayRows.length - 1));
  };

  const columns = useMemo(() => buildGridColumns({ template }), [template]);

  const isRichKey = (key: string) =>
    key === 'questionText' || key === 'explanation' || key.startsWith('option_');

  return (
    <div onPaste={handlePaste} className="bulk-grid-container">
      {/* Paste warnings/notices */}
      {pasteNotices.length > 0 && (
        <div className="alert alert-warning py-2 px-3 mb-3" style={{ fontSize: '0.8rem' }}>
          <h6 className="fw-700 mb-1" style={{ fontSize: '0.85rem' }}>Clipboard Paste Notices:</h6>
          <ul className="mb-0 ps-3">
            {pasteNotices.slice(0, 5).map((notice, idx) => (
              <li key={idx}>{notice}</li>
            ))}
            {pasteNotices.length > 5 && <li>...and {pasteNotices.length - 5} more notices.</li>}
          </ul>
        </div>
      )}

      {/* Grid Actions Toolbar */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="text-muted small">
          <i className="bi bi-info-circle me-1"></i>
          Select a cell and paste (<strong>Ctrl+V</strong>) to bulk import — rows are added as needed.
          Double-click (or press Enter on) a rich-text cell to edit it.
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn-icon" onClick={handleRemoveLastRow} disabled={displayRows.length === 0}>
            <i className="bi bi-dash-lg"></i> Remove Last Row
          </button>
          <button type="button" className="btn-orange" onClick={handleAddRow}>
            <i className="bi bi-plus-lg"></i> Add Row
          </button>
        </div>
      </div>

      {/* Data Grid wrapper */}
      <div className="react-grid-wrapper border rounded" style={{ height: 500 }}>
        <DataGrid
          columns={columns}
          rows={displayRows}
          onRowsChange={handleRowsChange}
          onSelectedCellChange={(args: { rowIdx: number; column: CalculatedColumn<Question> }) =>
            setSelectedCell({ rowIdx: args.rowIdx, colIdx: args.column.idx })
          }
          onCellDoubleClick={(args) => {
            if (isRichKey(args.column.key)) openRichEditor(args.row, args.column.key);
          }}
          onCellKeyDown={(args, event) => {
            if (args.mode === 'SELECT' && event.key === 'Enter' && isRichKey(args.column.key) && args.row) {
              event.preventGridDefault();
              openRichEditor(args.row, args.column.key);
            }
          }}
          rowKeyGetter={(row: Question) => row.id}
          className="rdg-light"
          style={{ height: '100%' }}
        />
      </div>

      {/* Rich Text Editor modal */}
      {richEdit && (
        <RichCellEditorModal
          show={!!richEdit}
          title={
            richEdit.field === 'questionText'
              ? `Edit Question ${displayRows[richEdit.rowIdx].qNumber} Text`
              : richEdit.field === 'explanation'
              ? `Edit Question ${displayRows[richEdit.rowIdx].qNumber} Explanation`
              : `Edit Question ${displayRows[richEdit.rowIdx].qNumber} Option ${richEdit.field.optionIdx + 1}`
          }
          initialValue={richEdit.initialValue}
          onSave={handleSaveRichCell}
          onCancel={() => setRichEdit(null)}
        />
      )}
    </div>
  );
};
