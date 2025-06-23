
"use client";

import React, { useActionState, useTransition, useRef, useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createOrUpdateExam } from "@/lib/actions/exam.actions";
import type { Question as QuestionUnionType, MultipleChoiceOption, WeightedChoiceOption, ArgumentItem, TrueFalseJustificationQuestion, TrueFalseComplexQuestion, ClozeQuestion, ClozeSubQuestion, OnTimeUpAction, QualitativeRating } from "@/lib/types";
import {
    type AIQuestion,
    type GenerateExamQuestionsInput,
    type SelectableAIQuestionType,
    AllQuestionTypesForAutoGen,
    ConcreteAIQuestionType
} from '@/ai/flows/generate-exam-questions-types';
import { generateExamQuestions } from '@/ai/flows/generate-exam-questions-flow';
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { MultipleChoiceQuestionEdit } from "./MultipleChoiceQuestionEdit";
import { FreeTextQuestionEdit } from "./FreeTextQuestionEdit";
import { WeightedChoiceQuestionEdit } from "./WeightedChoiceQuestionEdit";
import { ArgumentReconstructionQuestionEdit } from "./ArgumentReconstructionQuestionEdit";
import { TrueFalseJustificationQuestionEdit } from "./TrueFalseJustificationQuestionEdit";
import { TrueFalseComplexQuestionEdit } from "./TrueFalseComplexQuestionEdit";
import { PlusCircle, Save, AlertTriangle, Wand2, FileJson, Loader2, Eye, Trash2, Percent, Award, ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogClose,
  DialogContent as UIDialogContent,
  DialogHeader as UIDialogHeader,
  DialogTitle as UIDialogTitle,
  DialogDescription as UIDialogDescription,
} from "@/components/ui/dialog";
import { QuestionPreviewRenderer } from "./QuestionPreviewRenderer";
import { Separator } from '../ui/separator';


const MultipleChoiceOptionFormSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "El texto de la opción es requerido"),
  isCorrect: z.boolean().default(false),
});
export type MultipleChoiceOptionFormSchemaType = z.infer<typeof MultipleChoiceOptionFormSchema>;


const WeightedChoiceOptionFormSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "El texto de la opción es requerido"),
  percentage: z.coerce.number().min(-100, "Porcentaje debe ser >= -100").max(100, "Porcentaje debe ser <= 100"),
});
export type WeightedChoiceOptionFormSchemaType = z.infer<typeof WeightedChoiceOptionFormSchema>;

const ArgumentItemFormSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "El texto del ítem es requerido."),
});
export type ArgumentItemFormSchemaType = z.infer<typeof ArgumentItemFormSchema>;


const BaseQuestionFormSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "El texto/título de la pregunta es requerido"),
  points: z.coerce.number().min(0).optional().default(10),
  feedback: z.preprocess(
    (val) => (val === null ? undefined : val), 
    z.string().optional().default("")
  ),
});

const MultipleChoiceQuestionFormSchema = BaseQuestionFormSchema.extend({
  type: z.literal("multiple-choice"),
  options: z.array(MultipleChoiceOptionFormSchema).min(2, "Se requieren al menos 2 opciones")
    .refine(options => options.filter(opt => opt.isCorrect).length === 1, {
      message: "Debe haber exactamente una opción marcada como correcta.",
    }),
  randomizeOptions: z.boolean().optional().default(false),
});

const MultipleResponseQuestionFormSchema = BaseQuestionFormSchema.extend({
  type: z.literal("multiple-response"),
  options: z.array(MultipleChoiceOptionFormSchema).min(2, "Se requieren al menos 2 opciones")
    .refine(options => options.some(opt => opt.isCorrect), {
      message: "Debe haber al menos una opción marcada como correcta.",
    }),
  randomizeOptions: z.boolean().optional().default(false),
});

const FreeTextQuestionFormSchema = BaseQuestionFormSchema.extend({
  type: z.literal("free-text"),
});

const WeightedChoiceQuestionFormSchema = BaseQuestionFormSchema.extend({
  type: z.literal("weighted-choice"),
  options: z.array(WeightedChoiceOptionFormSchema).min(1, "Se requiere al menos 1 opción"),
  randomizeOptions: z.boolean().optional().default(false),
  allowMultipleSelections: z.boolean().optional().default(false),
});

const ArgumentReconstructionQuestionFormSchema = BaseQuestionFormSchema.extend({
  type: z.literal("argument-reconstruction"),
  items: z.array(ArgumentItemFormSchema).min(3, "Se requieren al menos 3 ítems (ej: 2 premisas, 1 conclusión)."),
  correctOrder: z.array(z.string()).optional(),
});

const TrueFalseJustificationQuestionFormSchema = BaseQuestionFormSchema.extend({
  type: z.literal("true-false-justification"),
  affirmation: z.string().min(1, "La afirmación es requerida."),
  isAffirmationTrue: z.boolean().default(false),
  justificationOptions: z.array(MultipleChoiceOptionFormSchema).min(2, "Se requieren al menos 2 opciones de justificación.")
    .refine(options => options.filter(opt => opt.isCorrect).length === 1, {
      message: "Debe haber exactamente una justificación marcada como correcta.",
    }),
  pointsForAffirmation: z.coerce.number().min(0).optional().default(5),
  pointsForJustification: z.coerce.number().min(0).optional().default(5),
  randomizeJustificationOptions: z.boolean().optional().default(false),
});


const TrueFalseComplexQuestionFormSchema = BaseQuestionFormSchema.extend({
  type: z.literal("true-false-complex"),
  statement: z.string().min(1, "El enunciado complejo es requerido."),
  isStatementTrue: z.boolean().default(false),
});

const ClozeSubQuestionOptionFormSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, "Texto de opción requerido"),
  percentage: z.coerce.number().min(-100).max(100).optional(),
  isCorrect: z.boolean().optional(),
  feedback: z.string().optional(),
});

const ClozeSubQuestionFormSchema = z.object({
  id: z.string().optional(),
  placeholderLabel: z.string().min(1, "Etiqueta de placeholder requerida"),
  type: z.enum(["multiple-choice", "short-answer", "numerical"]),
  points: z.coerce.number().min(0).default(1),
  options: z.array(ClozeSubQuestionOptionFormSchema).optional(),
  correctAnswer: z.union([z.string(), z.number()]).optional(),
  allowMultipleSelectionsInSubQuestion: z.boolean().optional().default(false),
  randomizeSubQuestionOptions: z.boolean().optional().default(false),
});
export type ClozeSubQuestionFormSchemaType = z.infer<typeof ClozeSubQuestionFormSchema>;


