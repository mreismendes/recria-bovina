import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const loteId = searchParams.get("loteId");
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");

    const pesagens = await prisma.pesagem.findMany({
      where: {
        ...(dataInicio && { dataPesagem: { gte: new Date(dataInicio) } }),
        ...(dataFim && { dataPesagem: { lte: new Date(dataFim + "T23:59:59") } }),
        ...(dataInicio && dataFim && {
          dataPesagem: { gte: new Date(dataInicio), lte: new Date(dataFim + "T23:59:59") },
        }),
        ...(loteId && loteId !== "todos" && {
          animal: {
            pertinencias: { some: { loteId, OR: [{ dataFim: null }, { dataFim: { gt: new Date() } }] } },
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
