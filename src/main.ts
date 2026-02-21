import './style.css';

// --- ESTADO DA APLICAÇÃO ---
let selectedEvent = { id: 0, name: '' };
let currentTarget: 'events' | 'units' | 'event-types' = 'events';

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
    const urlParams = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    
    // Opcional: Remover o prefixo "/agenda" para a lógica interna ser mais limpa
    const cleanPath = path.replace('/agenda', '') || '/';
    
    hideAllSections();

    if (cleanPath.includes('/admin')) {
        const isAuthenticated = await checkAuth();
        if (isAuthenticated) {
            renderAdminDashboard();
        } else {
            // Redireciona para o login dentro da pasta agenda
            window.location.href = '/agenda/login';
        }
    } else if (cleanPath.includes('/login')) {
        sections.login.classList.remove('hidden');
    } else {
        sections.selection.classList.remove('hidden');
        loadEvents();
    }
};

const checkAuth = async () => {
    try {
        const res = await fetch('http://localhost:8080/api/auth/check', { credentials: 'include' });
        return res.ok;
    } catch { return false; }
};

const hideAllSections = () => {
    Object.values(sections).forEach(s => s?.classList.add('hidden'));
};

const getDayName = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { weekday: 'long' });
};

// --- AGENDA PÚBLICA (COM FILTROS) ---
const loadEvents = async (eventSlug: string = '', typeSlug: string = '') => {
    const container = document.querySelector<HTMLDivElement>('#events-container')!;
    if (!container) return;
    
    container.innerHTML = '<p class="text-center col-span-full text-slate-400">Buscando horários...</p>';
    
    try {
        const url = `http://localhost:8080/api/schedules?slug=${eventSlug}&type=${typeSlug}`;
        const response = await fetch(url);
        const schedules = await response.json();

        if (!schedules || schedules.length === 0) {
            container.innerHTML = '<p class="text-center col-span-full text-slate-500 py-10">Nenhum horário disponível.</p>';
            return;
        }

        container.innerHTML = schedules.map((item: any) => `
            <div class="bg-slate-950 border border-slate-800 p-6 rounded-3xl shadow-2xl hover:border-fuchsia-600 transition-all duration-300 group">
                
                <div class="flex justify-between items-start mb-4">
                    <span class="bg-violet-600/20 text-violet-400 text-[10px] font-bold px-3 py-1 rounded-full border border-violet-600/30 uppercase tracking-widest">
                        ${item.type_name || 'Geral'}
                    </span>
                    <span class="text-[10px] text-slate-600 font-black uppercase tracking-tighter">${item.unit_name}</span>
                </div>

                <h3 class="text-xl font-black text-fuchsia-500 mb-1">
                    ${item.event_name}
                </h3>
                
                <div class="flex items-baseline gap-1 mb-6">
                    <span class="text-xs text-slate-500 font-bold uppercase">R$</span>
                    <span class="text-2xl font-black text-slate-100">${item.event_price}</span>
                </div>
                
                <div class="space-y-2 mb-6 border-l-2 border-violet-600/30 pl-4">
                    <p class="text-sm text-slate-300 flex items-center gap-2">
                        <span class="text-violet-500">📅</span> ${getDayName(item.scheduled_at)}, ${new Date(item.scheduled_at).toLocaleDateString('pt-BR')}
                    </p>
                    <p class="text-sm text-slate-400 flex items-center gap-2 italic">
                        <span class="text-fuchsia-500 text-xs">⏰</span> ${new Date(item.scheduled_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}h
                    </p>
                </div>
                
                <button onclick="selectEvent(${item.schedule_id}, '${item.event_name}')" 
                    class="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:from-violet-500 hover:to-fuchsia-500 transition-all transform active:scale-95">
                    Reservar Agora
                </button>
            </div>
        `).join('');
    } catch (e) { 
        container.innerHTML = '<p class="text-center col-span-full text-red-500">Erro ao carregar agenda.</p>'; 
    }
};

