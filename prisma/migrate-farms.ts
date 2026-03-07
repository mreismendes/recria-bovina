/**
 * Migration Script: Contratos → Cadastro de Fazendas
 *
 * Extracts unique farm data from existing contracts (contratos) that don't
 * have a linked Fazenda, creates Fazenda records, and links them back.
 *
 * Usage: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/migrate-farms.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateFarms() {
  console.log("🚜 Iniciando migração de fazendas...\n");

  // 1. Find all contracts without a linked fazenda
  const contratosOrfaos = await prisma.contrato.findMany({
    where: { fazendaId: null },
  });

  if (contratosOrfaos.length === 0) {
    console.log("✅ Nenhum contrato sem fazenda vinculada. Nada a migrar.");
    return;
  }

  console.log(
    `📋 Encontrados ${contratosOrfaos.length} contrato(s) sem fazenda vinculada.\n`
  );

  // 2. Group contracts by normalized farm name to deduplicate
  const farmGroups = new Map<
    string,
    typeof contratosOrfaos
  >();

  for (const contrato of contratosOrfaos) {
    const normalizedName = contrato.nomeFazenda
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, ""); // remove accents

    if (!farmGroups.has(normalizedName)) {
      farmGroups.set(normalizedName, []);
    }
    farmGroups.get(normalizedName)!.push(contrato);
  }

  console.log(
    `🏘️  ${farmGroups.size} fazenda(s) única(s) identificada(s).\n`
  );

  let created = 0;
  let linked = 0;

  const entries = Array.from(farmGroups.entries());
  for (const [normalizedName, contratos] of entries) {
    // Use the first contract's data as the source for the fazenda
    const source = contratos[0];

    // Check if a fazenda with this name already exists
    const existing = await prisma.fazenda.findFirst({
      where: { nome: source.nomeFazenda },
    });

    let fazendaId: string;

    if (existing) {
      console.log(
        `⏩ Fazenda "${source.nomeFazenda}" já existe (id: ${existing.id}). Reutilizando.`
      );
      fazendaId = existing.id;
    } else {
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
      fazendaId = fazenda.id;
      created++;
      console.log(
        `✅ Fazenda criada: "${fazenda.nome}" (id: ${fazenda.id})`
      );
    }

    // 3. Link all contracts in this group to the fazenda
    for (const contrato of contratos) {
      await prisma.contrato.update({
        where: { id: contrato.id },
        data: { fazendaId },
      });
      linked++;
      console.log(
        `   🔗 Contrato "${contrato.idContrato}" vinculado à fazenda.`
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
