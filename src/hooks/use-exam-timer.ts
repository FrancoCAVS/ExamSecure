"use client";

import { useState, useEffect, useCallback } from 'react';

interface UseExamTimerProps {
  durationMinutes: number;
  onTimerEnd?: () => void;
}

export function useExamTimer({ durationMinutes, onTimerEnd }: UseExamTimerProps) {
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60); // Time in seconds
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;

    if (timeLeft <= 0) {
      setIsRunning(false);
      onTimerEnd?.();
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [timeLeft, isRunning, onTimerEnd]);

  const startTimer = useCallback(() => {
    setTimeLeft(durationMinutes * 60); // Reset timer if called again
    setIsRunning(true);
  }, [durationMinutes]);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  const formattedTime = (): string => {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  return {
    timeLeft, // in seconds
    formattedTime: formattedTime(),
    isRunning,
    startTimer,
    stopTimer,
  };
}
