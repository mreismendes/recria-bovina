import { prisma } from "@/lib/prisma";
import { FazendasManager } from "./_components/fazendas-manager";

export default async function FazendasPage() {
  const fazendas = await prisma.fazenda.findMany({
    orderBy: { nome: "asc" },
    include: {
      _count: { select: { contratos: true } },
    },
  });

  return <FazendasManager initialData={fazendas} />;
}
