
"use client";

import React, { useState } from "react"; // Added useState
import { Controller, type UseFormRegister, type FieldErrors, type UseFormSetValue, type Control, type UseFormWatch } from "react-hook-form"; // Added UseFormWatch
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, Eye } from "lucide-react"; // Added Eye
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { ExamFormValues, QuestionFormValues } from "./ExamBuilderForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { QuestionPreviewRenderer } from "./QuestionPreviewRenderer";

interface TrueFalseComplexQuestionEditProps {
  questionIndex: number;
  control: Control<ExamFormValues>; 
  register: UseFormRegister<ExamFormValues>;
  removeQuestion: (index: number) => void;
  errors: FieldErrors<ExamFormValues>;
  setValue: UseFormSetValue<ExamFormValues>;
  watch: UseFormWatch<ExamFormValues>; // Added watch
}

export function TrueFalseComplexQuestionEdit({
  questionIndex,
  control,
  register,
  removeQuestion,
  errors,
  watch, 
}: TrueFalseComplexQuestionEditProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const questionErrors = errors?.questions?.[questionIndex] as FieldErrors<QuestionFormValues> | undefined;
  const isStatementTruePath = `questions.${questionIndex}.isStatementTrue` as const;
  const watchedQuestion = watch(`questions.${questionIndex}`);

  return (
    <div className="p-4 border rounded-md space-y-4 bg-card shadow">
      <div className="flex justify-between items-center">
        <Label className="text-lg font-medium text-primary">Pregunta Verdadero/Falso (Enunciado Complejo) #{questionIndex + 1}</Label>
        <div className="flex items-center gap-1">
          <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" type="button" title="Previsualizar Pregunta">
                <Eye className="h-5 w-5 text-blue-500" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Vista Previa de la Pregunta</DialogTitle>
                <DialogDescription>
                  Así es como el estudiante verá esta pregunta. Los elementos interactivos están deshabilitados.
                </DialogDescription>
              </DialogHeader>
              {watchedQuestion && <QuestionPreviewRenderer question={watchedQuestion as QuestionFormValues} />}
              <DialogClose asChild>
                <Button type="button" variant="outline" className="mt-4">Cerrar</Button>
              </DialogClose>
            </DialogContent>
          </Dialog>
          <Button variant="ghost" size="icon" onClick={() => removeQuestion(questionIndex)} type="button" title="Eliminar Pregunta">
            <Trash2 className="h-5 w-5 text-destructive" />
          </Button>
        </div>
      </div>

      <div>
        <Label htmlFor={`questions.${questionIndex}.statement`}>Enunciado Complejo</Label>
        <Textarea
          id={`questions.${questionIndex}.statement`}
          {...register(`questions.${questionIndex}.statement` as `questions.${number}.statement`)}
          placeholder="Escribe el enunciado completo aquí (incluyendo contexto si es necesario y la afirmación a evaluar)..."
          className="min-h-[100px]"
        />
        {questionErrors?.statement && (
          <p className="text-sm text-destructive mt-1">{questionErrors.statement.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>El enunciado anterior es:</Label>
        <Controller
          name={isStatementTruePath}
          control={control}
          render={({ field }) => (
            <RadioGroup
              value={field.value === true ? "true" : field.value === false ? "false" : ""}
              onValueChange={(value) => field.onChange(value === "true")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id={`q-${questionIndex}-tfc-true`} />
                <Label htmlFor={`q-${questionIndex}-tfc-true`} className="font-normal">Verdadero</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id={`q-${questionIndex}-tfc-false`} />
                <Label htmlFor={`q-${questionIndex}-tfc-false`} className="font-normal">Falso</Label>
              </div>
            </RadioGroup>
          )}
        />
        {questionErrors?.isStatementTrue && (
          <p className="text-sm text-destructive mt-1">{questionErrors.isStatementTrue.message as string}</p>
        )}
      </div>

      <div>
        <Label htmlFor={`questions.${questionIndex}.points`}>Puntos</Label>
        <Input
          id={`questions.${questionIndex}.points`}
          type="number"
          min="0"
          {...register(`questions.${questionIndex}.points` as `questions.${number}.points`)}
          placeholder="Ej: 10"
        />
        {questionErrors?.points && (
          <p className="text-sm text-destructive mt-1">{questionErrors.points.message as string}</p>
        )}
      </div>

      <div>
        <Label htmlFor={`questions.${questionIndex}.feedback`}>Retroalimentación (opcional)</Label>
        <Textarea
          id={`questions.${questionIndex}.feedback`}
          {...register(`questions.${questionIndex}.feedback` as `questions.${number}.feedback`)}
          placeholder="Notas o explicaciones para esta pregunta..."
          className="min-h-[60px]"
        />
        {questionErrors?.feedback && (
          <p className="text-sm text-destructive mt-1">{questionErrors.feedback.message as string}</p>
        )}
      </div>
    </div>
  );
}

    