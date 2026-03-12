import './style.css';

// --- CONFIGURAÇÃO HÍBRIDA DA API ---
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8080' 
    : 'https://misturadeluz.com/agenda/api/public';

const APP_VERSION = "v1.0.0";

let inscriptionsCache: any[] = [];
let modalOriginalHTML: string = ''; 
let selectedEvent = { id: 0, name: '' };
let currentTarget: 'events' | 'units' | 'event-types' = 'events';

const getSections = () => ({
    selection: document.querySelector<HTMLDivElement>('#step-selection'),
    auth:      document.querySelector<HTMLDivElement>('#step-1'),
    otp:       document.querySelector<HTMLDivElement>('#step-2'),
    registration: document.querySelector<HTMLDivElement>('#step-registration'), // FUNDAMENTAL
    login:     document.querySelector<HTMLDivElement>('#login')
});
     
// 1. Defina a função safeFetch logo abaixo das suas constantes de URL
const safeFetch = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, options);

    // Se o SessionMiddleware retornar 401 (Unauthorized)
    if (response.status === 401) {
            const data = await response.json();
            const msg = "Sessão expirou por falta de atividade";
            alert(msg);
        localStorage.removeItem('admin_full_name');
        window.location.href = 'login.html';
    } 
    return response;
};

const injectVersion = () => {
    // Procura por todos os elementos que precisam da versão
    const elements = document.querySelectorAll('.app-version');
    elements.forEach(el => {
        el.textContent = APP_VERSION;
    });
};

// --- SELEÇÃO DE ELEMENTOS ---
const sections = {
    selection: document.querySelector<HTMLDivElement>('#step-selection')!,
    auth:      document.querySelector<HTMLDivElement>('#step-1')!,
    otp:       document.querySelector<HTMLDivElement>('#step-2')!,
    login:     document.querySelector<HTMLDivElement>('#login')!
};

// Elementos de Input
const nameInput = document.querySelector<HTMLInputElement>('#user-name')!;
const phoneInput = document.querySelector<HTMLInputElement>('#user-phone')!;
const emailInput = document.querySelector<HTMLInputElement>('#email')!;
const otpInput = document.querySelector<HTMLInputElement>('#otp-code')!;

const btnSend = document.querySelector<HTMLButtonElement>('#btn-send-otp')!;
const btnVerify = document.querySelector<HTMLButtonElement>('#btn-verify-otp')!;

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

const checkAuth = async () => {
    try {
        const res = await safeFetch(`${API_BASE_URL}/auth/check`, { credentials: 'include' });
        return res.ok;
    } catch { return false; }
};

const hideAllSections = () => {
    const activeSections = getSections();
    Object.values(activeSections).forEach(s => s?.classList.add('hidden'));
};

const getDayName = (dateString: string) => {
    const capitalize = (s:any) => s && s[0].toUpperCase() + s.slice(1);
    const dayGet = new Date(dateString).toLocaleDateString('pt-BR', { weekday: 'long' });
    const nomeFormatado = capitalize(dayGet);
    return nomeFormatado
};

