import { prisma } from "@/lib/prisma";
import { ExportManager } from "./_components/export-manager";

export default async function ExportarPage() {
  const [lotes, propriedades] = await Promise.all([
    prisma.lote.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
    prisma.propriedade.findMany({
      where: { ativa: true },
      orderBy: { nome: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  return <ExportManager lotes={lotes} propriedades={propriedades} />;
}
