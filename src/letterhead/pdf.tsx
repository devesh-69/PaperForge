import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { BlockView } from '../components/letterhead/LayoutBlocks';
import type { AssetUrls } from './assets';
import type { Block, GroupBlock, TableBlock } from './blocks';
import { fontCss } from './defaults';
import { buildDocument } from './layout';
import type { Letterhead, PaperDoc } from './types';

// Image-based PDF: the fallback for documents that use characters outside the embedded vector fonts.
// Direct PDF download (no print dialog). Each page is drawn from the same layout as the
// preview and the .docx, captured as an image, and assembled into a PDF. Because it is
// drawn by the browser, every font and script (Hindi, Marathi, …) comes out correctly.

const RENDER_SCALE = 2; // 2x = about 190 dpi
const JPEG_QUALITY = 0.92;
const HEADER_GAP_PX = 8;

interface Mounted {
  el: HTMLDivElement;
  dispose: () => void;
}

/** Renders React content into an off-screen element so it can be measured and captured. */
function mount(node: React.ReactNode, styles: Partial<CSSStyleDeclaration>): Mounted {
  const el = document.createElement('div');
  Object.assign(el.style, { position: 'fixed', left: '-100000px', top: '0', background: '#fff', ...styles });
  document.body.appendChild(el);
  const root = createRoot(el);
  flushSync(() => root.render(node));
  return { el, dispose: () => { root.unmount(); el.remove(); } };
}

const wrap = (blocks: Block[]) => (
  <>
    {blocks.map((b, i) => (
      // flow-root keeps each block's margins inside its own measured height
      <div key={i} style={{ display: 'flow-root' }}><BlockView block={b} /></div>
    ))}
  </>
);

function measureBlocks(blocks: Block[], widthPx: number): number[] {
  const m = mount(wrap(blocks), { width: `${widthPx}px` });
  try {
    return Array.from(m.el.children).map((c) => c.getBoundingClientRect().height);
  } finally {
    m.dispose();
  }
}

function measureOne(block: Block, widthPx: number): number {
  return measureBlocks([block], widthPx)[0] ?? 0;
}

/** A table taller than a page is cut into one table per row (unless it has merged rows). */
function splitTallTable(b: TableBlock): Block[] | null {
  if (b.rows.length < 2 || b.rows.some((r) => r.some((c) => c.rowSpan > 1))) return null;
  return b.rows.map((row, i): TableBlock => ({ ...b, rows: [row], spaceAfterPt: i === b.rows.length - 1 ? b.spaceAfterPt : 0 }));
}

async function imagesReady(el: HTMLElement): Promise<void> {
  await Promise.all(Array.from(el.querySelectorAll('img')).map((img) => (img.complete ? undefined : img.decode().catch(() => undefined))));
}

function paginate(blocks: Block[], heights: number[], availablePx: number): Block[][] {
  const pages: Block[][] = [[]];
  let used = 0;
  blocks.forEach((b, i) => {
    const h = heights[i] ?? 0;
    const current = pages[pages.length - 1];
    if (current.length > 0 && used + h > availablePx) {
      pages.push([b]);
      used = h;
    } else {
      current.push(b);
      used += h;
    }
  });
  return pages;
}

async function generateRasterPdf(lh: Letterhead, doc: PaperDoc, assets: AssetUrls): Promise<Blob> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const built = buildDocument(lh, doc, 'export', assets);
  const { page } = built;
  const header: GroupBlock | null = built.header;
  const headerHeight = header ? measureOne(header, page.contentWidthPx) + HEADER_GAP_PX : 0;
  const available = page.heightPx - page.marginPx * 2 - headerHeight;

  // measure, splitting any table that cannot fit on a page by itself
  let blocks = built.body;
  let heights = measureBlocks(blocks, page.contentWidthPx);
  if (blocks.some((b, i) => b.kind === 'table' && heights[i] > available)) {
    blocks = blocks.flatMap((b, i) => (b.kind === 'table' && heights[i] > available ? splitTallTable(b) ?? [b] : [b]));
    heights = measureBlocks(blocks, page.contentWidthPx);
  }
  const pages = paginate(blocks, heights, available);

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: lh.page.size === 'A4' ? 'a4' : 'letter', compress: true });
  pdf.setProperties({ title: doc.title || lh.name, creator: 'PaperForge' });
  const pdfW = pdf.internal.pageSize.getWidth();
  const pdfH = pdf.internal.pageSize.getHeight();
  await document.fonts?.ready;

  for (let i = 0; i < pages.length; i++) {
    const m = mount(
      <div
        style={{
          width: page.widthPx,
          height: page.heightPx,
          padding: page.marginPx,
          boxSizing: 'border-box',
          overflow: 'hidden',
          background: '#fff',
          color: '#000',
          fontFamily: fontCss(lh.body.fontFamily),
        }}
      >
        {header && <BlockView block={header} />}
        {header && <div style={{ height: HEADER_GAP_PX }} />}
        {wrap(pages[i])}
      </div>,
      { width: `${page.widthPx}px`, height: `${page.heightPx}px` },
    );
    try {
      await imagesReady(m.el);
      const canvas = await html2canvas(m.el, {
        scale: RENDER_SCALE,
        backgroundColor: '#ffffff',
        logging: false,
        width: page.widthPx,
        height: page.heightPx,
        windowWidth: page.widthPx,
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
      });
      if (i > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL('image/jpeg', JPEG_QUALITY), 'JPEG', 0, 0, pdfW, pdfH, undefined, 'FAST');
    } finally {
      m.dispose();
    }
  }
  return pdf.output('blob');
}

export interface PdfResult {
  blob: Blob;
  /** true: real text in embedded fonts (sharp at any zoom); false: page images (fallback) */
  vector: boolean;
}

/**
 * Makes the PDF. Normally a vector PDF (crisp, selectable text). If the document uses characters
 * the embedded fonts do not cover, or the vector engine fails, it falls back to page images.
 */
export async function generateLetterheadPdf(lh: Letterhead, doc: PaperDoc, assets: AssetUrls): Promise<PdfResult> {
  try {
    const { generateVectorPdf } = await import('./pdfVector/generate');
    const blob = await generateVectorPdf(lh, doc, assets);
    if (blob) return { blob, vector: true };
  } catch (err) {
    console.error('Vector PDF failed, using the image-based PDF instead', err);
  }
  return { blob: await generateRasterPdf(lh, doc, assets), vector: false };
}