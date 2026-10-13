import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>');
const g = globalThis as any;
g.window = dom.window; g.document = dom.window.document; g.DOMParser = dom.window.DOMParser; g.Node = dom.window.Node;
const JSZip: any = (await import('jszip')).default;
const mammoth: any = (await import('mammoth')).default;
const { createLetterhead, createPaperDoc } = await import('../src/letterhead/defaults');
const { generateLetterheadDocx } = await import('../src/letterhead/exportLetterhead');
const { buildDocument, findMissing } = await import('../src/letterhead/layout');
const { richHtmlToBlocks, richHasContent, letterBodyToHtml } = await import('../src/letterhead/richText');

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? (pass++, console.log('  PASS', n)) : (fail++, console.log('  FAIL', n, d !== undefined ? JSON.stringify(d).slice(0, 400) : '')); };
const wellFormed = (xml: string) => new dom.window.DOMParser().parseFromString(xml, 'application/xml').getElementsByTagName('parsererror').length === 0;
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAFCAYAAAB8ZH1oAAAAFklEQVR4nGP8z8Dwn4EIwESMolGFpAIAbX0CBp3tYjMAAAAASUVORK5CYII=';
const ASSETS = new Map([['logo1', PNG]]);
const base = { fontFamily: 'Calibri', sizePt: 11, color: '#000000' };

console.log('== rich text -> blocks');
ok('empty editor html is empty', !richHasContent('<p></p>') && !richHasContent('') && richHasContent('<p>x</p>') && richHasContent('<table><tr><td></td></tr></table>'));
ok('legacy plain text becomes paragraphs (escaped)', letterBodyToHtml('a & b\nc') === '<p>a &amp; b</p><p>c</p>');
const html = '<h2>Notice</h2><p style="text-align: center"><strong>Bold</strong> <em>it</em> <u>un</u> <s>st</s> <span style="color: rgb(255, 0, 0)">red</span></p>'
  + '<ul><li><p>one</p><ul><li><p>nested</p></li></ul></li><li><p>two</p></li></ul>'
  + '<ol><li><p>first</p></li><li><p>second</p></li></ol>'
  + '<table><tbody><tr><th>H1</th><th colspan="2">H2</th></tr><tr><td><p>a</p></td><td><p>b</p></td><td><p>c</p></td></tr></tbody></table>'
  + '<p style="text-align: justify">Last<br>line</p>';
const blocks = richHtmlToBlocks(html, base) as any[];
const kinds = blocks.map((b) => b.kind);
ok('block kinds', JSON.stringify(kinds) === JSON.stringify(['para', 'para', 'para', 'para', 'para', 'para', 'para', 'table', 'para']), kinds);
ok('heading is bold + larger', blocks[0].runs[0].bold === true && blocks[0].sizePt > 11);
ok('centre alignment kept', blocks[1].align === 'center');
const r = blocks[1].runs;
ok('inline formats', r.some((x: any) => x.text === 'Bold' && x.bold) && r.some((x: any) => x.text === 'it' && x.italic) && r.some((x: any) => x.text === 'un' && x.underline) && r.some((x: any) => x.text === 'st' && x.strike), r);
ok('colour rgb->hex', r.some((x: any) => x.text === 'red' && x.color === '#ff0000'), r);
ok('nested bullets levels', blocks[2].list.level === 0 && blocks[3].list.level === 1 && blocks[4].list.level === 0 && blocks[2].list.kind === 'bullet', blocks.slice(2, 5).map((b) => b.list));
ok('numbered list numbers + own id', blocks[5].list.number === 1 && blocks[6].list.number === 2 && blocks[5].list.listId !== blocks[2].list.listId && blocks[5].list.kind === 'number');
const tb = blocks[7];
ok('table cols/colspan', tb.cols === 3 && tb.rows[0][1].colSpan === 2 && tb.rows.length === 2, [tb.cols, tb.rows.map((x: any) => x.length)]);
ok('th text is bold', tb.rows[0][0].blocks[0].runs[0].bold === true);
ok('justify + line break', blocks[8].align === 'justify' && blocks[8].runs.some((x: any) => x.br), blocks[8].runs);
ok('script is inert (dropped)', !JSON.stringify(richHtmlToBlocks('<p>hi<script>alert(1)</script></p>', base)).includes('alert'));

