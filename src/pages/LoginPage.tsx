import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, APP_VERSION } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      const res = await adminLogin(email, password);
      if (res.ok) {
        const data = await res.json();
        login(data.user.full_name);
        navigate('/admin');
      } else {
        const errorData = await res.json();
        alert(errorData.mensagem || 'Login inválido.');
      }
    } catch (e) {
      console.error(e);
      alert('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="w-full max-w-6xl mx-auto p-4 md:p-8 min-h-screen flex items-center">
      <section className="max-w-md mx-auto bg-surface-light p-6 sm:p-8 rounded-3xl shadow-2xl border border-slate-100 space-y-6 w-full">
        <div className="text-center">
          <div className="flex justify-center">
            <img src="/images/logo.png" alt="Logo" className="h-32 w-auto object-contain" />
          </div>
          <p className="text-slate-500 mt-2 italic">Acesso á area restrita da agenda</p>
        </div>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-brand outline-none"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-xl p-3 text-slate-900 focus:ring-2 focus:ring-brand outline-none"
          />
          <button
            disabled={loading}
            onClick={handleLogin}
            className="w-full bg-surface-dark text-white font-bold py-4 rounded-xl hover:bg-black transition-all disabled:opacity-60"
          >
            {loading ? 'Autenticando...' : 'Entrar'}
          </button>
        </div>
        <div className="mt-4 text-center text-[11px] text-slate-400">
          <span className="font-black text-slate-900 text-xl tracking-tighter">
            <span className="text-slate-400">fast</span>Payment <span className="text-[13px] text-gray-400">{APP_VERSION}</span>
          </span>
        </div>
      </section>
    </main>
  );
}
