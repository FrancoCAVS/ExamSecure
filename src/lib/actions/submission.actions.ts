// Pega este código completo en "src/lib/actions/submission.actions.ts"
// Reemplaza tu función existente.

"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import type { Answer, GradeEssayQuestionOutput, Submission, Infraction, Question, Exam as ExamType, MultipleChoiceQuestion, MultipleResponseQuestion, WeightedChoiceQuestion, ArgumentReconstructionQuestion, TrueFalseJustificationQuestion, TrueFalseComplexQuestion, ClozeQuestion } from "@/lib/types";
// IMPORTANTE: La importación de 'gradeEssayQuestion' ha sido eliminada.
import { getExamById, saveSubmission } from "@/lib/db";

// Los schemas de Zod se mantienen igual que en tu código original.
const AnswerSchemaValidation = z.object({
  questionId: z.string(),
  value: z.any(), 
  score: z.number().optional(),
});

const ExamSubmissionSchema = z.object({
  examId: z.string().min(1, "Exam ID es requerido"),
  studentId: z.string().uuid().min(1, "Student ID (Supabase UUID) es requerido"),
  answersJson: z.string().refine(val => {
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) return false;
      return parsed.every(item => typeof item === 'object' && item !== null && 'questionId' in item && 'value' in item);
    } catch { return false; }
  }, { message: "Formato JSON de respuestas inválido o no es un array de respuestas." }),
  timeTaken: z.string().optional(),
  infractionsJson: z.string().optional(),
});


