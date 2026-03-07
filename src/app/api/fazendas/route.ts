import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const fazendas = await prisma.fazenda.findMany({
      orderBy: { nome: "asc" },
      include: {
        _count: { select: { contratos: true } },
      },
    });
    return NextResponse.json({ success: true, data: fazendas });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao buscar fazendas" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, proprietario, comunidade, cidade, estado, areaHectares, observacoes } = body;

    if (!nome) {
      return NextResponse.json({ success: false, error: "Nome da fazenda é obrigatório" }, { status: 400 });
    }

    const exists = await prisma.fazenda.findFirst({ where: { nome } });
    if (exists) {
      return NextResponse.json({ success: false, error: "Já existe uma fazenda com este nome. Use dados adicionais para distingui-la." }, { status: 409 });
    }

    const fazenda = await prisma.fazenda.create({
      data: {
        nome,
        proprietario: proprietario || null,
        comunidade: comunidade || null,
        cidade: cidade || null,
        estado: estado || null,
        areaHectares: areaHectares != null ? Number(areaHectares) : null,
        observacoes: observacoes || null,
      },
    });
    return NextResponse.json({ success: true, data: fazenda }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao criar fazenda" }, { status: 500 });
  }
}
