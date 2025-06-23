
"use client";

import type { Exam, Question, MultipleChoiceQuestion, MultipleResponseQuestion, TrueFalseJustificationQuestion, TrueFalseComplexQuestion, ArgumentReconstructionQuestion, ClozeQuestion, WeightedChoiceQuestion } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Download, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import React, { useState, useRef, useEffect } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { StudentExamPrintableView } from '@/components/student/StudentExamPrintableView';

interface PrintableViewProps {
  exam: Exam;
}

const FillableLine = ({ label, text, minWidth = '150px', className = '' }: { label: string, text?: string, minWidth?: string, className?: string }) => (
  <div className={`flex items-end mb-1.5 text-xs ${className}`}>
    <span className="font-semibold mr-2 whitespace-nowrap">{label}:</span>
    {text ? <span className="border-b border-gray-400 h-5 px-1">{text}</span> : <div className="flex-grow border-b border-gray-400 h-5" style={{ minWidth }}></div>}
  </div>
);

const renderQuestionForPrint = (question: Question, index: number) => {
  return (
    <div key={question.id} className="mb-3 p-2 border border-gray-300 rounded-md question-block-print bg-white">
      <div className="flex justify-between items-start mb-1.5">
        <h3 className="text-sm font-semibold leading-tight">
          {index + 1}. {question.text}
        </h3>
        <span className="text-xs font-medium text-gray-600 whitespace-nowrap ml-2">({question.points || 0} pts)</span>
      </div>

      {question.type === 'multiple-choice' && (
        <div className="space-y-1 pl-3">
          {(question as MultipleChoiceQuestion).options.map((opt, optIdx) => (
            <div key={opt.id} className="flex items-center text-xs">
              <span className="mr-1.5 font-mono">{(String.fromCharCode(65 + optIdx))}.</span>
              <span>{opt.text}</span>
              {opt.isCorrect && <CheckCircle className="h-3 w-3 text-green-600 ml-2" />}
            </div>
          ))}
        </div>
      )}

      {question.type === 'multiple-response' && (
        <div className="space-y-1 pl-3">
          <p className="text-2xs text-gray-500 mb-0.5">Marque todas las opciones correctas.</p>
          {(question as MultipleResponseQuestion).options.map((opt, optIdx) => (
            <div key={opt.id} className="flex items-center text-xs">
              <span className="mr-1.5 font-mono">{(String.fromCharCode(65 + optIdx))}.</span>
              <span>{opt.text}</span>
              {opt.isCorrect && <CheckCircle className="h-3 w-3 text-green-600 ml-2" />}
            </div>
          ))}
        </div>
      )}
      
      {question.type === 'weighted-choice' && (
        <div className="space-y-1 pl-3">
          {(question as WeightedChoiceQuestion).options.map((opt, optIdx) => (
            <div key={opt.id} className="flex items-center text-xs">
              <span className="mr-1.5 font-mono">{(String.fromCharCode(65 + optIdx))}.</span>
              <span>{opt.text} ({opt.percentage}%)</span>
              {opt.percentage > 0 && <CheckCircle className="h-3 w-3 text-green-500 ml-1" />}
              {opt.percentage < 0 && <XCircle className="h-3 w-3 text-red-500 ml-1" />}
            </div>
          ))}
          <p className="text-2xs text-gray-500 mt-0.5">{(question as WeightedChoiceQuestion).allowMultipleSelections ? "Se permite selección múltiple." : "Solo se permite una selección."}</p>
        </div>
      )}

      {question.type === 'free-text' && (
        <div className="mt-1.5 space-y-1 pl-3">
          <p className="text-2xs text-gray-500 mb-0.5">Espacio para respuesta:</p>
          {[...Array(3)].map((_, i) => ( 
            <div key={i} className="w-full border-b border-gray-400 h-5"></div>
          ))}
        </div>
      )}

      {question.type === 'argument-reconstruction' && (
        <div className="pl-3">
          <p className="text-2xs text-gray-500 mb-0.5">Ordene los siguientes ítems (Premisas primero, luego Conclusión, luego Distractores):</p>
          {(question as ArgumentReconstructionQuestion).items.map((item, itemIdx) => {
            let itemLabel = "Ítem";
            const correctOrder = (question as ArgumentReconstructionQuestion).correctOrder || [];
            const orderIndex = correctOrder.indexOf(item.id);
            if (orderIndex === 0) itemLabel = "Premisa 1";
            else if (orderIndex === 1) itemLabel = "Premisa 2";
            else if (orderIndex === 2) itemLabel = "Conclusión";
            else if (orderIndex > 2) itemLabel = `Distractor ${orderIndex - 2}`;
            
            return(
                <div key={item.id} className="flex items-center mb-0.5 text-xs">
                <span className="mr-1.5 font-mono bg-gray-100 px-1 py-0.5 rounded-sm">{String.fromCharCode(65 + itemIdx)}.</span>
                <span>{item.text} <em className="text-gray-500 text-2xs">({itemLabel})</em></span>
                </div>
            );
          })}
          <div className="mt-2 space-y-0.5">
             <FillableLine label="Orden Correcto" text={(question as ArgumentReconstructionQuestion).correctOrder?.map((id, idx) => {
                const item = (question as ArgumentReconstructionQuestion).items.find(i => i.id === id);
                const charCode = (question as ArgumentReconstructionQuestion).items.findIndex(i => i.id === id);
                return item ? `${String.fromCharCode(65 + charCode)}` : '';
             }).join(', ')} minWidth="150px"/>
          </div>
        </div>
      )}

      {question.type === 'true-false-justification' && (
        <div className="pl-3 space-y-1 text-xs">
          <p>
            <span className="font-semibold">Afirmación:</span> {(question as TrueFalseJustificationQuestion).affirmation}
            <span className="font-bold text-blue-600 ml-1">({(question as TrueFalseJustificationQuestion).isAffirmationTrue ? 'V' : 'F'})</span>
          </p>
          <p className="text-2xs text-gray-500 mt-0.5">Justificaciones:</p>
          {(question as TrueFalseJustificationQuestion).justificationOptions.map((opt, optIdx) => (
             <div key={opt.id} className="flex items-center ml-3">
              <span className="mr-1.5 font-mono">{(String.fromCharCode(65 + optIdx))}.</span>
              <span>{opt.text}</span>
              {opt.isCorrect && <CheckCircle className="h-3 w-3 text-green-600 ml-2" />}
            </div>
          ))}
        </div>
      )}

      {question.type === 'true-false-complex' && (
         <div className="pl-3 space-y-1 text-xs">
          <p>
            <span className="font-semibold">Enunciado:</span> {(question as TrueFalseComplexQuestion).statement}
            <span className="font-bold text-blue-600 ml-1">({(question as TrueFalseComplexQuestion).isStatementTrue ? 'V' : 'F'})</span>
          </p>
        </div>
      )}

      {question.type === 'cloze' && (
        <div className="pl-3">
          <p className="text-xs leading-relaxed mb-1">
            {(question as ClozeQuestion).textWithPlaceholders.replace(/\{([^}]+)\}/g, (match, placeholderLabel) => {
              const subQ = (question as ClozeQuestion).subQuestions.find(sq => sq.placeholderLabel === placeholderLabel);
              if (subQ) {
                let correctAnswerText = "";
                if (subQ.type === "short-answer" || subQ.type === "numerical") {
                  correctAnswerText = String(subQ.correctAnswer || "N/A");
                } else if (subQ.type === "multiple-choice" && subQ.options) {
                  const correctOpt = subQ.options.find(o => o.isCorrect || (o.percentage && o.percentage > 0));
                  correctAnswerText = correctOpt ? correctOpt.text : "N/A";
                }
                return ` ${match}[${correctAnswerText}](${subQ.points} pts) `;
              }
              return match; 
            })}
          </p>
        </div>
      )}
            
      {question.feedback && (
        <p className="mt-1.5 text-2xs text-blue-600 pl-3">Feedback (docente): {question.feedback}</p>
      )}
    </div>
  );
};

