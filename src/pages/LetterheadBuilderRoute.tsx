import React from 'react';
import { EXAM_TOOL, LETTER_TOOL } from '../letterhead/tools';
import { DesignBuilderPage } from './DesignBuilderPage';

export const LetterheadBuilderPage: React.FC = () => <DesignBuilderPage tool={LETTER_TOOL} />;
export const ExamPaperBuilderPage: React.FC = () => <DesignBuilderPage tool={EXAM_TOOL} />;
