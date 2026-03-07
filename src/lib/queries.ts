/**
 * src/lib/queries.ts
 * Funções de query reutilizáveis.
 * Centralizam a lógica de negócio das consultas mais complexas.
 */

import { prisma } from "./prisma";

// ─────────────────────────────────────────────────────────────────────────────
// PERTINÊNCIA DE LOTE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna o lote atual do animal (pertinência com dataFim = null).
 */
export async function getLoteAtualDoAnimal(animalId: string) {
  return prisma.pertinenciaLote.findFirst({
    where: { animalId, dataFim: null },
    include: { lote: { include: { contrato: true, grupoContrato: true } } },
  });
}

/**
 * Retorna os animais ativos em um lote em uma data específica.
 * Esta é a função crítica usada para calcular o denominador do rateio.
 *
 * Um animal é "ativo no lote na data D" se:
 *   pertinencia.loteId = loteId
 *   AND pertinencia.dataInicio <= D
 *   AND (pertinencia.dataFim IS NULL OR pertinencia.dataFim > D)
 *
 * Nota: dataFim > D (não >=) porque a saída do lote encerra a pertinência
 * naquele dia — o animal que sai no dia D não recebe rateio desse dia.
 */
export async function getAnimaisAtivosNoLoteNaData(loteId: string, data: Date) {
  return prisma.animal.findMany({
    where: {
      status: "ATIVO",
      pertinencias: {
        some: {
          loteId,
          dataInicio: { lte: data },
          OR: [{ dataFim: null }, { dataFim: { gt: data } }],
        },
      },
    },
    select: { id: true, brinco: true, nome: true, rfid: true },
  });
}

/**
 * Retorna o número de cabeças ativas em um lote em uma data.
 */
export async function contarCabecasAtivasNaData(loteId: string, data: Date): Promise<number> {
  return prisma.animal.count({
    where: {
      status: "ATIVO",
      pertinencias: {
        some: {
          loteId,
          dataInicio: { lte: data },
          OR: [{ dataFim: null }, { dataFim: { gt: data } }],
        },
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PESAGEM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna a última pesagem de um animal.
 */
export async function getUltimaPesagem(animalId: string) {
  return prisma.pesagem.findFirst({
    where: { animalId, ativo: true },
    orderBy: { dataPesagem: "desc" },
  });
}

/**
 * Retorna todas as pesagens de um animal ordenadas por data.
 */
export async function getPesagensDoAnimal(animalId: string) {
  return prisma.pesagem.findMany({
    where: { animalId, ativo: true },
    orderBy: { dataPesagem: "asc" },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CUSTO ACUMULADO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula o custo total acumulado de um animal:
 *   custoAquisicao + soma dos rateios de suplemento + soma dos rateios de medicamento
 */
export async function getCustoAcumuladoDoAnimal(animalId: string): Promise<number> {
  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
    select: { custoAquisicao: true },
  });
  if (!animal) throw new Error(`Animal ${animalId} não encontrado`);

  const [rateioSuplem, rateioMed] = await Promise.all([
    prisma.rateioSuplemento.aggregate({
      where: { animalId },
      _sum: { valorRateio: true },
    }),
    prisma.rateioMedicamento.aggregate({
      where: { animalId },
      _sum: { valorRateio: true },
    }),
  ]);

  return (
    animal.custoAquisicao +
    (rateioSuplem._sum.valorRateio ?? 0) +
    (rateioMed._sum.valorRateio ?? 0)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CARÊNCIA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verifica se um animal tem carência ativa na data informada.
 * Usada no processo de saída para bloquear/alertar.
 */
export async function getCarenciasAtivasDoAnimal(animalId: string, data: Date = new Date()) {
  return prisma.carenciaMedicamento.findMany({
    where: {
      animalId,
      ativa: true,
      dataFim: { gte: data },
    },
    include: {
      apontamento: { include: { produto: true } },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna resumo de um lote para o painel de gestão.
 */
export async function getResumoDeLote(loteId: string) {
  const hoje = new Date();

  const [lote, totalAnimais, animaisComAlertaPesagem] = await Promise.all([
    prisma.lote.findUnique({
      where: { id: loteId },
      include: { contrato: true, grupoContrato: true },
    }),

    // Total de animais ativos no lote hoje
    contarCabecasAtivasNaData(loteId, hoje),

    // Animais sem pesagem há mais de 45 dias
    prisma.animal.findMany({
      where: {
        status: "ATIVO",
        pertinencias: {
          some: {
            loteId,
            dataFim: null,
          },
        },
        pesagens: {
          none: {
            dataPesagem: {
              gte: new Date(hoje.getTime() - 45 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
      select: { id: true, brinco: true },
    }),
  ]);

  return { lote, totalAnimais, animaisComAlertaPesagem: animaisComAlertaPesagem.length };
}
