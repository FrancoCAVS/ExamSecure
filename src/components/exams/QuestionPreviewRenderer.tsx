
"use client";

import React, { useState, useEffect } from 'react';
import type { QuestionFormValues, MultipleChoiceOptionFormSchema, WeightedChoiceOptionFormSchema, ArgumentItemFormSchema, ClozeSubQuestionFormSchema } from "./ExamBuilderForm";
import type { MultipleChoiceQuestion, MultipleResponseQuestion, WeightedChoiceQuestion, ArgumentReconstructionQuestion, TrueFalseJustificationQuestion, TrueFalseComplexQuestion, ClozeQuestion } from "@/lib/types"; // Removed MatchingQuestion
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; 
import { Checkbox } from "@/components/ui/checkbox"; 
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // No longer needed for matching

interface QuestionPreviewRendererProps {
  question: QuestionFormValues;
}

function shuffleArray<T>(array: T[]): T[] {
  if (!array) return [];
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export function QuestionPreviewRenderer({ question }: QuestionPreviewRendererProps) {
  const [shuffledMcOptions, setShuffledMcOptions] = useState<Array<z.infer<typeof MultipleChoiceOptionFormSchema>>>([]);
  const [shuffledWcOptions, setShuffledWcOptions] = useState<Array<z.infer<typeof WeightedChoiceOptionFormSchema>>>([]);
  const [shuffledJustificationOptions, setShuffledJustificationOptions] = useState<Array<z.infer<typeof MultipleChoiceOptionFormSchema>>>([]);
  const [shuffledArgItems, setShuffledArgItems] = useState<Array<z.infer<typeof ArgumentItemFormSchema>>>([]);
  // States for matching removed


  useEffect(() => {
    if (question.type === 'multiple-choice' || question.type === 'multiple-response') {
      const q = question as Extract<QuestionFormValues, { type: 'multiple-choice' | 'multiple-response' }>;
      setShuffledMcOptions(q.randomizeOptions ? shuffleArray([...(q.options || [])]) : [...(q.options || [])]);
    } else if (question.type === 'weighted-choice') {
      const q = question as Extract<QuestionFormValues, { type: 'weighted-choice' }>;
      setShuffledWcOptions(q.randomizeOptions ? shuffleArray([...(q.options || [])]) : [...(q.options || [])]);
    } else if (question.type === 'true-false-justification') {
      const q = question as Extract<QuestionFormValues, { type: 'true-false-justification' }>;
      setShuffledJustificationOptions(q.randomizeJustificationOptions ? shuffleArray([...(q.justificationOptions || [])]) : [...(q.justificationOptions || [])]);
    } else if (question.type === 'argument-reconstruction') {
      const q = question as Extract<QuestionFormValues, { type: 'argument-reconstruction' }>;
      setShuffledArgItems(shuffleArray([...(q.items || [])])); 
    }
    // Effect for matching removed
  }, [question]);

  const getQuestionTypeLabel = () => {
    switch(question.type) {
      case 'multiple-choice': return "(Selección Única)";
      case 'multiple-response': return "(Selección Múltiple)";
      case 'weighted-choice': return `(Opción Ponderada - ${(question as WeightedChoiceQuestion).allowMultipleSelections ? "Múltiples Selecciones" : "Selección Única"})`;
      case 'argument-reconstruction': return "(Reconstrucción de Argumento - Ordena los ítems)";
      case 'free-text': return "(Respuesta Abierta)";
      case 'true-false-justification': return "(Verdadero/Falso con Justificación)";
      case 'true-false-complex': return "(Verdadero/Falso - Enunciado Complejo)";
      case 'cloze': return "(Completar Espacios)";
      // case 'matching': return "(Unir con Flechas/Columnas)"; // Removed
      default: return "";
    }
  };

  const renderClozeSubQuestionPreview = (subQ: z.infer<typeof ClozeSubQuestionFormSchema>) => {
    switch (subQ.type) {
      case 'multiple-choice':
        return (
          <div className="mt-1 space-y-1">
            {(subQ.options || []).map(opt => (
              <div key={opt.id || opt.text} className="flex items-center space-x-2">
                {subQ.allowMultipleSelectionsInSubQuestion ? <Checkbox disabled id={`prev-cloze-${subQ.id}-${opt.id}-cb`} /> : <RadioGroupItem disabled value={opt.id || opt.text} id={`prev-cloze-${subQ.id}-${opt.id}-rg`} />}
                <Label htmlFor={`prev-cloze-${subQ.id}-${opt.id}-cb`} className="font-normal text-sm">{opt.text}</Label>
              </div>
            ))}
          </div>
        );
      case 'short-answer':
        return <Input type="text" disabled placeholder="Respuesta corta" className="mt-1 text-sm" />;
      case 'numerical':
        return <Input type="number" disabled placeholder="Numérico" className="mt-1 text-sm" />;
      default: return null;
    }
  };

  const renderClozeTextWithInputsPreview = (clozeQ: Extract<QuestionFormValues, { type: 'cloze' }>) => {
    let textParts = [clozeQ.textWithPlaceholders];
    (clozeQ.subQuestions || []).forEach(sq => {
        const placeholderRegex = new RegExp(`\\{${sq.placeholderLabel}\\}`, 'g');
        let newTextParts: any[] = [];
        textParts.forEach(part => {
            if (typeof part === 'string') {
                const splitByPlaceholder = part.split(placeholderRegex);
                for (let i = 0; i < splitByPlaceholder.length; i++) {
                    newTextParts.push(splitByPlaceholder[i]);
                    if (i < splitByPlaceholder.length - 1) {
                        newTextParts.push(
                            <span key={`prev-cloze-input-${sq.id || sq.placeholderLabel}`} className="inline-block mx-1 align-baseline p-1 border border-dashed rounded min-w-[100px] bg-muted/30">
                                {renderClozeSubQuestionPreview(sq)}
                            </span>
                        );
                    }
                }
            } else {
                newTextParts.push(part); 
            }
        });
        textParts = newTextParts;
    });
    return <p className="text-lg leading-relaxed">{textParts.map((part, index) => <React.Fragment key={index}>{part}</React.Fragment>)}</p>;
  };


  return (
    <div className="p-4 border rounded-lg bg-background shadow-sm">
      <h3 className="text-xl font-semibold mb-1">{question.text}</h3>
      <p className="text-sm text-muted-foreground mb-4">{getQuestionTypeLabel()} (Puntos: {question.points || 0})</p>
      
      <div className="min-h-[150px] p-4 border-2 border-dashed rounded-md bg-muted/20">
        {question.type === 'multiple-choice' && (
          <RadioGroup disabled className="space-y-2">
            {shuffledMcOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50">
                <RadioGroupItem value={option.id!} id={`preview-${question.id}-${option.id}`} disabled />
                <Label htmlFor={`preview-${question.id}-${option.id}`} className="font-normal text-base flex-1">{option.text}</Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {question.type === 'multiple-response' && (
          <div className="space-y-2">
            {shuffledMcOptions.map((option) => (
              <div key={option.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50">
                <Checkbox id={`preview-${question.id}-${option.id}`} disabled />
                <Label htmlFor={`preview-${question.id}-${option.id}`} className="font-normal text-base flex-1">{option.text}</Label>
              </div>
            ))}
          </div>
        )}

        {question.type === 'weighted-choice' && (
          <div className="space-y-2">
            {(question as WeightedChoiceQuestion).allowMultipleSelections ? (
              shuffledWcOptions.map((option) => (
                <div key={option.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50">
                  <Checkbox id={`preview-${question.id}-${option.id}`} disabled />
                  <Label htmlFor={`preview-${question.id}-${option.id}`} className="font-normal text-base flex-1">{option.text}</Label>
                </div>
              ))
            ) : (
              <RadioGroup disabled className="space-y-2">
                {shuffledWcOptions.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50">
                    <RadioGroupItem value={option.id!} id={`preview-${question.id}-${option.id}`} disabled />
                    <Label htmlFor={`preview-${question.id}-${option.id}`} className="font-normal text-base flex-1">{option.text}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
          </div>
        )}

        {question.type === 'free-text' && (
          <Textarea
            disabled
            placeholder="Espacio para la respuesta del estudiante..."
            className="min-h-[120px] text-base bg-white"
            rows={5}
          />
        )}

        {question.type === 'argument-reconstruction' && (
          <div className="space-y-2">
             <p className="text-sm text-muted-foreground mb-2">Los ítems aparecerán aquí para que el estudiante los ordene:</p>
            {shuffledArgItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 p-3 border rounded-md bg-background cursor-default"
              >
                <GripVertical className="h-5 w-5 text-muted-foreground" />
                <span className="font-normal text-base flex-1">{item.text}</span>
              </div>
            ))}
          </div>
        )}

        {question.type === 'true-false-justification' && (
          <div className="space-y-4">
            <div>
              <p className="mb-1 font-medium">Afirmación:</p>
              <p className="p-2 border rounded bg-white">{(question as TrueFalseJustificationQuestion).affirmation}</p>
            </div>
            <div className="flex items-center gap-4">
              <Label className="font-medium">Respuesta a la afirmación:</Label>
              <RadioGroup disabled className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id={`prev-${question.id}-affirm-true`} disabled />
                  <Label htmlFor={`prev-${question.id}-affirm-true`} className="font-normal">Verdadero</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id={`prev-${question.id}-affirm-false`} disabled />
                  <Label htmlFor={`prev-${question.id}-affirm-false`} className="font-normal">Falso</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label className="block mb-1 font-medium">Justificación:</Label>
              <RadioGroup disabled className="space-y-2">
                {shuffledJustificationOptions.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-muted/50">
                    <RadioGroupItem value={option.id!} id={`prev-${question.id}-just-${option.id}`} disabled />
                    <Label htmlFor={`prev-${question.id}-just-${option.id}`} className="font-normal text-base flex-1">{option.text}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        )}

        {question.type === 'true-false-complex' && (
          <div className="space-y-3">
            <p className="mb-1 font-medium">Enunciado:</p>
            <p className="p-2 border rounded bg-white">{(question as TrueFalseComplexQuestion).statement}</p>
            <div className="flex items-center gap-4">
              <Label className="font-medium">Respuesta al enunciado:</Label>
              <RadioGroup disabled className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id={`prev-${question.id}-tfc-true`} disabled />
                  <Label htmlFor={`prev-${question.id}-tfc-true`} className="font-normal">Verdadero</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id={`prev-${question.id}-tfc-false`} disabled />
                  <Label htmlFor={`prev-${question.id}-tfc-false`} className="font-normal">Falso</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}
        
        {question.type === 'cloze' && (
          renderClozeTextWithInputsPreview(question as Extract<QuestionFormValues, { type: 'cloze' }>)
        )}
        
        {/* Removed matching question preview logic */}

      </div>
      {question.feedback && (
        <p className="mt-3 text-xs text-muted-foreground italic">Retroalimentación (para el docente): {question.feedback}</p>
      )}
    </div>
  );
}
