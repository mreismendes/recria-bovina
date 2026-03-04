import { prisma } from "@/lib/prisma";
import { AnimaisManager } from "./_components/animais-manager";

export default async function AnimaisPage() {
  const [animais, lotes] = await Promise.all([
    prisma.animal.findMany({
      where: { status: "ATIVO" },
      orderBy: { brinco: "asc" },
      include: {
        pertinencias: {
          where: { dataFim: null },
          include: { lote: true },
        },
        pesagens: {
          orderBy: { dataPesagem: "desc" },
          take: 1,
        },
      },
    }),
    prisma.lote.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      include: { propriedade: { select: { nome: true } } },
    }),
  ]);
  return <AnimaisManager initialAnimais={animais} lotes={lotes} />;
}
