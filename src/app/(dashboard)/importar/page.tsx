import { prisma } from "@/lib/prisma";
import { ImportManager } from "./_components/import-manager";

export default async function ImportarPage() {
  const [contratos, lotes, animais, pesagemKeys] = await Promise.all([
    prisma.contrato.findMany({
      where: { ativo: true },
      orderBy: { idContrato: "asc" },
      select: { idContrato: true, nomeFazenda: true },
    }),
    prisma.lote.findMany({
      where: { ativo: true },
      include: { contrato: { select: { idContrato: true, nomeFazenda: true } } },
    }),
    prisma.animal.findMany({ select: { brinco: true, rfid: true } }),
    // Build pesagem duplicate-check keys efficiently at DB level
    prisma.$queryRaw<{ key: string }[]>`
      SELECT LOWER(a.brinco) || '|' || TO_CHAR(p."dataPesagem", 'YYYY-MM-DD') AS key
      FROM pesagens p
      JOIN animais a ON a.id = p."animalId"
    `,
  ]);

  return (
    <ImportManager
      existingContratos={contratos.map((c) => c.idContrato)}
      existingLotes={lotes.map((l) => ({ nome: l.nome, contrato: l.contrato.idContrato }))}
      existingBrincos={animais.map((a) => a.brinco)}
      existingRfids={animais.filter((a) => a.rfid).map((a) => a.rfid!)}
      existingPesagemKeys={pesagemKeys.map((r) => r.key)}
    />
  );
}
