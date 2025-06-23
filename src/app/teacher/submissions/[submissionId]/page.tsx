import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { getSubmissionById, getExamById, getManagedStudentById } from "@/lib/db";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookOpenCheck, AlertCircle, ArrowLeft, User, Calendar, Check, X, Pencil } from "lucide-react";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { QuestionScoreForm } from "@/components/teacher/QuestionScoreForm";

export const dynamic = 'force-dynamic';

export default async function TeacherSubmissionPage({ 
    params 
}: { 
    // CORRECCIÓN: Se ajusta el tipo para reflejar que es una Promise
    params: Promise<{ submissionId: string }>; 
}) {
  // CORRECCIÓN: Se resuelve la promesa y se extrae el valor en un solo paso
  const { submissionId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const submission = await getSubmissionById(submissionId);
  if (!submission) {
    return (
      <div className="container mx-auto py-10 text-center">
        <Card>
          <CardContent className="py-12">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Envío no encontrado</h2>
            <p className="text-muted-foreground">El envío con ID: {submissionId} no existe.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const exam = await getExamById(submission.exam_id);
  const student = await getManagedStudentById(submission.student_id);

  if (!exam || !student) {
    return (
      <div className="container mx-auto py-10 text-center">
        <Card>
          <CardContent className="py-12">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Datos incompletos</h2>
            <p className="text-muted-foreground">No se pudo cargar la información del examen o del estudiante para este envío.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Security check: ensure the logged-in teacher owns the exam
  if (exam.teacher_id !== user.id) {
    redirect('/teacher/dashboard?error=unauthorized');
  }

  return (
    <>
      <PageHeader
        title={`Revisión de Examen: ${exam.title}`}
        description={`Detalles del envío de ${student.apellidosNombres || student.dni}.`}
        icon={BookOpenCheck}
        actions={
          <Button asChild variant="outline">
            <Link href={`/teacher/students/${student.dni}/history`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Historial
            </Link>
          </Button>
        }
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Respuestas y Calificación por Pregunta</CardTitle>
              <CardDescription>Visualiza las respuestas y asigna un puntaje a cada una.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {exam.questions.map((question, index) => {
                const answer = submission.answers.find(a => a.questionId === question.id);
                return (
                  <Card key={question.id} className="bg-muted/30">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-base font-semibold">
                          Pregunta {index + 1}: {question.text}
                        </CardTitle>
                        <QuestionScoreForm 
                          submissionId={submission.id}
                          questionId={question.id}
                          currentScore={answer?.score ?? 0}
                          maxPoints={question.points || 0}
                        />
                      </div>
                      <CardDescription>
                        Tipo: {question.type} | Puntos Posibles: {question.points || 0}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Label className="text-xs uppercase text-muted-foreground">Respuesta del Estudiante</Label>
                      <div className="mt-1 p-3 border rounded-md bg-background min-h-[50px]">
                        {question.type === 'free-text' ? (
                          <p className="whitespace-pre-wrap">{answer?.value as string || "(Sin respuesta)"}</p>
                        ) : answer ? (
                          <pre className="text-sm whitespace-pre-wrap"><code>{JSON.stringify(answer.value, null, 2)}</code></pre>
                        ) : (
                          <p className="text-muted-foreground italic">(Sin respuesta)</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </CardContent>
          </Card>
        </div>

        <aside className="lg:col-span-1 space-y-6 sticky top-24 self-start">
            <Card>
                <CardHeader>
                    <CardTitle>Información del Envío</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                   <div className="flex justify-between">
                       <span className="text-muted-foreground">Estudiante:</span>
                       <span className="font-medium">{student.apellidosNombres}</span>
                   </div>
                   <div className="flex justify-between">
                       <span className="text-muted-foreground">DNI:</span>
                       <span className="font-medium">{student.dni}</span>
                   </div>
                   <Separator />
                   <div className="flex justify-between">
                       <span className="text-muted-foreground">Fecha:</span>
                       <span className="font-medium">{new Date(submission.submitted_at).toLocaleString('es-AR')}</span>
                   </div>
                    <div className="flex justify-between">
                       <span className="text-muted-foreground">Calificación Total:</span>
                       <span className="font-semibold text-lg text-primary">{submission.score ?? 'N/A'}</span>
                   </div>
                  {submission.graded_at && (
                    <div className="flex justify-between">
                       <span className="text-muted-foreground">Última Calificación:</span>
                       <span className="font-medium">{new Date(submission.graded_at).toLocaleString('es-AR')}</span>
                   </div>
                  )}
                </CardContent>
            </Card>
        </aside>
      </div>
    </>
  );
}