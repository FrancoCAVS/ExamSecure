
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Answer as AnswerType, Exam, Question, MultipleChoiceQuestion, MultipleResponseQuestion, WeightedChoiceQuestion, ArgumentReconstructionQuestion, ArgumentItem, MultipleChoiceOption as BaseMcOption, WeightedChoiceOption as BaseWcOption, TrueFalseJustificationQuestion, TrueFalseComplexQuestion, ClozeQuestion, ClozeSubQuestion, ClozeSubQuestionOption, OnTimeUpAction } from '@/lib/types';
import { useExamTimer } from '@/hooks/use-exam-timer';
import { FraudDetectionHandler } from '@/components/shared/FraudDetectionHandler';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle, Clock, ChevronLeft, ChevronRight, GripVertical, Shuffle, Hourglass, ListChecks, ShieldAlert, X } from 'lucide-react';
import { submitExamAnswers } from '@/lib/actions/submission.actions';
import { useToast } from '@/hooks/use-toast';
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
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components
import { cn } from '@/lib/utils';

interface ExamTakingInterfaceProps {
  exam: Exam;
  studentId: string;
}

type ExamPhase = 'main' | 'grace' | 'ended' | 'prevented';
type Infraction = { type: 'copy' | 'paste' | 'focus-lost'; timestamp: string };

function shuffleArray<T>(array: T[]): T[] {
  if (!array) return [];
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}


