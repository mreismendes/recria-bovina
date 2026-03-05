#!/bin/bash
set -e

echo "📦 Verificando que estamos na pasta recria-bovina..."
if [ ! -f "package.json" ]; then
  echo "❌ ERRO: Rode este script dentro da pasta recria-bovina."
  echo "   Ex: cd ~/Downloads/recria-bovina && bash aplicar-etapa3.sh"
  exit 1
fi

echo "1/5 — Criando diretórios das novas API routes..."
mkdir -p src/app/api/animals/movimentar
mkdir -p src/app/api/animals/saida
mkdir -p src/app/api/animals/estorno-saida

echo "2/5 — Copiando arquivos novos e modificados..."
# Os arquivos estão no mesmo diretório que este script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

cp "$SCRIPT_DIR/.eslintrc.json" .eslintrc.json
cp "$SCRIPT_DIR/src/lib/utils.ts" src/lib/utils.ts
cp "$SCRIPT_DIR/src/lib/api.ts" src/lib/api.ts
cp "$SCRIPT_DIR/src/app/(dashboard)/animais/page.tsx" "src/app/(dashboard)/animais/page.tsx"
cp "$SCRIPT_DIR/src/app/(dashboard)/animais/_components/animais-manager.tsx" "src/app/(dashboard)/animais/_components/animais-manager.tsx"
cp "$SCRIPT_DIR/src/app/(dashboard)/animais/_components/movimentacao-sheet.tsx" "src/app/(dashboard)/animais/_components/movimentacao-sheet.tsx"
cp "$SCRIPT_DIR/src/app/(dashboard)/animais/_components/saida-sheet.tsx" "src/app/(dashboard)/animais/_components/saida-sheet.tsx"
cp "$SCRIPT_DIR/src/app/api/animals/movimentar/route.ts" src/app/api/animals/movimentar/route.ts
cp "$SCRIPT_DIR/src/app/api/animals/saida/route.ts" src/app/api/animals/saida/route.ts
cp "$SCRIPT_DIR/src/app/api/animals/estorno-saida/route.ts" src/app/api/animals/estorno-saida/route.ts

echo "3/5 — Instalando dependências..."
npm install

echo "4/5 — Atualizando banco de dados..."
npx prisma generate

echo "5/5 — Enviando para o GitHub..."
git add -A
git commit -m "feat: Etapa 3 — P01 Entrada/Movimentação/Saída (API + UI)"
git push

echo ""
echo "✅ Etapa 3 aplicada com sucesso!"
echo ""
echo "Para testar localmente:"
echo "  npm run dev"
echo "  Abra http://localhost:3000/animais"
echo ""
echo "Novas funcionalidades:"
echo "  • Checkbox de seleção na tabela de animais"
echo "  • Botão 'Mover' → movimentação interna entre lotes"
echo "  • Botão 'Registrar Saída' → baixa com snapshot econômico"
echo "  • API de estorno de saída (POST /api/animals/estorno-saida)"