// --- DASHBOARD ADMIN ---
const renderAdminDashboard = async () => {
    hideAllSections();
    sections.selection.classList.remove('hidden');
    
    const container = document.querySelector<HTMLDivElement>('#events-container')!;
    const header = sections.selection.querySelector('header');

    // Recupera o nome do usuário que salvamos no login
    // Se não houver nada, usamos "Administrador" como fallback
    const adminName = localStorage.getItem('admin_full_name') || 'Administrador';

    if (header) {
        header.className = "fixed top-0 left-0 w-full bg-white border-b border-slate-100 z-50 shadow-sm";
        header.innerHTML = `
            <div class="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
                <nav class="flex items-center gap-8 h-full">
                    <span class="font-black text-slate-900 text-xl tracking-tighter mr-4">ADMIN</span>
                    <button onclick="changeAdminTab('inicio')" class="h-full text-sm font-bold transition-all px-1 border-transparent">Início</button>
                    <button onclick="changeAdminTab('agenda')" class="h-full text-sm font-bold transition-all px-1 border-transparent">Agenda</button>
                    <button onclick="changeAdminTab('inscricoes')" class="h-full text-sm font-bold transition-all px-1 border-transparent">Inscrições</button>
                    <button onclick="changeAdminTab('historico')" class="h-full text-sm font-bold transition-all px-1 border-transparent">Histórico</button>
                </nav>
                <div class="flex items-center gap-4">
                    <span class="text-xs font-bold text-slate-400">Olá, ${adminName}</span>
                    <button onclick="makeLogout()" class="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-red-600 hover:text-white transition-all">Sair</button>
                </div>
            </div>
        `;
    }

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
    
    // --- LÓGICA DE ESTILO DOS BOTÕES ---
    // 1. Seleciona todos os botões do menu no header
    const menuButtons = document.querySelectorAll('header nav button');
    
    menuButtons.forEach(btn => {
        // Remove as classes de ativo e volta para o padrão (slate-500)
        btn.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
        btn.classList.add('text-slate-500');
        
        // Verifica se o texto do botão ou o atributo de data corresponde à aba (ajuste simples)
        // Dica: Se quiser ser mais preciso, adicione data-tab="agenda" no HTML do botão
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
        if (btn.textContent?.toLowerCase().trim() === tab.toLowerCase().trim() || 
           (tab === 'historico' && btn.textContent?.toLowerCase() === 'histórico')) {
            btn.classList.remove('text-slate-500');
            btn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
        }
        
    });
    
    switch (tab) {
        case 'inicio':
            const currentName = localStorage.getItem('admin_full_name') || 'Seu nome de usuário não foi carregado!';
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center min-h-[50vh] text-center">
                    <div class="w-20 h-20 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center text-4xl mb-6">👋</div>
                    <h1 class="text-4xl font-black text-slate-900 mb-2">Bem-vindo, ${currentName}!</h1>
                    <p class="text-slate-500 max-w-md">Selecione uma opção no menu superior para começar a gerenciar sua plataforma.</p>
                </div>
            `;
            break;

        case 'agenda':
            // Renderiza a estrutura da agenda (Formulário + Tabela)
            container.innerHTML = `
                <div class="col-span-full space-y-6">
                    <div class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <form id="formAgendamento" class="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 mb-1">DATA/HORA</label>
                                <input type="datetime-local" id="datahora" class="w-full border rounded-xl p-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" required>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 mb-1">EVENTO</label>
                                <div class="flex"><select id="select-evento" class="flex-1 border rounded-l-xl p-2.5 text-sm outline-none" required></select>
                                <button type="button" onclick="openCrudModal('events')" class="bg-slate-50 px-3 border border-l-0 rounded-r-xl">+</button></div>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 mb-1">TIPO</label>
                                <div class="flex"><select id="select-tipo" class="flex-1 border rounded-l-xl p-2.5 text-sm outline-none" required></select>
                                <button type="button" onclick="openCrudModal('event-types')" class="bg-slate-50 px-3 border border-l-0 rounded-r-xl">+</button></div>
                            </div>
                            <div>
                                <label class="block text-[10px] font-bold text-slate-400 mb-1">UNIDADE</label>
                                <div class="flex"><select id="select-unidade" class="flex-1 border rounded-l-xl p-2.5 text-sm outline-none" required></select>
                                <button type="button" onclick="openCrudModal('units')" class="bg-slate-50 px-3 border border-l-0 rounded-r-xl">+</button></div>
                            </div>
                            <button type="submit" class="bg-blue-600 text-white p-2.5 rounded-xl font-bold hover:bg-blue-700">Salvar</button>
                        </form>
                    </div>
                    <div class="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <table class="w-full text-left text-sm">
                            <thead class="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                                <tr><th class="p-4">Dia</th><th class="p-4">Data</th><th class="p-4">Evento</th><th class="p-4">Tipo</th><th class="p-4 text-center">Preço</th><th class="p-4 text-center">Unidade</th><th class="p-4 text-center">Ações</th></tr>
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
                <div class="py-10 text-center">
                    <h2 class="text-2xl font-black text-slate-900">Inscrições Ativas</h2>
                    <p class="text-slate-500">Módulo em desenvolvimento...</p>
                </div>
            `;
            break;

        case 'historico':
            container.innerHTML = `
                <div class="py-10 text-center">
                    <h2 class="text-2xl font-black text-slate-900">Histórico de Atividades</h2>
                    <p class="text-slate-500">Módulo em desenvolvimento...</p>
                </div>
            `;
            break;
    }
};

// --- CARREGAMENTO DE DADOS (ADMIN) ---
const loadAdminTableData = async () => {
    const tbody = document.querySelector('#adminTableBody');
    if (!tbody) return;
    try {
        const res = await fetch('http://localhost:8080/schedules', { credentials: 'include' });
        const data = await res.json();
        
        const agora = new Date();

        tbody.innerHTML = data.map((item: any) => {
            const dataAgendamento = new Date(item.scheduled_at);
            // Verifica se a data do agendamento já passou em relação ao momento atual
            const isExpirado = dataAgendamento < agora;
            
            // Define a classe de cor: text-red-600 se expirado, text-slate-500 se normal
            const corTexto = isExpirado ? 'text-red-600 font-bold' : 'text-slate-500';

            return `
                <tr class="hover:bg-slate-50 transition-colors border-b border-slate-50">
                    <td class="p-4 font-medium ${corTexto}">${getDayName(item.scheduled_at)}</td>
                    
                    <td class="p-4">
                        <div class="${corTexto}">${dataAgendamento.toLocaleDateString('pt-BR')} - ${dataAgendamento.toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})}</div>
                        <div class="text-[10px] text-slate-400"></div>
                    </td>
                    
                    <td class="p-4 font-bold ${isExpirado ? 'text-red-600' : 'text-slate-900'}">${item.event_name}</td>
                    
                    <td class="p-4">
                        <span class="bg-slate-100 text-slate-500 px-2 py-1 rounded text-[10px] font-bold uppercase">
                            ${item.type_name || '-'}
                        </span>
                    </td>
                    
                    <td class="p-4 font-black ${isExpirado ? 'text-red-600' : 'text-blue-600'}">R$ ${item.event_price}</td>
                    
                    <td class="p-4 text-slate-600 text-xs font-bold uppercase">${item.unit_name}</td>
                    
                    <td class="p-4 text-center">
                        <button onclick="deleteSchedule(${item.schedule_id})" class="text-red-400 hover:text-red-600 font-bold transition-colors">Excluir</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch { 
        tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center">Erro ao carregar dados.</td></tr>'; 
    }
};

