import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const loteIds = searchParams.get("loteIds")?.split(",").filter(Boolean) ?? [];
    const statuses = searchParams.get("status")?.split(",").filter(Boolean) ?? [];
    const sexos = searchParams.get("sexo")?.split(",").filter(Boolean) ?? [];

    const animais = await prisma.animal.findMany({
      where: {
        ...(statuses.length > 0 && { status: { in: statuses as ("ATIVO" | "INATIVO")[] } }),
        ...(sexos.length > 0 && { sexo: { in: sexos as ("MACHO" | "FEMEA")[] } }),
        ...(loteIds.length > 0 && {
          pertinencias: { some: { loteId: { in: loteIds }, dataFim: null } },
        }),
      },
      include: {
        pertinencias: {
          where: { dataFim: null },
          include: { lote: { include: { contrato: { select: { nomeFazenda: true } }, grupoContrato: { select: { nome: true } } } } },
          take: 1,
        },
      },
      orderBy: { brinco: "asc" },
    });

    const rows = animais.map((a) => {
      const pert = a.pertinencias[0];
      return {
        brinco: a.brinco,
        rfid: a.rfid ?? "",
        nome: a.nome ?? "",
        raca: a.raca ?? "",
        sexo: a.sexo === "MACHO" ? "Macho" : "Fêmea",
        dataNascimento: a.dataNascimento ? format(a.dataNascimento, "yyyy-MM-dd") : "",
        pesoEntradaKg: a.pesoEntradaKg,
        custoAquisicao: a.custoAquisicao,
        tipoEntrada: { COMPRA_EXTERNA: "Compra externa", NASCIMENTO_PROPRIO: "Nascimento próprio", TRANSFERENCIA_INTERNA: "Transferência" }[a.tipoEntrada] ?? a.tipoEntrada,
        origem: a.origem ?? "",
        gta: a.gtaEntrada ?? "",
        notaFiscal: a.notaFiscal ?? "",
        loteAtual: pert?.lote.nome ?? "",
        fazenda: pert?.lote.contrato?.nomeFazenda ?? pert?.lote.grupoContrato?.nome ?? "",
        status: a.status === "ATIVO" ? "Ativo" : "Inativo",
        observacoes: a.observacoes ?? "",
      };
    });

    return NextResponse.json({ success: true, data: rows, total: rows.length });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao buscar animais" }, { status: 500 });
  }
}
