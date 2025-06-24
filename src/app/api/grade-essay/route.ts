

import { NextRequest, NextResponse } from 'next/server';
import { gradeEssayQuestion } from '@/ai/flows/grade-essay-question';
import { z } from 'zod';

export const runtime = 'nodejs'

// Esquema para validar la entrada de la API
const GradeEssayInputSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = GradeEssayInputSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ error: 'Entrada inválida', issues: validation.error.issues }, { status: 400 });
    }

    // Llama a tu flow de Genkit de forma segura en el entorno de Node.js
    const gradingResult = await gradeEssayQuestion(validation.data);

    return NextResponse.json(gradingResult);

  } catch (error: any) {
    console.error('[API /grade-essay] Error:', error);
    return NextResponse.json(
      { error: 'Error al calificar el ensayo con IA.', details: error.message }, 
      { status: 500 }
    );
  }
}