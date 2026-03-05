#!/bin/bash
set -e

if [ ! -f "package.json" ]; then
  echo "❌ Rode dentro da pasta recria-bovina."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "1/3 — Copiando arquivos..."
mkdir -p src/app/api/weighings/batch

cp "$SCRIPT_DIR/public/modelo-importacao.xlsx" public/
cp "$SCRIPT_DIR/src/app/(dashboard)/importar/_components/import-manager.tsx" "src/app/(dashboard)/importar/_components/"
cp "$SCRIPT_DIR/src/app/(dashboard)/importar/page.tsx" "src/app/(dashboard)/importar/"
cp "$SCRIPT_DIR/src/app/api/weighings/batch/route.ts" src/app/api/weighings/batch/

echo "2/3 — Gerando Prisma Client..."
npx prisma generate

echo "3/3 — Enviando para o GitHub..."
git add -A
git commit -m "feat: importação de pesagens em lote via XLSX (aba Pesagens no mesmo arquivo)"
git push

echo ""
echo "✅ Pronto!"
echo ""
echo "O template atualizado (Baixar modelo) agora tem 3 abas:"
echo "  • Importação — cadastro de animais"
echo "  • Pesagens — registro de pesos em lote"
echo "  • Instruções — como preencher"
