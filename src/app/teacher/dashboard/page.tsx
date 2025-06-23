
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, BookOpenText, BarChart3, Trash2, Eye, Printer, ListChecks } from "lucide-react"; 
import Link from "next/link";
import { getAllExams, getSubmissionsByExamId } from "@/lib/db";
import type { Exam } from "@/lib/types";
import { deleteExamAction } from "@/lib/actions/exam.actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default async function TeacherDashboardPage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  
  if (!profile || profile.role !== 'profesor') {
    // Or redirect to a specific "unauthorized" page
    redirect("/login");
  }

  const teacherUserId = user.id;
  const teacherFullName = profile.full_name;

  // Fetch exams created by this teacher
  const recentExams: Exam[] = await getAllExams(teacherUserId);
  
  let totalSubmissions = 0;
  for (const exam of recentExams) {
    const submissions = await getSubmissionsByExamId(exam.id);
    totalSubmissions += submissions.length;
  }

  const mockStats = {
    totalExams: recentExams.length,
    activeExams: recentExams.filter(exam => exam.access_code).length, 
    recentSubmissions: totalSubmissions,
  };

  return (
    <>
      <PageHeader
        title="Panel de Docente"
        description={`Bienvenido/a, ${teacherFullName || 'Docente'}. Gestiona tus exámenes y supervisa el progreso.`}
        icon={BookOpenText}
        actions={
          <Link href={`/teacher/exams/create`}>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" /> Crear Nuevo Examen
            </Button>
          </Link>
        }
      />

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exámenes Totales</CardTitle>
            <BookOpenText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.totalExams}</div>
            <p className="text-xs text-muted-foreground">Exámenes creados por ti</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Exámenes Activos</CardTitle>
            <BookOpenText className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.activeExams}</div>
            <p className="text-xs text-muted-foreground">Exámenes disponibles con código</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Envíos Totales</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockStats.recentSubmissions}</div>
            <p className="text-xs text-muted-foreground">En todos tus exámenes activos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mis Exámenes</CardTitle>
          <CardDescription>Un vistazo rápido a los exámenes que has creado.</CardDescription>
        </CardHeader>
        <CardContent>
          {recentExams.length > 0 ? (
            <ul className="space-y-4">
              {recentExams.map((exam) => ( 
                <li key={exam.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 gap-4">
                  <div className="flex-grow">
                    <h3 className="font-semibold text-primary">{exam.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      ID: {exam.id} {exam.access_code && `| Código: ${exam.access_code}`}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Creado: {exam.created_at ? new Date(exam.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Actualizado: {exam.updated_at ? new Date(exam.updated_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {exam.questions.length} pregunta(s) | {exam.duration_minutes} min
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0 self-start sm:self-center flex-wrap">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/teacher/exams/${exam.id}/edit`}>Editar</Link>
                    </Button>
                    <Button variant="secondary" size="sm" asChild>
                      <Link href={`/student/exam/${exam.id}?userId=${teacherUserId}-preview&email=preview@example.com&fullName=Estudiante%20Preview&role=alumno&accessCode=${exam.access_code || ''}`} target="_blank" rel="noopener noreferrer">
                        <Eye className="h-4 w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Previsualizar</span>
                        <span className="sm:hidden">Ver</span>
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/teacher/exams/${exam.id}/print`}>
                        <Printer className="h-4 w-4 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">Imprimir</span>
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/teacher/exams/${exam.id}/results`}>
                        <ListChecks className="h-4 w-4 mr-1 sm:mr-2" />
                        Resultados
                      </Link>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="h-4 w-4 mr-1 sm:mr-2" />
                          <span className="hidden sm:inline">Eliminar</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Esta acción no se puede deshacer. Esto eliminará permanentemente el examen &quot;{exam.title}&quot; y todos los datos asociados.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <form action={deleteExamAction}>
                            <input type="hidden" name="examId" value={exam.id} />
                            <AlertDialogAction type="submit" className="bg-destructive hover:bg-destructive/90">
                              Sí, eliminar examen
                            </AlertDialogAction>
                          </form>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center text-muted-foreground py-8">No has creado ningún examen todavía.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
