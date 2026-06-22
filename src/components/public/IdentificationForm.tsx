import { useState } from 'react';
import { checkPayment, generateOtpCode } from '../../lib/api';
import { getScheduleSummary, validateEmail, validateFullName, validatePhone } from '../../lib/format';
import type { Schedule } from '../../lib/types';

interface IdentificationFormProps {
  schedule: Schedule;
  name: string;
  phone: string;
  email: string;
  onChange: (fields: { name: string; phone: string; email: string }) => void;
  onOtpSent: () => void;
  onPrePaidRegister: () => void;
  onBack: () => void;
}

export default function IdentificationForm({
  schedule,
  name,
  phone,
  email,
  onChange,
  onOtpSent,
  onPrePaidRegister,
  onBack,
}: IdentificationFormProps) {
  const [sending, setSending] = useState(false);
  const summary = getScheduleSummary(schedule);
  const scheduleId = schedule.schedule_id ?? schedule.id;

  const handleSend = async () => {
    if (!validateFullName(name)) {
      alert('Por favor, informe seu nome completo (nome e sobrenome).');
      return;
    }
    if (!validatePhone(phone)) {
      alert('Por favor, informe um telefone válido (DDD + número).');
      return;
    }
    if (!validateEmail(email)) {
      alert('Por favor, insira um e-mail válido.');
      return;
    }
    if (!scheduleId) {
      alert('Erro: Selecione um evento na agenda primeiro.');
      return;
    }

    setSending(true);
    try {
      // REQ-006: a pre-existing approved payment for this email skips the OTP step entirely.
      const result = await checkPayment(email, scheduleId);
      if (result.has_paid && result.pendencias && result.pendencias.length > 0) {
        localStorage.setItem('mp_payment_id', String(result.pendencias[0].payment_id));
        alert('Foi Identificado um pagamento aprovado e vinculado a este email, por favor conclua sua inscrição!');
        onPrePaidRegister();
        return;
      }

      const otpRes = await generateOtpCode(email, name, phone);
      if (otpRes.ok) {
        alert('Enviamos um código de 6 dígitos para o seu e-mail.');
        onOtpSent();
      }
    } catch (error) {
      console.error('Erro no check-payment:', error);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="max-w-md mx-auto bg-surface-light p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-100 space-y-6">
      <h2 className="text-2xl font-bold text-center text-slate-900">Identificação do Comprador</h2>
      <p className="text-base font-bold text-center text-slate-500">{summary}</p>
      <div className="space-y-4">
        <input
          type="text"
          placeholder="Nome Completo"
          value={name}
          onChange={(e) => onChange({ name: e.target.value, phone, email })}
          className="w-full border rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-brand outline-none"
        />
        <input
          type="tel"
          placeholder="WhatsApp (DDD + Número)"
          value={phone}
          onChange={(e) => onChange({ name, phone: e.target.value, email })}
          className="w-full border rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-brand outline-none"
        />
        <input
          type="email"
          placeholder="Seu melhor e-mail"
          value={email}
          onChange={(e) => onChange({ name, phone, email: e.target.value })}
          className="w-full border rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-brand outline-none"
        />
        <button
          disabled={sending}
          onClick={handleSend}
          className="w-full bg-brand text-white font-bold py-4 rounded-xl hover:bg-brand-hover transition-all shadow-lg disabled:opacity-60"
        >
          {sending ? 'Verificando...' : 'Validar E-mail e Prosseguir →'}
        </button>
      </div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors font-medium"
      >
        ← Voltar para a agenda
      </button>
    </section>
  );
}
