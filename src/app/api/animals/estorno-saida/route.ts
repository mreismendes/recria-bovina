/**
 * POST /api/animals/estorno-saida — Estorno de saída
 *
 * Reverte a baixa de um animal:
 *   1. Marca saida.estornada = true
 *   2. Reabre a última pertinência (dataFim = null)
 *   3. Seta animal.status = ATIVO
 *   4. Grava movimentação ESTORNO_SAIDA
 *
 * After estorno, the animal can receive a new saída because the old one
 * is marked estornada=true and the saída route only blocks on non-estornada records.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const estornoSchema = z.object({
  animalId: z.string().min(1, "Animal é obrigatório"),
  motivo: z.string().max(500).optional().nullable(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = estornoSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { animalId, motivo } = parsed.data;

    const resultado = await prisma.$transaction(async (tx) => {
      // Verificar animal e buscar saída ativa (não estornada)
      const animal = await tx.animal.findUnique({
        where: { id: animalId },
        include: {
          saidas: {
            where: { estornada: false },
            orderBy: { dataSaida: "desc" },
            take: 1,
          },
        },
      });

      if (!animal) throw new Error("Animal não encontrado");
      if (animal.status !== "INATIVO") throw new Error("Animal não está inativo");

      const saidaAtiva = animal.saidas[0];
      if (!saidaAtiva) throw new Error("Animal não possui registro de saída ativo");

      // 1. Marcar saída como estornada
      await tx.saida.update({
        where: { id: saidaAtiva.id },
        data: { estornada: true },
      });

      // 2. Reabrir última pertinência
      const ultimaPertinencia = await tx.pertinenciaLote.findFirst({
        where: { animalId },
        orderBy: { dataInicio: "desc" },
      });

      if (ultimaPertinencia && ultimaPertinencia.dataFim) {
        await tx.pertinenciaLote.update({
          where: { id: ultimaPertinencia.id },
          data: { dataFim: null },
        });
      }

      // 3. Reativar animal
      await tx.animal.update({
        where: { id: animalId },
        data: { status: "ATIVO" },
      });

      // 4. Registrar movimentação de estorno (use the original saída date for context)
      await tx.movimentacao.create({
        data: {
          animalId,
          loteDestinoId: ultimaPertinencia?.loteId ?? null,
          dataMovimentacao: saidaAtiva.dataSaida,
          tipo: "ESTORNO_SAIDA",
          motivo: motivo ?? "Estorno de saída",
        },
      });

      return { animalId, brinco: animal.brinco, loteId: ultimaPertinencia?.loteId };
    });

    return NextResponse.json({ success: true, data: resultado });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro ao processar estorno";
    return NextResponse.json({ success: false, error: msg }, { status: 400 });
  }
}
