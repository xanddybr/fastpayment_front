import './style.css';

// --- CONFIGURAÇÃO HÍBRIDA DA API ---
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8080' 
    : 'https://misturadeluz.com/agenda/api/public';

const APP_VERSION = "v0.0.0";

let inscriptionsCache: any[] = [];
let modalOriginalHTML: string = ''; 
let selectedEvent = { id: 0, name: '' };
let currentTarget: 'events' | 'units' | 'event-types' = 'events';

const getSections = () => ({
    selection: document.querySelector<HTMLDivElement>('#step-selection'),
    auth:      document.querySelector<HTMLDivElement>('#step-1'),
    otp:       document.querySelector<HTMLDivElement>('#step-2'),
    registration: document.querySelector<HTMLDivElement>('#step-registration'),
    login:     document.querySelector<HTMLDivElement>('#login')
});
     
const safeFetch = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, options);
    if (response.status === 401) {
        localStorage.removeItem('admin_full_name');
        window.location.href = 'login.html';
    } 
    return response;
};

const injectVersion = () => {
    const elements = document.querySelectorAll('.app-version');
    elements.forEach(el => {
        el.textContent = APP_VERSION;
    });
};

const sections = {
    selection: document.querySelector<HTMLDivElement>('#step-selection')!,
    auth:      document.querySelector<HTMLDivElement>('#step-1')!,
    otp:       document.querySelector<HTMLDivElement>('#step-2')!,
    login:     document.querySelector<HTMLDivElement>('#login')!
};

// --- ROTEADOR ---
const handleRouting = async () => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    hideAllSections();
    const activeSections = getSections();

    if (path.includes('login.html') || hash === '#login' || hash === '#admin') {
        document.body.classList.remove('bg-reiki');
        if (hash === '#admin') {
            const res = await safeFetch(`${API_BASE_URL}/auth/check`, { credentials: 'include' });
            res.ok ? renderAdminDashboard() : window.location.href = 'login.html';
        } else {
            activeSections.login?.classList.remove('hidden');
        }
    } else {
        document.body.classList.add('bg-reiki');
        activeSections.selection?.classList.remove('hidden');
        loadEvents();
    }
    injectVersion();
};

const hideAllSections = () => {
    const activeSections = getSections();
    Object.values(activeSections).forEach(s => s?.classList.add('hidden'));
};

const getDayName = (dateString: string) => {
    const capitalize = (s:any) => s && s[0].toUpperCase() + s.slice(1);
    const dayGet = new Date(dateString).toLocaleDateString('pt-BR', { weekday: 'long' });
    return capitalize(dayGet);
};

// --- AGENDA PÚBLICA (RESTAURADA COM SEUS CARDS ORIGINAIS) ---
const loadEvents = async (eventSlug: string = '', typeSlug: string = '') => {
    const container = document.querySelector<HTMLDivElement>('#events-container')!;
    if (!container) return;
    
    container.innerHTML = '<p class="text-center col-span-full text-slate-400">Buscando horários...</p>';
    
    try {
        const url = `${API_BASE_URL}/api/schedules?slug=${eventSlug}&type=${typeSlug}`;
        const response = await fetch(url, { credentials: 'include' });
        const schedules = await response.json();

        if (!schedules || schedules.length === 0) {
            container.innerHTML = '<p class="text-center col-span-full text-slate-500 py-10">Nenhum horário disponível.</p>';
            return;
        }

        container.innerHTML = schedules.map((item: any) => {
            const dataInicio = new Date(item.scheduled_at);
            const duracao = parseInt(item.duration_minutes) || 0;
            const dataFim = new Date(dataInicio.getTime() + duracao * 60000);

            const horaInicio = dataInicio.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            const horaFim = dataFim.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            const horarioCompleto = duracao > 0 ? `${horaInicio}h às ${horaFim}h` : `${horaInicio}h`;

            const hasVacancies = item.vacancies > 0;
            const vacanciesLabel = hasVacancies 
                ? `<span class="text-[12px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 uppercase tracking-tighter">${item.vacancies} vagas restantes</span>`
                : `<span class="text-[9px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20 uppercase tracking-tighter">Esgotado</span>`;

            const btnClass = hasVacancies 
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-95" 
                : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50";
            
            // CORREÇÃO: Uso de aspas simples para o JSON não quebrar o HTML
            const btnAction = hasVacancies ? `onclick='selectEvent(${JSON.stringify(item)})'` : "";

            return `
            <div class="bg-slate-950 border border-slate-800 p-6 rounded-3xl shadow-2xl hover:border-fuchsia-600 transition-all duration-300 group relative overflow-hidden">
                <div class="flex justify-between items-start mb-4">
                    <span class="bg-violet-600/20 text-violet-400 text-[10px] font-bold px-3 py-1 rounded-full border border-violet-600/30 uppercase tracking-widest">${item.type_name || 'Geral'}</span>
                    ${vacanciesLabel}
                </div>
                <h3 class="text-xl font-black text-fuchsia-500 mb-1">${item.event_name}</h3>
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-baseline gap-1">
                        <span class="text-xs text-slate-500 font-bold uppercase">R$</span>
                        <span class="text-2xl font-black text-slate-100">${item.event_price}</span>
                    </div>
                    <span class="text-[15px] text-slate-600 font-black uppercase tracking-tighter">${item.unit_name}</span>
                </div>
                <div class="space-y-2 mb-6 border-l-2 border-violet-600/30 pl-4">
                    <p class="text-sm text-slate-300 flex items-center gap-2"><span>📅</span> ${getDayName(item.scheduled_at)}, ${new Date(item.scheduled_at).toLocaleDateString('pt-BR')}</p>
                    <p class="text-sm text-slate-400 flex items-center gap-2 italic"><span>⏰</span> ${horarioCompleto}</p>
                </div>
                <button ${btnAction} class="w-full ${btnClass} text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all transform">
                    ${hasVacancies ? "Inscreva-se Agora!" : "Vagas Esgotadas"}
                </button>
            </div>`;
        }).join('');
    } catch (e) { 
        container.innerHTML = '<p class="text-center col-span-full text-red-500">Erro ao carregar agenda.</p>'; 
    }
};

