import './style.css';

// =============================================================================
// SECTION 1 — CONFIGURATION & GLOBAL VARIABLES
// =============================================================================

const API_BASE_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:8080'
    : 'https://beta.misturadeluz.com/beta';

const APP_VERSION = "1.0.0beta";

let inscriptionsCache: any[]                              = [];
let modalOriginalHTML: string                             = '';
let selectedEvent                                         = { id: 0, name: '' };
let currentTarget: 'events' | 'units' | 'event-types'    = 'events';
let paymentMonitorInterval: ReturnType<typeof setInterval> | null = null;


// =============================================================================
// SECTION 2 — PAYMENT DETECTION ON PAGE LOAD (MP redirect trap)
// =============================================================================

                // DELETED

// =============================================================================
// SECTION 3 — SANITIZERS (cleanup cron functions)
// =============================================================================

// REQ-003: Cleanup pending transactions
const cleanupPendingTransactions = async (): Promise<void> => {
    try {
        const res  = await fetch(`${API_BASE_URL}/api/cron/transactions-cleanup`, { credentials: 'include' });
        const data = await res.json();
        if (data.deleted > 0) {
            console.log(`🧹 Cleanup: ${data.deleted} expired transaction(s) removed`);
        }
    } catch (err) {
        console.error('Cleanup error:', err);
    }
};

// REQ-004: Cleanup validated/expired OTP codes
const cleanupExpiredCodes = async (): Promise<void> => {
    try {
        const res  = await fetch(`${API_BASE_URL}/api/cron/codes-cleanup`, { credentials: 'include' });
        const data = await res.json();
        if (data.deleted > 0) {
            console.log(`🧹 Codes cleanup: ${data.deleted} expired code(s) removed`);
        }
    } catch (err) {
        console.error('Codes cleanup error:', err);
    }
};


// =============================================================================
// SECTION 4 — UTILITY FUNCTIONS
// =============================================================================

// Validation helpers
const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

const validatePhone = (phone: string): boolean => {
    const digits = phone.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 11;
};

const validateFullName = (name: string): boolean => {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2 && parts.every(p => p.length >= 2);
};

const safeFetch = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, options);
    if (response.status === 401 && !url.includes('/api/auth/')) {
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

const hideAllSections = () => {
    Object.values(getSections()).forEach(s => s?.classList.add('hidden'));
};

const getDayName = (dateString: string) => {
    const capitalize = (s: any) => s && s[0].toUpperCase() + s.slice(1);
    return capitalize(new Date(dateString).toLocaleDateString('pt-BR', { weekday: 'long' }));
};

const getSections = () => ({
    selection:    document.querySelector<HTMLDivElement>('#step-selection'),
    auth:         document.querySelector<HTMLDivElement>('#step-1'),
    otp:          document.querySelector<HTMLDivElement>('#step-2'),
    registration: document.querySelector<HTMLDivElement>('#step-registration'),
    login:        document.querySelector<HTMLDivElement>('#login'),
});

const getMPStatus = () => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status') || params.get('collection_status');
    if (status === 'approved' || status === 'success') {
        sessionStorage.setItem('payment_success', 'true');
    }
    return status || (sessionStorage.getItem('payment_success') === 'true' ? 'approved' : null);
};


// =============================================================================
// SECTION 5 — DOM ELEMENT REFERENCES
// =============================================================================

const sections = {
    selection: document.querySelector<HTMLDivElement>('#step-selection')!,
    auth:      document.querySelector<HTMLDivElement>('#step-1')!,
    otp:       document.querySelector<HTMLDivElement>('#step-2')!,
    login:     document.querySelector<HTMLDivElement>('#login')!,
};

const nameInput  = document.querySelector<HTMLInputElement>('#user-name')!;
const phoneInput = document.querySelector<HTMLInputElement>('#user-phone')!;
const emailInput = document.querySelector<HTMLInputElement>('#email')!;
const otpInput   = document.querySelector<HTMLInputElement>('#otp-code')!;
const btnSend    = document.querySelector<HTMLButtonElement>('#btn-send-otp')!;
const btnVerify  = document.querySelector<HTMLButtonElement>('#btn-verify-otp')!;


// =============================================================================
// SECTION 6 — PUBLIC SCHEDULE (agenda pública)
// =============================================================================

