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

    const dataSaidaDate = new Date(dataSaida);
    const qtdAnimais = animaisInput.length;

    // Valor de venda proporcional por cabeça (se venda em lote)
    const valorPorCabeca =
      tipoSaida === "VENDA" && valorVendaTotal ? valorVendaTotal / qtdAnimais : null;

    const resultados = await prisma.$transaction(async (tx) => {
      const processados = [];
      const bloqueados: { animalId: string; brinco: string; motivo: string }[] = [];

      for (const { animalId, pesoSaidaKg } of animaisInput) {
        // Buscar animal com dados necessários
        const animal = await tx.animal.findUnique({
          where: { id: animalId },
          include: {
            pesagens: { orderBy: { dataPesagem: "asc" }, take: 1 },
            saida: true,
          },
        });

        if (!animal || animal.status !== "ATIVO") continue;
        if (animal.saida) continue; // já tem saída registrada

        // ── Verificar carência ativa ──
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
            bloqueados.push({
              animalId,
              brinco: animal.brinco,
              motivo: `Carência ativa: ${meds}`,
            });
            continue;
          }
        }

        // ── Calcular snapshot econômico ──

        // Custo acumulado
        const [rateioSuplem, rateioMed] = await Promise.all([
          tx.rateioSuplemento.aggregate({
            where: { animalId },
            _sum: { valorRateio: true },
          }),
          tx.rateioMedicamento.aggregate({
            where: { animalId },
            _sum: { valorRateio: true },
          }),
        ]);

        const custoTotalAcumulado =
          animal.custoAquisicao +
          (rateioSuplem._sum.valorRateio ?? 0) +
          (rateioMed._sum.valorRateio ?? 0);

        // GMD total, arroba produzida, custo por arroba
        const pesoEntrada = animal.pesoEntradaKg;
        const pesoSaida = pesoSaidaKg ?? null;
        const diasNaRecria = differenceInDays(dataSaidaDate, animal.createdAt);

        let gmdTotal: number | null = null;
        let arrobaProduzida: number | null = null;
        let custoPorArroba: number | null = null;
        let resultadoLiquido: number | null = null;

        if (pesoSaida && diasNaRecria > 0) {
          gmdTotal = (pesoSaida - pesoEntrada) / diasNaRecria;
          arrobaProduzida = (pesoSaida - pesoEntrada) / 15;
          if (arrobaProduzida > 0) {
            custoPorArroba = custoTotalAcumulado / arrobaProduzida;
          }
        }

        if (valorPorCabeca != null) {
          resultadoLiquido = valorPorCabeca - custoTotalAcumulado;
        }

        // ── Criar registro de saída ──
        await tx.saida.create({
          data: {
            animalId,
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

        // ── Fechar pertinência ──
        const pertinenciaAtual = await tx.pertinenciaLote.findFirst({
          where: { animalId, dataFim: null },
        });
        if (pertinenciaAtual) {
          await tx.pertinenciaLote.update({
            where: { id: pertinenciaAtual.id },
            data: { dataFim: dataSaidaDate },
          });
        }

        // ── Inativar animal ──
        await tx.animal.update({
          where: { id: animalId },
          data: { status: "INATIVO" },
        });

        // ── Registrar movimentação ──
        await tx.movimentacao.create({
          data: {
            animalId,
            loteOrigemId: pertinenciaAtual?.loteId ?? null,
            dataMovimentacao: dataSaidaDate,
            tipo: "SAIDA_SISTEMA",
            motivo: `${tipoSaida}${comprador ? ` — ${comprador}` : ""}`,
            observacoes,
          },
        });

        processados.push({
          animalId,
          brinco: animal.brinco,
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
