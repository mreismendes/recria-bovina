/**
 * GET  /api/weighings — Lista histórico de pesagens
 * POST /api/weighings — Registra sessão de pesagem por lote (P02)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessaoPesagemSchema } from "@/lib/validations";
import { calcularGMD } from "@/lib/utils";
import { differenceInDays } from "date-fns";

// ── GET: Histórico de pesagens ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const loteId = searchParams.get("loteId");
    const animalId = searchParams.get("animalId");
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);

    const pesagens = await prisma.pesagem.findMany({
      where: {
        ...(animalId && { animalId }),
        ...(loteId && {
          animal: {
            pertinencias: {
              some: { loteId, OR: [{ dataFim: null }, { dataFim: { gt: new Date() } }] },
            },
          },
        }),
      },
      include: {
        animal: {
          select: { id: true, brinco: true, nome: true, pesoEntradaKg: true },
        },
      },
      orderBy: { dataPesagem: "desc" },
      take: Math.min(limit, 500),
    });

    return NextResponse.json({ success: true, data: pesagens });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao buscar pesagens" }, { status: 500 });
  }
}

// ── POST: Registrar sessão de pesagem ───────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = sessaoPesagemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { loteId, dataPesagem, pesagens, responsavel, observacoes } = parsed.data;
    const dataPesagemDate = new Date(dataPesagem);

    // Validar lote
    const lote = await prisma.lote.findUnique({ where: { id: loteId } });
    if (!lote || !lote.ativo) {
      return NextResponse.json({ success: false, error: "Lote não encontrado ou inativo" }, { status: 400 });
    }

    const resultados = await prisma.$transaction(async (tx) => {
      const criadas: {
        animalId: string;
        brinco: string;
        pesoKg: number;
        pesoAnterior: number | null;
        gmdPeriodo: number | null;
        diasPeriodo: number | null;
        ganhoKg: number | null;
      }[] = [];

      for (const p of pesagens) {
        // RN-02: verificar duplicata de data
        const existente = await tx.pesagem.findUnique({
          where: { animalId_dataPesagem: { animalId: p.animalId, dataPesagem: dataPesagemDate } },
        });
        if (existente) continue;

        // Buscar animal para o brinco
        const animal = await tx.animal.findUnique({
          where: { id: p.animalId },
          select: { brinco: true },
        });

        // Buscar última pesagem DENTRO da transação (fix: era fora do tx)
        const ultima = await tx.pesagem.findFirst({
          where: { animalId: p.animalId },
          orderBy: { dataPesagem: "desc" },
        });

        let gmdPeriodo: number | null = null;
        let diasPeriodo: number | null = null;

        if (ultima) {
          diasPeriodo = differenceInDays(dataPesagemDate, ultima.dataPesagem);
          gmdPeriodo = diasPeriodo > 0 ? calcularGMD(ultima.pesoKg, p.pesoKg, diasPeriodo) : null;
        }

        await tx.pesagem.create({
          data: {
            animalId: p.animalId,
            dataPesagem: dataPesagemDate,
            pesoKg: p.pesoKg,
            tipo: "PERIODICA",
            jejumHoras: p.jejumHoras,
            responsavel,
            observacoes,
            gmdPeriodo,
            diasPeriodo,
          },
        });

        criadas.push({
          animalId: p.animalId,
          brinco: animal?.brinco ?? p.animalId,
          pesoKg: p.pesoKg,
          pesoAnterior: ultima?.pesoKg ?? null,
          gmdPeriodo,
          diasPeriodo,
          ganhoKg: ultima ? p.pesoKg - ultima.pesoKg : null,
        });
      }
      return criadas;
    });

    return NextResponse.json({ success: true, data: resultados }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao registrar pesagens" }, { status: 500 });
  }
}
