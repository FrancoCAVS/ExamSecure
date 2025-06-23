
"use client";

import React, { useActionState, useEffect, useTransition } from 'react';
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
// import { updateStudentProfileAction, type UpdateStudentActionState } from "@/lib/actions/student.actions"; // This action might need rework for Supabase
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Save, Loader2, UserCircle } from "lucide-react";
// Assuming profile updates will be handled by a new Supabase-specific action
// For now, this form is more for display and basic client-side validation demonstration

// Schema for data expected by this form.
// DNI and Email might be read-only if primary identification is via Supabase ID.
const StudentProfileClientSchema = z.object({
  userId: z.string().min(1, "User ID es requerido (oculto, solo lectura)"),
  email: z.string().email("Email inválido (solo lectura)"),
  fullName: z.string().min(3, "Apellidos y Nombres Completos son requeridos.").max(100, "Texto demasiado largo."),
  materia: z.string().max(100, "Materia/Asignatura demasiado larga.").optional().nullable(),
  // DNI: z.string().optional(), // DNI field is no longer primary from auth
});

type StudentProfileFormValues = z.infer<typeof StudentProfileClientSchema>;

interface StudentProfileFormProps {
  initialData: { // Reflecting data from Supabase context now
    userId?: string;
    fullName?: string;
    email?: string;
    materia?: string;
  };
}

export function StudentProfileForm({ initialData }: StudentProfileFormProps) {
  // Placeholder for a new Supabase update action. The old one might not be compatible.
  // const [state, formAction, isActionPending] = useActionState<UpdateStudentActionState | null, FormData>(updateStudentProfileAction, null);
  const [isTransitionPending, startTransition] = useTransition();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isClientSubmitting, isDirty },
    reset,
    // setError, // Needed if connecting to a server action that returns field errors
  } = useForm<StudentProfileFormValues>({
    resolver: zodResolver(StudentProfileClientSchema),
    defaultValues: {
      userId: initialData.userId || "",
      email: initialData.email || "",
      fullName: initialData.fullName || "",
      materia: initialData.materia || "",
      // dni: initialData.dni || "", // DNI no longer primary from Supabase auth flow
    },
  });

  // useEffect for handling server action state (currently commented out)
  /*
  useEffect(() => {
    if (!state) return;
    if (state.success && state.message) {
      toast({ title: "Éxito", description: state.message });
      if (state.student) { // Assuming state.student returns Supabase profile structure
        reset({ 
            userId: state.student.id, // Supabase ID
            email: state.student.email, 
            fullName: state.student.fullName || "", 
            materia: state.student.materia || "" 
        });
      }
    } else if (!state.success && state.message) {
      toast({ title: "Error al Actualizar", description: state.message, variant: "destructive" });
      if (state.errors) {
        (Object.keys(state.errors) as Array<keyof StudentProfileFormValues | '_form'>).forEach((key) => {
          const fieldError = state.errors![key as keyof UpdateStudentActionState['errors']]?.[0];
          if (fieldError) {
            if (key !== '_form') {
              setError(key as keyof StudentProfileFormValues, { type: "server", message: fieldError });
            }
          }
        });
      }
    }
  }, [state, toast, reset, setError]);
  */

  const handleFormSubmit = (data: StudentProfileFormValues) => {
    // TODO: Implement Supabase profile update logic here or call a new server action
    console.log("Form data to submit for profile update (Supabase):", data);
    toast({ title: "Funcionalidad en Desarrollo", description: "La actualización de perfil con Supabase se implementará." });
    // Example:
    // const formData = new FormData();
    // formData.append('userId', data.userId); 
    // formData.append('fullName', data.fullName);
    // if (data.materia) formData.append('materia', data.materia);
    // startTransition(() => {
    //   formAction(formData); // Call the new Supabase update action
    // });
  };

  const handleInvalidSubmit = (validationErrors: FieldErrors<StudentProfileFormValues>) => {
    let errorMessage = "Por favor, revisa los campos marcados en rojo.";
    if (validationErrors.fullName) {
        errorMessage = "Por favor, ingresa tus Apellidos y Nombres Completos.";
    }
    toast({
        title: "Datos Incompletos",
        description: errorMessage,
        variant: "destructive",
    });
  };
  
  const isActuallySubmitting = isClientSubmitting || isTransitionPending;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2 text-primary">
          <UserCircle className="h-6 w-6" /> Mis Datos Personales
        </CardTitle>
        <CardDescription>
          Actualiza tus apellidos, nombres y materia/asignatura si es necesario. Tu Email es tu identificador principal y no es editable aquí.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(handleFormSubmit, handleInvalidSubmit)}>
        <CardContent className="space-y-6">
          {/* Server error display (currently commented out)
          {state?.message && !state.success && state.errors?._form && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error al Actualizar</AlertTitle>
              <AlertDescription>{state.errors._form[0]}</AlertDescription>
            </Alert>
          )}
          */}
          <input type="hidden" {...register("userId")} />
          <div className="space-y-1.5">
            <Label htmlFor="email-profile">Email (Identificador Principal)</Label>
            <Input id="email-profile" type="email" {...register("email")} readOnly className="bg-muted/50 cursor-not-allowed" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          {/* DNI Field - ReadOnly or removed if not in profiles table
            <div className="space-y-1.5">
              <Label htmlFor="dni-profile">DNI (Solo Lectura)</Label>
              <Input id="dni-profile" {...register("dni")} readOnly className="bg-muted/50 cursor-not-allowed" />
              {errors.dni && <p className="text-sm text-destructive">{errors.dni.message}</p>}
            </div>
          */}
          <div className="space-y-1.5">
            <Label htmlFor="fullName-profile">Apellidos y Nombres Completos</Label>
            <Input id="fullName-profile" {...register("fullName")} placeholder="Tus apellidos y nombres completos" />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="materia-profile">Materia/Asignatura (Opcional)</Label>
            <Input id="materia-profile" {...register("materia")} placeholder="Ej: Matemáticas, Historia General" />
            {errors.materia && <p className="text-sm text-destructive">{errors.materia.message}</p>}
          </div>
           <p className="text-xs text-muted-foreground pt-2">
            Nota: El DNI ya no se gestiona aquí. Si necesitas actualizarlo, contacta al administrador.
          </p>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isActuallySubmitting || !isDirty}>
            {isActuallySubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
            {isActuallySubmitting ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
