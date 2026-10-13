import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
const g = globalThis as any;
g.window = dom.window; g.document = dom.window.document; g.DOMParser = dom.window.DOMParser; g.Node = dom.window.Node;

const { createLetterhead, createPaperDoc } = await import('../src/letterhead/defaults');
const { generateVectorPdf } = await import('../src/letterhead/pdfVector/generate');
const { isFullySupported, splitScripts } = await import('../src/letterhead/pdfVector/script');

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? (pass++, console.log('  PASS', n)) : (fail++, console.log('  FAIL', n, d !== undefined ? JSON.stringify(d).slice(0, 300) : '')); };

// fonts straight from node_modules (the browser build fetches the same files by URL)
const nm = path.resolve('node_modules/@fontsource');
const F = (pkg: string, file: string) => fs.readFileSync(path.join(nm, pkg, 'files', file));
const toAb = (b: Buffer) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
const fonts = new Map<string, ArrayBuffer>();
for (const [fam, pkg, base] of [['serif', 'tinos', 'tinos'], ['sans', 'arimo', 'arimo'], ['mono', 'cousine', 'cousine']] as const) {
  for (const [k, w, s] of [['r', '400', 'normal'], ['b', '700', 'normal'], ['ri', '400', 'italic'], ['bi', '700', 'italic']] as const) fonts.set(`${fam}-${k}`, toAb(F(pkg, `${base}-latin-${w}-${s}.woff`)));
}
for (const [fam, pkg] of [['serif', 'noto-serif-devanagari'], ['sans', 'noto-sans-devanagari']] as const) {
  fonts.set(`deva-${fam}-r`, toAb(F(pkg, `${pkg}-devanagari-400-normal.woff`)));
  fonts.set(`deva-${fam}-b`, toAb(F(pkg, `${pkg}-devanagari-700-normal.woff`)));
}

console.log('== script splitting');
ok('latin only', isFullySupported('Hello (a+b)² = 4 – ok ₹') && !isFullySupported('தமிழ்'));
ok('mixed text splits into two fonts', JSON.stringify(splitScripts('Q1 हिंदी text').map((s) => s.script)) === '["latin","deva","latin"]', splitScripts('Q1 हिंदी text'));
ok('rupee sign uses the Devanagari font', splitScripts('₹500')[0].script === 'deva');

// a real PNG (PDFKit decodes images, unlike the Word export): 40x20 blue block
import zlib from 'node:zlib';
function makePng(w: number, h: number, rgb: [number, number, number]): string {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const row = Buffer.concat([Buffer.from([0]), Buffer.from(Array.from({ length: w }, () => rgb).flat())]);
  const raw = Buffer.concat(Array.from({ length: h }, () => row));
  const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  return 'data:image/png;base64,' + png.toString('base64');
}
const PNG = makePng(40, 20, [29, 78, 216]);
const ASSETS = new Map([['logo1', PNG]]);
const out = process.env.PDF_OUT_DIR;
const save = (name: string, blob: Blob | null) => blob && out ? blob.arrayBuffer().then((ab) => fs.writeFileSync(path.join(out, name), Buffer.from(ab))) : undefined;
const info = async (blob: Blob | null) => {
  const s = Buffer.from(await blob!.arrayBuffer()).toString('latin1');
  return { head: s.slice(0, 5), pages: (s.match(/\/Type \/Page\b/g) || []).length, fonts: (s.match(/\/Subtype \/Type0/g) || []).length, images: (s.match(/\/Subtype \/Image/g) || []).length, kb: Math.round(s.length / 1024) };
};