const loadFormOptions = async () => {
    const opt = { credentials: 'include' as RequestCredentials };
    try {
        const [ev, un, tp] = await Promise.all([
            fetch('http://localhost:8080/events', opt).then(r => r.json()),
            fetch('http://localhost:8080/units', opt).then(r => r.json()),
            fetch('http://localhost:8080/event-types', opt).then(r => r.json())
        ]);
        
        const sEv = document.querySelector<HTMLSelectElement>('#select-evento');
        const sUn = document.querySelector<HTMLSelectElement>('#select-unidade');
        const sTp = document.querySelector<HTMLSelectElement>('#select-tipo');

        // Adicionando a opção padrão "Selecione..." em cada um
        if (sEv) {
            sEv.innerHTML = '<option value="" disabled selected>Selecione o Evento</option>' + 
                ev.map((e: any) => `<option value="${e.id}">${e.name}</option>`).join('');
        }
        
        if (sUn) {
            sUn.innerHTML = '<option value="" disabled selected>Selecione a Unidade</option>' + 
                un.map((u: any) => `<option value="${u.id}">${u.name}</option>`).join('');
        }
        
        if (sTp) {
            sTp.innerHTML = '<option value="" disabled selected>Selecione o Tipo</option>' + 
                tp.map((t: any) => `<option value="${t.id}">${t.name}</option>`).join('');
        }

    } catch (e) { 
        console.error("Erro ao carregar selects", e); 
    }
};

