import { useCallback, useRef, useState } from 'react';
import { checkPayment, checkoutPay } from '../lib/api';
import type { Schedule } from '../lib/types';

type Phase = 'idle' | 'polling' | 'success' | 'error';

interface Attempt {
  schedule: Schedule;
  email: string;
  payerName: string;
}

interface Options {
  onWaitingStart: () => void;
  onRegister: (prePaid: boolean) => void;
  onBackToSchedule: () => void;
}

const STATUS_MESSAGES: Record<string, string> = {
  rejected: 'Pagamento recusado pela operadora.',
  cancelled: 'Pagamento cancelado.',
  refunded: 'Pagamento estornado.',
};

// Ports proceedToCheckout / startPaymentMonitoring / showPaymentSuccessCountdown / showWaitingError from main.ts.
export function usePaymentCheckout({ onWaitingStart, onRegister, onBackToSchedule }: Options) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [countdown, setCountdown] = useState(5);
  const [errorMessage, setErrorMessage] = useState('');

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const windowRef = useRef<Window | null>(null);
  const lastAttemptRef = useRef<Attempt | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const stopCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const runSuccessCountdown = useCallback(() => {
    if (windowRef.current && !windowRef.current.closed) {
      windowRef.current.close();
      windowRef.current = null;
    }
    setPhase('success');
    let seconds = 5;
    setCountdown(seconds);
    countdownRef.current = setInterval(() => {
      seconds -= 1;
      setCountdown(seconds);
      if (seconds <= 0) {
        stopCountdown();
        onRegister(true);
      }
    }, 1000);
  }, [onRegister, stopCountdown]);

  const startPolling = useCallback(
    (email: string, scheduleId: number) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const data = await checkPayment(email, scheduleId);
          if (data.has_paid) {
            stopPolling();
            localStorage.removeItem('pending_payment_watch');
            if (data.pendencias && data.pendencias.length > 0) {
              localStorage.setItem('mp_payment_id', String(data.pendencias[0].payment_id));
            }
            runSuccessCountdown();
            return;
          }
          if (data.rejected) {
            stopPolling();
            localStorage.removeItem('pending_payment_watch');
            setErrorMessage(STATUS_MESSAGES[data.status ?? ''] ?? 'Pagamento não concluído.');
            setPhase('error');
          }
        } catch {
          console.error('Aguardando aprovação...');
        }
      }, 5000);
    },
    [runSuccessCountdown, stopPolling],
  );

  const proceedToCheckout = useCallback(
    async (schedule: Schedule, email: string, payerName: string) => {
      lastAttemptRef.current = { schedule, email, payerName };
      const scheduleId = schedule.schedule_id ?? schedule.id;
      if (!scheduleId) {
        alert('Erro: O ID do curso não foi encontrado. Selecione o curso novamente.');
        return;
      }

      const personId = localStorage.getItem('pending_person_id');
      const payload: { email: string; schedule_id: number; payer_name: string; person_id?: number } = {
        email,
        schedule_id: scheduleId,
        payer_name: payerName,
      };
      if (personId) payload.person_id = parseInt(personId, 10);

      const { status, ok, data } = await checkoutPay(payload);
      localStorage.removeItem('pending_person_id');

      if (status === 409 && data.error === 'ja_inscrito') {
        alert(data.mensagem ?? 'Você já está inscrito neste evento.');
        onBackToSchedule();
        return;
      }

      if (status === 402 && data.error === 'inscricao_pendente') {
        alert(data.mensagem ?? 'Pagamento identificado, conclua sua inscrição.');
        if (data.payment_id) localStorage.setItem('mp_payment_id', String(data.payment_id));
        onRegister(true);
        return;
      }

      if (ok && data.init_point) {
        localStorage.setItem('pending_payment_watch', JSON.stringify({ email, scheduleId }));
        setErrorMessage('');
        setPhase('polling');
        onWaitingStart();
        if (email) startPolling(email, scheduleId);
        windowRef.current = window.open(data.init_point, '_blank');
        return;
      }

      // Evento gratuito: backend confirma a inscrição de cara e devolve só o payment_id,
      // sem init_point — não há checkout do Mercado Pago para abrir.
      if (ok && data.payment_id && !data.init_point) {
        localStorage.setItem('mp_payment_id', String(data.payment_id));
        onRegister(true);
        return;
      }

      console.error('Erro MP:', data);
      alert('Erro no pagamento: ' + (data.error || 'Tente novamente.'));
    },
    [onBackToSchedule, onRegister, onWaitingStart, startPolling],
  );

  const retry = useCallback(() => {
    const attempt = lastAttemptRef.current;
    if (attempt) proceedToCheckout(attempt.schedule, attempt.email, attempt.payerName);
  }, [proceedToCheckout]);

  const cancel = useCallback(() => {
    stopPolling();
    stopCountdown();
    if (windowRef.current && !windowRef.current.closed) windowRef.current.close();
    windowRef.current = null;
    setPhase('idle');
  }, [stopCountdown, stopPolling]);

  return { phase, countdown, errorMessage, proceedToCheckout, retry, cancel };
}
