import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ClipboardList, AlertCircle, User, CalendarDays, CheckCircle, TrendingUp, FileText, AlertTriangle, Pencil } from "lucide-react";
import Link from "next/link";
import { getManagedStudentByDni, getSubmissionsByStudentSupabaseId, getExamById } from "@/lib/db";
import type { Submission, Exam as ExamType, ManagedStudent } from "@/lib/types";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

interface SubmissionWithExamDetails extends Submission {
  examTitle?: string;
  examTotalPoints?: number;
  examDuration?: number;
}

export const runtime = 'edge';
export default async function StudentHistoryForTeacherPage({
  params,
}: {
  // CORRECCIÓN: Se ajusta el tipo para reflejar que es una Promise
  params: Promise<{ studentDni: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  
  if (!profile || profile.role !== 'profesor') {
    redirect("/login");
  }

  // CORRECCIÓN: Se resuelve la promesa y se extrae el valor en un solo paso
  const { studentDni } = await params;
  
  const student: ManagedStudent | null = await getManagedStudentByDni(studentDni);
  let completedExams: SubmissionWithExamDetails[] = [];

  if (student && student.id) { // student.id is the Supabase User ID
    const submissions = await getSubmissionsByStudentSupabaseId(student.id);
    submissions.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

    for (const sub of submissions) {
      const exam = await getExamById(sub.exam_id);
      if (exam) {
        completedExams.push({
          ...sub,
          examTitle: exam.title,
          examTotalPoints: exam.questions.reduce((total, q) => total + (q.points || 0), 0),
          examDuration: exam.duration_minutes,
        });
      } else {
        completedExams.push({
          ...sub,
          examTitle: "Examen Desconocido (ID: " + sub.exam_id + ")",
          examTotalPoints: 0,
        });
      }
    }
  }

  if (!student) {
    return (
      <>
        <PageHeader
          title="Historial del Estudiante"
          description="Detalles de las evaluaciones completadas."
          icon={ClipboardList}
        />
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Estudiante no encontrado</h2>
            <p className="text-muted-foreground">
              No se pudo encontrar un estudiante con el DNI: {studentDni}.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/teacher/students">Volver a Gestionar Estudiantes</Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Historial de: ${student.apellidosNombres || student.dni}`}
        description={`Evaluaciones completadas. DNI: ${student.dni}, Email: ${student.email}${student.materia ? `, Materia: ${student.materia}` : ''}`}
        icon={User}
      />

      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-foreground mb-3">Exámenes Realizados</h2>
        {completedExams.length > 0 ? (
          completedExams.map((submission) => (
            <Card key={submission.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-xl text-primary">{submission.examTitle}</CardTitle>
                <CardDescription>
                  ID de Envío: {submission.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CalendarDays className="h-4 w-4" /> 
                    Enviado: {new Date(submission.submitted_at).toLocaleString('es-AR')}
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Puntaje: 
                    <span className="font-semibold text-accent">
                      {submission.score !== undefined && submission.score !== null ? submission.score : "N/A"}
                    </span>
                    / {submission.examTotalPoints || 'N/A'} pts
                  </div>
                  {submission.time_taken_seconds !== undefined && submission.time_taken_seconds !== null && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <TrendingUp className="h-4 w-4" /> 
                        Tiempo: {Math.floor(submission.time_taken_seconds / 60)}m {submission.time_taken_seconds % 60}s
                        {submission.examDuration && ` / ${submission.examDuration}m`}
                      </div>
                  )}
                </div>
                {submission.essay_grading_results && submission.essay_grading_results.length > 0 && (
                    <div className="pt-2">
                        <h4 className="font-medium text-sm text-muted-foreground mb-1">Retroalimentación de Ensayos (IA):</h4>
                        <ul className="list-disc pl-5 text-xs space-y-1">
                        {submission.essay_grading_results.map(er => {
                            return (
                            <li key={er.questionId}>
                                <span className="font-medium">Pregunta (ID: {er.questionId.substring(0,8)}...):</span>
                                {' '}Temas: {er.feedback.keyThemes.join(', ') || 'N/A'}. Hechos: {er.feedback.keyFacts.join(', ') || 'N/A'}. Calificación IA: {er.feedback.gradeSuggestion}/100.
                            </li>
                            );
                        })}
                        </ul>
                    </div>
                )}
                {submission.infractions && submission.infractions.length > 0 && (
                    <div className="pt-2 mt-3 border-t">
                        <h4 className="font-medium text-sm text-destructive mb-1 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" /> Alertas de Seguridad Detectadas
                        </h4>
                        <ul className="list-disc pl-5 text-xs space-y-1 text-muted-foreground">
                        {submission.infractions.map((infraction, idx) => (
                            <li key={idx}>
                                <span className="font-semibold">
                                    {infraction.type === 'copy' ? 'Copia de texto' :
                                    infraction.type === 'paste' ? 'Intento de pegado' :
                                    'Pérdida de foco'}
                                </span>
                                {' a las '}
                                {new Date(infraction.timestamp).toLocaleTimeString('es-AR')}
                            </li>
                        ))}
                        </ul>
                    </div>
                )}
              </CardContent>
              <CardFooter className="flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/teacher/submissions/${submission.id}`}>
                    <Pencil className="h-4 w-4 mr-2"/>Revisar y Calificar
                  </Link>
                </Button>
                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/teacher/exams/${submission.exam_id}/edit`}>
                    <FileText className="h-4 w-4 mr-2"/>Ver Estructura del Examen
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold">
                Este estudiante no ha completado ningún examen todavía.
              </h3>
            </CardContent>
          </Card>
        )}
        <div className="mt-8">
            <Button variant="outline" asChild>
                <Link href="/teacher/students">
                    <ClipboardList className="mr-2 h-4 w-4" /> Volver a Gestionar Estudiantes
                </Link>
            </Button>
        </div>
      </div>
    </>
  );
}
