
import { PageHeader } from "@/components/shared/PageHeader";
import { User, UserCircle } from "lucide-react";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
export const runtime = 'edge';

export const dynamic = 'force-dynamic';

export default async function StudentProfilePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  if (!profile) {
    redirect("/login?error=profile_not_found");
  }

  const initialProfileData = {
    userId: user.id || "",
    fullName: profile.full_name || "",
    email: user.email || "",
    materia: profile.materia || "",
  };

  let displayName = initialProfileData.fullName || initialProfileData.email || "Estudiante";

  return (
    <>
      <PageHeader
        title="Mi Perfil"
        description={`Bienvenido/a, ${displayName}. Aquí puedes ver tus datos.`}
        icon={User}
      />
      <Card className="max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2 text-primary">
            <UserCircle className="h-6 w-6" /> Información de la Cuenta
          </CardTitle>
          <CardDescription>
            Estos son tus datos personales registrados en la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Email</p>
            <p className="text-lg font-semibold">{initialProfileData.email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Apellidos y Nombres</p>
            <p className="text-lg font-semibold">{initialProfileData.fullName}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Materia</p>
            <p className="text-lg font-semibold">{initialProfileData.materia || "No especificada"}</p>
          </div>
          <p className="text-xs text-muted-foreground pt-4">
            Nota: Si necesitas actualizar tus datos, contacta al administrador de la plataforma.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