console.log('== letter with rich body -> docx');
const lh = createLetterhead('letter');
(lh.elements[0] as any).assetId = 'logo1'; (lh.elements[0] as any).mimeType = 'image/png'; (lh.elements[0] as any).naturalW = 10; (lh.elements[0] as any).naturalH = 5;
const doc = createPaperDoc(lh);
doc.letterBody = html;
doc.details = { [lh.detailFields[0].id]: 'REF/9', [lh.detailFields[1].id]: '2026-10-08' };
const blob = await generateLetterheadDocx(lh, doc, ASSETS);
const zip = await JSZip.loadAsync(await blob.arrayBuffer());
const xml = await zip.file('word/document.xml').async('string');
ok('document.xml well-formed', wellFormed(xml));
ok('numbering part exists with a decimal list', !!zip.file('word/numbering.xml') && (await zip.file('word/numbering.xml').async('string')).includes('decimal'));
ok('table written with merged cell', xml.includes('<w:tbl>') && xml.includes('w:gridSpan'));
ok('red text colour', xml.includes('FF0000'));
ok('justified', xml.includes('w:jc w:val="both"'));
const txt = (await mammoth.extractRawText({ buffer: Buffer.from(await blob.arrayBuffer()) })).value as string;
ok('text survives', ['Notice', 'Bold', 'nested', 'second', 'H2', 'Last'].every((w) => txt.includes(w)), txt.slice(0, 300));
const hdr = await zip.file(Object.keys(zip.files).find((f) => /^word\/header\d*\.xml$/.test(f))!).async('string');
ok('header well-formed with logo beside heading (table)', wellFormed(hdr) && hdr.includes('<w:tbl>') && hdr.includes('<w:drawing') && hdr.includes('Your Organisation Name'));

console.log('== logo placements');
const built = buildDocument(lh, doc, 'export', ASSETS);
const row = built.header!.blocks.find((b: any) => b.kind === 'row') as any;
ok('logo left of heading = one row block holding the text lines', !!row && row.side === 'left' && row.blocks.length === 4, built.header!.blocks.map((b: any) => b.kind));
ok('rule stays outside the row', built.header!.blocks.some((b: any) => b.kind === 'rule'));
(lh.elements[0] as any).placement = 'right';
ok('right placement', (buildDocument(lh, doc, 'export', ASSETS).header!.blocks.find((b: any) => b.kind === 'row') as any).side === 'right');
(lh.elements[0] as any).placement = 'above'; (lh.elements[0] as any).align = 'right';
const above = buildDocument(lh, doc, 'export', ASSETS).header!.blocks;
ok('above + align right = own image block, no row', !above.some((b: any) => b.kind === 'row') && (above[0] as any).kind === 'image' && (above[0] as any).align === 'right');
delete (lh.elements[0] as any).placement;
ok('old saved logos (no placement) behave as own row', !buildDocument(lh, doc, 'export', ASSETS).header!.blocks.some((b: any) => b.kind === 'row'));
(lh.elements[0] as any).widthMm = 500;
ok('huge logo is clamped to the text width', (buildDocument(lh, doc, 'export', ASSETS).header!.blocks[0] as any).widthPx <= buildDocument(lh, doc, 'export', ASSETS).page.contentWidthPx + 0.01);

console.log('== missing detection for rich letter');
const d2 = createPaperDoc(lh);
ok('empty letter flagged', findMissing(lh, d2, []).includes('letter text'));
d2.letterBody = '<p></p>';
ok('empty editor html still flagged', findMissing(lh, d2, []).includes('letter text'));
d2.letterBody = 'plain old text';
ok('legacy plain text counts as content', !findMissing(lh, d2, []).includes('letter text'));

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
