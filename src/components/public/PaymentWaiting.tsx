interface PaymentWaitingProps {
  phase: 'idle' | 'polling' | 'success' | 'error';
  countdown: number;
  errorMessage: string;
  onRetry: () => void;
  onCancel: () => void;
}

export default function PaymentWaiting({ phase, countdown, errorMessage, onRetry, onCancel }: PaymentWaitingProps) {
  if (phase === 'success') {
    return (
      <section className="max-w-md mx-auto text-center space-y-8 py-20">
        <div className="flex flex-col items-center gap-6">
          <div className="text-6xl">✅</div>
          <div>
            <h2 className="text-2xl font-black mb-2">Pagamento Confirmado!</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Redirecionando para o formulário em{' '}
              <span className="text-brand font-black text-lg">{countdown}</span> segundo{countdown !== 1 ? 's' : ''}...
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (phase === 'error') {
    return (
      <section className="max-w-md mx-auto text-center space-y-8 py-20">
        <div className="flex flex-col items-center gap-6">
          <div className="text-5xl">❌</div>
          <div>
            <h2 className="text-2xl font-black mb-2">Pagamento não confirmado</h2>
            <p className="text-slate-400 text-sm leading-relaxed">{errorMessage}</p>
          </div>
          <div className="w-full bg-surface-dark border border-red-800 rounded-2xl p-4 text-left">
            <p className="text-sm text-slate-300">Você pode tentar novamente ou escolher outra forma de pagamento.</p>
          </div>
          <button
            onClick={onRetry}
            className="w-full py-3 px-6 rounded-2xl bg-brand hover:bg-brand-hover text-white font-bold transition-colors"
          >
            Tentar novamente
          </button>
          <button
            onClick={onCancel}
            className="text-sm text-slate-500 hover:text-slate-300 transition-colors font-medium underline underline-offset-4"
          >
            Voltar para a agenda
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-md mx-auto text-center space-y-8 py-20">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 rounded-full border-4 border-brand/20" />
          <div className="absolute inset-0 rounded-full border-4 border-t-brand border-r-brand-light border-b-transparent border-l-transparent animate-spin" />
          <div className="absolute inset-3 rounded-full bg-brand/10 flex items-center justify-center text-3xl">💸</div>
        </div>
        <div>
          <h2 className="text-2xl font-black mb-2">Aguardando Pagamento</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            O checkout do Mercado Pago foi aberto em uma nova aba.
            <br />
            Após pagar, esta tela atualiza automaticamente.
          </p>
        </div>
        <div className="w-full bg-surface-dark border border-white/10 rounded-2xl p-4 text-left space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Verificando a cada 5 segundos...</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse" />
            <span className="text-sm text-slate-300 font-medium">Monitorando aprovação do pagamento</span>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="text-sm text-slate-500 hover:text-slate-300 transition-colors font-medium underline underline-offset-4"
        >
          Cancelar e voltar para a agenda
        </button>
      </div>
    </section>
  );
}