const loadEvents = async (eventSlug: string = '', typeSlug: string = '') => {
    const isManutencao    = false;
    const stepSelection   = document.querySelector<HTMLElement>('#step-selection');
    const avisoManutencao = document.querySelector<HTMLElement>('#agenda-manutencao');

    stepSelection?.classList.toggle('hidden', isManutencao);
    avisoManutencao?.classList.toggle('hidden', !isManutencao);
    if (isManutencao) return;

    const container = document.querySelector<HTMLDivElement>('#events-container')!;
    if (!container) return;
    container.innerHTML = '<p class="text-center col-span-full text-slate-400">Buscando horários...</p>';

    try {
        const url      = `${API_BASE_URL}/api/schedules?slug=${eventSlug}&type=${typeSlug}`;
        const response = await fetch(url, { credentials: 'include' });
        const schedules = await response.json();

        if (!schedules || schedules.length === 0) {
            container.innerHTML = '<p class="text-center col-span-full text-slate-500 py-10">Nenhum horário disponível.</p>';
            return;
        }

        container.innerHTML = schedules.map((item: any) => {
            const dataFormatada  = item.scheduled_at.replace(/-/g, '/');
            const dataInicio     = new Date(dataFormatada);
            const duracao        = parseInt(item.duration_minutes) || 0;
            const dataFim        = new Date(dataInicio.getTime() + duracao * 60000);
            const horaInicio     = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const horaFim        = dataFim.toLocaleTimeString('pt-BR',   { hour: '2-digit', minute: '2-digit' });
            const horarioExibicao = duracao > 0 ? `${horaInicio}h às ${horaFim}h` : `${horaInicio}h`;
            const hasVacancies   = item.vacancies > 0;

            const vacanciesLabel = hasVacancies
                ? `<span class="text-[12px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 uppercase tracking-tighter">${item.vacancies} vagas restantes</span>`
                : `<span class="text-[9px] font-bold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20 uppercase tracking-tighter">Esgotado</span>`;

            const btnClass  = hasVacancies
                ? "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 active:scale-95"
                : "bg-slate-800 text-slate-500 cursor-not-allowed opacity-50";
            const btnText   = hasVacancies ? "Inscreva-se Agora!" : "Vagas Esgotadas";
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
                    <p class="text-sm text-slate-300 flex items-center gap-2"><span class="text-violet-500">📅</span> ${getDayName(item.scheduled_at)}, ${dataInicio.toLocaleDateString('pt-BR')}</p>
                    <p class="text-sm text-slate-400 flex items-center gap-2 italic"><span class="text-fuchsia-500 text-xs">⏰</span> ${horarioExibicao}</p>
                </div>
                <button ${btnAction} class="w-full ${btnClass} text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all transform">${btnText}</button>
            </div>`;
        }).join('');
    } catch (e) {
        console.error("ERRO REAL DETECTADO:", e);
        container.innerHTML = '<p class="text-center col-span-full text-red-500">Erro ao carregar agenda.</p>';
    }
};

// REQ-001: Back to public schedule
// REQ-001 + REQ-013: Back to public schedule + clear inputs
(window as any).goBackToSchedule = () => {
    // Clear selected event data
    localStorage.removeItem('selectedSchedule');
    localStorage.removeItem('mp_payment_id');
    sessionStorage.removeItem('mp_success_flag');
    (window as any).selectedEventId  = null;
    (window as any).selectedSchedule = null;
    (window as any).isPrePaid        = false;

    // ✅ Clear all input fields
    if (nameInput)  nameInput.value  = '';
    if (phoneInput) phoneInput.value = '';
    if (emailInput) emailInput.value = '';
    if (otpInput)   otpInput.value   = '';

    // Show schedule and reload events
    hideAllSections();
    getSections().selection?.classList.remove('hidden');
    loadEvents();
};

// REQ-001: Select event from schedule card
(window as any).selectEvent = (item: any) => {
    if (item.vacancies <= 0) {
        alert("Desculpe, este evento acabou de esgotar as vagas.");
        return;
    }

    localStorage.setItem('selectedSchedule', JSON.stringify(item));
    (window as any).selectedSchedule = item;
    (window as any).selectedEventId  = item.schedule_id || item.id;

    hideAllSections();
    document.querySelector<HTMLDivElement>('#step-1')?.classList.remove('hidden');

    // REQ-002: Fill summary after section is visible
    const dataFormatada = item.scheduled_at?.replace(/-/g, '/');
    const dataInicio    = dataFormatada ? new Date(dataFormatada) : null;
    const dateLabel     = dataInicio
        ? `${dataInicio.toLocaleDateString('pt-BR')} às ${dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h`
        : '';
    const summary = `${item.event_name} - ${dateLabel} - R$ ${parseFloat(item.event_price).toFixed(2)}`;

    const s1 = document.getElementById('step1-summary');
    const s2 = document.getElementById('step2-summary');
    if (s1) s1.textContent = summary;
    if (s2) s2.textContent = summary;
};


// =============================================================================
// SECTION 7 — PAYMENT VERIFICATION & CHECKOUT FLOW
// =============================================================================

// REQ-006: Check pending payment before proceeding
const checkPendingPayment = async (email: string, scheduleId: number): Promise<boolean> => {
    try {
        const res    = await fetch(`${API_BASE_URL}/api/check-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, schedule_id: scheduleId }),
        });
        const result = await res.json();

        if (result.has_paid && result.pendencias?.length > 0) {
            const paymentId = result.pendencias[0].payment_id;
            localStorage.setItem('mp_payment_id', String(paymentId));
            alert("Foi Identificado um pagamento aprovado que esta vinculado a este email, por favor conclua sua inscrição!");
            (window as any).isPrePaid = true;
            (window as any).showRegistrationForm((window as any).selectedSchedule);
            return true;
        }
        return false;
    } catch (error) {
        console.error("Erro ao verificar pagamento:", error);
        return false;
    }
};

