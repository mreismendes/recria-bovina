# 🐄 Gestão de Rebanho Bovino — Recria Individual

Sistema web para gestão individual de rebanho bovino em fase de recria.

> **Etapa atual: 1 — Fundação do projeto**
> Schema do banco de dados, estrutura de pastas, utilitários e seed de dados.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| ORM | Prisma |
| Banco de dados | PostgreSQL |
| UI | shadcn/ui + TailwindCSS |
| Validação | Zod |
| Linguagem | TypeScript |

---

## Pré-requisitos

- **Node.js** >= 18
- **PostgreSQL** >= 14 (local ou via Docker)
- **npm** >= 9

---

## Setup rápido

### 1. Clone o repositório

```bash
git clone https://github.com/SEU_USUARIO/recria-bovina.git
cd recria-bovina
```

### 2. Configure as variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` e preencha a `DATABASE_URL` com os dados do seu PostgreSQL:

```env
DATABASE_URL="postgresql://postgres:SUASENHA@localhost:5432/recria_bovina?schema=public"
NEXTAUTH_SECRET="gere-com-openssl-rand-base64-32"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. Instale as dependências

```bash
npm install
```

### 4. Crie o banco e execute o seed

```bash
# Gerar o Prisma Client
npm run db:generate

# Criar as tabelas no banco
npm run db:push

# Popular com dados de exemplo
npm run db:seed
```

Ou tudo de uma vez:
```bash
npm run setup
```

### 5. Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

## PostgreSQL com Docker (opcional)

Se não tiver PostgreSQL instalado, suba com Docker:

```bash
docker run --name recria-pg \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=recria_bovina \
  -p 5432:5432 \
  -d postgres:16

# Aguardar ~5 segundos e prosseguir com o setup
```

---

## Credenciais de acesso (seed)

| Usuário | E-mail | Senha | Perfil |
|---|---|---|---|
| Administrador | admin@fazenda.com | senha123 | Admin |
| João Gestor | joao@fazenda.com | senha123 | Gestor |
| Maria Operadora | maria@fazenda.com | senha123 | Operador |

---

## Comandos úteis

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build de produção
npm run db:studio    # Prisma Studio (visualizar dados)
npm run db:seed      # Repovoar banco com dados de exemplo
npm run db:reset     # Zerar e repovoar banco (CUIDADO em produção)
npm run db:migrate   # Criar migration (quando o schema mudar)
```

---

## Estrutura do projeto

```
recria-bovina/
├── prisma/
│   ├── schema.prisma      # Schema completo do banco de dados
│   └── seed.ts            # Dados de exemplo
├── src/
│   ├── app/
│   │   ├── (dashboard)/   # Páginas autenticadas
│   │   │   ├── dashboard/ # Painel principal
│   │   │   ├── animais/   # P01 — Entrada/Movimentação/Saída (Etapa 3)
│   │   │   ├── lotes/     # CRUD de lotes (Etapa 2)
│   │   │   ├── pesagens/  # P02 — Pesagens (Etapa 4)
│   │   │   ├── suplementos/ # P03 — Suplemento (Etapa 5)
│   │   │   ├── medicamentos/ # P04 — Medicamentos (Etapa 6)
│   │   │   └── produtos/  # Catálogo de produtos (Etapa 2)
│   │   └── api/           # API Routes (Next.js)
│   ├── components/
│   │   ├── ui/            # Componentes base (shadcn/ui)
│   │   └── layout/        # Sidebar, Header
│   ├── lib/
│   │   ├── prisma.ts      # Singleton Prisma Client
│   │   ├── queries.ts     # Queries reutilizáveis (incluindo lógica de rateio)
│   │   ├── utils.ts       # Funções utilitárias e cálculos zootécnicos
│   │   └── validations/   # Schemas Zod compartilhados
│   └── types/
│       └── index.ts       # Tipos TypeScript globais
└── .env.example
```

---

## Modelo de dados — entidades principais

| Entidade | Descrição |
|---|---|
| `Animal` | Unidade mínima. Identificado por brinco (obrigatório) e RFID (opcional) |
| `Lote` | Agrupamento de gestão. Um animal pertence a **exatamente um** lote por vez |
| `PertinenciaLote` | Intervalo de datas que define o lote atual de cada animal |
| `Pesagem` | Histórico individual de pesagens com GMD calculado |
| `ApontamentoSuplemento` | Consumo de suplemento ao nível do lote |
| `RateioSuplemento` | Linha de custo individual gerada por cada apontamento |
| `ApontamentoMedicamento` | Consumo de medicamento ao nível do lote |
| `RateioMedicamento` | Linha de custo individual gerada por cada apontamento |
| `CarenciaMedicamento` | Período de carência por animal por medicamento |
| `Saida` | Registro de baixa com snapshot econômico final |

---

## Regra crítica de rateio

```
Custo por cabeça = Custo total do apontamento ÷ Cabeças ativas no lote NA DATA do apontamento
```

- **Ativo na data D** = `pertinencia.dataInicio <= D AND (pertinencia.dataFim IS NULL OR pertinencia.dataFim > D)`
- Animais que saíram do lote no próprio dia **D** não participam do rateio

Implementado em: `src/lib/queries.ts → getAnimaisAtivosNoLoteNaData()`

---

## Roadmap

- [x] **Etapa 1** — Fundação (schema, estrutura, seed)
- [ ] **Etapa 2** — CRUD de cadastros base (propriedades, lotes, produtos, animais)
- [ ] **Etapa 3** — P01: Entrada / Movimentação / Saída
- [ ] **Etapa 4** — P02: Controle de Pesagens
- [ ] **Etapa 5** — P03: Consumo de Suplemento
- [ ] **Etapa 6** — P04: Consumo de Medicamentos
- [ ] **Etapa 7** — Dashboard e Relatórios
- [ ] **Etapa 8** — Autenticação e Deploy

---

## Licença

Privado — uso interno.
