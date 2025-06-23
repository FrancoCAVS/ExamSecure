
import { PrintableView } from "@/components/exams/PrintableView";
import { PageHeader } from "@/components/shared/PageHeader"; // Can be used for screen view before print
import { getExamById } from "@/lib/db";
import { AlertCircle, PrinterIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const runtime = 'edge';

export default async function PrintExamPage({ params }: { params: { examId: string } }) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  
  if (!profile || profile.role !== 'profesor') {
    redirect("/login");
  }

  const exam = await getExamById(params.examId);

  if (!exam) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Card className="max-w-lg mx-auto">
          <CardContent className="py-12">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Examen no encontrado</h2>
            <p className="text-muted-foreground">
              El examen que intentas imprimir no existe o no está disponible. ID: {params.examId}
            </p>
            <Button asChild variant="outline" className="mt-6">
                <Link href="/teacher/dashboard">Volver al Panel</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (exam.teacher_id !== user.id) {
    redirect('/teacher/dashboard?error=unauthorized');
  }

  return (
    // The main layout (teacher layout) will still apply for the screen version of this page.
    // PrintableView handles its own styling for print.
    <>
      <div className="container mx-auto py-4 md:py-8 no-print">
         <PageHeader
          title={`Vista de Impresión: ${exam.title}`}
          description="Previsualiza el examen como se imprimirá. Usa el botón al final para imprimir."
          icon={PrinterIcon}
          actions={
            <Button asChild variant="outline">
                <Link href="/teacher/dashboard">Volver al Panel</Link>
            </Button>
          }
        />
      </div>
      <PrintableView exam={exam} />
    </>
  );
}

// Optional: Add metadata for the page
export async function generateMetadata({ params }: { params: { examId: string } }) {
  const exam = await getExamById(params.examId);
  return {
    title: exam ? `Imprimir: ${exam.title}` : "Imprimir Examen",
  };
}
