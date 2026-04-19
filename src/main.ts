import './style.css';

const urlParams = new URLSearchParams(window.location.search);
const mpStatus = urlParams.get('status') || urlParams.get('collection_status');

// Se o status aparecer por um milissegundo, a gente trava ele aqui
if (mpStatus === 'approved' || mpStatus === 'success') {
    sessionStorage.setItem('mp_success_flag', 'true');
    console.log("🎯 [RASTREADOR] Pagamento detectado e travado na sessão!");
}

// --- CONFIGURAÇÃO HÍBRIDA DA API ---
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8080' 
    : 'https://beta.misturadeluz.com';

const APP_VERSION = "1.0.0beta";

let inscriptionsCache: any[] = [];
let modalOriginalHTML: string = ''; 
let selectedEvent = { id: 0, name: ''    };
let currentTarget: 'events' | 'units' | 'event-types' = 'events';

const getSections = () => ({
    selection: document.querySelector<HTMLDivElement>('#step-selection'),
    auth:      document.querySelector<HTMLDivElement>('#step-1'),
    otp:       document.querySelector<HTMLDivElement>('#step-2'),
    registration: document.querySelector<HTMLDivElement>('#step-registration'), // FUNDAMENTAL
    login:     document.querySelector<HTMLDivElement>('#login')
});
     

const checkIncomingPayment = () => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status') || params.get('collection_status');
    
    if (status === 'approved' || status === 'success') {
        sessionStorage.setItem('mp_success_flag', 'true');
        console.log("🎯 [Scanner] Pagamento capturado via redirecionamento!");
    }
};
checkIncomingPayment();

const safeFetch = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, options);
    if (response.status === 401) {
        alert("Sessão expirou por falta de atividade");
        localStorage.removeItem('admin_full_name');
        window.location.href = 'login.html';
    } 
    return response;
};

