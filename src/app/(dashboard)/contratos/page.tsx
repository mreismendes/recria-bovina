import { prisma } from "@/lib/prisma";
import { ContratosManager } from "./_components/contratos-manager";

export default async function ContratosPage() {
  const contratos = await prisma.contrato.findMany({
    orderBy: { idContrato: "asc" },
    include: { _count: { select: { lotes: true } } },
  });

  return <ContratosManager initialData={contratos} />;
}
