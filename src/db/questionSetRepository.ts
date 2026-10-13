import { db } from './db';
import type { QuestionSet } from '../types';

export async function createQuestionSet(questionSet: QuestionSet): Promise<string> {
  await db.questionSets.add(questionSet);
  return questionSet.id;
}

export async function updateQuestionSet(questionSet: QuestionSet): Promise<void> {
  await db.questionSets.put(questionSet);
}

export async function deleteQuestionSet(id: string): Promise<void> {
  await db.questionSets.delete(id);
}