const injectVersion = () => {
    document.querySelectorAll('.app-version').forEach(el => {
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
                // --- CORREÇÃO DA DATA ---
                // Trocamos "-" por "/" para garantir compatibilidade total
                const dataFormatada = item.scheduled_at.replace(/-/g, '/');
                const dataInicio = new Date(dataFormatada);
                
                const duracao = parseInt(item.duration_minutes) || 0;
                const dataFim = new Date(dataInicio.getTime() + duracao * 60000);

                const horaInicio = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                const horaFim = dataFim.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                
                // --- CORREÇÃO DA VARIÁVEL ---
                // Você usou 'horarioCompleto' em cima e 'horarioExibicao' em baixo em alguns testes
                const horarioExibicao = duracao > 0 
                    ? `${horaInicio}h às ${horaFim}h` 
                    : `${horaInicio}h`;

                const hasVacancies = item.vacancies > 0;
                const vacanciesLabel = hasVacancies 
                    ? `<span class="text-[12px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 uppercase tracking-tighter">
                        ${item.vacancies} vagas restantes
                    </span>`
                    : `<span class="text-[9px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20 uppercase tracking-tighter">
                        Esgotado
                    </span>`;

                const btnClass = hasVacancies 
                    ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-95" 
                    : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50";
                
                const btnText = hasVacancies ? "Inscreva-se Agora!" : "Vagas Esgotadas";
                
                // Importante: JSON.stringify no onclick precisa de escape para aspas
                const btnAction = hasVacancies ? `onclick='selectEvent(${JSON.stringify(item)})'` : "";

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
                            <span class="text-violet-500">📅</span> ${getDayName(item.scheduled_at)}, ${dataInicio.toLocaleDateString('pt-BR')}
                        </p>
                        <p class="text-sm text-slate-400 flex items-center gap-2 italic">
                            <span class="text-fuchsia-500 text-xs">⏰</span> ${horarioExibicao}
                        </p>
                    </div>
                    
                    <button ${btnAction} class="w-full ${btnClass} text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all transform">
                        ${btnText}
                    </button>
                </div>
                `;
            }).join('');
        } catch (e) { 
            console.error("ERRO REAL DETECTADO:", e); // <--- Adicione isso aqui!
            container.innerHTML = '<p class="text-center col-span-full text-red-500">Erro ao carregar agenda.</p>'; 
        }
};


btnSend.addEventListener('click', async () => {
    const email = emailInput.value.trim();
    const emailTeste = "teste_user_2904943887590020914@testeuser.com";
    
    // Recupera o ID de forma garantida (Global ou LocalStorage)
    const scheduleId = parseInt((window as any).selectedEventId) || 
                       parseInt(localStorage.getItem('selectedScheduleId') || '0');

    if (!email || !email.includes('@')) {
        alert("Por favor, insira um e-mail válido.");
        return;
    }

    if (!scheduleId || isNaN(scheduleId)) {
        alert("Erro: Selecione um evento na agenda primeiro.");
        return;
    }

    // --- LÓGICA HÍBRIDA (PULA OTP) ---
    if (email === emailTeste) {
        console.log("🚀 Modo Teste: Indo direto para o Checkout...");
        await proceedToCheckout();
        return;
    }

    btnSend.disabled = true;
    btnSend.innerHTML = "Verificando...";

    try {
        const response = await fetch(`${API_BASE_URL}/api/check-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, schedule_id: scheduleId })
        });

        const result = await response.json();

        if (result.has_paid) {
            if (confirm("Pagamento aprovado encontrado! Ir para a ficha de inscrição?")) {
                (window as any).isPrePaid = true;
                (window as any).showRegistrationForm((window as any).selectedSchedule);
            }
        } else {
            // Segue para geração de OTP normal...
            const otpRes = await fetch(`${API_BASE_URL}/api/auth/generate-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (otpRes.ok) {
                alert("Enviamos um código de 6 dígitos para o seu e-mail.");
                hideAllSections();
                getSections().otp?.classList.remove('hidden');
            }
        }
    } catch (error) {
        console.error("Erro no check-payment:", error);
    } finally {
        btnSend.disabled = false;
        btnSend.innerHTML = "Enviar";
    }
});

// 1. Vincule o clique ao botão de verificar (ajuste o ID se for outro no seu HTML)
btnVerify?.addEventListener('click', async () => {
    const codeInput = document.querySelector<HTMLInputElement>('#otp-code');
    const emailInput = document.querySelector<HTMLInputElement>('#email');
    
    const code = codeInput?.value.trim();
    const email = emailInput?.value.trim();

    if (!code || code.length < 6) {
        alert("Por favor, insira o código de 6 dígitos enviado ao seu e-mail.");
        return;
    }

    btnVerify.disabled = true;
    btnVerify.innerHTML = "Validando...";

    try {
        // 2. Chama a API para conferir se o código está certo
        const res = await fetch(`${API_BASE_URL}/api/auth/validate-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });

        if (res.ok) {
            // --- SUCESSO! E-MAIL VALIDADO ---
            console.log("Código validado! Abrindo Mercado Pago...");
            
            // 3. AGORA SIM, chama a função que abre o pagamento
            await proceedToCheckout(); 
            
        } else {
            const data = await res.json();
            alert(data.error || "Código inválido ou expirado.");
        }
    } catch (e) {
        console.error("Erro na validação do código:", e);
        alert("Erro ao conectar com o servidor para validar o código.");
    } finally {
        btnVerify.disabled = false;
        btnVerify.innerHTML = "Verificar Código e Pagar";
    }
});

