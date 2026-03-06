/**
 * POST /api/weighings/batch — Importação em lote de pesagens via brinco
 *
 * Resolve brinco → animalId, calcula GMD, respeita RN-02.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calcularGMD, parseLocalDate } from "@/lib/utils";
import { differenceInDays } from "date-fns";
import { z } from "zod";

const batchSchema = z.object({
  pesagens: z.array(
    z.object({
      brinco: z.string().min(1),
      dataPesagem: z.string().min(1),
      pesoKg: z.number().positive(),
      jejumHoras: z.number().min(0).nullable().optional(),
      responsavel: z.string().nullable().optional(),
      observacoes: z.string().nullable().optional(),
    })
  ).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = batchSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { pesagens } = parsed.data;

    const resultado = await prisma.$transaction(async (tx) => {
      // Pre-load brinco → id map
      const brincos = Array.from(new Set(pesagens.map((p) => p.brinco)));
      const animais = await tx.animal.findMany({
        where: { brinco: { in: brincos }, status: "ATIVO" },
        select: { id: true, brinco: true },
      });
      const brincoToId = new Map(animais.map((a) => [a.brinco.toLowerCase(), a.id]));

      let registradas = 0;
      let puladas = 0;

      for (const p of pesagens) {
        const animalId = brincoToId.get(p.brinco.toLowerCase());
        if (!animalId) { puladas++; continue; }

        const dataPesagemDate = parseLocalDate(p.dataPesagem);

        // RN-02: skip duplicates
        const existente = await tx.pesagem.findUnique({
          where: { animalId_dataPesagem: { animalId, dataPesagem: dataPesagemDate } },
        });
        if (existente) { puladas++; continue; }

        // Calculate GMD — find the latest pesagem BEFORE this date
        const ultima = await tx.pesagem.findFirst({
          where: { animalId, dataPesagem: { lt: dataPesagemDate } },
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
            animalId,
            dataPesagem: dataPesagemDate,
            pesoKg: p.pesoKg,
            tipo: "PERIODICA",
            jejumHoras: p.jejumHoras ?? null,
            responsavel: p.responsavel ?? null,
            observacoes: p.observacoes ?? null,
            gmdPeriodo,
            diasPeriodo,
          },
        });

        registradas++;
      }

      return { registradas, puladas };
    }, { maxWait: 30000, timeout: 60000 });

    return NextResponse.json({ success: true, data: resultado }, { status: 201 });
  } catch (e) {
    console.error("Erro na importação de pesagens:", e);
    return NextResponse.json(
      { success: false, error: "Erro ao importar pesagens" },
      { status: 500 }
    );
  }
}
