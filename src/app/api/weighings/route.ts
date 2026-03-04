/**
 * POST /api/weighings/session — Registra sessão de pesagem por lote (P02)
 * Implementação completa: Etapa 4
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sessaoPesagemSchema } from "@/lib/validations";
import { getUltimaPesagem } from "@/lib/queries";
import { calcularGMD } from "@/lib/utils";
import { differenceInDays } from "date-fns";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = sessaoPesagemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Dados inválidos", details: parsed.error.flatten() }, { status: 400 });
    }

    const { dataPesagem, pesagens, responsavel, observacoes } = parsed.data;
    const dataPesagemDate = new Date(dataPesagem);

    const resultados = await prisma.$transaction(async (tx) => {
      const criadas = [];
      for (const p of pesagens) {
        // RN-02: verificar duplicata de data
        const existente = await tx.pesagem.findUnique({
          where: { animalId_dataPesagem: { animalId: p.animalId, dataPesagem: dataPesagemDate } },
        });
        if (existente) continue; // pular silenciosamente — log em produção

        const ultima = await getUltimaPesagem(p.animalId);
        let gmdPeriodo: number | null = null;
        let diasPeriodo: number | null = null;

        if (ultima) {
          diasPeriodo = differenceInDays(dataPesagemDate, ultima.dataPesagem);
          gmdPeriodo = diasPeriodo > 0 ? calcularGMD(ultima.pesoKg, p.pesoKg, diasPeriodo) : null;
        }

        const nova = await tx.pesagem.create({
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
        criadas.push(nova);
      }
      return criadas;
    });

    return NextResponse.json({ success: true, data: resultados }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao registrar pesagens" }, { status: 500 });
  }
}
