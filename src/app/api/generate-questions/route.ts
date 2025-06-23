// src/app/api/generate-questions/route.ts

import { NextRequest, NextResponse } from 'next/server';

// CAMBIO CLAVE: Importamos la función 'wrapper' que TÚ creaste.
import { generateExamQuestions } from '@/ai/flows/generate-exam-questions-flow';

// Ya no necesitamos 'runFlow', así que lo eliminamos.
export const runtime = 'edge'
import { GenerateExamQuestionsInputSchema } from '@/ai/flows/generate-exam-questions-types';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const validatedInput = GenerateExamQuestionsInputSchema.safeParse(body);

        if (!validatedInput.success) {
            return NextResponse.json({ error: 'Invalid input', issues: validatedInput.error.issues }, { status: 400 });
        }

        // CAMBIO CLAVE: Llamamos a tu función importada directamente.
        // Es más simple y directo.
        const output = await generateExamQuestions(validatedInput.data);

        return NextResponse.json(output);

    } catch (error: any) {
        console.error('[API /generate-questions] Error:', error);
        return NextResponse.json(
            { error: 'An unexpected error occurred.', details: error.message || 'Unknown error' }, 
            { status: 500 }
        );
    }
}