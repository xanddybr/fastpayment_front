// admin.ts - Controle de Acesso Administrativo

const API_ADMIN = 'http://localhost:8080';

// Função para gerenciar qual "página" aparece
function showSection(sectionId: string) {
    // 1. Esconde todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    // 2. Mostra a seção alvo
    const target = document.getElementById(sectionId);
    if (target) {
        target.classList.add('active');
    }

    // 3. Controle da Navbar: Só aparece se não for a tela de login
    const navbar = document.getElementById('navMistura');
    if (navbar) {
        if (sectionId === 'login') {
            navbar.classList.add('hidden');
        } else {
            navbar.classList.remove('hidden');
        }
    }
}

// FUNÇÃO DE LOGIN (Conecta com seu AuthController.php)
async function makeLogin() {
    const emailInput = document.getElementById('email') as HTMLInputElement;
    const passwordInput = document.getElementById('senha') as HTMLInputElement;
    const btn = document.querySelector('button[onclick="makeLogin()"]') as HTMLButtonElement;

    if (!emailInput.value || !passwordInput.value) {
        alert("Preencha todos os campos.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Autenticando...";

    try {
        const response = await fetch(`${API_ADMIN}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: emailInput.value, 
                password: passwordInput.value 
            })
        });

        const data = await response.json();

        if (response.ok && data.status === "sucesso") {
            console.log("Bem-vindo:", data.user.name);
            showSection('dashboard'); // Sucesso! Entra no Dashboard
        } else {
            alert(data.mensagem || "Erro ao logar.");
            btn.disabled = false;
            btn.innerText = "Entrar";
        }
    } catch (error) {
        console.error("Erro na requisição:", error);
        alert("Não foi possível conectar ao servidor administrativo.");
        btn.disabled = false;
        btn.innerText = "Entrar";
    }
}

// Penduramos a função no window para o HTML conseguir enxergar (padrão Vite)
(window as any).makeLogin = makeLogin;

// Inicialização: Ao abrir a página, mostra o Login
window.onload = () => {
    showSection('login');
};