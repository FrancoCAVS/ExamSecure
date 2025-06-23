
import { SignUpForm } from "@/components/auth/SignUpForm";
import { Logo } from "@/components/shared/Logo";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function SignUpPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const profile = await getUserProfile(user.id);
    if (profile) {
      if (profile.role === 'profesor') {
        redirect('/teacher/dashboard');
      } else if (profile.role === 'alumno') {
        redirect('/student/profile');
      }
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-secondary/30 p-4">
      <div className="mb-8">
        <Logo iconClassName="h-12 w-12" textClassName="text-4xl" />
      </div>
      <SignUpForm />
    </div>
  );
}
