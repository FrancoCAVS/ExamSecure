
import { AuthenticatedNavbar } from "@/components/shared/AuthenticatedNavbar";
import { cn } from "@/lib/utils";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { SessionTimeoutManager } from "@/components/shared/SessionTimeoutManager";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  let userFullName: string | null = null;
  let userRole: "teacher" | "student" | null = null;

  if (user) {
    const profile = await getUserProfile(user.id);
    if (profile) {
      userFullName = profile.full_name;
      if (profile.role === 'profesor') userRole = 'teacher';
      if (profile.role === 'alumno') userRole = 'student';
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <AuthenticatedNavbar 
        userRole={userRole || "teacher"}
        userFullName={userFullName} 
      />
      <main className="flex-1 container py-8">
        <SessionTimeoutManager>{children}</SessionTimeoutManager>
      </main>
      <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        Panel Docente ExamSecure &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
