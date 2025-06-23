
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server"; // Import Supabase server client
import { getExamById, getManagedStudentByDni, deleteManagedStudentById, getSubmissionById, saveSubmission } from "@/lib/db";
import type { ManagedStudent, Submission } from "@/lib/types";
import { redirect } from "next/navigation";

const AddManagedStudentSchema = z.object({
  dni: z.string().min(1, "DNI es requerido.").max(20, "DNI demasiado largo."),
  email: z.string().email("Email inválido."),
  apellidosNombres: z.string().min(3, "Apellidos y Nombres son requeridos.").max(100, "Texto demasiado largo."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  materia: z.string().max(100, "Materia/Asignatura demasiado larga.").optional(),
});

export interface AddManagedStudentActionState {
  message?: string;
  errors?: {
    dni?: string[];
    email?: string[];
    apellidosNombres?: string[];
    password?: string[];
    materia?: string[];
    _form?: string[];
  };
  success?: boolean;
  student?: ManagedStudent; 
}

export async function addManagedStudentAction(
  prevState: AddManagedStudentActionState | null,
  formData: FormData
): Promise<AddManagedStudentActionState> {
  const supabase = await createSupabaseServerClient();

  const validatedFields = AddManagedStudentSchema.safeParse({
    dni: formData.get("dni"),
    email: formData.get("email"),
    apellidosNombres: formData.get("apellidosNombres"),
    password: formData.get("password"),
    materia: formData.get("materia"),
  });

  if (!validatedFields.success) {
    return {
      message: "Error de validación.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { dni, email, apellidosNombres, password, materia } = validatedFields.data;

  // Webhook call
  const webhookPayload = {
    source: "ExamSecure - Add Student Attempt (Supabase Integration)",
    studentData: {
      dni,
      email,
      apellidosNombres,
      materia: materia || null,
    },
  };

  try {
    const webhookResponse = await fetch('http://localhost:5678/webhook-test/3183924a-e128-4952-a135-7787655832fc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload),
    });
    if (!webhookResponse.ok) {
      console.warn(`Add Student Webhook call failed: ${webhookResponse.status}`);
    }
  } catch (webhookError) {
    console.warn('Error calling Add Student webhook:', webhookError);
  }
  // End Webhook call

  try {
    const existingStudentByDni = await getManagedStudentByDni(dni);
    if (existingStudentByDni) {
      return {
        message: `Un perfil de estudiante con DNI ${dni} ya existe.`,
        errors: { dni: [`Estudiante con DNI ${dni} ya existe.`] },
        success: false,
      };
    }

    const signUpOptions = {
      email,
      password,
      options: {
        data: {
          full_name: apellidosNombres,
          dni: dni,
          materia: materia || null,
          role: 'alumno',
          is_authorized: false, // Teacher-created students are NOT authorized by default
        },
        // emailRedirectTo is removed to prevent confirmation emails, relying on Auto Confirm
      }
    };

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(signUpOptions);

    if (signUpError) {
      console.error("Supabase signUp error for teacher-added student:", signUpError.message);
      let userMessage = signUpError.message;
      if (signUpError.message.includes("User already registered")) {
        userMessage = "Este email ya está registrado para otro usuario.";
      } else if (signUpError.message.includes("Database error saving new user")) {
        userMessage = "Error de base de datos al crear el usuario. Verifica el trigger 'handle_new_user' y la tabla 'profiles' en Supabase (columnas NOT NULL, DEFAULTs).";
      }
      return {
        message: userMessage,
        errors: { _form: [userMessage] },
        success: false,
      };
    }

    if (!signUpData.user) {
      return {
        message: "No se pudo obtener la información del usuario después del registro en Supabase Auth.",
        errors: { _form: ["Error inesperado en Supabase Auth."] },
        success: false,
      };
    }
    
    revalidatePath("/teacher/students");
    return {
      message: `Estudiante ${apellidosNombres} registrado con email ${email}. El estudiante debe ser autorizado para poder iniciar sesión.`,
      success: true,
    };

  } catch (error) {
    console.error("Error in addManagedStudentAction:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido al añadir estudiante.";
    return {
      message: errorMessage,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}

export async function deleteManagedStudentAction(formData: FormData) {
  const studentId = formData.get("studentId") as string; 

  if (!studentId) {
    console.error("Delete student action: studentId (Supabase User ID) is missing from formData");
    return; 
  }

  try {
    const success = await deleteManagedStudentById(studentId); 
    if (success) {
      console.log(`Delete student action: Successfully deleted student profile ${studentId}`);
    } else {
      console.warn(`Delete student action: Failed to delete student profile ${studentId} or profile not found.`);
    }
  } catch (error) {
    console.error(`Delete student action: Error deleting student profile ${studentId}:`, error);
  }

  revalidatePath("/teacher/students");
}

// --- Update Managed Student Action ---
const UpdateManagedStudentSchema = z.object({
  studentId: z.string().uuid("ID de estudiante inválido."), // Supabase User ID
  apellidosNombres: z.string().min(3, "Apellidos y Nombres son requeridos.").max(100, "Texto demasiado largo."),
  materia: z.string().max(100, "Materia/Asignatura demasiado larga.").optional().nullable(),
});

export interface UpdateManagedStudentActionState {
  message?: string;
  errors?: {
    apellidosNombres?: string[];
    materia?: string[];
    _form?: string[];
  };
  success?: boolean;
}

export async function updateManagedStudentAction(
  prevState: UpdateManagedStudentActionState | null,
  formData: FormData
): Promise<UpdateManagedStudentActionState> {
  const studentId = formData.get("studentId") as string;

  if (!studentId) {
    return {
      message: "ID de estudiante no proporcionado.",
      errors: { _form: ["ID de estudiante faltante."] },
      success: false,
    };
  }
  
  const validatedFields = UpdateManagedStudentSchema.safeParse({
    studentId: studentId,
    apellidosNombres: formData.get("apellidosNombres"),
    materia: formData.get("materia"),
  });

  if (!validatedFields.success) {
    return {
      message: "Error de validación.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { apellidosNombres, materia } = validatedFields.data;
  const supabase = await createSupabaseServerClient();

  try {
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        full_name: apellidosNombres, 
        materia: materia || null // Ensure null is sent if materia is empty
      })
      .eq('id', studentId)
      .eq('role', 'alumno') // Extra safety: only update if role is 'alumno'
      .select('id')
      .single();

    if (updateError) {
      console.error("Error updating student profile in Supabase:", updateError);
      return {
        message: "No se pudo actualizar el perfil del estudiante en la base de datos.",
        errors: { _form: ["Error al guardar los cambios en Supabase."] },
        success: false,
      };
    }
    
    if (!updatedProfile) {
       return { 
         message: "No se encontró el perfil para actualizar o no se realizaron cambios.", 
         errors: { _form: ["Perfil no encontrado o sin cambios."]},
         success: false 
        };
    }

    revalidatePath("/teacher/students");
    return {
      message: "Perfil del estudiante actualizado exitosamente.",
      success: true,
    };

  } catch (error) {
    console.error("Error in updateManagedStudentAction:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido al actualizar el perfil del estudiante.";
    return {
      message: errorMessage,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}


export async function toggleStudentAuthorizationAction(formData: FormData) {
  const studentId = formData.get("studentId") as string;
  const currentStatus = formData.get("currentStatus") === 'true';

  if (!studentId) {
    console.error("Authorization toggle: studentId is missing.");
    revalidatePath("/teacher/students");
    return;
  }
  
  const supabase = await createSupabaseServerClient();

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      console.error("Authorization toggle: Could not get authenticated user.", authError);
      return redirect("/login?error=authentication_failed");
    }

    const user = authData.user;
    const profile = await getUserProfile(user.id);

    if (!profile || profile.role !== 'profesor') {
      console.error(`Authorization toggle: User ${user.id} is not authorized to perform this action.`);
      return redirect("/teacher/dashboard?error=unauthorized");
    }
    
    console.log(`Teacher ${user.id} is changing authorization for student ${studentId} to ${!currentStatus}`);
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_authorized: !currentStatus })
      .eq('id', studentId);
    
    if (updateError) {
      console.error(`Supabase update error toggling authorization for student ${studentId}:`, updateError.message);
      return redirect(`/teacher/students?error=${encodeURIComponent(updateError.message)}`);
    }

  } catch (e) {
    const error = e as Error;
    console.error("A critical error occurred in toggleStudentAuthorizationAction:", error.message);
    return redirect(`/teacher/students?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/teacher/students");
  redirect("/teacher/students");
}

const UpdateQuestionScoreSchema = z.object({
    submissionId: z.string().uuid("ID de envío inválido."),
    questionId: z.string().min(1, "ID de pregunta es requerido."),
    newScore: z.coerce.number().min(0, "La calificación no puede ser negativa."),
});

export interface UpdateQuestionScoreActionState {
    message?: string;
    errors?: { newScore?: string[]; _form?: string[] };
    success?: boolean;
}

export async function updateQuestionScoreAction(
  prevState: UpdateQuestionScoreActionState | null,
  formData: FormData
): Promise<UpdateQuestionScoreActionState> {
    const validatedFields = UpdateQuestionScoreSchema.safeParse({
        submissionId: formData.get("submissionId"),
        questionId: formData.get("questionId"),
        newScore: formData.get("newScore"),
    });

    if (!validatedFields.success) {
        return {
            success: false,
            message: "Error de validación.",
            errors: validatedFields.error.flatten().fieldErrors,
        };
    }
    
    const { submissionId, questionId, newScore } = validatedFields.data;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "No autorizado." };
    }

    try {
        const submission = await getSubmissionById(submissionId);
        if (!submission) {
            return { success: false, message: "No se encontró el envío." };
        }
        
        const exam = await getExamById(submission.exam_id);
        if (!exam || exam.teacher_id !== user.id) {
            return { success: false, message: "No autorizado para calificar este examen." };
        }

        const question = exam.questions.find(q => q.id === questionId);
        if (!question || newScore > (question.points || 0)) {
            return { success: false, message: `El puntaje no puede exceder el máximo de ${question?.points || 0} para esta pregunta.` };
        }

        const answerIndex = submission.answers.findIndex(a => a.questionId === questionId);
        if (answerIndex === -1) {
            return { success: false, message: "No se encontró la respuesta para esta pregunta en el envío." };
        }

        submission.answers[answerIndex].score = newScore;
        const totalScore = submission.answers.reduce((sum, ans) => sum + (ans.score || 0), 0);
        
        const updatedSubmission: Partial<Submission> = {
            answers: submission.answers,
            score: totalScore,
            graded_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabase
            .from('submissions')
            .update(updatedSubmission)
            .eq('id', submissionId);

        if (updateError) {
            console.error("Error updating submission score:", updateError);
            return { success: false, message: `Error de base de datos: ${updateError.message}` };
        }
        
        revalidatePath(`/teacher/submissions/${submissionId}`);
        return { success: true, message: "Calificación de pregunta actualizada." };

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconocido en el servidor.";
        return { success: false, message };
    }
}

const PublishGradesSchema = z.object({
  examId: z.string().uuid("ID de examen inválido."),
});

export interface PublishGradesActionState {
    success?: boolean;
    message?: string;
}

export async function publishExamGradesAction(formData: FormData) {
    const validatedFields = PublishGradesSchema.safeParse({
        examId: formData.get("examId"),
    });

    if (!validatedFields.success) {
        throw new Error("ID de examen inválido proporcionado al publicar notas.");
    }
    
    const { examId } = validatedFields.data;
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect("/login");
    }
    
    try {
        const exam = await getExamById(examId);
        if (!exam || exam.teacher_id !== user.id) {
            return redirect('/teacher/dashboard?error=unauthorized');
        }

        const { error } = await supabase
            .from('exams')
            .update({ grades_published: true, updated_at: new Date().toISOString() })
            .eq('id', examId);
        
        if (error) {
            throw new Error(`Error de base de datos: ${error.message}`);
        }
        
        revalidatePath(`/teacher/exams/${examId}/results`);
        revalidatePath('/student/evaluations');
        revalidatePath('/student/results'); // Revalidating all possible student result pages

    } catch (error) {
       console.error("Error en publishExamGradesAction:", error);
       throw error;
    }

    redirect(`/teacher/exams/${examId}/results`);
}
