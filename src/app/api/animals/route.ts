/**
 * GET /api/animals  — Lista animais (com filtros opcionais)
 * POST /api/animals — Cadastra novo animal (P01.1)
 *
 * Implementação completa: Etapa 3
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { animalSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const loteId    = searchParams.get("loteId");
    const status    = searchParams.get("status") ?? "ATIVO";
    const brinco    = searchParams.get("brinco");

    const animais = await prisma.animal.findMany({
      where: {
        ...(status !== "TODOS" && { status: status as "ATIVO" | "INATIVO" }),
        ...(brinco && { brinco: { contains: brinco, mode: "insensitive" } }),
        ...(loteId && {
          pertinencias: { some: { loteId, dataFim: null } },
        }),
      },
      include: {
        pertinencias: {
          where: { dataFim: null },
          include: { lote: true },
        },
        pesagens: {
          orderBy: { dataPesagem: "desc" },
          take: 1,
        },
      },
      orderBy: { brinco: "asc" },
    });

    return NextResponse.json({ success: true, data: animais });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao buscar animais" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = animalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { loteId, dataEntrada, ...animalData } = parsed.data;

    // Verificar unicidade do brinco
    const existe = await prisma.animal.findUnique({ where: { brinco: animalData.brinco } });
    if (existe) {
      return NextResponse.json({ success: false, error: "Brinco já cadastrado" }, { status: 409 });
    }

    const dataEntradaDate = new Date(dataEntrada);

    // Transação atômica: animal + pesagem de entrada + pertinência + movimentação
    const animal = await prisma.$transaction(async (tx) => {
      const novoAnimal = await tx.animal.create({
        data: {
          ...animalData,
          dataNascimento: animalData.dataNascimento ? new Date(animalData.dataNascimento) : null,
        },
      });

      await tx.pesagem.create({
        data: {
          animalId: novoAnimal.id,
          dataPesagem: dataEntradaDate,
          pesoKg: animalData.pesoEntradaKg,
          tipo: "ENTRADA",
        },
      });

      await tx.pertinenciaLote.create({
        data: { animalId: novoAnimal.id, loteId, dataInicio: dataEntradaDate },
      });

      await tx.movimentacao.create({
        data: {
          animalId: novoAnimal.id,
          loteDestinoId: loteId,
          dataMovimentacao: dataEntradaDate,
          tipo: "ENTRADA_SISTEMA",
        },
      });

      return novoAnimal;
    });

    return NextResponse.json({ success: true, data: animal }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao cadastrar animal" }, { status: 500 });
  }
}
