import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loteSchema } from "@/lib/validations";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = loteSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: "Dados inválidos" }, { status: 400 });
    const lote = await prisma.lote.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json({ success: true, data: lote });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao atualizar lote" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const animais = await prisma.pertinenciaLote.count({ where: { loteId: params.id, dataFim: null } });
    if (animais > 0) return NextResponse.json({ success: false, error: `Não é possível excluir: lote possui ${animais} animal(ais) ativo(s).` }, { status: 422 });
    await prisma.lote.update({ where: { id: params.id }, data: { ativo: false } });
    return NextResponse.json({ success: true, data: null });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao excluir lote" }, { status: 500 });
  }
}
