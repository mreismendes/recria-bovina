#!/bin/bash
set -e

if [ ! -f "package.json" ]; then
  echo "❌ Rode dentro da pasta recria-bovina."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "1/2 — Copiando arquivos..."
cp "$SCRIPT_DIR/src/components/ui/multi-select.tsx" src/components/ui/
cp "$SCRIPT_DIR/src/app/(dashboard)/exportar/_components/export-manager.tsx" "src/app/(dashboard)/exportar/_components/"
cp "$SCRIPT_DIR/src/app/api/export/animais/route.ts" src/app/api/export/animais/
cp "$SCRIPT_DIR/src/app/api/export/pesagens/route.ts" src/app/api/export/pesagens/
cp "$SCRIPT_DIR/src/app/api/export/lotes/route.ts" src/app/api/export/lotes/

echo "2/2 — Enviando para o GitHub..."
git add -A
git commit -m "feat: multi-select nos filtros de exportação"
git push

echo ""
echo "✅ Pronto! Filtros agora aceitam múltipla seleção."
