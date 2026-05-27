#!/bin/bash
set -e

SSH_USER="u967889760"
SSH_HOST="82.112.247.211"
SSH_PORT="65002"
REMOTE_PATH="domains/misturadeluz.com/public_html/agenda"
SSH_TARGET="${SSH_USER}@${SSH_HOST}"

echo "==> [PRODUÇÃO - Frontend] Gerando build de produção..."
npm run build

echo "==> [PRODUÇÃO - Frontend] Copiando .htaccess para dist/..."
cp htaccess dist/.htaccess

echo "==> [PRODUÇÃO - Frontend] Enviando para o servidor..."
rsync -avz --delete \
  --exclude='api/' \
  -e "ssh -p ${SSH_PORT}" \
  dist/ "${SSH_TARGET}:${REMOTE_PATH}/"

echo ""
echo "  Frontend: https://agenda.misturadeluz.com"
