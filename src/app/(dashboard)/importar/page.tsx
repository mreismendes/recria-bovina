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

  // Pass both idContrato and nomeFazenda so import resolves either
  const contratoIdentifiers = contratos.flatMap((c) => [c.idContrato, c.nomeFazenda]);

  // Lotes must be findable by both contract ID and farm name
  const loteEntries = lotes.flatMap((l) => [
    { nome: l.nome, contrato: l.contrato.idContrato },
    { nome: l.nome, contrato: l.contrato.nomeFazenda },
  ]);

  return (
    <ImportManager
      existingContratos={contratoIdentifiers}
      existingLotes={loteEntries}
      existingBrincos={animais.map((a) => a.brinco)}
      existingRfids={animais.filter((a) => a.rfid).map((a) => a.rfid!)}
      existingPesagemKeys={pesagemKeys.map((r) => r.key)}
    />
  );
}
