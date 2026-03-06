import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { idContrato, nomeFazenda, observacoes } = body;

    const existing = await prisma.contrato.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ success: false, error: "Contrato não encontrado" }, { status: 404 });

    if (idContrato && idContrato !== existing.idContrato) {
      const dup = await prisma.contrato.findUnique({ where: { idContrato } });
      if (dup) return NextResponse.json({ success: false, error: "ID do Contrato já existe" }, { status: 409 });
    }

    const contrato = await prisma.contrato.update({
      where: { id: params.id },
      data: {
        ...(idContrato !== undefined && { idContrato }),
        ...(nomeFazenda !== undefined && { nomeFazenda }),
        ...(observacoes !== undefined && { observacoes }),
      },
    });
    return NextResponse.json({ success: true, data: contrato });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao atualizar contrato" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const lotes = await prisma.lote.count({ where: { contratoId: params.id, ativo: true } });
    if (lotes > 0) {
      return NextResponse.json({ success: false, error: `Não é possível excluir: contrato possui ${lotes} lote(s) ativo(s).` }, { status: 422 });
    }
    await prisma.contrato.update({ where: { id: params.id }, data: { ativo: false } });
    return NextResponse.json({ success: true, data: null });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao excluir contrato" }, { status: 500 });
  }
}
