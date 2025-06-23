
/**
 * @fileOverview AI flow to generate exam questions based on provided criteria.
 * This file uses 'use server' and should only export async functions.
 * Types and Zod schemas are imported from './generate-exam-questions-types'.
 */

import {ai} from '@/ai/genkit';
import {
  GenerateExamQuestionsInputSchema,
  GenerateExamQuestionsOutputSchema,
  type GenerateExamQuestionsInput,
  type GenerateExamQuestionsOutput,
  AIQuestionSchema, // For better console logging type safety
} from './generate-exam-questions-types';

/**
 * Generates a list of exam questions based on the provided criteria.
 * This is the main function to be called from server components or other server actions.
 * @param input Criteria for question generation.
 * @returns A promise that resolves to the generated questions.
 */
export async function generateExamQuestions(input: GenerateExamQuestionsInput): Promise<GenerateExamQuestionsOutput> {
  return generateExamQuestionsFlow(input);
}

const generateExamQuestionsPrompt = ai.definePrompt({
  name: 'generateExamQuestionsPrompt',
  input: { schema: GenerateExamQuestionsInputSchema },
  output: { schema: GenerateExamQuestionsOutputSchema },
  prompt: `Eres un asistente de IA especializado en crear diversas y bien formuladas preguntas de examen para la plataforma ExamSecure.
IMPORTANTE: TODO el contenido de las preguntas, incluyendo el texto de la pregunta, opciones, ítems, afirmaciones, enunciados y retroalimentación, DEBE ESTAR EN ESPAÑOL.

Tu salida DEBE ser un objeto JSON válido que se ajuste a GenerateExamQuestionsOutputSchema.
El array 'generatedQuestions' debe contener objetos que coincidan con AIQuestionSchema (definido en otro lugar, pero adhiérete a su estructura para los diferentes tipos de pregunta).

Contexto del Examen:
- Título: {{{examTitle}}}
- Descripción: {{{examDescription}}}
- Tema Específico (si se proporciona): {{{topic}}}
{{#if contextText}}
- Texto de Contexto Principal (las preguntas deben basarse principalmente en este texto):
{{{contextText}}}
{{/if}}
{{#if additionalInstructions}}
- Instrucciones Adicionales para la Generación (considera estas directrices al crear las preguntas):
{{{additionalInstructions}}}
{{/if}}

Por favor, genera {{{numQuestions}}} preguntas de examen basadas en el contexto y tema.
{{#if questionTypeToGenerate}}
Debes generar TODAS las {{{numQuestions}}} preguntas SOLAMENTE del tipo: "{{questionTypeToGenerate}}". Es crucial que el campo 'type' de cada pregunta generada sea exactamente "{{questionTypeToGenerate}}" y que la estructura de la pregunta se adhiera al esquema para ese tipo, incluyendo TODOS los campos requeridos para ese tipo (especialmente arrays como 'options', 'items', 'subQuestions' según corresponda). NO generes preguntas de OTRO tipo si "{{questionTypeToGenerate}}" está especificado. Si no puedes cumplir con la estructura del tipo solicitado, es preferible que indiques un problema a que generes un tipo incorrecto.
{{else}}
Varía los tipos de pregunta si es posible.
{{/if}}

Tus tipos de pregunta soportados son:
"multiple-choice", "multiple-response", "free-text", "weighted-choice", "argument-reconstruction", "true-false-justification", "true-false-complex", "cloze".

Para cada pregunta, asegúrate de proporcionar:
- 'type': (ej., "multiple-choice", "free-text", etc.)
- 'text': El texto principal de la pregunta o enunciado. Para "cloze", este es 'textWithPlaceholders'. Para "argument-reconstruction", es el contexto/título.
- 'points': Un valor de puntos razonable (ej., 10). Para "cloze", este es el total de puntos, y las subpreguntas también tendrán puntos.
- 'feedback': (Opcional) Breve retroalimentación o notas para el instructor (en español).

Detalles específicos para los tipos de pregunta (asegúrate que la salida coincida con estos detalles):
- "multiple-choice": Necesita 'options' (array, mín 2). Cada opción: 'text' (string, en español), 'isCorrect' (boolean). Exactamente una 'isCorrect' true. Opcional 'randomizeOptions' (boolean).
- "multiple-response": Necesita 'options' (array, mín 2). Cada opción: 'text' (string, en español), 'isCorrect' (boolean). Al menos una 'isCorrect' true. Opcional 'randomizeOptions' (boolean).
- "free-text": Sin campos adicionales más allá de la base. El 'text' es el enunciado de la pregunta.
- "weighted-choice": Necesita 'options' (array, mín 1). Cada opción: 'text' (string, en español), 'percentage' (number -100 a 100). Opcional 'randomizeOptions' (boolean). Opcional 'allowMultipleSelections' (boolean, default false).
    - Si 'allowMultipleSelections' es false (o no se provee), es selección única. El estudiante elige una opción, y su calificación es puntos_pregunta * (porcentaje_opción / 100). Puede haber una opción con 100%, o varias con porcentajes parciales/negativos.
    - Si 'allowMultipleSelections' es true, es selección múltiple. El estudiante puede elegir varias opciones. La calificación se basa en la suma de los porcentajes de las opciones elegidas, normalizada entre 0 y 100% de los puntos de la pregunta. Asigna porcentajes positivos a las opciones correctas y cero/negativos a las incorrectas.
- "argument-reconstruction": Necesita 'items' (array, mín 3). Cada ítem: 'text' (string, en español). Los ítems deben incluir 2 PREMISAS, 1 CONCLUSIÓN, y opcionalmente 1 o más ÍTEMS DISTRACTORES. Proporciona los ítems en el siguiente orden: LAS 2 PREMISAS primero, luego la CONCLUSIÓN, y finalmente cualquier ÍTEM DISTRACTOR al final de la lista. El 'text' de la pregunta es el contexto o título del argumento a reconstruir.
- "true-false-justification": Necesita 'affirmation' (string, en español), 'isAffirmationTrue' (boolean), 'justificationOptions' (array, mín 2, como opciones de opción múltiple, una correcta), 'pointsForAffirmation' (number, ej., 5), 'pointsForJustification' (number, ej., 5). Opcional 'randomizeJustificationOptions' (boolean). El 'text' de la pregunta puede ser un título o contexto.
- "true-false-complex": Necesita 'statement' (string, en español), 'isStatementTrue' (boolean). El 'text' de la pregunta puede ser un título o contexto general, el 'statement' es el enunciado específico a evaluar.
- "cloze": Necesita 'textWithPlaceholders' (string, ej., "El cielo es {color} y tiene {n_estrellas} estrellas."). Y 'subQuestions' (array). Cada subpregunta:
    - 'placeholderLabel': (string, ej., "color", "n_estrellas" para el ejemplo anterior, debe coincidir con el placeholder en el texto).
    - 'type': (string, "multiple-choice", "short-answer", "numerical").
    - 'points': (number, puntos para esta subpregunta).
    - Si 'type' es "multiple-choice": 'options' (array de AIClozeSubQuestionOptionSchema), opcional 'allowMultipleSelectionsInSubQuestion' (boolean), opcional 'randomizeSubQuestionOptions' (boolean). Cada opción de subpregunta puede tener 'text', y opcionalmente 'percentage' (para ponderada) o 'isCorrect' (para simple).
    - Si 'type' es "short-answer" o "numerical": 'correctAnswer' (string o number).
    El 'points' total de la pregunta "cloze" principal debería ser la suma de los puntos de sus 'subQuestions'.

Esfuérzate por la claridad, la plausibilidad en los distractores y el valor educativo.
El formato de salida debe ser estrictamente JSON.
RECUERDA: TODO EL TEXTO GENERADO DEBE ESTAR EN ESPAÑOL.
`,
});

