#!/bin/bash
set -e

echo "📦 Verificando pasta..."
if [ ! -f "package.json" ]; then
  echo "❌ ERRO: Rode dentro da pasta recria-bovina."
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "1/5 — Criando diretórios..."
mkdir -p public
mkdir -p "src/app/(dashboard)/importar/_components"
mkdir -p src/app/api/import

echo "2/5 — Copiando arquivos..."
cp "$SCRIPT_DIR/public/modelo-importacao.xlsx" public/
cp "$SCRIPT_DIR/src/app/(dashboard)/importar/_components/import-manager.tsx" "src/app/(dashboard)/importar/_components/"
cp "$SCRIPT_DIR/src/app/(dashboard)/importar/page.tsx" "src/app/(dashboard)/importar/"
cp "$SCRIPT_DIR/src/app/api/import/route.ts" src/app/api/import/
cp "$SCRIPT_DIR/src/components/layout/sidebar.tsx" src/components/layout/
cp "$SCRIPT_DIR/src/app/(dashboard)/animais/_components/animais-manager.tsx" "src/app/(dashboard)/animais/_components/"

echo "3/5 — Instalando dependências..."
npm install

echo "4/5 — Gerando Prisma Client..."
npx prisma generate

echo "5/5 — Enviando para o GitHub..."
git add -A
git commit -m "feat: Importação em lote via XLSX (propriedades, lotes e animais)"
git push

echo ""
echo "✅ Importação via XLSX pronta!"
echo ""
echo "Para testar:"
echo "  npm run dev"
echo "  Abra http://localhost:3000/importar"
echo ""
echo "Funcionalidades:"
echo "  • Botão 'Baixar modelo' — template XLSX com instruções"
echo "  • Upload de planilha com validação visual instantânea"
echo "  • Preview: verde = OK, amarelo = cria propriedade/lote novo, vermelho = erro"
echo "  • Importação com tudo em transação atômica"
echo "  • Link 'Importar' no menu lateral"