// Função auxiliar para o Passo 3 do Roteiro

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
            const response = await fetch(`${API_BASE_URL}/api/check-payment`, {
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

        const savedEvent = JSON.parse(localStorage.getItem('selectedSchedule') || '{}');
        const scheduleId = (window as any).selectedEventId || savedEvent.schedule_id;

        if (!scheduleId) {
            alert("Erro: O ID do evento sumiu. Por favor, selecione o curso novamente.");
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
            who_recomended: data.who_recomended,
            update_status: 'confirmed' 
        };

        const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        submitBtn.disabled = true;
        submitBtn.innerHTML = "Finalizando Inscrição...";

        try {
            // O endpoint agora deve ser inteligente para dar UPDATE se já existir o registro 'pending'
            const res = await fetch(`${API_BASE_URL}/api/register/subscribers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();

            if (res.ok) {
                alert("Sua vaga está garantida e a inscrição foi confirmada!");
                // Limpa flags de sucesso para evitar reenvios
                sessionStorage.removeItem('mp_success_flag');
                localStorage.removeItem('selectedSchedule');
                window.location.hash = '#step-selection'; 
                window.location.reload(); 
            } else {
                alert("Erro ao confirmar inscrição: " + (result.mensagem || "Verifique os dados."));
                submitBtn.disabled = false;
                submitBtn.innerHTML = "Finalizar Inscrição";
            }
        } catch (error) {
            alert("Erro de conexão com o servidor.");
            submitBtn.disabled = false;
        }
    };
};

(window as any).validateCodeAndPay = async () => {
    const code = document.querySelector<HTMLInputElement>('#otp-code')?.value.trim();
    const email = document.querySelector<HTMLInputElement>('#email')?.value.trim();

    try {
        const res = await fetch(`${API_BASE_URL}/api/auth/validate-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });

        if (res.ok) {
            // E-MAIL VALIDADO! AGORA SIM VAI PARA O MERCADO PAGO
            alert("E-mail validado com sucesso! Redirecionando para o pagamento...");
            proceedToCheckout(); 
        } else {
            alert("Código inválido ou expirado.");
        }
    } catch (e) {
        alert("Erro na validação do código.");
    }
};

const startPaymentMonitoring = (email: string, scheduleId: number) => {
    const interval = setInterval(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/check-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, schedule_id: scheduleId })
            });
            const data = await res.json();

            // Quando o pagamento aprova, o back-end já reservou a vaga como 'pending'
            if (data.has_paid) {
                clearInterval(interval);
                alert("✅ Pagamento confirmado! Sua vaga foi reservada. Por favor, preencha a ficha abaixo para concluir.");
                (window as any).isPrePaid = true;
                (window as any).showRegistrationForm((window as any).selectedSchedule);
            }
        } catch (e) {
            console.error("Aguardando aprovação...");
        }
    }, 5000);
};