// Monitor payment approval in background (polling)
const startPaymentMonitoring = (email: string, scheduleId: number) => {
    if (paymentMonitorInterval) clearInterval(paymentMonitorInterval);

    paymentMonitorInterval = setInterval(async () => {
        try {
            const res  = await fetch(`${API_BASE_URL}/api/check-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, schedule_id: scheduleId }),
            });
            const data = await res.json();

            if (data.has_paid) {
                clearInterval(paymentMonitorInterval!);
                paymentMonitorInterval = null;
                alert("✅ Pagamento confirmado! Preencha a ficha abaixo para concluir.");
                (window as any).isPrePaid = true;
                (window as any).showRegistrationForm((window as any).selectedSchedule);
            }
        } catch (e) {
            console.error("Aguardando aprovação...");
        }
    }, 5000);
};

// Proceed to Mercado Pago checkout
const proceedToCheckout = async () => {
    const savedEvent = JSON.parse(localStorage.getItem('selectedSchedule') || '{}');
    const scheduleId = parseInt((window as any).selectedEventId) || savedEvent.schedule_id;
    const email      = (document.querySelector<HTMLInputElement>('#email')?.value || '').trim();
    const payerName  = (document.querySelector<HTMLInputElement>('#user-name')?.value || '').trim();

    console.log("🚀 Enviando para o Pay:", { email, scheduleId });

    if (!scheduleId) {
        alert("Erro: O ID do curso não foi encontrado. Selecione o curso novamente.");
        return;
    }

    const res  = await fetch(`${API_BASE_URL}/api/checkout/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, schedule_id: scheduleId, payer_name: payerName }),
    });
    const data = await res.json();

    // ✅ REQ-011: Already subscribed and confirmed — block (no second purchase for same event)
    if (res.status === 409 && data.error === 'ja_inscrito') {
        alert(data.mensagem);
        (window as any).goBackToSchedule(); // ✅ REQ-013: return to main page
        return;
    }

    // ✅ REQ-010: Paid but form not completed — redirect to form
    if (res.status === 402 && data.error === 'inscricao_pendente') {
        alert(data.mensagem);
        localStorage.setItem('mp_payment_id', String(data.payment_id));
        (window as any).isPrePaid = true;
        (window as any).showRegistrationForm((window as any).selectedSchedule);
        return;
    }

    // Happy path — redirect to MP
    if (res.ok && data.init_point) {
        window.location.href = data.init_point;
        if (email) startPaymentMonitoring(email, scheduleId);
        return;
    }

    console.error("Erro MP:", data);
    alert("Erro no pagamento: " + (data.error || "Tente novamente."));
};


// =============================================================================
// SECTION 8 — IDENTIFICATION FORM (step-1) & OTP (step-2) LISTENERS
// =============================================================================

// Email blur — check if payment already exists
emailInput?.addEventListener('blur', async () => {
    const email     = emailInput.value.trim();
    const submitBtn = document.querySelector('#btn-submit-registration') as HTMLButtonElement;

    (window as any).isPrePaid = false;
    if (submitBtn) {
        submitBtn.innerHTML = "Finalizar e Ir para Pagamento";
        submitBtn.classList.replace('bg-emerald-600', 'bg-violet-600');
    }

    if (email.length > 5 && email.includes('@')) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/check-payment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const result = await response.json();
            if (result.has_paid && submitBtn) {
                submitBtn.innerHTML = "✅ Pagamento Identificado - Agendar Agora";
                submitBtn.classList.replace('bg-violet-600', 'bg-emerald-600');
                (window as any).isPrePaid = true;
            }
        } catch (error) {
            console.error("Erro ao verificar pagamento prévio:", error);
        }
    }
});

// Send OTP button
btnSend.addEventListener('click', async () => {
    const email      = emailInput.value.trim();
    const nome       = nameInput.value.trim();
    const phone      = phoneInput.value.trim();
    const emailTeste = "test_user_4369246050821512868@testuser.com";
    const scheduleId = parseInt((window as any).selectedEventId) ||
                       parseInt(localStorage.getItem('selectedScheduleId') || '0');

    // ✅ Frontend validations
    if (!validateFullName(nome)) {
        alert("Por favor, informe seu nome completo (nome e sobrenome).");
        return;
    }
    if (!validatePhone(phone)) {
        alert("Por favor, informe um telefone válido (DDD + número).");
        return;
    }
    if (!validateEmail(email)) {
        alert("Por favor, insira um e-mail válido.");
        return;
    }
    if (!scheduleId || isNaN(scheduleId)) {
        alert("Erro: Selecione um evento na agenda primeiro.");
        return;
    }

    btnSend.disabled  = true;
    btnSend.innerHTML = "Verificando...";

    try {
        // REQ-006: using checkPendingPayment
        const hasPending = await checkPendingPayment(email, scheduleId);

        if (!hasPending) {
            const otpRes = await fetch(`${API_BASE_URL}/api/auth/generate-code`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, nome, telefone: phone }), // ✅ phone too
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
        btnSend.disabled  = false;
        btnSend.innerHTML = "Enviar";
    }
});

// Verify OTP button
btnVerify?.addEventListener('click', async () => {
    const codeInput  = document.querySelector<HTMLInputElement>('#otp-code');
    const emailInput = document.querySelector<HTMLInputElement>('#email');
    const nameInput  = document.querySelector<HTMLInputElement>('#user-name');
    const code       = codeInput?.value.trim();
    const email      = emailInput?.value.trim();
    const nome       = nameInput?.value.trim();
    const phone      = phoneInput.value.trim(); 

    if (!code || code.length < 6) { 
        alert("Por favor, insira o código de 6 dígitos enviado ao seu e-mail."); 
        return; 
    }

    btnVerify.disabled  = true;
    btnVerify.innerHTML = "Validando...";

    try {
        console.log("📤 Sending validate-code:", { email, code, nome });
        const res = await fetch(`${API_BASE_URL}/api/auth/validate-code`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, nome, phone }), // ✅ nome included
        });
        if (res.ok) {
            console.log("Código validado! Abrindo Mercado Pago...");
            await proceedToCheckout();
        } else {
            const data = await res.json();
            alert(data.mensagem || data.error || "Código inválido ou expirado.");
        }
    } catch (e) {
        console.error("Erro na validação do código:", e);
        alert("Erro ao conectar com o servidor.");
    } finally {
        btnVerify.disabled  = false;
        btnVerify.innerHTML = "Verificar Código e Pagar";
    }
});


// =============================================================================
// SECTION 9 — REGISTRATION FORM (step-registration)
// =============================================================================

