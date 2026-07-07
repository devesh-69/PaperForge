import mammoth from 'mammoth';
import { v4 as uuidv4 } from 'uuid';
import type { Question, QuestionType, Difficulty, EmbeddedImage } from '../types';

export interface ImportResult {
  questions: Question[];
  parseErrors: { rawLineOrRow: string; message: string }[];
}

const VALID_TYPES: QuestionType[] = ['SINGLECORRECT', 'MULTICORRECT', 'NUMERICAL', 'FILLINTHEBLANK', 'TRUE_OR_FALSE'];
const VALID_DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard', 'Default'];




export async function parseDocx(file: File, questionSetId: string): Promise<ImportResult> {
  const parseErrors: { rawLineOrRow: string; message: string }[] = [];
  const questions: Question[] = [];

  let html = '';
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    html = result.value;
  } catch (e) {
    parseErrors.push({ rawLineOrRow: file.name, message: `Failed to read file: ${String(e)}` });
    return { questions, parseErrors };
  }

  // Strip zero-width spaces that word might add
  html = html.replace(/\u200B/g, '');

  const blocks = html.split(/<[^>]*>\s*\{QUESTION BEGINS\}\s*<\/[^>]*>|\{QUESTION BEGINS\}/i).slice(1);

  for (const rawBlock of blocks) {
    const endMatch = rawBlock.match(/<[^>]*>\s*\{QUESTION ENDS\}\s*<\/[^>]*>|\{QUESTION ENDS\}/i);
    const blockHtml = endMatch ? rawBlock.slice(0, endMatch.index) : rawBlock;

    const fields = new Map<string, string>();
    const regex = /\{([A-Z0-9 ]+)\}([\s\S]*?)(?=\{[A-Z0-9 ]+\}|$)/gi;
    let match;
    while ((match = regex.exec(blockHtml)) !== null) {
      fields.set(match[1].trim().toUpperCase(), match[2].trim());
    }

    const getField = (name: string) => {
       const val = fields.get(name) || '';
       const div = document.createElement('div');
       div.innerHTML = val;
       return div.textContent?.trim() || '';
    };

    const getRichField = (name: string) => {
       let val = fields.get(name) || '';
       val = val.replace(/^<\/p>|^<\/div>|<p>$/gi, '').trim();
       return { html: val, images: [] }; // Mammoth images are already embedded as data URLs in the HTML
    };

    // Extract scalar fields
    const qNumberStr = getField('QUESTION NUMBER');
    const qNumber = parseInt(qNumberStr, 10);
    if (isNaN(qNumber)) {
      parseErrors.push({ rawLineOrRow: `{QUESTION NUMBER} ${qNumberStr}`, message: `Invalid question number: "${qNumberStr}"` });
      continue;
    }

    const subject = getField('SUBJECT');
    const topic = getField('TOPIC');
    const tagsRaw = getField('TAGS');
    const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];
    const typeRaw = getField('QUESTION TYPE').toUpperCase() as QuestionType;
    const questionType: QuestionType = VALID_TYPES.includes(typeRaw) ? typeRaw : 'SINGLECORRECT';
    const questionTextRaw = getRichField('QUESTION TEXT');
    const rightAnswer = getField('RIGHT ANSWER');
    const explanationRaw = getRichField('EXPLANATION');
    const correctMarksStr = getField('CORRECT MARKS');
    const correctMarks = parseFloat(correctMarksStr) || 0;
    const negativeMarksStr = getField('NEGATIVE MARKS');
    const negativeMarks = parseFloat(negativeMarksStr) || 0;
    const difficultyRaw = getField('DIFFICULTY') as Difficulty;
    const difficulty: Difficulty = VALID_DIFFICULTIES.includes(difficultyRaw) ? difficultyRaw : 'Default';

    // Extract options
    const options: { html: string; images: EmbeddedImage[] }[] = [];
    for (let i = 1; i <= 10; i++) {
      if (fields.has(`OPTION ${i}`)) {
        options.push(getRichField(`OPTION ${i}`));
      } else {
        break;
      }
    }

    questions.push({
      id: uuidv4(),
      questionSetId,
      qNumber,
      subject,
      topic: topic === 'N/A' ? '' : topic,
      tags,
      questionType,
      questionText: questionTextRaw,
      options,
      rightAnswer,
      explanation: explanationRaw,
      correctMarks,
      negativeMarks,
      difficulty,
      status: 'unvalidated',
      errors: [],
    });
  }

  return { questions, parseErrors };
}
