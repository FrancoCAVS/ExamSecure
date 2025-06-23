
"use client";

import React, { useState } from "react"; // Added useState
import type { Control, UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { useFieldArray, Controller } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PlusCircle, Trash2, Eye } from "lucide-react"; // Added Eye
import { Textarea } from "../ui/textarea";
import type { ExamFormValues, QuestionFormValues } from "./ExamBuilderForm";
import type { MultipleChoiceOption } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, 
} from "@/components/ui/dialog"; // Added Dialog components
import { QuestionPreviewRenderer } from "./QuestionPreviewRenderer"; // Added QuestionPreviewRenderer

interface MultipleChoiceQuestionEditProps {
  questionIndex: number;
  control: Control<ExamFormValues>;
  register: UseFormRegister<ExamFormValues>;
  removeQuestion: (index: number) => void;
  errors: FieldErrors<ExamFormValues>;
  questionType: 'multiple-choice' | 'multiple-response';
  setValue: UseFormSetValue<ExamFormValues>;
  watch: UseFormWatch<ExamFormValues>;
}

export function MultipleChoiceQuestionEdit({
  questionIndex,
  control,
  register,
  removeQuestion,
  errors,
  questionType,
  setValue,
  watch
}: MultipleChoiceQuestionEditProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false); // State for dialog

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control,
    name: `questions.${questionIndex}.options` as `questions.${number}.options`,
  });

  const questionFieldErrors = errors?.questions?.[questionIndex] as FieldErrors<QuestionFormValues> | undefined;
  const optionFieldErrors = questionFieldErrors?.options as any;
  
  const questionLabel = questionType === 'multiple-choice' ? "Pregunta de Opción Única" : "Pregunta de Respuesta Múltiple";
  const watchedQuestion = watch(`questions.${questionIndex}`);

  return (
    <div className="p-4 border rounded-md space-y-4 bg-card shadow">
      <div className="flex justify-between items-center">
        <Label className="text-lg font-medium text-primary">{questionLabel} #{questionIndex + 1}</Label>
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

      <div>
        <Label>Opciones (marca la/s correcta/s)</Label>
        {questionType === 'multiple-choice' ? (
          <Controller
            control={control}
            name={`questions.${questionIndex}.options`}
            render={({ field }) => ( 
              <RadioGroup
                onValueChange={(selectedOptionFieldId) => {
                    optionFields.forEach((optField, optIdx) => {
                        setValue(`questions.${questionIndex}.options.${optIdx}.isCorrect`, optField.id === selectedOptionFieldId, { shouldValidate: true, shouldDirty: true });
                    });
                }}
                value={optionFields.find(optField => {
                    const currentOptionValue = watch(`questions.${questionIndex}.options.${optionFields.indexOf(optField)}.isCorrect`);
                    return currentOptionValue;
                })?.id || ""}
                className="space-y-2"
              >
                {optionFields.map((option, optionIndex) => (
                  <div key={option.id} className="flex items-center gap-2 p-3 border rounded-md bg-background">
                    <RadioGroupItem
                      value={option.id} 
                      id={`questions.${questionIndex}.options.${optionIndex}.isCorrectRadio`}
                    />
                    <Input
                      {...register(`questions.${questionIndex}.options.${optionIndex}.text` as `questions.${number}.options.${number}.text`)}
                      placeholder={`Opción ${optionIndex + 1}`}
                      className="flex-grow"
                    />
                     <input type="hidden" {...register(`questions.${questionIndex}.options.${optionIndex}.id`)} defaultValue={option.id}/>
                    <Button variant="ghost" size="icon" onClick={() => removeOption(optionIndex)} type="button">
                      <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
            )}
          />
        ) : ( 
          optionFields.map((option, optionIndex) => (
            <div key={option.id} className="flex items-center gap-2 mt-2 p-3 border rounded-md bg-background">
               <Controller
                name={`questions.${questionIndex}.options.${optionIndex}.isCorrect` as `questions.${number}.options.${number}.isCorrect`}
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id={`questions.${questionIndex}.options.${optionIndex}.isCorrect`}
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Input
                {...register(`questions.${questionIndex}.options.${optionIndex}.text` as `questions.${number}.options.${number}.text`)}
                placeholder={`Opción ${optionIndex + 1}`}
                className="flex-grow"
              />
               <input type="hidden" {...register(`questions.${questionIndex}.options.${optionIndex}.id`)} defaultValue={option.id}/>
              <Button variant="ghost" size="icon" onClick={() => removeOption(optionIndex)} type="button">
                <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
              </Button>
            </div>
          ))
        )}
        {Array.isArray(optionFieldErrors) && optionFields.map((_, optionIndex) => (
          optionFieldErrors[optionIndex]?.text && (
            <p key={`err-${optionIndex}`} className="text-sm text-destructive w-full basis-full mt-1">
              {(optionFieldErrors[optionIndex]?.text?.message) as string}
            </p>
          )
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
          onClick={() => appendOption({ id: `opt-new-${Date.now()}`, text: "", isCorrect: false })}
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
                id={`questions.${questionIndex}.randomizeOptions`}
                checked={!!field.value} // Ensure value is boolean
                onCheckedChange={field.onChange}
                aria-labelledby={`randomizeOptionsLabel-${questionIndex}`}
                />
            )}
        />
        <Label htmlFor={`questions.${questionIndex}.randomizeOptions`} id={`randomizeOptionsLabel-${questionIndex}`} className="font-normal">
            Mostrar opciones en orden aleatorio
        </Label>
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

    