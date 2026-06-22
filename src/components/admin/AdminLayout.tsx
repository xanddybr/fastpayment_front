import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_VERSION } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import type { AdminTab } from '../../lib/types';
import AdminHome from './AdminHome';
import AdminAgenda from './AdminAgenda';
import AdminInscricoes from './AdminInscricoes';
import AdminConfig from './AdminConfig';

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'inicio', label: 'Início' },
  { id: 'agenda', label: 'Agenda' },
  { id: 'inscricoes', label: 'Inscrições' },
  { id: 'configuracao', label: 'Configuração' },
];

export default function AdminLayout() {
  const [tab, setTab] = useState<AdminTab>('inicio');
  const [menuOpen, setMenuOpen] = useState(false);
  const { adminName, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const selectTab = (id: AdminTab) => {
    setTab(id);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-surface-light">
      <header className="sticky top-0 left-0 w-full bg-surface-light border-b border-slate-100 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex justify-between items-center">
          <nav className="hidden sm:flex items-center gap-4 sm:gap-8 h-full overflow-x-auto whitespace-nowrap">
            <span className="font-black text-slate-900 text-xl tracking-tighter mr-2 sm:mr-4 shrink-0">
              <span className="text-slate-400">fast</span>Payment<span className="text-[12px] text-gray-400">{APP_VERSION}</span>
            </span>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTab(t.id)}
                className={`h-full text-sm font-bold transition-all px-1 border-b-2 shrink-0 ${
                  tab === t.id ? 'text-brand border-brand' : 'text-slate-500 border-transparent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex sm:hidden items-center h-full">
            <button
              onClick={() => setMenuOpen((open) => !open)}
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
              className="flex flex-col justify-center gap-1.5 p-2 -ml-2"
            >
              <span className={`block w-6 h-0.5 bg-slate-900 transition-all ${menuOpen ? 'translate-y-2 rotate-45' : ''}`} />
              <span className={`block w-6 h-0.5 bg-slate-900 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
              <span className={`block w-6 h-0.5 bg-slate-900 transition-all ${menuOpen ? '-translate-y-2 -rotate-45' : ''}`} />
            </button>
            <span className="font-black text-slate-900 text-lg tracking-tighter ml-3">
              <span className="text-slate-400">fast</span>Payment
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden sm:inline text-xs font-bold text-slate-400">Olá, {adminName}</span>
            <button
              onClick={handleLogout}
              className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all"
            >
              Sair
            </button>
          </div>
        </div>

        <div
          className={`sm:hidden overflow-hidden transition-[max-height] duration-300 ease-in-out border-t border-slate-100 ${
            menuOpen ? 'max-h-[70vh]' : 'max-h-0'
          }`}
        >
          <nav className="flex flex-col">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => selectTab(t.id)}
                className={`text-left text-base font-bold py-4 px-6 border-b border-slate-100 transition-all ${
                  tab === t.id ? 'text-brand bg-brand/5' : 'text-slate-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className={`${tab === 'agenda' ? 'max-w-[1600px]' : 'max-w-7xl'} mx-auto px-4 sm:px-6 pt-6 pb-10`}>
        {tab === 'inicio' && <AdminHome />}
        {tab === 'agenda' && <AdminAgenda />}
        {tab === 'inscricoes' && <AdminInscricoes />}
        {tab === 'configuracao' && <AdminConfig />}
      </div>
    </div>
  );
}
