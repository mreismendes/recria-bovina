/**
 * GET  /api/lots  — Lista lotes
 * POST /api/lots  — Cria lote
 *
 * GET /api/lots/[id]/animals?date=YYYY-MM-DD — Animais ativos num lote em uma data
 * Implementação completa: Etapa 2
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loteSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const contratoId = searchParams.get("contratoId");
    const grupoContratoId = searchParams.get("grupoContratoId");
    const ativo = searchParams.get("ativo");

    const lotes = await prisma.lote.findMany({
      where: {
        ...(contratoId && { contratoId }),
        ...(grupoContratoId && { contrato: { grupoContratoId } }),
        ...(ativo !== null && { ativo: ativo !== "false" }),
      },
      include: {
        contrato: { include: { grupoContrato: { select: { id: true, nome: true } } } },
        pertinencias: { where: { dataFim: null }, select: { id: true } },
      },
      orderBy: { nome: "asc" },
    });

    return NextResponse.json({ success: true, data: lotes });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao buscar lotes" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    }
    const lote = await prisma.lote.create({ data: parsed.data });
    return NextResponse.json({ success: true, data: lote }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao criar lote" }, { status: 500 });
  }
}
