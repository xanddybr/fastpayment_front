import type { Subscriber } from '../../lib/types';
import { useModalTransition } from '../../hooks/useModalTransition';

interface AnamnesisModalProps {
  ficha: Subscriber;
  onClose: () => void;
}

export default function AnamnesisModal({ ficha, onClose }: AnamnesisModalProps) {
  const { show } = useModalTransition(true);

  return (
    <div
      className={`modal-overlay ${show ? 'modal-show' : ''} fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal-panel ${show ? 'modal-show' : ''} bg-surface-light w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden relative max-h-[90vh] overflow-y-auto`}
      >
        <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 text-3xl z-10">
          &times;
        </button>
        <div className="p-6 sm:p-8 space-y-6">
          <h2 className="text-xl font-black text-slate-900">Ficha de Inscrição: {ficha.full_name}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <b className="text-[9px] text-slate-400 uppercase block mb-1">Telefone</b>
              <span className="text-sm font-bold">{ficha.phone || '-'}</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <b className="text-[9px] text-slate-400 uppercase block mb-1">Email aluno</b>
              <span className="text-sm font-bold">{ficha.email || '-'}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 p-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              {ficha.is_medium == 1 ? '✅' : '?'} <span className="text-slate-600">Médium</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              {ficha.is_tule_member == 1 ? '✅' : '?'} <span className="text-slate-600">Membro TULE</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-medium">
              {ficha.first_time == 1 ? '✅' : '?'} <span className="text-slate-600">Primeira Vez</span>
            </div>
            <div className="text-sm font-medium">
              <span className="text-slate-400">Religião:</span> {ficha.religion_mention || '?'}
            </div>
          </div>
          <div className="space-y-4">
            <div className="p-5 bg-brand/5 rounded-2xl border border-brand/20">
              <b className="text-[9px] text-brand uppercase block mb-2 tracking-widest">Razão pela qual você se inscreveu:</b>
              <p className="text-sm text-slate-700 italic leading-relaxed">{ficha.course_reason || ''}</p>
            </div>
            <div>
              <b className="text-[9px] text-slate-400 uppercase block mb-1 ml-1">Quem Indicou?</b>
              <p className="text-sm text-slate-600 px-1">{ficha.who_recomended || ''}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-surface-dark text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all"
          >
            Fechar Ficha
          </button>
        </div>
      </div>
    </div>
  );
}