const proceedToCheckout = async () => {
    // Busca o ID do localStorage se a variável global falhar
    const savedEvent = JSON.parse(localStorage.getItem('selectedSchedule') || '{}');
    const scheduleId = parseInt((window as any).selectedEventId) || savedEvent.schedule_id;
    const email = (document.querySelector<HTMLInputElement>('#email')?.value || '').trim();

    console.log("🚀 Enviando para o Pay:", { email, scheduleId }); // Verifique se o ID aparece no console!

    if (!scheduleId) {
        alert("Erro: O ID do curso não foi encontrado. Selecione o curso novamente.");
        return;
    }

    const res = await fetch(`${API_BASE_URL}/api/checkout/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, schedule_id: scheduleId }) // Forçando o envio dos dois
    });

    const data = await res.json();

    if (res.ok && data.init_point) {

        window.location.href = data.init_point;
        
        if (email) startPaymentMonitoring(email, scheduleId);
    } else {
        // Exibe o erro real para a gente parar de chutar
        console.error("Erro MP Detalhado:", data);
        alert("Erro no Mercado Pago: " + (data.error || "Verifique o console"));
    }
};

(window as any).showRegistrationForm = (item: any) => {
    // 1. Tenta pegar o que veio no parâmetro, se estiver vazio, pega do LocalStorage
    const rawData = localStorage.getItem('selectedSchedule');
    const fullItem = rawData ? JSON.parse(rawData) : item;

    console.log("Exibindo formulário para o item completo:", fullItem);
    
    hideAllSections();
    const regSection = document.querySelector<HTMLDivElement>('#step-registration');
    if (regSection) regSection.classList.remove('hidden');

    // 2. Mapeamento das Labels (Card 1) usando o FULLITEM
    const eventTitle = document.querySelector('#reg-event-name');
    const eventType  = document.querySelector('#reg-event-type');
    const eventUnit  = document.querySelector('#reg-event-unit');
    const eventDate  = document.querySelector('#reg-event-date');

    // IMPORTANTE: Verifique se os nomes batem com o que vem da sua API (ex: item.event_name)
    if (eventTitle) eventTitle.textContent = fullItem.event_name || fullItem.name || "Evento";
    if (eventType)  eventType.textContent  = fullItem.type_name  || fullItem.type || "Geral";
    if (eventUnit)  eventUnit.textContent  = fullItem.unit_name  || fullItem.unit || "Unidade";
    
    // ... restante da função (Data, setupRegistrationSubmit, etc)
    
    // 4. FORMATAÇÃO DA DATA
    if (eventDate && (fullItem.scheduled_at || fullItem.rawDate)) {
        const dataRef = fullItem.scheduled_at || fullItem.rawDate;
        try {
            const dataObjeto = new Date(dataRef.replace(/-/g, '/'));
            const diaSemana = getDayName(dataRef); 
            const dataFormatada = dataObjeto.toLocaleDateString('pt-BR');
            const horaFormatada = dataObjeto.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            eventDate.innerHTML = `<span class="mr-2">📅</span> ${diaSemana}, ${dataFormatada} às ${horaFormatada}h`;
        } catch (e) {
            eventDate.textContent = dataRef; 
        }
    }

    // 5. Configura o envio do formulário
    setupRegistrationSubmit(); 

    // 6. Preenchimento do E-mail
    const emailInput = document.querySelector<HTMLInputElement>('#student_email');
    if (emailInput) {
        // Tenta pegar do campo principal ou do que veio do Mercado Pago
        const emailSalvo = document.querySelector<HTMLInputElement>('#email')?.value || fullItem.payer_email;
        if (emailSalvo) emailInput.value = emailSalvo;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- FUNÇÃO PARA VER FICHA COMPLETA ---
(window as any).openFullAnamnesis = (subscribed_id: number) => {
    const ficha = inscriptionsCache.find((f: any) => f.subscribed_id === subscribed_id);
    if (!ficha) return;

    const modal = document.querySelector<HTMLDivElement>('#modal-anamnese');
    if (!modal) return;

    const conteudoFicha = `
            <div class="grid grid-cols-2 gap-4">
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <b class="text-[9px] text-slate-400 uppercase block mb-1">Telefone</b>
                    <span class="text-sm font-bold">${ficha.phone || '-'}</span>
                </div>
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <b class="text-[9px] text-slate-400 uppercase block mb-1">Email aluno</b>
                    <span class="text-sm font-bold">${ficha.email || '-'}</span>
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
                    <span class="text-slate-400">Religião:</span> ${ficha.religion == 1 ? (ficha.religion_mention) : 'Não informado'}
                </div>
            </div>

            <div class="space-y-4">
                <div class="p-5 bg-fuchsia-50/50 rounded-3xl border border-fuchsia-100">
                    <b class="text-[9px] text-fuchsia-600 uppercase block mb-2 tracking-widest">Razão pela qual você se inscreveu:</b>
                    <p class="text-sm text-slate-700 italic leading-relaxed">"${ficha.course_reason}"</p>
                </div>
                <div>
                    <b class="text-[9px] text-slate-400 uppercase block mb-1 ml-1">Quem Indicou?</b>
                    <p class="text-sm text-slate-600 px-1">${ficha.who_recomended }</p>
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

                                         function dataFormater(mydate: string): string {
                                            const dataObjet = new Date(mydate.replace(/-/g,  '/'));
                                            return dataObjet.toLocaleString('pt-BR', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            });
                                        }
                                  
                                            const statusColorPayment = ev.payment_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
                                            const statusColorSubscribe = ev.enrollment_status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
                                            return `
                                            <div class="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-md relative group">
                                                <div class="absolute top-8 right-8 ${statusColorPayment} px-4 py-1.5 rounded-full text-[13px] font-black uppercase tracking-tighter">
                                                    ${ev.payment_status === 'approved' ? 'Pagamento: Confirmado' : 'Pagamento: Pendente'}
                                                </div>
                                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                    <div>
                                                        <div class="mb-4">
                                                            <span class="text-xs font-black uppercase tracking-widest ${statusColorSubscribe}">Inscrição ${ev.enrollment_status === 'confirmed' ? 'Realizada' : 'Pendente'}</span><div class="text-xs"><b class="text-slate-400 uppercase block text-[12px]">${dataFormater(ev.created_at || 'Inscrição ainda não realizada')}</b> </div>
                                                            <h5 class="text-2xl font-black text-slate-900 mt-1">${ev.event_name || 'Evento não encontrado'}</h5>
                                                            <p class="text-sm font-bold text-slate-400 uppercase">${ev.type_name || 'Tipo não informado'} | ${ev.unit_name || 'Unidade'}</p>
                                                        </div>
                                                        <div class="grid grid-cols-2 gap-4 mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100"><br>
                                                        <div class="text-xs"><b class="text-slate-400 uppercase block text-[9px]">Data do evento</b> ${dataFormater(ev.event_date || 'Data não encontrada')}</div>
                                                            <div class="text-xs"><b class="text-green-400 uppercase block text-[9px]">Data da compra</b> ${dataFormater(ev.updated_at || 'Compra não realizada')}</div>
                                                            
                                                            <div class="text-xs"><b class="text-slate-400 uppercase block text-[9px]">Valor</b> <span class="font-black text-slate-900">R$ ${ev.valor_evento}</span></div>
                                                            <div class="text-xs col-span-2"><b class="text-slate-400 uppercase block text-[9px]">E-mail Pagador</b> <span class="truncate block">${ev.payer_email || 'N/A'}</span></div>
                                                        </div>
                                                    </div>
                                                    <div class="bg-fuchsia-50/30 p-6 rounded-[2rem] border border-fuchsia-100 flex flex-col justify-between">
                                                        <div><br>
                                                            <p class="text-[10px] font-black text-fuchsia-600 uppercase mb-3 tracking-widest"></p>
                                                            <p class="text-base text-slate-600 italic leading-relaxed">
                                                              
                                                            </p>
                                                        </div>
                                                    <button onclick="openFullAnamnesis(${ev.subscribed_id})" 
                                                            class="mt-4 flex items-center gap-2 text-sm font-black text-fuchsia-600 hover:text-fuchsia-800 transition-colors uppercase tracking-widest">
                                                        Ver ficha de Anaminese ➜
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
                    <span class="font-black text-slate-900 text-xl tracking-tighter mr-4"><span class="text-slate-400">fast</span>Payment<span class="app-version text-[12px] text-gray-400"></span></span></span>
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
                        <input type="number" id="vagas-input" min="0" placeholder="Qtd" class="w-full border border-slate-200 rounded-xl p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 text-center" required>
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
                            <th class="p-4 text-slate-400 font-bold uppercas text-center">Dia</th>
                            <th class="p-4 text-center">Data</th>
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
                    <h2 class="text-2xl font-black text-slate-900 mb-8 py-6">Gestão de Alunos e Inscrições</h2>
                    <div id="inscriptionsAccordion" class="space-y-4">
                        <p class="text-center py-10 text-slate-400">Organizando registros...</p>
                    </div>
                </div>
            `;
            loadInscriptionsData();
            break;
    }
};


