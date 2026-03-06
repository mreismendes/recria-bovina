import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contratoIds = searchParams.get("contratoIds")?.split(",").filter(Boolean) ?? [];
    const grupoContratoIds = searchParams.get("grupoContratoIds")?.split(",").filter(Boolean) ?? [];
    const statuses = searchParams.get("status")?.split(",").filter(Boolean) ?? [];

    const ativoFilter: boolean | undefined =
      statuses.length === 1 && statuses[0] === "ATIVO" ? true :
      statuses.length === 1 && statuses[0] === "INATIVO" ? false :
      undefined;

    const lotes = await prisma.lote.findMany({
      where: {
        ...(ativoFilter !== undefined && { ativo: ativoFilter }),
        ...(contratoIds.length > 0 && { contratoId: { in: contratoIds } }),
        ...(grupoContratoIds.length > 0 && { grupoContratoId: { in: grupoContratoIds } }),
      },
      include: {
        contrato: { select: { nomeFazenda: true } },
        grupoContrato: { select: { nome: true } },
        pertinencias: { where: { dataFim: null }, select: { id: true } },
      },
      orderBy: { nome: "asc" },
    });

    const rows = lotes.map((l) => ({
      nome: l.nome,
      fazenda: l.contrato?.nomeFazenda ?? "",
      grupo: l.grupoContrato?.nome ?? "",
      cabecasAtivas: l.pertinencias.length,
      ativo: l.ativo ? "Sim" : "Não",
      descricao: l.descricao ?? "",
      criadoEm: format(l.createdAt, "yyyy-MM-dd"),
    }));

    return NextResponse.json({ success: true, data: rows, total: rows.length });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao buscar lotes" }, { status: 500 });
  }
}
