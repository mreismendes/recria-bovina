#!/bin/bash
# fix-ci.sh — Rodar na raiz do repo recria-bovina
# Corrige os 3 problemas que quebram o CI

set -e

echo "1/3 — Substituindo ci.yml..."
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - run: npm install
      - run: npx prisma generate
      - run: npx tsc --noEmit
      - run: npm run lint
EOF

echo "2/3 — Removendo configs duplicados..."
rm -f next.config.mjs postcss.config.mjs

echo "3/3 — Gerando package-lock.json..."
npm install

echo ""
echo "✅ Pronto! Agora faça:"
echo "   git add -A"
echo "   git commit -m 'fix: corrige CI (npm install, remove duplicatas, gera lock)'"
echo "   git push"
