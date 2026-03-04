import { prisma } from "@/lib/prisma";
import { PropriedadesManager } from "./_components/propriedades-manager";

export default async function PropriedadesPage() {
  const propriedades = await prisma.propriedade.findMany({
    orderBy: { nome: "asc" },
    include: { _count: { select: { lotes: true } } },
  });

  return <PropriedadesManager initialData={propriedades} />;
}
