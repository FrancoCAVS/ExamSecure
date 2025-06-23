
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/shared/Logo";
import Link from "next/link";
import { ShieldCheck, LogIn, UserPlus } from "lucide-react";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
 export const runtime = 'edge'

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const profile = await getUserProfile(user.id);
    if (profile) {
      if (profile.role === 'profesor') {
        redirect('/teacher/dashboard');
      } else if (profile.role === 'alumno') {
        redirect('/student/profile');
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
      <header className="mb-12 text-center">
        <Logo iconClassName="h-16 w-16" textClassName="text-5xl" />
        <p className="mt-4 text-xl text-muted-foreground font-headline">
          Plataforma Segura de Evaluación en Línea
        </p>
      </header>

      <main className="w-full max-w-md space-y-8">
        <Card className="shadow-xl">
          <CardHeader>
            <CardTitle className="text-3xl font-headline text-center text-primary flex items-center justify-center gap-2">
               <LogIn className="h-8 w-8" />
               Acceder a ExamSecure
            </CardTitle>
            <CardDescription className="text-center">
              Ingresa con tu email y contraseña para acceder.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <Link href="/login" className="w-full">
              <Button size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                Iniciar Sesión
              </Button>
            </Link>
            <Link href="/register" className="w-full">
              <Button variant="outline" size="lg" className="w-full">
                <UserPlus className="mr-2 h-5 w-5" />
                Registrarse
              </Button>
            </Link>
          </CardContent>
        </Card>
      </main>

      <footer className="absolute bottom-6 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} ExamSecure. Todos los derechos reservados.</p>
        <p className="flex items-center justify-center gap-1 mt-1">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          <span>Entorno seguro y confiable</span>
        </p>
      </footer>
    </div>
  );
}
