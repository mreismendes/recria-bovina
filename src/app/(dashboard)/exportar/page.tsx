import { prisma } from "@/lib/prisma";
import { ExportManager } from "./_components/export-manager";

export default async function ExportarPage() {
  const [lotes, contratos, grupos] = await Promise.all([
    prisma.lote.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
    prisma.contrato.findMany({
      where: { ativo: true },
      orderBy: { idContrato: "asc" },
      select: { id: true, idContrato: true, nomeFazenda: true },
    }),
    prisma.grupoContrato.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  return <ExportManager lotes={lotes} contratos={contratos} grupos={grupos} />;
}
