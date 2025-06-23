
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { signOutAction } from '@/lib/actions/auth.actions';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '../ui/button';

// Timeout de inactividad: 5 minutos (en milisegundos).
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;
// Diálogo de advertencia: 1 minuto (60 segundos) antes del timeout.
const WARNING_DIALOG_TIMEOUT = 60 * 1000;

export function SessionTimeoutManager({ children }: { children: React.ReactNode }) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_DIALOG_TIMEOUT / 1000);

  const { toast } = useToast();
  
  const idleTimer = useRef<NodeJS.Timeout>();
  const warningTimer = useRef<NodeJS.Timeout>();
  const countdownInterval = useRef<NodeJS.Timer>();

  const handleSignOut = useCallback(async () => {
    setShowWarning(false);
    clearInterval(countdownInterval.current);
    clearTimeout(idleTimer.current);
    clearTimeout(warningTimer.current);
    toast({
      title: "Sesión Cerrada",
      description: "Tu sesión ha sido cerrada por inactividad.",
    });
    await signOutAction();
  }, [toast]);

  const resetTimers = useCallback(() => {
    // Limpiar temporizadores existentes
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);

    setShowWarning(false);
    
    // Establecer un temporizador para mostrar el diálogo de advertencia
    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
      setCountdown(WARNING_DIALOG_TIMEOUT / 1000);
    }, INACTIVITY_TIMEOUT - WARNING_DIALOG_TIMEOUT);

    // Establecer el temporizador final para cerrar la sesión
    idleTimer.current = setTimeout(() => {
      handleSignOut();
    }, INACTIVITY_TIMEOUT);

  }, [handleSignOut]);

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const handleActivity = () => {
      resetTimers();
    };
    
    // Configurar los listeners de eventos
    events.forEach(event => window.addEventListener(event, handleActivity));
    
    // Iniciar los temporizadores al montar el componente
    resetTimers();

    // Limpiar al desmontar
    return () => {
      events.forEach(event => window.removeEventListener(event, handleActivity));
      clearTimeout(idleTimer.current);
      clearTimeout(warningTimer.current);
      clearInterval(countdownInterval.current);
    };
  }, [resetTimers]);

  useEffect(() => {
    if (showWarning) {
      countdownInterval.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownInterval.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(countdownInterval.current);
    }

    return () => clearInterval(countdownInterval.current);
  }, [showWarning]);

  return (
    <>
      {children}
      <AlertDialog open={showWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Sigues ahí?</AlertDialogTitle>
            <AlertDialogDescription>
              Tu sesión está a punto de cerrarse por inactividad. La sesión se cerrará automáticamente en {Math.floor(countdown / 60)}:{(countdown % 60).toString().padStart(2, '0')} segundos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button variant="outline" onClick={handleSignOut}>Cerrar Sesión</Button>
            <AlertDialogAction onClick={resetTimers}>Continuar Sesión</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
