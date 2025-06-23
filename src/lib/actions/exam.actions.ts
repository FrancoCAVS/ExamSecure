
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { Question as QuestionTypeUnion, Exam, MultipleChoiceOption, WeightedChoiceOption, ArgumentItem, TrueFalseJustificationQuestion, TrueFalseComplexQuestion, ClozeQuestion, ClozeSubQuestion, ClozeSubQuestionOption, OnTimeUpAction, QualitativeRating } from "@/lib/types";
import { saveExam, deleteExamById, getExamById } from "@/lib/db";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";


const MultipleChoiceOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "El texto de la opción es requerido"),
  isCorrect: z.boolean().default(false),
});

const WeightedChoiceOptionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "El texto de la opción es requerido"),
  percentage: z.coerce.number().min(-100, "El porcentaje no puede ser menor que -100.").max(100, "El porcentaje no puede exceder 100."),
});

const ArgumentItemSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "El texto del ítem de argumento es requerido."),
});

const BaseQuestionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "El texto/título de la pregunta es requerido"),
  points: z.coerce.number().min(0).optional().default(0),
  feedback: z.string().optional().default(""),
});

const MultipleChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.enum(["multiple-choice"]),
  options: z.array(MultipleChoiceOptionSchema).min(2, "Se requieren al menos 2 opciones")
    .refine(options => options.filter(opt => opt.isCorrect).length === 1, {
      message: "Debe haber exactamente una opción marcada como correcta.",
    }),
  randomizeOptions: z.boolean().optional().default(false),
});

const MultipleResponseQuestionSchema = BaseQuestionSchema.extend({
  type: z.enum(["multiple-response"]),
  options: z.array(MultipleChoiceOptionSchema).min(2, "Se requieren al menos 2 opciones")
    .refine(options => options.some(opt => opt.isCorrect), {
      message: "Debe haber al menos una opción marcada como correcta.",
    }),
  randomizeOptions: z.boolean().optional().default(false),
});

const FreeTextQuestionSchema = BaseQuestionSchema.extend({
  type: z.enum(["free-text"]),
});

const WeightedChoiceQuestionSchema = BaseQuestionSchema.extend({
  type: z.enum(["weighted-choice"]),
  options: z.array(WeightedChoiceOptionSchema).min(1, "Se requiere al menos 1 opción")
   .refine(options => {
      return options.length > 0;
   }, {
        message: "Se requiere al menos una opción ponderada."
    }),
  randomizeOptions: z.boolean().optional().default(false),
  allowMultipleSelections: z.boolean().optional().default(false),
});

const ArgumentReconstructionQuestionSchema = BaseQuestionSchema.extend({
  type: z.enum(["argument-reconstruction"]),
  items: z.array(ArgumentItemSchema).min(3, "Se requieren al menos 3 ítems (ej: 2 premisas, 1 conclusión)."),
  correctOrder: z.array(z.string()).optional(),
});

const TrueFalseJustificationQuestionSchema = BaseQuestionSchema.extend({
  type: z.enum(["true-false-justification"]),
  affirmation: z.string().min(1, "La afirmación es requerida."),
  isAffirmationTrue: z.boolean(),
  justificationOptions: z.array(MultipleChoiceOptionSchema).min(2, "Se requieren al menos 2 opciones de justificación.")
    .refine(options => options.filter(opt => opt.isCorrect).length === 1, {
      message: "Debe haber exactamente una justificación marcada como correcta.",
    }),
  pointsForAffirmation: z.coerce.number().min(0).optional().default(5),
  pointsForJustification: z.coerce.number().min(0).optional().default(5),
  randomizeJustificationOptions: z.boolean().optional().default(false),
});

const TrueFalseComplexQuestionSchema = BaseQuestionSchema.extend({
  type: z.enum(["true-false-complex"]),
  statement: z.string().min(1, "El enunciado complejo es requerido."),
  isStatementTrue: z.boolean(),
});

const ClozeSubQuestionOptionActionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "El texto de la opción de subpregunta es requerido."),
  percentage: z.coerce.number().min(-100).max(100).optional(),
  isCorrect: z.boolean().optional(),
  feedback: z.string().optional(),
});

