import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { AnimaisManager } from "./_components/animais-manager";

export default async function AnimaisPage() {
  const session = await getSession();
  const userRole = (session?.user?.role as string) ?? "OPERADOR";
  const [animaisRaw, lotes] = await Promise.all([
    prisma.animal.findMany({
      where: { status: "ATIVO" },
      orderBy: { brinco: "asc" },
      include: {
        pertinencias: {
          where: { dataFim: null },
          include: { lote: { include: { contrato: { select: { nomeFazenda: true } }, grupoContrato: { select: { nome: true } } } } },
        },
        pesagens: {
          orderBy: { dataPesagem: "desc" },
          take: 1,
        },
      },
    }),
    prisma.lote.findMany({
      where: { ativo: true },
      orderBy: { nome: "asc" },
      include: { contrato: { select: { nomeFazenda: true } }, grupoContrato: { select: { nome: true } } },
    }),
  ]);

  // Serializa Date → string para o client component
  const animais = animaisRaw.map(a => ({
    ...a,
    dataNascimento: a.dataNascimento?.toISOString() ?? null,
    pertinencias: a.pertinencias.map(p => ({
      lote: { id: p.lote.id, nome: p.lote.nome, contrato: p.lote.contrato, grupoContrato: p.lote.grupoContrato },
      dataInicio: p.dataInicio.toISOString(),
      dataFim: p.dataFim?.toISOString() ?? null,
    })),
    pesagens: a.pesagens.map(ps => ({
      id: ps.id,
      pesoKg: ps.pesoKg,
      dataPesagem: ps.dataPesagem.toISOString(),
      gmdPeriodo: ps.gmdPeriodo ?? null,
    })),
  }));

  return <AnimaisManager initialAnimais={animais} lotes={lotes} userRole={userRole} />;
}
