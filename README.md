# Gestao de Rebanho Bovino — Recria Individual

Sistema web para gestao individual de rebanho bovino em fase de recria, com rastreamento completo do ciclo de vida do animal: entrada, movimentacao entre lotes, pesagens, custos (suplemento e medicamento) e saida com snapshot economico.

---

## Modelo de Negocio

O sistema atende **operacoes de recria/engorda** de bovinos no Brasil, gerenciando parcerias com fazendas contratadas. O foco e o **rastreamento individual por animal** (identificado por brinco e opcionalmente RFID), permitindo:

- **Gestao de contratos** com fazendas parceiras
- **Controle de lotes** — agrupamentos de gestao com movimentacao entre lotes
- **Registro de pesagens** em lote com calculo automatico de GMD (Ganho Medio Diario)
- **Rateio automatico de custos** — suplementos e medicamentos sao distribuidos proporcionalmente entre os animais ativos no lote na data do apontamento
- **Controle de carencia** — medicamentos bloqueiam a saida/venda do animal durante o periodo de carencia
- **Saida com snapshot economico** — calcula custo total acumulado, arrobas produzidas, custo por arroba e resultado liquido

### Ciclo de vida do animal

```
Entrada → Movimentacao(oes) entre lotes → Pesagens → Custos (suplemento/medicamento) → Saida
   |                                                                                      |
   +--- Registro inicial com peso de entrada                     Snapshot economico final --+
```

1. **Entrada (P01.1)** — Cadastro individual com peso de entrada, criando pertinencia ao lote inicial
2. **Movimentacao (P01.2)** — Transferencia entre lotes com rastreio completo de datas
3. **Pesagens (P02)** — Sessoes em lote, GMD calculado automaticamente
4. **Suplemento (P03)** — Apontamento por lote, rateio automatico por cabeca ativa
5. **Medicamento (P04)** — Apontamento por lote, rateio + controle de carencia
6. **Saida (P01.3)** — Venda, transferencia, obito ou descarte, com calculo economico completo
7. **Estorno de saida (P01.4)** — Reversao para correcoes

### Regra critica de rateio

```
Custo por cabeca = Custo total do apontamento / Cabecas ativas no lote NA DATA do apontamento
```

- **Ativo na data D** = `pertinencia.dataInicio <= D AND (pertinencia.dataFim IS NULL OR pertinencia.dataFim > D)`
- Animais que sairam do lote no proprio dia D nao participam do rateio
- Implementado em: `src/lib/queries.ts → getAnimaisAtivosNoLoteNaData()`

### Calculo economico na saida

| Metrica | Formula |
|---|---|
| GMD | (pesoSaida - pesoEntrada) / diasNaRecria |
| Arrobas produzidas | (pesoSaida - pesoEntrada) / 15 |
| Custo por arroba | custoTotal / arrobas |
| Resultado liquido | valorVenda - custoTotal |

---

## Status do Projeto

### Funcionalidades implementadas

- [x] **Infraestrutura** — Schema completo (16 modelos), autenticacao (NextAuth + JWT), middleware de protecao de rotas
- [x] **Dashboard** — Painel com estatisticas (animais ativos, lotes, alertas de pesagem, carencias ativas)
- [x] **P01 — Entrada/Movimentacao/Saida** — Ciclo completo do animal incluindo estorno
- [x] **P02 — Pesagens** — Sessoes em lote com calculo de GMD e alertas (45+ dias sem pesagem)
- [x] **P03 — Suplemento** — Apontamento com rateio automatico de custo
- [x] **P04 — Medicamentos** — Apontamento com rateio + controle de carencia (bloqueia venda)
- [x] **Cadastros base** — Contratos, Lotes, Produtos (catalogo unificado), Usuarios
- [x] **Importacao/Exportacao** — Import em massa via Excel com validacao; export de animais, lotes e pesagens
- [x] **Autenticacao e autorizacao** — 3 perfis (Admin, Gestor, Operador) com controle de acesso
- [x] **Deploy** — Dockerfile multi-stage + docker-compose

### Pendente

- [ ] **Dashboard avancado** — Graficos, relatorios detalhados, indicadores de performance por lote/contrato
- [ ] **Relatorios** — Exportacao de relatorios economicos consolidados

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Banco de dados | PostgreSQL 14+ |
| ORM | Prisma 5.x |
| Autenticacao | NextAuth v4 (JWT + Credentials) |
| UI | shadcn/ui + TailwindCSS 3 |
| Formularios | React Hook Form + Zod |
| Exportacao | xlsx (Excel) |
| Deploy | Docker (multi-stage build) |

---

## Pre-requisitos

- **Node.js** >= 18
- **PostgreSQL** >= 14 (local ou via Docker)
- **npm** >= 9

---

## Setup rapido

### 1. Clone o repositorio

```bash
git clone https://github.com/SEU_USUARIO/recria-bovina.git
cd recria-bovina
```

### 2. Configure as variaveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` e preencha:

```env
DATABASE_URL="postgresql://postgres:SUASENHA@localhost:5432/recria_bovina?schema=public"
NEXTAUTH_SECRET="gere-com-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Setup automatico

```bash
npm run setup
```

Isso executa: `npm install` → `prisma generate` → `prisma db push` → `seed`

Ou passo a passo:

```bash
npm install
npm run db:generate   # Gerar Prisma Client
npm run db:push       # Criar tabelas
npm run db:seed       # Dados de exemplo
```

### 4. Inicie o servidor

```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

## PostgreSQL com Docker (opcional)