const renderSuccessPage = () => {
    // Seleciona o elemento principal onde sua aplicação renderiza
    const app = document.querySelector<HTMLDivElement>('#app');

    if (app) {
        app.innerHTML = `
            <div style="
                min-height: 100vh; 
                display: flex; 
                flex-direction: column; 
                align-items: center; 
                justify-content: center; 
                background-color: #f9fafb; 
                font-family: sans-serif;
                padding: 20px;
                text-align: center;
            ">
                <div style="
                    max-width: 400px; 
                    width: 100%; 
                    background: white; 
                    padding: 40px; 
                    border-radius: 16px; 
                    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                ">
                    <div style="
                        width: 80px; 
                        height: 80px; 
                        background-color: #dcfce7; 
                        border-radius: 50%; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        margin: 0 auto 24px auto;
                    ">
                        <svg style="width: 48px; height: 48px; color: #16a34a;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                        </svg>
                    </div>

                    <h1 style="color: #111827; font-size: 24px; font-weight: 700; margin-bottom: 8px;">
                        Pagamento Realizado!
                    </h1>
                    
                    <p style="color: #4b5563; font-size: 16px; margin-bottom: 32px; line-height: 1.5;">
                        Seu pagamento foi confirmado. Agora você já pode fechar esta página para prosseguir com a inscrição.
                    </p>

                    <button id="btnClose" style="
                        width: 100%; 
                        background-color: #16a34a; 
                        color: white; 
                        border: none; 
                        padding: 14px; 
                        border-radius: 8px; 
                        font-weight: 600; 
                        cursor: pointer;
                        transition: background 0.2s;
                    ">
                        Fechar Janela
                    </button>
                </div>
                
                <p style="margin-top: 24px; color: #9ca3af; font-size: 12px;">
                    FastPayment &copy; 2026
                </p>
            </div>
        `;

        // Adiciona o evento de fechar a janela ao botão
        document.querySelector('#btnClose')?.addEventListener('click', () => {
            window.close();
            // Caso o window.close() seja bloqueado pelo navegador (comum em abas não abertas por script)
            // Você pode redirecionar para a home:
            // window.location.href = '/';
        });
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
                    <td class="p-4  text-slate-900">
                    <span class="px-3 py-1 rounded-full text-[15px]  ${item.vacancies > 0 ? 'bg-emerald-50 text-black-600' : 'bg-red-50 text-red-600'}">
                            ${getDayName(item.scheduled_at)}
                    </span></td>
                    <td class="p-4  text-slate-900">
                    <span class="px-3 py-1 rounded-full text-[15px]  ${item.vacancies > 0 ? 'bg-emerald-50 text-black-600' : 'bg-red-50 text-red-600'}">
                            ${dataInicio.toLocaleDateString('pt-BR')} ${horaInicio} - ${horaFim}
                    </span></td>
                    <td class="p-4  text-slate-900">
                    <span class="px-3 py-1 rounded-full text-[15px]  ${item.vacancies > 0 ? 'bg-emerald-50 text-black-600' : 'bg-red-50 text-red-600'}">
                            ${item.event_name}
                        </span></td>
                    <td class="p-4  text-slate-900">
                    <span class="px-3 py-1 rounded-full text-[15px]  ${item.vacancies > 0 ? 'bg-emerald-50 text-black-600' : 'bg-red-50 text-red-600'}">
                            ${item.type_name}
                        </span></td>
                    <td class="p-4  text-slate-900">
                    <span class="px-3 py-1 rounded-full text-[15px]  ${item.vacancies > 0 ? 'bg-emerald-50 text-black-600' : 'bg-red-50 text-red-600'}">
                            R$ ${item.event_price}
                        </span></td></td>
                    <td class="p-4  text-slate-900">
                    <span class="px-3 py-1 rounded-full text-[15px]  ${item.vacancies > 0 ? 'bg-emerald-50 text-black-600' : 'bg-red-50 text-red-600'}">
                            ${item.unit_name}
                        </span></td>
                    <td class="p-4  text-center">
                        <span class="px-3 py-1 rounded-full text-[15px]  ${item.vacancies > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}">
                            ${item.vacancies}
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
    const title = document.querySelector<HTMLHeadingElement>('#modal-title')!;
    const nameInput = document.querySelector<HTMLInputElement>('#modal-input-name');
    const priceInput = document.querySelector<HTMLInputElement>('#modal-input-price');
    const priceField = document.querySelector<HTMLDivElement>('#field-price');

    // Limpa campos anteriores
    if (nameInput) nameInput.value = '';
    if (priceInput) priceInput.value = '';

    // Ajusta o título
    const labels: any = { 'events': 'Eventos', 'units': 'Unidades', 'event-types': 'Tipos' };
    title.innerText = `Gerenciar ${labels[target]}`;
    
    // Mostra ou esconde o campo de preço
    if (priceField) {
        priceField.classList.toggle('hidden', target !== 'events');
    }

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

    // 1. SALVAMOS O OBJETO COMPLETO (Isso é o que falta para preencher o card!)
    localStorage.setItem('selectedSchedule', JSON.stringify(item));
    
    // 2. Setamos as variáveis globais de apoio
    (window as any).selectedSchedule = item; 
    (window as any).selectedEventId = item.schedule_id || item.id; 

    hideAllSections();
    const step1 = document.querySelector<HTMLDivElement>('#step-1');
    if (step1) step1.classList.remove('hidden');
};

(window as any).makeLogout = async () => {
    try { await fetch(`${API_BASE_URL}/logout`, { method: 'POST', credentials: 'include' }); } catch (e) {}
    localStorage.removeItem('admin_full_name');
    window.location.href = '/beta/login';
};

(window as any).makeLogin = async () => {
    const emailInput = document.querySelector<HTMLInputElement>('#admin-email');
    const passwordInput = document.querySelector<HTMLInputElement>('#admin-password');

    if (!emailInput || !passwordInput) {
        console.error("Campos de login não encontrados no DOM");
        return;
    }

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !password) {
        alert("Por favor, preencha todos os campos.");
        return;
    }

    try {
        // CORREÇÃO DA ROTA: Adicionado /api/auth/ para bater com seu index.php
        const res = await safeFetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Importante para manter o cookie da sessão
            body: JSON.stringify({ email, password })
        });

        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('admin_full_name', data.user.full_name);
            // Redireciona usando o hash que o seu handleRouting já entende
            window.location.hash = '#admin';
            handleRouting(); 
        } else {
            const errorData = await res.json();
            alert(errorData.mensagem || "Login inválido.");
        }
    } catch (e) {
        console.error("Erro na requisição de login:", e);
        alert("Erro ao conectar com o servidor.");
    }
};


