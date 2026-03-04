import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { produtoSchema } from "@/lib/validations";

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = produtoSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: "Dados inválidos" }, { status: 400 });
    const produto = await prisma.produto.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json({ success: true, data: produto });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao atualizar produto" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.produto.update({ where: { id: params.id }, data: { ativo: false } });
    return NextResponse.json({ success: true, data: null });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao inativar produto" }, { status: 500 });
  }
}
