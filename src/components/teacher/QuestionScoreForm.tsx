
"use client";

import { useActionState, useEffect } from 'react';
import { updateQuestionScoreAction, type UpdateQuestionScoreActionState } from '@/lib/actions/teacher.actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save } from "lucide-react";

interface QuestionScoreFormProps {
    submissionId: string;
    questionId: string;
    currentScore: number;
    maxPoints: number;
}

export function QuestionScoreForm({ submissionId, questionId, currentScore, maxPoints }: QuestionScoreFormProps) {
    const [state, formAction] = useActionState<UpdateQuestionScoreActionState | null, FormData>(updateQuestionScoreAction, null);
    const { toast } = useToast();

    useEffect(() => {
        if (state?.success === false && state.message) {
            toast({
                title: "Error al actualizar",
                description: state.message,
                variant: "destructive",
            });
        }
    }, [state, toast]);

    return (
        <form action={formAction} className="flex items-center gap-2">
            <input type="hidden" name="submissionId" value={submissionId} />
            <input type="hidden" name="questionId" value={questionId} />
            <Label htmlFor={`score-${questionId}`} className="sr-only">Puntaje</Label>
            <Input
                id={`score-${questionId}`}
                name="newScore"
                type="number"
                defaultValue={currentScore}
                min="0"
                max={maxPoints}
                step="0.5"
                className="w-24 h-8"
                aria-label={`Puntaje para la pregunta (máximo ${maxPoints})`}
            />
            <Button type="submit" size="sm" variant="secondary">
                <Save className="h-4 w-4" />
                <span className="sr-only">Guardar Puntaje</span>
            </Button>
            {state?.errors?.newScore && (
                <p className="text-sm text-destructive">{state.errors.newScore[0]}</p>
            )}
        </form>
    );
}