const ClozeSubQuestionActionSchema = z.object({
  id: z.string().optional(),
  placeholderLabel: z.string().min(1, "La etiqueta del placeholder es requerida."),
  type: z.enum(["multiple-choice", "short-answer", "numerical"]),
  points: z.coerce.number().min(0, "Los puntos de la subpregunta deben ser no negativos."),
  options: z.array(ClozeSubQuestionOptionActionSchema).optional(),
  correctAnswer: z.union([z.string(), z.number()]).optional(),
  correctOptionId: z.string().optional(),
  correctOptionIds: z.array(z.string()).optional(),
  allowMultipleSelectionsInSubQuestion: z.boolean().optional().default(false),
  randomizeSubQuestionOptions: z.boolean().optional().default(false),
}).refine(data => {
    if (data.type === "multiple-choice" && (!data.options || data.options.length < 1)) {
        // console.warn("Cloze MC sub-question should have at least 1 option:", data.placeholderLabel);
    }
    if ((data.type === "short-answer" || data.type === "numerical") && data.correctAnswer === undefined) {
        // console.warn("Cloze SA/Num sub-question needs a correctAnswer:", data.placeholderLabel);
    }
    return true;
}, { message: "Configuración de subpregunta Cloze inválida." });


const ClozeQuestionSchema = BaseQuestionSchema.extend({
  type: z.enum(["cloze"]),
  textWithPlaceholders: z.string().min(1, "El texto con placeholders es requerido."),
  subQuestions: z.array(ClozeSubQuestionActionSchema).min(1, "Se requiere al menos una subpregunta para Cloze."),
});

const QuestionSchema = z.discriminatedUnion("type", [
  MultipleChoiceQuestionSchema,
  MultipleResponseQuestionSchema,
  FreeTextQuestionSchema,
  WeightedChoiceQuestionSchema,
  ArgumentReconstructionQuestionSchema,
  TrueFalseJustificationQuestionSchema,
  TrueFalseComplexQuestionSchema,
  ClozeQuestionSchema,
]);

const BaseExamDetailsSchema = z.object({
  title: z.string().min(1, "El título del examen es requerido"),
  description: z.string().optional(),
  duration_minutes: z.coerce.number().min(1, "La duración debe ser de al menos 1 minuto"),
  questions: z.array(QuestionSchema).min(0, "El examen puede no tener preguntas inicialmente"),
  randomize_questions: z.boolean().optional().default(false),
  on_time_up_action: z.enum(['auto-submit', 'prevent-submit', 'allow-submission-grace-period']).optional().default('auto-submit'),
  grace_period_minutes: z.coerce.number().min(1, "El tiempo de gracia debe ser de al menos 1 minuto.").optional(),
  auto_submit_on_focus_loss: z.boolean().optional().default(false),
  show_grades_on_completion: z.boolean().optional().default(false),
});

const QualitativeEvalConfigSchema = z.object({
  evaluation_type: z.literal('qualitative'),
  qualitative_ratings: z.array(z.object({
    id: z.string().optional(),
    label: z.string().min(1, "La etiqueta de la valoración es requerida."),
    minPercentage: z.coerce.number().min(0, "Mín. % debe ser >= 0").max(100, "Mín. % debe ser <= 100"),
    isPassing: z.boolean().optional().default(false),
  })).min(1, "Se requiere al menos una valoración cualitativa.").optional().nullable(),
  approval_threshold: z.undefined().optional(),
});

const QuantitativeEvalConfigSchema = z.object({
  evaluation_type: z.literal('quantitative'),
  approval_threshold: z.coerce.number().min(0, "Umbral debe ser >= 0").max(100, "Umbral debe ser <= 100").optional().nullable(),
  qualitative_ratings: z.undefined().optional(),
});