const ClozeQuestionFormSchema = BaseQuestionFormSchema.extend({
  type: z.literal("cloze"),
  textWithPlaceholders: z.string().min(1, "Texto con placeholders requerido"),
  subQuestions: z.array(ClozeSubQuestionFormSchema).min(1,"Se requiere al menos una subpregunta"),
});

const QuestionFormSchema = z.discriminatedUnion("type", [
  MultipleChoiceQuestionFormSchema,
  MultipleResponseQuestionFormSchema,
  FreeTextQuestionFormSchema,
  WeightedChoiceQuestionFormSchema,
  ArgumentReconstructionQuestionFormSchema,
  TrueFalseJustificationQuestionFormSchema,
  TrueFalseComplexQuestionFormSchema,
  ClozeQuestionFormSchema,
]);

const BaseExamDetailsSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres"),
  description: z.string().optional(),
  durationMinutes: z.coerce.number().min(1, "La duración debe ser de al menos 1 minuto"),
  questions: z.array(QuestionFormSchema).min(0, "El examen puede no tener preguntas inicialmente"),
  randomizeQuestions: z.boolean().optional().default(false),
  onTimeUpAction: z.enum(['auto-submit', 'prevent-submit', 'allow-submission-grace-period']).optional().default('auto-submit'),
  gracePeriodMinutes: z.coerce.number().min(1, "El tiempo de gracia debe ser de al menos 1 minuto").optional(),
  autoSubmitOnFocusLoss: z.boolean().optional().default(false),
  show_grades_on_completion: z.boolean().optional().default(false),
});

const QualitativeEvalConfigSchema = z.object({
  evaluationType: z.literal('qualitative'),
  qualitativeRatings: z.array(z.object({
    id: z.string().optional(),
    label: z.string().min(1, "La etiqueta de la valoración es requerida."),
    minPercentage: z.coerce.number().min(0, "Mín. % debe ser >= 0").max(100, "Mín. % debe ser <= 100"),
    isPassing: z.boolean().optional().default(false),
  })).min(1, "Se requiere al menos una valoración cualitativa."),
  approvalThreshold: z.undefined().optional(),
});

const QuantitativeEvalConfigSchema = z.object({
  evaluationType: z.literal('quantitative'),
  approvalThreshold: z.coerce.number({invalid_type_error: "Debe ser un número"}).min(0, "Umbral debe ser >= 0").max(100, "Umbral debe ser <= 100").optional(),
  qualitativeRatings: z.undefined().optional(),
});

const ExamFormSchema = z.discriminatedUnion("evaluationType", [
  BaseExamDetailsSchema.merge(QuantitativeEvalConfigSchema),
  BaseExamDetailsSchema.merge(QualitativeEvalConfigSchema),
]).refine(data => {
  if (data.onTimeUpAction === 'allow-submission-grace-period' && (data.gracePeriodMinutes === undefined || data.gracePeriodMinutes <= 0)) {
    return false;
  }
  return true;
}, {
  message: "Se debe especificar un tiempo de gracia mayor a 0 minutos si se selecciona esa opción.",
  path: ["gracePeriodMinutes"],
});

export type ExamFormValues = z.infer<typeof ExamFormSchema>;
export type QuestionFormValues = z.infer<typeof QuestionFormSchema>;
type QualitativeRatingFormValues = z.infer<typeof QualitativeEvalConfigSchema.shape.qualitativeRatings.element>;

interface ExamBuilderFormProps {
  initialData?: Partial<ExamFormValues>; 
  examId?: string;
}