(window as any).deleteSchedule = async (id: number) => {
    if (!confirm("Excluir?")) return;
    const res = await safeFetch(`${API_BASE_URL}/schedules/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) loadAdminTableData();
};

(window as any).saveCrudItem = async () => {
    // Buscamos os inputs dentro do modal ativo no momento do clique
    const nameInput = document.querySelector<HTMLInputElement>('#modal-input-name');
    const priceInput = document.querySelector<HTMLInputElement>('#modal-input-price');

    if (!nameInput || !nameInput.value.trim()) {
        alert("Por favor, digite um nome!");
        return;
    }

    const payload: any = { name: nameInput.value.trim() };
    
    // Se estivermos em eventos, adicionamos o preço
    if (currentTarget === 'events') {
        if (!priceInput || !priceInput.value) {
            alert("Por favor, digite o preço!");
            return;
        }
        payload.price = priceInput.value;
    }

    try {
        const res = await safeFetch(`${API_BASE_URL}/${currentTarget}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Salvo com sucesso!");
            nameInput.value = '';
            if (priceInput) priceInput.value = '';
            
            await refreshModalList(); // Atualiza a lista de exclusão
            await loadFormOptions();  // Atualiza os selects do formulário principal
        } else {
            const err = await res.json();
            alert("Erro ao salvar: " + (err.mensagem || "Erro desconhecido"));
        }
    } catch (e) {
        console.error("Erro no salvamento:", e);
        alert("Não foi possível conectar ao servidor.");
    }
};