const PDF_TOP_MARGIN = 15;
const PDF_BOTTOM_MARGIN = 15;
const PDF_HORIZONTAL_MARGIN = 10;
const PDF_PAGE_BREAK_BUFFER = 5; // 5mm buffer to reduce text cutoff

async function generatePdfWithMargins(elementToCapture: HTMLElement, pdfFilename: string) {
    const canvas = await html2canvas(elementToCapture, {
        scale: 2,
        useCORS: true,
        logging: false, 
        onclone: (documentClone) => {
            const clonedElement = documentClone.querySelector(`.${elementToCapture.classList.contains('printable-area-student') ? 'printable-area-student' : 'printable-area'}`);
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
    const contentHeightPerPageForSegmentation = pageHeight - PDF_TOP_MARGIN - PDF_BOTTOM_MARGIN - PDF_PAGE_BREAK_BUFFER; // Adjusted for buffer
    const actualContentHeightPerPage = pageHeight - PDF_TOP_MARGIN - PDF_BOTTOM_MARGIN;


    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    let yCanvasPosition = 0;
    let isFirstPage = true;

    while (yCanvasPosition < canvasHeight) {
        if (!isFirstPage) {
            pdf.addPage();
        }

        // Calculate how much of the canvas height corresponds to one PDF page's content area (with buffer)
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
        
        // Calculate the height this segment will occupy in the PDF (scaled to contentWidth)
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


export function PrintableView({ exam }: PrintableViewProps) {
  const [isDownloadingTeacherPdf, setIsDownloadingTeacherPdf] = useState(false);
  const [isGeneratingStudentPdf, setIsGeneratingStudentPdf] = useState(false);
  const [renderStudentViewForPdf, setRenderStudentViewForPdf] = useState(false);
  
  const teacherPrintableAreaRef = useRef<HTMLDivElement>(null);
  const hiddenStudentViewContainerRef = useRef<HTMLDivElement>(null);

  const handleDownloadTeacherPdf = async () => {
    if (!teacherPrintableAreaRef.current) return;
    setIsDownloadingTeacherPdf(true);
    try {
      const sanitizedTitle = exam.title.replace(/[^a-zA-Z0-9_ ]/g, '').replace(/\s+/g, '_');
      await generatePdfWithMargins(teacherPrintableAreaRef.current, `examen_docente_${sanitizedTitle || exam.id}.pdf`);
    } catch (error) {
      console.error("Error generating teacher PDF:", error);
      alert("Hubo un error al generar el PDF del docente.");
    } finally {
      setIsDownloadingTeacherPdf(false);
    }
  };

  const handleDownloadStudentPdfFromTeacherView = async () => {
    setIsGeneratingStudentPdf(true);
    setRenderStudentViewForPdf(true);
  };

  useEffect(() => {
    if (renderStudentViewForPdf && hiddenStudentViewContainerRef.current) {
      const generateStudentPdf = async () => {
        const studentPrintableElement = hiddenStudentViewContainerRef.current?.querySelector('.printable-area-student');
        if (!studentPrintableElement) {
          console.error("Student printable area element not found in hidden view for teacher.");
          setIsGeneratingStudentPdf(false);
          setRenderStudentViewForPdf(false);
          alert("Error: No se pudo encontrar el área de impresión del alumno para generar el PDF.");
          return;
        }

        try {
          const sanitizedTitle = exam.title.replace(/[^a-zA-Z0-9_ ]/g, '').replace(/\s+/g, '_');
          await generatePdfWithMargins(studentPrintableElement as HTMLElement, `examen_alumno_${sanitizedTitle || exam.id}.pdf`);
        } catch (error) {
          console.error("Error generating student PDF from teacher view:", error);
          alert("Hubo un error al generar el PDF para el alumno.");
        } finally {
          setIsGeneratingStudentPdf(false);
          setRenderStudentViewForPdf(false);
        }
      };
      
      const timeoutId = setTimeout(generateStudentPdf, 100); 
      return () => clearTimeout(timeoutId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderStudentViewForPdf, exam]);


  const totalPoints = exam.questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <>
      <div ref={teacherPrintableAreaRef} className="max-w-4xl mx-auto p-2 sm:p-6 bg-white text-gray-800 printable-area">
        <header className="mb-4 text-center">
          <div className="grid grid-cols-2 gap-x-4 mb-2">
            <FillableLine label="INSTITUCIÓN" minWidth="200px" className="text-sm" />
            <FillableLine label="ASIGNATURA/CURSO" minWidth="180px" className="text-sm" />
          </div>
          <h1 className="text-lg font-bold uppercase tracking-wide mb-1.5">{exam.title}</h1>
          {exam.description && <p className="text-xs text-gray-600 mb-2">{exam.description}</p>}
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 mb-1.5">
              <FillableLine label="ALUMNO/A" minWidth="200px" className="text-sm" />
              <FillableLine label="DNI/LEGAJO" minWidth="120px" className="text-sm" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 items-end text-xs">
              <FillableLine label="FECHA" minWidth="80px" />
              <p className="mt-1 sm:mt-0"><span className="font-semibold">DURACIÓN:</span> {exam.durationMinutes} min</p>
              <p className="mt-1 sm:mt-0"><span className="font-semibold">PUNTAJE TOTAL:</span> {totalPoints} pts</p>
          </div>
        </header>
        <Separator className="my-3 border-gray-400" />

        <main>
          {exam.questions.map((q, idx) => renderQuestionForPrint(q, idx))}
        </main>

        <div className="mt-8 text-center no-print flex flex-col sm:flex-row justify-center items-center gap-3">
          <Button 
            onClick={handleDownloadTeacherPdf} 
            disabled={isDownloadingTeacherPdf || isGeneratingStudentPdf}
            variant="outline"
            className="border-primary text-primary hover:bg-primary/10"
          >
            {isDownloadingTeacherPdf ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Download className="mr-2 h-5 w-5" />
            )}
            {isDownloadingTeacherPdf ? "Generando PDF Docente..." : "Descargar PDF (Docente)"}
          </Button>
          <Button 
            onClick={handleDownloadStudentPdfFromTeacherView} 
            disabled={isGeneratingStudentPdf || isDownloadingTeacherPdf}
            variant="outline"
            className="border-green-600 text-green-700 hover:bg-green-600/10"
          >
            {isGeneratingStudentPdf ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Download className="mr-2 h-5 w-5" />
            )}
            {isGeneratingStudentPdf ? "Generando PDF Alumno..." : "Descargar PDF (Alumno)"}
          </Button>
        </div>
      </div>

      {renderStudentViewForPdf && (
        <div ref={hiddenStudentViewContainerRef} style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '210mm', background: 'white' }}>
          <StudentExamPrintableView exam={exam} studentDni={undefined} studentName={undefined} />
        </div>
      )}
    </>
  );
}
