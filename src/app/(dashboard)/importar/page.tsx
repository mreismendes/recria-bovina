import { prisma } from "@/lib/prisma";
import { ImportManager } from "./_components/import-manager";

export default async function ImportarPage() {
  const [contratos, lotes, animais, pesagens] = await Promise.all([
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
    prisma.pesagem.findMany({
      select: {
        animal: { select: { brinco: true } },
        dataPesagem: true,
      },
    }),
  ]);

  const existingPesagemKeys = pesagens.map(
    (p) => `${p.animal.brinco.toLowerCase()}|${p.dataPesagem.toISOString().split("T")[0]}`
  );

  return (
    <ImportManager
      existingContratos={contratos.map((c) => c.idContrato)}
      existingLotes={lotes.map((l) => ({ nome: l.nome, contrato: l.contrato.idContrato }))}
      existingBrincos={animais.map((a) => a.brinco)}
      existingRfids={animais.filter((a) => a.rfid).map((a) => a.rfid!)}
      existingPesagemKeys={existingPesagemKeys}
    />
  );
}
