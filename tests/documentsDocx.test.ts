import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>');
const g = globalThis as any;
g.window = dom.window; g.document = dom.window.document; g.DOMParser = dom.window.DOMParser; g.Node = dom.window.Node;
const JSZip: any = (await import('jszip')).default;
const mammoth: any = (await import('mammoth')).default;
const { createLetterhead, createPaperDoc } = await import('../src/letterhead/defaults');
const { generateLetterheadDocx } = await import('../src/letterhead/exportLetterhead');
const { buildDocument, findMissing, formatTimeRange, formatDate } = await import('../src/letterhead/layout');
const { extractTokens, fillTokens } = await import('../src/letterhead/tokens');
const { normalizeHex, contrastRatio } = await import('../src/letterhead/color');

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? (pass++, console.log('  PASS', n)) : (fail++, console.log('  FAIL', n, d !== undefined ? JSON.stringify(d) : '')); };

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAFCAYAAAB8ZH1oAAAAFklEQVR4nGP8z8Dwn4EIwESMolGFpAIAbX0CBp3tYjMAAAAASUVORK5CYII=';
const ASSETS = new Map([['logo1', PNG], ['img1', PNG]]);
const unzip = async (blob: Blob) => JSZip.loadAsync(await blob.arrayBuffer());
const wellFormed = (xml: string) => { const d = new dom.window.DOMParser().parseFromString(xml, 'application/xml'); return d.getElementsByTagName('parsererror').length === 0; };
const rawText = async (blob: Blob) => (await mammoth.extractRawText({ buffer: Buffer.from(await blob.arrayBuffer()) })).value as string;

console.log('== colours / tokens / formats');
ok('hex #abc -> #aabbcc', normalizeHex('#abc') === '#aabbcc');
ok('hex invalid rejected', normalizeHex('#12') === null && normalizeHex('zzzzzz') === null);
ok('white on white low contrast', contrastRatio('#ffffff', '#ffffff') < 3);
ok('black on white high contrast', contrastRatio('#000000', '#ffffff') > 20);
ok('tokens extracted once each', JSON.stringify(extractTokens(['{A} x {B}', '{A}'])) === '["A","B"]');
ok('fillTokens blanks missing', fillTokens('Hi {A}{B}', { A: 'x' }) === 'Hi x');
ok('date format', formatDate('2026-09-18') === '18/09/2026');
ok('time range format', formatTimeRange('11:00|13:00') === '11:00 AM to 01:00 PM', formatTimeRange('11:00|13:00'));
ok('midnight is 12 AM', formatTimeRange('00:05|12:00') === '12:05 AM to 12:00 PM');

