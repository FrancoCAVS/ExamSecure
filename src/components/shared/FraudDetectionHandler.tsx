
"use client";

import { useEffect, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";

interface FraudDetectionHandlerProps {
  onFraudAttempt?: (type: 'copy' | 'paste' | 'focusLost') => void;
  enabled?: boolean;
}

export function FraudDetectionHandler({ onFraudAttempt, enabled = true }: FraudDetectionHandlerProps) {
  const { toast } = useToast();

  const handleCopy = useCallback((event: ClipboardEvent) => {
    if (!enabled) return;
    toast({
      title: "Advertencia: Copia Detectada",
      description: "Se ha detectado un intento de copiar contenido. Esta acción puede ser registrada.",
      variant: "destructive",
    });
    onFraudAttempt?.('copy');
  }, [toast, onFraudAttempt, enabled]);

  const handlePaste = useCallback((event: ClipboardEvent) => {
    if (!enabled) return;
    event.preventDefault(); // Prevent the paste action
    toast({
      title: "Advertencia: Pegado Deshabilitado",
      description: "La acción de pegar está deshabilitada durante el examen. Esta acción puede ser registrada.",
      variant: "destructive",
    });
    onFraudAttempt?.('paste');
  }, [toast, onFraudAttempt, enabled]);

  const handleFocusLost = useCallback(() => {
    if (!enabled) return;
    // The specific toast for auto-submit or warning will be handled by ExamTakingInterface
    // based on exam.auto_submit_on_focus_loss
    onFraudAttempt?.('focusLost');
  }, [onFraudAttempt, enabled]);


  const handleVisibilityChange = useCallback(() => {
    if (!enabled) return;
    if (document.hidden) {
      handleFocusLost();
    }
  }, [enabled, handleFocusLost]);
  
  const handleBlur = useCallback(() => {
    if (!enabled) return;
    handleFocusLost();
  }, [enabled, handleFocusLost]);


  useEffect(() => {
    if (!enabled) return () => {};

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);


    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleCopy, handlePaste, handleVisibilityChange, handleBlur, enabled]);

  return null; 
}
