/**
 * POST /api/animals/saida — P01.3: Saída (baixa) do animal
 *
 * Para cada animal:
 *   1. Verifica carência ativa (bloqueia venda se houver)
 *   2. Calcula snapshot econômico (custo acumulado, resultado, GMD, @)
 *   3. Cria registro Saida com snapshot
 *   4. Fecha pertinência atual
 *   5. Seta status = INATIVO
 *   6. Grava movimentação SAIDA_SISTEMA
 *
 * Tudo em transação atômica.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { differenceInDays } from "date-fns";
import { parseLocalDate } from "@/lib/utils";

// Schema inline — mais restritivo que o genérico (peso individual por animal)
import { z } from "zod";

const saidaApiSchema = z
  .object({
    animais: z
      .array(
        z.object({
          animalId: z.string().min(1),
          pesoSaidaKg: z.number().positive().optional().nullable(),
        })
      )
      .min(1, "Selecione ao menos um animal"),
    tipoSaida: z.enum(["VENDA", "TRANSFERENCIA_EXTERNA", "MORTE", "DESCARTE"]),
    dataSaida: z.string().min(1, "Data de saída é obrigatória"),
    valorVendaTotal: z.number().min(0).optional().nullable(),
    comprador: z.string().max(200).optional().nullable(),
    cnpjCpf: z.string().max(20).optional().nullable(),
    municipioDestino: z.string().max(200).optional().nullable(),
    gtaSaida: z.string().max(100).optional().nullable(),
    causaMorte: z.string().max(300).optional().nullable(),
    observacoes: z.string().max(500).optional().nullable(),
    forcarSaidaComCarencia: z.boolean().default(false),
  })
  .refine((d) => d.tipoSaida !== "MORTE" || !!d.causaMorte, {
    message: "Causa da morte é obrigatória",
    path: ["causaMorte"],
  });

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = saidaApiSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const {
      animais: animaisInput,
      tipoSaida,
      dataSaida,
      valorVendaTotal,
      comprador,
      cnpjCpf,
      municipioDestino,
      gtaSaida,
      causaMorte,
      observacoes,
      forcarSaidaComCarencia,
    } = parsed.data;

    const dataSaidaDate = parseLocalDate(dataSaida);

    const resultados = await prisma.$transaction(async (tx) => {
      // ── Pass 1: identify eligible animals and block ineligible ones ──
      type EligibleAnimal = {
        animalId: string;
        brinco: string;
        pesoSaidaKg: number | null | undefined;
        pesoEntradaKg: number;
        dataEntrada: Date;
        custoAquisicao: number;
      };

      const eligible: EligibleAnimal[] = [];
      const bloqueados: { animalId: string; brinco: string; motivo: string }[] = [];

      for (const { animalId, pesoSaidaKg } of animaisInput) {
        const animal = await tx.animal.findUnique({
          where: { id: animalId },
          include: {
            saidas: { where: { estornada: false } },
          },
        });

        if (!animal || animal.status !== "ATIVO") continue;
        if (animal.saidas.length > 0) continue; // já tem saída ativa (não estornada)

        // Validar cronologia: saída deve ser >= data de entrada do animal
        if (dataSaidaDate < animal.dataEntrada) {
          bloqueados.push({
            animalId,
            brinco: animal.brinco,
            motivo: "Data de saída anterior à data de entrada do animal",
          });
          continue;
        }

        // Verificar carência ativa
        if (tipoSaida === "VENDA" && !forcarSaidaComCarencia) {
          const carenciasAtivas = await tx.carenciaMedicamento.findMany({
            where: {
              animalId,
              ativa: true,
              dataFim: { gte: dataSaidaDate },
            },
            include: { apontamento: { include: { produto: true } } },
          });

          if (carenciasAtivas.length > 0) {
            const meds = carenciasAtivas.map((c) => c.apontamento.produto.nome).join(", ");
            bloqueados.push({ animalId, brinco: animal.brinco, motivo: `Carência ativa: ${meds}` });
            continue;
          }
        }

        eligible.push({
          animalId,
          brinco: animal.brinco,
          pesoSaidaKg,
          pesoEntradaKg: animal.pesoEntradaKg,
          dataEntrada: animal.dataEntrada,
          custoAquisicao: animal.custoAquisicao,
        });
      }

      // ── Compute per-head sale value based on ACTUALLY processable animals ──
      const valorPorCabeca =
        tipoSaida === "VENDA" && valorVendaTotal && eligible.length > 0
          ? valorVendaTotal / eligible.length
          : null;

      // ── Pass 2: create records for eligible animals ──
      const processados = [];

      for (const a of eligible) {
        // Custo acumulado
        const [rateioSuplem, rateioMed] = await Promise.all([
          tx.rateioSuplemento.aggregate({
            where: { animalId: a.animalId },
            _sum: { valorRateio: true },
          }),
          tx.rateioMedicamento.aggregate({
            where: { animalId: a.animalId },
            _sum: { valorRateio: true },
          }),
        ]);

        const custoTotalAcumulado =
          a.custoAquisicao +
          (rateioSuplem._sum.valorRateio ?? 0) +
          (rateioMed._sum.valorRateio ?? 0);

        // GMD total, arroba produzida, custo por arroba
        const pesoSaida = a.pesoSaidaKg ?? null;
        const diasNaRecria = differenceInDays(dataSaidaDate, a.dataEntrada);

        let gmdTotal: number | null = null;
        let arrobaProduzida: number | null = null;
        let custoPorArroba: number | null = null;
        let resultadoLiquido: number | null = null;

        if (pesoSaida && diasNaRecria > 0) {
          gmdTotal = (pesoSaida - a.pesoEntradaKg) / diasNaRecria;
          arrobaProduzida = (pesoSaida - a.pesoEntradaKg) / 15;
          if (arrobaProduzida > 0) {
            custoPorArroba = custoTotalAcumulado / arrobaProduzida;
          }
        }

        if (valorPorCabeca != null) {
          resultadoLiquido = valorPorCabeca - custoTotalAcumulado;
        }

        // Criar registro de saída
        await tx.saida.create({
          data: {
            animalId: a.animalId,
            dataSaida: dataSaidaDate,
            tipoSaida,
            pesoSaidaKg: pesoSaida,
            valorVenda: valorPorCabeca,
            comprador,
            cnpjCpf,
            municipioDestino,
            gtaSaida,
            causaMorte: tipoSaida === "MORTE" ? causaMorte : null,
            custoTotalAcumulado,
            resultadoLiquido,
            gmdTotal,
            diasNaRecria: diasNaRecria > 0 ? diasNaRecria : null,
            arrobaProduzida,
            custoPorArroba,
            observacoes,
          },
        });

        // Fechar pertinência
        const pertinenciaAtual = await tx.pertinenciaLote.findFirst({
          where: { animalId: a.animalId, dataFim: null },
        });
        if (pertinenciaAtual) {
          await tx.pertinenciaLote.update({
            where: { id: pertinenciaAtual.id },
            data: { dataFim: dataSaidaDate },
          });
        }

        // Inativar animal
        await tx.animal.update({
          where: { id: a.animalId },
          data: { status: "INATIVO" },
        });

        // Registrar movimentação
        await tx.movimentacao.create({
          data: {
            animalId: a.animalId,
            loteOrigemId: pertinenciaAtual?.loteId ?? null,
            dataMovimentacao: dataSaidaDate,
            tipo: "SAIDA_SISTEMA",
            motivo: `${tipoSaida}${comprador ? ` — ${comprador}` : ""}`,
            observacoes,
          },
        });

        processados.push({
          animalId: a.animalId,
          brinco: a.brinco,
          custoTotalAcumulado,
          resultadoLiquido,
          gmdTotal,
          arrobaProduzida,
          custoPorArroba,
        });
      }

      return { processados, bloqueados };
    });

    // Se houve bloqueios por carência, retorna 409 com os detalhes
    if (resultados.bloqueados.length > 0 && resultados.processados.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Saída bloqueada por carência ativa",
          bloqueados: resultados.bloqueados,
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        processados: resultados.processados,
        bloqueados: resultados.bloqueados,
        totalProcessados: resultados.processados.length,
        totalBloqueados: resultados.bloqueados.length,
      },
    });
  } catch (e) {
    console.error("Erro ao processar saída:", e);
    return NextResponse.json(
      { success: false, error: "Erro ao processar saída" },
      { status: 500 }
    );
  }
}
