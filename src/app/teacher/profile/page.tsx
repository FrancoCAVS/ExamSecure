
import { PageHeader } from "@/components/shared/PageHeader";
import { User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function TeacherProfilePage() { 
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  
  if (!profile) {
    // This case might happen if the profile creation trigger failed.
    // Redirect to login or an error page.
    redirect("/login?error=profile_not_found");
  }

  const teacherData = {
    userId: user.id,
    fullName: profile.full_name || "Docente (Nombre no encontrado)",
    email: user.email || "N/A",
    role: profile.role || "profesor",
  };

  return (
    <>
      <PageHeader
        title="Mi Perfil de Docente"
        description="Visualiza la información de tu cuenta."
        icon={User}
      />
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Información del Docente</CardTitle>
          <CardDescription>
            Estos son los datos asociados a tu sesión actual.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">ID de Usuario (Supabase)</p>
            <p className="text-lg font-semibold">{teacherData.userId}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Nombre Completo</p> 
            <p className="text-lg font-semibold">{teacherData.fullName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-lg font-semibold">{teacherData.email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Rol</p>
            <p className="text-lg font-semibold capitalize">{teacherData.role}</p>
          </div>
           <p className="text-xs text-muted-foreground pt-4">
            Nota: La edición de perfil y la persistencia de datos más allá de Supabase Auth y la tabla 'profiles' (nombre, rol) no están completamente implementadas para docentes en este prototipo. Los datos se muestran basados en la información de sesión de Supabase.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
