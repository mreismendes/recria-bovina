/**
 * scripts/migrate-farms.js
 * Extracts unique farm data from existing contracts (contratos) that don't
 * have a linked Fazenda, creates Fazenda records, and links them back.
 * Runs at container startup — idempotent (safe to run multiple times).
 */
const { PrismaClient } = require("@prisma/client");

async function main() {
  const prisma = new PrismaClient();
  try {
    // Find all contracts without a linked fazenda
    const orphanContracts = await prisma.contrato.findMany({
      where: { fazendaId: null },
    });

    if (orphanContracts.length === 0) {
      console.log(">>> Fazendas: nenhum contrato sem fazenda vinculada. OK.");
      return;
    }

    console.log(
      `>>> Fazendas: ${orphanContracts.length} contrato(s) sem fazenda vinculada. Migrando...`
    );

    // Group contracts by normalized farm name to deduplicate
    const farmGroups = new Map();

    for (const contrato of orphanContracts) {
      const normalizedName = contrato.nomeFazenda
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (!farmGroups.has(normalizedName)) {
        farmGroups.set(normalizedName, []);
      }
      farmGroups.get(normalizedName).push(contrato);
    }

    let created = 0;
    let linked = 0;

    for (const [, contratos] of farmGroups.entries()) {
      const source = contratos[0];

      // Check if a fazenda with this name already exists
      const existing = await prisma.fazenda.findFirst({
        where: { nome: source.nomeFazenda },
      });

      let fazendaId;

      if (existing) {
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
      }

      // Link all contracts in this group to the fazenda
      for (const contrato of contratos) {
        await prisma.contrato.update({
          where: { id: contrato.id },
          data: { fazendaId },
        });
        linked++;
      }
    }

    console.log(
      `>>> Fazendas: migração concluída — ${created} criada(s), ${linked} contrato(s) vinculado(s).`
    );
  } catch (err) {
    console.error(">>> Erro na migração de fazendas:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
