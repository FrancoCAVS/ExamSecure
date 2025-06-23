
"use client";

import type { Exam, Question, MultipleChoiceQuestion, MultipleResponseQuestion, TrueFalseJustificationQuestion, TrueFalseComplexQuestion, ArgumentReconstructionQuestion, ClozeQuestion, WeightedChoiceQuestion, Submission, Answer } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Printer, Download, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

interface StudentExamPrintableViewProps {
  exam: Exam;
  submission: Submission;
  studentName?: string | null;
}

const FillableLine = ({ label, text, minWidth = '150px', className = '' }: { label: string, text?: string, minWidth?: string, className?: string }) => (
  <div className={`flex items-end mb-1.5 text-xs ${className}`}>
    <span className="font-semibold mr-2 whitespace-nowrap">{label}:</span>
    {text ? <span className="border-b border-gray-400 h-5 px-1">{text}</span> : <div className="flex-grow border-b border-gray-400 h-5" style={{ minWidth }}></div>}
  </div>
);

const renderQuestionForStudentPrint = (question: Question, index: number, submission: Submission) => {
    const studentAnswer = submission.answers.find(a => a.questionId === question.id);
    const wasAnswered = !!studentAnswer;

    const CorrectnessIndicator = ({ isCorrect }: { isCorrect: boolean | null | undefined }) => {
        if (isCorrect === null || isCorrect === undefined) return null;
        if (isCorrect) {
            return <CheckCircle className="h-4 w-4 text-green-600 ml-2 shrink-0" />;
        }
        return <XCircle className="h-4 w-4 text-red-600 ml-2 shrink-0" />;
    };
  
    const getAnswerCorrectness = (q: Question, ans: Answer | undefined): boolean | null => {
        if (!ans) return null;
        
        switch (q.type) {
            case 'multiple-choice': {
                const correctOption = (q as MultipleChoiceQuestion).options.find(opt => opt.isCorrect);
                return !!correctOption && ans.value === correctOption.id;
            }
            case 'multiple-response': {
                const correctIds = (q as MultipleResponseQuestion).options.filter(o => o.isCorrect).map(o => o.id).sort();
                const studentIds = Array.isArray(ans.value) ? [...ans.value].sort() : [];
                return correctIds.length === studentIds.length && correctIds.every((id, i) => id === studentIds[i]);
            }
            case 'true-false-complex': {
                return ans.value === (q as TrueFalseComplexQuestion).isStatementTrue;
            }
            // Other types can be added here
            default:
                return null;
        }
    }

  return (
    <div key={question.id} className="mb-3 p-2 border border-gray-300 rounded-md question-block-print bg-white">
      <div className="flex justify-between items-start mb-1.5">
        <h3 className="text-sm font-semibold leading-tight flex items-start">
          <span className="mr-2">{index + 1}.</span>
          <span>{question.text}</span>
        </h3>
        <span className="text-xs font-medium text-gray-600 whitespace-nowrap ml-2">({question.points || 0} pts)</span>
      </div>

      {question.type === 'multiple-choice' && (
        <div className="space-y-1 pl-3">
          {(question as MultipleChoiceQuestion).options.map((opt, optIdx) => {
            const isStudentChoice = studentAnswer?.value === opt.id;
            return (
              <div key={opt.id} className="flex items-center text-xs">
                {isStudentChoice
                  ? (opt.isCorrect ? <CheckCircle className="h-3 w-3 text-green-600 mr-1.5 shrink-0"/> : <XCircle className="h-3 w-3 text-red-600 mr-1.5 shrink-0"/>)
                  : <div className="w-3 h-3 mr-1.5 shrink-0"/>
                }
                <span className={cn(isStudentChoice && "font-bold", opt.isCorrect ? "text-green-700" : (isStudentChoice ? "text-red-700" : ""))}>
                  {(String.fromCharCode(65 + optIdx))}. {opt.text}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {question.type === 'multiple-response' && (
        <div className="space-y-1 pl-3">
          <p className="text-2xs text-gray-500 mb-0.5">Tus respuestas están marcadas. Las respuestas correctas están en verde.</p>
          {(question as MultipleResponseQuestion).options.map((opt, optIdx) => {
             const isStudentChoice = Array.isArray(studentAnswer?.value) && studentAnswer.value.includes(opt.id);
             return(
                <div key={opt.id} className="flex items-center text-xs">
                    {isStudentChoice
                    ? (opt.isCorrect ? <CheckCircle className="h-3 w-3 text-green-600 mr-1.5 shrink-0"/> : <XCircle className="h-3 w-3 text-red-600 mr-1.5 shrink-0"/>)
                    : (opt.isCorrect ? <CheckCircle className="h-3 w-3 text-green-600/30 mr-1.5 shrink-0" /> : <div className="w-3 h-3 mr-1.5 shrink-0"/>)
                    }
                    <span className={cn(isStudentChoice && "font-bold", opt.isCorrect && "text-green-700", isStudentChoice && !opt.isCorrect && "text-red-700 line-through")}>
                       {(String.fromCharCode(65 + optIdx))}. {opt.text}
                    </span>
                </div>
             )
          })}
        </div>
      )}
      
       {question.type === 'free-text' && (
        <div className="mt-1.5 pl-3">
          <p className="text-2xs text-gray-500 mb-0.5">Tu respuesta:</p>
          <p className="p-2 border rounded-md bg-gray-50 text-xs whitespace-pre-wrap">{studentAnswer?.value as string || "(No respondida)"}</p>
        </div>
      )}

      {/* Add other question type renderings here as needed, showing student answer and correctness */}
      
    </div>
  );
};

const PDF_TOP_MARGIN = 15;
const PDF_BOTTOM_MARGIN = 15;
const PDF_HORIZONTAL_MARGIN = 10;
const PDF_PAGE_BREAK_BUFFER = 5; 

async function generateStudentPdfWithMargins(elementToCapture: HTMLElement, pdfFilename: string) {
    const canvas = await html2canvas(elementToCapture, {
        scale: 2,
        useCORS: true,
        logging: false,
        onclone: (documentClone) => {
            const clonedElement = documentClone.querySelector('.printable-area-student');
            if (clonedElement) {
                (clonedElement as HTMLElement).style.height = 'auto';
                (clonedElement as HTMLElement).style.maxHeight = 'none';
                (clonedElement as HTMLElement).style.overflow = 'visible';
                Array.from(clonedElement.querySelectorAll('*')).forEach(el => {
                    (el as HTMLElement).style.overflow = 'visible';
                    (el as HTMLElement).style.maxHeight = 'none';
                });
            }
        }
    });

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageHeight = pdf.internal.pageSize.getHeight();
    const pageWidth = pdf.internal.pageSize.getWidth();

    const contentWidth = pageWidth - PDF_HORIZONTAL_MARGIN * 2;
    const contentHeightPerPageForSegmentation = pageHeight - PDF_TOP_MARGIN - PDF_BOTTOM_MARGIN - PDF_PAGE_BREAK_BUFFER;
    
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    let yCanvasPosition = 0;
    let isFirstPage = true;

    while (yCanvasPosition < canvasHeight) {
        if (!isFirstPage) {
            pdf.addPage();
        }

        const sourceSegmentHeight = Math.min(
            canvasHeight - yCanvasPosition,
            (contentHeightPerPageForSegmentation * canvasWidth) / contentWidth
        );

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvasWidth;
        tempCanvas.height = sourceSegmentHeight;
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error("Failed to get 2D context from temp canvas");

        tempCtx.drawImage(
            canvas, 0, yCanvasPosition, canvasWidth, sourceSegmentHeight,
            0, 0, canvasWidth, sourceSegmentHeight
        );
        const pageImgData = tempCanvas.toDataURL('image/png');
        
        const currentPdfSegmentHeight = (sourceSegmentHeight * contentWidth) / canvasWidth;
        
        pdf.addImage(
            pageImgData, 'PNG',
            PDF_HORIZONTAL_MARGIN, PDF_TOP_MARGIN,
            contentWidth, currentPdfSegmentHeight
        );

        yCanvasPosition += sourceSegmentHeight;
        isFirstPage = false;
    }
    pdf.save(pdfFilename);
}


export function StudentExamPrintableView({ exam, submission, studentName }: StudentExamPrintableViewProps) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const printableAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    if (!printableAreaRef.current) {
      console.error("Printable area ref not found for student view.");
      return;
    }
    setIsDownloadingPdf(true);
    try {
      const sanitizedTitle = exam.title.replace(/[^a-zA-Z0-9_ ]/g, '').replace(/\s+/g, '_');
      await generateStudentPdfWithMargins(printableAreaRef.current, `copia_examen_${sanitizedTitle || exam.id}.pdf`);
    } catch (error) {
      console.error("Error generating PDF for student:", error);
      alert("Hubo un error al generar el PDF. Por favor, intenta de nuevo.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const totalPoints = exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <div ref={printableAreaRef} className="max-w-4xl mx-auto p-2 sm:p-6 bg-white text-gray-800 printable-area-student">
      <header className="mb-4 text-center">
        <h1 className="text-lg font-bold uppercase tracking-wide mb-1.5">{exam.title}</h1>
        {exam.description && <p className="text-xs text-gray-600 mb-2">{exam.description}</p>}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mb-1.5">
            <FillableLine label="ALUMNO/A" text={studentName || ""} minWidth="200px" className="text-sm" />
            <FillableLine label="FECHA DE ENVÍO" text={new Date(submission.submitted_at).toLocaleString('es-AR')} minWidth="80px" className="text-sm"/>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 items-end text-xs">
            <p><span className="font-semibold">PUNTAJE OBTENIDO:</span> {submission.score ?? 'N/A'} / {totalPoints} pts</p>
        </div>
      </header>
      <Separator className="my-3 border-gray-400" />

      <main>
        {exam.questions.map((q, idx) => renderQuestionForStudentPrint(q, idx, submission))}
      </main>

      <div className="mt-8 text-center no-print flex flex-col sm:flex-row justify-center items-center gap-3">
        <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Printer className="mr-2 h-5 w-5" /> Imprimir Copia
        </Button>
        <Button 
          onClick={handleDownloadPdf} 
          disabled={isDownloadingPdf}
          variant="outline"
          className="border-primary text-primary hover:bg-primary/10"
        >
          {isDownloadingPdf ? (
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          ) : (
            <Download className="mr-2 h-5 w-5" />
          )}
          {isDownloadingPdf ? "Generando PDF..." : "Descargar Copia en PDF"}
        </Button>
      </div>
    </div>
  );
}