// --- AGENDA PÚBLICA (COM FILTROS) ---
// --- AGENDA PÚBLICA (ATUALIZADA COM VAGAS) ---
const loadEvents = async (eventSlug: string = '', typeSlug: string = '') => {
   
    const isManutencao = false;  // --- 1. CHAVE GERAL (true = esconde agenda / false = mostra agenda) ---

    // --- 2. PEGA OS ELEMENTOS ---
    const stepSelection = document.querySelector<HTMLElement>('#step-selection');
    const avisoManutencao = document.querySelector<HTMLElement>('#agenda-manutencao');

    // --- 3. A MÁGICA (Toggle) ---
    // Se isManutencao for true, adiciona 'hidden' no step e remove do aviso
    stepSelection?.classList.toggle('hidden', isManutencao);
    avisoManutencao?.classList.toggle('hidden', !isManutencao);

    // Se estiver em manutenção, para a execução aqui e não faz mais nada
    if (isManutencao) return;

    // ... daqui para baixo segue seu código original de busca na API ...
    const container = document.querySelector<HTMLDivElement>('#events-container')!;
    container.innerHTML = '<p class="text-center col-span-full text-slate-400">Buscando horários...</p>';
    
    
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
            // Lógica para o Horário (Início e Fim)
            const dataInicio = new Date(item.scheduled_at);
            const duracao = parseInt(item.duration_minutes) || 0;
            const dataFim = new Date(dataInicio.getTime() + duracao * 60000);

            const horaInicio = dataInicio.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            const horaFim = dataFim.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
            
            // Texto do horário: "14:00h às 15:30h" ou apenas "14:00h"
            const horarioCompleto = duracao > 0 
                ? `${horaInicio}h às ${horaFim}h` 
                : `${horaInicio}h`;

            // Lógica para o Badge de Vagas
            const hasVacancies = item.vacancies > 0;
            const vacanciesLabel = hasVacancies 
                ? `<span class="text-[12px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 uppercase tracking-tighter">
                    ${item.vacancies} vagas restantes
                   </span>`
                : `<span class="text-[9px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20 uppercase tracking-tighter">
                    Esgotado
                   </span>`;

            // Configuração do Botão
            const btnClass = hasVacancies 
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-95" 
                : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50";
            const btnText = hasVacancies ? "Inscreva-se Agora!" : "Vagas Esgotadas";
            const btnAction = hasVacancies ? `onclick="selectEvent(${JSON.stringify(item)})"` : "";

            return `
            
            <div class="bg-slate-950 border border-slate-800 p-6 rounded-3xl shadow-2xl hover:border-fuchsia-600 transition-all duration-300 group relative overflow-hidden">
                
                <div class="flex justify-between items-start mb-4">
                    <span class="bg-violet-600/20 text-violet-400 text-[10px] font-bold px-3 py-1 rounded-full border border-violet-600/30 uppercase tracking-widest">
                        ${item.type_name || 'Geral'}
                    </span>
                    ${vacanciesLabel}
                </div>

                <h3 class="text-xl font-black text-fuchsia-500 mb-1">
                    ${item.event_name}
                </h3>
                
                <div class="flex items-center justify-between mb-6">
                    <div class="flex items-baseline gap-1">
                        <span class="text-xs text-slate-500 font-bold uppercase">R$</span>
                        <span class="text-2xl font-black text-slate-100">${item.event_price}</span>
                    </div>
                    <span class="text-[15px] text-slate-600 font-black uppercase tracking-tighter">${item.unit_name}</span>
                </div>
                
                <div class="space-y-2 mb-6 border-l-2 border-violet-600/30 pl-4">
                    <p class="text-sm text-slate-300 flex items-center gap-2">
                        <span class="text-violet-500">📅</span> ${getDayName(item.scheduled_at)}, ${new Date(item.scheduled_at).toLocaleDateString('pt-BR')}
                    </p>
                    <p class="text-sm text-slate-400 flex items-center gap-2 italic">
                        <span class="text-fuchsia-500 text-xs">⏰</span> ${horarioCompleto}
                    </p>
                </div>
                
                <button ${btnAction} class="w-full ${btnClass} text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all transform">
                    ${btnText}
                </button>
            </div>
            `;
        }).join('');
    } catch (e) { 
        container.innerHTML = '<p class="text-center col-span-full text-red-500">Erro ao carregar agenda.</p>'; 
    }
};

const nextStep = (current: number) => {
    const currentSection = document.querySelector(`#reg-step-${current}`);
    const nextSection = document.querySelector(`#reg-step-${current + 1}`);
    
    if (currentSection && nextSection) {
        currentSection.classList.add('hidden');
        nextSection.classList.remove('hidden');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

const prevStep = (current: number) => {
    const currentSection = document.querySelector(`#reg-step-${current}`);
    const prevSection = document.querySelector(`#reg-step-${current - 1}`);
    
    if (currentSection && prevSection) {
        currentSection.classList.add('hidden');
        prevSection.classList.remove('hidden');
    }
};

const finalizarInscricao = async () => {
    const form = document.querySelector<HTMLFormElement>('#form-inscricao')!;
    const formData = new FormData(form);
    const rawData = Object.fromEntries(formData);

    const payload = {
        // Dados da Pessoa
        full_name: rawData.full_name,
        email: rawData.email,
        phone: rawData.phone,
        profession: rawData.profession,
        location: `${rawData.neighborhood}, ${rawData.city}`,
        
        // Dados da Inscrição
        schedule_id: (window as any).selectedEventId,
        
        // Dados da Anamnese (Ficha Técnica)
        is_medium: rawData.is_medium === 'on' ? 1 : 0,
        is_tule_member: rawData.is_tule_member === 'on' ? 1 : 0,
        religion: rawData.religion,
        course_reason: rawData.course_reason,
        expectations: rawData.expectations,
        obs_motived: rawData.obs_motived,
        first_time: rawData.first_time === 'on' ? 1 : 0
    };

    // Chamada para o seu Controller de Inscrição
    const res = await fetch(`${API_BASE_URL}/register-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        alert("✨ Inscrição concluída! A nossa equipa entrará em contacto em breve.");
        window.location.href = "/agenda"; // Passo 6: Retorno para a agenda
    }
};

btnSend.addEventListener('click', async () => {
    const email = emailInput.value.trim();

    if (!email || !email.includes('@')) {
        alert("Por favor, insira um e-mail válido.");
        return;
    }

    // Desativa o botão para evitar cliques duplos
    btnSend.disabled = true;
    btnSend.innerHTML = "Verificando...";

    try {
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
            // Caso 1: Já existe pagamento aprovado sem inscrição
            if (confirm("Identificamos um pagamento aprovado para este e-mail. Deseja realizar a inscrição agora ou prefere efetuar um novo pagamento para outra vaga?")) {
                // Usuário escolheu usar o pagamento existente
                (window as any).isPrePaid = true;
                (window as any).showRegistrationForm((window as any).selectedSchedule);
            } else {
                // Usuário escolheu pagar novamente (nova vaga)
                prosseguirParaCheckout();
            }
        } else {
            // Caso 2: Não há pagamentos aprovados, vai para o fluxo normal
            prosseguirParaCheckout();
        }

    } catch (error) {
        console.error("Erro na validação:", error);
        alert("Erro ao validar e-mail. Tente novamente.");
    } finally {
        btnSend.disabled = false;
        btnSend.innerHTML = "Validar E-mail e Prosseguir →";
    }
});

// Função auxiliar para o Passo 3 do Roteiro
const prosseguirParaCheckout = () => {
    (window as any).isPrePaid = false;
    // Aqui chamaremos a função que você já deve ter de Checkout do Mercado Pago
    // enviando (window as any).selectedSchedule
    console.log("Encaminhando para Passo 3: Checkout...");
    // await iniciarCheckoutMercadoPago((window as any).selectedSchedule);
};

emailInput?.addEventListener('blur', async () => {
    const email = emailInput.value.trim();
    
    // MUDANÇA 1: Reset visual e da flag sempre que o e-mail muda
    (window as any).isPrePaid = false;
    const submitBtn = document.querySelector('#btn-submit-registration') as HTMLButtonElement;
    if (submitBtn) {
        submitBtn.innerHTML = "Finalizar e Ir para Pagamento";
        submitBtn.classList.replace('bg-emerald-600', 'bg-violet-600');
    }

    if (email.length > 5 && email.includes('@')) {
        try {
            const response = await fetch(`${API_BASE_URL}/check-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });
            
            const result = await response.json();

            if (result.has_paid) {
                if (submitBtn) {
                    submitBtn.innerHTML = "✅ Pagamento Identificado - Agendar Agora";
                    submitBtn.classList.replace('bg-violet-600', 'bg-emerald-600');
                    (window as any).isPrePaid = true;
                }
            }
        } catch (error) {
            console.error("Erro ao verificar pagamento prévio:", error);
        }
    }
});

