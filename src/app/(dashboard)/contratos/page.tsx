import { prisma } from "@/lib/prisma";
import { ContratosManager } from "./_components/contratos-manager";

export default async function ContratosPage() {
  const [contratos, grupos, fazendas] = await Promise.all([
    prisma.contrato.findMany({
      orderBy: { idContrato: "asc" },
      include: {
        _count: { select: { lotes: true } },
        grupoContrato: { select: { id: true, nome: true } },
        fazenda: { select: { id: true, nome: true } },
      },
    }),
    prisma.grupoContrato.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.fazenda.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true, proprietario: true, comunidade: true, cidade: true, estado: true, areaHectares: true },
    }),
  ]);

  return <ContratosManager initialData={contratos} grupos={grupos} fazendas={fazendas} />;
}
