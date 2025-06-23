
'use server';

import type {
    Exam, Question, Submission, OnTimeUpAction, ManagedStudent,
    MultipleChoiceQuestion, MultipleResponseQuestion, FreeTextQuestion,
    MultipleChoiceOption, WeightedChoiceOption, ArgumentItem,
    TrueFalseJustificationQuestion, TrueFalseComplexQuestion,
    ClozeQuestion, ClozeSubQuestion, ClozeSubQuestionOption, QualitativeRating, Answer, Infraction
} from './types';
import { createSupabaseServerClient } from './supabase/server';

// Helper to generate client-side IDs for question sub-elements if not present from DB/AI
const generateClientSideId = () => `client-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;


// --- Managed Students (Uses Supabase 'profiles' table) ---
export async function getAllManagedStudents(): Promise<ManagedStudent[]> {
  const supabase = await createSupabaseServerClient();
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, dni, email, full_name, materia, registered_at, is_authorized')
    .eq('role', 'alumno');

  if (error) {
    console.error("[DB getAllManagedStudents] Error fetching student profiles from Supabase:", error.message);
    return [];
  }
  if (!profiles) return [];

  return profiles.map(profile => ({
    id: profile.id,
    dni: profile.dni || 'N/A',
    email: profile.email || 'N/A',
    apellidosNombres: profile.full_name || 'N/A',
    materia: profile.materia || undefined,
    createdAt: profile.registered_at ? new Date(profile.registered_at) : new Date(),
    is_authorized: profile.is_authorized || false,
  }));
}

export async function getManagedStudentByDni(dni: string): Promise<ManagedStudent | null> {
  const supabase = await createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, dni, email, full_name, materia, registered_at, is_authorized')
    .eq('dni', dni)
    .eq('role', 'alumno')
    .maybeSingle();

  if (error) {
    console.error(`[DB getManagedStudentByDni] Error fetching student profile for DNI ${dni}:`, error.message);
    return null;
  }
  if (!profile) return null;

  return {
    id: profile.id,
    dni: profile.dni || 'N/A',
    email: profile.email || 'N/A',
    apellidosNombres: profile.full_name || 'N/A',
    materia: profile.materia || undefined,
    createdAt: profile.registered_at ? new Date(profile.registered_at) : new Date(),
    is_authorized: profile.is_authorized || false,
  };
}

export async function getManagedStudentById(id: string): Promise<ManagedStudent | null> {
  const supabase = await createSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, dni, email, full_name, materia, registered_at, is_authorized')
    .eq('id', id)
    // .eq('role', 'alumno') // Role check can be done by caller if needed, or keep if strict
    .maybeSingle();

  if (error) {
    console.error(`[DB getManagedStudentById] Error fetching student profile for ID ${id}:`, error.message);
    return null;
  }
  if (!profile) return null;

  return {
    id: profile.id,
    dni: profile.dni || 'N/A',
    email: profile.email || 'N/A',
    apellidosNombres: profile.full_name || 'N/A',
    materia: profile.materia || undefined,
    createdAt: profile.registered_at ? new Date(profile.registered_at) : new Date(),
    is_authorized: profile.is_authorized || false,
  };
}


export async function deleteManagedStudentById(id: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`[DB deleteManagedStudentById] Error deleting student profile ID ${id} from Supabase:`, error.message);
    return false;
  }
  return true;
}

// --- Exams (Now using Supabase 'exams' table) ---

function processQuestionsFromDB(questions: any): Question[] {
    if (!Array.isArray(questions)) return [];
    return questions.map((q: any) => {
        const questionId = q.id || generateClientSideId();
        let processedQ: Partial<Question> = { ...q, id: questionId };

        if (q.options && Array.isArray(q.options)) {
            processedQ.options = q.options.map((opt: any) => ({ ...opt, id: opt.id || generateClientSideId() }));
        }
        if (q.items && Array.isArray(q.items)) {
            processedQ.items = q.items.map((item: any) => ({ ...item, id: item.id || generateClientSideId() }));
        }
        if (q.justificationOptions && Array.isArray(q.justificationOptions)) {
            processedQ.justificationOptions = q.justificationOptions.map((opt: any) => ({ ...opt, id: opt.id || generateClientSideId() }));
        }
        if (q.subQuestions && Array.isArray(q.subQuestions)) {
            processedQ.subQuestions = q.subQuestions.map((sq: any) => {
                const subQId = sq.id || generateClientSideId();
                let processedSQ: Partial<ClozeSubQuestion> = { ...sq, id: subQId };
                if (sq.options && Array.isArray(sq.options)) {
                    processedSQ.options = sq.options.map((opt: any) => ({ ...opt, id: opt.id || generateClientSideId() }));
                }
                return processedSQ as ClozeSubQuestion;
            });
        }
        return processedQ as Question;
    });
}


export async function saveExam(
    examData: Omit<Exam, 'id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<Exam> {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  // Common fields for both create and update
  const commonData: any = {
    teacher_id: examData.teacher_id,
    title: examData.title,
    description: examData.description,
    duration_minutes: examData.duration_minutes,
    questions: examData.questions,
    randomize_questions: examData.randomize_questions,
    on_time_up_action: examData.on_time_up_action,
    grace_period_minutes: examData.grace_period_minutes,
    auto_submit_on_focus_loss: examData.auto_submit_on_focus_loss,
    show_grades_on_completion: examData.show_grades_on_completion,
    evaluation_type: examData.evaluation_type,
    approval_threshold: examData.approval_threshold,
    qualitative_ratings: examData.qualitative_ratings,
    updated_at: now,
  };

  let savedExam;

  if (examData.id) { // Update existing exam
    const { data, error } = await supabase
      .from('exams')
      .update(commonData) // Update only common data, preserving access_code, created_at and grades_published
      .eq('id', examData.id)
      .select()
      .single();
    if (error) {
      console.error("Error updating exam in Supabase:", error);
      throw error;
    }
    savedExam = data;
  } else { // Create new exam
    const dataToInsert = {
      ...commonData,
      created_at: now,
      access_code: examData.access_code,
      grades_published: examData.show_grades_on_completion || false,
    };
    const { data, error } = await supabase
      .from('exams')
      .insert(dataToInsert)
      .select()
      .single();
    if (error) {
      console.error("Error inserting new exam in Supabase:", error);
      throw error;
    }
    savedExam = data;
  }

  if (!savedExam) throw new Error("Failed to save exam, no data returned from Supabase.");

  savedExam.questions = processQuestionsFromDB(savedExam.questions);

  return savedExam as Exam;
}

export async function getExamById(id: string): Promise<Exam | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching exam by ID ${id}:`, error.message);
    return null;
  }
  if (!data) return null;
  data.questions = processQuestionsFromDB(data.questions);
  return data as Exam;
}

