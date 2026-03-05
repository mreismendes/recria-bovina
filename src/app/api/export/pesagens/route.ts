import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseLocalDate } from "@/lib/utils";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const loteIds = searchParams.get("loteIds")?.split(",").filter(Boolean) ?? [];
    const dataInicio = searchParams.get("dataInicio");
    const dataFim = searchParams.get("dataFim");

    const dateFilter: Record<string, Date> = {};
    if (dataInicio) dateFilter.gte = parseLocalDate(dataInicio);
    if (dataFim) {
      // End of day: parse as local date then set to end of day
      const fim = parseLocalDate(dataFim);
      fim.setUTCHours(23, 59, 59, 999);
      dateFilter.lte = fim;
    }

    // When filtering by lot, find weighings where animal belonged to the lot
    // on the weighing date (event-time), not current membership
    let pesagens;

    if (loteIds.length > 0) {
      const allPesagens = await prisma.pesagem.findMany({
        where: {
          ...(Object.keys(dateFilter).length > 0 && { dataPesagem: dateFilter }),
          animal: {
            pertinencias: {
              some: { loteId: { in: loteIds } },
            },
          },
        },
        include: {
          animal: {
            select: {
              brinco: true,
              nome: true,
              pertinencias: {
                where: { loteId: { in: loteIds } },
                select: { loteId: true, dataInicio: true, dataFim: true },
              },
            },
          },
        },
        orderBy: [{ dataPesagem: "desc" }, { animal: { brinco: "asc" } }],
        take: 10000,
      });

      pesagens = allPesagens.filter((p) =>
        p.animal.pertinencias.some((pert) => {
          const afterStart = p.dataPesagem >= pert.dataInicio;
          const beforeEnd = !pert.dataFim || p.dataPesagem < pert.dataFim;
          return afterStart && beforeEnd;
        })
      ).slice(0, 5000);
    } else {
      pesagens = await prisma.pesagem.findMany({
        where: {
          ...(Object.keys(dateFilter).length > 0 && { dataPesagem: dateFilter }),
        },
        include: {
          animal: { select: { brinco: true, nome: true } },
        },
        orderBy: [{ dataPesagem: "desc" }, { animal: { brinco: "asc" } }],
        take: 5000,
      });
    }

    const rows = pesagens.map((p) => ({
      brinco: p.animal.brinco,
      nome: p.animal.nome ?? "",
      dataPesagem: format(p.dataPesagem, "yyyy-MM-dd"),
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
