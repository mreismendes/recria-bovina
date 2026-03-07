/**
 * POST /api/animals/delete — Exclusão permanente de animais (batch)
 *
 * Requer role ADMIN.
 * Bloqueia exclusão se o animal possui registros financeiros
 * (rateios de suplemento/medicamento, carências ou saídas).
 *
 * Para cada animal elegível, remove em transação atômica:
 *   movimentações → pesagens → pertinências → animal
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { z } from "zod";

const deleteSchema = z.object({
  animalIds: z.array(z.string().min(1)).min(1, "Selecione ao menos um animal"),
});

export async function POST(req: NextRequest) {
  try {
    // Auth: ADMIN only
    const session = await getSession();
    if (!session?.user?.role || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Apenas administradores podem excluir animais." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = deleteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { animalIds } = parsed.data;

    // Fetch animals with financial dependency checks
    const animais = await prisma.animal.findMany({
      where: { id: { in: animalIds } },
      select: {
        id: true,
        brinco: true,
        _count: {
          select: {
            rateiosSuplem: true,
            rateiosMed: true,
            carencias: true,
            saidas: true,
          },
        },
      },
    });

    // Separate: eligible vs blocked
    const bloqueados: { brinco: string; motivo: string }[] = [];
    const elegiveis: string[] = [];

    for (const animal of animais) {
      const reasons: string[] = [];
      if (animal._count.rateiosSuplem > 0) reasons.push("rateios de suplemento");
      if (animal._count.rateiosMed > 0) reasons.push("rateios de medicamento");
      if (animal._count.carencias > 0) reasons.push("carências");
      if (animal._count.saidas > 0) reasons.push("saídas");

      if (reasons.length > 0) {
        bloqueados.push({ brinco: animal.brinco, motivo: reasons.join(", ") });
      } else {
        elegiveis.push(animal.id);
      }
    }

    // If all blocked, return error
    if (elegiveis.length === 0 && bloqueados.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Nenhum animal pôde ser excluído. Todos possuem registros financeiros.",
          bloqueados,
        },
        { status: 409 }
      );
    }

    // Atomic batch delete for eligible animals
    let excluidos = 0;
    if (elegiveis.length > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.movimentacao.deleteMany({ where: { animalId: { in: elegiveis } } });
        await tx.pesagem.deleteMany({ where: { animalId: { in: elegiveis } } });
        await tx.pertinenciaLote.deleteMany({ where: { animalId: { in: elegiveis } } });
        const result = await tx.animal.deleteMany({ where: { id: { in: elegiveis } } });
        excluidos = result.count;
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        excluidos,
        bloqueados,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Erro ao excluir animais" },
      { status: 500 }
    );
  }
}
