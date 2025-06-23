
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableCaption } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getExamById, getSubmissionsByExamId, getManagedStudentById } from "@/lib/db";
import type { Exam as ExamType, Submission, ManagedStudent, QualitativeRating } from "@/lib/types";
import { ClipboardList, AlertCircle, ArrowLeft, BookOpenCheck, CheckCircle, HelpCircle, PercentIcon, StarIcon, Megaphone } from "lucide-react";
import Link from "next/link";
import { PrintButtonClient } from "@/components/teacher/PrintButtonClient";
import { cn } from "@/lib/utils";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { publishExamGradesAction } from "@/lib/actions/teacher.actions";

export const dynamic = 'force-dynamic';

interface EnrichedSubmission extends Submission {
  studentApellidosNombres?: string;
  studentEmail?: string;
  studentDni?: string; // DNI from profiles table for display
  examTotalPoints?: number;
  status?: "Aprobado" | "Desaprobado" | "Pendiente de Calificación" | "En Revisión";
  evaluationType?: ExamType['evaluation_type'];
  approvalThreshold?: number | null;
  qualitativeRatings?: QualitativeRating[] | null;
  qualitativeResultLabel?: string;
  percentageScore?: number; 
  scaledScore?: number;     
}

function getQualitativeEvaluation(
  score: number | undefined | null,
  totalPoints: number | undefined,
  ratings: QualitativeRating[] | undefined | null
): { status: EnrichedSubmission['status']; label: string } {
  if (score === undefined || score === null || totalPoints === undefined || totalPoints === 0 || !ratings || ratings.length === 0) {
    return { status: "En Revisión", label: "N/A" };
  }

  const percentage = (score / totalPoints) * 100;
  const sortedRatings = [...ratings].sort((a, b) => b.minPercentage - a.minPercentage);

  for (const rating of sortedRatings) {
    if (percentage >= rating.minPercentage) {
      let status: EnrichedSubmission['status'] = "En Revisión";
      if (rating.isPassing === true) {
        status = "Aprobado";
      } else if (rating.isPassing === false) {
        status = "Desaprobado";
      }
      return { status, label: rating.label };
    }
  }
  return { status: "En Revisión", label: "Sin Categorizar" };
}


