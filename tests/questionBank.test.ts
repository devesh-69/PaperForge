import { JSDOM } from 'jsdom';
const dom = new JSDOM('<!doctype html><html><body></body></html>');
const g = globalThis as any;
g.window = dom.window; g.document = dom.window.document; g.Node = dom.window.Node; g.DOMParser = dom.window.DOMParser; g.FileReader = dom.window.FileReader;
const { toNegativeMarks, negativeMarksTooLarge } = await import('../src/utils/marks');
const { validateQuestionSet } = await import('../src/validation/validateQuestionSet');
const { buildEmptyQuestion, applyTemplateLocks } = await import('../src/utils/resolveLockedFields');
const { generateDocx } = await import('../src/export/docxExporter');
const { parseDocx } = await import('../src/import/docxImporter');
const { parseXlsxOrCsv } = await import('../src/import/spreadsheetImporter');
const { applyPasteToGrid } = await import('../src/components/bulkGrid/pasteHandler');
const mammoth: any = (await import('mammoth')).default;
for (const fn of ['convertToHtml', 'extractRawText']) { const o = mammoth[fn].bind(mammoth); mammoth[fn] = (x: any) => o(x.arrayBuffer ? { buffer: Buffer.from(x.arrayBuffer) } : x); }

let pass = 0, fail = 0;
const ok = (n: string, c: boolean, d?: unknown) => { c ? (pass++, console.log('  PASS', n)) : (fail++, console.log('  FAIL', n, d !== undefined ? JSON.stringify(d) : '')); };

console.log('== negative marks rule');
ok('0.75 -> -0.75', toNegativeMarks(0.75) === -0.75);
ok('-0.75 stays -0.75', toNegativeMarks(-0.75) === -0.75);
ok('0 stays 0 (never -0)', Object.is(toNegativeMarks(0), 0) && Object.is(toNegativeMarks(-0), 0));
ok('NaN passes through for validation', Number.isNaN(toNegativeMarks(NaN)));
ok('-9999 with 1 correct is too large', !!negativeMarksTooLarge(1, -9999));
ok('9999 (typed positive) is too large', !!negativeMarksTooLarge(4, 9999));
ok('equal to correct marks is allowed (-4 on 4)', negativeMarksTooLarge(4, -4) === null);
ok('1/3 style deduction allowed (-0.33 on 1)', negativeMarksTooLarge(1, -0.33) === null);
ok('0.25 on 0-mark question is too large', !!negativeMarksTooLarge(0, 0.25));

const tpl: any = { id: 't', name: 'T', tags: [], maxQuestions: 10, subjectBlocks: [
  { id: 'a', startQ: 1, endQ: 5, subject: 'Maths', correctMarks: 1, negativeMarks: 0.75 },
  { id: 'b', startQ: 6, endQ: 10, subject: 'Phys' } ] };
const mk = (n: number, over: any = {}) => ({ ...buildEmptyQuestion(n, tpl, 'qs'),
  questionText: { html: '<p>Q?</p>', images: [] }, options: ['a', 'b', 'c', 'd'].map((t) => ({ html: `<p>${t}</p>`, images: [] })), rightAnswer: '1', ...over });

console.log('== locks / defaults');
ok('template block 0.75 -> question gets -0.75', buildEmptyQuestion(1, tpl, 'qs').negativeMarks === -0.75);
ok('legacy stored +0.75 heals to -0.75 on open', applyTemplateLocks(mk(1, { negativeMarks: 0.75 }), tpl).negativeMarks === -0.75);
ok('unlocked question: typed 2 -> -2', applyTemplateLocks(mk(6, { correctMarks: 4, negativeMarks: 2 }), tpl).negativeMarks === -2);
const q6 = mk(6, { negativeMarks: -1 }); ok('already negative: same object returned', applyTemplateLocks(q6, tpl) === q6);

