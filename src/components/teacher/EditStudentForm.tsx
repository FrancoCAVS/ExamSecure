
"use client";

import React, { useActionState, useEffect, useTransition } from 'react';
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { updateManagedStudentAction, type UpdateManagedStudentActionState } from "@/lib/actions/teacher.actions";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Save, Loader2, X } from "lucide-react";
import type { ManagedStudent } from "@/lib/types";

const EditStudentFormSchemaClient = z.object({
  id: z.string().min(1, "ID de estudiante es requerido (oculto)."),
  dni: z.string(), // Readonly
  email: z.string().email(), // Readonly
  apellidosNombres: z.string().min(3, "Apellidos y Nombres Completos son requeridos.").max(100, "Texto demasiado largo."),
  materia: z.string().max(100, "Materia/Asignatura demasiado larga.").optional().nullable(),
});

type EditStudentFormValues = z.infer<typeof EditStudentFormSchemaClient>;

interface EditStudentFormProps {
  student: ManagedStudent;
  onFormSubmit: () => void; // Callback to close dialog or refresh
  onCancel: () => void;
}

export function EditStudentForm({ student, onFormSubmit, onCancel }: EditStudentFormProps) {
  const [state, formAction, isActionPending] = useActionState<UpdateManagedStudentActionState | null, FormData>(updateManagedStudentAction, null);
  const [, startSubmitTransition] = useTransition();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isClientSubmitting, isDirty },
    reset,
    setError,
  } = useForm<EditStudentFormValues>({
    resolver: zodResolver(EditStudentFormSchemaClient),
    defaultValues: {
      id: student.id,
      dni: student.dni,
      email: student.email,
      apellidosNombres: student.apellidosNombres || "",
      materia: student.materia || "",
    },
  });

  useEffect(() => {
    if (!state) return;

    if (state.success && state.message) {
      toast({
        title: "Éxito",
        description: state.message,
      });
      onFormSubmit(); // Call callback on success
    } else if (!state.success && state.message) {
      if (state.errors?._form) {
         toast({
            title: "Error al Actualizar",
            description: state.errors._form[0],
            variant: "destructive",
        });
      } else if (state.errors) {
        (Object.keys(state.errors) as Array<keyof EditStudentFormValues>).forEach((key) => {
          const fieldError = state.errors![key]?.[0];
          if (fieldError) {
            setError(key, { type: "server", message: fieldError });
          }
        });
         toast({
            title: "Error de Validación",
            description: state.message || "Por favor corrige los errores.",
            variant: "destructive",
        });
      } else {
         toast({
            title: "Error",
            description: state.message,
            variant: "destructive",
        });
      }
    }
  }, [state, toast, reset, setError, onFormSubmit]);

  const handleFormSubmitInternal = (data: EditStudentFormValues) => {
    const formData = new FormData();
    formData.append('studentId', data.id); // Use 'studentId' to match server action
    formData.append('apellidosNombres', data.apellidosNombres);
    if (data.materia) formData.append('materia', data.materia);
    else formData.append('materia', ''); // Send empty string if null/undefined

    startSubmitTransition(() => {
      formAction(formData);
    });
  };

  const handleInvalidSubmit = (validationErrors: FieldErrors<EditStudentFormValues>) => {
    let errorMessage = "Por favor, revisa los campos marcados en rojo.";
     if (validationErrors.apellidosNombres) {
        errorMessage = "Por favor, ingresa Apellidos y Nombres Completos válidos.";
    }
    toast({
        title: "Datos Inválidos",
        description: errorMessage,
        variant: "destructive",
    });
  };

  const isActuallySubmitting = isClientSubmitting || isActionPending;

  return (
    <form onSubmit={handleSubmit(handleFormSubmitInternal, handleInvalidSubmit)} className="space-y-6">
      {state?.message && !state.success && state.errors?._form && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error al Actualizar</AlertTitle>
          <AlertDescription>{state.errors._form[0]}</AlertDescription>
        </Alert>
      )}
      <input type="hidden" {...register("id")} />
      <div className="space-y-1.5">
        <Label htmlFor="dni-edit">DNI (Solo Lectura)</Label>
        <Input id="dni-edit" {...register("dni")} readOnly className="bg-muted/50 cursor-not-allowed" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email-edit">Email (Solo Lectura)</Label>
        <Input id="email-edit" type="email" {...register("email")} readOnly className="bg-muted/50 cursor-not-allowed" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="apellidosNombres-edit">Apellidos y Nombres Completos</Label>
        <Input id="apellidosNombres-edit" {...register("apellidosNombres")} placeholder="Apellidos y nombres completos" />
        {errors.apellidosNombres && <p className="text-sm text-destructive">{errors.apellidosNombres.message}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="materia-edit">Materia/Asignatura (Opcional)</Label>
        <Input id="materia-edit" {...register("materia")} placeholder="Ej: Matemáticas, Historia" />
        {errors.materia && <p className="text-sm text-destructive">{errors.materia.message}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isActuallySubmitting}>
            <X className="mr-2 h-4 w-4" /> Cancelar
        </Button>
        <Button type="submit" disabled={isActuallySubmitting || !isDirty}>
          {isActuallySubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
          {isActuallySubmitting ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
    </form>
  );
}
