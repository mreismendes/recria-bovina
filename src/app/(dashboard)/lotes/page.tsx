import { prisma } from "@/lib/prisma";
import { LotesManager } from "./_components/lotes-manager";

export default async function LotesPage() {
  const [lotes, propriedades] = await Promise.all([
    prisma.lote.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      include: {
        propriedade: true,
        pertinencias: { where: { dataFim: null }, select: { id: true } },
      },
    }),
    prisma.propriedade.findMany({ where: { ativa: true }, orderBy: { nome: "asc" } }),
  ]);
  return <LotesManager initialLotes={lotes} propriedades={propriedades} />;
}
