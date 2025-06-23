
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge"; 
import { ClipboardList, AlertCircle, FileText, CalendarDays, CheckCircle, Info, ClockIcon, StarIcon } from "lucide-react"; 
import Link from "next/link";
import { getSubmissionsByStudentSupabaseId, getExamById } from "@/lib/db";
import type { Submission } from "@/lib/types";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

interface EnrichedSubmission extends Submission {
  examTitle?: string;
  examTotalPoints?: number;
  status?: "Aprobado" | "Desaprobado" | "En Revisión"; 
  approvalThreshold?: number | null;
  gradesPublished?: boolean;
  scaledScore?: number;
}

export default async function StudentEvaluationsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  const effectiveDisplayName = profile?.full_name || user.email || "Estudiante";
  
  const submissions = await getSubmissionsByStudentSupabaseId(user.id);
  submissions.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());

  const enrichedSubmissions: EnrichedSubmission[] = [];
  for (const sub of submissions) {
    const exam = await getExamById(sub.exam_id);
    let examTitle = `Examen Desconocido (ID: ${sub.exam_id})`;
    let examTotalPoints = 0;
    let status: EnrichedSubmission['status'] = "En Revisión";
    let approvalThreshold = exam?.approval_threshold;
    let gradesPublished = exam?.grades_published || exam?.show_grades_on_completion || false;
    let scaledScore: number | undefined;

    if (exam) {
      examTitle = exam.title;
      examTotalPoints = exam.questions.reduce((total, q) => total + (q.points || 0), 0);

      if (gradesPublished) {
        if (sub.score !== undefined && sub.score !== null) {
          const currentApprovalThreshold = (approvalThreshold !== undefined && approvalThreshold !== null && approvalThreshold >= 0 && approvalThreshold <= 100) ? approvalThreshold : 60;
          
          let percentage = 0;
          if (examTotalPoints > 0) {
            percentage = (sub.score / examTotalPoints) * 100;
            scaledScore = (sub.score / examTotalPoints) * 10;
          } else {
            if (sub.score > 0) {
              percentage = 100;
              scaledScore = 10;
            } else if (sub.score === 0 && currentApprovalThreshold === 0) {
              percentage = 100;
              scaledScore = 10;
            } else {
              percentage = 0;
              scaledScore = 0;
            }
          }

          if (percentage >= currentApprovalThreshold) {
            status = "Aprobado";
          } else {
            status = "Desaprobado";
          }
        }
      }
    }

    enrichedSubmissions.push({
      ...sub,
      examTitle,
      examTotalPoints,
      status,
      approvalThreshold,
      gradesPublished,
      scaledScore,
    });
  }

  return (
    <>
      <PageHeader
        title="Mis Evaluaciones"
        description={`Bienvenido/a, ${effectiveDisplayName}. Aquí encontrarás un resumen de los exámenes que has completado.`}
        icon={ClipboardList}
      />

      {enrichedSubmissions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Info className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold">
              Aún no has completado ninguna evaluación.
            </h3>
            <p className="text-muted-foreground mt-2">
              Cuando completes un examen, aparecerá aquí.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href={`/student/exam/join`}>
                <FileText className="mr-2 h-4 w-4" /> Ir a Nueva Evaluación
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {enrichedSubmissions.map((submission) => (
            <Card key={submission.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-xl text-primary">{submission.examTitle}</CardTitle>
                    </div>
                    {submission.status && (
                    <Badge 
                        variant={
                        submission.status === "Aprobado" ? "default" :
                        submission.status === "Desaprobado" ? "destructive" :
                        "secondary" 
                        }
                        className={
                        submission.status === "Aprobado" ? "bg-green-600 text-white" :
                        submission.status === "En Revisión" ? "bg-yellow-500 text-black" : ""
                        }
                    >
                        {submission.status === "En Revisión" && <ClockIcon className="mr-1 h-3 w-3" />}
                        {submission.status}
                    </Badge>
                    )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarDays className="h-4 w-4" /> 
                  <span>Fecha de Envío: {new Date(submission.submitted_at).toLocaleString('es-AR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {submission.gradesPublished && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            <span>
                                Puntaje: 
                                <span className="font-semibold text-accent ml-1">
                                {submission.score !== undefined && submission.score !== null ? submission.score : "N/A"}
                                </span>
                                {' / '}
                                {submission.examTotalPoints || 'N/A'} pts
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <StarIcon className="h-4 w-4 text-blue-500" />
                            <span>
                                Nota (0-10): 
                                <span className="font-semibold text-accent ml-1">
                                    {submission.scaledScore !== undefined && submission.scaledScore !== null ? submission.scaledScore.toFixed(1) : "N/A"}
                                </span>
                            </span>
                        </div>
                    </div>
                )}
                {submission.time_taken_seconds !== undefined && submission.time_taken_seconds !== null && (
                  <div className="text-xs text-muted-foreground pt-2">
                    Tiempo utilizado: {Math.floor(submission.time_taken_seconds / 60)}m {submission.time_taken_seconds % 60}s
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" size="sm" asChild>
                    <Link href={`/student/results/${submission.id}`}>
                        Ver Resumen
                    </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
