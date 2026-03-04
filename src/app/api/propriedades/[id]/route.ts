import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  nome:      z.string().min(1).max(200),
  cnpjCpf:   z.string().max(20).optional().nullable(),
  municipio: z.string().max(200).optional().nullable(),
  estado:    z.string().max(2).optional().nullable(),
  ativa:     z.boolean().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: "Dados inválidos" }, { status: 400 });
    const prop = await prisma.propriedade.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json({ success: true, data: prop });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao atualizar" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const lotes = await prisma.lote.count({ where: { propriedadeId: params.id } });
    if (lotes > 0) return NextResponse.json({ success: false, error: `Não é possível excluir: esta propriedade possui ${lotes} lote(s) vinculado(s).` }, { status: 422 });
    await prisma.propriedade.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true, data: null });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao excluir" }, { status: 500 });
  }
}