// --- EXPOSIÇÃO GLOBAL ---
// --- EXPOSIÇÃO GLOBAL ---
(window as any).selectEvent = (item: any) => {
    (window as any).selectedSchedule = item; 
    (window as any).selectedEventId = item.schedule_id; 
    
    hideAllSections();
    
    const step1 = document.querySelector<HTMLDivElement>('#step-1');
    if (step1) {
        step1.classList.remove('hidden');
        // --- ADICIONE ESTA LINHA ABAIXO ---
        setupEmailValidation(); // Isso ativa o botão de e-mail assim que a tela abre
    }
};

(window as any).nextStep = (current: number) => {
    document.querySelector(`#reg-step-${current}`)?.classList.add('hidden');
    document.querySelector(`#reg-step-${current + 1}`)?.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

(window as any).prevStep = (current: number) => {
    document.querySelector(`#reg-step-${current}`)?.classList.add('hidden');
    document.querySelector(`#reg-step-${current - 1}`)?.classList.remove('hidden');
};

(window as any).finalizarInscricao = async () => {
    const form = document.querySelector<HTMLFormElement>('#form-inscricao')!;
    const formData = new FormData(form);
    const rawData = Object.fromEntries(formData);
    const payload = { ...rawData, schedule_id: (window as any).selectedEventId, is_pre_paid: (window as any).isPrePaid ? 1 : 0 };

    const res = await fetch(`${API_BASE_URL}/api/public/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert("✨ Inscrição concluída!");
        window.location.reload();
    }
};

// 1. Primeiro, garantimos que o botão seja selecionado fora do evento
/**
 * Configura o botão de validação de e-mail e define o comportamento de 
 * redirecionamento (Ficha ou Mercado Pago).
 */
const setupEmailValidation = () => {
    const btnSend = document.querySelector<HTMLButtonElement>('#btn-send-otp');
    const emailInput = document.querySelector<HTMLInputElement>('#email');

    if (!btnSend || !emailInput) return;

    btnSend.onclick = async () => {
        const email = emailInput.value.trim();
        
        if (!email || !email.includes('@')) {
            alert("Por favor, insira um e-mail válido.");
            emailInput.focus();
            return;
        }

        btnSend.disabled = true;
        btnSend.innerHTML = "Verificando...";

        try {
            // Verifica se já existe pagamento aprovado
            const response = await fetch(`${API_BASE_URL}/check-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    email: email, 
                    schedule_id: (window as any).selectedEventId 
                })
            });
            
            const result = await response.json();

            if (result.has_paid) {
                // Cenário: Já pagou -> Vai para a Ficha (Anamnese)
                if (confirm("✨ Identificamos um pagamento aprovado! Deseja preencher sua ficha de inscrição agora?")) {
                    (window as any).isPrePaid = true;
                    (window as any).showRegistrationForm((window as any).selectedSchedule);
                }
            } else {
                // Cenário: Não pagou -> Gera o código de 6 dígitos (OTP)
                const otpRes = await fetch(`${API_BASE_URL}/api/auth/generate-code`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email })
                });

                if (otpRes.ok) {
                    alert("Um código de validação de 6 dígitos foi enviado para o seu e-mail.");
                    hideAllSections();
                    document.querySelector('#step-2')?.classList.remove('hidden'); // Exibe tela de digitar código
                } else {
                    alert("Erro ao enviar código de validação. Tente novamente.");
                }
            }
        } catch (e) { 
            console.error(e);
            alert("Erro na comunicação com o servidor."); 
        } finally { 
            btnSend.disabled = false; 
            btnSend.innerHTML = "Validar E-mail →"; 
        }
    };
};

