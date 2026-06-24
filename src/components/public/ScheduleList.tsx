import { useEffect, useState } from 'react';
import { cleanupExpiredSchedules, fetchSchedules } from '../../lib/api';
import { formatScheduleWindow, getDayName } from '../../lib/format';
import type { Schedule } from '../../lib/types';

interface ScheduleCardProps {
  item: Schedule;
  onSelect: (item: Schedule) => void;
}

function ScheduleCard({ item, onSelect }: ScheduleCardProps) {
  const { dataInicio, horarioExibicao } = formatScheduleWindow(item.scheduled_at, item.duration_minutes);
  const hasVacancies = item.vacancies > 0;
  const isFree = parseFloat(String(item.event_price)) === 0;

  return (
    <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-white/10 p-6 rounded-3xl shadow-2xl hover:border-brand transition-all duration-300 relative overflow-hidden">
      <div className="flex justify-between items-start mb-4">
        <span className="bg-brand/20 text-brand text-[10px] font-bold px-3 py-1 rounded-full border border-brand/30 uppercase tracking-widest">
          {item.type_name || 'Geral'}
        </span>
        {hasVacancies ? (
          <span className="text-[12px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 uppercase tracking-tighter">
            {item.vacancies} vagas restantes
          </span>
        ) : (
          <span className="text-[9px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20 uppercase tracking-tighter">
            Esgotado
          </span>
        )}
      </div>
      <h3 className="text-xl font-black text-brand mb-1">{item.event_name}</h3>
      <div className="flex items-center justify-between mb-6">
        {isFree ? (
          <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">Gratuito</span>
        ) : (
          <div className="flex items-baseline gap-1">
            <span className="text-xs text-slate-500 font-bold uppercase">R$</span>
            <span className="text-2xl font-black">{item.event_price}</span>
          </div>
        )}
        <span className="text-[15px] text-slate-500 font-black uppercase tracking-tighter">{item.unit_name}</span>
      </div>
      <div className="space-y-2 mb-6 border-l-2 border-brand/30 pl-4">
        <p className="text-sm flex items-center gap-2">
          <span className="text-brand">📅</span> {getDayName(item.scheduled_at)}, {dataInicio.toLocaleDateString('pt-BR')}
        </p>
        <p className="text-sm text-slate-500 flex items-center gap-2 italic">
          <span className="text-brand text-xs">⏰</span> {horarioExibicao}
        </p>
      </div>
      <button
        disabled={!hasVacancies}
        onClick={() => onSelect(item)}
        className={
          hasVacancies
            ? 'w-full bg-brand hover:bg-brand-hover active:scale-95 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all'
            : 'w-full bg-slate-300 dark:bg-white/10 text-slate-500 cursor-not-allowed opacity-50 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px]'
        }
      >
        {hasVacancies ? 'Inscreva-se Agora!' : 'Vagas Esgotadas'}
      </button>
    </div>
  );
}

interface ScheduleListProps {
  onSelect: (item: Schedule) => void;
}

export default function ScheduleList({ onSelect }: ScheduleListProps) {
  const [schedules, setSchedules] = useState<Schedule[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await fetchSchedules();
        if (active) setSchedules(data ?? []);
      } catch (e) {
        console.error('ERRO REAL DETECTADO:', e);
        if (active) setError(true);
      }
      cleanupExpiredSchedules();
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSelect = (item: Schedule) => {
    if (item.vacancies <= 0) {
      alert('Desculpe, este evento acabou de esgotar as vagas.');
      return;
    }
    onSelect(item);
  };

  return (
    <section className="space-y-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl font-black text-white">Agenda Teste 2026</h1>
        <p className="text-slate-500 mt-2 text-lg">Selecione o evento desejado!</p>
        <a
          href="/login"
          className="text-slate-400 hover:text-brand text-[11px] font-black uppercase tracking-widest transition-colors"
        >
          ACESSO ADMIN
        </a>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {schedules === null && !error && (
          <p className="text-center col-span-full text-slate-400">Buscando horários...</p>
        )}
        {error && <p className="text-center col-span-full text-red-500">Erro ao carregar agenda.</p>}
        {schedules?.length === 0 && (
          <p className="text-center col-span-full text-slate-500 py-10">Nenhum horário disponível.</p>
        )}
        {schedules?.map((item) => (
          <ScheduleCard key={item.schedule_id ?? item.id} item={item} onSelect={handleSelect} />
        ))}
      </div>
    </section>
  );
}
