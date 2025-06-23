import { ExamBuilderForm } from "@/components/exams/ExamBuilderForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { Edit3 } from "lucide-react";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export const runtime = 'edge';

export default async function CreateExamPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  
  if (!profile || profile.role !== 'profesor') {
    redirect("/login");
  }

  return (
    <>
      <PageHeader
        title="Crear Nuevo Examen"
        description="Diseña y configura un nuevo examen para tus estudiantes."
        icon={Edit3}
      />
      <ExamBuilderForm />
    </>
  );
}
