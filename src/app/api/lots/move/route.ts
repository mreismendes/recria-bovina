/**
 * POST /api/lots/move — Move lotes to a different contract or group of contracts
 *
 * Reassigns the contratoId/grupoContratoId of one or more lots in a single transaction.
 * All animals remain in their respective lots; only the lot's parent changes.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const moveLotesSchema = z
  .object({
    loteIds: z.array(z.string()).min(1, "Selecione ao menos um lote"),
    contratoId: z.string().optional().nullable(),
    grupoContratoId: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      const hasContrato = !!data.contratoId;
      const hasGrupo = !!data.grupoContratoId;
      return hasContrato !== hasGrupo; // XOR
    },
    { message: "Informe um Contrato ou um Grupo de Contratos (não ambos)", path: ["contratoId"] }
  );

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = moveLotesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { loteIds, contratoId, grupoContratoId } = parsed.data;

    // Validate destination exists
    if (contratoId) {
      const contrato = await prisma.contrato.findUnique({ where: { id: contratoId } });
      if (!contrato || !contrato.ativo) {
        return NextResponse.json(
          { success: false, error: "Contrato de destino não encontrado ou inativo" },
          { status: 404 }
        );
      }
    } else if (grupoContratoId) {
      const grupo = await prisma.grupoContrato.findUnique({ where: { id: grupoContratoId } });
      if (!grupo || !grupo.ativo) {
        return NextResponse.json(
          { success: false, error: "Grupo de contratos de destino não encontrado ou inativo" },
          { status: 404 }
        );
      }
    }

    // Validate all lots exist and are active
    const lotes = await prisma.lote.findMany({
      where: { id: { in: loteIds }, ativo: true },
      select: { id: true, nome: true, contratoId: true, grupoContratoId: true },
    });

    if (lotes.length !== loteIds.length) {
      const foundIds = new Set(lotes.map((l) => l.id));
      const missing = loteIds.filter((id) => !foundIds.has(id));
      return NextResponse.json(
        { success: false, error: `Lote(s) não encontrado(s) ou inativo(s): ${missing.join(", ")}` },
        { status: 404 }
      );
    }

    // Filter out lots that are already at the destination
    const lotesToMove = lotes.filter((l) => {
      if (contratoId) return l.contratoId !== contratoId;
      return l.grupoContratoId !== grupoContratoId;
    });

    if (lotesToMove.length === 0) {
      return NextResponse.json(
        { success: false, error: "Todos os lotes selecionados já pertencem ao destino informado" },
        { status: 422 }
      );
    }

    // Move all lots in a single transaction
    await prisma.$transaction(
      lotesToMove.map((l) =>
        prisma.lote.update({
          where: { id: l.id },
          data: {
            contratoId: contratoId || null,
            grupoContratoId: grupoContratoId || null,
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      data: {
        movidos: lotesToMove.length,
        ignorados: lotes.length - lotesToMove.length,
        loteIds: lotesToMove.map((l) => l.id),
      },
    });
  } catch (e) {
    console.error("Erro ao mover lotes:", e);
    return NextResponse.json(
      { success: false, error: "Erro interno ao mover lotes" },
      { status: 500 }
    );
  }
}
