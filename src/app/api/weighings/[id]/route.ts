/**
 * PUT    /api/weighings/[id] — Editar pesagem individual (com justificativa)
 * DELETE /api/weighings/[id] — Soft-delete pesagem (com justificativa)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { editPesagemSchema, deletePesagemSchema } from "@/lib/validations";
import { calcularGMD } from "@/lib/utils";
import { differenceInDays } from "date-fns";

/**
 * Recalcula GMD/diasPeriodo para a próxima pesagem ativa após a pesagem dada.
 * Chamado após edit ou soft-delete para manter a cadeia consistente.
 */
async function recalcularProximaPesagem(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  animalId: string,
  dataPesagem: Date
) {
  // Buscar a próxima pesagem ativa após esta data
  const proxima = await tx.pesagem.findFirst({
    where: {
      animalId,
      ativo: true,
      dataPesagem: { gt: dataPesagem },
    },
    orderBy: { dataPesagem: "asc" },
  });

  if (!proxima) return;

  // Buscar a pesagem ativa anterior à próxima (pode ser a editada ou outra)
  const anterior = await tx.pesagem.findFirst({
    where: {
      animalId,
      ativo: true,
      dataPesagem: { lt: proxima.dataPesagem },
    },
    orderBy: { dataPesagem: "desc" },
  });

  let gmdPeriodo: number | null = null;
  let diasPeriodo: number | null = null;

  if (anterior) {
    diasPeriodo = differenceInDays(proxima.dataPesagem, anterior.dataPesagem);
    gmdPeriodo = diasPeriodo > 0 ? calcularGMD(anterior.pesoKg, proxima.pesoKg, diasPeriodo) : null;
  }

  await tx.pesagem.update({
    where: { id: proxima.id },
    data: { gmdPeriodo, diasPeriodo },
  });
}

// ── PUT: Editar pesagem ─────────────────────────────────────────────────────

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = editPesagemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { pesoKg, jejumHoras, responsavel, observacoes, motivoAlteracao } = parsed.data;

    const pesagem = await prisma.pesagem.findUnique({ where: { id: params.id } });
    if (!pesagem || !pesagem.ativo) {
      return NextResponse.json({ success: false, error: "Pesagem não encontrada" }, { status: 404 });
    }

    // Bloquear edição de pesagens SAIDA
    if (pesagem.tipo === "SAIDA") {
      return NextResponse.json(
        { success: false, error: `Pesagem do tipo ${pesagem.tipo} não pode ser editada` },
        { status: 400 }
      );
    }

    const resultado = await prisma.$transaction(async (tx) => {
      // Recalcular GMD desta pesagem (caso peso tenha mudado)
      // ENTRADA não tem pesagem anterior, então gmdPeriodo/diasPeriodo ficam null
      let gmdPeriodo = pesagem.gmdPeriodo;
      let diasPeriodo = pesagem.diasPeriodo;

      if (pesoKg !== pesagem.pesoKg && pesagem.tipo !== "ENTRADA") {
        // Buscar pesagem ativa anterior
        const anterior = await tx.pesagem.findFirst({
          where: {
            animalId: pesagem.animalId,
            ativo: true,
            dataPesagem: { lt: pesagem.dataPesagem },
          },
          orderBy: { dataPesagem: "desc" },
        });

        if (anterior) {
          diasPeriodo = differenceInDays(pesagem.dataPesagem, anterior.dataPesagem);
          gmdPeriodo = diasPeriodo > 0 ? calcularGMD(anterior.pesoKg, pesoKg, diasPeriodo) : null;
        }
      }

      const atualizada = await tx.pesagem.update({
        where: { id: params.id },
        data: {
          pesoKg,
          jejumHoras: jejumHoras ?? null,
          responsavel: responsavel ?? null,
          observacoes: observacoes ?? null,
          motivoAlteracao,
          alteradoPor: body.alteradoPor ?? null,
          alteradoEm: new Date(),
          gmdPeriodo,
          diasPeriodo,
        },
        include: {
          animal: { select: { id: true, brinco: true, nome: true } },
        },
      });

      // Se é pesagem de ENTRADA, sincronizar Animal.pesoEntradaKg
      if (pesagem.tipo === "ENTRADA" && pesoKg !== pesagem.pesoKg) {
        await tx.animal.update({
          where: { id: pesagem.animalId },
          data: { pesoEntradaKg: pesoKg },
        });
      }

      // Recalcular a próxima pesagem na cadeia se o peso mudou
      if (pesoKg !== pesagem.pesoKg) {
        await recalcularProximaPesagem(tx, pesagem.animalId, pesagem.dataPesagem);
      }

      return atualizada;
    });

    return NextResponse.json({ success: true, data: resultado });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao atualizar pesagem" }, { status: 500 });
  }
}

// ── DELETE: Soft-delete pesagem ─────────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = deletePesagemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Justificativa é obrigatória (mínimo 10 caracteres)", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { motivoAlteracao } = parsed.data;

    const pesagem = await prisma.pesagem.findUnique({ where: { id: params.id } });
    if (!pesagem || !pesagem.ativo) {
      return NextResponse.json({ success: false, error: "Pesagem não encontrada" }, { status: 404 });
    }

    if (pesagem.tipo === "ENTRADA") {
      return NextResponse.json(
        { success: false, error: "Pesagem de entrada não pode ser excluída. Para corrigir o peso, use a opção de edição." },
        { status: 400 }
      );
    }

    if (pesagem.tipo === "SAIDA") {
      return NextResponse.json(
        { success: false, error: `Pesagem do tipo ${pesagem.tipo} não pode ser excluída` },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.pesagem.update({
        where: { id: params.id },
        data: {
          ativo: false,
          motivoAlteracao,
          alteradoPor: body.alteradoPor ?? null,
          alteradoEm: new Date(),
        },
      });

      // Recalcular a próxima pesagem para pular esta excluída
      await recalcularProximaPesagem(tx, pesagem.animalId, pesagem.dataPesagem);
    });

    return NextResponse.json({ success: true, data: null });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao excluir pesagem" }, { status: 500 });
  }
}
