import { prisma } from "@/lib/prisma";
import { ImportManager } from "./_components/import-manager";

export default async function ImportarPage() {
  // Load existing data for client-side duplicate checking
  const [propriedades, lotes, animais] = await Promise.all([
    prisma.propriedade.findMany({
      where: { ativa: true },
      select: { nome: true },
    }),
    prisma.lote.findMany({
      where: { ativo: true },
      include: { propriedade: { select: { nome: true } } },
    }),
    prisma.animal.findMany({
      select: { brinco: true, rfid: true },
    }),
  ]);

  return (
    <ImportManager
      existingProps={propriedades.map((p) => p.nome)}
      existingLotes={lotes.map((l) => ({ nome: l.nome, propriedade: l.propriedade.nome }))}
      existingBrincos={animais.map((a) => a.brinco)}
      existingRfids={animais.filter((a) => a.rfid).map((a) => a.rfid!)}
    />
  );
}
