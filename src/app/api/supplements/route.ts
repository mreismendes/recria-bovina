/**
 * POST /api/supplements — Registra apontamento de suplemento (P03)
 * GET  /api/supplements  — Lista apontamentos
 * Implementação completa: Etapa 5
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apontamentoSuplementoSchema } from "@/lib/validations";
import { getAnimaisAtivosNoLoteNaData } from "@/lib/queries";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = apontamentoSuplementoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const dataApontamentoDate = new Date(data.dataApontamento);

    // Calcular cabeças ativas na data do apontamento (denominador do rateio)
    const animaisAtivos = await getAnimaisAtivosNoLoteNaData(data.loteId, dataApontamentoDate);

    if (animaisAtivos.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum animal ativo no lote na data informada. Rateio impossível." },
        { status: 422 }
      );
    }

    const custoPerCapita = data.custoTotal / animaisAtivos.length;

    // Transação: apontamento + rateios individuais (atômica)
    const apontamento = await prisma.$transaction(async (tx) => {
      const apt = await tx.apontamentoSuplemento.create({
        data: {
          loteId: data.loteId,
          produtoId: data.produtoId,
          dataApontamento: dataApontamentoDate,
          quantidadeTotal: data.quantidadeTotal,
          custoTotal: data.custoTotal,
          modoFornecimento: data.modoFornecimento,
          cabecasAtivas: animaisAtivos.length,
          custoPerCapita,
          observacoes: data.observacoes,
        },
      });

      await tx.rateioSuplemento.createMany({
        data: animaisAtivos.map((a) => ({
          apontamentoId: apt.id,
          animalId: a.id,
          valorRateio: custoPerCapita,
        })),
      });

      return apt;
    });

    return NextResponse.json({
      success: true,
      data: apontamento,
      preview: { cabecasAtivas: animaisAtivos.length, custoPerCapita },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao registrar apontamento" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const apontamentos = await prisma.apontamentoSuplemento.findMany({
      where: { estornado: false },
      include: { lote: true, produto: true },
      orderBy: { dataApontamento: "desc" },
      take: 50,
    });
    return NextResponse.json({ success: true, data: apontamentos });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao buscar apontamentos" }, { status: 500 });
  }
}
