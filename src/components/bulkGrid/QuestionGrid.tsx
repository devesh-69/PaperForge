import React, { useState, useRef, useMemo, useCallback } from 'react';
import { DataGrid } from 'react-data-grid';
import 'react-data-grid/lib/styles.css';
import toast from 'react-hot-toast';
import type { Question, Template, RichContent } from '../../types';
import { buildGridColumns } from './gridColumns';
import { RichCellEditorModal } from './RichCellEditorModal';
import { parsePasteData, applyPasteToGrid } from './pasteHandler';
import { buildEmptyQuestion, getOptionsCount, findBlock, hasQuestionContent } from '../../utils/resolveLockedFields';

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

export const QuestionGrid: React.FC<Props> = ({
  template,
  questions,
  onChange,
  questionSetId,
}) => {
  const [selectedCell, setSelectedCell] = useState<{ rowIdx: number; colIdx: number } | null>(null);
  const [richEdit, setRichEdit] = useState<RichEditState | null>(null);
  const [pasteNotices, setPasteNotices] = useState<string[]>([]);
  const gridRef = useRef<any>(null);

  // Display rows include phantom empty rows for UX — these are NEVER saved directly.
  // Only questions with actual content are persisted.
  const displayRows = useMemo(() => {
    const maxQ = template.maxQuestions ?? 100;
    const maxSavedQ = questions.reduce((max, q) => Math.max(max, q.qNumber), 0);
    // Show exactly the saved questions, or 1 empty row if completely empty so the user can paste
    const displayCount = Math.min(Math.max(maxSavedQ, 1), maxQ);
    const rows: Question[] = [];
    for (let i = 1; i <= displayCount; i++) {
      const existing = questions.find((q) => q.qNumber === i);
      rows.push(existing ?? buildEmptyQuestion(i, template, questionSetId));
    }
    return rows;
  }, [questions, template, questionSetId]);

  // Persist only questions with real content
  const persistRows = useCallback(
    async (allRows: Question[]) => {
      const toSave = allRows.filter((q) => hasQuestionContent(q, template));
      await onChange(toSave);
    },
    [onChange, template]
  );

  const handleRowsChange = useCallback(
    async (newRows: Question[]) => {
      const validatedRows = newRows.map((row) => {
        const block = findBlock(template, row.qNumber);
        
        // Fix for react-data-grid tags mutation
        let normalizedTags = row.tags;
        if (typeof row.tags === 'string') {
          normalizedTags = (row.tags as string).split(',').map(t => t.trim()).filter(Boolean);
        }

        if (!block) return { ...row, tags: normalizedTags };
        return {
          ...row,
          tags: normalizedTags,
          subject: block.subject,
          topic: block.topic !== undefined && block.topic !== '' ? block.topic : row.topic,
          questionType: block.questionType !== undefined ? block.questionType : row.questionType,
          correctMarks: block.correctMarks !== undefined ? block.correctMarks : row.correctMarks,
          negativeMarks: block.negativeMarks !== undefined ? block.negativeMarks : row.negativeMarks,
          difficulty: block.difficulty !== undefined ? block.difficulty : row.difficulty,
        };
      });
      await persistRows(validatedRows);
    },
    [persistRows, template]
  );

  const handleCellClick = useCallback(
    (args: { row: Question; column: any }) => {
      const rowIdx = displayRows.findIndex((r) => r.id === args.row.id);
      const colIdx = args.column.idx;
      setSelectedCell({ rowIdx, colIdx });

      const key = args.column.key;
      if (key === 'questionText') {
        setRichEdit({ rowIdx, field: 'questionText', initialValue: args.row.questionText });
      } else if (key === 'explanation') {
        setRichEdit({ rowIdx, field: 'explanation', initialValue: args.row.explanation });
      } else if (key.startsWith('option_')) {
        const optionIdx = parseInt(key.split('_')[1]) - 1;
        const count = getOptionsCount(args.row.questionType);
        if (optionIdx < count) {
          setRichEdit({
            rowIdx,
            field: { optionIdx },
            initialValue: args.row.options[optionIdx] || { html: '', images: [] },
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
      const { optionIdx } = field as { optionIdx: number };
      const newOpts = [...targetQ.options];
      while (newOpts.length <= optionIdx) newOpts.push({ html: '', images: [] });
      newOpts[optionIdx] = value;
      targetQ.options = newOpts;
    }

    // Merge updated row back into display rows and persist only content rows
    const updatedDisplay = displayRows.map((r, idx) => (idx === rowIdx ? targetQ : r));
    await persistRows(updatedDisplay);
    setRichEdit(null);
  };

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      if (!selectedCell) return;
      e.preventDefault();
      const rawText = e.clipboardData.getData('text');
      const pasteGrid = parsePasteData(rawText);

      const { updatedQuestions, notices } = applyPasteToGrid(
        selectedCell.rowIdx,
        selectedCell.colIdx,
        pasteGrid,
        displayRows,
        template
      );

      await persistRows(updatedQuestions);
      if (notices.length > 0) {
        setPasteNotices(notices);
        setTimeout(() => setPasteNotices([]), 6000);
      }
    },
    [selectedCell, displayRows, template, persistRows]
  );

  const handleAddRow = async () => {
    const maxQ = template.maxQuestions;
    // Add one row beyond current display
    const nextQNum = displayRows.length + 1;
    if (maxQ !== null && nextQNum > maxQ) {
      toast.error(`Cannot add row. Template limit is ${maxQ} questions.`);
      return;
    }
    // Adding a row just means we need to rebuild display — it will naturally show
    // since displayRows pads to questions.length + 3. Force it by saving a stub.
    const newQ = buildEmptyQuestion(nextQNum, template, questionSetId);
    // Mark with a placeholder subject so it counts as having content and appears
    // We just increase the saved questions count by 1 to expand the display
    await onChange([...questions, newQ]);
  };

  const handleRemoveLastRow = async () => {
    if (questions.length === 0) return;
    const sorted = questions.slice().sort((a, b) => a.qNumber - b.qNumber);
    await onChange(sorted.slice(0, -1));
  };

  const columns = useMemo(() => {
    return buildGridColumns({
      template,
    });
  }, [template]);

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
            {pasteNotices.length > 5 && <li>...and {pasteNotices.length - 5} more cells skipped.</li>}
          </ul>
        </div>
      )}

      {/* Grid Actions Toolbar */}
      <div className="d-flex align-items-center justify-content-between mb-3">
        <div className="text-muted small">
          <i className="bi bi-info-circle me-1"></i>
          Select a cell and paste (<strong>Ctrl+V</strong>) to bulk import. Double-click or click rich text cells to edit.
        </div>
        <div className="d-flex gap-2">
          <button type="button" className="btn-icon" onClick={handleRemoveLastRow} disabled={questions.length === 0}>
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
          ref={gridRef}
          columns={columns}
          rows={displayRows}
          onRowsChange={handleRowsChange}
          onCellClick={handleCellClick}
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
              : `Edit Question ${displayRows[richEdit.rowIdx].qNumber} Option ${(richEdit.field as any).optionIdx + 1}`
          }
          initialValue={richEdit.initialValue}
          onSave={handleSaveRichCell}
          onCancel={() => setRichEdit(null)}
        />
      )}
    </div>
  );
};