export default async function ExamResultsForTeacherPage({ 
    params 
}: { 
    // CORRECCIÓN: Se ajusta el tipo para reflejar que es una Promise
    params: Promise<{ examId: string }>; 
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
  const { examId } = await params;
  const exam: ExamType | null = await getExamById(examId);

  if (!exam) {
    return (
      <>
        <PageHeader
          title="Resultados del Examen"
          description="No se pudo cargar la información del examen."
          icon={ClipboardList}
        />
        <Card className="print-hide">
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Examen no encontrado</h2>
            <p className="text-muted-foreground">
              El examen con ID: {examId} no existe o no pudo ser cargado.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href="/teacher/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel
              </Link>
            </Button>
          </CardContent>
        </Card>
      </>
    );
  }

  if (exam.teacher_id !== user.id) {
    redirect('/teacher/dashboard?error=unauthorized');
  }

  const submissions: Submission[] = await getSubmissionsByExamId(examId);
  
  const enrichedSubmissions: EnrichedSubmission[] = [];
  const examTotalPoints = exam.questions.reduce((total, q) => total + (q.points || 0), 0);

  for (const sub of submissions) {
    const studentProfile = await getManagedStudentById(sub.student_id); 
    let status: EnrichedSubmission['status'] = "En Revisión";
    let qualitativeResultLabel: string | undefined = undefined;
    let percentageScore: number | undefined = undefined;
    let scaledScore: number | undefined = undefined;

    if (exam.evaluation_type === 'qualitative') {
        const result = getQualitativeEvaluation(sub.score, examTotalPoints, exam.qualitative_ratings);
        status = result.status;
        qualitativeResultLabel = result.label;
        if (sub.score !== undefined && sub.score !== null && examTotalPoints > 0) {
            percentageScore = (sub.score / examTotalPoints) * 100;
        }
    } else { // quantitative
        const currentApprovalThreshold = (exam.approval_threshold !== undefined && exam.approval_threshold !== null && exam.approval_threshold >= 0 && exam.approval_threshold <= 100) ? exam.approval_threshold : 60;
        if (sub.score !== undefined && sub.score !== null) {
            if (examTotalPoints > 0) {
                percentageScore = (sub.score / examTotalPoints) * 100;
                scaledScore = (sub.score / examTotalPoints) * 10;
                if (percentageScore >= currentApprovalThreshold) {
                    status = "Aprobado";
                } else {
                    status = "Desaprobado";
                }
            } else {
                percentageScore = sub.score > 0 ? 100 : 0; 
                scaledScore = sub.score > 0 ? 10 : (sub.score === 0 ? 0 : undefined); 
                if (currentApprovalThreshold === 0) { 
                    status = (sub.score >= 0) ? "Aprobado" : "Desaprobado";
                } else { 
                    status = "Desaprobado";
                }
            }
        }
    }

    enrichedSubmissions.push({
      ...sub,
      studentApellidosNombres: studentProfile?.apellidosNombres,
      studentEmail: studentProfile?.email,
      studentDni: studentProfile?.dni,
      examTotalPoints,
      status,
      evaluationType: exam.evaluation_type,
      approvalThreshold: exam.approval_threshold, 
      qualitativeRatings: exam.qualitative_ratings,
      qualitativeResultLabel,
      percentageScore,
      scaledScore,
    });
  }

  enrichedSubmissions.sort((a, b) => {
    const nameA = a.studentApellidosNombres || a.studentDni || ''; 
    const nameB = b.studentApellidosNombres || b.studentDni || ''; 
    return nameA.localeCompare(nameB);
  });


  return (
    <>
      <PageHeader
        title={`Resultados: ${exam.title}`}
        description={
          `Visualiza los envíos y ${exam.evaluation_type === 'quantitative' 
            ? `puntajes para este examen. Total de puntos: ${examTotalPoints}. Umbral de aprobación: ${exam.approval_threshold !== undefined && exam.approval_threshold !== null ? `${exam.approval_threshold}%` : '60% (defecto)'}.` 
            : 'valoraciones para este examen (evaluación cualitativa).'}`
        }
        icon={BookOpenCheck}
        actions={
          <div className="flex gap-2 print-hide items-center">
            {exam.grades_published ? (
              <Badge variant="default" className="bg-green-600 text-white"><CheckCircle className="mr-1 h-4 w-4" /> Notas Publicadas</Badge>
            ) : (
              <form action={publishExamGradesAction}>
                <input type="hidden" name="examId" value={exam.id} />
                <Button type="submit">
                  <Megaphone className="mr-2 h-4 w-4" /> Publicar Notas
                </Button>
              </form>
            )}
            <PrintButtonClient />
            <Button asChild variant="outline">
              <Link href="/teacher/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" /> Volver al Panel
              </Link>
            </Button>
          </div>
        }
      />
      <div className="hidden print:block text-center text-sm my-2 border-b pb-2">
        <p>Impreso el: {new Date().toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
      </div>


      {enrichedSubmissions.length === 0 ? (
        <Card className="print-hide">
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold">No hay envíos para este examen todavía.</h3>
            <p className="text-muted-foreground mt-2">
              Cuando los estudiantes completen el examen, sus resultados aparecerán aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="printable-area">
          <CardHeader>
            <CardTitle>Listado de alumnas/os</CardTitle>
            <CardDescription>Detalle de los exámenes enviados por los estudiantes.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Apellidos y Nombres</TableHead>
                  <TableHead>DNI</TableHead>
                  {exam.evaluation_type === 'quantitative' ? (
                    <>
                      <TableHead className="text-right">Puntaje</TableHead>
                      <TableHead className="text-right">
                        <div className="flex items-center justify-end gap-1">
                            <PercentIcon className="h-4 w-4"/>Porcentaje
                        </div>
                      </TableHead>
                      <TableHead className="text-right">
                        <div className="flex items-center justify-end gap-1">
                            <StarIcon className="h-4 w-4"/>Nota (0-10)
                        </div>
                      </TableHead>
                    </>
                  ) : (
                    <TableHead className="text-right" colSpan={3}>Valoración</TableHead>
                  )}
                  <TableHead>Estado</TableHead>
                  <TableHead className="print-hide">Fecha de Envío</TableHead>
                  <TableHead className="print-hide">Tiempo Utilizado</TableHead>
                  <TableHead className="text-center print-hide">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedSubmissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell>{submission.studentApellidosNombres || "N/A"}</TableCell>
                    <TableCell className="font-medium">{submission.studentDni || "N/A"}</TableCell>
                    
                    {submission.evaluationType === 'quantitative' ? (
                      <>
                        <TableCell className="text-right">
                          {submission.score !== undefined && submission.score !== null ? `${submission.score} / ${submission.examTotalPoints}` : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          {submission.percentageScore !== undefined ? `${submission.percentageScore.toFixed(1)}%` : "N/A"}
                        </TableCell>
                        <TableCell className="text-right">
                          {submission.scaledScore !== undefined ? submission.scaledScore.toFixed(1) : "N/A"}
                        </TableCell>
                      </>
                    ) : (
                      <TableCell className="text-right" colSpan={3}>
                        {submission.qualitativeResultLabel || "N/A"}
                      </TableCell>
                    )}

                    <TableCell>
                      {submission.status ? (
                        <Badge 
                          variant={
                            submission.status === "Aprobado" ? "default" :
                            submission.status === "Desaprobado" ? "destructive" :
                            submission.status === "En Revisión" ? "secondary" :
                            "outline"
                          }
                          className={cn(
                            submission.status === "Aprobado" ? "bg-green-600 text-white" : "",
                            submission.status === "En Revisión" ? "bg-yellow-500 text-black" : "",
                            "status-badge-print" 
                          )}
                        >
                          {submission.status === "Aprobado" && <CheckCircle className="mr-1 h-3.5 w-3.5" />}
                          {submission.status === "Desaprobado" && <AlertCircle className="mr-1 h-3.5 w-3.5" />}
                          {submission.status === "En Revisión" && <HelpCircle className="mr-1 h-3.5 w-3.5" />}
                          {submission.status}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="status-badge-print">N/A</Badge>
                      )}
                    </TableCell>
                    <TableCell className="print-hide">
                      {new Date(submission.submitted_at).toLocaleDateString('es-AR')}
                    </TableCell>
                    <TableCell className="print-hide">
                      {submission.time_taken_seconds !== undefined && submission.time_taken_seconds !== null
                        ? `${Math.floor(submission.time_taken_seconds / 60)}m ${submission.time_taken_seconds % 60}s` 
                        : "N/A"}
                    </TableCell>
                    <TableCell className="text-center print-hide">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/teacher/submissions/${submission.id}`}>
                            Revisar Envío
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableCaption>
                {enrichedSubmissions.length} envío(s) para este examen.
              </TableCaption>
            </Table>
          </CardContent>
        </Card>
      )}
    </>
  );
}
