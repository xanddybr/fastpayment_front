#!/bin/bash
set -e

SSH_USER="u967889760"
SSH_HOST="82.112.247.211"
SSH_PORT="65002"
REMOTE_PATH="domains/misturadeluz.com/public_html/beta"
SSH_TARGET="${SSH_USER}@${SSH_HOST}"

echo "==> Gerando build de produção..."
npm run build

echo "==> Copiando .htaccess para dist/..."
cp htaccess dist/.htaccess

echo "==> Enviando para o servidor..."
rsync -avz --delete \
  -e "ssh -p ${SSH_PORT}" \
  dist/ "${SSH_TARGET}:${REMOTE_PATH}/"

echo "==> Deploy do frontend concluído!"
echo "    Acesse: https://agendabeta.misturadeluz.com"
