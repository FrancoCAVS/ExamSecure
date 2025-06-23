
import type { GradeEssayQuestionOutput } from '@/ai/flows/grade-essay-question';
export type { GradeEssayQuestionOutput } from '@/ai/flows/grade-essay-question';

export interface User {
  id: string;
  dni: string;
  apellidosNombres?: string;
  email: string;
  role: 'teacher' | 'student';
}

// ManagedStudent now directly reflects data from Supabase 'profiles' table
export interface ManagedStudent {
  id: string; // Supabase auth user ID and profiles.id
  dni: string;
  email: string; 
  apellidosNombres?: string; // Corresponds to full_name in profiles
  materia?: string;
  createdAt: Date; // Will be populated from profiles.registered_at if exists, or defaulted
  is_authorized?: boolean;
}

export type QuestionType =
  | 'multiple-choice'
  | 'multiple-response'
  | 'free-text'
  | 'weighted-choice'
  | 'argument-reconstruction'
  | 'true-false-justification'
  | 'true-false-complex'
  | 'cloze';

export interface MultipleChoiceOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface WeightedChoiceOption {
  id: string;
  text: string;
  percentage: number;
}

export interface ArgumentItem {
  id: string;
  text: string;
}

export interface BaseQuestion {
  id: string;
  text: string;
  type: QuestionType;
  points?: number;
  feedback?: string;
}

export interface MultipleChoiceQuestion extends BaseQuestion {
  type: 'multiple-choice';
  options: MultipleChoiceOption[];
  randomizeOptions?: boolean;
}

export interface MultipleResponseQuestion extends BaseQuestion {
  type: 'multiple-response';
  options: MultipleChoiceOption[];
  randomizeOptions?: boolean;
}

export interface FreeTextQuestion extends BaseQuestion {
  type: 'free-text';
}

export interface WeightedChoiceQuestion extends BaseQuestion {
  type: 'weighted-choice';
  options: WeightedChoiceOption[];
  randomizeOptions?: boolean;
  allowMultipleSelections?: boolean;
}

export interface ArgumentReconstructionQuestion extends BaseQuestion {
  type: 'argument-reconstruction';
  items: ArgumentItem[];
  correctOrder: string[];
}

export interface TrueFalseJustificationQuestion extends BaseQuestion {
  type: 'true-false-justification';
  affirmation: string;
  isAffirmationTrue: boolean;
  justificationOptions: MultipleChoiceOption[];
  pointsForAffirmation?: number;
  pointsForJustification?: number;
  randomizeJustificationOptions?: boolean;
}

export interface TrueFalseComplexQuestion extends BaseQuestion {
  type: 'true-false-complex';
  statement: string;
  isStatementTrue: boolean;
}

export type ClozeSubQuestionType = "multiple-choice" | "short-answer" | "numerical";

export interface ClozeSubQuestionOption {
  id: string;
  text: string;
  percentage?: number;
  isCorrect?: boolean;
  feedback?: string;
}

export interface ClozeSubQuestion {
  id: string;
  placeholderLabel: string;
  type: ClozeSubQuestionType;
  points: number;
  options?: ClozeSubQuestionOption[];
  correctAnswer?: string | number;
  correctOptionId?: string; // Potentially used if only one option is correct for MC
  correctOptionIds?: string[]; // Potentially used if multiple options are correct for MC
  allowMultipleSelectionsInSubQuestion?: boolean;
  randomizeSubQuestionOptions?: boolean;
}

export interface ClozeQuestion extends BaseQuestion {
  type: 'cloze';
  textWithPlaceholders: string;
  subQuestions: ClozeSubQuestion[];
}

export type Question =
  | MultipleChoiceQuestion
  | MultipleResponseQuestion
  | FreeTextQuestion
  | WeightedChoiceQuestion
  | ArgumentReconstructionQuestion
  | TrueFalseJustificationQuestion
  | TrueFalseComplexQuestion
  | ClozeQuestion;

export type OnTimeUpAction = 'auto-submit' | 'prevent-submit' | 'allow-submission-grace-period';

export interface QualitativeRating {
  id?: string; // Can be auto-generated if not provided
  label: string;
  minPercentage: number; 
  isPassing?: boolean;    
}

// Exam type aligned with Supabase 'exams' table
export interface Exam {
  id: string; // uuid from Supabase
  title: string;
  description?: string | null;
  duration_minutes: number;
  questions: Question[]; // Stored as JSONB in Supabase
  teacher_id: string; // uuid, FK to profiles.id
  access_code?: string | null;
  created_at: string; // timestamptz from Supabase
  updated_at: string; // timestamptz from Supabase
  randomize_questions?: boolean;
  on_time_up_action?: OnTimeUpAction;
  grace_period_minutes?: number | null;
  auto_submit_on_focus_loss?: boolean;
  evaluation_type: 'quantitative' | 'qualitative';
  approval_threshold?: number | null; 
  qualitative_ratings?: QualitativeRating[] | null; // Stored as JSONB
  grades_published?: boolean;
  show_grades_on_completion?: boolean;
}

export interface Answer {
  questionId: string;
  value: string | string[] | { affirmationResponse: boolean | null; justificationId: string | null } | boolean | null | Record<string, string | string[] | number | boolean | null>;
  score?: number;
}

export type Infraction = { type: 'copy' | 'paste' | 'focus-lost'; timestamp: string };

// Submission type aligned with Supabase 'submissions' table
export interface Submission {
  id: string; // uuid from Supabase
  exam_id: string; // uuid, FK to exams.id
  student_id: string; // uuid, FK to profiles.id (Supabase User ID)
  answers: Answer[]; // Stored as JSONB
  submitted_at: string; // timestamptz from Supabase
  score?: number | null;
  graded_at?: string | null; // timestamptz
  time_taken_seconds?: number | null; 
  essay_grading_results?: Array<{ questionId: string; feedback: GradeEssayQuestionOutput }> | null; // Stored as JSONB
  infractions?: Infraction[] | null;
}


export interface AuthenticatedUser {
  id?: string; // Supabase User ID
  dni: string; // From profiles table
  apellidosNombres?: string; // From profiles table (full_name)
  email?: string; // From auth.users
  role: 'teacher' | 'student'; // From profiles table
}

export interface StudentActionStateBase {
    message?: string;
    success?: boolean;
}

export interface JoinExamActionState extends StudentActionStateBase {
    errors?: {
        accessCode?: string[];
        _form?: string[];
    };
    examId?: string;
}