(window as any).deleteCrudItem = async () => {
    const selectElement = document.querySelector<HTMLSelectElement>('#modal-select-list');
    const id = selectElement?.value;
    
    if (!id || !confirm("Tem certeza que deseja excluir este item?")) return;

    const url = `${API_BASE_URL}/${currentTarget}/${id}`;
    console.log("Tentando excluir em:", url); // Verifique se a URL não tem // duplicada

    try {
        const res = await safeFetch(url, { 
            method: 'DELETE', 
            credentials: 'include' 
        });
        
        if (res.ok) { 
            alert("Excluído com sucesso!");
            await refreshModalList(); 
            await loadFormOptions(); 
        } else {
            const err = await res.json();
            alert("Erro ao excluir: " + (err.error || "Acesso negado"));
        }
    } catch (e) { 
        console.error(e); 
    }
};



  const getMPStatus = () => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status') || params.get('collection_status');
    
    // Se achou approved na URL, salva no sessionStorage para segurança
    if (status === 'approved' || status === 'success') {
        sessionStorage.setItem('payment_success', 'true');
    }
    
    // Retorna o status da URL ou o que estava salvo na sessão
    return status || (sessionStorage.getItem('payment_success') === 'true' ? 'approved' : null);
};


// --- 1. UNIFICAÇÃO DO RASTREADOR (Substitua a partir daqui) ---

