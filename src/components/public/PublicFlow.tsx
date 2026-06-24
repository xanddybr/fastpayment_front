import { useEffect, useState } from 'react';
import { validatePayment } from '../../lib/api';
import { usePaymentCheckout } from '../../hooks/usePaymentCheckout';
import type { Schedule, Step } from '../../lib/types';
import ScheduleList from './ScheduleList';
import IdentificationForm from './IdentificationForm';
import OtpForm from './OtpForm';
import PaymentWaiting from './PaymentWaiting';
import RegistrationForm from './RegistrationForm';

// Mobile browsers often kill the tab in the background when the user switches apps
// (e.g. to check the OTP email) and reload it on return, wiping React state.
// Persisting step/schedule/identification lets the in-progress form survive that reload.
const RESTORABLE_STEPS: Step[] = ['auth', 'otp', 'registration'];

const readStoredSchedule = (): Schedule | null => {
  try {
    const raw = localStorage.getItem('selectedSchedule');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const readStoredIdentification = () => {
  try {
    const raw = sessionStorage.getItem('pf_identification');
    return raw ? JSON.parse(raw) : { name: '', phone: '', email: '' };
  } catch {
    return { name: '', phone: '', email: '' };
  }
};

const readStoredStep = (): Step => {
  const stored = sessionStorage.getItem('pf_step') as Step | null;
  return stored && RESTORABLE_STEPS.includes(stored) && readStoredSchedule() ? stored : 'selection';
};

export default function PublicFlow() {
  const [step, setStep] = useState<Step>(readStoredStep);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(readStoredSchedule);
  const [identification, setIdentification] = useState(readStoredIdentification);

  useEffect(() => {
    sessionStorage.setItem('pf_step', step);
  }, [step]);

  useEffect(() => {
    sessionStorage.setItem('pf_identification', JSON.stringify(identification));
  }, [identification]);

  const { phase, countdown, errorMessage, proceedToCheckout, retry, cancel } = usePaymentCheckout({
    onWaitingStart: () => setStep('waiting'),
    onRegister: () => setStep('registration'),
    onBackToSchedule: () => goBackToSchedule(),
  });

  function goBackToSchedule() {
    localStorage.removeItem('selectedSchedule');
    localStorage.removeItem('mp_payment_id');
    localStorage.removeItem('pending_payment_watch');
    sessionStorage.removeItem('mp_success_flag');
    sessionStorage.removeItem('pf_step');
    sessionStorage.removeItem('pf_identification');
    cancel();
    setSelectedSchedule(null);
    setIdentification({ name: '', phone: '', email: '' });
    setStep('selection');
  }

  // ✅ Validação segura do pagamento via backend — mirrors the MP-redirect detection
  // that used to live at the top of handleRouting() in main.ts.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPaymentId = params.get('payment_id') || params.get('collection_id');
    const mpStatus = params.get('status') || params.get('collection_status');
    if (!urlPaymentId || (mpStatus !== 'approved' && mpStatus !== 'success')) return;

    window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);

    (async () => {
      try {
        const { ok, result } = await validatePayment(urlPaymentId);
        if (ok && result.valid && result.subscription_status === 'pending') {
          localStorage.setItem('mp_payment_id', urlPaymentId);
          localStorage.setItem('selectedSchedule', JSON.stringify(result.event));
          setSelectedSchedule(result.event);
          setStep('registration');
          return;
        }
        if (result.subscription_status === 'confirmed') {
          alert('Esta inscrição já foi finalizada!');
        }
      } catch (err) {
        console.error('Erro ao validar pagamento:', err);
      }
    })();
  }, []);

  const selectEvent = (item: Schedule) => {
    localStorage.setItem('selectedSchedule', JSON.stringify(item));
    setSelectedSchedule(item);
    setStep('auth');
  };

  return (
    <main className="w-full max-w-6xl mx-auto p-4 md:p-8 min-h-screen">
      {step === 'selection' && <ScheduleList onSelect={selectEvent} />}

      {step === 'auth' && selectedSchedule && (
        <IdentificationForm
          schedule={selectedSchedule}
          name={identification.name}
          phone={identification.phone}
          email={identification.email}
          onChange={setIdentification}
          onOtpSent={() => setStep('otp')}
          onPrePaidRegister={() => setStep('registration')}
          onBack={goBackToSchedule}
        />
      )}

      {step === 'otp' && selectedSchedule && (
        <OtpForm
          schedule={selectedSchedule}
          name={identification.name}
          phone={identification.phone}
          email={identification.email}
          onVerified={() => proceedToCheckout(selectedSchedule, identification.email, identification.name)}
        />
      )}

      {step === 'waiting' && (
        <PaymentWaiting phase={phase} countdown={countdown} errorMessage={errorMessage} onRetry={retry} onCancel={goBackToSchedule} />
      )}

      {step === 'registration' && selectedSchedule && (
        <RegistrationForm schedule={selectedSchedule} onDone={goBackToSchedule} />
      )}
    </main>
  );
}