export async function submitExamAnswers(prevState: any, formData: FormData) {
  const examId = formData.get("examId") as string;
  
  if (!examId) {
    return { success: false, message: "ID del examen no proporcionado." };
  }

  try {
    const rawData = {
      examId: examId,
      studentId: formData.get("studentId"),
      answersJson: formData.get("answersJson"),
      timeTaken: formData.get("timeTaken"),
      infractionsJson: formData.get("infractionsJson"),
    };
    
    const parsedForm = ExamSubmissionSchema.safeParse(rawData);

    if (!parsedForm.success) {
      return {
        success: false,
        message: "Error de validación al enviar el examen.",
        errors: parsedForm.error.flatten().fieldErrors,
      };
    }
    
    const { studentId: studentSupabaseId, answersJson, timeTaken, infractionsJson } = parsedForm.data; 
    const studentAnswers: Answer[] = JSON.parse(answersJson);
    const infractions: Infraction[] = infractionsJson ? JSON.parse(infractionsJson) : [];

    const exam = await getExamById(examId);
    if (!exam) {
        return { success: false, message: "El examen no fue encontrado." };
    }

    let totalScore = 0;
    const essayGradingResults: Array<{ questionId: string; feedback: GradeEssayQuestionOutput }> = [];

    for (const answer of studentAnswers) {
      const questionDetail = exam.questions.find(q => q.id === answer.questionId);
      if (!questionDetail) continue;
      const questionPoints = questionDetail.points || 0;
      let questionScore = 0;

      switch (questionDetail.type) {
        case "multiple-choice":
          const mcq = questionDetail as MultipleChoiceQuestion;
          const correctOption = mcq.options.find(opt => opt.isCorrect);
          if (correctOption && answer.value === correctOption.id) questionScore = questionPoints;
          break;
        case "multiple-response":
          const mrq = questionDetail as MultipleResponseQuestion;
          const correctOptionIds = mrq.options.filter(opt => opt.isCorrect).map(opt => opt.id).sort();
          const studentSelectedIds = (Array.isArray(answer.value) ? answer.value as string[] : []).sort();
          if (correctOptionIds.length > 0 && correctOptionIds.length === studentSelectedIds.length && correctOptionIds.every((id, index) => id === studentSelectedIds[index])) questionScore = questionPoints;
          break;
        case "weighted-choice":
          const wcq = questionDetail as WeightedChoiceQuestion;
          if (wcq.allowMultipleSelections) {
            const selectedOptionIds = (Array.isArray(answer.value) ? answer.value as string[] : []);
            let sumPercentages = 0;
            selectedOptionIds.forEach(selectedId => {
              const option = wcq.options.find(opt => opt.id === selectedId);
              if (option) sumPercentages += option.percentage;
            });
            const normalizedPercentage = Math.max(0, Math.min(100, sumPercentages));
            questionScore = questionPoints * (normalizedPercentage / 100);
          } else {
            const selectedOptionId = answer.value as string;
            const selectedOption = wcq.options.find(opt => opt.id === selectedOptionId);
            if (selectedOption) {
              const effectivePercentage = Math.max(0, selectedOption.percentage); 
              questionScore = questionPoints * (effectivePercentage / 100);
            }
          }
          break;
        case "argument-reconstruction":
          const arq = questionDetail as ArgumentReconstructionQuestion;
          const studentOrder = (answer.value as string[] || []);
          const correctOrder = arq.correctOrder || []; 
          const EXPECTED_PREMISES = 2; 
          const EXPECTED_CONCLUSIONS = 1;
          if (studentOrder.length === correctOrder.length && correctOrder.length >= EXPECTED_PREMISES + EXPECTED_CONCLUSIONS) {
            const teacherPremiseIds = new Set(correctOrder.slice(0, EXPECTED_PREMISES));
            const teacherConclusionId = correctOrder[EXPECTED_PREMISES];
            const teacherDistractorIds = new Set(correctOrder.slice(EXPECTED_PREMISES + EXPECTED_CONCLUSIONS));

            const studentPremiseIds = new Set(studentOrder.slice(0, EXPECTED_PREMISES));
            const studentConclusionId = studentOrder[EXPECTED_PREMISES];
            const studentDistractorIds = new Set(studentOrder.slice(EXPECTED_PREMISES + EXPECTED_CONCLUSIONS));
            
            const areSetsEqual = (setA: Set<string>, setB: Set<string>) => setA.size === setB.size && [...setA].every(value => setB.has(value));

            if (areSetsEqual(studentPremiseIds, teacherPremiseIds) && studentConclusionId === teacherConclusionId && areSetsEqual(studentDistractorIds, teacherDistractorIds)) {
              questionScore = questionPoints;
            }
          }
          break;
        case "true-false-complex":
            const tfcq = questionDetail as TrueFalseComplexQuestion;
            if (answer.value === tfcq.isStatementTrue) questionScore = questionPoints;
            break;
        case "true-false-justification":
            const tfjq = questionDetail as TrueFalseJustificationQuestion;
            const tfjAnswer = answer.value as { affirmationResponse: boolean | null; justificationId: string | null };
            let affirmationScore = 0; let justificationScore = 0;
            if (tfjAnswer.affirmationResponse === tfjq.isAffirmationTrue) affirmationScore = tfjq.pointsForAffirmation || 0;
            const correctJustification = tfjq.justificationOptions.find(opt => opt.isCorrect);
            if (correctJustification && tfjAnswer.justificationId === correctJustification.id) justificationScore = tfjq.pointsForJustification || 0;
            questionScore = affirmationScore + justificationScore;
            break;
        case "free-text":
          try {
            const essayAnswer = answer.value as string;
            const questionText = questionDetail.text;
            if(essayAnswer && essayAnswer.trim() !== "") {
              // --- INICIO DEL CÓDIGO REFACTORIZADO ---
              // Se reemplaza la llamada directa a Genkit por una llamada fetch a nuestra API.
              
              const baseUrl = process.env.VERCEL_URL 
                ? `https://${process.env.VERCEL_URL}` 
                : 'http://localhost:3000';

              const response = await fetch(`${baseUrl}/api/grade-essay`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  question: questionText,
                  answer: essayAnswer,
                }),
              });

              const gradingResult: GradeEssayQuestionOutput = await response.json();

              if (!response.ok) {
                console.error(`AI grading API failed for question ${answer.questionId}:`, gradingResult);
              } else if (gradingResult) {
                essayGradingResults.push({ questionId: answer.questionId, feedback: gradingResult });
              }
              // --- FIN DEL CÓDIGO REFACTORIZADO ---
            }
          } catch (aiError) {
            console.error(`Fetch to AI grading API failed for free-text question ${answer.questionId}:`, aiError);
          }
          questionScore = 0; // El puntaje no se asigna automáticamente aquí.
          break;
        case "cloze":
          questionScore = 0; // TODO: Implement Cloze scoring logic
          break;
      }
      
      const answerIndex = studentAnswers.findIndex(a => a.questionId === questionDetail.id);
      if (answerIndex !== -1) {
        studentAnswers[answerIndex].score = questionScore;
      }
      
      totalScore += questionScore;
    }
    const finalScore = Math.max(0, Math.round(totalScore));
    
    const submissionPayload: Omit<Submission, 'id' | 'submitted_at' | 'graded_at'> = {
        exam_id: examId, 
        student_id: studentSupabaseId,
        answers: studentAnswers,
        score: finalScore, 
        essay_grading_results: essayGradingResults.length > 0 ? essayGradingResults : null,
        time_taken_seconds: timeTaken ? parseInt(timeTaken, 10) : null,
        infractions: infractions.length > 0 ? infractions : null,
    };
    
    const savedSubmission = await saveSubmission(submissionPayload);

    if (!savedSubmission || !savedSubmission.id) {
      throw new Error("Error crítico: El guardado de la sumisión no devolvió un ID.");
    }
    
    redirect(`/student/results/${savedSubmission.id}`);
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('NEXT_REDIRECT')) {
      throw error;
    }
    console.error("[SubmissionAction] Error during submission process:", error);
    return { success: false, message: "Error interno del servidor al procesar el envío." };
  }
}