
"use client";

import React, { useState } from "react"; // Added useState
import type { Control, UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from "react-hook-form"; // Added UseFormWatch
import { useFieldArray, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, Trash2, Eye } from "lucide-react"; // Added Eye
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

interface WeightedChoiceQuestionEditProps {
  questionIndex: number;
  control: Control<ExamFormValues>;
  register: UseFormRegister<ExamFormValues>;
  removeQuestion: (index: number) => void;
  errors: FieldErrors<ExamFormValues>;
  setValue: UseFormSetValue<ExamFormValues>;
  watch: UseFormWatch<ExamFormValues>; // Added watch
}

export function WeightedChoiceQuestionEdit({
  questionIndex,
  control,
  register,
  removeQuestion,
  errors,
  setValue, 
  watch, 
}: WeightedChoiceQuestionEditProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options` as `questions.${number}.options`,
  });

  const questionFieldErrors = errors?.questions?.[questionIndex] as FieldErrors<QuestionFormValues> | undefined;
  const optionFieldErrors = questionFieldErrors?.options as any; 
  const watchedQuestion = watch(`questions.${questionIndex}`);

  return (
    <div className="p-4 border rounded-md space-y-4 bg-card shadow">
      <div className="flex justify-between items-center">
        <Label className="text-lg font-medium text-primary">Pregunta de Opción Ponderada #{questionIndex + 1}</Label>
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
          {...register(`questions.${questionIndex}.text` as `questions.${number}.text`)}
          placeholder="Escribe el enunciado de la pregunta aquí..."
          className="min-h-[80px]"
        />
        {questionFieldErrors?.text && (
          <p className="text-sm text-destructive mt-1">{questionFieldErrors.text.message as string}</p>
        )}
      </div>
      
      <div className="flex items-center space-x-2 mt-3">
        <Controller
            name={`questions.${questionIndex}.allowMultipleSelections`}
            control={control}
            render={({ field }) => (
                <Checkbox
                id={`questions.${questionIndex}.allowMultipleSelectionsWeighted`}
                checked={!!field.value}
                onCheckedChange={field.onChange}
                aria-labelledby={`allowMultipleSelectionsWeightedLabel-${questionIndex}`}
                />
            )}
        />
        <Label htmlFor={`questions.${questionIndex}.allowMultipleSelectionsWeighted`} id={`allowMultipleSelectionsWeightedLabel-${questionIndex}`} className="font-normal">
            Permitir múltiples selecciones
        </Label>
         {questionFieldErrors?.allowMultipleSelections && (
          <p className="text-sm text-destructive mt-1">{questionFieldErrors.allowMultipleSelections.message as string}</p>
        )}
      </div>


      <div>
        <Label>Opciones y Porcentajes (-100 a 100)</Label>
        {optionFields.map((option, optionIndex) => (
          <div key={option.id} className="flex items-start gap-2 mt-2 p-3 border rounded-md bg-background">
            <div className="flex-grow space-y-1">
                <Label htmlFor={`questions.${questionIndex}.options.${optionIndex}.text`} className="text-xs">Texto Opción</Label>
                <Input
                {...register(`questions.${questionIndex}.options.${optionIndex}.text` as `questions.${number}.options.${number}.text`)}
                placeholder={`Opción ${optionIndex + 1}`}
                />
                {Array.isArray(optionFieldErrors) && optionFieldErrors[optionIndex]?.text && (
                    <p className="text-sm text-destructive">{(optionFieldErrors[optionIndex]?.text?.message) as string}</p>
                )}
            </div>
            <div className="w-28 space-y-1">
                <Label htmlFor={`questions.${questionIndex}.options.${optionIndex}.percentage`} className="text-xs">Porcentaje (%)</Label>
                <Input
                    type="number"
                    min="-100"
                    max="100"
                    step="any" 
                    {...register(`questions.${questionIndex}.options.${optionIndex}.percentage` as `questions.${number}.options.${number}.percentage`)}
                    placeholder="Ej: 50"
                />
                 {Array.isArray(optionFieldErrors) && optionFieldErrors[optionIndex]?.percentage && (
                    <p className="text-sm text-destructive">{(optionFieldErrors[optionIndex]?.percentage?.message) as string}</p>
                )}
            </div>
             <input type="hidden" {...register(`questions.${questionIndex}.options.${optionIndex}.id`)} defaultValue={option.id}/>
            <Button variant="ghost" size="icon" onClick={() => removeOption(optionIndex)} type="button" className="mt-5">
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        ))}
         {optionFieldErrors && !Array.isArray(optionFieldErrors) && typeof (optionFieldErrors as any).message === 'string' && (
          <p className="text-sm text-destructive mt-1">{(optionFieldErrors as any).message}</p>
        )}
        {(optionFieldErrors as any)?.root?.message && ( 
             <p className="text-sm text-destructive mt-1">{(optionFieldErrors as any).root.message}</p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => appendOption({ id: `opt-wc-new-${Date.now()}`, text: "", percentage: 0 })}
          className="mt-2"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Opción
        </Button>
      </div>

      <div className="flex items-center space-x-2 mt-3">
        <Controller
            name={`questions.${questionIndex}.randomizeOptions`}
            control={control}
            render={({ field }) => (
                <Checkbox
                id={`questions.${questionIndex}.randomizeOptionsWeighted`}
                checked={!!field.value}
                onCheckedChange={field.onChange}
                aria-labelledby={`randomizeOptionsWeightedLabel-${questionIndex}`}
                />
            )}
        />
        <Label htmlFor={`questions.${questionIndex}.randomizeOptionsWeighted`} id={`randomizeOptionsWeightedLabel-${questionIndex}`} className="font-normal">
            Mostrar opciones en orden aleatorio
        </Label>
      </div>

      <div>
        <Label htmlFor={`questions.${questionIndex}.points`}>Puntos Totales para esta Pregunta</Label>
        <Input
          id={`questions.${questionIndex}.points`}
          type="number"
          min="0"
          {...register(`questions.${questionIndex}.points` as `questions.${number}.points`)}
          placeholder="Ej: 10"
        />
        {questionFieldErrors?.points && (
          <p className="text-sm text-destructive mt-1">{questionFieldErrors.points.message as string}</p>
        )}
      </div>

      <div>
        <Label htmlFor={`questions.${questionIndex}.feedback`}>Retroalimentación (opcional)</Label>
        <Textarea
          id={`questions.${questionIndex}.feedback`}
          {...register(`questions.${questionIndex}.feedback` as `questions.${number}.feedback`)}
          placeholder="Notas o explicaciones para esta pregunta (visible para el docente)..."
          className="min-h-[60px]"
        />
        {questionFieldErrors?.feedback && (
          <p className="text-sm text-destructive mt-1">{questionFieldErrors.feedback.message as string}</p>
        )}
      </div>
    </div>
  );
}

    