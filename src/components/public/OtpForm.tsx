import { useState } from 'react';
import { validateOtpCode } from '../../lib/api';
import { getScheduleSummary } from '../../lib/format';
import type { Schedule } from '../../lib/types';

interface OtpFormProps {
  schedule: Schedule;
  name: string;
  phone: string;
  email: string;
  onVerified: () => Promise<void> | void;
}

export default function OtpForm({ schedule, name, phone, email, onVerified }: OtpFormProps) {
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const summary = getScheduleSummary(schedule);

  const handleVerify = async () => {
    if (!code || code.trim().length < 6) {
      alert('Por favor, insira o código de 6 dígitos enviado ao seu e-mail.');
      return;
    }

    setVerifying(true);
    try {
      const res = await validateOtpCode(email, code.trim(), name, phone);
      if (res.ok) {
        const data = await res.json();
        if (data.person_id) localStorage.setItem('pending_person_id', String(data.person_id));
        await onVerified();
      } else {
        const data = await res.json();
        alert(data.mensagem || data.error || 'Código inválido ou expirado.');
      }
    } catch (e) {
      console.error('Erro na validação do código:', e);
      alert('Erro ao conectar com o servidor.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <section className="max-w-md mx-auto bg-surface-light p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-100 space-y-6">
      <h2 className="text-lg font-bold text-center text-slate-500">Insira o codigo recebido em seu email</h2>
      <p className="text-base font-bold text-center text-slate-500">{summary}</p>
      <div className="space-y-4">
        <input
          type="text"
          maxLength={6}
          placeholder="000000"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full text-center text-4xl font-black border rounded-xl p-3 text-slate-900 tracking-widest focus:ring-2 focus:ring-brand outline-none"
        />
        <button
          disabled={verifying}
          onClick={handleVerify}
          className="w-full bg-brand text-white font-bold py-4 rounded-xl hover:bg-brand-hover transition-all shadow-lg disabled:opacity-60"
        >
          {verifying ? 'Validando...' : 'Verificar Código'}
        </button>
      </div>
    </section>
  );
}