const setupRegistrationSubmit = () => {
    const form = document.querySelector<HTMLFormElement>('#form-complete-registration');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();

        const savedEvent = JSON.parse(localStorage.getItem('selectedSchedule') || '{}');
        const scheduleId = (window as any).selectedEventId || savedEvent.schedule_id;
        const paymentId  = localStorage.getItem('mp_payment_id');

        if (!scheduleId) { alert("Erro: O ID do evento sumiu. Por favor, selecione o curso novamente."); return; }
        if (!paymentId)  { alert("Erro: ID do pagamento não encontrado. Aguarde alguns segundos e tente novamente."); return; }

        const formData = new FormData(form);
        const data     = Object.fromEntries(formData);

        const payload = {
            student_full_name:     data.student_full_name,
            student_phone:         data.student_phone,
            activity_professional: data.activity_professional,
            neighborhood:          data.neighborhood,
            city:                  data.city,
            schedule_id:           scheduleId,
            payment_id:            paymentId,
            is_medium:             data.is_medium      ? 1 : 0,
            is_tule_member:        data.is_tule_member ? 1 : 0,
            first_time:            data.first_time     ? 1 : 0,
            religion_mention:      data.religion_mention,
            course_reason:         data.course_reason,
            who_recomended:        data.who_recomended,
        };

        const submitBtn      = form.querySelector('button[type="submit"]') as HTMLButtonElement;
        submitBtn.disabled   = true;
        submitBtn.innerHTML  = "Finalizando Inscrição...";

        try {
            const res    = await fetch(`${API_BASE_URL}/api/register/subscribers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await res.json();

            if (res.ok) {
                localStorage.removeItem('mp_payment_id');
                sessionStorage.removeItem('mp_success_flag');
                localStorage.removeItem('selectedSchedule');
                alert("Sua vaga está garantida e a inscrição foi confirmada!");
                window.location.hash = '#step-selection';
                window.location.reload();
            } else {
                alert("Erro ao confirmar inscrição: " + (result.mensagem || "Verifique os dados."));
                submitBtn.disabled  = false;
                submitBtn.innerHTML = "Finalizar Inscrição";
            }
        } catch (error) {
            alert("Erro de conexão com o servidor.");
            submitBtn.disabled  = false;
        }
    };
};

(window as any).showRegistrationForm = (item: any) => {
    const rawData  = localStorage.getItem('selectedSchedule');
    const fullItem = rawData ? JSON.parse(rawData) : item;

    console.log("Exibindo formulário para o item completo:", fullItem);

    hideAllSections();
    document.querySelector<HTMLDivElement>('#step-registration')?.classList.remove('hidden');

    const eventTitle = document.querySelector('#reg-event-name');
    const eventType  = document.querySelector('#reg-event-type');
    const eventUnit  = document.querySelector('#reg-event-unit');
    const eventDate  = document.querySelector('#reg-event-date');

    if (eventTitle) eventTitle.textContent = fullItem.event_name || fullItem.name || "Evento";
    if (eventType)  eventType.textContent  = fullItem.type_name  || fullItem.type || "Geral";
    if (eventUnit)  eventUnit.textContent  = fullItem.unit_name  || fullItem.unit || "Unidade";

    if (eventDate && (fullItem.scheduled_at || fullItem.rawDate)) {
        const dataRef    = fullItem.scheduled_at || fullItem.rawDate;
        const dataObjeto = new Date(dataRef.replace(/-/g, '/'));
        eventDate.innerHTML = `<span class="mr-2">📅</span> ${getDayName(dataRef)}, ${dataObjeto.toLocaleDateString('pt-BR')} às ${dataObjeto.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}h`;
    }

    setupRegistrationSubmit();

    const emailEl   = document.querySelector<HTMLInputElement>('#student_email');
    const emailSalvo = document.querySelector<HTMLInputElement>('#email')?.value || fullItem.payer_email;
    if (emailEl && emailSalvo) emailEl.value = emailSalvo;

    window.scrollTo({ top: 0, behavior: 'smooth' });
};


// =============================================================================
// SECTION 10 — ADMIN DASHBOARD
// =============================================================================

const renderAdminDashboard = async () => {
    hideAllSections();
    sections.selection.classList.remove('hidden');

    const container = document.querySelector<HTMLDivElement>('#events-container')!;
    const header    = sections.selection.querySelector('header');
    const adminName = localStorage.getItem('admin_full_name') || 'Administrador';

    if (header) {
        header.className = "fixed top-0 left-0 w-full bg-white border-b border-slate-100 z-50 shadow-sm";
        header.innerHTML = `
            <div class="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
                <nav class="flex items-center gap-8 h-full">
                    <span class="font-black text-slate-900 text-xl tracking-tighter mr-4"><span class="text-slate-400">fast</span>Payment<span class="app-version text-[12px] text-gray-400"></span></span>
                    <button onclick="changeAdminTab('inicio')"     class="h-full text-sm font-bold transition-all px-1 border-transparent">Início</button>
                    <button onclick="changeAdminTab('agenda')"     class="h-full text-sm font-bold transition-all px-1 border-transparent">Agenda</button>
                    <button onclick="changeAdminTab('inscricoes')" class="h-full text-sm font-bold transition-all px-1 border-transparent">Inscrições</button>
                </nav>
                <div class="flex items-center gap-4">
                    <span class="text-xs font-bold text-slate-400">Olá, ${adminName}</span>
                    <button onclick="makeLogout()" class="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all">Sair</button>
                </div>
            </div>`;
    }

    injectVersion();
    container.className = "max-w-7xl mx-auto px-6 pt-24 pb-10";
    (window as any).changeAdminTab('inicio');
};

// Admin tab navigation
(window as any).changeAdminTab = (tab: string) => {
    const container    = document.querySelector<HTMLDivElement>('#events-container')!;
    const menuButtons  = document.querySelectorAll('header nav button');

    menuButtons.forEach(btn => {
        btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        btn.classList.add('text-slate-500');
        const label = btn.textContent?.toLowerCase().trim();
        if (
            label === tab.toLowerCase().trim() ||
            (tab === 'inicio'    && label === 'início')    ||
            (tab === 'inscricoes' && label === 'inscrições')
        ) {
            btn.classList.remove('text-slate-500');
            btn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        }
    });

    switch (tab) {
        case 'inicio':
            // REQ-003 + REQ-004: Run sanitizers silently on admin load
            cleanupPendingTransactions();
            cleanupExpiredCodes();

            const currentName = localStorage.getItem('admin_full_name') || 'Administrador';
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <div class="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center text-4xl mb-6">👋</div>
                    <h1 class="text-4xl font-black text-slate-900 mb-2">Bem-vindo, ${currentName}!</h1>
                    <p class="text-slate-500 max-w-md">Selecione uma opção no menu superior para começar a gerenciar sua agenda.</p>
                </div>`;
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
                                <button type="submit" class="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold text-[10px] uppercase hover:bg-blue-700 transition-all shadow-md">Salvar</button>
                            </div>
                        </form>
                    </div>
                    <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <table class="w-full text-left text-sm">
                            <thead class="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                <tr>
                                    <th class="p-4 text-center">Dia</th>
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
                </div>`;
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
                </div>`;
            loadInscriptionsData();
            break;
    }
};


// =============================================================================
// SECTION 11 — ADMIN DATA LOADING (schedules, options, inscriptions)
// =============================================================================

const loadAdminTableData = async () => {
    const tbody = document.querySelector('#adminTableBody');
    if (!tbody) return;

    try {
        const res  = await safeFetch(`${API_BASE_URL}/schedules`, { credentials: 'include' });
        const data = await res.json();

        tbody.innerHTML = data.map((item: any) => {
            const dataInicio = new Date(item.scheduled_at);
            const duration   = parseInt(item.duration_minutes) || 0;
            const dataFim    = new Date(dataInicio.getTime() + duration * 60000);
            const horaInicio = dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            const horaFim    = dataFim.toLocaleTimeString('pt-BR',    { hour: '2-digit', minute: '2-digit' });
            const color      = item.vacancies > 0 ? 'bg-emerald-50 text-black-600' : 'bg-red-50 text-red-600';

            return `
            <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50 text-slate-700">
                <td class="p-4"><span class="px-3 py-1 rounded-full text-[15px] ${color}">${getDayName(item.scheduled_at)}</span></td>
                <td class="p-4"><span class="px-3 py-1 rounded-full text-[15px] ${color}">${dataInicio.toLocaleDateString('pt-BR')} ${horaInicio} - ${horaFim}</span></td>
                <td class="p-4"><span class="px-3 py-1 rounded-full text-[15px] ${color}">${item.event_name}</span></td>
                <td class="p-4"><span class="px-3 py-1 rounded-full text-[15px] ${color}">${item.type_name}</span></td>
                <td class="p-4"><span class="px-3 py-1 rounded-full text-[15px] ${color}">R$ ${item.event_price}</span></td>
                <td class="p-4"><span class="px-3 py-1 rounded-full text-[15px] ${color}">${item.unit_name}</span></td>
                <td class="p-4 text-center"><span class="px-3 py-1 rounded-full text-[15px] ${item.vacancies > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}">${item.vacancies}</span></td>
                <td class="p-4 text-center"><button onclick="deleteSchedule(${item.schedule_id})" class="text-red-400 hover:text-red-600 font-bold transition-colors p-2 hover:bg-red-50 rounded-lg">Excluir</button></td>
            </tr>`;
        }).join('');
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="8" class="p-10 text-center text-red-500">Erro ao carregar dados.</td></tr>';
    }
};

const loadFormOptions = async () => {
    const opt = { credentials: 'include' as RequestCredentials };
    try {
        const [ev, un, tp] = await Promise.all([
            safeFetch(`${API_BASE_URL}/events`,      opt).then(r => r.json()),
            safeFetch(`${API_BASE_URL}/units`,       opt).then(r => r.json()),
            safeFetch(`${API_BASE_URL}/event-types`, opt).then(r => r.json()),
        ]);
        const sEv = document.querySelector<HTMLSelectElement>('#select-evento');
        const sUn = document.querySelector<HTMLSelectElement>('#select-unidade');
        const sTp = document.querySelector<HTMLSelectElement>('#select-tipo');
        if (sEv) sEv.innerHTML = '<option value="" disabled selected>Evento</option>'      + ev.map((e: any) => `<option value="${e.id}">${e.name}</option>`).join('');
        if (sUn) sUn.innerHTML = '<option value="" disabled selected>Unidade</option>'     + un.map((u: any) => `<option value="${u.id}">${u.name}</option>`).join('');
        if (sTp) sTp.innerHTML = '<option value="" disabled selected>Tipo</option>'        + tp.map((t: any) => `<option value="${t.id}">${t.name}</option>`).join('');
    } catch (e) { console.error(e); }
};

const setupFormListener = () => {
    const form = document.querySelector<HTMLFormElement>('#formAgendamento');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            scheduled_at:     (document.querySelector('#datahora')        as HTMLInputElement).value,
            event_id:         parseInt((document.querySelector('#select-evento')   as HTMLSelectElement).value, 10),
            unit_id:          parseInt((document.querySelector('#select-unidade')  as HTMLSelectElement).value, 10),
            event_type_id:    parseInt((document.querySelector('#select-tipo')     as HTMLSelectElement).value, 10),
            vacancies:        parseInt((document.querySelector('#vagas-input')     as HTMLInputElement).value,  10) || 0,
            duration_minutes: parseInt((document.querySelector('#duration-input')  as HTMLInputElement).value,  10) || 0,
            status: 'available',
        };
        const res = await safeFetch(`${API_BASE_URL}/schedules`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
        });
        if (res.ok) { alert("Salvo com sucesso!"); loadAdminTableData(); form.reset(); }
    });
};

