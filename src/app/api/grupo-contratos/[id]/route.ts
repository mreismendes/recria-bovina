import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grupoContratoSchema } from "@/lib/validations";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const grupo = await prisma.grupoContrato.findUnique({
      where: { id: params.id },
      include: {
        contratos: {
          where: { ativo: true },
          orderBy: { idContrato: "asc" },
          select: { id: true, idContrato: true, nomeFazenda: true },
        },
      },
    });
    if (!grupo) return NextResponse.json({ success: false, error: "Grupo não encontrado" }, { status: 404 });
    return NextResponse.json({ success: true, data: grupo });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao buscar grupo" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const parsed = grupoContratoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos" }, { status: 400 });
    }

    const existing = await prisma.grupoContrato.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ success: false, error: "Grupo não encontrado" }, { status: 404 });

    if (parsed.data.nome !== existing.nome) {
      const dup = await prisma.grupoContrato.findUnique({ where: { nome: parsed.data.nome } });
      if (dup) return NextResponse.json({ success: false, error: "Já existe um grupo com esse nome" }, { status: 409 });
    }

    const grupo = await prisma.grupoContrato.update({
      where: { id: params.id },
      data: parsed.data,
    });
    return NextResponse.json({ success: true, data: grupo });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao atualizar grupo" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const contratos = await prisma.contrato.count({ where: { grupoContratoId: params.id, ativo: true } });
    if (contratos > 0) {
      return NextResponse.json(
        { success: false, error: `Não é possível inativar: grupo possui ${contratos} contrato(s) ativo(s) vinculado(s).` },
        { status: 422 }
      );
    }
    await prisma.grupoContrato.update({ where: { id: params.id }, data: { ativo: false } });
    return NextResponse.json({ success: true, data: null });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao inativar grupo" }, { status: 500 });
  }
}