const setupRegistrationSubmit = () => {
    const form = document.querySelector<HTMLFormElement>('#form-complete-registration');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();

        const scheduleId = (window as any).selectedEventId;

        if (!scheduleId) {
            alert("Erro de sistema: O ID do evento se perdeu. Por favor, volte à tela inicial e selecione o curso novamente.");
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        const payload = {
            student_full_name: data.student_full_name,
            student_email: data.student_email,
            student_phone: data.student_phone,
            activity_professional: data.activity_professional,
            neighborhood: data.neighborhood,
            city: data.city,
            schedule_id: scheduleId, 
            is_medium: data.is_medium ? 1 : 0,
            is_tule_member: data.is_tule_member ? 1 : 0,
            first_time: data.first_time ? 1 : 0,
            religion_mention: data.religion_mention,
            course_reason: data.course_reason,
            obs_motived: data.obs_motived,
            expectations: "Inscrição via Formulário SPA"
        };

        // MUDANÇA 2: Lógica de Decisão do Endpoint (Direct vs Normal)
        const endpoint = (window as any).isPrePaid 
            ? `${API_BASE_URL}/api/public/subscribe-direct` 
            : `${API_BASE_URL}/api/public/register`;

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (res.ok) {
                alert("Inscrição concluída com sucesso!");
                window.location.hash = '#step-selection'; 
                window.location.reload(); 
            } else {
                alert("Erro ao salvar inscrição: " + (result.mensagem || "Verifique os dados."));
            }
        } catch (error) {
            alert("Não foi possível conectar ao servidor.");
        }
    };
};

