
"use client";

import { useActionState, useTransition } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signInWithPasswordAction, type SignInActionState } from "@/lib/actions/auth.actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ArrowLeft, LogIn, UserPlus } from "lucide-react";

const SignInSchema = z.object({
  email: z.string().email("Por favor, ingresa un email válido."),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres."),
});

type SignInValues = z.infer<typeof SignInSchema>;

export function UnifiedLoginForm() {
  const [state, formAction] = useActionState<SignInActionState | null, FormData>(signInWithPasswordAction, null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const handleFormSubmit = (data: SignInValues) => {
    const formData = new FormData();
    formData.append('email', data.email);
    formData.append('password', data.password);

    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-headline text-primary flex items-center gap-2">
          <LogIn className="h-6 w-6" />
          Iniciar Sesión
        </CardTitle>
        <CardDescription>
          Ingresa tu email y contraseña para acceder a ExamSecure.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <CardContent className="space-y-6">
          {state?.message && !state.success && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{state.errorTitle || "Error de Acceso"}</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email-unified">Email</Label>
            <Input id="email-unified" type="email" {...register("email")} placeholder="tu.email@ejemplo.com" />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            {state?.errors?.email && <p className="text-sm text-destructive">{state.errors.email[0]}</p>}
            {state?.errors?._form && !state?.errors?.email && !state?.errors?.password && <p className="text-sm text-destructive">{state.errors._form[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password-unified">Contraseña</Label>
            <Input id="password-unified" type="password" {...register("password")} placeholder="Tu contraseña" />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            {state?.errors?.password && <p className="text-sm text-destructive">{state.errors.password[0]}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSubmitting || isPending}>
            {(isSubmitting || isPending) ? "Verificando..." : "Ingresar"}
          </Button>
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Inicio
              </Link>
            </Button>
            <Button variant="secondary" className="w-full" asChild>
              <Link href="/register">
                <UserPlus className="mr-2 h-4 w-4" /> Crear Cuenta
              </Link>
            </Button>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}

