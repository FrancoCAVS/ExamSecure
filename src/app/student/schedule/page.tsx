
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import Image from 'next/image';
import { CalendarClock, CalendarDays, Clock, BookOpen, AlertTriangle, Info, Megaphone, Users, MapPin } from "lucide-react";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// Mock data - en una aplicación real, esto vendría de una API
const upcomingExams = [
  {
    id: "exam1",
    subject: "Matemáticas Avanzadas",
    title: "Parcial I - Cálculo Diferencial",
    date: "2024-09-15",
    time: "09:00 AM",
    duration: "120 min",
    location: "Aula Virtual 1 / Plataforma ExamSecure",
    topics: "Límites, Derivadas, Aplicaciones de la Derivada",
    image: "https://placehold.co/600x400.png",
    imageHint: "mathematics abstract",
    status: "Programado"
  },
  {
    id: "exam2",
    subject: "Historia Universal",
    title: "Examen Final - Siglo XX",
    date: "2024-09-22",
    time: "14:00 PM",
    duration: "90 min",
    location: "Plataforma ExamSecure",
    topics: "Guerras Mundiales, Guerra Fría, Globalización",
    image: "https://placehold.co/600x400.png",
    imageHint: "history books",
    status: "Confirmado"
  },
  {
    id: "exam3",
    subject: "Programación Orientada a Objetos",
    title: "Trabajo Práctico Evaluativo",
    date: "2024-09-30",
    time: "Todo el día (entrega límite 23:59)",
    duration: "N/A (Entrega)",
    location: "Plataforma ExamSecure",
    topics: "Clases, Objetos, Herencia, Polimorfismo",
    image: "https://placehold.co/600x400.png",
    imageHint: "coding computer",
    status: "Programado"
  },
];

const importantNotices = [
  {
    id: "notice1",
    title: "Actualización de Políticas de Integridad Académica",
    date: "2024-08-20",
    content: "Se han actualizado las políticas de integridad académica. Es fundamental que todos los estudiantes revisen el documento disponible en la sección de 'Recursos'. El incumplimiento de estas políticas tendrá consecuencias severas.",
    type: "warning" as "warning" | "info" | "update",
    author: "Dirección Académica"
  },
  {
    id: "notice2",
    title: "Nuevos Horarios de Consulta para Septiembre",
    date: "2024-08-28",
    content: "Los profesores de todas las cátedras han publicado sus nuevos horarios de consulta para el mes de septiembre. Puedes encontrarlos en el campus virtual de cada materia.",
    type: "info" as "warning" | "info" | "update",
    author: "Secretaría Estudiantil"
  },
  {
    id: "notice3",
    title: "Mantenimiento Programado de la Plataforma",
    date: "2024-09-05",
    content: "La plataforma ExamSecure estará en mantenimiento el próximo sábado 10 de septiembre entre las 02:00 AM y las 04:00 AM. Durante este período, el acceso podría verse interrumpido.",
    type: "update" as "warning" | "info" | "update",
    author: "Equipo Técnico ExamSecure"
  },
];

export default async function StudentSchedulePage() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  const effectiveDisplayName = profile?.full_name || user.email || "Estudiante";

  return (
    <>
      <PageHeader
        title="Cronograma y Avisos"
        description={`Bienvenido/a, ${effectiveDisplayName}. Mantente al día con tus próximos exámenes y anuncios importantes.`}
        icon={CalendarClock}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="text-primary h-7 w-7" /> Próximos Exámenes
          </h2>
          {upcomingExams.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CalendarDays className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold">
                  No hay exámenes programados por el momento.
                </h3>
                <p className="text-muted-foreground mt-2">
                  Consulta esta sección regularmente para ver actualizaciones.
                </p>
              </CardContent>
            </Card>
          ) : (
            upcomingExams.map((exam) => (
              <Card key={exam.id} className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <div className="md:flex">
                  <div className="md:w-1/3 relative h-48 md:h-auto">
                    <Image
                      src={exam.image}
                      alt={`Imagen para ${exam.subject}`}
                      layout="fill"
                      objectFit="cover"
                      data-ai-hint={exam.imageHint}
                    />
                  </div>
                  <div className="md:w-2/3">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl text-primary">{exam.title}</CardTitle>
                        <Badge variant={exam.status === "Confirmado" ? "default" : "secondary"} className={exam.status === "Confirmado" ? "bg-green-600 text-white" : ""}>
                          {exam.status}
                        </Badge>
                      </div>
                      <CardDescription className="text-sm text-muted-foreground font-medium">{exam.subject}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 pb-4">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <CalendarDays className="h-4 w-4 mr-2 text-accent" />
                        Fecha: {new Date(exam.date).toLocaleDateString('es-AR', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2 text-accent" />
                        Hora: {exam.time} (Duración: {exam.duration})
                      </div>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2 text-accent" />
                        Lugar: {exam.location}
                      </div>
                      <div className="flex items-start text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4 mr-2 mt-0.5 text-accent flex-shrink-0" />
                        Temas Principales: <span className="ml-1">{exam.topics}</span>
                      </div>
                    </CardContent>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <Megaphone className="text-primary h-7 w-7" /> Avisos Importantes
          </h2>
          {importantNotices.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Info className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold">No hay avisos recientes.</h3>
              </CardContent>
            </Card>
          ) : (
            <Accordion type="single" collapsible className="w-full bg-card p-4 rounded-lg shadow-md">
              {importantNotices.map((notice) => (
                <AccordionItem value={notice.id} key={notice.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      {notice.type === "warning" && <AlertTriangle className="h-5 w-5 text-destructive" />}
                      {notice.type === "info" && <Info className="h-5 w-5 text-blue-500" />}
                      {notice.type === "update" && <Users className="h-5 w-5 text-green-600" />}
                      <span className="font-medium text-base text-left">{notice.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 space-y-2">
                    <p className="text-sm text-muted-foreground leading-relaxed">{notice.content}</p>
                    <div className="text-xs text-muted-foreground/80">
                      <span>Publicado por: {notice.author}</span> | <span>Fecha: {new Date(notice.date).toLocaleDateString('es-AR')}</span>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </div>
      </div>
    </>
  );
}