```bash
docker run --name recria-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=recria_bovina \
  -p 5432:5432 \
  -d postgres:16
```

Ou use o `docker-compose.yml` incluso:

```bash
docker-compose up -d
```

---

## Credenciais de acesso (seed)

| Usuario | E-mail | Senha | Perfil |
|---|---|---|---|
| Administrador | admin@fazenda.com | senha123 | Admin |
| Joao Gestor | joao@fazenda.com | senha123 | Gestor |
| Maria Operadora | maria@fazenda.com | senha123 | Operador |

### Perfis de acesso

| Perfil | Permissoes |
|---|---|
| **Admin** | Acesso total + gestao de usuarios |
| **Gestor** | Acesso operacional (dados, decisoes) |
| **Operador** | Entrada de dados apenas |

---

## Comandos uteis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de producao
npm start            # Servidor de producao
npm run db:studio    # Prisma Studio (visualizar dados)
npm run db:seed      # Repovoar banco com dados de exemplo
npm run db:reset     # Zerar e repovoar banco (CUIDADO em producao)
npm run db:migrate   # Criar migration (quando o schema mudar)
```

---

## Estrutura do projeto

```
recria-bovina/
├── prisma/
│   ├── schema.prisma         # Schema completo (16 modelos)
│   └── seed.ts               # Dados de exemplo
├── src/
│   ├── app/
│   │   ├── (dashboard)/      # Paginas autenticadas
│   │   │   ├── dashboard/    # Painel principal
│   │   │   ├── animais/      # P01 — Entrada/Movimentacao/Saida
│   │   │   ├── pesagens/     # P02 — Pesagens
│   │   │   ├── suplementos/  # P03 — Suplemento
│   │   │   ├── medicamentos/ # P04 — Medicamentos
│   │   │   ├── lotes/        # Gestao de lotes
│   │   │   ├── produtos/     # Catalogo de produtos
│   │   │   ├── contratos/    # Parcerias com fazendas
│   │   │   ├── usuarios/     # Gestao de usuarios (admin)
│   │   │   ├── importar/     # Importacao em massa (Excel)
│   │   │   └── exportar/     # Exportacao (Excel)
│   │   ├── api/              # 22 API Routes
│   │   └── login/            # Pagina de login
│   ├── components/
│   │   ├── ui/               # Componentes base (shadcn/ui)
│   │   └── layout/           # Sidebar, Header
│   ├── lib/
│   │   ├── auth.ts           # Configuracao NextAuth
│   │   ├── prisma.ts         # Singleton Prisma Client
│   │   ├── queries.ts        # Queries reutilizaveis (rateio, animais ativos)
│   │   ├── utils.ts          # Formatacao, calculos zootecnicos
│   │   ├── api.ts            # Wrappers tipados para chamadas API
│   │   └── validations/      # Schemas Zod compartilhados
│   ├── types/
│   │   └── index.ts          # Tipos TypeScript globais
│   └── middleware.ts         # Protecao de rotas autenticadas
├── Dockerfile                # Build multi-stage para producao
├── docker-compose.yml        # Dev (PostgreSQL) + producao
└── .env.example              # Template de variaveis de ambiente
```

---

## Modelo de dados

| Entidade | Descricao |
|---|---|
| `User` | Usuarios do sistema (Admin, Gestor, Operador) |
| `Contrato` | Parcerias com fazendas |
| `Lote` | Agrupamento de gestao |
| `Animal` | Unidade minima, identificado por brinco + RFID opcional |
| `PertinenciaLote` | Intervalo de datas definindo o lote atual de cada animal |
| `Movimentacao` | Audit log de movimentacoes e saidas |
| `Pesagem` | Historico individual de pesagens com GMD |
| `Produto` | Catalogo unificado (suplementos + medicamentos) |
| `ApontamentoSuplemento` | Consumo de suplemento no lote |
| `RateioSuplemento` | Linha de custo individual por animal |
| `ApontamentoMedicamento` | Consumo de medicamento no lote |
| `RateioMedicamento` | Linha de custo individual por animal |
| `CarenciaMedicamento` | Periodo de carencia (bloqueia venda) |
| `Saida` | Registro de baixa com snapshot economico |

---

## API Endpoints

| Grupo | Endpoints | Descricao |
|---|---|---|
| Animais | `GET/POST /api/animals`, `GET/PUT/DELETE /api/animals/[id]` | CRUD de animais |
| Movimentacao | `POST /api/animals/movimentar` | Transferencia entre lotes |
| Saida | `POST /api/animals/saida`, `POST /api/animals/estorno-saida` | Saida e estorno |
| Pesagens | `GET/POST /api/weighings` | Historico e sessoes em lote |
| Suplementos | `GET/POST /api/supplements` | Apontamentos de suplemento |
| Medicamentos | `GET/POST /api/medications` | Apontamentos de medicamento |
| Lotes | `GET/POST /api/lots`, `GET/PUT/DELETE /api/lots/[id]` | CRUD de lotes |
| Produtos | `GET/POST /api/products`, `GET/PUT/DELETE /api/products/[id]` | CRUD de produtos |
| Contratos | `GET/POST /api/contratos`, `GET/PUT/DELETE /api/contratos/[id]` | CRUD de contratos |
| Usuarios | `GET/POST /api/users`, `GET/PUT/DELETE /api/users/[id]` | Gestao de usuarios |
| Importacao | `POST /api/import` | Import em massa via Excel |
| Exportacao | `GET /api/export/animais`, `GET /api/export/lotes`, `GET /api/export/pesagens` | Export Excel |

---

## Licenca

Privado — uso interno.