console.log('== exam paper (body placement)');
const lh = createLetterhead('exam');
lh.elements.unshift({ id: 'logo1', type: 'logo', label: 'Logo', assetId: 'logo1', mimeType: 'image/png', naturalW: 10, naturalH: 5, widthMm: 20, align: 'center', spaceBeforePt: 0, spaceAfterPt: 4 } as any);
const doc = createPaperDoc(lh);
doc.fields = { Center: '110126', Level: 'Secondary', Month: 'SEP', Year: '2026' };
const [dSub, dCode, dTime, dDate] = lh.detailFields;
doc.details = { [dSub.id]: 'Maths', [dCode.id]: '211', [dTime.id]: '11:00|13:00', [dDate.id]: '2026-09-18' };
doc.maxMarks = '7.5'; doc.vivaMarks = '1.5';
doc.questions = [
  { id: 'a', text: 'Verify a & b < c', marks: '2' },
  { id: 'b', text: 'Figure question', marks: '2', image: { assetId: 'img1', mimeType: 'image/png', naturalW: 10, naturalH: 5, size: 'M' } },
  { id: 'c', text: '', marks: '' },
];
const blob = await generateLetterheadDocx(lh, doc, ASSETS);
const zip = await unzip(blob);
const xml = await zip.file('word/document.xml').async('string');
ok('document.xml is well-formed', wellFormed(xml));
const txt = await rawText(blob);
ok('school name present', txt.includes('Your School Name'));
ok('tokens filled in', txt.includes('Center: 110126') && txt.includes('Practical Exam (Secondary) – SEP 2026'), txt.slice(0, 200));
ok('no raw {Tokens} left', !/\{[A-Za-z]/.test(txt));
ok('details table values', txt.includes('Subject: Maths') && txt.includes('Time: 11:00 AM to 01:00 PM') && txt.includes('Date: 18/09/2026'));
ok('special characters kept', txt.includes('Verify a & b < c'));
ok('question numbering skips empty row', txt.includes('(Q1)') && txt.includes('(Q2)') && !txt.includes('(Q3)'));
ok('marks shown', txt.includes('(2 M)'));
ok('max marks bullet', txt.includes('Maximum Marks: 7.5'));
ok('viva line with marks', /Viva[\s\S]*\(1\.5 M\)/.test(txt));
ok('2 images embedded (logo + figure)', Object.keys(zip.files).filter((f) => f.startsWith('word/media/')).length === 2, Object.keys(zip.files));
ok('page is A4', /w:w="11906"/.test(xml) && /w:h="16838"/.test(xml));
ok('purple colour on school name', xml.includes('7030A0'));
ok('no header part in body mode', !Object.keys(zip.files).some((f) => f.startsWith('word/header')));

console.log('== missing-field detection');
const empty = createPaperDoc(lh);
const miss = findMissing(lh, empty, extractTokens(lh.elements.flatMap((e: any) => e.type === 'text' ? [e.text] : [])));
ok('lists empty tokens/details/questions', ['Center', 'Subject', 'Date', 'at least one question'].every((m) => miss.includes(m)), miss);
ok('complete doc has nothing missing', findMissing(lh, doc.questions.length ? { ...doc, questions: doc.questions.filter((q) => q.text) } : doc, ['Center', 'Level', 'Month', 'Year']).length === 0);

console.log('== letter (header placement, band + frame, Letter size)');
const l2 = createLetterhead('letter');
l2.bandColor = '#fff7ed'; l2.frame = { enabled: true, color: '#f97316', widthPt: 1.5 }; l2.page.size = 'Letter';
(l2.elements[0] as any).assetId = 'logo1'; (l2.elements[0] as any).mimeType = 'image/png'; (l2.elements[0] as any).naturalW = 10; (l2.elements[0] as any).naturalH = 5;
const d2 = createPaperDoc(l2);
d2.letterBody = 'Dear Sir,\n\nThis is the body.\nRegards';
d2.details = { [l2.detailFields[0].id]: 'REF/01', [l2.detailFields[1].id]: '2026-10-08' };
const b2 = await generateLetterheadDocx(l2, d2, ASSETS);
const z2 = await unzip(b2);
const files = Object.keys(z2.files);
ok('header part created', files.some((f) => /^word\/header\d*\.xml$/.test(f)), files);
const hdrName = files.find((f) => /^word\/header\d*\.xml$/.test(f))!;
const hdr = await z2.file(hdrName).async('string');
ok('header xml well-formed', wellFormed(hdr));
ok('header holds the org name + band shading + frame colour', hdr.includes('Your Organisation Name') && hdr.includes('FFF7ED') && hdr.includes('F97316'));
ok('header has the logo drawing', hdr.includes('<w:drawing'));
const x2 = await z2.file('word/document.xml').async('string');
ok('Letter page size', /w:w="12240"/.test(x2) && /w:h="15840"/.test(x2));
ok('letter text paragraphs', (await rawText(b2)).includes('This is the body.'));
ok('org name NOT duplicated in body', !x2.includes('Your Organisation Name'));

console.log('== blank/edge');
const l3 = createLetterhead('letterBlank');
const b3 = await generateLetterheadDocx(l3, createPaperDoc(l3), ASSETS);
ok('blank letterhead still opens (well-formed)', wellFormed(await (await unzip(b3)).file('word/document.xml').async('string')));
const built = buildDocument(lh, createPaperDoc(lh), 'preview', ASSETS);
ok('preview keeps unfilled tokens as placeholders', JSON.stringify(built.body).includes('placeholder'));
ok('export strips them', !/\{[A-Za-z]/.test(JSON.stringify(buildDocument(lh, createPaperDoc(lh), 'export').body)));

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);