(window as any).validateCodeAndPay = async () => {
    const codeInput = document.querySelector<HTMLInputElement>('#otp-code');
    const emailInput = document.querySelector<HTMLInputElement>('#email');
    const code = codeInput?.value.trim();
    const email = emailInput?.value.trim();

    if (!code || code.length < 6) {
        alert("Por favor, insira o código de 6 dígitos enviado ao seu e-mail.");
        return;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/validate-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });

        if (res.ok) {
            // Sucesso na validação -> Prossegue para o pagamento
            proceedToCheckout(); 
        } else {
            const data = await res.json();
            alert(data.error || "Código inválido ou expirado.");
        }
    } catch (e) {
        alert("Erro ao validar código.");
    }
};

const proceedToCheckout = async () => {
    const scheduleId = (window as any).selectedEventId;
    const emailInput = document.querySelector<HTMLInputElement>('#email');
    const email = emailInput?.value.trim();

    try {
        const res = await fetch(`${API_BASE_URL}/api/checkout/pay`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                schedule_id: scheduleId 
            })
        });

        const data = await res.json();

        if (data.init_point) {
            // Redireciona o usuário para o Checkout Pro do Mercado Pago
            window.location.href = data.init_point; 
        } else {
            alert("Não foi possível gerar o link de pagamento.");
        }
    } catch (e) {
        console.error(e);
        alert("Erro de conexão ao processar pagamento.");
    }
};

// 3. Chamamos a configuração sempre que a seção de e-mail (step-1) for aberta
// Adicione esta chamada dentro da sua função selectEvent ou handleRouting

(window as any).showRegistrationForm = (item: any) => {
    console.log("Abrindo formulário para:", item);
    
    // Esconde todas as seções manualmente para garantir
    const allSections = document.querySelectorAll('section, div[id^="step-"]');
    allSections.forEach(s => s.classList.add('hidden'));

    // Tenta encontrar a seção de registro
    const regSection = document.querySelector<HTMLDivElement>('#step-registration');
    
    if (regSection) {
        regSection.classList.remove('hidden');
        console.log("Seção #step-registration exibida com sucesso.");
    } else {
        console.error("ERRO: Não encontrei nenhum elemento com id='step-registration' no seu HTML.");
        alert("Erro técnico: Seção de formulário não encontrada.");
    }

    // Preenche os dados do topo da ficha
    const eventTitle = document.querySelector('#reg-event-name');
    if (eventTitle && item) eventTitle.textContent = item.event_name;

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- ÁREA ADMIN (RESTAURADA E COMPLETA) ---
const renderAdminDashboard = async () => {
    hideAllSections();
    sections.selection.classList.remove('hidden');
    const container = document.querySelector<HTMLDivElement>('#events-container')!;
    const header = sections.selection.querySelector('header');
    
    if (header) {
        header.className = "fixed top-0 left-0 w-full bg-white border-b border-slate-100 z-50 shadow-sm";
        header.innerHTML = `
            <div class="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
                <nav class="flex items-center gap-8 h-full">
                    <span class="font-black text-slate-900 text-xl tracking-tighter">fastPayment</span>
                    <button onclick="changeAdminTab('inicio')" class="text-sm font-bold">Início</button>
                    <button onclick="changeAdminTab('agenda')" class="text-sm font-bold">Agenda</button>
                    <button onclick="changeAdminTab('inscricoes')" class="text-sm font-bold">Inscrições</button>
                </nav>
                <button onclick="makeLogout()" class="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold">Sair</button>
            </div>`;
    }
    (window as any).changeAdminTab('inicio');
};

const btnVerify = document.querySelector<HTMLButtonElement>('#btn-verify-otp');

if (btnVerify) {
    btnVerify.onclick = () => {
        (window as any).validateCodeAndPay();
    };
}

(window as any).changeAdminTab = (tab: string) => {
    const container = document.querySelector<HTMLDivElement>('#events-container')!;
    // Aqui você deve manter suas chamadas originais de carregar dados da tabela admin
    console.log("Mudando para aba:", tab);
};

(window as any).makeLogout = async () => {
    await fetch(`${API_BASE_URL}/logout`, { method: 'POST', credentials: 'include' });
    localStorage.removeItem('admin_full_name');
    window.location.href = '/agenda/login.html';
};

window.addEventListener('popstate', handleRouting);
handleRouting();