export async function getExamByAccessCode(accessCode: string): Promise<Exam | null> {
  if (!accessCode || accessCode.trim() === "") return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('exams')
    .select('*')
    .eq('access_code', accessCode.toUpperCase())
    .maybeSingle();

  if (error) {
    console.error(`Error fetching exam by access code ${accessCode}:`, error.message);
    return null;
  }
   if (!data) return null;
  data.questions = processQuestionsFromDB(data.questions);
  return data as Exam;
}

export async function getAllExams(teacherId?: string): Promise<Exam[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from('exams').select('*');
  if (teacherId) {
    query = query.eq('teacher_id', teacherId);
  }
  query = query.order('created_at', { ascending: false });


  const { data, error } = await query;

  if (error) {
    console.error("Error fetching all exams:", error.message);
    return [];
  }
  if (!data) return [];
  return data.map(exam => ({ ...exam, questions: processQuestionsFromDB(exam.questions) })) as Exam[];
}

export async function deleteExamById(id: string): Promise<boolean> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from('exams')
    .delete()
    .eq('id', id);

  if (error) {
    console.error(`Error deleting exam ID ${id}:`, error.message);
    return false;
  }
  return true;
}

// --- Submissions (Now using Supabase 'submissions' table) ---

export async function saveSubmission(
  submissionData: Omit<Submission, 'id' | 'submitted_at' | 'graded_at'>
): Promise<Submission> {
  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();

  const dataToInsert = {
    exam_id: submissionData.exam_id,
    student_id: submissionData.student_id,
    answers: submissionData.answers,
    score: submissionData.score,
    time_taken_seconds: submissionData.time_taken_seconds,
    essay_grading_results: submissionData.essay_grading_results,
    submitted_at: now,
    infractions: submissionData.infractions,
  };

  const { data, error } = await supabase
    .from('submissions')
    .insert(dataToInsert)
    .select()
    .single();

  if (error) {
    console.error("Error saving submission to Supabase:", error);
    throw error;
  }
  if (!data) throw new Error("Failed to save submission, no data returned from Supabase.");
  return data as Submission;
}

export async function getSubmissionsByExamId(examId: string): Promise<Submission[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('submissions')
    .select(`
      *,
      student_profile:profiles (id, dni, email, full_name, materia)
    `)
    .eq('exam_id', examId)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error(`Error fetching submissions for exam ID ${examId}:`, error.message);
    return [];
  }
  return data as Submission[];
}

export async function getSubmissionsByStudentSupabaseId(studentSupabaseId: string): Promise<Submission[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('student_id', studentSupabaseId)
    .order('submitted_at', { ascending: false });

  if (error) {
    console.error(`Error fetching submissions for student Supabase ID ${studentSupabaseId}:`, error.message);
    return [];
  }
  return data as Submission[];
}

export async function getSubmissionById(submissionId: string): Promise<Submission | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching submission by ID ${submissionId}:`, error.message);
    return null;
  }
  return data as Submission | null;
}

export async function getLatestSubmissionByExamAndStudentId(examId: string, studentSupabaseId: string): Promise<Submission | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('exam_id', examId)
    .eq('student_id', studentSupabaseId)
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`Error fetching latest submission for exam ${examId} and student ${studentSupabaseId}:`, error.message);
    return null;
  }
  return data as Submission | null;
}

export async function __resetMockDB() {
  console.warn("Mock DB reset called, but exams and submissions now use Supabase. Student management also uses Supabase.");
}