// --- FUNÇÃO SHOW REGISTRATION FORM ---
(window as any).showRegistrationForm = (item: any) => {
    hideAllSections();
    
    const activeSections = getSections();
    if (activeSections.registration) {
        activeSections.registration.classList.remove('hidden');
    }

    const eventTitle = document.querySelector('#reg-event-name');
    const eventType = document.querySelector('#reg-event-type');
    const eventUnit = document.querySelector('#reg-event-unit');
    const eventDate = document.querySelector('#reg-event-date');

    if (eventTitle) eventTitle.textContent = item.event_name || item.name;
    if (eventType) eventType.textContent = item.type_name || item.type;
    if (eventUnit) eventUnit.textContent = item.unit_name || item.unit;
    
    if (eventDate && (item.scheduled_at || item.rawDate)) {
        const dataRef = item.scheduled_at || item.rawDate;
        const diaSemana = getDayName(dataRef); 
        const dataFormatada = new Date(dataRef).toLocaleDateString('pt-BR');
        const horaFormatada = new Date(dataRef).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
        eventDate.innerHTML = `<span>📅</span> ${diaSemana}, ${dataFormatada} às ${horaFormatada}h`;
    }

    setupRegistrationSubmit(); 
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- FUNÇÃO PARA VER FICHA COMPLETA ---
(window as any).openFullAnamnesis = (subscribed_id: number) => {
    const ficha = inscriptionsCache.find((f: any) => f.subscribed_id === subscribed_id);
    if (!ficha) return;

    const modal = document.querySelector<HTMLDivElement>('#modal-anamnese');
    if (!modal) return;

    const conteudoFicha = `
        <div class="space-y-6 animate-in fade-in duration-300">
            <div class="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-inner">
                <p class="text-[9px] font-black text-fuchsia-400 uppercase tracking-[0.2em] mb-3">Dados do Curso</p>
                <h4 class="text-xl font-black mb-1">${ficha.event_name}</h4>
                <p class="text-xs font-bold text-slate-400 uppercase mb-4">${ficha.type_name} • ${ficha.unit_name}</p>
                <div class="flex items-center gap-2 text-xs text-slate-300">
                    <span>📅 ${new Date(ficha.scheduled_at).toLocaleDateString('pt-BR')}</span>
                    <span>⏰ ${new Date(ficha.scheduled_at).toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}h</span>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <b class="text-[9px] text-slate-400 uppercase block mb-1">Telefone</b>
                    <span class="text-sm font-bold">${ficha.phone || '-'}</span>
                </div>
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <b class="text-[9px] text-slate-400 uppercase block mb-1">Profissão</b>
                    <span class="text-sm font-bold">${ficha.activity_professional || '-'}</span>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-x-4 gap-y-3 p-2">
                <div class="flex items-center gap-2 text-sm font-medium">
                    ${ficha.is_medium == 1 ? '✅' : '❌'} <span class="text-slate-600">Médium</span>
                </div>
                <div class="flex items-center gap-2 text-sm font-medium">
                    ${ficha.is_tule_member == 1 ? '✅' : '❌'} <span class="text-slate-600">Membro TULE</span>
                </div>
                <div class="flex items-center gap-2 text-sm font-medium">
                    ${ficha.first_time == 1 ? '✅' : '❌'} <span class="text-slate-600">Primeira Vez</span>
                </div>
                <div class="text-sm font-medium">
                    <span class="text-slate-400">Religião:</span> ${ficha.religion == 1 ? (ficha.religion_mention || 'Sim') : 'Não'}
                </div>
            </div>

            <div class="space-y-4">
                <div class="p-5 bg-fuchsia-50/50 rounded-3xl border border-fuchsia-100">
                    <b class="text-[9px] text-fuchsia-600 uppercase block mb-2 tracking-widest">Motivação / Obs. Motived</b>
                    <p class="text-sm text-slate-700 italic leading-relaxed">"${ficha.obs_motived || ficha.course_reason || 'Nenhuma observação detalhada.'}"</p>
                </div>
                <div>
                    <b class="text-[9px] text-slate-400 uppercase block mb-1 ml-1">Expectativas do Aluno</b>
                    <p class="text-sm text-slate-600 px-1">${ficha.expectations || '-'}</p>
                </div>
            </div>
            <button onclick="document.getElementById('modal-anamnese').classList.add('hidden')" 
                    class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all mt-4">
                Fechar Ficha
            </button>
        </div>
    `;

    const modalTitle = modal.querySelector('h2');
    const modalBody = modal.querySelector('.p-8') || modal.querySelector('#modal-select-list')?.parentElement;

    if (modalTitle) modalTitle.innerText = `Ficha de Inscrição: ${ficha.full_name}`;
    if (modalBody) modalBody.innerHTML = conteudoFicha;
    modal.classList.remove('hidden');
};

window.onclick = (event) => {
    const modalCrud = document.getElementById('modal-crud');
    const modalAnamnese = document.getElementById('modal-anamnese');
    if (event.target === modalCrud) modalCrud?.classList.add('hidden');
    if (event.target === modalAnamnese) modalAnamnese?.classList.add('hidden');
};

const loadInscriptionsData = async () => {
    const accordion = document.querySelector('#inscriptionsAccordion');
    if (!accordion) return;

    try {
        const res = await safeFetch(`${API_BASE_URL}/subscribers`, { credentials: 'include' });
        const rawData = await res.json();
        inscriptionsCache = rawData;

        if (!rawData || rawData.length === 0) {
            accordion.innerHTML = '<p class="text-center py-10">Nenhum registro encontrado.</p>';
            return;
        }

        const grouped = rawData.reduce((acc: any, item: any) => {
            if (!acc[item.person_id]) {
                acc[item.person_id] = {
                    name: item.full_name,
                    email: item.email,
                    phone: item.phone,
                    details: {
                        profession: item.activity_professional,
                        city: item.city,
                        neighborhood: item.neighborhood
                    },
                    events: []
                };
            }
            acc[item.person_id].events.push(item);
            return acc;
        }, {});

        accordion.innerHTML = Object.keys(grouped).map((personId, index) => {
            const person = grouped[personId];
            return `
            <div class="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm mb-4">
                <button onclick="toggleAccordion(${index})" class="w-full p-8 flex items-center justify-between hover:bg-slate-50 transition-all">
                    <div class="flex items-center gap-6">
                        <div class="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl">
                            ${person.name.charAt(0)}
                        </div>
                        <div class="text-left">
                            <h3 class="text-xl font-black text-slate-900">${person.name}</h3>
                            <p class="text-sm text-slate-500 font-medium">${person.email} • ${person.phone}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-6">
                        <span class="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">
                            ${person.events.length} EVENTO(S)
                        </span>
                        <span id="icon-${index}" class="text-slate-400 text-xl transition-transform">▼</span>
                    </div>
                </button>
                <div id="content-${index}" class="hidden border-t border-slate-100 bg-slate-50/40 p-8">
                    <div class="mb-8 p-6 bg-white rounded-3xl border border-slate-200 flex justify-between items-center shadow-sm">
                        <div class="text-sm"><b class="text-slate-400 uppercase text-[10px] block mb-1">Profissão</b> <span class="text-lg font-bold text-slate-700">${person.details.profession || '-'}</span></div>
                        <div class="text-sm text-right"><b class="text-slate-400 uppercase text-[10px] block mb-1">Localização</b> <span class="text-lg font-bold text-slate-700">${person.details.neighborhood}, ${person.details.city}</span></div>
                    </div>
                    <h4 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Histórico de Inscrições</h4>
                    <div class="space-y-6">
                        ${person.events.map((ev: any) => {
                            const statusColor = ev.payment_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
                            return `
                            <div class="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-md relative group">
                                <div class="absolute top-8 right-8 ${statusColor} px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter">
                                    ${ev.payment_status || 'Pendente'}
                                </div>
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div>
                                        <div class="mb-4">
                                            <span class="text-xs font-black text-blue-500 uppercase tracking-widest">Inscrição #${ev.subscribed_id}</span>
                                            <h5 class="text-2xl font-black text-slate-900 mt-1">${ev.event_name || 'Evento não encontrado'}</h5>
                                            <p class="text-sm font-bold text-slate-400 uppercase">${ev.type_name || 'Tipo não informado'} | ${ev.unit_name || 'Unidade'}</p>
                                        </div>
                                        <div class="grid grid-cols-2 gap-4 mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div class="text-xs"><b class="text-slate-400 uppercase block text-[9px]">Data</b> ${new Date(ev.data_inscricao).toLocaleDateString()}</div>
                                            <div class="text-xs"><b class="text-slate-400 uppercase block text-[9px]">Valor</b> <span class="font-black text-slate-900">R$ ${ev.valor_pago || '0,00'}</span></div>
                                            <div class="text-xs col-span-2"><b class="text-slate-400 uppercase block text-[9px]">E-mail Pagador</b> <span class="truncate block">${ev.payer_email || 'N/A'}</span></div>
                                        </div>
                                    </div>
                                    <div class="bg-fuchsia-50/30 p-6 rounded-[2rem] border border-fuchsia-100 flex flex-col justify-between">
                                        <div>
                                            <p class="text-[10px] font-black text-fuchsia-600 uppercase mb-3 tracking-widest">Anamnese do Evento</p>
                                            <p class="text-base text-slate-600 italic leading-relaxed">
                                                "${ev.course_reason ? ev.course_reason.substring(0, 120) + '...' : 'Ficha não preenchida.'}"
                                            </p>
                                        </div>
                                      <button onclick="openFullAnamnesis(${ev.subscribed_id})" 
                                            class="mt-4 flex items-center gap-2 text-sm font-black text-fuchsia-600 hover:text-fuchsia-800 transition-colors uppercase tracking-widest">
                                        Ver ficha completa ➜
                                    </button>
                                    </div>
                                </div>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
            `;
        }).join('');
    } catch (e) {
        accordion.innerHTML = '<p class="text-center text-red-500">Erro ao renderizar dados.</p>';
    }
};

(window as any).toggleAccordion = (index: number) => {
    const content = document.getElementById(`content-${index}`);
    const icon = document.getElementById(`icon-${index}`);
    if (content && icon) {
        content.classList.toggle('hidden');
        icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
    }
};

// --- DASHBOARD ADMIN ---
const renderAdminDashboard = async () => {
    hideAllSections();
    sections.selection.classList.remove('hidden');
    
    const container = document.querySelector<HTMLDivElement>('#events-container')!;
    const header = sections.selection.querySelector('header');
    const adminName = localStorage.getItem('admin_full_name') || 'Administrador';

    if (header) {
        header.className = "fixed top-0 left-0 w-full bg-white border-b border-slate-100 z-50 shadow-sm";
        header.innerHTML = `
            <div class="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
                <nav class="flex items-center gap-8 h-full">
                    <span class="font-black text-slate-900 text-xl tracking-tighter mr-4"><span class="text-slate-400">fast</span>Payment <span class="app-version text-[13px] text-gray-400"></span></span>
                    <button onclick="changeAdminTab('inicio')" class="h-full text-sm font-bold transition-all px-1 border-transparent">Início</button>
                    <button onclick="changeAdminTab('agenda')" class="h-full text-sm font-bold transition-all px-1 border-transparent">Agenda</button>
                    <button onclick="changeAdminTab('inscricoes')" class="h-full text-sm font-bold transition-all px-1 border-transparent">Inscrições</button>
                </nav>
                <div class="flex items-center gap-4">
                    <span class="text-xs font-bold text-slate-400">Olá, ${adminName}</span>
                    <button onclick="makeLogout()" class="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all">Sair</button>
                </div>
            </div>
        `;
    }

    injectVersion();
    container.className = "max-w-7xl mx-auto px-6 pt-24 pb-10";
    (window as any).changeAdminTab('inicio');
};

(window as any).closeCrudModal = () => {
    const modal = document.querySelector<HTMLDivElement>('#modal-crud');
    if (modal) modal.classList.add('hidden');
};

// --- CONTROLE DE ABAS ---
(window as any).changeAdminTab = (tab: string) => {
    const container = document.querySelector<HTMLDivElement>('#events-container')!;
    const menuButtons = document.querySelectorAll('header nav button');
    
    menuButtons.forEach(btn => {
        btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        btn.classList.add('text-slate-500');
        
        if (btn.textContent?.toLowerCase().trim() === tab.toLowerCase().trim() || 
           (tab === 'inicio' && btn.textContent?.toLowerCase() === 'início')) {
            btn.classList.remove('text-slate-500');
            btn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        }
        if (btn.textContent?.toLowerCase().trim() === tab.toLowerCase().trim() || 
           (tab === 'agenda' && btn.textContent?.toLowerCase() === 'agenda')) {
            btn.classList.remove('text-slate-500');
            btn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        }
        if (btn.textContent?.toLowerCase().trim() === tab.toLowerCase().trim() || 
           (tab === 'inscricoes' && btn.textContent?.toLowerCase() === 'inscrições')) {
            btn.classList.remove('text-slate-500');
            btn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        }
    });
    
    switch (tab) {
        case 'inicio':
            const currentName = localStorage.getItem('admin_full_name') || 'Administrador';
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <div class="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center text-4xl mb-6">👋</div>
                    <h1 class="text-4xl font-black text-slate-900 mb-2">Bem-vindo, ${currentName}!</h1>
                    <p class="text-slate-500 max-w-md">Selecione uma opção no menu superior para começar a gerenciar sua agenda.</p> 
                    <div class="mt-4 text-center">
                        <span class="app-version text-[10px] text-gray-400"></span>
                    </div>
                </div>
            `;
            injectVersion();
            break;

    case 'agenda':
    container.className = "max-w-[1600px] mx-auto px-6 pt-24 pb-10"; 
    container.innerHTML = `
        <div class="space-y-6">
            <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <form id="formAgendamento" class="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                    <div class="md:col-span-2">
                        <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">Data/Hora</label>
                        <input type="datetime-local" id="datahora" class="w-full border border-slate-200 rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" required>
                    </div>
                    <div class="md:col-span-1">
                        <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">Duração</label>
                        <input type="number" id="duration-input" min="1" placeholder="min" class="w-full border border-slate-200 rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-center" required>
                    </div>
                    <div class="md:col-span-2">
                        <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">Evento</label>
                        <div class="flex">
                            <select id="select-evento" class="flex-1 border border-slate-200 rounded-l-xl p-2 text-sm outline-none bg-white" required></select>
                            <button type="button" onclick="openCrudModal('events')" class="bg-slate-50 px-3 border border-l-0 border-slate-200 rounded-r-xl hover:bg-slate-100 font-bold">+</button>
                        </div>
                    </div>
                    <div class="md:col-span-2 ml-7">
                        <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">Tipo</label>
                        <div class="flex">
                            <select id="select-tipo" class="flex-1 border border-slate-200 rounded-l-xl p-2 text-sm outline-none bg-white" required></select>
                            <button type="button" onclick="openCrudModal('event-types')" class="bg-slate-50 px-2 border border-l-0 border-slate-200 rounded-r-xl font-bold">+</button>
                        </div>
                    </div>
                    <div class="md:col-span-1 ml-8">
                        <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">Unidade</label>
                        <div class="flex">
                            <select id="select-unidade" class="flex-1 border border-slate-200 rounded-l-xl p-2 text-sm outline-none bg-white" required></select>
                            <button type="button" onclick="openCrudModal('units')" class="bg-slate-50 px-3 border border-l-0 border-slate-200 rounded-r-xl font-bold">+</button>
                        </div>
                    </div>
                    <div class="md:col-span-3 ml-38">
                        <label class="block text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">Vagas</label>
                        <input type="number" id="vagas-input" min="0" class="w-full border border-slate-200 rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-center" required>
                    </div>
                    <div class="md:col-span-1">
                        <button type="submit" class="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-[10px] uppercase hover:bg-blue-700 transition-all shadow-md">
                            Salvar
                        </button>
                    </div>
                </form>
            </div>
            <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <table class="w-full text-left text-sm">
                    <thead class="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                        <tr>
                            <th class="p-4">Dia</th>
                            <th class="p-4">Data</th>
                            <th class="p-4">Evento</th>
                            <th class="p-4">Tipo</th>
                            <th class="p-4 text-center">Preço</th>
                            <th class="p-4 text-center">Unidade</th>
                            <th class="p-4 text-center">Vagas</th>
                            <th class="p-4 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="adminTableBody" class="divide-y divide-slate-50"></tbody>
                </table>
            </div>
        </div>
    `;
    loadAdminTableData();
    loadFormOptions(); 
    setupFormListener();
    break;

        case 'inscricoes':
            container.innerHTML = `
                <div class="col-span-full space-y-6">
                    <h2 class="text-2xl font-black text-slate-900 mb-8">Gestão de Alunos e Inscrições</h2>
                    <div id="inscriptionsAccordion" class="space-y-4">
                        <p class="text-center py-10 text-slate-400">Organizando registros...</p>
                    </div>
                </div>
            `;
            loadInscriptionsData();
            break;
    }
};

// --- CARREGAMENTO DE DADOS (ADMIN) ---
const loadAdminTableData = async () => {
    const tbody = document.querySelector('#adminTableBody');
    if (!tbody) return;

    try {
        const res = await safeFetch(`${API_BASE_URL}/schedules`, { credentials: 'include' });
        const data = await res.json();
        
        tbody.innerHTML = data.map((item: any) => {
            const dataInicio = new Date(item.scheduled_at);
            const duration = parseInt(item.duration_minutes) || 0;
            const dataFim = new Date(dataInicio.getTime() + duration * 60000);
            const horaInicio = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const horaFim = dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const exibicaoHorario = duration > 0 ? `${horaInicio} - ${horaFim}` : `${horaInicio}`;

            return `
                <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50 text-slate-700">
                    <td class="p-4 font-bold text-slate-900">${getDayName(item.scheduled_at)}</td>
                    <td class="p-4 whitespace-nowrap"><div class="font-medium">${dataInicio.toLocaleDateString('pt-BR')} - ${exibicaoHorario}</div></td>
                    <td class="p-4 font-bold text-slate-900">${item.event_name}</td>
                    <td class="p-4 text-blue-600 font-semibold">${item.type_name || '-'}</td>
                    <td class="p-4 text-center font-black text-slate-900">R$ ${item.event_price}</td>
                    <td class="p-4 text-center font-bold text-slate-500 uppercase text-[11px] tracking-tight">${item.unit_name}</td>
                    <td class="p-4 text-center">
                        <span class="px-3 py-1 rounded-full font-black text-[10px] uppercase ${item.vacancies > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}">
                            ${item.vacancies} Vagas
                        </span>
                    </td>
                    <td class="p-4 text-center">
                        <button onclick="deleteSchedule(${item.schedule_id})" class="text-red-400 hover:text-red-600 font-bold transition-colors p-2 hover:bg-red-50 rounded-lg">Excluir</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (e) { 
        tbody.innerHTML = '<tr><td colspan="8" class="p-10 text-center text-red-500">Erro ao carregar dados.</td></tr>'; 
    }
};

const loadFormOptions = async () => {
    const opt = { credentials: 'include' as RequestCredentials };
    try {
        const [ev, un, tp] = await Promise.all([
            safeFetch(`${API_BASE_URL}/events`, opt).then(r => r.json()),
            safeFetch(`${API_BASE_URL}/units`, opt).then(r => r.json()),
            safeFetch(`${API_BASE_URL}/event-types`, opt).then(r => r.json())
        ]);
        const sEv = document.querySelector<HTMLSelectElement>('#select-evento');
        const sUn = document.querySelector<HTMLSelectElement>('#select-unidade');
        const sTp = document.querySelector<HTMLSelectElement>('#select-tipo');
        if (sEv) sEv.innerHTML = '<option value="" disabled selected>Evento</option>' + ev.map((e: any) => `<option value="${e.id}">${e.name}</option>`).join('');
        if (sUn) sUn.innerHTML = '<option value="" disabled selected>Unidade</option>' + un.map((u: any) => `<option value="${u.id}">${u.name}</option>`).join('');
        if (sTp) sTp.innerHTML = '<option value="" disabled selected>Tipo</option>' + tp.map((t: any) => `<option value="${t.id}">${t.name}</option>`).join('');
    } catch (e) { console.error(e); }
};

const setupFormListener = () => {
    const form = document.querySelector<HTMLFormElement>('#formAgendamento');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            scheduled_at: (document.querySelector('#datahora') as HTMLInputElement).value,
            event_id: parseInt((document.querySelector('#select-evento') as HTMLSelectElement).value, 10),
            unit_id: parseInt((document.querySelector('#select-unidade') as HTMLSelectElement).value, 10),
            event_type_id: parseInt((document.querySelector('#select-tipo') as HTMLSelectElement).value, 10),
            vacancies: parseInt((document.querySelector('#vagas-input') as HTMLInputElement).value, 10) || 0,
            duration_minutes: parseInt((document.querySelector('#duration-input') as HTMLInputElement).value, 10) || 0,
            status: 'available'
        };

        // MUDANÇA 3: Alerta corrigido para mostrar os dados do objeto
        alert("Salvando agendamento: " + JSON.stringify(payload, null, 2));

        const res = await safeFetch(`${API_BASE_URL}/schedules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (res.ok) { 
            alert("Salvo com sucesso!"); 
            loadAdminTableData(); 
            form.reset();
        }
    });
};

// --- MODAL CRUD ---
(window as any).openCrudModal = async (target: 'events' | 'units' | 'event-types') => {
    currentTarget = target; 
    const modal = document.querySelector<HTMLDivElement>('#modal-crud')!;
    const modalBody = modal.querySelector('.p-8') || modal.querySelector('#modal-select-list')?.parentElement;

    if (!modalOriginalHTML && modalBody) modalOriginalHTML = modalBody.innerHTML; 
    else if (modalBody) modalBody.innerHTML = modalOriginalHTML; 

    const title = document.querySelector<HTMLHeadingElement>('#modal-title')!;
    title.innerText = `Gerenciar ${target === 'events' ? 'Eventos' : target === 'units' ? 'Unidades' : 'Tipos de Evento'}`;
    
    const currentPriceField = modal.querySelector<HTMLDivElement>('#field-price');
    if (currentPriceField) currentPriceField.classList.toggle('hidden', target !== 'events');

    modal.classList.remove('hidden');
    await refreshModalList();
};

async function refreshModalList() {
    const url = `${API_BASE_URL}/${currentTarget}`;
    try {
        const res = await safeFetch(url, { credentials: 'include' });
        const data = await res.json();
        const select = document.querySelector<HTMLSelectElement>('#modal-select-list');
        if (select) select.innerHTML = '<option value="">Excluir...</option>' + data.map((item: any) => `<option value="${item.id}">${item.name || item.nome}</option>`).join('');
    } catch (e) { console.error(e); }
}   

// --- FOOTER VERSION ---
const footer = document.createElement('div');
footer.className = "col-span-full text-center mt-12 mb-8 flex flex-col items-center gap-2";
footer.innerHTML = `<span class="opacity-30 text-[9px] text-white font-mono uppercase tracking-widest">MISTURA DE LUZ <span class="app-version"></span></span>`;
injectVersion();

// --- SELEÇÃO DE EVENTO ---
(window as any).selectEvent = (item: any) => {
    if (item.vacancies <= 0) {
        alert("Desculpe, este evento acabou de esgotar as vagas.");
        return;
    }

    // Guardamos o objeto completo para usar no Checkout e na Inscrição
    (window as any).selectedSchedule = item; 
    (window as any).selectedEventId = item.schedule_id; 

    // Preenche o título visualmente se necessário
    const eventNameDisplay = document.querySelector('#reg-event-name');
    if (eventNameDisplay) eventNameDisplay.textContent = item.event_name;

    hideAllSections();
    
    // Conforme seu roteiro: Passo 2 - Validação de e-mail
    const step1 = document.querySelector<HTMLDivElement>('#step-1');
    if (step1) step1.classList.remove('hidden');
};

(window as any).makeLogout = async () => {
    try { await fetch(`${API_BASE_URL}/logout`, { method: 'POST', credentials: 'include' }); } catch (e) {}
    localStorage.removeItem('admin_full_name');
    window.location.href = '/agenda/login.html';
};

(window as any).makeLogin = async () => {
    const email = document.querySelector<HTMLInputElement>('#admin-email')!.value;
    const password = document.querySelector<HTMLInputElement>('#admin-password')!.value;
    try {
        const res = await safeFetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('admin_full_name', data.user.full_name);
            window.location.href = 'index.html#admin';
        } else { alert("Login inválido."); }
    } catch (e) { console.error(e); }
};

(window as any).deleteSchedule = async (id: number) => {
    if (!confirm("Excluir?")) return;
    const res = await safeFetch(`${API_BASE_URL}/schedules/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) loadAdminTableData();
};

(window as any).saveCrudItem = async () => {
    const nameInput = document.querySelector<HTMLInputElement>('#modal-input-name');
    const priceInput = document.querySelector<HTMLInputElement>('#modal-input-price');
    if (!nameInput?.value) return alert("Nome!");
    const payload: any = { name: nameInput.value };
    if (currentTarget === 'events') payload.price = priceInput?.value;
    try {
        const res = await safeFetch(`${API_BASE_URL}/${currentTarget}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });
        if (res.ok) {
            if (nameInput) nameInput.value = '';
            if (priceInput) priceInput.value = '';
            await refreshModalList();
            await loadFormOptions();
            alert("Salvo!");
        }
    } catch (e) { console.error(e); }
};

(window as any).deleteCrudItem = async () => {
    const id = (document.querySelector('#modal-select-list') as HTMLSelectElement).value;
    if (!id || !confirm("Excluir?")) return;
    try {
        const res = await safeFetch(`${API_BASE_URL}/${currentTarget}/${id}`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) { await refreshModalList(); await loadFormOptions(); }
    } catch (e) { console.error(e); }
};

// --- INICIALIZAÇÃO ---
window.addEventListener('popstate', handleRouting);
handleRouting();