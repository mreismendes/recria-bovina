#!/bin/bash
set -e

echo "📦 Verificando que estamos na pasta recria-bovina..."
if [ ! -f "package.json" ]; then
  echo "❌ ERRO: Rode este script dentro da pasta recria-bovina."
  echo "   Ex: cd ~/Downloads/recria-bovina && bash aplicar-etapa4.sh"
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "1/4 — Criando diretórios..."
mkdir -p "src/app/(dashboard)/pesagens/_components"

echo "2/4 — Copiando arquivos da Etapa 4..."
cp "$SCRIPT_DIR/src/app/(dashboard)/pesagens/_components/pesagens-manager.tsx" "src/app/(dashboard)/pesagens/_components/"
cp "$SCRIPT_DIR/src/app/(dashboard)/pesagens/page.tsx" "src/app/(dashboard)/pesagens/"
cp "$SCRIPT_DIR/src/app/api/weighings/route.ts" "src/app/api/weighings/"
cp "$SCRIPT_DIR/src/lib/api.ts" "src/lib/"

echo "3/4 — Gerando Prisma Client..."
npx prisma generate

echo "4/4 — Enviando para o GitHub..."
git add -A
git commit -m "feat: Etapa 4 — P02 Controle de Pesagens (sessão por lote + histórico + GMD)"
git push

echo ""
echo "✅ Etapa 4 aplicada com sucesso!"
echo ""
echo "Para testar:"
echo "  npm run dev"
echo "  Abra http://localhost:3000/pesagens"
echo ""
echo "Funcionalidades:"
echo "  • Aba 'Nova Sessão': selecione lote, preencha pesos, veja GMD calculado"
echo "  • Aba 'Histórico': pesagens agrupadas por data com GMD médio"
echo "  • Alertas visuais para animais sem pesagem há mais de 45 dias"