export function ExamBuilderForm({ initialData, examId }: ExamBuilderFormProps) {
  const [formActionState, formAction] = useActionState(createOrUpdateExam, null);
  const [isFormServerSubmitting, startTransition] = useTransition();
  const { toast } = useToast();
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiDialogOptions, setAIDialogOptions] = useState<{numQuestions: number; topic: string; questionTypeToGenerate: SelectableAIQuestionType; contextText: string; additionalInstructions: string;}>({
    numQuestions: 3,
    topic: "",
    questionTypeToGenerate: "ANY",
    contextText: "",
    additionalInstructions: "",
  });
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [questionToPreview, setQuestionToPreview] = useState<QuestionFormValues | null>(null);
  const [isQuestionPreviewOpen, setIsQuestionPreviewOpen] = useState(false);


  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting: isFormClientSubmitting },
    watch,
    setValue,
    getValues
  } = useForm<ExamFormValues>({
    resolver: zodResolver(ExamFormSchema),
    defaultValues: {
      title: initialData?.title || "",
      description: initialData?.description || "",
      durationMinutes: initialData?.durationMinutes || 60,
      questions: initialData?.questions || [],
      randomizeQuestions: initialData?.randomizeQuestions || false,
      onTimeUpAction: initialData?.onTimeUpAction || 'auto-submit',
      gracePeriodMinutes: initialData?.gracePeriodMinutes || 5,
      autoSubmitOnFocusLoss: initialData?.autoSubmitOnFocusLoss || false,
      show_grades_on_completion: initialData?.show_grades_on_completion || false,
      evaluationType: initialData?.evaluationType || 'quantitative',
      ...(initialData?.evaluationType === 'quantitative'
        ? { approvalThreshold: initialData.approvalThreshold ?? 60, qualitativeRatings: undefined }
        : { approvalThreshold: undefined, qualitativeRatings: initialData?.qualitativeRatings || [{id: `qr-default-${Date.now()}`, label: "Aprobado", minPercentage: 60, isPassing: true}] }),
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "questions",
  });

  const { fields: qualitativeRatingFields, append: appendQualitativeRating, remove: removeQualitativeRating } = useFieldArray({
    control,
    name: "qualitativeRatings" as any, 
  });

  const watchedOnTimeUpAction = watch("onTimeUpAction");
  const watchedEvaluationType = watch("evaluationType");

  useEffect(() => {
    if (watchedOnTimeUpAction !== 'allow-submission-grace-period') {
      setValue('gracePeriodMinutes', undefined);
    }
  }, [watchedOnTimeUpAction, setValue]);

  useEffect(() => {
    if (watchedEvaluationType === 'quantitative') {
      setValue('qualitativeRatings' as any, undefined); 
      if (getValues('approvalThreshold') === undefined) {
        setValue('approvalThreshold' as any, 60);
      }
    } else if (watchedEvaluationType === 'qualitative') {
      setValue('approvalThreshold' as any, undefined); 
      if (!getValues('qualitativeRatings' as any) || getValues('qualitativeRatings' as any).length === 0) {
        setValue('qualitativeRatings' as any, [{id: `qr-new-${Date.now()}`, label: "Aprobado", minPercentage: 60, isPassing: true}]);
      }
    }
  }, [watchedEvaluationType, setValue, getValues]);


  const onSubmitHandler = (data: ExamFormValues) => {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("description", data.description || "");
    formData.append("durationMinutes", String(data.durationMinutes));
    formData.append("randomizeQuestions", String(data.randomizeQuestions || false));
    formData.append("onTimeUpAction", data.onTimeUpAction || 'auto-submit');
    if (data.onTimeUpAction === 'allow-submission-grace-period' && data.gracePeriodMinutes) {
        formData.append("gracePeriodMinutes", String(data.gracePeriodMinutes));
    }
    formData.append("autoSubmitOnFocusLoss", String(data.autoSubmitOnFocusLoss || false));
    formData.append("show_grades_on_completion", String(data.show_grades_on_completion || false));
    formData.append("evaluationType", data.evaluationType);
    if (data.evaluationType === 'quantitative' && data.approvalThreshold !== undefined) {
      formData.append("approvalThreshold", String(data.approvalThreshold));
    }
    if (data.evaluationType === 'qualitative' && data.qualitativeRatings) {
      formData.append("qualitativeRatingsJson", JSON.stringify(data.qualitativeRatings));
    }


    const questionsWithDerivedData = data.questions.map(q => {
        let processedQ = { ...q };
        if (q.type === 'argument-reconstruction' && q.items && (!q.correctOrder || q.correctOrder.length === 0)) {
            const itemsWithIds = q.items.map((item, idx) => ({
                ...item,
                id: item.id || `new-item-arg-${idx}-${Date.now()}`
            }));
            const derivedCorrectOrder = itemsWithIds.map(item => item.id!);
            processedQ = { ...processedQ, items: itemsWithIds, correctOrder: derivedCorrectOrder };
        }
        if (q.type === 'true-false-justification') {
            const totalPoints = (q.pointsForAffirmation ?? 0) + (q.pointsForJustification ?? 0);
            processedQ = { ...processedQ, points: totalPoints };
        }
        return processedQ;
    });

    formData.append("questionsJson", JSON.stringify(questionsWithDerivedData));

    if (examId) {
      formData.append("examId", examId);
    }
    startTransition(() => {
      formAction(formData);
    });
  };

  const addQuestion = (type: QuestionFormValues["type"]) => {
    let newQuestionPayload: QuestionFormValues;
    const baseId = `q-new-${Date.now()}`;
    const basePayload = { id: baseId, text: "", points: 10, feedback: "" };

    switch (type) {
      case "multiple-choice":
        newQuestionPayload = {
          ...basePayload, type,
          text: "Nueva Pregunta de Opción Única",
          options: [
            { id: `opt-new-${baseId}-1`, text: "", isCorrect: false },
            { id: `opt-new-${baseId}-2`, text: "", isCorrect: false },
          ],
          randomizeOptions: false,
        };
        break;
      case "multiple-response":
        newQuestionPayload = {
          ...basePayload, type,
          text: "Nueva Pregunta de Respuesta Múltiple",
          options: [
            { id: `opt-new-${baseId}-1`, text: "", isCorrect: false },
            { id: `opt-new-${baseId}-2`, text: "", isCorrect: false },
          ],
          randomizeOptions: false,
        };
        break;
      case "weighted-choice":
        newQuestionPayload = {
          ...basePayload, type,
          text: "Nueva Pregunta de Opción Ponderada",
          options: [
            { id: `opt-new-${baseId}-wc1`, text: "", percentage: 0 },
          ],
          randomizeOptions: false,
          allowMultipleSelections: false,
        };
        break;
      case "argument-reconstruction":
        newQuestionPayload = {
          ...basePayload, type,
          text: "Reconstruye el argumento. Identifica 2 premisas, 1 conclusión y los distractores. Ordena las 2 premisas, luego la conclusión, y los distractores al final.",
          items: [
            { id: `argitem-new-${baseId}-p1`, text: "Premisa A del argumento" },
            { id: `argitem-new-${baseId}-p2`, text: "Premisa B del argumento" },
            { id: `argitem-new-${baseId}-c1`, text: "Conclusión principal del argumento" },
            { id: `argitem-new-${baseId}-d1`, text: "Distractor (no pertenece al argumento)" },
          ],
          correctOrder: [],
        };
        break;
      case "true-false-justification":
        newQuestionPayload = {
          ...basePayload, type,
          text: "Pregunta V/F con Justificación",
          affirmation: "Escribe la afirmación aquí",
          isAffirmationTrue: false,
          pointsForAffirmation: 5,
          pointsForJustification: 5,
          points: 10,
          justificationOptions: [
            { id: `opt-new-${baseId}-tfj1`, text: "Justificación 1", isCorrect: false },
            { id: `opt-new-${baseId}-tfj2`, text: "Justificación 2", isCorrect: false },
          ],
          randomizeJustificationOptions: false,
        };
        break;
      case "true-false-complex":
        newQuestionPayload = {
          ...basePayload, type,
          text: "Pregunta V/F (Compleja)",
          statement: "Escribe el enunciado complejo aquí",
          isStatementTrue: false,
        };
        break;
      case "cloze":
        const clozeText = "Ejemplo: El {animal} dice {sonido}.";
        newQuestionPayload = {
            ...basePayload,
            type,
            text: clozeText,
            textWithPlaceholders: clozeText,
            subQuestions: [
                { id: `csq-new-${baseId}-1`, placeholderLabel: "animal", type: "short-answer", points: 5 },
                { id: `csq-new-${baseId}-2`, placeholderLabel: "sonido", type: "short-answer", points: 5 },
            ],
        };
        break;
      case "free-text":
      default:
        newQuestionPayload = { ...basePayload, type: "free-text", text: "Nueva Pregunta de Texto Libre" };
        break;
    }
    append(newQuestionPayload);
  };

  const handleAIQuestionGeneration = async () => {
    setIsGeneratingAI(true);
    try {
      const examData = getValues();
      const input: GenerateExamQuestionsInput = {
        examTitle: examData.title,
        examDescription: examData.description,
        numQuestions: aiDialogOptions.numQuestions,
        topic: aiDialogOptions.topic || undefined,
        questionTypeToGenerate: aiDialogOptions.questionTypeToGenerate === "ANY" ? undefined : aiDialogOptions.questionTypeToGenerate as ConcreteAIQuestionType,
        contextText: aiDialogOptions.contextText || undefined,
        additionalInstructions: aiDialogOptions.additionalInstructions || undefined,
      };

      try {
        const webhookPayload = {
          source: 'ExamSecure - AI Question Generation Attempt',
          generationParams: aiDialogOptions,
          examContext: {
            title: examData.title,
            description: examData.description,
          }
        };
        const webhookResponse = await fetch('http://localhost:5678/webhook-test/3183924a-e128-4952-a135-7787655832fc', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookPayload),
        });
        if (!webhookResponse.ok) {
          console.warn(`AI Generation Webhook call failed with status: ${webhookResponse.status}. Response:`, await webhookResponse.text());
        } else {
          console.log('AI Generation Webhook call successful.');
        }
      } catch (webhookError) {
        console.warn('Error calling AI Generation webhook:', webhookError);
      }


      const result = await generateExamQuestions(input);
      if (result.generatedQuestions && result.generatedQuestions.length > 0) {
        const newFormQuestions: QuestionFormValues[] = result.generatedQuestions.map((aiQ, index) => {
          const questionId = `q-ai-${Date.now()}-${index}`;
          let adaptedQuestion: Partial<QuestionFormValues> & { type: AIQuestion['type'] } = {
            id: questionId,
            text: (aiQ.type === 'cloze' ? aiQ.textWithPlaceholders : aiQ.text) || "",
            points: aiQ.points ?? 10,
            feedback: aiQ.feedback ?? "",
            type: aiQ.type,
          };

          switch (aiQ.type) {
            case "multiple-choice":
            case "multiple-response":
              adaptedQuestion.options = aiQ.options.map((opt, optIdx) => ({
                id: opt.id || `opt-ai-${questionId}-${optIdx}`,
                text: opt.text,
                isCorrect: opt.isCorrect,
              }));
              adaptedQuestion.randomizeOptions = aiQ.randomizeOptions;
              break;
            case "weighted-choice":
              adaptedQuestion.options = aiQ.options.map((opt, optIdx) => ({
                id: opt.id || `opt-ai-wc-${questionId}-${optIdx}`,
                text: opt.text,
                percentage: opt.percentage,
              }));
              adaptedQuestion.randomizeOptions = aiQ.randomizeOptions;
              adaptedQuestion.allowMultipleSelections = aiQ.allowMultipleSelections;
              break;
            case "argument-reconstruction":
              const itemsWithIds = aiQ.items.map((item, itemIdx) => ({
                id: item.id || `item-ai-${questionId}-${itemIdx}`,
                text: item.text,
              }));
              adaptedQuestion.items = itemsWithIds;
              adaptedQuestion.correctOrder = itemsWithIds.map(item => item.id!);
              break;
            case "true-false-justification":
              adaptedQuestion.affirmation = aiQ.affirmation;
              adaptedQuestion.isAffirmationTrue = aiQ.isAffirmationTrue;
              adaptedQuestion.pointsForAffirmation = aiQ.pointsForAffirmation ?? 5;
              adaptedQuestion.pointsForJustification = aiQ.pointsForJustification ?? 5;
              adaptedQuestion.points = (adaptedQuestion.pointsForAffirmation) + (adaptedQuestion.pointsForJustification);
              adaptedQuestion.justificationOptions = aiQ.justificationOptions.map((opt, optIdx) => ({
                id: opt.id || `opt-ai-tfj-${questionId}-${optIdx}`,
                text: opt.text,
                isCorrect: opt.isCorrect,
              }));
              adaptedQuestion.randomizeJustificationOptions = aiQ.randomizeJustificationOptions;
              break;
            case "true-false-complex":
              adaptedQuestion.statement = aiQ.statement;
              adaptedQuestion.isStatementTrue = aiQ.isStatementTrue;
              break;
            case "cloze":
              adaptedQuestion.textWithPlaceholders = aiQ.textWithPlaceholders;
              adaptedQuestion.subQuestions = aiQ.subQuestions.map((sq, sqIdx) => ({
                id: sq.id || `csq-ai-${questionId}-${sqIdx}`,
                placeholderLabel: sq.placeholderLabel,
                type: sq.type,
                points: sq.points,
                options: sq.options?.map((opt, optIdx) => ({
                  id: opt.id || `csqo-ai-${questionId}-${sqIdx}-${optIdx}`,
                  text: opt.text,
                  percentage: opt.percentage,
                  isCorrect: opt.isCorrect,
                  feedback: opt.feedback,
                })),
                correctAnswer: sq.correctAnswer,
                allowMultipleSelectionsInSubQuestion: sq.allowMultipleSelectionsInSubQuestion,
                randomizeSubQuestionOptions: sq.randomizeSubQuestionOptions,
              }));
              break;
          }
          return adaptedQuestion as QuestionFormValues;
        });
        append(newFormQuestions);
        toast({ title: "Éxito", description: `${newFormQuestions.length} preguntas generadas por IA y añadidas.` });
      } else {
        toast({ title: "Información", description: "La IA no generó preguntas esta vez.", variant: "default" });
      }
    } catch (error) {
      console.error("Error generating AI questions:", error);
      let errorMessage = "No se pudieron generar preguntas con IA.";
      if (error instanceof Error) {
        if (error.message.includes("overloaded") || error.message.includes("Service Unavailable")) {
          errorMessage = "El servicio de IA está temporalmente sobrecargado. Por favor, intenta de nuevo más tarde.";
        } else if (error.message.includes("La IA no generó preguntas")) {
          errorMessage = error.message;
        } else {
          errorMessage = `Error de IA: ${error.message}`;
        }
      }
      toast({ title: "Error de IA", description: errorMessage, variant: "destructive" });
    }
    setIsGeneratingAI(false);
    setIsAIDialogOpen(false);
  };

  const handleJsonFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonContent = e.target?.result as string;
        const parsedQuestions = JSON.parse(jsonContent);

        if (!Array.isArray(parsedQuestions)) {
          throw new Error("El archivo JSON debe contener un array de preguntas.");
        }

        const questionsToAppend: QuestionFormValues[] = [];
        parsedQuestions.forEach((qFromFile: any, index: number) => {
          const validatedQuestion = QuestionFormSchema.safeParse(qFromFile);
          if (!validatedQuestion.success) {
            console.warn(`Pregunta ${index + 1} del JSON ignorada por error de validación o tipo no soportado:`, validatedQuestion.error.flatten().fieldErrors);
            toast({ title: "Advertencia de Importación", description: `Pregunta ${index+1} del JSON ignorada (tipo no soportado o error). Revisa la consola.`, variant: "default" });
            return;
          }

          let qValidated = validatedQuestion.data;
          const questionId = `q-json-${Date.now()}-${index}`;
          let adaptedQuestion: QuestionFormValues = {
            ...qValidated,
            id: questionId,
            points: qValidated.points ?? 10,
            feedback: qValidated.feedback ?? "",
          };

          if (adaptedQuestion.type === 'cloze') {
            adaptedQuestion.text = qValidated.textWithPlaceholders || qValidated.text;
          }


          if ('options' in adaptedQuestion && Array.isArray(adaptedQuestion.options)) {
            adaptedQuestion.options = adaptedQuestion.options.map((opt: any, optIdx: number) => ({
              ...opt,
              id: opt.id || `opt-json-${questionId}-${optIdx}`,
            }));
          }
          if (adaptedQuestion.type === 'argument-reconstruction' && 'items' in adaptedQuestion && Array.isArray(adaptedQuestion.items)) {
            const itemsWithIds = adaptedQuestion.items.map((item: any, itemIdx: number) => ({
              ...item,
              id: item.id || `item-json-${questionId}-${itemIdx}`,
            }));
            adaptedQuestion.items = itemsWithIds;
            adaptedQuestion.correctOrder = itemsWithIds.map(i => i.id!);
          }
           if (adaptedQuestion.type === 'true-false-justification') {
            adaptedQuestion.points = (adaptedQuestion.pointsForAffirmation ?? 0) + (adaptedQuestion.pointsForJustification ?? 0);
            if ('justificationOptions' in adaptedQuestion && Array.isArray(adaptedQuestion.justificationOptions)) {
                adaptedQuestion.justificationOptions = adaptedQuestion.justificationOptions.map((opt: any, optIdx: number) => ({
                    ...opt,
                    id: opt.id || `opt-json-tfj-${questionId}-${optIdx}`,
                }));
            }
          }
          if (adaptedQuestion.type === 'cloze' && 'subQuestions' in adaptedQuestion && Array.isArray(adaptedQuestion.subQuestions)) {
            adaptedQuestion.subQuestions = adaptedQuestion.subQuestions.map((sq: any, sqIdx: number) => ({
                ...sq,
                id: sq.id || `csq-json-${questionId}-${sqIdx}`,
                options: sq.options?.map((opt: any, optIdx: number) => ({
                    ...opt,
                    id: opt.id || `csqo-json-${questionId}-${sqIdx}-${optIdx}`,
                })),
            }));
          }
          questionsToAppend.push(adaptedQuestion);
        });

        if (questionsToAppend.length > 0) {
          append(questionsToAppend);
          toast({ title: "Éxito", description: `${questionsToAppend.length} preguntas importadas desde JSON.` });
        } else if (parsedQuestions.length > 0) {
            toast({ title: "Importación Fallida", description: "Ninguna pregunta del JSON pudo ser validada o todas eran de tipos no soportados.", variant: "destructive" });
        } else {
            toast({ title: "Archivo Vacío", description: "El archivo JSON no contenía preguntas.", variant: "default" });
        }

      } catch (error) {
        console.error("Error importing JSON questions:", error);
        toast({ title: "Error de Importación JSON", description: error instanceof Error ? error.message : "No se pudo procesar el archivo.", variant: "destructive" });
      } finally {
        if (jsonFileInputRef.current) {
          jsonFileInputRef.current.value = "";
        }
      }
    };
    reader.readAsText(file);
  };


  const isActuallySubmitting = isFormClientSubmitting || isFormServerSubmitting;

  const getFriendlyQuestionTypeName = (type: SelectableAIQuestionType | QuestionFormValues["type"]): string => {
    switch (type) {
      case 'ANY': return 'Cualquier Tipo';
      case 'multiple-choice': return 'Opción Única';
      case 'multiple-response': return 'Respuesta Múltiple';
      case 'weighted-choice': return 'Opción Ponderada';
      case 'argument-reconstruction': return 'Reconstrucción de Argumento';
      case 'free-text': return 'Texto Libre';
      case 'true-false-justification': return 'V/F con Justificación';
      case 'true-false-complex': return 'V/F (Enunciado Complejo)';
      case 'cloze': return 'Respuestas Anidadas (Cloze)';
      default:
        return String(type) || 'Desconocido';
    }
  };

  const handleOpenQuestionPreview = (questionData: QuestionFormValues) => {
    setQuestionToPreview(questionData);
    setIsQuestionPreviewOpen(true);
  };


  return (
    <Card className="shadow-lg">
      <form onSubmit={handleSubmit(onSubmitHandler)}>
        <CardHeader>
          <CardTitle className="text-2xl font-headline text-primary">
            {examId ? "Editar Examen" : "Crear Nuevo Examen"}
          </CardTitle>
          <CardDescription>
            Define los detalles y preguntas para tu examen. Puedes añadir preguntas manualmente, generarlas con IA o importarlas desde un archivo JSON.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {formActionState?.message && !formActionState?.errors && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{formActionState.message}</AlertDescription>
            </Alert>
          )}
          {formActionState?.errors && typeof formActionState.errors === 'string' && (
             <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error de Validación</AlertTitle>
              <AlertDescription>{formActionState.errors}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4 border p-4 rounded-md shadow-sm bg-muted/20">
            <h3 className="text-lg font-semibold text-foreground">Configuración General del Examen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                <Label htmlFor="title">Título del Examen</Label>
                <Input id="title" {...register("title")} placeholder="Ej: Parcial de Matemáticas I" />
                {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                {formActionState?.errors?.title && <p className="text-sm text-destructive">{(formActionState.errors.title as string[])[0]}</p>}
                </div>
                <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duración (minutos)</Label>
                <Input id="durationMinutes" type="number" {...register("durationMinutes")} placeholder="Ej: 60" />
                {errors.durationMinutes && <p className="text-sm text-destructive">{errors.durationMinutes.message}</p>}
                {formActionState?.errors?.durationMinutes && <p className="text-sm text-destructive">{(formActionState.errors.durationMinutes as string[])[0]}</p>}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">Descripción (opcional)</Label>
                <Textarea id="description" {...register("description")} placeholder="Instrucciones adicionales o tema del examen..." />
                {errors.description && <p className="text-sm text-destructive">{errors.description.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div className="space-y-2 md:col-span-1">
                    <div className="flex items-center space-x-2 pt-6">
                    <Controller
                        name="randomizeQuestions"
                        control={control}
                        render={({ field }) => (
                        <Checkbox
                            id="randomizeQuestions"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            aria-labelledby="randomizeQuestionsLabel"
                        />
                        )}
                    />
                    <Label htmlFor="randomizeQuestions" id="randomizeQuestionsLabel" className="font-normal">
                        Mostrar preguntas en orden aleatorio
                    </Label>
                    </div>
                    {errors.randomizeQuestions && <p className="text-sm text-destructive">{errors.randomizeQuestions.message}</p>}
                </div>
                <div className="space-y-2 md:col-span-1">
                <Label htmlFor="onTimeUpAction">Al finalizar el tiempo del examen</Label>
                <Controller
                    name="onTimeUpAction"
                    control={control}
                    render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || 'auto-submit'}>
                        <SelectTrigger id="onTimeUpAction" className="w-full">
                        <SelectValue placeholder="Seleccionar acción..." />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="auto-submit">Enviar automáticamente</SelectItem>
                        <SelectItem value="prevent-submit">Impedir envío</SelectItem>
                        <SelectItem value="allow-submission-grace-period">Dar tiempo de gracia</SelectItem>
                        </SelectContent>
                    </Select>
                    )}
                />
                {errors.onTimeUpAction && <p className="text-sm text-destructive">{errors.onTimeUpAction.message}</p>}
                </div>
                {watchedOnTimeUpAction === 'allow-submission-grace-period' && (
                    <div className="space-y-2 md:col-span-1">
                        <Label htmlFor="gracePeriodMinutes">Minutos de Gracia</Label>
                        <Input id="gracePeriodMinutes" type="number" {...register("gracePeriodMinutes")} placeholder="Ej: 5" min="1" />
                        {errors.gracePeriodMinutes && <p className="text-sm text-destructive">{errors.gracePeriodMinutes.message}</p>}
                    </div>
                )}
            </div>
            <div className="space-y-2 pt-4">
                <div className="flex items-center space-x-2">
                <Controller
                    name="autoSubmitOnFocusLoss"
                    control={control}
                    render={({ field }) => (
                    <Checkbox
                        id="autoSubmitOnFocusLoss"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-labelledby="autoSubmitOnFocusLossLabel"
                    />
                    )}
                />
                <Label htmlFor="autoSubmitOnFocusLoss" id="autoSubmitOnFocusLossLabel" className="font-normal flex items-center gap-1">
                    <ShieldAlert className="h-4 w-4 text-orange-500" /> Terminar y enviar automáticamente si el estudiante cambia de pestaña/ventana
                </Label>
                </div>
                {errors.autoSubmitOnFocusLoss && <p className="text-sm text-destructive">{errors.autoSubmitOnFocusLoss.message}</p>}
            </div>
             <div className="flex items-center space-x-2 pt-4">
                <Controller
                    name="show_grades_on_completion"
                    control={control}
                    render={({ field }) => (
                    <Checkbox
                        id="show_grades_on_completion"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        aria-labelledby="showGradesOnCompletionLabel"
                    />
                    )}
                />
                <Label htmlFor="show_grades_on_completion" id="showGradesOnCompletionLabel" className="font-normal flex items-center gap-1">
                    <Award className="h-4 w-4 text-blue-500" /> Mostrar calificación automáticamente al finalizar
                </Label>
                </div>
                {errors.show_grades_on_completion && <p className="text-sm text-destructive">{errors.show_grades_on_completion.message}</p>}
          </div>
          <Separator />
          <div className="space-y-4 border p-4 rounded-md shadow-sm bg-muted/20">
            <h3 className="text-lg font-semibold text-foreground">Tipo de Evaluación y Calificación</h3>
            <Controller
                name="evaluationType"
                control={control}
                render={({ field }) => (
                    <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col sm:flex-row gap-4"
                    >
                    <Label className="flex items-center gap-2 p-3 border rounded-md hover:bg-background cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary flex-1">
                        <RadioGroupItem value="quantitative" id="eval-quantitative" />
                        Cuantitativa (Puntaje Numérico)
                    </Label>
                    <Label className="flex items-center gap-2 p-3 border rounded-md hover:bg-background cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary flex-1">
                        <RadioGroupItem value="qualitative" id="eval-qualitative" />
                        Cualitativa (Valoraciones)
                    </Label>
                    </RadioGroup>
                )}
            />
            {errors.evaluationType && <p className="text-sm text-destructive mt-1">{errors.evaluationType.message as string}</p>}


            {watchedEvaluationType === 'quantitative' && (
                <div className="space-y-2 mt-4">
                    <Label htmlFor="approvalThreshold">Porcentaje para Aprobar (0-100)</Label>
                    <Input
                        id="approvalThreshold"
                        type="number"
                        {...register('approvalThreshold' as any)}
                        placeholder="Ej: 60"
                        min="0"
                        max="100"
                    />
                    {errors.approvalThreshold && <p className="text-sm text-destructive">{(errors.approvalThreshold as any).message}</p>}
                     {formActionState?.errors?.approvalThreshold && <p className="text-sm text-destructive">{(formActionState.errors.approvalThreshold as string[])[0]}</p>}
                </div>
            )}

            {watchedEvaluationType === 'qualitative' && (
                <div className="mt-4 space-y-3">
                    <Label className="text-md font-medium">Configurar Valoraciones Cualitativas</Label>
                    {qualitativeRatingFields.map((field, index) => (
                    <div key={field.id} className="p-3 border rounded-md bg-background/70 space-y-2">
                        <div className="flex justify-between items-center">
                            <p className="text-sm font-medium">Valoración #{index + 1}</p>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => removeQualitativeRating(index)}
                                title="Eliminar valoración"
                                className="text-destructive hover:text-destructive/80"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-[2fr_1fr_auto] gap-3 items-end">
                            <div className="space-y-1">
                                <Label htmlFor={`qualitativeRatings.${index}.label`}>Etiqueta</Label>
                                <Input
                                {...register(`qualitativeRatings.${index}.label` as any)}
                                placeholder="Ej: Sobresaliente, Aprobado"
                                />
                                {(errors.qualitativeRatings as any)?.[index]?.label && <p className="text-sm text-destructive">{(errors.qualitativeRatings as any)[index].label.message}</p>}
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor={`qualitativeRatings.${index}.minPercentage`}>% Mínimo</Label>
                                <Input
                                type="number"
                                {...register(`qualitativeRatings.${index}.minPercentage` as any)}
                                placeholder="Ej: 90"
                                min="0" max="100"
                                />
                                {(errors.qualitativeRatings as any)?.[index]?.minPercentage && <p className="text-sm text-destructive">{(errors.qualitativeRatings as any)[index].minPercentage.message}</p>}
                            </div>
                            <div className="flex items-center space-x-2 pb-1.5">
                                <Controller
                                name={`qualitativeRatings.${index}.isPassing` as any}
                                control={control}
                                render={({ field: checkboxField }) => (
                                    <Checkbox
                                    id={`qualitativeRatings.${index}.isPassing`}
                                    checked={checkboxField.value}
                                    onCheckedChange={checkboxField.onChange}
                                    />
                                )}
                                />
                                <Label htmlFor={`qualitativeRatings.${index}.isPassing`} className="font-normal">¿Aprueba?</Label>
                            </div>
                        </div>
                    </div>
                    ))}
                    <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendQualitativeRating({ id: `qr-new-${Date.now()}`, label: "", minPercentage: 0, isPassing: false })}
                    >
                    <PlusCircle className="mr-2 h-4 w-4" /> Añadir Valoración
                    </Button>
                    {(errors.qualitativeRatings && typeof errors.qualitativeRatings.message === 'string') && (
                        <p className="text-sm text-destructive mt-1">{errors.qualitativeRatings.message}</p>
                    )}
                </div>
            )}
            {errors.root && <p className="text-sm text-destructive mt-1">{errors.root.message}</p>} {}
            {formActionState?.errors?.evaluationType && <p className="text-sm text-destructive">{(formActionState.errors.evaluationType as string[])[0]}</p>}
            {formActionState?.errors?.qualitativeRatings && <p className="text-sm text-destructive">{(formActionState.errors.qualitativeRatings as string[])[0]}</p>}


          </div>
          <Separator />

          <div>
            <div className="flex flex-wrap gap-4 items-center mb-4 pb-2 border-b">
                <h3 className="text-xl font-semibold text-primary flex-grow">Preguntas</h3>

                <AlertDialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="outline" size="sm" disabled={isGeneratingAI}>
                      {isGeneratingAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                      Generar con IA
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="sm:max-w-lg">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Generar Preguntas con IA</AlertDialogTitle>
                      <AlertDialogDescription>
                        Configura los parámetros para la generación de preguntas.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
                      <div className="space-y-1">
                        <Label htmlFor="ai-num-questions">Número de Preguntas (1-20)</Label>
                        <Input
                          id="ai-num-questions"
                          type="number"
                          min="1"
                          max="20"
                          value={aiDialogOptions.numQuestions}
                          onChange={(e) => setAIDialogOptions(prev => ({ ...prev, numQuestions: parseInt(e.target.value, 10) || 1 }))}
                        />
                      </div>
                       <div className="space-y-1">
                        <Label htmlFor="ai-question-type">Tipo de Pregunta Específico (opcional)</Label>
                         <Select
                            value={aiDialogOptions.questionTypeToGenerate}
                            onValueChange={(value) => setAIDialogOptions(prev => ({ ...prev, questionTypeToGenerate: value as SelectableAIQuestionType }))}
                          >
                            <SelectTrigger id="ai-question-type">
                              <SelectValue placeholder="Seleccionar tipo..." />
                            </SelectTrigger>
                            <SelectContent>
                              {AllQuestionTypesForAutoGen.map(qType => (
                                <SelectItem key={qType} value={qType}>
                                  {getFriendlyQuestionTypeName(qType)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="ai-topic">Tema Específico (opcional)</Label>
                        <Input
                          id="ai-topic"
                          type="text"
                          placeholder="Ej: Filosofía de Platón"
                          value={aiDialogOptions.topic}
                          onChange={(e) => setAIDialogOptions(prev => ({ ...prev, topic: e.target.value }))}
                        />
                      </div>
                       <div className="space-y-1">
                        <Label htmlFor="ai-context-text">Texto de Contexto (opcional)</Label>
                        <Textarea
                          id="ai-context-text"
                          placeholder="Pega aquí el texto que la IA usará como base para las preguntas..."
                          value={aiDialogOptions.contextText}
                          onChange={(e) => setAIDialogOptions(prev => ({ ...prev, contextText: e.target.value }))}
                          rows={6}
                        />
                      </div>
                       <div className="space-y-1">
                        <Label htmlFor="ai-additional-instructions">Instrucciones Adicionales (opcional)</Label>
                        <Textarea
                          id="ai-additional-instructions"
                          placeholder="Ej: Enfócate en fechas importantes, compara los conceptos A y B, evita preguntas sobre X..."
                          value={aiDialogOptions.additionalInstructions}
                          onChange={(e) => setAIDialogOptions(prev => ({ ...prev, additionalInstructions: e.target.value }))}
                          rows={4}
                        />
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isGeneratingAI}>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleAIQuestionGeneration} disabled={isGeneratingAI}>
                        {isGeneratingAI ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Generar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <Button type="button" variant="outline" size="sm" onClick={() => jsonFileInputRef.current?.click()}>
                    <FileJson className="mr-2 h-4 w-4" /> Importar JSON
                </Button>
                <input type="file" accept=".json" ref={jsonFileInputRef} onChange={handleJsonFileImport} className="hidden" />
            </div>

            {fields.length === 0 && (
                <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                    <p>No hay preguntas añadidas todavía.</p>
                    <p className="text-sm">Usa los botones de arriba para añadir preguntas manualmente, generar con IA o importar desde JSON.</p>
                </div>
            )}

            {fields.map((field, index) => {
              const question = watch(`questions.${index}`);
              return (
                <div key={field.id} className="mb-6 border border-border/70 p-4 rounded-lg shadow-sm bg-card/50">
                   <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-3 tracking-wider">
                    Tipo de Pregunta: {getFriendlyQuestionTypeName(question.type as QuestionFormValues["type"])}
                  </h4>
                  {question.type === "multiple-choice" || question.type === "multiple-response" ? (
                    <MultipleChoiceQuestionEdit
                      questionIndex={index}
                      control={control}
                      register={register}
                      removeQuestion={remove}
                      errors={errors}
                      questionType={question.type}
                      setValue={setValue}
                      watch={watch}
                    />
                  ) : question.type === "weighted-choice" ? (
                    <WeightedChoiceQuestionEdit
                      questionIndex={index}
                      control={control}
                      register={register}
                      removeQuestion={remove}
                      errors={errors}
                      setValue={setValue}
                      watch={watch}
                    />
                  ) : question.type === "argument-reconstruction" ? (
                    <ArgumentReconstructionQuestionEdit
                      questionIndex={index}
                      control={control}
                      register={register}
                      removeQuestion={remove}
                      errors={errors}
                      setValue={setValue}
                      watch={watch}
                      getValues={getValues}
                    />
                  ) : question.type === "true-false-justification" ? (
                    <TrueFalseJustificationQuestionEdit
                        questionIndex={index}
                        control={control}
                        register={register}
                        removeQuestion={remove}
                        errors={errors}
                        setValue={setValue}
                        watch={watch}
                    />
                  ) : question.type === "true-false-complex" ? (
                    <TrueFalseComplexQuestionEdit
                        questionIndex={index}
                        control={control}
                        register={register}
                        removeQuestion={remove}
                        errors={errors}
                        setValue={setValue}
                        watch={watch}
                    />
                  ) : question.type === "cloze" ? (
                    <div className="p-4 border rounded-md bg-muted/30">
                      <div className="flex justify-between items-center">
                        <Label className="text-lg font-medium text-primary">Pregunta Cloze #{index + 1}</Label>
                        <div className="flex items-center gap-1">
                           <Button variant="ghost" size="icon" type="button" title="Previsualizar Pregunta" onClick={() => handleOpenQuestionPreview(question as QuestionFormValues)}>
                            <Eye className="h-5 w-5 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(index)} type="button" title="Eliminar Pregunta">
                              <Trash2 className="h-5 w-5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                        <p className="text-sm text-muted-foreground my-2">Texto: {(question as any).textWithPlaceholders || question.text}</p>
                        <p className="text-sm text-muted-foreground">Subpreguntas: {(question as any).subQuestions?.length || 0}</p>
                        <p className="text-xs mt-2">La edición detallada de preguntas Cloze no está disponible. Se guardará como fue generada/importada. Usa la previsualización para ver cómo se mostrará.</p>
                    </div>
                  ) : question.type === "free-text" ? (
                    <FreeTextQuestionEdit
                      questionIndex={index}
                      control={control}
                      register={register}
                      removeQuestion={remove}
                      errors={errors}
                      watch={watch}
                    />
                  ) : null}
                </div>
              );
            })}
            {errors.questions && typeof errors.questions.message === 'string' && (
              <p className="text-sm text-destructive mt-1">{errors.questions.message}</p>
            )}
             {errors.questions?.root && (
              <p className="text-sm text-destructive mt-1">{errors.questions.root.message}</p>
            )}
             {formActionState?.errors?.questions && <p className="text-sm text-destructive">{(formActionState.errors.questions as string[])[0]}</p>}


            <div className="flex flex-wrap gap-4 mt-6">
              <Button type="button" variant="outline" onClick={() => addQuestion("multiple-choice")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Opción Única
              </Button>
              <Button type="button" variant="outline" onClick={() => addQuestion("multiple-response")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Respuesta Múltiple
              </Button>
              <Button type="button" variant="outline" onClick={() => addQuestion("weighted-choice")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Opción Ponderada
              </Button>
              <Button type="button" variant="outline" onClick={() => addQuestion("argument-reconstruction")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Reconstrucción de Argumento
              </Button>
              <Button type="button" variant="outline" onClick={() => addQuestion("true-false-justification")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir V/F con Justificación
              </Button>
              <Button type="button" variant="outline" onClick={() => addQuestion("true-false-complex")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir V/F (Enunciado Complejo)
              </Button>
               <Button type="button" variant="outline" onClick={() => addQuestion("cloze")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Cloze (Básico)
              </Button>
              <Button type="button" variant="outline" onClick={() => addQuestion("free-text")}>
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Texto Libre
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isActuallySubmitting}>
            <Save className="mr-2 h-4 w-4" />
            {isActuallySubmitting ? (examId ? "Guardando Cambios..." : "Creando Examen...") : (examId ? "Guardar Cambios" : "Crear Examen")}
          </Button>
        </CardFooter>
      </form>

      <Dialog open={isQuestionPreviewOpen} onOpenChange={setIsQuestionPreviewOpen}>
        <UIDialogContent className="max-w-3xl">
          <UIDialogHeader>
            <UIDialogTitle>Vista Previa de la Pregunta</UIDialogTitle>
            <UIDialogDescription>
              Así es como el estudiante verá esta pregunta. Los elementos interactivos están deshabilitados.
            </UIDialogDescription>
          </UIDialogHeader>
          {questionToPreview && <QuestionPreviewRenderer question={questionToPreview} />}
          <DialogClose asChild>
            <Button type="button" variant="outline" className="mt-4">Cerrar</Button>
          </DialogClose>
        </UIDialogContent>
      </Dialog>

    </Card>
  );
}
