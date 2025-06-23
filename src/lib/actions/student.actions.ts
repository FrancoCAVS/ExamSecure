
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getExamByAccessCode, getLatestSubmissionByExamAndStudentId, getManagedStudentById } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Exam } from "@/lib/types";

const UpdateStudentProfileSupabaseSchema = z.object({
  userId: z.string().uuid("ID de usuario inválido."),
  fullName: z.string().min(3, "Apellidos y Nombres Completos son requeridos.").max(100, "Texto demasiado largo."),
  materia: z.string().max(100, "Materia/Asignatura demasiado larga.").optional().nullable(),
});

export interface UpdateStudentSupabaseActionState {
  message?: string;
  errors?: {
    fullName?: string[];
    materia?: string[];
    _form?: string[];
  };
  success?: boolean;
  profile?: { id: string; full_name: string | null; email: string | undefined; materia: string | null };
}

export async function updateStudentProfileSupabaseAction(
  prevState: UpdateStudentSupabaseActionState | null,
  formData: FormData
): Promise<UpdateStudentSupabaseActionState> {
  const userId = formData.get("userId") as string;

  if (!userId) {
    return {
      message: "ID de usuario no proporcionado.",
      success: false,
      errors: { _form: ["ID de usuario no proporcionado, no se puede actualizar el perfil."] },
    };
  }

  const validatedFields = UpdateStudentProfileSupabaseSchema.safeParse({
    userId: userId,
    fullName: formData.get("fullName"),
    materia: formData.get("materia") || null,
  });

  if (!validatedFields.success) {
    return {
      message: "Error de validación.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { fullName, materia } = validatedFields.data;
  const supabase = await createSupabaseServerClient();

  try {
    const { data: user, error: userError } = await supabase.auth.getUser();
    if (userError || !user?.user || user.user.id !== userId) {
      return { message: "No autorizado o usuario no coincide.", success: false };
    }

    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName, materia: materia || null })
      .eq('id', userId)
      .select('id, full_name, materia')
      .single();

    if (updateError) {
      console.error("Error updating student profile in Supabase:", updateError);
      return {
        message: "No se pudo actualizar el perfil del estudiante en la base de datos.",
        success: false,
        errors: { _form: ["Error al guardar los cambios en Supabase."] },
      };
    }

    if (!updatedProfile) {
       return { message: "No se pudo obtener el perfil actualizado después del guardado.", success: false };
    }

    revalidatePath(`/student/profile`);
    revalidatePath(`/student/layout`);

    return {
      message: "Perfil actualizado exitosamente.",
      success: true,
      profile: { ...updatedProfile, email: user.user.email },
    };
  } catch (error) {
    console.error("Error in updateStudentProfileSupabaseAction:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido al actualizar el perfil.";
    return {
      message: errorMessage,
      success: false,
      errors: { _form: [errorMessage] },
    };
  }
}

const JoinExamSchema = z.object({
  accessCode: z.string().min(1, "Código de acceso es requerido."),
  userId: z.string().min(1, "ID de usuario es requerido."),
});

export interface JoinExamActionState {
  message?: string;
  errors?: {
    accessCode?: string[];
    _form?: string[];
  };
  success?: boolean;
  examId?: string;
}

export async function joinExamAction(
  prevState: JoinExamActionState | null,
  formData: FormData
): Promise<JoinExamActionState> {
  const validatedFields = JoinExamSchema.safeParse({
    accessCode: formData.get("accessCode"),
    userId: formData.get("userId"),
  });

  if (!validatedFields.success) {
    return {
      message: "Error de validación en los datos enviados.",
      errors: validatedFields.error.flatten().fieldErrors,
      success: false,
    };
  }

  const { accessCode, userId } = validatedFields.data;

  try {
    const exam = await getExamByAccessCode(accessCode.toUpperCase());
    if (!exam) {
      return {
        message: "Código de acceso inválido o el examen no existe.",
        errors: { accessCode: ["Código de acceso no encontrado."] },
        success: false,
      };
    }

    const existingSubmission = await getLatestSubmissionByExamAndStudentId(exam.id, userId);
    if (existingSubmission) {
      return {
        message: "Ya has completado este examen. No puedes volver a rendirlo.",
        errors: { _form: ["Ya has completado este examen."] },
        success: false,
      };
    }

    const params = new URLSearchParams();
    params.append('accessCode', accessCode);

    const redirectToUrl = `/student/exam/${exam.id}?${params.toString()}`;
    redirect(redirectToUrl);

  } catch (error: any) {
     const nextRedirectErrorCode = 'NEXT_REDIRECT';
    if (error && ( (typeof error.message === 'string' && error.message.includes(nextRedirectErrorCode)) || (typeof error.digest === 'string' && error.digest.includes(nextRedirectErrorCode)) )) {
      throw error;
    }
    console.error("Error in joinExamAction:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido al unirse al examen.";
    return {
      message: errorMessage,
      errors: { _form: [errorMessage] },
      success: false,
    };
  }
}
