import { useEffect, useState } from 'react';
import { fetchSubscribers } from '../../lib/api';
import { formatDateTime } from '../../lib/format';
import type { Subscriber } from '../../lib/types';
import AnamnesisModal from './AnamnesisModal';

interface PersonGroup {
  name: string;
  email: string;
  phone: string;
  profession: string;
  city: string;
  neighborhood: string;
  events: Subscriber[];
}

function groupByPerson(rows: Subscriber[]): Record<string, PersonGroup> {
  return rows.reduce<Record<string, PersonGroup>>((acc, item) => {
    const key = item.person_id ? `person_${item.person_id}` : `payment_${item.transacao_gateway}`;
    if (!acc[key]) {
      acc[key] = {
        name: item.full_name || item.payer_email || 'Aguardando inscrição',
        email: item.email || item.payer_email || '-',
        phone: item.phone || '-',
        profession: item.activity_professional || '-',
        city: item.city || '-',
        neighborhood: item.neighborhood || '-',
        events: [],
      };
    }
    acc[key].events.push(item);
    return acc;
  }, {});
}

export default function AdminInscricoes() {
  const [rows, setRows] = useState<Subscriber[] | null>(null);
  const [error, setError] = useState(false);
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [ficha, setFicha] = useState<Subscriber | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchSubscribers();
        setRows(data);
      } catch {
        setError(true);
      }
    })();
  }, []);

  const toggle = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (error) return <p className="text-center text-red-500">Erro ao renderizar dados.</p>;
  if (rows === null) return <p className="text-center py-10 text-slate-400">Organizando registros...</p>;
  if (rows.length === 0) return <p className="text-center py-10">Não há inscrições a serem listadas.</p>;

  const grouped = groupByPerson(rows);

  return (
    <div className="col-span-full space-y-6">
      <h2 className="text-2xl font-black text-slate-900 mb-8 py-6">Gestão de Alunos e Inscrições</h2>
      <div className="space-y-4">
        {Object.entries(grouped).map(([key, person]) => {
          const isOpen = openKeys.has(key);
          return (
            <div key={key} className="bg-surface-light border border-slate-200 rounded-2xl overflow-hidden shadow-sm mb-4">
              <button onClick={() => toggle(key)} className="w-full p-5 sm:p-8 flex items-center justify-between hover:bg-slate-50 transition-all">
                <div className="flex items-center gap-4 sm:gap-6 text-left">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-brand text-white rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl shrink-0">
                    {person.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-black text-slate-900">{person.name}</h3>
                    <p className="text-xs sm:text-sm text-slate-500 font-medium">
                      {person.email} • {person.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:gap-6 shrink-0">
                  <span className="hidden sm:inline bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                    {person.events.length} EVENTO(S)
                  </span>
                  <span className="text-slate-400 text-xl transition-transform" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                    ▼
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/40 p-5 sm:p-8">
                  <div className="mb-8 p-6 bg-surface-light rounded-2xl border border-slate-200 flex flex-col sm:flex-row justify-between sm:items-center gap-3 shadow-sm">
                    <div className="text-sm">
                      <b className="text-slate-400 uppercase text-[10px] block mb-1">Profissão</b>
                      <span className="text-lg font-bold text-slate-700">{person.profession}</span>
                    </div>
                    <div className="text-sm sm:text-right">
                      <b className="text-slate-400 uppercase text-[10px] block mb-1">Localização</b>
                      <span className="text-lg font-bold text-slate-700">
                        {person.neighborhood}, {person.city}
                      </span>
                    </div>
                  </div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Histórico de Inscrições</h4>
                  <div className="space-y-6">
                    {person.events.map((ev) => {
                      const isPast = new Date((ev.event_date || '').replace(/-/g, '/')) < new Date();
                      const isFree = parseFloat(String(ev.valor_evento)) === 0;
                      const colorPayment = isFree
                        ? 'bg-sky-100 text-sky-700'
                        : ev.payment_status === 'approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700';
                      const colorSubscribe =
                        ev.enrollment_status === 'confirmed' ? 'bg-green-100 text-green-700' : isPast ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
                      const labelSubscribe = ev.enrollment_status === 'confirmed' ? '✅ Inscrito' : isPast ? '🔴 Prazo Expirado' : '🟡 Aguardando Inscrição';

                      return (
                        <div key={ev.subscribed_id} className="bg-surface-light p-5 sm:p-8 rounded-2xl border border-slate-200 shadow-md relative">
                          <div className={`absolute top-5 sm:top-8 right-5 sm:right-8 ${colorPayment} px-4 py-1.5 rounded-full text-[11px] sm:text-[13px] font-black uppercase tracking-tighter`}>
                            {isFree ? 'Gratuito' : ev.payment_status === 'approved' ? 'Pagamento: Confirmado' : 'Pagamento: Pendente'}
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 pt-8 lg:pt-0">
                            <div>
                              <div className="mb-4">
                                <span className={`text-xs font-black uppercase tracking-widest ${colorSubscribe}`}>{labelSubscribe}</span>
                                {ev.created_at && (
                                  <div className="text-xs">
                                    <b className="text-slate-400 uppercase block text-[12px]">{formatDateTime(ev.created_at)}</b>
                                  </div>
                                )}
                                <h5 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">{ev.event_name || 'Evento não encontrado'}</h5>
                                <p className="text-sm font-bold text-slate-400 uppercase">
                                  {ev.type_name || 'Tipo não informado'} | {ev.unit_name || 'Unidade'}
                                </p>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="text-xs">
                                  <b className="text-slate-400 uppercase block text-[15px]">Data do evento</b>
                                  <span className="font-black text-slate-900 block text-[15px]">{formatDateTime(ev.event_date || '')}</span>
                                </div>
                                <div className="text-xs">
                                  <b className="text-green-400 uppercase block text-[15px]">Data da compra</b>
                                  <span className="font-black text-slate-900 block text-[15px]">{formatDateTime(ev.createdPay || '')}</span>
                                </div>
                                <div className="text-xs">
                                  <b className="text-slate-400 uppercase block text-[15px]">Valor</b>
                                  <span className="font-black text-slate-900 block text-[15px]">{isFree ? 'Gratuito' : `R$ ${ev.valor_evento}`}</span>
                                </div>
                              </div>
                            </div>
                            <div className="bg-brand/5 p-6 rounded-2xl border border-brand/20 flex flex-col justify-between">
                              <div />
                              <button
                                onClick={() => setFicha(ev)}
                                className="mt-4 flex items-center gap-2 text-sm font-black text-brand hover:text-brand-hover transition-colors uppercase tracking-widest"
                              >
                                Ver ficha de Anaminese ➜
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {ficha && <AnamnesisModal ficha={ficha} onClose={() => setFicha(null)} />}
    </div>
  );
}
