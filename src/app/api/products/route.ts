/**
 * GET  /api/products  — Lista produtos (suplementos e medicamentos)
 * POST /api/products  — Cadastra produto
 * Implementação completa: Etapa 2
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { produtoSchema } from "@/lib/validations";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo  = searchParams.get("tipo");
    const grupo = searchParams.get("grupo"); // "suplemento" | "medicamento"

    const produtos = await prisma.produto.findMany({
      where: {
        ativo: true,
        ...(tipo && { tipo: tipo as never }),
        ...(grupo === "suplemento" && { tipo: { in: ["SUPLEMENTO_MINERAL","SUPLEMENTO_PROTEICO","SUPLEMENTO_ENERGETICO","SUPLEMENTO_MISTO"] } }),
        ...(grupo === "medicamento" && { tipo: { in: ["VERMIFUGO","CARRAPATICIDA","VACINA","ANTIBIOTICO","VITAMINA","OUTRO_MEDICAMENTO"] } }),
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
