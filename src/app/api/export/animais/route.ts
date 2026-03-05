import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const loteId = searchParams.get("loteId");
    const status = searchParams.get("status");
    const sexo = searchParams.get("sexo");

    const animais = await prisma.animal.findMany({
      where: {
        ...(status && status !== "TODOS" && { status: status as "ATIVO" | "INATIVO" }),
        ...(sexo && sexo !== "TODOS" && { sexo: sexo as "MACHO" | "FEMEA" }),
        ...(loteId && loteId !== "todos" && {
          pertinencias: { some: { loteId, dataFim: null } },
        }),
      },
      include: {
        pertinencias: {
          where: { dataFim: null },
          include: { lote: { include: { propriedade: { select: { nome: true } } } } },
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
        dataNascimento: a.dataNascimento?.toISOString().split("T")[0] ?? "",
        pesoEntradaKg: a.pesoEntradaKg,
        custoAquisicao: a.custoAquisicao,
        tipoEntrada: { COMPRA_EXTERNA: "Compra externa", NASCIMENTO_PROPRIO: "Nascimento próprio", TRANSFERENCIA_INTERNA: "Transferência" }[a.tipoEntrada] ?? a.tipoEntrada,
        origem: a.origem ?? "",
        gta: a.gtaEntrada ?? "",
        loteAtual: pert?.lote.nome ?? "",
        propriedade: pert?.lote.propriedade.nome ?? "",
        status: a.status === "ATIVO" ? "Ativo" : "Inativo",
        observacoes: a.observacoes ?? "",
      };
    });

    return NextResponse.json({ success: true, data: rows, total: rows.length });
  } catch {
    return NextResponse.json({ success: false, error: "Erro ao buscar animais" }, { status: 500 });
  }
}
