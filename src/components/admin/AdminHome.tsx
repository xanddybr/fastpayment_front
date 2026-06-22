import { useEffect } from 'react';
import { cleanupExpiredCodes, cleanupExpiredSchedules, cleanupPendingTransactions } from '../../lib/api';
import { useAuth } from '../../context/AuthContext';

export default function AdminHome() {
  const { adminName } = useAuth();

  // REQ-003 + REQ-004: run sanitizers silently when the admin lands on the home tab.
  useEffect(() => {
    cleanupPendingTransactions();
    cleanupExpiredCodes();
    cleanupExpiredSchedules();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <div className="w-20 h-20 bg-brand/10 text-brand rounded-3xl flex items-center justify-center text-4xl mb-6">👋</div>
      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-2">Bem-vindo, {adminName || 'Administrador'}!</h1>
      <p className="text-slate-500 max-w-md">Selecione uma opção no menu superior para começar a gerenciar sua agenda.</p>
    </div>
  );
}
