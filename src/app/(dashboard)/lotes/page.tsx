import { prisma } from "@/lib/prisma";
import { LotesManager } from "./_components/lotes-manager";

export default async function LotesPage() {
  const [lotes, contratos] = await Promise.all([
    prisma.lote.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      include: {
        contrato: { include: { grupoContrato: { select: { id: true, nome: true } } } },
        pertinencias: { where: { dataFim: null }, select: { id: true } },
      },
    }),
    prisma.contrato.findMany({ where: { ativo: true }, orderBy: { idContrato: "asc" } }),
  ]);
  return <LotesManager initialLotes={lotes} contratos={contratos} />;
}
