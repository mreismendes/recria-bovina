import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  nome:      z.string().min(1, "Nome é obrigatório").max(200),
  cnpjCpf:   z.string().max(20).optional().nullable(),
  municipio: z.string().max(200).optional().nullable(),
  estado:    z.string().max(2).optional().nullable(),
});

export async function GET() {
  try {
    const props = await prisma.propriedade.findMany({
      orderBy: { nome: "asc" },
      include: { _count: { select: { lotes: true } } },
    });
    return NextResponse.json({ success: true, data: props });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao buscar propriedades" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    const prop = await prisma.propriedade.create({ data: parsed.data });
    return NextResponse.json({ success: true, data: prop }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao criar propriedade" }, { status: 500 });
  }
}
