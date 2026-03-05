/**
 * POST /api/animals/movimentar — P01.2: Movimentação interna entre lotes
 *
 * Para cada animal selecionado:
 *   1. Fecha a pertinência atual (dataFim = dataMovimentacao)
 *   2. Cria nova pertinência no lote de destino
 *   3. Grava 2 movimentações (SAIDA_LOTE + ENTRADA_LOTE)
 *
 * Tudo em transação atômica.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { movimentacaoSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = movimentacaoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { animalIds, loteDestinoId, dataMovimentacao, motivo, observacoes } = parsed.data;
    const dataDate = new Date(dataMovimentacao);

    // Validar que o lote destino existe e está ativo
    const loteDestino = await prisma.lote.findUnique({ where: { id: loteDestinoId } });
    if (!loteDestino || !loteDestino.ativo) {
      return NextResponse.json({ success: false, error: "Lote de destino não encontrado ou inativo" }, { status: 400 });
    }

    const resultados = await prisma.$transaction(async (tx) => {
      const movidos = [];

      for (const animalId of animalIds) {
        // Verificar que o animal existe e está ativo
        const animal = await tx.animal.findUnique({ where: { id: animalId } });
        if (!animal || animal.status !== "ATIVO") continue;

        // Buscar pertinência atual (dataFim = null)
        const pertinenciaAtual = await tx.pertinenciaLote.findFirst({
          where: { animalId, dataFim: null },
        });

        // Não mover se já está no lote destino
        if (pertinenciaAtual?.loteId === loteDestinoId) continue;

        // 1. Fechar pertinência atual
        if (pertinenciaAtual) {
          await tx.pertinenciaLote.update({
            where: { id: pertinenciaAtual.id },
            data: { dataFim: dataDate },
          });

          // Movimentação: saída do lote de origem
          await tx.movimentacao.create({
            data: {
              animalId,
              loteOrigemId: pertinenciaAtual.loteId,
              loteDestinoId,
              dataMovimentacao: dataDate,
              tipo: "SAIDA_LOTE",
              motivo,
              observacoes,
            },
          });
        }

        // 2. Criar nova pertinência
        await tx.pertinenciaLote.create({
          data: { animalId, loteId: loteDestinoId, dataInicio: dataDate },
        });

        // 3. Movimentação: entrada no lote de destino
        await tx.movimentacao.create({
          data: {
            animalId,
            loteOrigemId: pertinenciaAtual?.loteId ?? null,
            loteDestinoId,
            dataMovimentacao: dataDate,
            tipo: "ENTRADA_LOTE",
            motivo,
            observacoes,
          },
        });

        movidos.push({ animalId, brinco: animal.brinco });
      }

      return movidos;
    });

    return NextResponse.json({
      success: true,
      data: { movidos: resultados, total: resultados.length },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Erro ao processar movimentação" },
      { status: 500 }
    );
  }
}
