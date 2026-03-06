import { prisma } from "@/lib/prisma";
import { PesagensManager } from "./_components/pesagens-manager";
import { differenceInDays } from "date-fns";

export default async function PesagensPage() {
  const hoje = new Date();

  // Buscar lotes ativos com animais e última pesagem de cada animal
  const lotes = await prisma.lote.findMany({
    where: { ativo: true },
    orderBy: { nome: "asc" },
    include: { contrato: { select: { nomeFazenda: true } }, grupoContrato: { select: { nome: true } } },
  });

  // Para cada lote, buscar animais ativos com última pesagem
  const animaisPorLote: Record<
    string,
    {
      id: string;
      brinco: string;
      nome: string | null;
      pesoEntradaKg: number;
      ultimoPeso: number | null;
      ultimaData: string | null;
      diasSemPesagem: number | null;
    }[]
  > = {};

  for (const lote of lotes) {
    const animais = await prisma.animal.findMany({
      where: {
        status: "ATIVO",
        pertinencias: { some: { loteId: lote.id, dataFim: null } },
      },
      orderBy: { brinco: "asc" },
      include: {
        pesagens: {
          orderBy: { dataPesagem: "desc" },
          take: 1,
        },
      },
    });

    animaisPorLote[lote.id] = animais.map((a) => {
      const ultimaPesagem = a.pesagens[0] ?? null;
      return {
        id: a.id,
        brinco: a.brinco,
        nome: a.nome,
        pesoEntradaKg: a.pesoEntradaKg,
        ultimoPeso: ultimaPesagem?.pesoKg ?? null,
        ultimaData: ultimaPesagem?.dataPesagem?.toISOString() ?? null,
        diasSemPesagem: ultimaPesagem
          ? differenceInDays(hoje, ultimaPesagem.dataPesagem)
          : null,
      };
    });
  }

  return (
    <PesagensManager
      lotes={lotes.map((l) => ({
        id: l.id,
        nome: l.nome,
        contrato: l.contrato,
        grupoContrato: l.grupoContrato,
      }))}
      animaisPorLote={animaisPorLote}
    />
  );
}
