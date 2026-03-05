import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const propriedadeId = searchParams.get("propriedadeId");
    const status = searchParams.get("status");

    const lotes = await prisma.lote.findMany({
      where: {
        ...(status === "ATIVO" && { ativo: true }),
        ...(status === "INATIVO" && { ativo: false }),
        ...(propriedadeId && propriedadeId !== "todas" && { propriedadeId }),
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
