/**
 * Migration Script: Contratos → Cadastro de Fazendas
 *
 * Extracts farm data from contracts (contratos), creates Fazenda records
 * using a composite key (nome + proprietario + cidade) for deduplication,
 * and links contracts to their corresponding fazenda.
 *
 * On each run it resets all fazenda links and re-creates them from scratch
 * to ensure correctness (farms with the same name but different owners/cities
 * are treated as distinct).
 *
 * Usage: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/migrate-farms.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function normalizeStr(str: string | null | undefined): string {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function compositeKey(contrato: {
  nomeFazenda: string;
  proprietario: string | null;
  cidade: string | null;
}): string {
  return [
    normalizeStr(contrato.nomeFazenda),
    normalizeStr(contrato.proprietario),
    normalizeStr(contrato.cidade),
  ].join("|");
}

async function migrateFarms() {
  console.log("🚜 Iniciando migração de fazendas...\n");

  // 1. Reset: unlink all contracts and delete all fazendas
  const allContracts = await prisma.contrato.findMany();
  const linkedCount = allContracts.filter((c) => c.fazendaId).length;

  if (linkedCount > 0) {
    await prisma.contrato.updateMany({
      where: { fazendaId: { not: null } },
      data: { fazendaId: null },
    });
    console.log(`🔄 ${linkedCount} contrato(s) desvinculado(s).`);
  }

  const deletedFazendas = await prisma.fazenda.deleteMany();
  if (deletedFazendas.count > 0) {
    console.log(
      `🗑️  ${deletedFazendas.count} fazenda(s) antiga(s) removida(s).`
    );
  }

  // 2. Group contracts by composite key (nome + proprietario + cidade)
  const contracts = await prisma.contrato.findMany();

  if (contracts.length === 0) {
    console.log("✅ Nenhum contrato encontrado. Nada a migrar.");
    return;
  }

  console.log(`📋 ${contracts.length} contrato(s) encontrado(s).\n`);

  const farmGroups = new Map<string, typeof contracts>();

  for (const contrato of contracts) {
    const key = compositeKey(contrato);
    if (!farmGroups.has(key)) {
      farmGroups.set(key, []);
    }
    farmGroups.get(key)!.push(contrato);
  }

  console.log(
    `🏘️  ${farmGroups.size} fazenda(s) única(s) identificada(s) (por nome+proprietário+cidade).\n`
  );

  let created = 0;
  let linked = 0;

  for (const [, contratos] of Array.from(farmGroups.entries())) {
    const source = contratos[0];

    const fazenda = await prisma.fazenda.create({
      data: {
        nome: source.nomeFazenda,
        proprietario: source.proprietario,
        comunidade: source.comunidade,
        cidade: source.cidade,
        estado: source.estado,
        areaHectares: source.areaHectares,
        observacoes: source.observacoes,
      },
    });
    created++;
    console.log(
      `✅ Fazenda criada: "${fazenda.nome}" — ${source.proprietario || "sem proprietário"}, ${source.cidade || "sem cidade"} (id: ${fazenda.id})`
    );

    for (const contrato of contratos) {
      await prisma.contrato.update({
        where: { id: contrato.id },
        data: { fazendaId: fazenda.id },
      });
      linked++;
      console.log(
        `   🔗 Contrato "${contrato.idContrato}" vinculado.`
      );
    }
  }

  console.log(`\n🎉 Migração concluída!`);
  console.log(`   Fazendas criadas: ${created}`);
  console.log(`   Contratos vinculados: ${linked}`);
}

migrateFarms()
  .catch((e) => {
    console.error("❌ Erro na migração:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
