import { useEffect, useState } from 'react';
import { fetchCrudList, saveCrudItem, deleteCrudItem } from '../../lib/api';
import type { CrudTarget, NamedOption } from '../../lib/types';
import { useModalTransition } from '../../hooks/useModalTransition';

const LABELS: Record<CrudTarget, string> = {
  events: 'Eventos',
  units: 'Unidades',
  'event-types': 'Tipos',
};

interface CrudModalProps {
  target: CrudTarget;
  onClose: () => void;
  onSaved: () => void;
}

export default function CrudModal({ target, onClose, onSaved }: CrudModalProps) {
  const { show } = useModalTransition(true);
  const [list, setList] = useState<NamedOption[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [selectedId, setSelectedId] = useState('');

  const refreshList = async () => {
    try {
      const data = await fetchCrudList(target);
      setList(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Por favor, digite um nome!');
      return;
    }
    const payload: { name: string; price?: string } = { name: name.trim() };
    if (target === 'events') {
      if (!isFree && !price) {
        alert('Por favor, digite o preço, ou marque como gratuito!');
        return;
      }
      payload.price = isFree ? '0.00' : price;
    }

    try {
      const res = await saveCrudItem(target, payload);
      if (res.ok) {
        alert('Salvo com sucesso!');
        setName('');
        setPrice('');
        setIsFree(false);
        await refreshList();
        onSaved();
      } else {
        const err = await res.json();
        alert('Erro ao salvar: ' + (err.mensagem || 'Erro desconhecido'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async () => {
    if (!selectedId || !confirm('Tem certeza que deseja excluir este item?')) return;
    try {
      const res = await deleteCrudItem(target, selectedId);
      if (res.ok) {
        alert('Excluído com sucesso!');
        setSelectedId('');
        await refreshList();
        onSaved();
      } else {
        const err = await res.json();
        alert('Erro ao excluir: ' + (err.error || 'Acesso negado'));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className={`modal-overlay ${show ? 'modal-show' : ''} fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[60] flex items-center justify-center p-4`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`modal-panel ${show ? 'modal-show' : ''} bg-surface-light w-full max-w-md rounded-xl shadow-2xl overflow-hidden`}>
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Gerenciar {LABELS[target]}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">
            &times;
          </button>
        </div>

        <div className="p-6 space-y-4 text-slate-900">
          <div>
            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Novo Registro (Nome)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand"
              placeholder="Digite o nome..."
            />
          </div>
          {target === 'events' && (
            <div>
              <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Preço (R$)</label>
              <input
                type="number"
                value={price}
                disabled={isFree}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full border rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-brand disabled:bg-slate-100 disabled:text-slate-400"
                placeholder="0.00"
              />
              <label className="flex items-center gap-2 mt-2 ml-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFree}
                  onChange={(e) => setIsFree(e.target.checked)}
                  className="w-4 h-4 accent-brand"
                />
                <span className="text-xs font-bold text-slate-500">Evento gratuito</span>
              </label>
            </div>
          )}
          <hr className="border-slate-100" />
          <div>
            <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase">Registros Atuais</label>
            <div className="flex gap-2">
              <select
                size={5}
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="flex-1 border rounded-xl p-3 text-sm outline-none bg-slate-50 overflow-y-auto"
              >
                {list.length === 0 && <option value="">Carregando...</option>}
                {list.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                    {target === 'events' && item.price != null ? ` — R$ ${parseFloat(String(item.price)).toFixed(2)}` : ''}
                  </option>
                ))}
              </select>
              <button onClick={handleDelete} className="bg-red-50 text-red-600 px-4 rounded-xl hover:bg-red-600 hover:text-white transition-all font-bold text-xs">
                Excluir
              </button>
            </div>
          </div>
        </div>
        <div className="p-6 bg-slate-50 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-500">
            Cancelar
          </button>
          <button onClick={handleSave} className="flex-1 py-3 text-sm font-bold bg-brand text-white rounded-xl shadow-lg hover:bg-brand-hover">
            Adicionar
          </button>
        </div>
      </div>
    </div>
  );
}
