
import { StudentExamPrintableView } from "@/components/student/StudentExamPrintableView";
import { PageHeader } from "@/components/shared/PageHeader";
import { getExamById, getSubmissionById } from "@/lib/db";
import { AlertCircle, PrinterIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function PrintStudentCopyPage({ 
  params,
}: { 
  // CORRECCIÓN: Se ajusta el tipo para reflejar que es una Promise
  params: Promise<{ submissionId: string }>;
}) {
  // CORRECCIÓN: Se resuelve la promesa y se extrae el valor
  const { submissionId } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  
  const submission = await getSubmissionById(submissionId);
  if (!submission || submission.student_id !== user.id) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Card className="max-w-lg mx-auto">
          <CardContent className="py-12">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Acceso Denegado</h2>
            <p className="text-muted-foreground">
              No tienes permiso para ver esta copia de examen.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const exam = await getExamById(submission.exam_id);

  if (!exam) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Card className="max-w-lg mx-auto">
          <CardContent className="py-12">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Examen no encontrado</h2>
            <p className="text-muted-foreground">
              El examen que intentas visualizar no existe o no está disponible.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link href={`/student/evaluations`}>
                Volver a Mis Evaluaciones
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto py-4 md:py-8 no-print">
        <PageHeader
          title={`Copia para Estudiante: ${exam.title}`}
          description="Previsualiza una copia del examen para tus registros. Usa los botones al final para imprimir o descargar."
          icon={PrinterIcon}
          actions={
            <Button asChild variant="outline">
              <Link href={`/student/results/${submissionId}`}>
                Volver a Resultados
              </Link>
            </Button>
          }
        />
      </div>
      <StudentExamPrintableView exam={exam} submission={submission} studentName={profile?.full_name} />
    </>
  );
}

// CORRECCIÓN: Se aplica la misma lógica a la función generateMetadata
export async function generateMetadata({ 
    params 
}: { 
    params: Promise<{ submissionId: string }> 
}) {
  const { submissionId } = await params;
  const submission = await getSubmissionById(submissionId);
  if (!submission) return { title: "Copia de Examen" };

  const exam = await getExamById(submission.exam_id);
  return {
    title: exam ? `Copia Estudiante: ${exam.title}` : "Copia de Examen",
  };
}