const loadInscriptionsData = async () => {
    const accordion = document.querySelector('#inscriptionsAccordion');
    if (!accordion) return;

    try {
        const res     = await safeFetch(`${API_BASE_URL}/subscribers`, { credentials: 'include' });
        const rawData = await res.json();
        inscriptionsCache = rawData;

        if (!rawData || rawData.length === 0) {
            accordion.innerHTML = '<p class="text-center py-10">Não há inscrições a serem listadas.</p>';
            return;
        }

        const grouped = rawData.reduce((acc: any, item: any) => {
            const key = item.person_id ? `person_${item.person_id}` : `payment_${item.transacao_gateway}`;
            if (!acc[key]) {
                acc[key] = {
                    name:    item.full_name || item.payer_email || 'Aguardando inscrição',
                    email:   item.email    || item.payer_email || '-',
                    phone:   item.phone    || '-',
                    details: {
                        profession:   item.activity_professional || '-',
                        city:         item.city         || '-',
                        neighborhood: item.neighborhood || '-',
                    },
                    events: [],
                };
            }
            acc[key].events.push(item);
            return acc;
        }, {});

        accordion.innerHTML = Object.keys(grouped).map((key, index) => {
            const person = grouped[key];
            return `
            <div class="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm mb-4">
                <button onclick="toggleAccordion(${index})" class="w-full p-8 flex items-center justify-between hover:bg-slate-50 transition-all">
                    <div class="flex items-center gap-6">
                        <div class="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl">${person.name.charAt(0)}</div>
                        <div class="text-left">
                            <h3 class="text-xl font-black text-slate-900">${person.name}</h3>
                            <p class="text-sm text-slate-500 font-medium">${person.email} • ${person.phone}</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-6">
                        <span class="bg-slate-100 text-slate-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest">${person.events.length} EVENTO(S)</span>
                        <span id="icon-${index}" class="text-slate-400 text-xl transition-transform">▼</span>
                    </div>
                </button>
                <div id="content-${index}" class="hidden border-t border-slate-100 bg-slate-50/40 p-8">
                    <div class="mb-8 p-6 bg-white rounded-3xl border border-slate-200 flex justify-between items-center shadow-sm">
                        <div class="text-sm"><b class="text-slate-400 uppercase text-[10px] block mb-1">Profissão</b><span class="text-lg font-bold text-slate-700">${person.details.profession}</span></div>
                        <div class="text-sm text-right"><b class="text-slate-400 uppercase text-[10px] block mb-1">Localização</b><span class="text-lg font-bold text-slate-700">${person.details.neighborhood}, ${person.details.city}</span></div>
                    </div>
                    <h4 class="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Histórico de Inscrições</h4>
                    <div class="space-y-6">
                        ${person.events.map((ev: any) => {
                            const dataFormater = (d: string) => new Date(d.replace(/-/g, '/')).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                            const isPast = new Date((ev.event_date || '').replace(/-/g, '/')) < new Date();
                            const colorPayment   = ev.payment_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700';
                            const colorSubscribe = ev.enrollment_status === 'confirmed' ? 'bg-green-100 text-green-700' : isPast ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700';
                            const labelSubscribe = ev.enrollment_status === 'confirmed' ? '✅ Inscrito' : isPast ? '🔴 Prazo Expirado' : '🟡 Aguardando Inscrição';
                            return `
                            <div class="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-md relative group">
                                <div class="absolute top-8 right-8 ${colorPayment} px-4 py-1.5 rounded-full text-[13px] font-black uppercase tracking-tighter">
                                    ${ev.payment_status === 'approved' ? 'Pagamento: Confirmado' : 'Pagamento: Pendente'}
                                </div>
                                <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div>
                                        <div class="mb-4">
                                            <span class="text-xs font-black uppercase tracking-widest ${colorSubscribe}">${labelSubscribe}</span>
                                            <div class="text-xs"><b class="text-slate-400 uppercase block text-[12px]">${dataFormater(ev.created_at || '')}</b></div>
                                            <h5 class="text-2xl font-black text-slate-900 mt-1">${ev.event_name || 'Evento não encontrado'}</h5>
                                            <p class="text-sm font-bold text-slate-400 uppercase">${ev.type_name || 'Tipo não informado'} | ${ev.unit_name || 'Unidade'}</p>
                                        </div>
                                        <div class="grid grid-cols-2 gap-4 mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                            <div class="text-xs"><b class="text-slate-400 uppercase block text-[15px]">Data do evento</b><span class="font-black text-slate-900 block text-[15px]">${dataFormater(ev.event_date || '')}</span></div>
                                            <div class="text-xs"><b class="text-green-400 uppercase block text-[15px]">Data da compra</b><span class="font-black text-slate-900 block text-[15px]">${dataFormater(ev.createdPay || '')}</span></div>
                                            <div class="text-xs"><b class="text-slate-400 uppercase block text-[15px]">Valor</b><span class="font-black text-slate-900 block text-[15px]">R$ ${ev.valor_evento}</span></div>
                                          <!--  <div class="text-xs col-span-2"><b class="text-slate-400 uppercase block text-[9px]">E-mail Pagador</b><span class="truncate block"></span></div> -->
                                        </div>
                                    </div>
                                    <div class="bg-fuchsia-50/30 p-6 rounded-[2rem] border border-fuchsia-100 flex flex-col justify-between">
                                        <div></div>
                                        <button onclick="openFullAnamnesis(${ev.subscribed_id})" class="mt-4 flex items-center gap-2 text-sm font-black text-fuchsia-600 hover:text-fuchsia-800 transition-colors uppercase tracking-widest">
                                            Ver ficha de Anaminese ➜
                                        </button>
                                    </div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (e) {
        accordion.innerHTML = '<p class="text-center text-red-500">Erro ao renderizar dados.</p>';
    }
};


// =============================================================================
// SECTION 12 — ADMIN CRUD MODAL (events, units, event-types)
// =============================================================================

(window as any).openCrudModal = async (target: 'events' | 'units' | 'event-types') => {
    currentTarget = target;
    const modal      = document.querySelector<HTMLDivElement>('#modal-crud')!;
    const title      = document.querySelector<HTMLHeadingElement>('#modal-title')!;
    const nameInput  = document.querySelector<HTMLInputElement>('#modal-input-name');
    const priceInput = document.querySelector<HTMLInputElement>('#modal-input-price');
    const priceField = document.querySelector<HTMLDivElement>('#field-price');

    if (nameInput)  nameInput.value  = '';
    if (priceInput) priceInput.value = '';

    const labels: any = { 'events': 'Eventos', 'units': 'Unidades', 'event-types': 'Tipos' };
    title.innerText = `Gerenciar ${labels[target]}`;
    priceField?.classList.toggle('hidden', target !== 'events');

    modal.classList.remove('hidden');
    await refreshModalList();
};

async function refreshModalList() {
    try {
        const res    = await safeFetch(`${API_BASE_URL}/${currentTarget}`, { credentials: 'include' });
        const data   = await res.json();
        const select = document.querySelector<HTMLSelectElement>('#modal-select-list');
        if (select) select.innerHTML = '<option value="">Excluir...</option>' + data.map((item: any) => `<option value="${item.id}">${item.name || item.nome}</option>`).join('');
    } catch (e) { console.error(e); }
}

(window as any).closeCrudModal = () => {
    document.querySelector<HTMLDivElement>('#modal-crud')?.classList.add('hidden');
};

(window as any).saveCrudItem = async () => {
    const nameInput  = document.querySelector<HTMLInputElement>('#modal-input-name');
    const priceInput = document.querySelector<HTMLInputElement>('#modal-input-price');
    if (!nameInput?.value.trim()) { alert("Por favor, digite um nome!"); return; }

    const payload: any = { name: nameInput.value.trim() };
    if (currentTarget === 'events') {
        if (!priceInput?.value) { alert("Por favor, digite o preço!"); return; }
        payload.price = priceInput.value;
    }

    try {
        const res = await safeFetch(`${API_BASE_URL}/${currentTarget}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            alert("Salvo com sucesso!");
            nameInput.value  = '';
            if (priceInput) priceInput.value = '';
            await refreshModalList();
            await loadFormOptions();
        } else {
            const err = await res.json();
            alert("Erro ao salvar: " + (err.mensagem || "Erro desconhecido"));
        }
    } catch (e) { console.error(e); }
};

(window as any).deleteCrudItem = async () => {
    const selectElement = document.querySelector<HTMLSelectElement>('#modal-select-list');
    const id = selectElement?.value;
    if (!id || !confirm("Tem certeza que deseja excluir este item?")) return;

    try {
        const res = await safeFetch(`${API_BASE_URL}/${currentTarget}/${id}`, { method: 'DELETE', credentials: 'include' });
        if (res.ok) { alert("Excluído com sucesso!"); await refreshModalList(); await loadFormOptions(); }
        else { const err = await res.json(); alert("Erro ao excluir: " + (err.error || "Acesso negado")); }
    } catch (e) { console.error(e); }
};


// =============================================================================
// SECTION 13 — ADMIN ACTIONS (schedule delete, login, logout)
// =============================================================================

(window as any).deleteSchedule = async (id: number) => {
    if (!confirm("Deseja excluir este registro?")) return;
    const res = await safeFetch(`${API_BASE_URL}/schedules/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) loadAdminTableData();
};

(window as any).makeLogin = async () => {
    const emailInput    = document.querySelector<HTMLInputElement>('#admin-email');
    const passwordInput = document.querySelector<HTMLInputElement>('#admin-password');
    if (!emailInput || !passwordInput) { console.error("Campos de login não encontrados"); return; }

    const email    = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) { alert("Por favor, preencha todos os campos."); return; }

    try {
        const res = await safeFetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password }),
        });
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('admin_full_name', data.user.full_name);
            window.location.hash = '#admin';
            handleRouting();
        } else {
            const errorData = await res.json();
            alert(errorData.mensagem || "Login inválido.");
        }
    } catch (e) { console.error(e); alert("Erro ao conectar com o servidor."); }
};