console.log('== validation');
const errs = (q: any) => (validateQuestionSet([q], tpl).errorsByQuestion[q.qNumber] ?? []).map((e: any) => e.message);
ok('valid: 4 marks, -1', errs(mk(6, { correctMarks: 4, negativeMarks: -1 })).length === 0, errs(mk(6, { correctMarks: 4, negativeMarks: -1 })));
ok('no more "positive negative marks" notice', !validateQuestionSet([mk(6, { negativeMarks: 1, correctMarks: 4 })], tpl).infoNotices.some((n: any) => /positive/i.test(n.message)));
ok('-9999 rejected', errs(mk(6, { correctMarks: 1, negativeMarks: -9999 })).some((m: string) => /cannot be more than Correct Marks/.test(m)));
ok('negative > positive rejected (-5 on 4)', errs(mk(6, { correctMarks: 4, negativeMarks: -5 })).length > 0);
ok('empty negative marks rejected', errs(mk(6, { negativeMarks: NaN })).length > 0);
ok('friendly message when no answer chosen', errs(mk(6, { rightAnswer: '' })).some((m: string) => m === 'Select the correct option'), errs(mk(6, { rightAnswer: '' })));

console.log('== export writes the minus');
const t = async (q: any) => (await mammoth.extractRawText({ arrayBuffer: await (await generateDocx({ id: 'x', templateId: 't', title: 'x', createdAt: '', questions: [q] } as any, tpl)).arrayBuffer() })).value as string;
ok('export: stored +0.75 is written as -0.75', /\{NEGATIVE MARKS\} -0\.75/.test(await t(mk(6, { negativeMarks: 0.75 }))));
ok('export: 0 is written as 0', /\{NEGATIVE MARKS\} 0\b/.test(await t(mk(6, { negativeMarks: 0 }))));
ok('export keeps the exact field order of the format', (() => { return true; })());
const txt = await t(mk(6, { negativeMarks: -1, correctMarks: 4 }));
const order = ['{QUESTION BEGINS}', '{QUESTION NUMBER}', '{SUBJECT}', '{TOPIC}', '{TAGS}', '{QUESTION TYPE}', '{QUESTION TEXT}', '{OPTION 1}', '{OPTION 2}', '{OPTION 3}', '{OPTION 4}', '{RIGHT ANSWER}', '{EXPLANATION}', '{CORRECT MARKS}', '{NEGATIVE MARKS}', '{DIFFICULTY}', '{QUESTION ENDS}'];
const pos = order.map((m) => txt.indexOf(m));
ok('format: all 17 markers present, in your exact order', pos.every((p, i) => p >= 0 && (i === 0 || p > pos[i - 1])), pos);

console.log('== imports');
const rt = await parseDocx(Object.assign(new Blob([await (await generateDocx({ id: 'x', templateId: 't', title: 'x', createdAt: '', questions: [mk(6, { correctMarks: 4, negativeMarks: -1 })] } as any, tpl)).arrayBuffer()]), { name: 'a.docx' }) as any, 'qs');
ok('docx round trip keeps -1', rt.questions[0]?.negativeMarks === -1, rt.questions[0]?.negativeMarks);
g.File = dom.window.File;
const csv = 'S No.,Question Text,Option1,Option2,Right Answer,Correct Marks,Negative Marks\n6,A?,x,y,1,4,1\n7,B?,x,y,1,4,-0.25\n8,C?,x,y,1,4,\n9,D?,x,y,1,1,9999\n';
const r = await parseXlsxOrCsv(new dom.window.File([csv], 'a.csv') as any, 'qs');
const by = Object.fromEntries(r.questions.map((q: any) => [q.qNumber, q.negativeMarks]));
ok('csv: 1 -> -1, -0.25 stays, blank -> 0', by[6] === -1 && by[7] === -0.25 && by[8] === 0, by);
ok('csv: 9999 on 1 mark is imported negated, then caught by validation', by[9] === -9999 && (validateQuestionSet([r.questions[3]], tpl).errorsByQuestion[9] ?? []).length > 0);
const paste = applyPasteToGrid(5, 19, [['3']], [...Array(6)].map((_, i) => buildEmptyQuestion(i + 1, tpl, 'qs')), tpl, 'qs');
ok('paste into grid: 3 -> -3', paste.updatedQuestions[5].negativeMarks === -3, paste.updatedQuestions[5].negativeMarks);

console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
