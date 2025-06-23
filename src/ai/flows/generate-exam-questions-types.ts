
/**
 * @fileOverview Type definitions and Zod schemas for the exam question generation flow.
 * This file does NOT use 'use server' and can be safely imported by client components.
 */

import { z } from 'zod';

// Base Schemas
export const AIBaseQuestionSchema = z.object({
  text: z.string().describe("The main text or statement of the question."),
  points: z.number().min(0).optional().default(10).describe("Points for this question (e.g., 10)."),
  feedback: z.string().optional().describe("Optional feedback for the teacher or student related to this question."),
});

export const AIMultipleChoiceOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string().describe("Text of the option."),
  isCorrect: z.boolean().describe("True if this option is correct."),
});

export const AIWeightedChoiceOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string().describe("Text of the option."),
  percentage: z.number().min(-100).max(100).describe("Percentage value (-100 to 100) this option contributes. Positive for correct, zero or negative for incorrect/distractor. For single select, this is the score percentage. For multi-select, percentages are summed and normalized."),
});

export const AIArgumentItemSchema = z.object({
  id: z.string().optional(),
  text: z.string().describe("Text of the argument item (premise or conclusion)."),
});

// --- Cloze Schemas for AI ---
export const AIClozeSubQuestionOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string().describe("Text of the option for a multiple-choice sub-question."),
  percentage: z.number().min(-100).max(100).optional().describe("Percentage weight for this option (-100 to 100). Used if the sub-question is multiple-choice and scored by weight."),
  isCorrect: z.boolean().optional().describe("Indicates if this option is correct. Used if the sub-question is multiple-choice and scored by simple correctness."),
  feedback: z.string().optional().describe("Feedback specific to this option."),
});

export const AIClozeSubQuestionSchema = z.object({
  id: z.string().optional().describe("Internal ID for the sub-question, will be auto-generated if omitted."),
  placeholderLabel: z.string().describe("The unique label used in the main text for this sub-question's placeholder, e.g., 'city' for a placeholder like '{city}'."),
  type: z.enum(["multiple-choice", "short-answer", "numerical"]).describe("The type of this embedded sub-question."),
  points: z.number().min(0).default(1).describe("Points allocated to correctly answering this sub-question."),
  options: z.array(AIClozeSubQuestionOptionSchema).optional().describe("Array of options if the sub-question type is 'multiple-choice'. At least two options are recommended."),
  correctAnswer: z.union([z.string(), z.number()]).optional().describe("The correct answer if the sub-question type is 'short-answer' or 'numerical'."),
  allowMultipleSelectionsInSubQuestion: z.boolean().optional().default(false).describe("If the sub-question is 'multiple-choice', setting this to true allows multiple options to be selected (checkboxes). Otherwise, it's single-select (radio buttons)."),
  randomizeSubQuestionOptions: z.boolean().optional().default(false).describe("If the sub-question is 'multiple-choice', suggest if its options should be randomized for the student."),
}).refine(data => {
  if (data.type === "multiple-choice" && (!data.options || data.options.length < 1)) {
    // Relaxing this for AI generation flexibility
  }
  if ((data.type === "short-answer" || data.type === "numerical") && data.correctAnswer === undefined) {
    // Relaxing this for AI generation flexibility
  }
  return true;
}, { message: "Sub-question configuration is invalid for its type (e.g., MC needs options, SA/Num need correctAnswer)." });


export const AIClozeQuestionSchema = AIBaseQuestionSchema.extend({
  type: z.enum(["cloze"]),
  textWithPlaceholders: z.string().describe("The main question text containing placeholders like {label1}, {label2}, etc. Each placeholder label must correspond to a 'placeholderLabel' in one of the 'subQuestions'."),
  subQuestions: z.array(AIClozeSubQuestionSchema).min(1).describe("An array defining each sub-question embedded in the text. The 'points' field of the base Cloze question should ideally be the sum of points of its subQuestions."),
});
// --- End Cloze Schemas for AI ---

// Question Type Schemas
export const AIMultipleChoiceQuestionSchema = AIBaseQuestionSchema.extend({
  type: z.enum(["multiple-choice"]),
  options: z.array(AIMultipleChoiceOptionSchema).min(2).describe("Array of options. Exactly one option must have isCorrect: true."),
  randomizeOptions: z.boolean().optional().default(false).describe("Suggest if options should be randomized for the student."),
});

export const AIMultipleResponseQuestionSchema = AIBaseQuestionSchema.extend({
  type: z.enum(["multiple-response"]),
  options: z.array(AIMultipleChoiceOptionSchema).min(2).describe("Array of options. At least one option must have isCorrect: true."),
  randomizeOptions: z.boolean().optional().default(false).describe("Suggest if options should be randomized for the student."),
});

export const AIFreeTextQuestionSchema = AIBaseQuestionSchema.extend({
  type: z.enum(["free-text"]),
});

