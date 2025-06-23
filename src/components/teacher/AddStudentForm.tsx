
"use client";

import { useActionState, useEffect, useTransition } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addManagedStudentAction, type AddManagedStudentActionState } from "@/lib/actions/teacher.actions";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, UserPlus, Loader2, KeyRound } from "lucide-react";

const AddStudentFormSchemaClient = z.object({
  dni: z.string().min(1, "DNI es requerido").max(20, "DNI demasiado largo"),
  email: z.string().email("Email inválido"),
  apellidosNombres: z.string().min(3, "Apellidos y Nombres Completos son requeridos.").max(100, "Texto demasiado largo."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  materia: z.string().max(100, "Materia/Asignatura demasiado larga.").optional(),
});

type AddStudentFormValues = z.infer<typeof AddStudentFormSchemaClient>;

export function AddStudentForm() {
  const [state, formAction, isPending] = useActionState<AddManagedStudentActionState | null, FormData>(addManagedStudentAction, null);
  const [, startSubmitTransition] = useTransition();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isClientSubmitting },
    reset,
    setError,
  } = useForm<AddStudentFormValues>({
    resolver: zodResolver(AddStudentFormSchemaClient),
    defaultValues: {
      dni: "",
      email: "",
      apellidosNombres: "",
      password: "",
      materia: "",
    },
  });

  useEffect(() => {
    if (!state) return;

    if (state.success && state.message) {
      toast({
        title: "Éxito",
        description: state.message,
      });
      reset(); 
    } else if (!state.success && state.message) {
      if (state.errors?._form) {
         toast({
            title: "Error al Añadir Estudiante",
            description: state.errors._form[0],
            variant: "destructive",
        });
      } else if (state.errors) {
        (Object.keys(state.errors) as Array<keyof AddStudentFormValues>).forEach((key) => {
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
  }, [state, toast, reset, setError]);


  const handleFormSubmit = (data: AddStudentFormValues) => {
    const formData = new FormData();
    formData.append('dni', data.dni);
    formData.append('email', data.email);
    formData.append('apellidosNombres', data.apellidosNombres);
    formData.append('password', data.password);
    if (data.materia) formData.append('materia', data.materia);
    
    startSubmitTransition(() => {
      formAction(formData);
    });
  };
  
  const isActuallySubmitting = isClientSubmitting || isPending;

  return (
    <Card className="w-full shadow-md">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" /> Añadir Nuevo Estudiante
        </CardTitle>
        <CardDescription>
          Ingresa los datos del estudiante para registrarlo.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CardContent className="space-y-4">
          {state?.message && !state.success && state.errors?._form && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error al Añadir</AlertTitle>
              <AlertDescription>{state.errors._form[0]}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="dni-add">DNI</Label>
            <Input id="dni-add" {...register("dni")} placeholder="Número de DNI" />
            {errors.dni && <p className="text-sm text-destructive">{errors.dni.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email-add">Email</Label>
            <Input id="email-add" type="email" {...register("email")} placeholder="correo@ejemplo.com" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
           <div className="space-y-1.5">
            <Label htmlFor="apellidosNombres-add">Apellidos y Nombres Completos</Label>
            <Input id="apellidosNombres-add" {...register("apellidosNombres")} placeholder="Apellidos y nombres completos del estudiante" />
            {errors.apellidosNombres && <p className="text-sm text-destructive">{errors.apellidosNombres.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password-add">Contraseña</Label>
            <div className="relative">
              <Input id="password-add" type="password" {...register("password")} placeholder="Mínimo 6 caracteres" />
              <KeyRound className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="materia-add">Materia/Asignatura (Opcional)</Label>
            <Input id="materia-add" {...register("materia")} placeholder="Ej: Matemáticas, Historia" />
            {errors.materia && <p className="text-sm text-destructive">{errors.materia.message}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isActuallySubmitting}>
            {isActuallySubmitting ? <Loader2 className="animate-spin" /> : "Añadir Estudiante"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
