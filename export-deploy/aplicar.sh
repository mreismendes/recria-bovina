#!/bin/bash
set -e

if [ ! -f "package.json" ]; then
  echo "❌ Rode dentro da pasta recria-bovina."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "1/3 — Criando diretórios..."
mkdir -p "src/app/(dashboard)/exportar/_components"
mkdir -p src/app/api/export/animais
mkdir -p src/app/api/export/pesagens
mkdir -p src/app/api/export/lotes

echo "2/3 — Copiando arquivos..."
cp "$SCRIPT_DIR/src/app/(dashboard)/exportar/_components/export-manager.tsx" "src/app/(dashboard)/exportar/_components/"
cp "$SCRIPT_DIR/src/app/(dashboard)/exportar/page.tsx" "src/app/(dashboard)/exportar/"
cp "$SCRIPT_DIR/src/app/api/export/animais/route.ts" src/app/api/export/animais/
cp "$SCRIPT_DIR/src/app/api/export/pesagens/route.ts" src/app/api/export/pesagens/
cp "$SCRIPT_DIR/src/app/api/export/lotes/route.ts" src/app/api/export/lotes/
cp "$SCRIPT_DIR/src/components/layout/sidebar.tsx" src/components/layout/

echo "3/3 — Enviando para o GitHub..."
npx prisma generate
git add -A
git commit -m "feat: exportação de dados (animais, pesagens, lotes) com filtros"
git push

echo ""
echo "✅ Exportação pronta!"
echo ""
echo "Para testar:"
echo "  npm run dev"
echo "  Abra http://localhost:3000/exportar"
