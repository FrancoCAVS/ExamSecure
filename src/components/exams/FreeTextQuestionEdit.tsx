
"use client";

import React, { useState } from "react";
import type { UseFormRegister, FieldErrors, Control, UseFormWatch } from "react-hook-form"; // Added Control, UseFormWatch
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, Eye } from "lucide-react"; // Added Eye
import { Textarea } from "../ui/textarea";
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

interface FreeTextQuestionEditProps {
  questionIndex: number;
  control: Control<ExamFormValues>; // Added control
  register: UseFormRegister<ExamFormValues>; 
  removeQuestion: (index: number) => void;
  errors: FieldErrors<ExamFormValues>; 
  watch: UseFormWatch<ExamFormValues>; // Added watch
}

export function FreeTextQuestionEdit({
  questionIndex,
  control,
  register,
  removeQuestion,
  errors,
  watch,
}: FreeTextQuestionEditProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const questionErrors = errors?.questions?.[questionIndex] as FieldErrors<ExamFormValues['questions'][number]> | undefined;
  const watchedQuestion = watch(`questions.${questionIndex}`);

  return (
    <div className="p-4 border rounded-md space-y-4 bg-card shadow">
      <div className="flex justify-between items-center">
        <Label className="text-lg font-medium text-primary">Pregunta de Texto Libre #{questionIndex + 1}</Label>
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
        <Label htmlFor={`questions.${questionIndex}.text`}>Texto de la Pregunta</Label>
        <Textarea
          id={`questions.${questionIndex}.text`}
          {...register(`questions.${questionIndex}.text`)}
          placeholder="Escribe el enunciado de la pregunta aquí..."
          className="min-h-[100px]"
        />
         {questionErrors?.text && (
          <p className="text-sm text-destructive mt-1">{questionErrors.text.message as string}</p>
        )}
      </div>
      
      <div>
        <Label htmlFor={`questions.${questionIndex}.points`}>Puntos</Label>
        <Input
          id={`questions.${questionIndex}.points`}
          type="number"
          min="0"
          {...register(`questions.${questionIndex}.points`)}
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
          {...register(`questions.${questionIndex}.feedback`)}
          placeholder="Notas o explicaciones para esta pregunta (visible para el docente)..."
          className="min-h-[60px]"
        />
        {questionErrors?.feedback && (
          <p className="text-sm text-destructive mt-1">{questionErrors.feedback.message as string}</p>
        )}
      </div>
    </div>
  );
}

    