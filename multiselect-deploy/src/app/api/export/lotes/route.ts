import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propIds = searchParams.get("propriedadeIds")?.split(",").filter(Boolean) ?? [];
    const statuses = searchParams.get("status")?.split(",").filter(Boolean) ?? [];

    const ativoFilter: boolean | undefined =
      statuses.length === 1 && statuses[0] === "ATIVO" ? true :
      statuses.length === 1 && statuses[0] === "INATIVO" ? false :
      undefined;

    const lotes = await prisma.lote.findMany({
      where: {
        ...(ativoFilter !== undefined && { ativo: ativoFilter }),
        ...(propIds.length > 0 && { propriedadeId: { in: propIds } }),
      },
      include: {
        propriedade: { select: { nome: true } },
        pertinencias: { where: { dataFim: null }, select: { id: true } },
      },
      orderBy: { nome: "asc" },
    });

    const rows = lotes.map((l) => ({
      nome: l.nome,
      propriedade: l.propriedade.nome,
      cabecasAtivas: l.pertinencias.length,
      ativo: l.ativo ? "Sim" : "Não",
      descricao: l.descricao ?? "",
      criadoEm: l.createdAt.toISOString().split("T")[0],
    }));

    return NextResponse.json({ success: true, data: rows, total: rows.length });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao buscar lotes" }, { status: 500 });
  }
}
