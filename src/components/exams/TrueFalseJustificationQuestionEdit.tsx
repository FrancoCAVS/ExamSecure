
"use client";

import React, { useState } from "react"; // Added useState
import { Controller, useFieldArray, type UseFormRegister, type FieldErrors, type UseFormSetValue, type Control, type UseFormWatch } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, PlusCircle, Eye } from "lucide-react"; // Added Eye
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/dialog";
import { QuestionPreviewRenderer } from "./QuestionPreviewRenderer";

interface TrueFalseJustificationQuestionEditProps {
  questionIndex: number;
  control: Control<ExamFormValues>;
  register: UseFormRegister<ExamFormValues>;
  removeQuestion: (index: number) => void;
  errors: FieldErrors<ExamFormValues>;
  setValue: UseFormSetValue<ExamFormValues>;
  watch: UseFormWatch<ExamFormValues>;
}

export function TrueFalseJustificationQuestionEdit({
  questionIndex,
  control,
  register,
  removeQuestion,
  errors,
  setValue,
  watch,
}: TrueFalseJustificationQuestionEditProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const questionErrors = errors?.questions?.[questionIndex] as FieldErrors<QuestionFormValues> | undefined;
  
  const affirmationPath = `questions.${questionIndex}.affirmation` as const;
  const isAffirmationTruePath = `questions.${questionIndex}.isAffirmationTrue` as const;
  const pointsForAffirmationPath = `questions.${questionIndex}.pointsForAffirmation` as const;
  const pointsForJustificationPath = `questions.${questionIndex}.pointsForJustification` as const;
  const totalPointsPath = `questions.${questionIndex}.points` as const;

  const justificationOptionsPath = `questions.${questionIndex}.justificationOptions` as const;
  const { fields: justificationOptionFields, append: appendJustificationOption, remove: removeJustificationOption } = useFieldArray({
    control,
    name: justificationOptionsPath,
  });

  const justificationOptionErrors = questionErrors?.justificationOptions as any;
  const watchedQuestion = watch(`questions.${questionIndex}`);

  React.useEffect(() => {
    const pAffirmation = watch(pointsForAffirmationPath) || 0;
    const pJustification = watch(pointsForJustificationPath) || 0;
    setValue(totalPointsPath, pAffirmation + pJustification, { shouldValidate: true, shouldDirty: true });
  }, [watch(pointsForAffirmationPath), watch(pointsForJustificationPath), setValue, pointsForAffirmationPath, pointsForJustificationPath, totalPointsPath]);


  return (
    <div className="p-4 border rounded-md space-y-4 bg-card shadow">
      <div className="flex justify-between items-center">
        <Label className="text-lg font-medium text-primary">Pregunta V/F con Justificación #{questionIndex + 1}</Label>
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
        <Label htmlFor={affirmationPath}>Afirmación Principal</Label>
        <Textarea
          id={affirmationPath}
          {...register(affirmationPath)}
          placeholder="Escribe la afirmación que el estudiante evaluará como V o F..."
          className="min-h-[80px]"
        />
        {questionErrors?.affirmation && (
          <p className="text-sm text-destructive mt-1">{questionErrors.affirmation.message as string}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>La afirmación anterior es:</Label>
        <Controller
          name={isAffirmationTruePath}
          control={control}
          defaultValue={false}
          render={({ field }) => (
            <RadioGroup
              value={field.value === true ? "true" : field.value === false ? "false" : ""}
              onValueChange={(value) => field.onChange(value === "true")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id={`q-${questionIndex}-affirmation-true`} />
                <Label htmlFor={`q-${questionIndex}-affirmation-true`} className="font-normal">Verdadero</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id={`q-${questionIndex}-affirmation-false`} />
                <Label htmlFor={`q-${questionIndex}-affirmation-false`} className="font-normal">Falso</Label>
              </div>
            </RadioGroup>
          )}
        />
        {questionErrors?.isAffirmationTrue && (
          <p className="text-sm text-destructive mt-1">{questionErrors.isAffirmationTrue.message as string}</p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
            <Label htmlFor={pointsForAffirmationPath}>Puntos por Afirmación (V/F)</Label>
            <Input
            id={pointsForAffirmationPath}
            type="number"
            min="0"
            {...register(pointsForAffirmationPath)}
            placeholder="Ej: 5"
            />
            {questionErrors?.pointsForAffirmation && (
            <p className="text-sm text-destructive mt-1">{questionErrors.pointsForAffirmation.message as string}</p>
            )}
        </div>
        <div>
            <Label htmlFor={pointsForJustificationPath}>Puntos por Justificación</Label>
            <Input
            id={pointsForJustificationPath}
            type="number"
            min="0"
            {...register(pointsForJustificationPath)}
            placeholder="Ej: 5"
            />
            {questionErrors?.pointsForJustification && (
            <p className="text-sm text-destructive mt-1">{questionErrors.pointsForJustification.message as string}</p>
            )}
        </div>
         <div>
            <Label htmlFor={totalPointsPath}>Puntos Totales (auto)</Label>
            <Input
            id={totalPointsPath}
            type="number"
            readOnly 
            {...register(totalPointsPath)}
            className="bg-muted/50"
            />
            {questionErrors?.points && ( 
            <p className="text-sm text-destructive mt-1">{questionErrors.points.message as string}</p>
            )}
        </div>
      </div>


      <div>
        <Label>Opciones de Justificación (marca la correcta)</Label>
        <Controller
            control={control}
            name={justificationOptionsPath}
            render={() => ( 
            <RadioGroup
                onValueChange={(selectedOptionFieldId) => {
                    justificationOptionFields.forEach((optField, optIdx) => {
                        setValue(`${justificationOptionsPath}.${optIdx}.isCorrect`, optField.id === selectedOptionFieldId, { shouldValidate: true, shouldDirty: true });
                    });
                }}
                value={justificationOptionFields.find(optField => {
                    const optPath = `${justificationOptionsPath}.${justificationOptionFields.indexOf(optField)}.isCorrect` as const;
                    return watch(optPath);
                })?.id || ""}
                className="space-y-2"
            >
                {justificationOptionFields.map((option, optionIndex) => (
                <div key={option.id} className="flex items-center gap-2 p-3 border rounded-md bg-background">
                    <RadioGroupItem
                    value={option.id} 
                    id={`${justificationOptionsPath}.${optionIndex}.isCorrectRadio`}
                    />
                    <Input
                    {...register(`${justificationOptionsPath}.${optionIndex}.text`)}
                    placeholder={`Justificación ${optionIndex + 1}`}
                    className="flex-grow"
                    />
                    <input type="hidden" {...register(`${justificationOptionsPath}.${optionIndex}.id`)} defaultValue={option.id}/>
                    <Button variant="ghost" size="icon" onClick={() => removeJustificationOption(optionIndex)} type="button" aria-label="Eliminar justificación">
                    <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                    </Button>
                </div>
                ))}
            </RadioGroup>
            )}
        />
        {Array.isArray(justificationOptionErrors) && justificationOptionFields.map((_, optionIndex) => (
          justificationOptionErrors[optionIndex]?.text && (
            <p key={`err-just-opt-${optionIndex}`} className="text-sm text-destructive w-full basis-full mt-1">
              Error en Justificación {optionIndex + 1}: {justificationOptionErrors[optionIndex]?.text?.message as string}
            </p>
          )
        ))}
        {justificationOptionErrors && typeof justificationOptionErrors.message === 'string' && (
            <p className="text-sm text-destructive mt-1">{justificationOptionErrors.message}</p>
        )}
        {justificationOptionErrors?.root?.message && (
             <p className="text-sm text-destructive mt-1">{justificationOptionErrors.root.message}</p>
        )}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => appendJustificationOption({ id: `just-opt-new-${Date.now()}`, text: "", isCorrect: false })}
          className="mt-2"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Opción de Justificación
        </Button>
      </div>

      <div className="flex items-center space-x-2 mt-3">
        <Controller
            name={`questions.${questionIndex}.randomizeJustificationOptions`}
            control={control}
            defaultValue={false}
            render={({ field }) => (
                <Checkbox
                id={`questions.${questionIndex}.randomizeJustificationOptions`}
                checked={!!field.value}
                onCheckedChange={field.onChange}
                aria-labelledby={`randomizeJustificationOptionsLabel-${questionIndex}`}
                />
            )}
        />
        <Label htmlFor={`questions.${questionIndex}.randomizeJustificationOptions`} id={`randomizeJustificationOptionsLabel-${questionIndex}`} className="font-normal">
            Mostrar opciones de justificación en orden aleatorio
        </Label>
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

    