import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  await prisma.carenciaMedicamento.deleteMany();
  await prisma.rateioMedicamento.deleteMany();
  await prisma.rateioSuplemento.deleteMany();
  await prisma.apontamentoMedicamento.deleteMany();
  await prisma.apontamentoSuplemento.deleteMany();
  await prisma.saida.deleteMany();
  await prisma.pesagem.deleteMany();
  await prisma.movimentacao.deleteMany();
  await prisma.pertinenciaLote.deleteMany();
  await prisma.animal.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.lote.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.user.deleteMany();

  const senhaHash = await bcrypt.hash("senha123", 10);
  await prisma.user.createMany({
    data: [
      { name: "Administrador", email: "admin@fazenda.com", password: senhaHash, role: "ADMIN" },
      { name: "João Gestor", email: "joao@fazenda.com", password: senhaHash, role: "GESTOR" },
      { name: "Maria Operadora", email: "maria@fazenda.com", password: senhaHash, role: "OPERADOR" },
    ],
  });
  console.log("✅ Usuários criados");

  const contrato = await prisma.contrato.create({
    data: {
      idContrato: "RCA-2025-001",
      nomeFazenda: "Fazenda Santa Fé",
      observacoes: "Parceria agrosilvopastoral — Uberaba/MG",
    },
  });
  console.log("✅ Contrato criado");

  const loteA = await prisma.lote.create({
    data: { nome: "Lote A — Garrotes Nelore", descricao: "Nelore PO, compra outubro/2025, 230-270 kg", contratoId: contrato.id },
  });
  const loteB = await prisma.lote.create({
    data: { nome: "Lote B — Garrotes Cruzados", descricao: "Nelore x Angus, compra novembro/2025, 210-250 kg", contratoId: contrato.id },
  });
  await prisma.lote.create({
    data: { nome: "Lote Q — Quarentena", descricao: "Lote transitório para novos ingressos", contratoId: contrato.id },
  });
  console.log("✅ Lotes criados");

  console.log("\n🐄 Seed concluído!");
  console.log("🔑 Acesso: admin@fazenda.com / senha123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
