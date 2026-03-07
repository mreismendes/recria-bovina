import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateSchema = z.object({
  nome:        z.string().max(100).optional().nullable(),
  raca:        z.string().max(100).optional().nullable(),
  rfid:        z.string().max(100).optional().nullable(),
  notaFiscal:  z.string().max(100).optional().nullable(),
  observacoes: z.string().max(500).optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const animal = await prisma.animal.findUnique({
      where: { id: params.id },
      include: {
        pertinencias: { include: { lote: true }, orderBy: { dataInicio: "desc" } },
        pesagens: { where: { ativo: true }, orderBy: { dataPesagem: "desc" } },
        rateiosMed: { include: { apontamento: { include: { produto: true } } }, orderBy: { createdAt: "desc" } },
        rateiosSuplem: { include: { apontamento: { include: { produto: true } } }, orderBy: { createdAt: "desc" } },
        carencias: { where: { ativa: true }, include: { apontamento: { include: { produto: true } } } },
        saidas: { orderBy: { dataSaida: "desc" } },
      },
    });
    if (!animal) return NextResponse.json({ success: false, error: "Animal não encontrado" }, { status: 404 });
    return NextResponse.json({ success: true, data: animal });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao buscar animal" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const parsed = updateSchema.safeParse(await req.json());
    if (!parsed.success) return NextResponse.json({ success: false, error: "Dados inválidos" }, { status: 400 });

    // Pre-check RFID uniqueness before update
    if (parsed.data.rfid) {
      const rfidExiste = await prisma.animal.findFirst({
        where: { rfid: parsed.data.rfid, id: { not: params.id } },
      });
      if (rfidExiste) {
        return NextResponse.json({ success: false, error: "RFID já cadastrado" }, { status: 409 });
      }
    }

    const animal = await prisma.animal.update({ where: { id: params.id }, data: parsed.data });
    return NextResponse.json({ success: true, data: animal });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao atualizar animal" }, { status: 500 });
  }
}
