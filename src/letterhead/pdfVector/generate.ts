import type { AssetUrls } from '../assets';
import type { Block, BuiltDocument, GroupBlock, ImageBlock, Run } from '../blocks';
import { buildDocument, PAGE_TWIPS } from '../layout';
import type { Letterhead, PaperDoc } from '../types';
import { loadFontFiles } from './fonts';
import { PdfRenderer, pt, type PageSpec } from './renderer';
import { isFullySupported } from './script';

// A true vector PDF: real text (selectable, sharp at any zoom) in embedded open-licence fonts.
// Returns null when the document uses characters the embedded fonts do not cover (the caller
// then falls back to the image-based PDF).

function textOf(runs: Run[] | undefined): string[] {
  return (runs ?? []).map((r) => r.text);
}

function allText(blocks: Block[]): string[] {
  const out: string[] = [];
  for (const b of blocks) {
    switch (b.kind) {
      case 'para': out.push(...textOf(b.runs), ...textOf(b.rightRuns)); break;
      case 'details': b.rows.forEach((r) => r.forEach((runs) => out.push(...textOf(runs)))); break;
      case 'row': out.push(...allText(b.blocks)); break;
      case 'group': out.push(...allText(b.blocks)); break;
      case 'table': b.rows.forEach((r) => r.forEach((c) => out.push(...allText(c.blocks)))); break;
      default: break;
    }
  }
  return out;
}

const NATIVE_IMAGE = /^data:image\/(png|jpe?g);/i;

/** PDF embeds PNG and JPEG directly; anything else (GIF, BMP, WebP) is redrawn as PNG first. */
async function toPng(dataUrl: string): Promise<string> {
  if (NATIVE_IMAGE.test(dataUrl)) return dataUrl;
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || 1;
  canvas.height = img.naturalHeight || 1;
  canvas.getContext('2d')?.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

async function normaliseImages(blocks: Block[]): Promise<Block[]> {
  const fix = async (b: ImageBlock): Promise<ImageBlock> => ({ ...b, dataUrl: await toPng(b.dataUrl) });
  const out: Block[] = [];
  for (const b of blocks) {
    if (b.kind === 'image') out.push(await fix(b));
    else if (b.kind === 'row') out.push({ ...b, logo: await fix(b.logo), blocks: await normaliseImages(b.blocks) });
    else if (b.kind === 'group') out.push({ ...b, blocks: await normaliseImages(b.blocks) });
    else if (b.kind === 'table') out.push({ ...b, rows: await Promise.all(b.rows.map((r) => Promise.all(r.map(async (c) => ({ ...c, blocks: await normaliseImages(c.blocks) }))))) });
    else out.push(b);
  }
  return out;
}

function pageSpec(lh: Letterhead, built: BuiltDocument): PageSpec {
  const t = PAGE_TWIPS[lh.page.size];
  return { width: t.w / 20, height: t.h / 20, margin: pt(built.page.marginPx) };
}

/** `fonts` is only passed by tests (they read the font files from disk instead of the browser bundle). */
export async function generateVectorPdf(lh: Letterhead, doc: PaperDoc, assets: AssetUrls, fonts?: Map<string, ArrayBuffer>): Promise<Blob | null> {
  const built = buildDocument(lh, doc, 'export', assets);
  const everything = [...allText(built.body), ...(built.header ? allText([built.header]) : [])];
  if (!everything.every(isFullySupported)) return null;

  const fontFiles = fonts ?? (await loadFontFiles());
  const body = await normaliseImages(built.body);
  const header = built.header ? ((await normaliseImages([built.header]))[0] as GroupBlock) : null;

  const renderer = PdfRenderer.create(fontFiles, pageSpec(lh, built), header, {
    Title: doc.title || lh.name,
    Creator: 'PaperForge',
    Author: lh.name,
  });
  const pdf = renderer.doc;
  const chunks: Uint8Array[] = [];
  pdf.on('data', (c: Uint8Array) => chunks.push(c));
  const finished = new Promise<void>((resolve, reject) => {
    pdf.on('end', () => resolve());
    pdf.on('error', reject);
  });

  renderer.blocks(body, renderer.margin, renderer.contentWidth);
  pdf.end();
  await finished;
  return new Blob(chunks as BlobPart[], { type: 'application/pdf' });
}