(window as any).makeLogout = async () => {
    try { await fetch(`${API_BASE_URL}/logout`, { method: 'POST', credentials: 'include' }); } catch (e) {}
    localStorage.removeItem('admin_full_name');
    window.location.href = '/beta/login';
};


// =============================================================================
// SECTION 14 — ANAMNESIS MODAL (admin full profile view)
// =============================================================================

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
            <div class="flex items-center gap-2 text-sm font-medium">${ficha.is_medium     == 1 ? '✅' : '?'} <span class="text-slate-600">Médium</span></div>
            <div class="flex items-center gap-2 text-sm font-medium">${ficha.is_tule_member == 1 ? '✅' : '?'} <span class="text-slate-600">Membro TULE</span></div>
            <div class="flex items-center gap-2 text-sm font-medium">${ficha.first_time    == 1 ? '✅' : '?'} <span class="text-slate-600">Primeira Vez</span></div>
            <div class="text-sm font-medium"><span class="text-slate-400">Religião:</span> ${ficha.religion_mention || '?'}</div>
        </div>
        <div class="space-y-4">
            <div class="p-5 bg-fuchsia-50/50 rounded-3xl border border-fuchsia-100">
                <b class="text-[9px] text-fuchsia-600 uppercase block mb-2 tracking-widest">Razão pela qual você se inscreveu:</b>
                <p class="text-sm text-slate-700 italic leading-relaxed">${ficha.course_reason || ''}</p>
            </div>
            <div>
                <b class="text-[9px] text-slate-400 uppercase block mb-1 ml-1">Quem Indicou?</b>
                <p class="text-sm text-slate-600 px-1">${ficha.who_recomended || ''}</p>
            </div>
        </div>
        <button onclick="document.getElementById('modal-anamnese').classList.add('hidden')"
                class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all mt-4">
            Fechar Ficha
        </button>
    `;

    const modalTitle = modal.querySelector('h2');
    const modalBody  = modal.querySelector('.p-8') || modal.querySelector('#modal-select-list')?.parentElement;
    if (modalTitle) modalTitle.innerText  = `Ficha de Inscrição: ${ficha.full_name}`;
    if (modalBody)  modalBody.innerHTML   = conteudoFicha;
    modal.classList.remove('hidden');
};

(window as any).toggleAccordion = (index: number) => {
    const content = document.getElementById(`content-${index}`);
    const icon    = document.getElementById(`icon-${index}`);
    if (content && icon) {
        content.classList.toggle('hidden');
        icon.style.transform = content.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
    }
};

window.onclick = (event) => {
    const modalCrud    = document.getElementById('modal-crud');
    const modalAnamnese = document.getElementById('modal-anamnese');
    if (event.target === modalCrud)     modalCrud?.classList.add('hidden');
    if (event.target === modalAnamnese) modalAnamnese?.classList.add('hidden');
};


// =============================================================================
// SECTION 15 — SUCCESS PAGE (post-payment redirect page)
// =============================================================================

const renderSuccessPage = () => {
    const app = document.querySelector<HTMLDivElement>('#app');
    if (!app) return;

    app.innerHTML = `
        <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f9fafb;font-family:sans-serif;padding:20px;text-align:center;">
            <div style="max-width:400px;width:100%;background:white;padding:40px;border-radius:16px;box-shadow:0 10px 25px rgba(0,0,0,0.1);">
                <div style="width:80px;height:80px;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px auto;">
                    <svg style="width:48px;height:48px;color:#16a34a;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <h1 style="color:#111827;font-size:24px;font-weight:700;margin-bottom:8px;">Pagamento Realizado!</h1>
                <p style="color:#4b5563;font-size:16px;margin-bottom:32px;line-height:1.5;">Seu pagamento foi confirmado. Agora você já pode fechar esta página para prosseguir com a inscrição.</p>
                <button id="btnClose" style="width:100%;background:#16a34a;color:white;border:none;padding:14px;border-radius:8px;font-weight:600;cursor:pointer;">Fechar Janela</button>
            </div>
            <p style="margin-top:24px;color:#9ca3af;font-size:12px;">FastPayment © 2026</p>
        </div>`;

    document.querySelector('#btnClose')?.addEventListener('click', () => window.close());
};


// =============================================================================
// SECTION 16 — ROUTING (handleRouting — controls all page navigation)
// =============================================================================

const handleRouting = async () => {
    const path   = window.location.pathname;
    const hash   = window.location.hash;
    const params = new URLSearchParams(window.location.search);

    const currentMpStatus = params.get('status') || params.get('collection_status');

    // ✅ REQ-012: Capture payment_id but don't auto-redirect to form
    if (currentMpStatus === 'approved' || currentMpStatus === 'success') {
        const urlPaymentId = params.get('payment_id') || params.get('collection_id');
        if (urlPaymentId) localStorage.setItem('mp_payment_id', urlPaymentId);

        // Clean URL to remove status params
        window.history.replaceState({}, document.title, window.location.origin + window.location.pathname);
    }

    hideAllSections();
    const activeSections = getSections();

    if (!path.includes('/login') && hash !== '#login') {
        document.body.classList.add('bg-reiki');
    }

    const isAdmin = hash === '#admin' || path.includes('/login') || path.includes('/admin');

    if (isAdmin) {
        document.body.classList.remove('bg-reiki');
        if (localStorage.getItem('admin_full_name')) {
            renderAdminDashboard();
        } else if (activeSections.login) {
            activeSections.login.classList.remove('hidden');
        }
    } else {
        if (activeSections.selection) {
            activeSections.selection.classList.remove('hidden');
            loadEvents(); // ✅ Always reloads agenda — no shortcut to form
        }
    }
    injectVersion();
};


// =============================================================================
// SECTION 17 — FOOTER & INITIALIZATION
// =============================================================================

const footer = document.createElement('div');
footer.className = "col-span-full text-center mt-12 mb-8 flex flex-col items-center gap-2";
footer.innerHTML = `<span class="opacity-30 text-[9px] text-white font-mono uppercase tracking-widest">MISTURA DE LUZ <span class="app-version"></span></span>`;
injectVersion();

window.addEventListener('popstate', handleRouting);

if (document.readyState === 'complete') {
    handleRouting();
} else {
    window.addEventListener('load', handleRouting);
}