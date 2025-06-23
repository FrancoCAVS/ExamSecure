import { ExamBuilderForm, type ExamFormValues } from "@/components/exams/ExamBuilderForm";
import { PageHeader } from "@/components/shared/PageHeader";
import { getExamById } from "@/lib/db";
import type { Exam as ExamType, Question as QuestionTypeUnion, MultipleChoiceQuestion, MultipleResponseQuestion, WeightedChoiceQuestion, ArgumentReconstructionQuestion, TrueFalseJustificationQuestion, TrueFalseComplexQuestion, ClozeQuestion, QualitativeRating } from "@/lib/types";
import { AlertCircle, Edit3 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createSupabaseServerClient, getUserProfile } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export const runtime = 'edge';

export default async function EditExamPage({ 
    params 
}: { 
    // CORRECCIÓN: Se ajusta el tipo para reflejar que es una Promise
    params: Promise<{ examId: string }> 
}) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getUserProfile(user.id);
  
  if (!profile || profile.role !== 'profesor') {
    redirect("/login");
  }
  
  // CORRECCIÓN: Se resuelve la promesa y se extrae el valor en un solo paso
  const { examId } = await params;
  const exam = await getExamById(examId);

  if (!exam) {
    return (
      <div className="container mx-auto py-8 text-center">
        <Card className="max-w-lg mx-auto">
          <CardContent className="py-12">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Examen no encontrado</h2>
            <p className="text-muted-foreground">
              {/* CORRECCIÓN: Se usa la nueva variable examId */}
              El examen que estás intentando editar no existe o no está disponible. ID: {examId}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (exam.teacher_id !== user.id) {
    redirect('/teacher/dashboard?error=unauthorized');
  }

  // Transform Supabase data to form data structure
  const transformedQuestions = exam.questions.map(q => {
    const baseQuestion: any = { 
      id: q.id,
      text: q.text,
      type: q.type,
      points: q.points || 0,
      feedback: q.feedback || "",
    };

    if (q.type === 'multiple-choice' || q.type === 'multiple-response') {
      const mcq = q as MultipleChoiceQuestion | MultipleResponseQuestion;
      return {
        ...baseQuestion,
        options: mcq.options.map(opt => ({
          id: opt.id,
          text: opt.text,
          isCorrect: opt.isCorrect
        })),
        randomizeOptions: mcq.randomizeOptions || false,
      };
    } else if (q.type === 'weighted-choice') {
      const wcq = q as WeightedChoiceQuestion;
      return {
          ...baseQuestion,
          options: wcq.options.map(opt => ({
              id: opt.id,
              text: opt.text,
              percentage: opt.percentage
          })),
          randomizeOptions: wcq.randomizeOptions || false,
          allowMultipleSelections: wcq.allowMultipleSelections || false,
      };
    } else if (q.type === 'argument-reconstruction') {
      const arq = q as ArgumentReconstructionQuestion;
      return {
          ...baseQuestion,
          items: arq.items.map(item => ({
              id: item.id,
              text: item.text,
          })),
          correctOrder: arq.correctOrder,
      };
    } else if (q.type === 'true-false-justification') {
      const tfjq = q as TrueFalseJustificationQuestion;
      return {
          ...baseQuestion,
          affirmation: tfjq.affirmation,
          isAffirmationTrue: tfjq.isAffirmationTrue,
          pointsForAffirmation: tfjq.pointsForAffirmation,
          pointsForJustification: tfjq.pointsForJustification,
          justificationOptions: tfjq.justificationOptions.map(opt => ({
              id: opt.id,
              text: opt.text,
              isCorrect: opt.isCorrect,
          })),
          randomizeJustificationOptions: tfjq.randomizeJustificationOptions || false,
      };
    } else if (q.type === 'true-false-complex') {
      const tfcq = q as TrueFalseComplexQuestion;
      return {
          ...baseQuestion,
          statement: tfcq.statement,
          isStatementTrue: tfcq.isStatementTrue,
      };
    }
    if (q.type === 'cloze') {
      const clozeQ = q as ClozeQuestion;
      return {
          ...baseQuestion,
          textWithPlaceholders: clozeQ.textWithPlaceholders || clozeQ.text, 
          subQuestions: clozeQ.subQuestions.map(sq => ({
              ...sq,
              options: sq.options?.map(opt => ({ ...opt }))
          })),
      }
    }
    return baseQuestion as QuestionTypeUnion;
  });

  const baseInitialData = {
    title: exam.title,
    description: exam.description || "",
    durationMinutes: exam.duration_minutes,
    randomizeQuestions: exam.randomize_questions || false,
    onTimeUpAction: exam.on_time_up_action || 'auto-submit',
    gracePeriodMinutes: exam.on_time_up_action === 'allow-submission-grace-period' && exam.grace_period_minutes ? exam.grace_period_minutes : 5,
    autoSubmitOnFocusLoss: exam.auto_submit_on_focus_loss || false,
    questions: transformedQuestions as any,
  };

  const initialData: Partial<ExamFormValues> = exam.evaluation_type === 'qualitative'
    ? {
        ...baseInitialData,
        evaluationType: 'qualitative',
        qualitativeRatings: exam.qualitative_ratings || [],
      }
    : {
        ...baseInitialData,
        evaluationType: 'quantitative',
        approvalThreshold: exam.approval_threshold ?? 60,
      };


  return (
    <>
      <PageHeader
        title={`Editando Examen: ${exam.title}`}
        description="Modifica los detalles y preguntas de este examen."
        icon={Edit3}
      />
      <ExamBuilderForm initialData={initialData} examId={exam.id} />
    </>
  );
}