console.log('== exam paper (body header, details, instructions, questions, viva)');
const lh = createLetterhead('exam');
lh.elements.unshift({ id: 'logo1', type: 'logo', label: 'Logo', assetId: 'logo1', mimeType: 'image/png', naturalW: 10, naturalH: 5, widthMm: 20, align: 'center', placement: 'above', spaceBeforePt: 0, spaceAfterPt: 4 } as any);
const doc = createPaperDoc(lh);
doc.fields = { Center: '110126', Level: 'Secondary', Month: 'SEP', Year: '2026' };
doc.details = { [lh.detailFields[0].id]: 'Maths', [lh.detailFields[1].id]: '247', [lh.detailFields[2].id]: '10:30|13:00', [lh.detailFields[3].id]: '2026-10-09' };
doc.maxMarks = '7.5'; doc.vivaMarks = '1.5';
doc.questions = [
  { id: 'a', text: 'To verify the identity a³-b³ = (a-b)(a²+ab+b²)', marks: '2' },
  { id: 'b', text: 'हिंदी प्रश्न: त्रिभुज के कोणों का योग ज्ञात कीजिए। क्षेत्रफल = ½ × आधार × ऊँचाई', marks: '2' },
  { id: 'c', text: 'A long question that wraps over several lines so we can see the marks stay level with the last line. '.repeat(4), marks: '3' },
];
const paper = await generateVectorPdf(lh, doc, ASSETS, fonts);
const pi = await info(paper);
ok('is a PDF', pi.head === '%PDF-', pi);
ok('one page, embedded fonts, only the logo image', pi.pages === 1 && pi.fonts >= 3 && pi.images === 1, pi);
await save('exam.pdf', paper);

console.log('== many questions -> several pages');
const big = createPaperDoc(lh);
big.details = doc.details; big.fields = doc.fields; big.maxMarks = '40'; big.vivaMarks = '5';
big.questions = Array.from({ length: 60 }, (_, i) => ({ id: 'q' + i, text: `Question number ${i + 1}: explain the concept with a worked example.`, marks: '2' }));
const bigPdf = await generateVectorPdf(lh, big, ASSETS, fonts);
const bi = await info(bigPdf);
ok('60 questions flow onto 2+ pages', bi.pages >= 2, bi);
await save('exam-long.pdf', bigPdf);

console.log('== letter: header on every page, rich body with list, table, colour');
const letter = createLetterhead('letter');
(letter.elements[0] as any).assetId = 'logo1'; (letter.elements[0] as any).mimeType = 'image/png'; (letter.elements[0] as any).naturalW = 10; (letter.elements[0] as any).naturalH = 5;
letter.bandColor = '#fff7ed'; letter.frame = { enabled: true, color: '#f97316', widthPt: 1.5 };
const ld = createPaperDoc(letter);
ld.details = { [letter.detailFields[0].id]: 'SCH/2026/114', [letter.detailFields[1].id]: '2026-10-09' };
const para = '<p>Dear Parents,</p><p>This is to inform you that the <b>annual day</b> will be held on <span style="color:#c2410c">12 December</span>.</p><ul><li>Reporting time: 9:00 AM</li><li>Dress code: school uniform<ul><li>Girls: white salwar</li></ul></li></ul><ol><li>First</li><li>Second</li></ol><table><tr><th>Class</th><th>Time</th></tr><tr><td>IX</td><td>9:30 AM</td></tr></table><p style="text-align:justify">' + 'Please ensure that your ward arrives on time. '.repeat(130) + '</p><p>धन्यवाद</p>';
ld.letterBody = para;
const lp = await generateVectorPdf(letter, ld, ASSETS, fonts);
const li = await info(lp);
ok('letter is a vector PDF with the logo drawn once per page', li.head === '%PDF-' && li.pages >= 2 && li.images === 1, li);
await save('letter.pdf', lp);

console.log('== unsupported characters fall back (returns null)');
const tamil = createPaperDoc(lh); tamil.details = doc.details; tamil.questions = [{ id: 't', text: 'தமிழ் கேள்வி', marks: '1' }];
ok('Tamil text is not covered, caller falls back to the image PDF', (await generateVectorPdf(lh, tamil, ASSETS, fonts)) === null);

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
