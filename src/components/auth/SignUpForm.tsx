
"use client";

import { useActionState, useTransition } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signUpAction, type SignUpActionState } from "@/lib/actions/auth.actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, UserPlus, CheckCircle, ArrowLeft } from "lucide-react";

const SignUpSchema = z.object({
  email: z.string().email("Por favor, ingresa un email válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
  fullName: z.string().min(3, "Ingresa tus apellidos y nombres.").max(100),
  dni: z.string().min(6, "El DNI debe tener al menos 6 caracteres.").max(15),
  materia: z.string().min(1, "La materia es requerida.").max(100, "Materia/Asignatura demasiado larga."),
});

type SignUpValues = z.infer<typeof SignUpSchema>;

export function SignUpForm() {
  const [state, formAction] = useActionState<SignUpActionState | null, FormData>(signUpAction, null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<SignUpValues>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: {
      email: "",
      password: "",
      fullName: "",
      dni: "",
      materia: "",
    },
  });

  const handleFormSubmit = (data: SignUpValues) => {
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);
    formData.append('fullName', data.fullName);
    formData.append('dni', data.dni);
    if (data.materia) formData.append('materia', data.materia);


    startTransition(() => {
      formAction(formData);
      if (state?.success) {
        reset(); // Reset form on successful submission
      }
    });
  };

  if (state?.success) {
    return (
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="text-2xl font-headline text-primary">
            ¡Registro Exitoso!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-700">Confirmación Requerida</AlertTitle>
            <AlertDescription className="text-green-600">
              {state.message || "Revisa tu email para confirmar tu cuenta antes de iniciar sesión."}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href="/login">Ir a Iniciar Sesión</Link>
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary flex items-center gap-2">
          <UserPlus className="h-6 w-6" />
          Crear Cuenta
        </CardTitle>
        <CardDescription>
          Ingresa tus datos para registrarte en ExamSecure.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CardContent className="space-y-6">
          {state?.message && !state.success && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{state.errorTitle || "Error de Registro"}</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email-signup">Email</Label>
            <Input id="email-signup" type="email" {...register("email")} placeholder="tu.email@ejemplo.com" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            {state?.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password-signup">Contraseña</Label>
            <Input id="password-signup" type="password" {...register("password")} placeholder="Crea una contraseña (mín. 6 caracteres)" />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            {state?.errors?.password && <p className="text-sm text-destructive">{state.errors.password[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName-signup">Apellidos y Nombres</Label>
            <Input id="fullName-signup" {...register("fullName")} placeholder="Tus apellidos y nombres completos" />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
            {state?.errors?.fullName && <p className="text-sm text-destructive">{state.errors.fullName[0]}</p>}
          </div>
           <div className="space-y-2">
            <Label htmlFor="dni-signup">DNI</Label>
            <Input id="dni-signup" {...register("dni")} placeholder="Tu número de DNI" />
            {errors.dni && <p className="text-sm text-destructive">{errors.dni.message}</p>}
            {state?.errors?.dni && <p className="text-sm text-destructive">{state.errors.dni[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="materia-signup">Materia</Label>
            <Input id="materia-signup" {...register("materia")} placeholder="Ej: Introducción a la Filosofía" />
            {errors.materia && <p className="text-sm text-destructive">{errors.materia.message}</p>}
            {state?.errors?.materia && <p className="text-sm text-destructive">{state.errors.materia[0]}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting || isPending}>
            {(isSubmitting || isPending) ? "Registrando..." : "Crear Cuenta"}
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Iniciar Sesión
            </Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
