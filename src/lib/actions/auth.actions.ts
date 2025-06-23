
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { getManagedStudentByDni } from "@/lib/db";

const SignInSchema = z.object({
  email: z.string().email("Email inválido."),
  password: z.string().min(1, "Contraseña es requerida."),
});

export interface SignInActionState {
  message?: string;
  errorTitle?: string;
  errors?: {
    email?: string[];
    password?: string[];
    _form?: string[];
  };
  success?: boolean;
}

export async function signInWithPasswordAction(
  prevState: SignInActionState | null,
  formData: FormData
): Promise<SignInActionState | void> {
  try {
    const supabase = await createSupabaseServerClient();

    const parsed = SignInSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      return {
        message: "Error de validación en los datos ingresados.",
        errors: parsed.error.flatten().fieldErrors,
        success: false,
        errorTitle: "Datos Inválidos",
      };
    }

    const { email, password } = parsed.data;

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      console.error("Supabase signInWithPassword error:", signInError.message);
      let userMessage = "Credenciales inválidas. Por favor, verifica tu email y contraseña.";
      if (signInError.message.includes("Invalid login credentials")) {
        userMessage = "Email o contraseña incorrectos.";
      } else if (signInError.message.includes("Email not confirmed")) {
        userMessage = "Tu email no ha sido confirmado. Por favor, revisa tu bandeja de entrada.";
      }
      return {
        message: userMessage,
        success: false,
        errorTitle: "Error de Inicio de Sesión",
        errors: { _form: [userMessage] },
      };
    }

    if (!signInData.user) {
      return {
        message: "No se pudo obtener la información del usuario después del inicio de sesión.",
        success: false,
        errorTitle: "Error de Usuario",
        errors: { _form: ["Error de autenticación inesperado."] },
      };
    }

    const user = signInData.user;
    const profile = await getUserProfile(user.id);

    if (!profile) {
      await supabase.auth.signOut();
      return {
        message: `El perfil para el usuario ${user.email} no fue encontrado en la base de datos. Se ha cerrado la sesión.`,
        success: false,
        errorTitle: "Perfil no encontrado",
        errors: { _form: ["No se encontró el perfil de usuario. Contacta al administrador."] },
      };
    }
    
    // Authorization Check
    if (profile.role === 'alumno' && profile.is_authorized === false) {
      await supabase.auth.signOut();
      return {
          message: "Tu cuenta aún no ha sido autorizada por un docente. Por favor, contacta a tu institución.",
          success: false,
          errorTitle: "Cuenta no autorizada",
          errors: { _form: ["Tu cuenta no ha sido autorizada."] }
      };
    }


    if (profile.role === 'profesor') {
      revalidatePath('/teacher', 'layout');
      redirect('/teacher/dashboard');
    } else if (profile.role === 'alumno') {
      revalidatePath('/student', 'layout');
      redirect('/student/profile');
    } else {
      await supabase.auth.signOut();
      return {
        message: `Rol de usuario desconocido o no asignado ('${profile.role}'). Acceso denegado.`,
        success: false,
        errorTitle: "Error de Rol",
        errors: { _form: ["Rol de usuario inválido."] },
      };
    }

  } catch (error: any) {
    const nextRedirectErrorCode = 'NEXT_REDIRECT';
    if (error && ( (typeof error.message === 'string' && error.message.includes(nextRedirectErrorCode)) || (typeof error.digest === 'string' && error.digest.includes(nextRedirectErrorCode)) )) {
      console.log("signInWithPasswordAction: NEXT_REDIRECT caught, re-throwing.");
      throw error;
    }

    console.error("SIGN_IN_ACTION (non-redirect error):", error);
    return { message: "Error interno del servidor. Por favor, intenta más tarde.", success: false, errorTitle: "Error del Servidor", errors: { _form: ["Error interno del servidor."] } };
  }
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Error signing out:", error.message);
  }
  redirect('/login');
}


// --- Sign Up Action ---
const SignUpSchema = z.object({
  email: z.string().email("Por favor, ingresa un email válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  fullName: z.string().min(3, "Ingresa tus apellidos y nombres.").max(100),
  dni: z.string().min(6, "El DNI debe tener al menos 6 caracteres.").max(15, "DNI demasiado largo."),
  materia: z.string().min(1, "La materia es requerida.").max(100, "Materia/Asignatura demasiado larga."),
});

export interface SignUpActionState {
  message?: string;
  errorTitle?: string;
  errors?: {
    email?: string[];
    password?: string[];
    fullName?: string[];
    dni?: string[];
    materia?: string[];
    _form?: string[];
  };
  success?: boolean;
}

export async function signUpAction(
  prevState: SignUpActionState | null,
  formData: FormData
): Promise<SignUpActionState> {
  const supabase = await createSupabaseServerClient();

  const parsed = SignUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    dni: formData.get("dni"),
    materia: formData.get("materia"),
  });

  if (!parsed.success) {
    return {
      message: "Error de validación en los datos de registro.",
      errors: parsed.error.flatten().fieldErrors,
      success: false,
      errorTitle: "Datos Inválidos",
    };
  }

  const { email, password, fullName, dni, materia } = parsed.data;

  // Check if DNI already exists
  const existingStudentByDni = await getManagedStudentByDni(dni);
  if (existingStudentByDni) {
    return {
      message: `Un perfil de estudiante con DNI ${dni} ya existe.`,
      errors: { dni: [`Un estudiante con este DNI ya existe.`] },
      success: false,
      errorTitle: "DNI Existente",
    };
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        dni: dni,
        materia: materia,
        role: 'alumno',
        is_authorized: false // User starts as not authorized.
      }
    }
  });

  if (signUpError) {
    console.error("Supabase signUp error:", signUpError.message);
    let userMessage = signUpError.message;
    let errorTitle = "Error de Registro";

    if (signUpError.message.includes("User already registered")) {
      userMessage = "Este email ya está registrado. Por favor, intenta iniciar sesión o utiliza otro email.";
      errorTitle = "Usuario Existente";
       return {
        message: userMessage,
        success: false,
        errorTitle: errorTitle,
        errors: { email: ["Email ya registrado."] },
      };
    } else if (signUpError.message.includes("Database error saving new user")) {
        userMessage = "Ocurrió un error con la base de datos al intentar crear el usuario. Esto podría deberse a una configuración incorrecta en la tabla 'profiles' (ej. nuevas columnas NOT NULL sin DEFAULT) o triggers asociados en Supabase que estén fallando. Por favor, revisa los logs de tu base de datos de Supabase para más detalles y asegúrate que tu trigger 'handle_new_user' maneja todas las columnas requeridas.";
        errorTitle = "Error de Base de Datos";
    }

    return {
      message: userMessage,
      success: false,
      errorTitle: errorTitle,
      errors: { _form: [userMessage] },
    };
  }


  if (signUpData.user) {
    // If sign up is successful, immediately sign the user out.
    // This prevents them from being auto-logged-in to a non-authorized account.
    // They will be forced to the login page, where the authorization check is performed.
    await supabase.auth.signOut();

    return {
      success: true,
      message: "¡Registro exitoso! Tu cuenta está pendiente de autorización por un docente. Serás notificado cuando puedas iniciar sesión.",
    };
  }

  return {
    message: "Error desconocido durante el proceso de registro. Intenta de nuevo.",
    success: false,
    errorTitle: "Error Inesperado",
    errors: { _form: ["Ocurrió un error inesperado."] },
  };
}