const setupFormListener = () => {
    const form = document.querySelector<HTMLFormElement>('#formAgendamento');
    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Captura os valores dos elementos
        const payload = {
            scheduled_at: (document.querySelector('#datahora') as HTMLInputElement).value,
            event_id: (document.querySelector('#select-evento') as HTMLSelectElement).value,
            unit_id: (document.querySelector('#select-unidade') as HTMLSelectElement).value,
            event_type_id: (document.querySelector('#select-tipo') as HTMLSelectElement).value,
            vacancies: 1, // Valor padrão ou campo do form
            status: 'available' // Importante para aparecer na agenda pública!
        };

        console.log("Enviando agendamento:", payload); // Para você ver no F12 se os IDs estão vindo

        const res = await fetch('http://localhost:8080/schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (res.ok) { 
            alert("Salvo com sucesso!"); 
            loadAdminTableData(); 
            form.reset();
        } else {
            const error = await res.json();
            alert("Erro ao salvar: " + (error.error || "Verifique os dados"));
        }
    });
};

// --- MODAL CRUD ---
// 1. Garanta que a variável de controle mude ANTES de buscar os dados
(window as any).openCrudModal = async (target: 'events' | 'units' | 'event-types') => {
    // Atualiza a variável global que controla o que estamos editando
    currentTarget = target; 

    const modal = document.querySelector<HTMLDivElement>('#modal-crud')!;
    const title = document.querySelector<HTMLHeadingElement>('#modal-title')!;
    const priceField = document.querySelector<HTMLDivElement>('#field-price')!;

    // Ajusta visualmente o modal conforme o alvo
    title.innerText = `Gerenciar ${target === 'events' ? 'Eventos' : target === 'units' ? 'Unidades' : 'Tipos de Evento'}`;
    
    // Só mostra o campo de preço se for Evento
    priceField.classList.toggle('hidden', target !== 'events');

    // Limpa o select antes de carregar novos dados para evitar confusão visual
    const select = document.querySelector<HTMLSelectElement>('#modal-select-list')!;
    select.innerHTML = '<option value="">Carregando...</option>';

    modal.classList.remove('hidden');

    // Chama a atualização passando o alvo correto
    await refreshModalList();
};

// 2. Ajuste a função de carregamento para usar a variável atualizada
async function refreshModalList() {
    // Importante: a URL deve usar o currentTarget que acabamos de definir
    const url = `http://localhost:8080/${currentTarget}`;
    
    try {
        const res = await fetch(url, { credentials: 'include' });
        const data = await res.json();
        
        const select = document.querySelector<HTMLSelectElement>('#modal-select-list');
        if (select) {
            select.innerHTML = '<option value="">Selecione para excluir...</option>' + 
                data.map((item: any) => `
                    <option value="${item.id}">${item.name || item.nome}</option>
                `).join('');
        }
    } catch (error) {
        console.error("Erro ao carregar lista do modal:", error);
    }
}   

// --- AUTH ACTIONS ---
(window as any).selectEvent = (id: number, name: string) => {
    selectedEvent = { id, name };
    hideAllSections();
    sections.auth.classList.remove('hidden');
    const title = sections.auth.querySelector('h2');
    if (title) title.textContent = `Inscrição: ${name}`;
};

(window as any).makeLogout = async () => {
    try {
        // Tenta avisar o servidor para matar a sessão
        await fetch('http://localhost:8080/logout', { 
            method: 'POST', 
            credentials: 'include' 
        });
    } catch (error) {
        console.error("Erro ao comunicar logout com o servidor", error);
    }

    // LIMPEZA OBRIGATÓRIA:
    localStorage.removeItem('admin_full_name'); // Remove o nome que aparece no "Olá"
    
    // REDIRECIONAMENTO:
    window.location.href = '/agenda/login';
};