const generateExamQuestionsFlow = ai.defineFlow(
  {
    name: 'generateExamQuestionsFlow',
    inputSchema: GenerateExamQuestionsInputSchema,
    outputSchema: GenerateExamQuestionsOutputSchema,
  },
  async (input: GenerateExamQuestionsInput): Promise<GenerateExamQuestionsOutput> => {
    // The webhook call will be here
    try {
      const webhookPayload = {
        source: 'ExamSecure - AI Question Generation Attempt',
        generationParams: {
            numQuestions: input.numQuestions,
            topic: input.topic,
            questionTypeToGenerate: input.questionTypeToGenerate,
            contextText: input.contextText,
            additionalInstructions: input.additionalInstructions,
        },
        examContext: {
          title: input.examTitle,
          description: input.examDescription,
        }
      };
      const webhookResponse = await fetch('http://localhost:5678/webhook-test/3183924a-e128-4952-a135-7787655832fc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookPayload),
      });
      if (!webhookResponse.ok) {
        let errorText = '';
        try {
          errorText = await webhookResponse.text();
        } catch (textError) {
          // If webhookResponse.text() itself fails (e.g., response not actually text)
          errorText = 'Could not retrieve error text body from webhook response.';
        }
        console.warn(`AI Generation Webhook call failed with status: ${webhookResponse.status}. Response: ${errorText}`);
      } else {
        console.log('AI Generation Webhook call successful.');
      }
    } catch (webhookError: any) {
      // Catch errors from fetch itself (e.g., network error)
      console.warn('Error calling AI Generation webhook:', webhookError.message || webhookError);
    }
    
    const { output } = await generateExamQuestionsPrompt(input);

    // Log the AI's output as soon as it's received and parsed by Genkit
    console.log("AI Model Output (parsed by Genkit against GenerateExamQuestionsOutputSchema):", JSON.stringify(output, null, 2));

    if (!output || !output.generatedQuestions) {
      console.error("AI failed to generate questions or output was malformed. Input:", input, "Parsed Output that failed validation:", output);
      throw new Error("La IA no generó preguntas o la salida estaba vacía/malformada. Por favor, intenta de nuevo o refina la entrada.");
    }
    
    console.log("Requested question type by user:", input.questionTypeToGenerate);

    if (input.questionTypeToGenerate && input.questionTypeToGenerate !== "ANY") {
      output.generatedQuestions.forEach(q => {
        if (q.type !== input.questionTypeToGenerate) {
          console.error(`AI Mismatch: User requested '${input.questionTypeToGenerate}', but AI (after Zod parsing AIQuestionSchema) resulted in type '${q.type}'. Question text: "${q.text || (q as any).textWithPlaceholders || 'N/A'}"`);
          console.error("Problematic question structure (as Zod parsed it for AIQuestionSchema):", JSON.stringify(q, null, 2));
          throw new Error(`La IA no generó el tipo de pregunta esperado. Se solicitó '${input.questionTypeToGenerate}' pero se recibió el tipo '${q.type}' para la pregunta: "${q.text || (q as any).textWithPlaceholders || 'N/A'}". Esto usualmente ocurre si la IA no provee todos los campos necesarios para el tipo '${input.questionTypeToGenerate}'. Por favor, revisa la complejidad de tu solicitud o intenta con un tema/contexto diferente.`);
        }
      });
    }
    return output;
  }
);

