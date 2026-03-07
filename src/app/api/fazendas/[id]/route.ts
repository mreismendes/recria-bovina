import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { nome, proprietario, comunidade, cidade, estado, areaHectares, observacoes } = body;

    const existing = await prisma.fazenda.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ success: false, error: "Fazenda não encontrada" }, { status: 404 });

    if (nome && nome !== existing.nome) {
      const dup = await prisma.fazenda.findUnique({ where: { nome } });
      if (dup) return NextResponse.json({ success: false, error: "Já existe uma fazenda com este nome" }, { status: 409 });
    }

    const fazenda = await prisma.fazenda.update({
      where: { id: params.id },
      data: {
        ...(nome !== undefined && { nome }),
        ...(proprietario !== undefined && { proprietario: proprietario || null }),
        ...(comunidade !== undefined && { comunidade: comunidade || null }),
        ...(cidade !== undefined && { cidade: cidade || null }),
        ...(estado !== undefined && { estado: estado || null }),
        ...(areaHectares !== undefined && { areaHectares: areaHectares != null ? Number(areaHectares) : null }),
        ...(observacoes !== undefined && { observacoes }),
      },
    });
    return NextResponse.json({ success: true, data: fazenda });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao atualizar fazenda" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const contratos = await prisma.contrato.count({ where: { fazendaId: params.id, ativo: true } });
    if (contratos > 0) {
      return NextResponse.json({ success: false, error: `Não é possível inativar: fazenda possui ${contratos} contrato(s) ativo(s) vinculado(s).` }, { status: 422 });
    }
    await prisma.fazenda.update({ where: { id: params.id }, data: { ativo: false } });
    return NextResponse.json({ success: true, data: null });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao inativar fazenda" }, { status: 500 });
  }
}
