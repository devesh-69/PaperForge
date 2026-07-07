import { db } from './db';
import type { Template } from '../types';

export async function createTemplate(template: Omit<Template, 'createdAt' | 'updatedAt'>): Promise<string> {
  const now = new Date().toISOString();
  const newTemplate: Template = {
    ...template,
    createdAt: now,
    updatedAt: now,
  };
  await db.templates.add(newTemplate);
  return newTemplate.id;
}

export async function getAllTemplates(): Promise<Template[]> {
  return db.templates.toArray();
}

export async function getTemplateById(id: string): Promise<Template | undefined> {
  return db.templates.get(id);
}

export async function updateTemplate(template: Template): Promise<void> {
  const now = new Date().toISOString();
  const updatedTemplate: Template = {
    ...template,
    updatedAt: now,
  };
  await db.templates.put(updatedTemplate);
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.templates.delete(id);
}
