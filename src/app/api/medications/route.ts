/**
 * POST /api/medications — Registra apontamento de medicamento (P04)
 * GET  /api/medications  — Lista apontamentos
 * Implementação completa: Etapa 6
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apontamentoMedicamentoSchema } from "@/lib/validations";
import { getAnimaisAtivosNoLoteNaData } from "@/lib/queries";
import { addDays } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = apontamentoMedicamentoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const dataApontamentoDate = new Date(data.dataApontamento);
    const dataFimCarencia = addDays(dataApontamentoDate, data.carenciaDias);

    const animaisAtivos = await getAnimaisAtivosNoLoteNaData(data.loteId, dataApontamentoDate);

    if (animaisAtivos.length === 0) {
      return NextResponse.json(
        { success: false, error: "Nenhum animal ativo no lote na data informada." },
        { status: 422 }
      );
    }

    const custoPerCapita = data.custoTotal / animaisAtivos.length;

    const apontamento = await prisma.$transaction(async (tx) => {
      const apt = await tx.apontamentoMedicamento.create({
        data: {
          loteId: data.loteId,
          produtoId: data.produtoId,
          dataApontamento: dataApontamentoDate,
          doseTotalAplicada: data.doseTotalAplicada,
          unidadeDose: data.unidadeDose,
          custoTotal: data.custoTotal,
          loteProduto: data.loteProduto,
          validade: data.validade ? new Date(data.validade) : null,
          carenciaDias: data.carenciaDias,
          cabecasAtivas: animaisAtivos.length,
          custoPerCapita,
          responsavelTecnico: data.responsavelTecnico,
          crmv: data.crmv,
          observacoes: data.observacoes,
        },
      });

      // Rateio de custo + carência individual
      for (const animal of animaisAtivos) {
        await tx.rateioMedicamento.create({
          data: { apontamentoId: apt.id, animalId: animal.id, valorRateio: custoPerCapita },
        });

        if (data.carenciaDias > 0) {
          await tx.carenciaMedicamento.create({
            data: {
              animalId: animal.id,
              apontamentoId: apt.id,
              dataInicio: dataApontamentoDate,
              dataFim: dataFimCarencia,
              ativa: dataFimCarencia > new Date(),
            },
          });
        }
      }

      return apt;
    });

    return NextResponse.json({
      success: true,
      data: apontamento,
      preview: { cabecasAtivas: animaisAtivos.length, custoPerCapita, dataFimCarencia },
    }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao registrar apontamento" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const apontamentos = await prisma.apontamentoMedicamento.findMany({
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
