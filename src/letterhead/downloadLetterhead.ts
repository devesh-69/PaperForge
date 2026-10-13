import { saveAs } from 'file-saver';
import { assetIdsOf, loadAssets } from './assets';
import { resolveFileName } from './filename';
import type { Letterhead, PaperDoc } from './types';

export type DownloadFormat = 'docx' | 'pdf';

export interface DownloadResult {
  name: string;
  /** the PDF had to be made from page images (unusual characters): text is not selectable */
  imageBased: boolean;
}

/**
 * Builds the file and saves it straight to the browser's download folder, named from the
 * document (e.g. "247 Maths.docx"). The Word / PDF code is large, so it loads only now.
 */
export async function downloadDocument(lh: Letterhead, doc: PaperDoc, format: DownloadFormat): Promise<DownloadResult> {
  const assets = await loadAssets(assetIdsOf(lh, doc));
  const name = `${resolveFileName(lh, doc)}.${format}`;
  if (format === 'docx') {
    const { generateLetterheadDocx } = await import('./exportLetterhead');
    saveAs(await generateLetterheadDocx(lh, doc, assets), name);
    return { name, imageBased: false };
  }
  const { generateLetterheadPdf } = await import('./pdf');
  const { blob, vector } = await generateLetterheadPdf(lh, doc, assets);
  saveAs(blob, name);
  return { name, imageBased: !vector };
}