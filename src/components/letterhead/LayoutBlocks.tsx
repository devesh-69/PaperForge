import React from 'react';
import type { Block, ListInfo, ParaBlock, Run } from '../../letterhead/blocks';
import { fontCss } from '../../letterhead/defaults';

// Renders layout blocks as HTML. Used by the on-screen preview AND the print/PDF
// page, so every style that matters is inline (the print page has no app CSS).

const LINE_HEIGHT = 1.17;
const INDENT_PX = 48;
const JUSTIFY = { left: 'flex-start', center: 'center', right: 'flex-end' } as const;

const RunsView: React.FC<{ runs: Run[] }> = ({ runs }) => (
  <>
    {runs.map((r, i) =>
      r.br ? (
        <br key={i} />
      ) : (
        <span
          key={i}
          className={r.placeholder ? 'lh-ph' : undefined}
          style={{
            fontWeight: r.bold ? 700 : undefined,
            fontStyle: r.italic ? 'italic' : undefined,
            textDecoration: [r.underline ? 'underline' : '', r.strike ? 'line-through' : ''].join(' ').trim() || undefined,
            color: r.color,
          }}
        >
          {r.text}
        </span>
      ),
    )}
  </>
);

const BULLETS = ['•', '◦', '▪'];
const marker = (l: ListInfo) => (l.kind === 'bullet' ? BULLETS[l.level % BULLETS.length] : `${l.number}.`);

const ParaView: React.FC<{ block: ParaBlock }> = ({ block: b }) => {
  const style: React.CSSProperties = {
    fontFamily: fontCss(b.fontFamily),
    fontSize: `${b.sizePt}pt`,
    color: b.color,
    textAlign: b.align,
    lineHeight: LINE_HEIGHT,
    marginTop: `${b.spaceBeforePt}pt`,
    marginBottom: `${b.spaceAfterPt}pt`,
    minHeight: `${b.sizePt * LINE_HEIGHT}pt`,
    overflowWrap: 'anywhere',
    breakInside: 'avoid',
  };
  if (b.list) {
    const left = INDENT_PX * (b.list.level + 1);
    return (
      <div style={{ ...style, position: 'relative', paddingLeft: left }}>
        <span style={{ position: 'absolute', left: left - 24, width: 20, textAlign: 'right' }}>{marker(b.list)}</span>
        <RunsView runs={b.runs} />
      </div>
    );
  }
  if (b.rightRuns) {
    return (
      <div style={{ ...style, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <span><RunsView runs={b.runs} /></span>
        <span style={{ whiteSpace: 'nowrap', alignSelf: 'flex-end' }}><RunsView runs={b.rightRuns} /></span>
      </div>
    );
  }
  return (
    <div style={{ ...style, paddingLeft: b.indentPx || undefined }}>
      <RunsView runs={b.runs} />
    </div>
  );
};

export const BlockView: React.FC<{ block: Block }> = ({ block: b }) => {
  switch (b.kind) {
    case 'para':
      return <ParaView block={b} />;
    case 'image':
      return (
        <div style={{ display: 'flex', justifyContent: JUSTIFY[b.align], paddingLeft: b.indentPx, marginTop: `${b.spaceBeforePt}pt`, marginBottom: `${b.spaceAfterPt}pt`, breakInside: 'avoid' }}>
          <img src={b.dataUrl} alt="" style={{ display: 'block', width: b.widthPx, height: b.heightPx }} />
        </div>
      );
    case 'rule': {
      const w = Math.max(b.thicknessPt, b.lineStyle === 'double' ? 2.25 : 0.75);
      return (
        <div style={{ borderTop: `${w}pt ${b.lineStyle === 'single' ? 'solid' : b.lineStyle} ${b.color}`, marginTop: `${b.spaceBeforePt}pt`, marginBottom: `${b.spaceAfterPt}pt` }} />
      );
    }
    case 'details':
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: fontCss(b.fontFamily), fontSize: `${b.sizePt}pt`, color: b.color, lineHeight: LINE_HEIGHT, marginBottom: `${b.spaceAfterPt}pt` }}>
          <tbody>
            {b.rows.map((r, i) => (
              <tr key={i}>
                <td style={{ width: '50%', verticalAlign: 'top', padding: '0 8px 0 0' }}><RunsView runs={r[0]} /></td>
                <td style={{ width: '50%', verticalAlign: 'top', padding: '0 8px 0 0' }}><RunsView runs={r[1]} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    case 'row': {
      const logo = (
        <img
          src={b.logo.dataUrl}
          alt=""
          style={{ display: 'block', width: b.logo.widthPx, height: b.logo.heightPx, flexShrink: 0 }}
        />
      );
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: b.gapPx, marginTop: `${b.logo.spaceBeforePt}pt`, marginBottom: `${b.logo.spaceAfterPt}pt` }}>
          {b.side === 'left' && logo}
          <div style={{ flex: 1, minWidth: 0 }}>
            {b.blocks.map((c, i) => <BlockView key={i} block={c} />)}
          </div>
          {b.side === 'right' && logo}
        </div>
      );
    }
    case 'table':
      return (
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginBottom: `${b.spaceAfterPt}pt` }}>
          <tbody>
            {b.rows.map((row, ri) => (
              <tr key={ri} style={{ breakInside: 'avoid' }}>
                {row.map((c, ci) => (
                  <td
                    key={ci}
                    colSpan={c.colSpan}
                    rowSpan={c.rowSpan}
                    style={{ border: '0.75pt solid #999', padding: '3px 5px', verticalAlign: 'top' }}
                  >
                    {c.blocks.map((x, k) => <BlockView key={k} block={x} />)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case 'group':
      return (
        <div
          style={{
            background: b.band ?? undefined,
            border: b.frame ? `${Math.max(b.frame.widthPt, 0.75)}pt solid ${b.frame.color}` : undefined,
            padding: b.band || b.frame ? '8px 10px' : undefined,
          }}
        >
          {b.blocks.map((c, i) => <BlockView key={i} block={c} />)}
        </div>
      );
  }
};
