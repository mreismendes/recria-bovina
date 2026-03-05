import { prisma } from "@/lib/prisma";
import { ImportManager } from "./_components/import-manager";

export default async function ImportarPage() {
  const [propriedades, lotes, animais, pesagens] = await Promise.all([
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
    prisma.pesagem.findMany({
      select: {
        animal: { select: { brinco: true } },
        dataPesagem: true,
      },
    }),
  ]);

  // Pre-compute "brinco|YYYY-MM-DD" keys for RN-02 duplicate detection
  const existingPesagemKeys = pesagens.map(
    (p) => `${p.animal.brinco.toLowerCase()}|${p.dataPesagem.toISOString().split("T")[0]}`
  );

  return (
    <ImportManager
      existingProps={propriedades.map((p) => p.nome)}
      existingLotes={lotes.map((l) => ({ nome: l.nome, propriedade: l.propriedade.nome }))}
      existingBrincos={animais.map((a) => a.brinco)}
      existingRfids={animais.filter((a) => a.rfid).map((a) => a.rfid!)}
      existingPesagemKeys={existingPesagemKeys}
    />
  );
}
