import { useEffect, useState } from 'react';
import {
  createSchedule,
  deleteSchedule,
  fetchAdminSchedules,
  fetchFormOptions,
  updateSchedule,
  type SchedulePayload,
} from '../../lib/api';
import { getDayName } from '../../lib/format';
import type { CrudTarget, NamedOption, Schedule } from '../../lib/types';
import { useModalTransition } from '../../hooks/useModalTransition';
import CrudModal from './CrudModal';

const emptyForm = {
  scheduledAt: '',
  duration: '',
  eventId: '',
  typeId: '',
  unitId: '',
  vacancies: '',
};

export default function AdminAgenda() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [events, setEvents] = useState<NamedOption[]>([]);
  const [units, setUnits] = useState<NamedOption[]>([]);
  const [eventTypes, setEventTypes] = useState<NamedOption[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [crudTarget, setCrudTarget] = useState<CrudTarget | null>(null);
  const [tableError, setTableError] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const { mounted: formMounted, show: formShow } = useModalTransition(formOpen);

  const loadTable = async () => {
    try {
      const data = await fetchAdminSchedules();
      setSchedules(data);
      setTableError(false);
    } catch {
      setTableError(true);
    }
  };

  const loadOptions = async () => {
    try {
      const { events, units, eventTypes } = await fetchFormOptions();
      setEvents(events);
      setUnits(units);
      setEventTypes(eventTypes);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTable();
    loadOptions();
  }, []);

  const clearForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openCreateForm = () => {
    clearForm();
    setFormOpen(true);
  };

  const handleEdit = (item: Schedule) => {
    setForm({
      scheduledAt: (item.scheduled_at ?? '').replace(' ', 'T').slice(0, 16),
      duration: String(item.duration_minutes ?? ''),
      eventId: String(item.event_id),
      typeId: String(item.event_type_id),
      unitId: String(item.unit_id),
      vacancies: String(item.vacancies ?? ''),
    });
    setEditingId(item.schedule_id);
    setFormOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja excluir este registro?')) return;
    const res = await deleteSchedule(id);
    if (res.ok) loadTable();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const payload: SchedulePayload = {
      scheduled_at: form.scheduledAt,
      event_id: parseInt(form.eventId, 10),
      unit_id: parseInt(form.unitId, 10),
      event_type_id: parseInt(form.typeId, 10),
      vacancies: parseInt(form.vacancies, 10) || 0,
      duration_minutes: parseInt(form.duration, 10) || 0,
      status: 'available',
    };

    if (editingId) {
      const res = await updateSchedule(editingId, payload);
      if (res.ok) {
        alert('Alterado com sucesso!');
        clearForm();
        setFormOpen(false);
        loadTable();
      } else {
        const err = await res.json().catch(() => ({}));
        alert('Erro ao alterar: ' + (err.error || 'Erro desconhecido.'));
      }
    } else {
      const res = await createSchedule(payload);
      if (res.ok) {
        alert('Salvo com sucesso!');
        clearForm();
        setFormOpen(false);
        loadTable();
      } else {
        const err = await res.json().catch(() => ({}));
        alert('Erro ao salvar: ' + (err.error || 'Erro desconhecido. Verifique os campos.'));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreateForm}
          className="bg-brand text-white px-6 py-3 rounded-xl font-bold text-xs uppercase hover:bg-brand-hover transition-all shadow-md"
        >
          + Novo Agendamento
        </button>
      </div>

      <div className="bg-surface-light rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {tableError && <p className="p-10 text-center text-red-500">Erro ao carregar dados.</p>}

        {!tableError && (
          <>
            {/* Mobile: stacked cards */}
            <div className="sm:hidden divide-y divide-slate-100">
              {schedules.map((item) => {
                const color = item.vacancies > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600';
                return (
                  <div key={item.schedule_id} className="p-4 space-y-3 transition-colors active:bg-brand/10 hover:bg-brand/10">
                    <div className="flex justify-between items-start gap-3">
                      <div>
                        <span className="font-bold text-slate-900 block">{item.event_name}</span>
                        <span className="text-xs text-slate-500">{item.type_name} • {item.unit_name}</span>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold whitespace-nowrap ${color}`}>{item.vacancies} vagas</span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {getDayName(item.scheduled_at)}, {new Date(item.scheduled_at).toLocaleDateString('pt-BR')}
                    </p>
                    <div className="flex justify-between items-center gap-2 pt-1">
                      <span className="text-sm font-bold text-slate-700">R$ {item.event_price}</span>
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(item)} className="text-brand text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-brand/10">
                          Editar
                        </button>
                        <button onClick={() => handleDelete(item.schedule_id)} className="text-red-500 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-50">
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-sm min-w-[760px]">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="p-4">Dia</th>
                    <th className="p-4">Data / Horário</th>
                    <th className="p-4">Evento</th>
                    <th className="p-4">Tipo</th>
                    <th className="p-4 text-right">Preço</th>
                    <th className="p-4">Unidade</th>
                    <th className="p-4 text-center">Vagas</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {schedules.map((item) => {
                    const dataInicio = new Date(item.scheduled_at);
                    const duration = parseInt(String(item.duration_minutes), 10) || 0;
                    const dataFim = new Date(dataInicio.getTime() + duration * 60000);
                    const horaInicio = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const horaFim = dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                    const color = item.vacancies > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600';
                    return (
                      <tr key={item.schedule_id} className="hover:bg-brand/10 hover:shadow-sm transition-colors text-slate-700">
                        <td className="p-4 align-middle text-slate-500 font-medium">{getDayName(item.scheduled_at)}</td>
                        <td className="p-4 align-middle text-slate-500 font-medium whitespace-nowrap">
                          {dataInicio.toLocaleDateString('pt-BR')} <span className="text-slate-400">·</span> {horaInicio}–{horaFim}
                        </td>
                        <td className="p-4 align-middle font-bold text-slate-900">{item.event_name}</td>
                        <td className="p-4 align-middle text-slate-600">{item.type_name}</td>
                        <td className="p-4 align-middle text-right font-bold text-slate-900 whitespace-nowrap">R$ {item.event_price}</td>
                        <td className="p-4 align-middle text-slate-600">{item.unit_name}</td>
                        <td className="p-4 align-middle text-center">
                          <span className={`px-3 py-1 rounded-full text-[13px] font-bold ${color}`}>{item.vacancies}</span>
                        </td>
                        <td className="p-4 align-middle text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-brand hover:text-brand-hover font-bold transition-colors p-2 hover:bg-brand/10 rounded-lg"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(item.schedule_id)}
                              className="text-red-400 hover:text-red-600 font-bold transition-colors p-2 hover:bg-red-50 rounded-lg"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {crudTarget && (
        <CrudModal
          target={crudTarget}
          onClose={() => setCrudTarget(null)}
          onSaved={loadOptions}
        />
      )}

      {formMounted && (
        <div
          className={`modal-overlay ${formShow ? 'modal-show' : ''} fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-4`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setFormOpen(false);
          }}
        >
          <div
            className={`modal-panel ${formShow ? 'modal-show' : ''} bg-surface-light w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto`}
          >
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                {editingId ? 'Editar Agendamento' : 'Novo Agendamento'}
              </h3>
              <button onClick={() => setFormOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">
                &times;
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">Data/Hora</label>
                <input
                  type="datetime-local"
                  required
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">Duração (min)</label>
                <input
                  type="number"
                  min={1}
                  required
                  placeholder="min"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-brand text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">Vagas</label>
                <input
                  type="number"
                  min={0}
                  required
                  placeholder="Qtd"
                  value={form.vacancies}
                  onChange={(e) => setForm({ ...form, vacancies: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-brand text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">Evento</label>
                <div className="flex">
                  <select
                    required
                    value={form.eventId}
                    onChange={(e) => setForm({ ...form, eventId: e.target.value })}
                    className="flex-1 border border-slate-200 rounded-l-xl p-2 text-sm outline-none bg-white min-w-0"
                  >
                    <option value="" disabled>
                      Evento
                    </option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setCrudTarget('events')} className="bg-slate-50 px-3 border border-l-0 border-slate-200 rounded-r-xl hover:bg-slate-100 font-bold">
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">Tipo</label>
                <div className="flex">
                  <select
                    required
                    value={form.typeId}
                    onChange={(e) => setForm({ ...form, typeId: e.target.value })}
                    className="flex-1 border border-slate-200 rounded-l-xl p-2 text-sm outline-none bg-white min-w-0"
                  >
                    <option value="" disabled>
                      Tipo
                    </option>
                    {eventTypes.map((tp) => (
                      <option key={tp.id} value={tp.id}>
                        {tp.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setCrudTarget('event-types')} className="bg-slate-50 px-2 border border-l-0 border-slate-200 rounded-r-xl font-bold">
                    +
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">Unidade</label>
                <div className="flex">
                  <select
                    required
                    value={form.unitId}
                    onChange={(e) => setForm({ ...form, unitId: e.target.value })}
                    className="flex-1 border border-slate-200 rounded-l-xl p-2 text-sm outline-none bg-white min-w-0"
                  >
                    <option value="" disabled>
                      Unidade
                    </option>
                    {units.map((un) => (
                      <option key={un.id} value={un.id}>
                        {un.name}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setCrudTarget('units')} className="bg-slate-50 px-3 border border-l-0 border-slate-200 rounded-r-xl font-bold">
                    +
                  </button>
                </div>
              </div>

              <div className="col-span-full flex flex-col sm:flex-row gap-2 sm:justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="w-full sm:w-auto sm:px-8 bg-slate-100 text-slate-600 py-2.5 rounded-xl font-bold text-[10px] uppercase hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button type="submit" className="w-full sm:w-auto sm:px-8 bg-brand text-white py-2.5 rounded-xl font-bold text-[10px] uppercase hover:bg-brand-hover transition-all shadow-md">
                  {editingId ? 'Alterar' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
