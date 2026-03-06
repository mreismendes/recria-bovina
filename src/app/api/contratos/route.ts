import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const contratos = await prisma.contrato.findMany({
      orderBy: { idContrato: "asc" },
      include: { _count: { select: { lotes: true } } },
    });
    return NextResponse.json({ success: true, data: contratos });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao buscar contratos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { idContrato, nomeFazenda, proprietario, comunidade, cidade, estado, formato, areaHectares, observacoes } = body;

    if (!idContrato || !nomeFazenda) {
      return NextResponse.json({ success: false, error: "ID do Contrato e Nome da Fazenda são obrigatórios" }, { status: 400 });
    }

    const exists = await prisma.contrato.findUnique({ where: { idContrato } });
    if (exists) {
      return NextResponse.json({ success: false, error: "ID do Contrato já existe" }, { status: 409 });
    }

    const contrato = await prisma.contrato.create({
      data: {
        idContrato,
        nomeFazenda,
        proprietario: proprietario || null,
        comunidade: comunidade || null,
        cidade: cidade || null,
        estado: estado || null,
        formato: formato || null,
        areaHectares: areaHectares != null ? Number(areaHectares) : null,
        observacoes: observacoes || null,
      },
    });
    return NextResponse.json({ success: true, data: contrato }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao criar contrato" }, { status: 500 });
  }
}
