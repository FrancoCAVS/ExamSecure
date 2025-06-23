'use server';

/**
 * @fileOverview Este archivo define un flujo de Genkit para calificar preguntas de ensayo identificando temas y hechos clave.
 *
 * - gradeEssayQuestion - Una función que califica una pregunta de ensayo e identifica temas y hechos clave.
 * - GradeEssayQuestionInput - El tipo de entrada para la función gradeEssayQuestion.
 * - GradeEssayQuestionOutput - El tipo de retorno para la función gradeEssayQuestion.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GradeEssayQuestionInputSchema = z.object({
  question: z.string().describe('La pregunta de ensayo.'),
  answer: z.string().describe("La respuesta del estudiante a la pregunta de ensayo."),
});
export type GradeEssayQuestionInput = z.infer<typeof GradeEssayQuestionInputSchema>;

const GradeEssayQuestionOutputSchema = z.object({
  keyThemes: z.array(z.string()).describe('Los temas clave identificados en la respuesta del ensayo.'),
  keyFacts: z.array(z.string()).describe('Los hechos clave presentados en la respuesta del ensayo.'),
  gradeSuggestion: z.number().describe('Una calificación sugerida para el ensayo, en una escala de 0 a 100.'),
});
export type GradeEssayQuestionOutput = z.infer<typeof GradeEssayQuestionOutputSchema>;

export async function gradeEssayQuestion(input: GradeEssayQuestionInput): Promise<GradeEssayQuestionOutput> {
  return gradeEssayQuestionFlow(input);
}

const gradeEssayQuestionPrompt = ai.definePrompt({
  name: 'gradeEssayQuestionPrompt',
  input: {schema: GradeEssayQuestionInputSchema},
  output: {schema: GradeEssayQuestionOutputSchema},
  prompt: `Sos un asistente de IA especializado en calificar preguntas de ensayo. Tu tarea es analizar la respuesta del estudiante e identificar los temas y hechos clave presentados.

Pregunta de Ensayo: {{{question}}}
Respuesta del Estudiante: {{{answer}}}

Basándote en la pregunta y la respuesta, identificá los temas y hechos clave. Además, proporcioná una calificación sugerida entre 0 y 100.

Asegurate de que la salida esté estructurada de acuerdo con el esquema proporcionado.`,
});

const gradeEssayQuestionFlow = ai.defineFlow(
  {
    name: 'gradeEssayQuestionFlow',
    inputSchema: GradeEssayQuestionInputSchema,
    outputSchema: GradeEssayQuestionOutputSchema,
  },
  async input => {
    const {output} = await gradeEssayQuestionPrompt(input);
    return output!;
  }
);
