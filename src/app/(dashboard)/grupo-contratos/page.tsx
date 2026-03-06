import { prisma } from "@/lib/prisma";
import { GrupoContratosManager } from "./_components/grupo-contratos-manager";

export default async function GrupoContratosPage() {
  const [grupos, contratos] = await Promise.all([
    prisma.grupoContrato.findMany({
      orderBy: { nome: "asc" },
      include: {
        _count: { select: { contratos: true, lotes: true } },
        contratos: {
          where: { ativo: true },
          orderBy: { idContrato: "asc" },
          select: { id: true, idContrato: true, nomeFazenda: true },
        },
        lotes: {
          where: { ativo: true },
          orderBy: { nome: "asc" },
          select: { id: true, nome: true },
        },
      },
    }),
    prisma.contrato.findMany({
      where: { ativo: true },
      orderBy: { idContrato: "asc" },
      select: { id: true, idContrato: true, nomeFazenda: true, grupoContratoId: true },
    }),
  ]);

  return <GrupoContratosManager initialData={grupos} contratos={contratos} />;
}
