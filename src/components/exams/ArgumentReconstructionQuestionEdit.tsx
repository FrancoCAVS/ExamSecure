
"use client";

import React, { useState } from "react"; // Added useState
import type { Control, UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch, UseFormGetValues } from "react-hook-form";
import { useFieldArray } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "../ui/textarea";
import { PlusCircle, Trash2, ArrowUp, ArrowDown, Eye } from "lucide-react"; // Added Eye
import type { ExamFormValues, QuestionFormValues } from "./ExamBuilderForm";
import type { ArgumentItem } from "@/lib/types";
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

interface ArgumentReconstructionQuestionEditProps {
  questionIndex: number;
  control: Control<ExamFormValues>;
  register: UseFormRegister<ExamFormValues>;
  removeQuestion: (index: number) => void;
  errors: FieldErrors<ExamFormValues>;
  setValue: UseFormSetValue<ExamFormValues>;
  watch: UseFormWatch<ExamFormValues>;
  getValues: UseFormGetValues<ExamFormValues>;
}

export function ArgumentReconstructionQuestionEdit({
  questionIndex,
  control,
  register,
  removeQuestion,
  errors,
  setValue,
  watch,
  getValues,
}: ArgumentReconstructionQuestionEditProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const itemNamePrefix = `questions.${questionIndex}.items` as const;
  const { fields: itemFields, append: appendItem, remove: removeItem, move: moveItem } = useFieldArray({
    control,
    name: itemNamePrefix,
  });

  const currentItems = watch(itemNamePrefix);

  React.useEffect(() => {
    if (currentItems) {
      const newCorrectOrder = currentItems.map(item => item.id || '');
      setValue(`questions.${questionIndex}.correctOrder`, newCorrectOrder.filter(id => id), { shouldValidate: true, shouldDirty: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentItems, questionIndex, setValue]);


  const questionFieldErrors = errors?.questions?.[questionIndex] as FieldErrors<QuestionFormValues> | undefined;
  const itemRelatedErrors = questionFieldErrors?.items as any;
  const correctOrderError = questionFieldErrors?.correctOrder as any;
  const watchedQuestion = watch(`questions.${questionIndex}`);


  const handleAddItem = () => {
    appendItem({ id: `argitem-new-${Date.now()}`, text: "" });
  };

  return (
    <div className="p-4 border rounded-md space-y-4 bg-card shadow">
      <div className="flex justify-between items-center">
        <Label className="text-lg font-medium text-primary">Pregunta de Reconstrucción de Argumento #{questionIndex + 1}</Label>
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
        <Label htmlFor={`questions.${questionIndex}.text`}>Título/Contexto del Argumento</Label>
        <Textarea
          id={`questions.${questionIndex}.text`}
          {...register(`questions.${questionIndex}.text`)}
          placeholder="Ej: Reconstruye el argumento sobre la ética kantiana. Se esperan 2 premisas y 1 conclusión principal."
          className="min-h-[80px]"
        />
        {questionFieldErrors?.text && (
          <p className="text-sm text-destructive mt-1">{questionFieldErrors.text.message as string}</p>
        )}
      </div>

      <div>
        <Label>Ítems del Argumento</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Añade los ítems. Debes incluir 2 Premisas y 1 Conclusión. Puedes añadir más ítems como Distractores.
          Ordénalos correctamente: primero las 2 Premisas, luego la Conclusión, y al final cualquier Ítem Distractor.
        </p>
        {itemFields.map((item, itemIndex) => (
          <div key={item.id} className="flex items-center gap-2 mt-2 p-3 border rounded-md bg-background">
            <span className="text-sm font-semibold text-muted-foreground">{(itemIndex + 1)}.</span>
            <Input
              {...register(`${itemNamePrefix}.${itemIndex}.text`)}
              placeholder={`Ítem ${itemIndex + 1} (Premisa, Conclusión o Distractor)`}
              className="flex-grow"
            />
            <input type="hidden" {...register(`${itemNamePrefix}.${itemIndex}.id`)} defaultValue={item.id} />
            <Button variant="ghost" size="icon" onClick={() => moveItem(itemIndex, itemIndex - 1)} disabled={itemIndex === 0} type="button" aria-label="Mover arriba">
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => moveItem(itemIndex, itemIndex + 1)} disabled={itemIndex === itemFields.length - 1} type="button" aria-label="Mover abajo">
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => removeItem(itemIndex)} type="button" aria-label="Eliminar ítem">
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          </div>
        ))}
        {itemRelatedErrors && typeof itemRelatedErrors.message === 'string' && (
          <p className="text-sm text-destructive mt-1">{itemRelatedErrors.message}</p>
        )}
        {Array.isArray(itemRelatedErrors) && itemFields.map((_, itemIdx) => (
            itemRelatedErrors[itemIdx]?.text && (
                 <p key={`err-item-${itemIdx}`} className="text-sm text-destructive w-full basis-full mt-1">
                    Error en ítem {itemIdx + 1}: {itemRelatedErrors[itemIdx]?.text?.message as string}
                </p>
            )
        ))}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          className="mt-2"
        >
          <PlusCircle className="mr-2 h-4 w-4" /> Añadir Ítem
        </Button>
      </div>
       {correctOrderError && (
          <p className="text-sm text-destructive mt-1">{correctOrderError.message as string}</p>
        )}

      <div>
        <Label htmlFor={`questions.${questionIndex}.points`}>Puntos</Label>
        <Input
          id={`questions.${questionIndex}.points`}
          type="number"
          min="0"
          {...register(`questions.${questionIndex}.points`)}
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
          {...register(`questions.${questionIndex}.feedback`)}
          placeholder="Notas o explicaciones para esta pregunta..."
          className="min-h-[60px]"
        />
        {questionFieldErrors?.feedback && (
          <p className="text-sm text-destructive mt-1">{questionFieldErrors.feedback.message as string}</p>
        )}
      </div>
    </div>
  );
}