const handleRouting = async () => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    // Captura o status da URL agora
    const params = new URLSearchParams(window.location.search);
    const currentMpStatus = params.get('status') || params.get('collection_status');

    // Se detectar sucesso na URL, trava no sessionStorage imediatamente
    if (currentMpStatus === 'approved' || currentMpStatus === 'success') {
        sessionStorage.setItem('mp_success_flag', 'true');
    }

    // A decisão final de "Pagou" olha para a URL ou para a trava da sessão
    const hasPaid = currentMpStatus === 'approved' || 
                    sessionStorage.getItem('mp_success_flag') === 'true';

    hideAllSections();
    const activeSections = getSections();

    // --- IMPORTANTE: SEMPRE APLICAR O FUNDO, EXCETO NO LOGIN ---
    if (!path.includes('/login') && hash !== '#login') {
        document.body.classList.add('bg-reiki');
    }

    console.log("[Router] Verificando aprovação:", hasPaid);

    if (hasPaid) {
        // Busca o evento salvo no localStorage
        const raw = localStorage.getItem('selectedSchedule');
        const savedEvent = JSON.parse(raw || '{}');

        if (savedEvent.schedule_id || savedEvent.id) {
            // 1. ALIMENTA AS GLOBAIS (Evita erro de ID perdido na gravação)
            (window as any).isPrePaid = true;
            (window as any).selectedEventId = savedEvent.schedule_id || savedEvent.id;
            (window as any).selectedSchedule = savedEvent;

            // 2. LIMPA A TRAVA (Para não abrir em loop)
            sessionStorage.removeItem('mp_success_flag');

            // 3. ABRE O FORMULÁRIO
            if (typeof (window as any).showRegistrationForm === 'function') {
                (window as any).showRegistrationForm(savedEvent);
                
                // 4. LIMPA A URL (Deixa limpa para o usuário)
                const cleanUrl = window.location.origin + window.location.pathname;
                window.history.replaceState({}, document.title, cleanUrl);
                return; // FINALIZA AQUI PARA O FORM FICAR ABERTO
            }
        } else {
            console.error("ERRO: LocalStorage vazio.");
            window.location.hash = '#step-selection';
        }
    }

    // --- RESTANTE DO ROTEAMENTO (ADMIN / AGENDA) ---
    const isAdmin = hash === '#admin' || path.includes('/login') || path.includes('/admin');

    if (isAdmin) {
        document.body.classList.remove('bg-reiki'); // Remove o fundo no Admin se preferir
        if (localStorage.getItem('admin_full_name')) {
            renderAdminDashboard();
        } else if (activeSections.login) {
            activeSections.login.classList.remove('hidden');
        }
    } else {
        if (activeSections.selection) {
            activeSections.selection.classList.remove('hidden');
            // Só carrega a agenda se NÃO estivermos no fluxo de sucesso do formulário
            if (!hasPaid) loadEvents(); 
        }
    }
    injectVersion();
};

// --- INICIALIZAÇÃO ---
window.addEventListener('popstate', handleRouting);

if (document.readyState === 'complete') {
    handleRouting();
} else {
    window.addEventListener('load', handleRouting);
}