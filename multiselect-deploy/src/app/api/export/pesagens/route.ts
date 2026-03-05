import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const loteIds = searchParams.get("loteIds")?.split(",").filter(Boolean) ?? [];
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");

    const dateFilter: Record<string, Date> = {};
    if (dataInicio) dateFilter.gte = new Date(dataInicio);
    if (dataFim) dateFilter.lte = new Date(dataFim + "T23:59:59");

    const pesagens = await prisma.pesagem.findMany({
      where: {
        ...(Object.keys(dateFilter).length > 0 && { dataPesagem: dateFilter }),
        ...(loteIds.length > 0 && {
          animal: {
            pertinencias: {
              some: { loteId: { in: loteIds }, OR: [{ dataFim: null }, { dataFim: { gt: new Date() } }] },
            },
          },
        }),
      },
      include: {
        animal: { select: { brinco: true, nome: true } },
      },
      orderBy: [{ dataPesagem: "desc" }, { animal: { brinco: "asc" } }],
      take: 5000,
    });

    const rows = pesagens.map((p) => ({
      brinco: p.animal.brinco,
      nome: p.animal.nome ?? "",
      dataPesagem: p.dataPesagem.toISOString().split("T")[0],
      pesoKg: p.pesoKg,
      tipo: { ENTRADA: "Entrada", PERIODICA: "Periódica", SAIDA: "Saída" }[p.tipo] ?? p.tipo,
      gmdPeriodo: p.gmdPeriodo,
      diasPeriodo: p.diasPeriodo,
      jejumHoras: p.jejumHoras,
      responsavel: p.responsavel ?? "",
      observacoes: p.observacoes ?? "",
    }));

    return NextResponse.json({ success: true, data: rows, total: rows.length });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao buscar pesagens" }, { status: 500 });
  }
}
