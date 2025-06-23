
import { JoinExamForm } from "@/components/student/JoinExamForm";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function JoinExamPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }
  
  const profile = await getUserProfile(user.id);
  
  if (!profile) {
    redirect('/login?error=profile_not_found');
  }

  return (
    <JoinExamForm
      userId={user.id}
      fullName={profile.full_name}
    />
  );
}
