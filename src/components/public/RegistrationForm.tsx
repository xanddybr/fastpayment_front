import { useRef, useState } from 'react';
import { submitRegistration } from '../../lib/api';
import { getDayName } from '../../lib/format';
import type { RegistrationPayload, Schedule } from '../../lib/types';

interface RegistrationFormProps {
  schedule: Schedule;
  onDone: () => void;
}

export default function RegistrationForm({ schedule, onDone }: RegistrationFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const dataRef = schedule.scheduled_at;
  const dataObjeto = dataRef ? new Date(dataRef.replace(/-/g, '/')) : null;
  const scheduleId = schedule.schedule_id ?? schedule.id;
  const isFree = parseFloat(String(schedule.event_price)) === 0;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const paymentId = localStorage.getItem('mp_payment_id');

    if (!scheduleId) {
      alert('Erro: O ID do evento sumiu. Por favor, selecione o curso novamente.');
      return;
    }
    if (!paymentId) {
      alert('Erro: ID do pagamento não encontrado. Aguarde alguns segundos e tente novamente.');
      return;
    }

    const formData = new FormData(formRef.current!);
    const data = Object.fromEntries(formData);

    const payload: RegistrationPayload = {
      student_full_name: data.student_full_name,
      student_phone: data.student_phone,
      activity_professional: data.activity_professional,
      neighborhood: data.neighborhood,
      city: data.city,
      schedule_id: scheduleId,
      payment_id: paymentId,
      is_medium: data.is_medium ? 1 : 0,
      is_tule_member: data.is_tule_member ? 1 : 0,
      first_time: data.first_time ? 1 : 0,
      religion_mention: data.religion_mention,
      course_reason: data.course_reason,
      who_recomended: data.who_recomended,
    };

    setSubmitting(true);
    try {
      const { ok, result } = await submitRegistration(payload);
      if (ok) {
        localStorage.removeItem('mp_payment_id');
        sessionStorage.removeItem('mp_success_flag');
        localStorage.removeItem('selectedSchedule');
        alert('Sua vaga está garantida e a inscrição foi confirmada!');
        onDone();
      } else {
        alert('Erro ao confirmar inscrição: ' + (result.mensagem || 'Verifique os dados.'));
        setSubmitting(false);
      }
    } catch {
      alert('Erro de conexão com o servidor.');
      setSubmitting(false);
    }
  };

  return (
    <section className="max-w-3xl mx-auto space-y-8 pb-20">
      <div className="text-center mb-8">
        <span className="bg-green-500/10 text-green-500 px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-green-500/20">
          {isFree ? 'Inscrição Gratuita' : 'Pagamento Identificado'}
        </span>
        <h2 className="text-4xl font-black text-white mt-4">Conclua sua Inscrição</h2>
        <p className="text-slate-500">Confira os dados do evento, e complete informações do aluno.</p>
      </div>

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-surface-dark p-6 sm:p-8 rounded-[2.5rem] shadow-xl text-white">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center text-sm font-bold">
              1
            </span>
            <h3 className="font-black uppercase text-sm tracking-widest text-brand-light">Detalhes da Inscrição</h3>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-slate-400">Você esta realizando a inscrição para:</p>
            <h4 className="text-2xl font-black">{schedule.event_name || 'Evento'}</h4>
            <div className="flex flex-wrap gap-3 mt-4">
              <span className="bg-white/10 px-3 py-1 rounded-lg text-[10px] font-bold uppercase border border-white/5">
                {schedule.type_name || 'Geral'}
              </span>
              <span className="bg-white/10 px-3 py-1 rounded-lg text-[10px] font-bold uppercase border border-white/5">
                {schedule.unit_name || 'Unidade'}
              </span>
            </div>
            {dataObjeto && (
              <p className="text-sm text-slate-300 mt-4 flex items-center gap-2 font-medium">
                <span className="mr-2">📅</span> {getDayName(dataRef)}, {dataObjeto.toLocaleDateString('pt-BR')} às{' '}
                {dataObjeto.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h
              </p>
            )}
          </div>
        </div>

        <div className="bg-surface-light p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center text-sm font-bold">
              2
            </span>
            <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Informações do Aluno</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Nome Completo do Aluno</label>
              <input
                type="text"
                name="student_full_name"
                required
                placeholder="Nome de quem fará o curso"
                className="w-full border-2 border-slate-100 rounded-2xl p-4 text-slate-900 outline-none focus:border-brand transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">WhatsApp do Aluno</label>
              <input
                type="tel"
                name="student_phone"
                required
                placeholder="(00) 00000-0000"
                className="w-full border-2 border-slate-100 rounded-2xl p-4 text-slate-900 outline-none focus:border-brand transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Profissão / Atividade</label>
              <input
                type="text"
                name="activity_professional"
                required
                className="w-full border-2 border-slate-100 rounded-2xl p-4 text-slate-900 outline-none focus:border-brand transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Bairro</label>
              <input
                type="text"
                name="neighborhood"
                required
                className="w-full border-2 border-slate-100 rounded-2xl p-4 text-slate-900 outline-none focus:border-brand transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Cidade</label>
              <input
                type="text"
                name="city"
                required
                className="w-full border-2 border-slate-100 rounded-2xl p-4 text-slate-900 outline-none focus:border-brand transition-all"
              />
            </div>
          </div>
        </div>

        <div className="bg-surface-light p-6 sm:p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-3 mb-6">
            <span className="w-8 h-8 bg-brand text-white rounded-full flex items-center justify-center text-sm font-bold">
              3
            </span>
            <h3 className="font-black text-slate-800 uppercase text-sm tracking-widest">Anamnesis</h3>
          </div>

          <div className="space-y-6 text-slate-900">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-center p-4 border-2 border-slate-50 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all">
                <input type="checkbox" name="is_medium" value="1" className="w-5 h-5 accent-brand mr-3" />
                <span className="text-sm font-bold text-slate-700">Sou Médium</span>
              </label>
              <label className="flex items-center p-4 border-2 border-slate-50 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all">
                <input type="checkbox" name="is_tule_member" value="1" className="w-5 h-5 accent-brand mr-3" />
                <span className="text-sm font-bold text-slate-700">Membro TULE</span>
              </label>
              <label className="flex items-center p-4 border-2 border-slate-50 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all">
                <input type="checkbox" name="first_time" value="1" className="w-5 h-5 accent-brand mr-3" />
                <span className="text-sm font-bold text-slate-700">Minha primeira vez</span>
              </label>
              <label className="flex items-center p-4 border-2 border-slate-50 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all">
                <select name="religion_mention" defaultValue="não informado" className="accent-brand mr-3 w-full bg-transparent">
                  <option value="não informado">Como me identifico como ? </option>
                  <option value="Agnóstico">Agnóstico</option>
                  <option value="Cético">Cético</option>
                  <option value="Ateu">Ateu</option>
                  <option value="Espiritualista">Espiritualista</option>
                  <option value="Matrizes Africanas">Cultuo ritos de matrizes Africanas</option>
                  <option value="Linhas do Oriente">Cultuo Linhas do Oriente</option>
                  <option value="Universalista">Universalista</option>
                  <option value="Protestante">Protestante</option>
                  <option value="Cristianismo">Seguidor do Cristianismo</option>
                  <option value="Judio">Judio</option>
                </select>
              </label>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                O que motivo fazer este curso? / "O que te motivou a fazer este curso?"
              </label>
              <textarea
                name="course_reason"
                rows={3}
                required
                placeholder="Motivo.."
                className="w-full border-2 border-slate-100 rounded-2xl p-4 text-slate-900 outline-none focus:border-brand transition-all"
              />
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase ml-2">
                Indicação? / "Quem te recomendou este curso"
              </label>
              <input
                name="who_recomended"
                placeholder="Recomendado por quem?"
                className="w-full border-2 border-slate-100 rounded-2xl p-4 text-slate-900 outline-none focus:border-brand transition-all"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-surface-dark text-white font-black py-6 rounded-[2rem] shadow-2xl hover:bg-black transition-all uppercase tracking-widest flex items-center justify-center gap-3 active:scale-95 disabled:opacity-60"
        >
          {submitting ? 'Finalizando Inscrição...' : 'Confirmar e Finalizar Inscrição'} <span className="text-xl">🚀</span>
        </button>
      </form>
    </section>
  );
}
