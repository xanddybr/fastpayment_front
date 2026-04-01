# Changelog - FastPayment

[1.0.0-beta] - 2026-03-31

# Adicionado ex:
- Scanner de segurança no `main.ts` para capturar status do Mercado Pago antes do redirecionamento do Vite.
- SessionStorage para persistência de aprovação de pagamento.
- Rota ponte no Slim PHP para contornar limitações de túnel Ngrok.

## Corrigido ex:
- Problema de "ID perdido" ao carregar o formulário de inscrição após o checkout.
- Renderização do Card 1 (Labels do curso) recuperando objeto completo do LocalStorage.
- Aplicação da classe `bg-reiki` no body durante o fluxo de inscrição.

### Alterado ex:
- URL de retorno do Mercado Pago ajustada para evitar conflito de base path no Vite.


