import { getExamById } from "@/lib/db";
import { ExamTakingInterface } from "@/components/exams/ExamTakingInterface";
import { AlertCircle, FileWarning } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function TakeExamPage({
  params,
  searchParams,
}: {
  // CORRECCIÓN: Se ajustan los tipos para reflejar que son Promesas
  params: Promise<{ examId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // CORRECCIÓN: Se resuelven las promesas al inicio
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  // Ahora se usan las variables resueltas
  const { examId } = resolvedParams;
  const queryAccessCode = resolvedSearchParams.accessCode as string | undefined;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }
  const studentSupabaseId = user.id;

  const exam = await getExamById(examId);

  if (!exam) {
    return (
      <div className="container mx-auto py-10 text-center">
        <Card className="max-w-lg mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive flex items-center justify-center gap-2">
              <FileWarning className="h-8 w-8" /> Examen No Encontrado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-muted-foreground mb-6">
              El examen que intentas tomar (ID: {examId}) no existe o no está disponible.
            </p>
            <Button asChild variant="outline">
              <Link href={`/student/exam/join`}>
                Volver a Ingresar Código
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Security Check: Validate access code if the exam requires one.
  if (exam.access_code) {
    if (!queryAccessCode) {
      // If code is required but not provided in URL, deny access.
      return (
        <div className="container mx-auto py-10 text-center">
          <Card className="max-w-lg mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-destructive flex items-center justify-center gap-2">
                <FileWarning className="h-8 w-8" /> Acceso Denegado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-muted-foreground mb-6">
                Este examen requiere un código de acceso.
              </p>
              <Button asChild variant="outline">
                <Link href={`/student/exam/join`}>
                  Volver a Ingresar Código
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    if (exam.access_code.toUpperCase() !== queryAccessCode.toUpperCase()) {
      // If code is required and provided, but doesn't match, deny access.
      return (
        <div className="container mx-auto py-10 text-center">
          <Card className="max-w-lg mx-auto shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-destructive flex items-center justify-center gap-2">
                <FileWarning className="h-8 w-8" /> Acceso Denegado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-muted-foreground mb-6">
                El código de acceso proporcionado no es válido para este examen.
              </p>
              <Button asChild variant="outline">
                <Link href={`/student/exam/join`}>
                  Volver a Ingresar Código
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return (
    <div className="py-4 md:py-6"> 
      <ExamTakingInterface exam={exam} studentId={studentSupabaseId} />
    </div>
  );
}