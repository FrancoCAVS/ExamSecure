import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { CheckCircle, Award, Clock, Activity, Download, AlertCircle } from "lucide-react";
import Link from "next/link";
import { getSubmissionById, getExamById } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

function formatTimeTaken(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
};

export default async function ExamResultsPage({
  searchParams,
}: {
  // CORRECCIÓN: Se ajusta el tipo para reflejar que es una Promise y se elimina params
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // CORRECCIÓN: Se resuelve la promesa al inicio de la función
  const resolvedSearchParams = await searchParams;
  const submissionId = resolvedSearchParams.submissionId as string;

  if (!submissionId) {
    return (
      <div className="container mx-auto py-10 text-center">
        <Card className="max-w-lg mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive flex items-center justify-center gap-2">
              <AlertCircle className="h-8 w-8" /> Error: Falta ID de Envío
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-muted-foreground">
              No se puede mostrar la página de resultados porque no se especificó un envío.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const submission = await getSubmissionById(submissionId);

  if (!submission || submission.student_id !== user.id) {
    return (
      <div className="container mx-auto py-10 text-center">
        <Card className="max-w-lg mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl text-destructive flex items-center justify-center gap-2">
              <AlertCircle className="h-8 w-8" /> Acceso Denegado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg text-muted-foreground">
              No se encontró el envío o no tienes permiso para verlo.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const exam = await getExamById(submission.exam_id);
  const totalPoints = exam ? exam.questions.reduce((sum, q) => sum + (q.points || 0), 0) : 0;
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center">
          <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <CardTitle className="text-3xl font-headline text-primary">
            ¡Examen Enviado Exitosamente!
          </CardTitle>
          <CardDescription className="text-lg">
            {exam?.title ? `Resultados para "${exam.title}"` : "Tus respuestas han sido registradas."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 border rounded-md bg-muted/30 text-center">
            <p className="text-sm text-muted-foreground">ID de tu envío:</p>
            <p className="text-lg font-mono text-accent">{submission.id}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
            {submission.score !== null && totalPoints !== null && (
              <div className="p-3 border rounded-md">
                <Award className="mx-auto h-8 w-8 text-blue-500 mb-1" />
                <p className="text-sm text-muted-foreground">Puntaje Obtenido (Autocalculado)</p>
                <p className="text-2xl font-bold text-primary">
                  {submission.score} / {totalPoints}
                </p>
              </div>
            )}
            {submission.time_taken_seconds !== null && (
              <div className="p-3 border rounded-md">
                <Clock className="mx-auto h-8 w-8 text-orange-500 mb-1" />
                <p className="text-sm text-muted-foreground">Tiempo Utilizado</p>
                <p className="text-2xl font-bold text-primary">
                  {formatTimeTaken(submission.time_taken_seconds)}
                </p>
              </div>
            )}
          </div>
          
          <p className="text-sm text-center text-muted-foreground">
            Tu docente revisará tus respuestas. Las calificaciones finales y cualquier retroalimentación adicional estarán disponibles según las indicaciones de tu institución.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 pt-6">
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/student/profile`}>
              <Activity className="mr-2" /> Ir a Mi Panel
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={`/student/evaluations`}>
              Ver Mis Evaluaciones
            </Link>
          </Button>
          {submission.exam_id && (
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              {/* Se ha corregido el link para que sea a la ruta correcta de la copia de estudiante */}
              <Link href={`/student/exam/${submission.exam_id}/print-copy?submissionId=${submission.id}`}>
                <Download className="mr-2 h-4 w-4" /> Descargar Copia del Examen
              </Link>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}