const ExamFormValidationSchema = z.discriminatedUnion("evaluation_type", [
  BaseExamDetailsSchema.merge(QuantitativeEvalConfigSchema),
  BaseExamDetailsSchema.merge(QualitativeEvalConfigSchema),
]).refine(data => {
  if (data.on_time_up_action === 'allow-submission-grace-period' && (data.grace_period_minutes === undefined || data.grace_period_minutes <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Se debe especificar un tiempo de gracia mayor a 0 minutos si se selecciona esa opción.",
  path: ["grace_period_minutes"],
});


function generateExamAccessCode(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  let codeChars: string[] = [];

  for (let i = 0; i < 4; i++) {
    codeChars.push(letters.charAt(Math.floor(Math.random() * letters.length)));
  }
  for (let i = 0; i < 2; i++) {
    codeChars.push(numbers.charAt(Math.floor(Math.random() * numbers.length)));
  }

  // Shuffle the characters
  for (let i = codeChars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [codeChars[i], codeChars[j]] = [codeChars[j], codeChars[i]];
  }
  return codeChars.join('');
}

export async function createOrUpdateExam(prevState: any, formData: FormData) {
  let savedExamDetails: Exam | null = null;
  const examId = formData.get("examId") as string | null;

  const supabase = await createSupabaseServerClient();
  console.log("[createOrUpdateExam] Intentando obtener el usuario de la sesión de Supabase...");
  const { data: authData, error: authError } = await supabase.auth.getUser();

  console.log("[createOrUpdateExam] Resultado de supabase.auth.getUser():");
  console.log("  Auth Data (el objeto 'user' debería estar aquí):", JSON.stringify(authData, null, 2));
  console.log("  Auth Error (si lo hubo):", JSON.stringify(authError, null, 2));

  const user = authData?.user;

  if (authError || !user) {
    console.error("[createOrUpdateExam] CRÍTICO: Usuario NO autenticado o error al obtener el usuario. Error de Auth:", authError?.message, "Objeto User:", user);
    return { message: "Usuario no autenticado. La sesión no pudo ser verificada en el servidor. Por favor, cierra sesión y vuelve a iniciarla. Revisa los logs del servidor para más detalles si el problema persiste." };
  }
  console.log("[createOrUpdateExam] Usuario autenticado correctamente. User ID:", user.id, "User Email:", user.email);


  const profile = await getUserProfile(user.id);
  console.log("[createOrUpdateExam] Perfil de Usuario desde DB (getUserProfile):", JSON.stringify(profile, null, 2));

  if (!profile) {
    console.error("[createOrUpdateExam] Perfil no encontrado para User ID:", user.id, "- El usuario podría estar autenticado en Supabase Auth pero sin un registro correspondiente en la tabla 'profiles'.");
    return { message: "Perfil de usuario no encontrado. Asegúrate de que tu perfil esté completamente configurado. Contacta al administrador si el problema persiste." };
  }
  console.log("[createOrUpdateExam] Rol del Usuario desde Perfil:", profile.role);


  if (profile.role !== 'profesor') {
    console.warn("[createOrUpdateExam] El rol del usuario no es 'profesor'. Rol:", profile.role);
    return { message: "Usuario no autorizado para crear o actualizar exámenes." };
  }
  const teacherId = user.id;


  try {
    const rawData = {
      title: formData.get("title"),
      description: formData.get("description"),
      duration_minutes: formData.get("durationMinutes"), // Note: form field is durationMinutes
      randomize_questions: formData.get("randomizeQuestions") === 'on' || formData.get("randomizeQuestions") === 'true',
      on_time_up_action: formData.get("onTimeUpAction") as OnTimeUpAction || 'auto-submit',
      grace_period_minutes: formData.get("gracePeriodMinutes") ? Number(formData.get("gracePeriodMinutes")) : undefined,
      auto_submit_on_focus_loss: formData.get("autoSubmitOnFocusLoss") === 'on' || formData.get("autoSubmitOnFocusLoss") === 'true',
      show_grades_on_completion: formData.get("show_grades_on_completion") === 'on' || formData.get("show_grades_on_completion") === 'true',
      evaluation_type: formData.get("evaluationType") as 'quantitative' | 'qualitative' || 'quantitative',
      approval_threshold: formData.get("approvalThreshold") ? Number(formData.get("approvalThreshold")) : undefined,
      qualitative_ratings: formData.get("qualitativeRatingsJson") ? JSON.parse(formData.get("qualitativeRatingsJson") as string) : undefined,
    };

    let questions: Array<z.infer<typeof QuestionSchema>> = [];
    try {
        const questionsJson = formData.get("questionsJson");
        if (typeof questionsJson === 'string') {
            const parsedQuestionsSource = JSON.parse(questionsJson);
            questions = parsedQuestionsSource.map((q: any) => {
                q.id = q.id || `temp-q-${Math.random().toString(36).substring(2, 9)}`;
                if (q.options) {
                    q.options.forEach((opt: any) => opt.id = opt.id || `temp-opt-${Math.random().toString(36).substring(2, 9)}`);
                }
                if (q.items) {
                    q.items.forEach((item: any) => item.id = item.id || `temp-item-${Math.random().toString(36).substring(2, 9)}`);
                }
                if (q.justificationOptions) {
                     q.justificationOptions.forEach((opt: any) => opt.id = opt.id || `temp-jopt-${Math.random().toString(36).substring(2, 9)}`);
                }
                if (q.type === 'argument-reconstruction' && q.items && (!q.correctOrder || q.correctOrder.length === 0)) {
                    q.correctOrder = q.items.map((item: any) => item.id).filter((id: any) => id);
                }
                 if (q.type === 'cloze' && q.subQuestions) {
                    q.subQuestions.forEach((sq: any) => {
                        sq.id = sq.id || `temp-sq-${Math.random().toString(36).substring(2, 9)}`;
                        if (sq.options) {
                            sq.options.forEach((opt: any) => opt.id = opt.id || `temp-sqopt-${Math.random().toString(36).substring(2, 9)}`);
                        }
                    });
                }
                return q;
            });
        } else {
            throw new Error("questionsJson is not a string or is missing");
        }
    } catch (e: any) {
        console.error("Error parsing questionsJson:", e);
        return { message: `Error al procesar las preguntas: ${e.message || "Formato JSON inválido."}`};
    }

    const examDataToParse: any = { ...rawData, questions };
     if (rawData.evaluation_type === 'quantitative') {
        delete examDataToParse.qualitative_ratings;
        if (rawData.approval_threshold === undefined) {
            examDataToParse.approval_threshold = 60;
        }
    } else {
        delete examDataToParse.approval_threshold;
        if (!rawData.qualitative_ratings || rawData.qualitative_ratings.length === 0) {
             examDataToParse.qualitative_ratings = [{id: `qr-default-${Date.now()}`, label: "Aprobado", minPercentage: 60, isPassing: true}];
        } else {
            examDataToParse.qualitative_ratings = rawData.qualitative_ratings.map((qr: any) => ({...qr, id: qr.id || `qr-new-${Date.now()}-${Math.random()}`}));
        }
    }


    const parsed = ExamFormValidationSchema.safeParse(examDataToParse);

    if (!parsed.success) {
      console.error("[createOrUpdateExam] Server-side validation errors:", JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
      return {
        message: "Error de validación en el servidor.",
        errors: parsed.error.flatten().fieldErrors,
      };
    }

    const payloadForDb: Omit<Exam, 'id' | 'created_at' | 'updated_at'> & { id?: string } = {
      title: parsed.data.title,
      description: parsed.data.description,
      duration_minutes: parsed.data.duration_minutes,
      questions: parsed.data.questions as QuestionTypeUnion[],
      teacher_id: teacherId,
      access_code: examId ? undefined : generateExamAccessCode(),
      randomize_questions: parsed.data.randomize_questions,
      on_time_up_action: parsed.data.on_time_up_action,
      grace_period_minutes: parsed.data.on_time_up_action === 'allow-submission-grace-period' ? parsed.data.grace_period_minutes : undefined,
      auto_submit_on_focus_loss: parsed.data.auto_submit_on_focus_loss,
      show_grades_on_completion: parsed.data.show_grades_on_completion,
      evaluation_type: parsed.data.evaluation_type,
      approval_threshold: parsed.data.evaluation_type === 'quantitative' ? parsed.data.approval_threshold : null,
      qualitative_ratings: parsed.data.evaluation_type === 'qualitative' ? parsed.data.qualitative_ratings : null,
    };

    if (examId) {
      payloadForDb.id = examId;
      delete payloadForDb.access_code;
    }

    console.log("[createOrUpdateExam] Payload for saveExam:", JSON.stringify(payloadForDb, null, 2));

    const examFromDb = await saveExam(payloadForDb);
    savedExamDetails = examFromDb;

    if (!examFromDb || !examFromDb.id) {
      return { message: "Error al guardar el examen en la base de datos. No se obtuvo un ID." };
    }

  } catch (error) {
    console.error(`[createOrUpdateExam] Error ${examId ? 'updating' : 'creating'} exam:`, error);
    if (error instanceof Error) {
        // Check for specific Supabase schema cache errors to provide a more helpful message.
        if (error.message.includes('Could not find the') && error.message.includes('column') && error.message.includes('schema cache')) {
            return { message: `Error de Base de Datos: Parece que falta una columna en tu tabla 'exams'. Revisa el error completo en los logs del servidor para identificar la columna faltante y agrégala a tu tabla en Supabase. Error: ${error.message}` };
        }
        return { message: `Error en el servidor al procesar el examen: ${error.message}` };
    }
    return { message: "Error desconocido en el servidor al procesar el examen. Intente de nuevo." };
  }

  if (savedExamDetails && savedExamDetails.id) {
    revalidatePath("/teacher/dashboard");
    revalidatePath(`/teacher/exams/${savedExamDetails.id}/edit`);
    redirect("/teacher/dashboard");
  } else {
    return { message: "No se pudo completar el guardado del examen y obtener confirmación." };
  }
}


export async function deleteExamAction(formData: FormData) {
  const examId = formData.get("examId") as string;

  if (!examId) {
    throw new Error("ID del examen no proporcionado.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Usuario no autenticado.");
  }

  const profile = await getUserProfile(user.id);
  if (!profile || profile.role !== 'profesor') {
    throw new Error("Usuario no autorizado para eliminar este examen.");
  }

  try {
    const examToDel = await getExamById(examId);
    if (examToDel && examToDel.teacher_id !== user.id) {
       throw new Error("No autorizado para eliminar este examen, no es el propietario.");
    }
    const success = await deleteExamById(examId);
    if (!success) {
      throw new Error(`No se pudo eliminar el examen ${examId} o no fue encontrado.`);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error del servidor al eliminar el examen: ${error.message}`);
    }
    throw new Error("Error desconocido del servidor al eliminar el examen.");
  }

  revalidatePath("/teacher/dashboard");
  redirect("/teacher/dashboard");
}
