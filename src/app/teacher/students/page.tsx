
import { PageHeader } from "@/components/shared/PageHeader";
import { AddStudentForm } from "@/components/teacher/AddStudentForm";
import { ManagedStudentsTable } from "@/components/teacher/ManagedStudentsTable";
import { getAllManagedStudents } from "@/lib/db";
import type { ManagedStudent } from "@/lib/types";
import { Users } from "lucide-react";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const runtime = 'edge';
export default async function ManageStudentsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  
  if (!profile || profile.role !== 'profesor') {
    redirect("/login");
  }

  const students: ManagedStudent[] = await getAllManagedStudents();

  return (
    <>
      <PageHeader
        title="Gestionar Estudiantes"
        description="Añade, visualiza y administra los estudiantes registrados en la plataforma."
        icon={Users}
      />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <AddStudentForm />
        </div>
        <div className="md:col-span-2">
          <ManagedStudentsTable students={students} />
        </div>
      </div>
    </>
  );
}
