
"use client";

import React, { useActionState, useEffect, useTransition } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { joinExamAction, type JoinExamActionState } from "@/lib/actions/student.actions";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, LogIn, Loader2, FileText, UserX, CheckCircle } from "lucide-react"; // Added CheckCircle
import { PageHeader } from "@/components/shared/PageHeader";

const JoinExamFormSchema = z.object({
  accessCode: z.string().min(6, "El código debe tener al menos 6 caracteres").max(10, "Código demasiado largo"),
});

type JoinExamFormValues = z.infer<typeof JoinExamFormSchema>;

interface JoinExamFormProps {
  userId?: string; // Supabase User ID
  fullName?: string; // From Supabase profile
  email?: string;
  materia?: string;
  role?: string;
}

export function JoinExamForm({ userId, fullName, email, materia, role }: JoinExamFormProps) {
  const [state, formAction, isActionPending] = useActionState<JoinExamActionState | null, FormData>(joinExamAction, null);
  const [isTransitionPending, startTransition] = useTransition();
  const { toast } = useToast();

  const studentUserId = userId;
  const studentFullName = fullName;
  const studentEmail = email;
  const studentMateria = materia;
  const studentRole = role;

  const isUserIdentified = typeof studentUserId === 'string' && studentUserId.trim() !== '';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isClientSubmitting },
    setError,
  } = useForm<JoinExamFormValues>({
    resolver: zodResolver(JoinExamFormSchema),
    defaultValues: {
      accessCode: "",
    },
  });

  useEffect(() => {
    if (!state) return;
    if (state.success === false && state.message) {
      // Specific handling for "exam already taken" message
      if (state.errors?._form && state.errors._form.some(msg => msg.includes("Ya has completado este examen"))) {
        // Do nothing here, as we will display it directly in the form content
      } else {
        toast({ title: "Error al Unirse al Examen", description: state.message, variant: "destructive" });
      }

      if (state.errors) {
        (Object.keys(state.errors) as Array<keyof JoinExamFormValues | '_form'>).forEach((key) => {
          const fieldError = state.errors![key as keyof JoinExamActionState['errors']]?.[0];
          if (fieldError && key !== '_form') { // Don't set _form errors via setError
              setError(key as keyof JoinExamFormValues, { type: "server", message: fieldError });
          }
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, toast, setError]);

  const handleFormSubmit = (data: JoinExamFormValues) => {
    if (!isUserIdentified) {
        toast({
            title: "Error de Identificación",
            description: "No se pudo identificar al estudiante (ID de usuario no encontrado). Asegúrate de haber iniciado sesión.",
            variant: "destructive",
        });
        return;
    }
    const formData = new FormData();
    formData.append('accessCode', data.accessCode);
    if (studentUserId) formData.append('userId', studentUserId);
    if (studentEmail) formData.append('email', studentEmail);
    if (studentFullName) formData.append('fullName', studentFullName);
    if (studentMateria) formData.append('materia', studentMateria);
    if (studentRole) formData.append('role', studentRole);


    startTransition(() => {
      formAction(formData);
    });
  };

  const isActuallySubmitting = isClientSubmitting || isActionPending || isTransitionPending;

  let displayName = "Estudiante";
  if (studentFullName) {
    displayName = studentFullName;
  } else if (studentEmail) {
    displayName = studentEmail;
  }


  return (
    <>
      <PageHeader
        title="Ingresar Código de Examen"
        description={`Bienvenido/a ${displayName}. Ingresa el código de acceso proporcionado por tu docente.`}
        icon={FileText}
      />
      <Card className="w-full max-w-md mx-auto shadow-lg mt-8">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-primary">
            <LogIn className="h-6 w-6" /> Ingresar Código de Examen
          </CardTitle>
          <CardDescription>
            Introduce el código de acceso para comenzar tu evaluación.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <CardContent className="space-y-6">
            {!isUserIdentified ? (
              <Alert variant="destructive">
                <UserX className="h-4 w-4" />
                <AlertTitle>Error de Identificación</AlertTitle>
                <AlertDescription>
                  No se pudo identificar al estudiante (ID de usuario no encontrado en los parámetros). Por favor, asegúrate de haber iniciado sesión correctamente.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {state?.message && !state.success && state.errors?._form && (
                  <Alert variant={state.errors._form.some(msg => msg.includes("Ya has completado este examen")) ? "default" : "destructive"}
                         className={state.errors._form.some(msg => msg.includes("Ya has completado este examen")) ? "bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700" : ""}
                  >
                    {state.errors._form.some(msg => msg.includes("Ya has completado este examen"))
                        ? <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        : <AlertTriangle className="h-4 w-4" />
                    }
                    <AlertTitle className={state.errors._form.some(msg => msg.includes("Ya has completado este examen")) ? "text-blue-700 dark:text-blue-300" : ""}>
                        {state.errors._form.some(msg => msg.includes("Ya has completado este examen")) ? "Examen Ya Realizado" : "Error"}
                    </AlertTitle>
                    <AlertDescription className={state.errors._form.some(msg => msg.includes("Ya has completado este examen")) ? "text-blue-600 dark:text-blue-400" : ""}>
                        {state.errors._form[0]}
                    </AlertDescription>
                  </Alert>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="accessCode-join">Código de Acceso</Label>
                  <Input
                    id="accessCode-join"
                    {...register("accessCode")}
                    placeholder="Ej: ABC123"
                    className="uppercase"
                    autoCapitalize="characters"
                    maxLength={10}
                    disabled={!isUserIdentified}
                  />
                  {errors.accessCode && <p className="text-sm text-destructive">{errors.accessCode.message}</p>}
                </div>
              </>
            )}
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={isActuallySubmitting || !isUserIdentified}
            >
              {isActuallySubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />}
              {isActuallySubmitting ? "Verificando..." : "Comenzar Examen"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </>
  );
}