export function ExamTakingInterface({ exam, studentId }: ExamTakingInterfaceProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  const [shuffledMcOptions, setShuffledMcOptions] = useState<BaseMcOption[]>([]);
  const [shuffledWcOptions, setShuffledWcOptions] = useState<BaseWcOption[]>([]);
  const [shuffledJustificationOptions, setShuffledJustificationOptions] = useState<BaseMcOption[]>([]);
  const [infractions, setInfractions] = useState<Infraction[]>([]);

  const [answers, setAnswers] = useState<AnswerType[]>(() =>
    exam.questions.map(q => {
      let initialValue: AnswerType['value'];
      if (q.type === 'multiple-response' || q.type === 'argument-reconstruction' || (q.type === 'weighted-choice' && q.allowMultipleSelections)) {
        initialValue = [];
      } else if (q.type === 'true-false-justification') {
        initialValue = { affirmationResponse: null, justificationId: null };
      } else if (q.type === 'true-false-complex') {
        initialValue = null;
      } else if (q.type === 'cloze') {
        initialValue = {};
      }
       else {
        initialValue = '';
      }
      return { questionId: q.id, value: initialValue };
    })
  );

  const draggableItems = useRef<ArgumentItem[]>([]);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);


  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [examPhase, setExamPhase] = useState<ExamPhase>('main');
  const [graceTimeLeft, setGraceTimeLeft] = useState<number | null>(null);
  const autoSubmitTriggeredRef = useRef(false);
  const [showFocusLossWarning, setShowFocusLossWarning] = useState(true);


  const effectiveOnTimeUpAction: OnTimeUpAction = exam.on_time_up_action || 'auto-submit';
  
  const onTimerEndCallbackRef = useRef<(() => void) | null>(null);

  const {
    formattedTime: mainFormattedTime,
    timeLeft: mainTimeLeft,
    startTimer: startMainTimer,
    stopTimer: stopMainTimer,
    isRunning: isMainTimerRunning,
  } = useExamTimer({
    durationMinutes: exam.duration_minutes ?? 0,
    onTimerEnd: () => {
      if (onTimerEndCallbackRef.current) {
        onTimerEndCallbackRef.current();
      }
    },
  });


  const isQuestionAnswered = useCallback((questionId: string): boolean => {
    const answer = answers.find(a => a.questionId === questionId);
    if (!answer) return false;
    
    const qDefinition = shuffledQuestions.find(q => q.id === questionId);
    if (!qDefinition) return false;

    if (Array.isArray(answer.value)) return answer.value.length > 0;
    
    if (typeof answer.value === 'object' && answer.value !== null) {
      if (qDefinition.type === 'true-false-justification') {
        const tfjVal = answer.value as { affirmationResponse: boolean | null; justificationId: string | null };
        return tfjVal.affirmationResponse !== null || (tfjVal.justificationId !== null && tfjVal.justificationId !== '');
      }
      if (qDefinition.type === 'cloze') {
        return Object.values(answer.value).some(subAnswer => 
          subAnswer !== null && subAnswer !== undefined && (typeof subAnswer === 'string' ? subAnswer !== '' : true) && (!Array.isArray(subAnswer) || subAnswer.length > 0)
        );
      }
      return Object.keys(answer.value).length > 0; 
    }
    
    return answer.value !== '' && answer.value !== null && answer.value !== undefined;
  }, [answers, shuffledQuestions]);

  const handleSubmitExam = useCallback(async (source: 'user' | 'timer' | 'focusLoss' = 'user') => {
    if (examPhase === 'prevented' || examPhase === 'ended' || (autoSubmitTriggeredRef.current && source === 'focusLoss')) {
      if (source === 'focusLoss' && !autoSubmitTriggeredRef.current) {
         // Allow first focusLoss to proceed if not already ended/prevented
      } else {
        toast({ title: "Información", description: "El examen ya ha finalizado o está en proceso de envío.", variant: "default" });
        return;
      }
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    if (source === 'focusLoss') autoSubmitTriggeredRef.current = true;
    
    const timeTakenSeconds = (exam.duration_minutes ?? 0) * 60 - (mainTimeLeft > 0 ? mainTimeLeft : 0);
    
    const formData = new FormData();
    formData.append('examId', exam.id);
    formData.append('studentId', studentId);
    formData.append('answersJson', JSON.stringify(answers));
    formData.append('timeTaken', String(timeTakenSeconds));
    formData.append('infractionsJson', JSON.stringify(infractions));
    
    console.log("ExamTakingInterface: handleSubmitExam - FormData prepared:", {
        examId: exam.id,
        studentId: studentId,
        answersJsonLength: JSON.stringify(answers).length,
        timeTaken: String(timeTakenSeconds),
        source: source,
    });

    try {
      await submitExamAnswers(null, formData);
      // submitExamAnswers now handles the redirect, so this part might not be reached if successful.
      console.warn("ExamTakingInterface: submitExamAnswers completed without redirecting or throwing a redirect error. This might indicate an issue if a redirect was expected.");

    } catch (error: any) {
      const nextRedirectErrorCode = 'NEXT_REDIRECT';
      let isRedirectError = false;

      if (error && typeof error.message === 'string' && error.message.includes(nextRedirectErrorCode)) {
        isRedirectError = true;
      } else if (error && typeof error.digest === 'string' && error.digest.includes(nextRedirectErrorCode)) {
        isRedirectError = true;
      }
      
      if (isRedirectError) {
        console.log("ExamTakingInterface: NEXT_REDIRECT caught by client, redirect is in progress. Will re-throw.");
        throw error; 
      }
      
      console.error("ExamTakingInterface: Error calling submitExamAnswers action (non-redirect):", error);
      
      let errorMessage = "Hubo un problema al enviar tus respuestas. Intenta de nuevo.";
      if (error instanceof Error) {
          errorMessage = error.message;
      } else if (typeof error === 'string') {
          errorMessage = error;
      } else if (error && error.message && typeof error.message === 'string') {
          errorMessage = error.message;
      }
      
      toast({ title: "Error al Enviar", description: errorMessage, variant: "destructive" });
      
      if (examPhase !== 'prevented' && examPhase !== 'ended') {
        setIsSubmitting(false); 
        if (source === 'focusLoss') autoSubmitTriggeredRef.current = false; // Allow retry if submit failed
      }
    }
  }, [exam.id, studentId, answers, examPhase, isSubmitting, mainTimeLeft, exam.duration_minutes, toast, infractions]);

  const handleMainTimerEnd = useCallback(async () => {
    console.log("Main timer ended. Action:", effectiveOnTimeUpAction);
    if (effectiveOnTimeUpAction === 'allow-submission-grace-period' && exam.grace_period_minutes && exam.grace_period_minutes > 0) {
      setExamPhase('grace');
      setGraceTimeLeft(exam.grace_period_minutes * 60);
      toast({ title: "Tiempo de Gracia Iniciado", description: `Tienes ${exam.grace_period_minutes} minutos adicionales para enviar tu examen.`, variant: "default", duration: 10000 });
    } else if (effectiveOnTimeUpAction === 'prevent-submit') {
      setExamPhase('prevented');
      if (isMainTimerRunning) stopMainTimer();
      toast({
        title: "Tiempo Terminado",
        description: "El tiempo para completar el examen ha finalizado. Ya no puedes enviar tus respuestas.",
        variant: "destructive",
        duration: Infinity 
      });
    } else { 
      setExamPhase('ended');
      if (isMainTimerRunning) stopMainTimer();
      toast({ title: "Tiempo Terminado", description: "El examen se enviará automáticamente.", variant: "destructive" });
      await handleSubmitExam('timer'); 
    }
  }, [effectiveOnTimeUpAction, exam.grace_period_minutes, toast, handleSubmitExam, isMainTimerRunning, stopMainTimer]); 

  useEffect(() => {
    onTimerEndCallbackRef.current = handleMainTimerEnd;
  }, [handleMainTimerEnd]);

  useEffect(() => {
    startMainTimer();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startMainTimer]); 

  useEffect(() => {
    if (examPhase === 'grace' && graceTimeLeft !== null) {
      if (graceTimeLeft <= 0) {
        setExamPhase('ended');
        toast({ title: "Tiempo de Gracia Terminado", description: "El examen se enviará automáticamente.", variant: "destructive" });
        handleSubmitExam('timer'); 
        return;
      }
      const timerId = setInterval(() => {
        setGraceTimeLeft(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(timerId);
    }
  }, [examPhase, graceTimeLeft, handleSubmitExam, toast]);


  useEffect(() => {
    if (exam.questions) {
      setShuffledQuestions(exam.randomize_questions ? shuffleArray([...exam.questions]) : [...exam.questions]);
    }
  }, [exam.questions, exam.randomize_questions]);

  const currentQuestion: Question | undefined = shuffledQuestions[currentQuestionIndex];

   useEffect(() => {
    if (currentQuestion) {
      if (currentQuestion.type === 'multiple-choice' || currentQuestion.type === 'multiple-response') {
        const qWithOptions = currentQuestion as MultipleChoiceQuestion | MultipleResponseQuestion;
        setShuffledMcOptions(
          qWithOptions.randomizeOptions ? shuffleArray([...(qWithOptions.options || [])]) : [...(qWithOptions.options || [])]
        );
      } else if (currentQuestion.type === 'weighted-choice') {
        const qWithOptions = currentQuestion as WeightedChoiceQuestion;
        setShuffledWcOptions(
          qWithOptions.randomizeOptions ? shuffleArray([...(qWithOptions.options || [])]) : [...(qWithOptions.options || [])]
        );
      } else if (currentQuestion.type === 'true-false-justification') {
        const tfjq = currentQuestion as TrueFalseJustificationQuestion;
        setShuffledJustificationOptions(
          tfjq.randomizeJustificationOptions ? shuffleArray([...(tfjq.justificationOptions || [])]) : [...(tfjq.justificationOptions || [])]
        );
      }

      if (currentQuestion.type === 'argument-reconstruction') {
        const arq = currentQuestion as ArgumentReconstructionQuestion;
        const currentAnswerForArg = answers.find(a => a.questionId === currentQuestion.id);
        const studentAnswerOrder = (currentAnswerForArg?.value as string[]) || [];
        if (studentAnswerOrder.length > 0 && studentAnswerOrder.every(id => arq.items.find(item => item.id === id))) {
            const orderedItems = studentAnswerOrder.map(id =>
                arq.items.find(item => item.id === id)
            ).filter(item => item !== undefined) as ArgumentItem[];
            draggableItems.current = orderedItems;
        } else {
            draggableItems.current = shuffleArray([...(arq.items || [])]);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestionIndex, currentQuestion?.type, shuffledQuestions, answers]);


  const handleMultipleResponseChange = useCallback((questionId: string, optionId: string, checked: boolean) => {
    setAnswers(prevAnswers =>
      prevAnswers.map(a => {
        if (a.questionId === questionId) {
          const currentValue = (a.value as string[] | undefined) || [];
          let newValue: string[];
          if (checked) {
            newValue = [...currentValue, optionId];
          } else {
            newValue = currentValue.filter(id => id !== optionId);
          }
          return { ...a, value: newValue };
        }
        return a;
      })
    );
  }, []);

  const handleSingleValueChange = useCallback((questionId: string, value: string) => {
    setAnswers(prev => prev.map(a => a.questionId === questionId ? { ...a, value } : a));
  }, []);

  const handleFreeTextChange = useCallback((questionId: string, value: string) => {
    setAnswers(prev => prev.map(a => a.questionId === questionId ? { ...a, value } : a));
  }, []);

  const handleTrueFalseComplexChange = useCallback((questionId: string, value: string) => {
    setAnswers(prev => prev.map(a => a.questionId === questionId ? { ...a, value: value === 'true' } : a));
  }, []);

  const handleTrueFalseJustificationChange = useCallback((questionId: string, part: 'affirmation' | 'justification', value: string) => {
    setAnswers(prev => prev.map(a => {
      if (a.questionId === questionId) {
        const currentTFJAnswer = (a.value as { affirmationResponse: boolean | null; justificationId: string | null }) || { affirmationResponse: null, justificationId: null };
        if (part === 'affirmation') {
          return { ...a, value: { ...currentTFJAnswer, affirmationResponse: value === 'true' } };
        } else {
          return { ...a, value: { ...currentTFJAnswer, justificationId: value } };
        }
      }
      return a;
    }));
  }, []);

  const handleClozeSubQuestionChange = useCallback((questionId: string, subQuestionPlaceholder: string, subQuestionValue: string | string[] | number | boolean | null) => {
    setAnswers(prevAnswers =>
      prevAnswers.map(a => {
        if (a.questionId === questionId) {
          const currentClozeAnswers = (a.value as Record<string, any>) || {};
          return {
            ...a,
            value: {
              ...currentClozeAnswers,
              [subQuestionPlaceholder]: subQuestionValue,
            },
          };
        }
        return a;
      })
    );
  }, []);

  const handleArgumentItemDragSort = useCallback(() => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (!currentQuestion || currentQuestion.type !== 'argument-reconstruction') return;

    const newItems = [...draggableItems.current];
    const draggedItemContent = newItems.splice(dragItem.current, 1)[0];
    newItems.splice(dragOverItem.current, 0, draggedItemContent);

    draggableItems.current = newItems;
    const newOrderIds = newItems.map(item => item.id);
    setAnswers(prev => prev.map(a => a.questionId === currentQuestion.id ? { ...a, value: newOrderIds } : a));

    dragItem.current = null;
    dragOverItem.current = null;
    setCurrentQuestionIndex(idx => idx); 
  }, [currentQuestion]);


  const goToNextQuestion = useCallback(() => {
    if (currentQuestionIndex < shuffledQuestions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [currentQuestionIndex, shuffledQuestions.length]);

  const goToPreviousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1); 
    }
  }, [currentQuestionIndex]);
  
  const handleFraudAttempt = useCallback((type: 'copy' | 'paste' | 'focusLost') => {
    setInfractions(prev => [...prev, { type, timestamp: new Date().toISOString() }]);

    if (type === 'focusLost') {
      if (exam.auto_submit_on_focus_loss && !isSubmitting && examPhase !== 'ended' && examPhase !== 'prevented' && !autoSubmitTriggeredRef.current) {
        toast({
          title: "Atención: Foco Perdido",
          description: "Has salido de la ventana del examen. El examen se enviará automáticamente.",
          variant: "destructive",
          duration: 7000,
        });
        handleSubmitExam('focusLoss');
      } else if (exam.auto_submit_on_focus_loss && autoSubmitTriggeredRef.current) {
        console.log("Focus lost again, but auto-submit already triggered or exam ended/prevented.");
      } else if (!exam.auto_submit_on_focus_loss) {
         toast({
            title: "Advertencia: Foco Perdido",
            description: "Has salido de la pestaña del examen. Esta acción puede ser registrada.",
            variant: "destructive",
        });
      }
    }
    // 'copy' and 'paste' toasts are handled within FraudDetectionHandler directly
  }, [exam.auto_submit_on_focus_loss, isSubmitting, examPhase, toast, handleSubmitExam]);


  if (!currentQuestion) {
    return <Card><CardContent className="py-6"><p>Cargando examen...</p></CardContent></Card>;
  }

  const currentAnswer = answers.find(a => a.questionId === currentQuestion?.id);
  const isInputDisabled = examPhase === 'prevented' || examPhase === 'ended' || isSubmitting;

  const getFormattedTimeForDisplay = () => {
    if (examPhase === 'grace' && graceTimeLeft !== null) {
      const minutes = Math.floor(graceTimeLeft / 60);
      const seconds = graceTimeLeft % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    return mainFormattedTime;
  };
  
  const getTimeLeftForColor = () => {
    if (examPhase === 'grace' && graceTimeLeft !== null) return graceTimeLeft;
    return mainTimeLeft;
  }


  const progressPercentage = ((currentQuestionIndex + 1) / shuffledQuestions.length) * 100;

  const getQuestionTypeLabel = () => {
    switch(currentQuestion.type) {
      case 'multiple-choice': return "(Selección Única)";
      case 'multiple-response': return "(Selección Múltiple)";
      case 'weighted-choice': return `(${(currentQuestion as WeightedChoiceQuestion).allowMultipleSelections ? "Múltiples Selecciones Ponderadas" : "Selección Única Ponderada"})`;
      case 'argument-reconstruction': return "(Reconstrucción de Argumento)";
      case 'free-text': return "(Respuesta Abierta)";
      case 'true-false-justification': return "(Verdadero/Falso con Justificación)";
      case 'true-false-complex': return "(Verdadero/Falso - Enunciado Complejo)";
      case 'cloze': return "(Completar Espacios)";
      default: return "";
    }
  }

  const currentTFJAnswer = currentQuestion.type === 'true-false-justification'
    ? (currentAnswer?.value as { affirmationResponse: boolean | null; justificationId: string | null }) || { affirmationResponse: null, justificationId: null }
    : { affirmationResponse: null, justificationId: null };


  const currentTFCAnswer = currentQuestion.type === 'true-false-complex'
    ? (currentAnswer?.value === true ? "true" : currentAnswer?.value === false ? "false" : "")
    : "";

  const renderClozeSubQuestion = (mainQuestionId: string, subQ: ClozeSubQuestion) => {
    const clozeAnswers = (currentAnswer?.value as Record<string, any>) || {};
    const subAnswer = clozeAnswers[subQ.placeholderLabel];

    switch (subQ.type) {
        case 'multiple-choice':
            return (
                <div className="mt-1 space-y-1">
                    {subQ.allowMultipleSelectionsInSubQuestion ? (
                        (subQ.options || []).map(opt => (
                            <div key={opt.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`cloze-${mainQuestionId}-${subQ.id}-${opt.id}`}
                                    checked={(subAnswer as string[] || []).includes(opt.id)}
                                    onCheckedChange={(checked) => {
                                        const currentVal = (subAnswer as string[] || []);
                                        const newVal = checked ? [...currentVal, opt.id] : currentVal.filter(id => id !== opt.id);
                                        handleClozeSubQuestionChange(mainQuestionId, subQ.placeholderLabel, newVal);
                                    }}
                                    disabled={isInputDisabled}
                                />
                                <Label htmlFor={`cloze-${mainQuestionId}-${subQ.id}-${opt.id}`} className="font-normal text-sm">{opt.text}</Label>
                            </div>
                        ))
                    ) : (
                        <RadioGroup
                            value={subAnswer as string || ""}
                            onValueChange={(val) => handleClozeSubQuestionChange(mainQuestionId, subQ.placeholderLabel, val)}
                            className="flex flex-col space-y-1"
                            disabled={isInputDisabled}
                        >
                            {(subQ.options || []).map(opt => (
                                <div key={opt.id} className="flex items-center space-x-2">
                                    <RadioGroupItem value={opt.id} id={`cloze-${mainQuestionId}-${subQ.id}-${opt.id}`} />
                                    <Label htmlFor={`cloze-${mainQuestionId}-${subQ.id}-${opt.id}`} className="font-normal text-sm">{opt.text}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    )}
                </div>
            );
        case 'short-answer':
            return <Input type="text" value={subAnswer as string || ""} onChange={e => handleClozeSubQuestionChange(mainQuestionId, subQ.placeholderLabel, e.target.value)} className="mt-1 text-sm" disabled={isInputDisabled} />;
        case 'numerical':
            return <Input type="number" value={subAnswer as string || ""} onChange={e => handleClozeSubQuestionChange(mainQuestionId, subQ.placeholderLabel, e.target.value)} className="mt-1 text-sm" disabled={isInputDisabled} />;
        default: return null;
    }
  };

  const renderClozeTextWithInputs = (clozeQ: ClozeQuestion) => {
    let textParts = [clozeQ.textWithPlaceholders];
    clozeQ.subQuestions.forEach(sq => {
        const placeholderRegex = new RegExp(`\\{${sq.placeholderLabel}\\}`, 'g');
        let newTextParts: any[] = [];
        textParts.forEach(part => {
            if (typeof part === 'string') {
                const splitByPlaceholder = part.split(placeholderRegex);
                for (let i = 0; i < splitByPlaceholder.length; i++) {
                    newTextParts.push(splitByPlaceholder[i]);
                    if (i < splitByPlaceholder.length - 1) {
                        newTextParts.push(
                            <span key={`cloze-input-${sq.id}`} className="inline-block mx-1 align-baseline">
                                {renderClozeSubQuestion(clozeQ.id, sq)}
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
  
  const timerActive = (examPhase === 'main' && isMainTimerRunning) || (examPhase === 'grace' && graceTimeLeft !== null && graceTimeLeft > 0);

  return (
    <>
      <FraudDetectionHandler
        enabled={timerActive && !isSubmitting && examPhase !== 'prevented' && examPhase !== 'ended'}
        onFraudAttempt={handleFraudAttempt}
      />
      <Card className="w-full max-w-4xl mx-auto shadow-2xl">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-headline text-primary">{exam.title}</CardTitle>
            <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full font-semibold text-lg",
                 (examPhase === 'grace' ? "bg-yellow-500 text-black" : 
                 (getTimeLeftForColor() <= 60 && getTimeLeftForColor() > 0 && examPhase !== 'prevented' ? "bg-destructive text-destructive-foreground animate-pulse" : 
                 (examPhase === 'prevented' || examPhase === 'ended' ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground")))
            )}>
              {examPhase === 'grace' ? <Hourglass className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
              <span>{getFormattedTimeForDisplay()}</span>
            </div>
          </div>
          {exam.description && <CardDescription className="pt-2">{exam.description}</CardDescription>}
           
           {showFocusLossWarning && exam.auto_submit_on_focus_loss && examPhase === 'main' && (
            <Alert variant="destructive" className="mt-3 relative">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>¡Atención!</AlertTitle>
              <AlertDescription>
                Salir de esta ventana/pestaña, o cerrarla, enviará el examen automáticamente.
              </AlertDescription>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6"
                onClick={() => setShowFocusLossWarning(false)}
                aria-label="Cerrar advertencia"
              >
                <X className="h-4 w-4" />
              </Button>
            </Alert>
           )}

           {examPhase === 'grace' && (
            <p className="text-sm font-medium text-yellow-600 mt-2 text-center">¡Estás en tiempo de gracia! Aprovecha estos minutos para finalizar.</p>
          )}
          {examPhase === 'prevented' && (
            <p className="text-sm font-medium text-destructive mt-2 text-center">El tiempo ha finalizado. No puedes realizar más cambios ni enviar.</p>
          )}
           {examPhase === 'ended' && !isSubmitting && (
            <p className="text-sm font-medium text-blue-600 mt-2 text-center">El examen ha sido enviado.</p>
          )}
        </CardHeader>

        
        {shuffledQuestions.length > 0 && (
          <div className="p-4 border-b">
            <div className="flex items-center mb-2">
              <ListChecks className="h-5 w-5 mr-2 text-muted-foreground" />
              <h4 className="text-sm font-medium text-muted-foreground">Navegación de Preguntas</h4>
            </div>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex space-x-2 pb-2">
                {shuffledQuestions.map((q, index) => (
                  <Button
                    key={q.id}
                    variant={index === currentQuestionIndex ? "default" : (isQuestionAnswered(q.id) ? "secondary" : "outline")}
                    size="sm"
                    className={cn(
                      "h-8 w-8 p-0 rounded-md text-xs",
                       index === currentQuestionIndex ? "bg-primary text-primary-foreground font-bold ring-2 ring-primary ring-offset-2" :
                       isQuestionAnswered(q.id) ? "bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-200 border-green-300 dark:border-green-600 hover:bg-green-200 dark:hover:bg-green-700" :
                       "border-border text-muted-foreground hover:bg-muted/50"
                    )}
                    onClick={() => setCurrentQuestionIndex(index)}
                    disabled={isInputDisabled}
                    aria-label={`Ir a la pregunta ${index + 1}`}
                  >
                    {index + 1}
                  </Button>
                ))}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </div>
        )}

        <CardContent className="py-8 px-6 md:px-8">
          <div className="mb-6">
            <Label className="text-sm text-muted-foreground">
              Pregunta {currentQuestionIndex + 1} de {shuffledQuestions.length} {getQuestionTypeLabel()} (Puntos: {currentQuestion.points || 0})
            </Label>
            <Progress value={progressPercentage} className="mt-1 h-2" />
          </div>

          <div className="mb-8 p-6 bg-card rounded-lg border min-h-[200px]">
            {currentQuestion.type === 'cloze' ? (
                 renderClozeTextWithInputs(currentQuestion as ClozeQuestion)
            ) : currentQuestion.type === 'true-false-justification' ? (
                <>
                    <h3 className="text-lg font-semibold mb-2">Afirmación:</h3>
                    <p className="mb-4">{(currentQuestion as TrueFalseJustificationQuestion).affirmation}</p>
                    <div className="mb-6">
                        <Label className="block mb-2 font-medium">La afirmación anterior es:</Label>
                        <RadioGroup
                            value={currentTFJAnswer.affirmationResponse === true ? "true" : currentTFJAnswer.affirmationResponse === false ? "false" : ""}
                            onValueChange={(value) => handleTrueFalseJustificationChange(currentQuestion.id, 'affirmation', value)}
                            className="flex gap-4"
                            disabled={isInputDisabled}
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="true" id={`${currentQuestion.id}-affirmation-true`} />
                                <Label htmlFor={`${currentQuestion.id}-affirmation-true`} className="font-normal">Verdadero</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="false" id={`${currentQuestion.id}-affirmation-false`} />
                                <Label htmlFor={`${currentQuestion.id}-affirmation-false`} className="font-normal">Falso</Label>
                            </div>
                        </RadioGroup>
                    </div>
                    {currentTFJAnswer.affirmationResponse !== null && (
                        <div>
                            <Label className="block mb-2 font-medium">Selecciona la mejor justificación para tu respuesta:</Label>
                            <RadioGroup
                                value={currentTFJAnswer.justificationId || ""}
                                onValueChange={(value) => handleTrueFalseJustificationChange(currentQuestion.id, 'justification', value)}
                                className="space-y-3"
                                disabled={isInputDisabled}
                            >
                                {shuffledJustificationOptions.map((option) => (
                                <div key={option.id} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/30 transition-colors">
                                    <RadioGroupItem value={option.id} id={`${currentQuestion.id}-justification-${option.id}`} />
                                    <Label htmlFor={`${currentQuestion.id}-justification-${option.id}`} className="font-normal text-base cursor-pointer flex-1">
                                    {option.text}
                                    </Label>
                                </div>
                                ))}
                            </RadioGroup>
                        </div>
                    )}
                </>
            ) : currentQuestion.type === 'true-false-complex' ? (
                <>
                    <h3 className="text-lg font-semibold mb-2">Evalúa la siguiente afirmación/enunciado:</h3>
                    <p className="mb-4">{(currentQuestion as TrueFalseComplexQuestion).statement}</p>
                    <RadioGroup
                        value={currentTFCAnswer}
                        onValueChange={(value) => handleTrueFalseComplexChange(currentQuestion.id, value)}
                        className="flex gap-4"
                        disabled={isInputDisabled}
                    >
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="true" id={`${currentQuestion.id}-tfc-true`} />
                            <Label htmlFor={`${currentQuestion.id}-tfc-true`} className="font-normal">Verdadero</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="false" id={`${currentQuestion.id}-tfc-false`} />
                            <Label htmlFor={`${currentQuestion.id}-tfc-false`} className="font-normal">Falso</Label>
                        </div>
                    </RadioGroup>
                </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-4">{currentQuestion.text}</h3>
                 {currentQuestion.type === 'argument-reconstruction' && (
                  <p className="text-sm text-muted-foreground mb-3">
                    Instrucciones: Este argumento se compone de 2 premisas y 1 conclusión, además de posibles distractores.
                    Ordena primero las 2 premisas, luego la conclusión. Coloca los ítems distractores al final. Arrastra para ordenar.
                  </p>
                )}
                {currentQuestion.type === 'multiple-choice' && (
                <RadioGroup
                    value={currentAnswer?.value as string || ""}
                    onValueChange={(value) => handleSingleValueChange(currentQuestion.id, value)}
                    className="space-y-3"
                    disabled={isInputDisabled}
                >
                    {shuffledMcOptions.map((option) => (
                    <div key={option.id} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/30 transition-colors">
                        <RadioGroupItem value={option.id} id={`${currentQuestion.id}-${option.id}`} />
                        <Label htmlFor={`${currentQuestion.id}-${option.id}`} className="font-normal text-base cursor-pointer flex-1">
                        {option.text}
                        </Label>
                    </div>
                    ))}
                </RadioGroup>
                )}
                {(currentQuestion.type === 'multiple-response' || (currentQuestion.type === 'weighted-choice' && (currentQuestion as WeightedChoiceQuestion).allowMultipleSelections)) && (
                <div className="space-y-3">
                    {(currentQuestion.type === 'multiple-response' ? shuffledMcOptions : shuffledWcOptions).map((option) => (
                    <div key={option.id} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/30 transition-colors">
                        <Checkbox
                        id={`${currentQuestion.id}-${option.id}`}
                        checked={(currentAnswer?.value as string[] || []).includes(option.id)}
                        onCheckedChange={(checked) => handleMultipleResponseChange(currentQuestion.id, option.id, !!checked)}
                        disabled={isInputDisabled}
                        />
                        <Label htmlFor={`${currentQuestion.id}-${option.id}`} className="font-normal text-base cursor-pointer flex-1">
                        {option.text}
                        </Label>
                    </div>
                    ))}
                </div>
                )}
                {currentQuestion.type === 'weighted-choice' && !(currentQuestion as WeightedChoiceQuestion).allowMultipleSelections && (
                     <RadioGroup
                        value={currentAnswer?.value as string || ""}
                        onValueChange={(value) => handleSingleValueChange(currentQuestion.id, value)}
                        className="space-y-3"
                        disabled={isInputDisabled}
                    >
                        {shuffledWcOptions.map((option) => (
                        <div key={option.id} className="flex items-center space-x-3 p-3 border rounded-md hover:bg-muted/30 transition-colors">
                            <RadioGroupItem value={option.id} id={`${currentQuestion.id}-${option.id}`} />
                            <Label htmlFor={`${currentQuestion.id}-${option.id}`} className="font-normal text-base cursor-pointer flex-1">
                            {option.text}
                            </Label>
                        </div>
                        ))}
                    </RadioGroup>
                )}
                {currentQuestion.type === 'argument-reconstruction' && (
                <div className="space-y-2">
                    {draggableItems.current.map((item, index) => (
                    <div
                        key={item.id}
                        draggable={!isInputDisabled}
                        onDragStart={() => (dragItem.current = index)}
                        onDragEnter={() => (dragOverItem.current = index)}
                        onDragEnd={handleArgumentItemDragSort}
                        onDragOver={(e) => e.preventDefault()}
                        className={cn("flex items-center gap-2 p-3 border rounded-md hover:bg-muted/30 transition-colors bg-background",
                            !isInputDisabled ? "cursor-grab active:cursor-grabbing" : "cursor-not-allowed opacity-70"
                        )}
                    >
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <span className="font-normal text-base flex-1">{item.text}</span>
                    </div>
                    ))}
                </div>
                )}
                {currentQuestion.type === 'free-text' && (
                <Textarea
                    value={currentAnswer?.value as string || ""}
                    onChange={(e) => handleFreeTextChange(currentQuestion.id, e.target.value)}
                    placeholder="Escribe tu respuesta aquí..."
                    className="min-h-[150px] text-base"
                    rows={6}
                    disabled={isInputDisabled}
                />
                )}
              </>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 border-t pt-6">
          <Button
            variant="outline"
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0 || isSubmitting || examPhase === 'prevented' || examPhase === 'ended'}
            className="w-full sm:w-auto"
          >
            <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
          </Button>

          {currentQuestionIndex === shuffledQuestions.length - 1 ? (
             <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto" disabled={isSubmitting || examPhase === 'prevented' || examPhase === 'ended'}>
                  <CheckCircle className="mr-2 h-4 w-4" /> Finalizar Examen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro de finalizar el examen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Una vez enviado, no podrás cambiar tus respuestas. Revisa tus respuestas antes de continuar.
                    { (examPhase === 'prevented') && <p className="mt-2 font-semibold text-destructive">El tiempo ha finalizado, no podrás enviar.</p>}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleSubmitExam('user')} disabled={isSubmitting || examPhase === 'prevented' || examPhase === 'ended'} className="bg-green-600 hover:bg-green-700">
                    {isSubmitting ? "Enviando..." : "Sí, finalizar y enviar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button onClick={goToNextQuestion} disabled={isSubmitting || examPhase === 'prevented' || examPhase === 'ended'} className="w-full sm:w-auto">
              Siguiente <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </>
  );
}