export const AIWeightedChoiceQuestionSchema = AIBaseQuestionSchema.extend({
  type: z.enum(["weighted-choice"]),
  options: z.array(AIWeightedChoiceOptionSchema).min(1).describe("Array of weighted options. If allowMultipleSelections is false, typically one option is 100% and others 0% or partial. If allowMultipleSelections is true, multiple options can contribute positively or negatively to the score."),
  randomizeOptions: z.boolean().optional().default(false).describe("Suggest if options should be randomized for the student."),
  allowMultipleSelections: z.boolean().optional().default(false).describe("If true, multiple options can be selected, and scoring is based on the sum of percentages of selected options (normalized to question points). If false or undefined, only one option can be selected (radio button style)."),
});

export const AIArgumentReconstructionQuestionSchema = AIBaseQuestionSchema.extend({
  type: z.enum(["argument-reconstruction"]),
  items: z.array(AIArgumentItemSchema).min(3).describe("Array of argument items (premises/conclusion/distractors). The AI should provide these items in the correct logical order: 2 premises, 1 conclusion, then distractores."),
});

export const AITrueFalseJustificationQuestionSchema = AIBaseQuestionSchema.extend({
  type: z.enum(["true-false-justification"]),
  affirmation: z.string().describe("The main affirmation to be evaluated as True or False."),
  isAffirmationTrue: z.boolean().describe("Whether the main affirmation is objectively true."),
  justificationOptions: z.array(AIMultipleChoiceOptionSchema).min(2).describe("Array of justification options. Exactly one option must have isCorrect: true."),
  pointsForAffirmation: z.number().min(0).optional().default(5).describe("Points awarded for correctly identifying the affirmation's truth value."),
  pointsForJustification: z.number().min(0).optional().default(5).describe("Points awarded for selecting the correct justification."),
  randomizeJustificationOptions: z.boolean().optional().default(false).describe("Suggest if justification options should be randomized."),
});

export const AITrueFalseComplexQuestionSchema = AIBaseQuestionSchema.extend({
  type: z.enum(["true-false-complex"]),
  statement: z.string().describe("The complex statement or scenario to be evaluated as True or False."),
  isStatementTrue: z.boolean().describe("Whether the complex statement is objectively true."),
});

// Discriminated Union for AIQuestion
export const AIQuestionSchema = z.discriminatedUnion("type", [
  AIMultipleChoiceQuestionSchema,
  AIMultipleResponseQuestionSchema,
  AIFreeTextQuestionSchema,
  AIWeightedChoiceQuestionSchema,
  AIArgumentReconstructionQuestionSchema,
  AITrueFalseJustificationQuestionSchema,
  AITrueFalseComplexQuestionSchema,
  AIClozeQuestionSchema,
  // AIMatchingQuestionSchema, // Removed Matching
]);
export type AIQuestion = z.infer<typeof AIQuestionSchema>;

// Input and Output Schemas for the Flow
export const concreteQuestionTypes = [
  "multiple-choice",
  "multiple-response",
  "free-text",
  "weighted-choice",
  "argument-reconstruction",
  "true-false-justification",
  "true-false-complex",
  "cloze",
  // "matching", // Removed Matching
] as const;

export type ConcreteAIQuestionType = (typeof concreteQuestionTypes)[number];
export const AllQuestionTypesForAutoGen = ["ANY", ...concreteQuestionTypes] as const;
export type SelectableAIQuestionType = (typeof AllQuestionTypesForAutoGen)[number];

const QuestionTypeSelectionEnum = z.enum(AllQuestionTypesForAutoGen);


export const GenerateExamQuestionsInputSchema = z.object({
  examTitle: z.string().optional().describe("The title of the exam, for overall context."),
  examDescription: z.string().optional().describe("The description of the exam, for overall context."),
  numQuestions: z.coerce.number().min(1).max(20).default(3).describe("Number of questions to generate (e.g., 5)."),
  topic: z.string().optional().describe("An optional specific topic or subject area for the questions (e.g., 'Kant's Categorical Imperative', 'Basic Algebra')."),
  questionTypeToGenerate: QuestionTypeSelectionEnum.optional().describe("An optional specific question type to generate. If 'ANY' or omitted, diverse types will be generated."),
  contextText: z.string().optional().describe("Optional context text provided by the user. The AI should base the questions primarily on this text if provided."),
  additionalInstructions: z.string().optional().describe("Optional specific instructions or variables for the AI to consider when generating questions (e.g., 'focus on dates', 'compare concepts A and B')."),
});
export type GenerateExamQuestionsInput = z.infer<typeof GenerateExamQuestionsInputSchema>;

export const GenerateExamQuestionsOutputSchema = z.object({
  generatedQuestions: z.array(AIQuestionSchema).describe("An array of generated exam questions adhering to the AIQuestion schema."),
});
export type GenerateExamQuestionsOutput = z.infer<typeof GenerateExamQuestionsOutputSchema>;
