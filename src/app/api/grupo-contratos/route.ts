import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { grupoContratoSchema } from "@/lib/validations";

export async function GET() {
  try {
    const grupos = await prisma.grupoContrato.findMany({
      orderBy: { nome: "asc" },
      include: { _count: { select: { contratos: true } } },
    });
    return NextResponse.json({ success: true, data: grupos });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao buscar grupos de contratos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = grupoContratoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const exists = await prisma.grupoContrato.findUnique({ where: { nome: parsed.data.nome } });
    if (exists) {
      return NextResponse.json({ success: false, error: "Já existe um grupo com esse nome" }, { status: 409 });
    }

    const grupo = await prisma.grupoContrato.create({ data: parsed.data });
    return NextResponse.json({ success: true, data: grupo }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao criar grupo de contratos" }, { status: 500 });
  }
}
