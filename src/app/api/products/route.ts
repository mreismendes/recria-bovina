import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { produtoSchema } from "@/lib/validations";
import type { TipoProduto } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo  = searchParams.get("tipo") as TipoProduto | null;
    const grupo = searchParams.get("grupo");

    const suplementoTipos: TipoProduto[] = ["SUPLEMENTO_MINERAL","SUPLEMENTO_PROTEICO","SUPLEMENTO_ENERGETICO","SUPLEMENTO_MISTO"];
    const medicamentoTipos: TipoProduto[] = ["VERMIFUGO","CARRAPATICIDA","VACINA","ANTIBIOTICO","VITAMINA","OUTRO_MEDICAMENTO"];

    const produtos = await prisma.produto.findMany({
      where: {
        ativo: true,
        ...(tipo && { tipo }),
        ...(grupo === "suplemento" && { tipo: { in: suplementoTipos } }),
        ...(grupo === "medicamento" && { tipo: { in: medicamentoTipos } }),
      },
      orderBy: { nome: "asc" },
    });

    return NextResponse.json({ success: true, data: produtos });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao buscar produtos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = produtoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    }
    const produto = await prisma.produto.create({ data: parsed.data });
    return NextResponse.json({ success: true, data: produto }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao criar produto" }, { status: 500 });
  }
}