(window as any).makeLogin = async () => {
    const email = document.querySelector<HTMLInputElement>('#admin-email')!.value;
    const password = document.querySelector<HTMLInputElement>('#admin-password')!.value;
    const res = await fetch('http://localhost:8080/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
    });

    if (res.ok) {
        const data = await res.json();
        // Salva o nome vindo da tabela persons (objeto user.full_name)
        localStorage.setItem('admin_full_name', data.user.full_name);
        window.location.href = '/agenda/admin';
    } else {
        alert("Erro no login.");
    }
};

(window as any).deleteSchedule = async (id: number) => {
    if (!confirm("Excluir agendamento?")) return;
    const res = await fetch(`http://localhost:8080/schedules/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) loadAdminTableData();
};

// Função para SALVAR (Eventos, Unidades ou Tipos)
(window as any).saveCrudItem = async () => {
    const nameInput = document.querySelector<HTMLInputElement>('#modal-input-name');
    const priceInput = document.querySelector<HTMLInputElement>('#modal-input-price');
    
    if (!nameInput?.value) return alert("Preencha o nome!");

    const payload: any = { name: nameInput.value };
    if (currentTarget === 'events') payload.price = priceInput?.value;

    try {
        const res = await fetch(`http://localhost:8080/${currentTarget}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            nameInput.value = '';
            if (priceInput) priceInput.value = '';
            refreshModalList(); // Atualiza a lista do modal
            alert("Cadastrado com sucesso!");
        }
    } catch (e) {
        console.error("Erro ao salvar item", e);
    }
};

// Função para EXCLUIR item do CRUD
// Função para EXCLUIR item do CRUD corrigida
// Função para EXCLUIR item do CRUD (Atualizada com loadFormOptions)
(window as any).deleteCrudItem = async () => {
    const selectElement = document.querySelector('#modal-select-list') as HTMLSelectElement;
    const id = selectElement.value;

    if (!id) return alert("Selecione um item para excluir");

    if (!confirm("Tem certeza que deseja excluir este item?")) return;

    try {
        const res = await fetch(`http://localhost:8080/${currentTarget}/${id}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        const responseText = await res.text();
        let data;

        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("Servidor retornou algo que não é JSON:", responseText);
            alert("Erro inesperado no servidor.");
            return;
        }

        if (res.ok) {
            alert(data.message || "Excluído com sucesso!");
            
            // 1. Atualiza a lista dentro do próprio modal (o select de exclusão)
            await refreshModalList(); 

            // 2. ATUALIZA OS SELECTS DO FORMULÁRIO PRINCIPAL (O que faltava na deleção!)
            await loadFormOptions(); 
            
        } else {
            alert(data.error || "Erro ao tentar excluir registro.");
        }
    } catch (e) {
        console.error("Erro na comunicação:", e);
        alert("Falha ao processar a exclusão.");
    }
};

(window as any).saveCrudItem = async () => {
    const nameInput = document.querySelector<HTMLInputElement>('#modal-input-name');
    const priceInput = document.querySelector<HTMLInputElement>('#modal-input-price');
    
    if (!nameInput?.value) return alert("Preencha o nome!");

    const payload: any = { name: nameInput.value };
    if (currentTarget === 'events') payload.price = priceInput?.value;

    try {
        const res = await fetch(`http://localhost:8080/${currentTarget}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            nameInput.value = '';
            if (priceInput) priceInput.value = '';
            
            // 1. Atualiza a lista de exclusão do próprio MODAL
            await refreshModalList(); 

            // 2. ATUALIZA OS SELECTS DO FORMULÁRIO DE AGENDAMENTO (O que faltava!)
            await loadFormOptions(); 

            alert("Cadastrado com sucesso!");
        }
    } catch (e) {
        console.error("Erro ao salvar item", e);
    }
};

// --- INICIALIZAÇÃO ---
window.addEventListener('popstate', handleRouting);
handleRouting();