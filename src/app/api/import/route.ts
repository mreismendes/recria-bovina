/**
 * POST /api/import — Importação em lote de contratos, lotes e animais
 *
 * Recebe array de rows já validadas no frontend.
 * Contratos devem existir (identificados por idContrato).
 * Cria lotes que não existem.
 * Cria animais com pesagem de entrada + pertinência + movimentação.
 * Tudo em transação atômica.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const importRowSchema = z.object({
  contrato: z.string().min(1),
  lote: z.string().min(1),
  brinco: z.string().min(1).max(50),
  rfid: z.string().max(100).optional().nullable(),
  nome: z.string().max(100).optional().nullable(),
  raca: z.string().max(100).optional().nullable(),
  sexo: z.enum(["MACHO", "FEMEA"]),
  dataNascimento: z.string().optional().nullable(),
  pesoEntradaKg: z.number().positive(),
  custoAquisicao: z.number().min(0).default(0),
  tipoEntrada: z.enum(["COMPRA_EXTERNA", "NASCIMENTO_PROPRIO", "TRANSFERENCIA_INTERNA"]).default("COMPRA_EXTERNA"),
  origem: z.string().max(200).optional().nullable(),
  gta: z.string().max(100).optional().nullable(),
  notaFiscal: z.string().max(100).optional().nullable(),
  dataEntrada: z.string().min(1),
  observacoes: z.string().max(500).optional().nullable(),
});

const importSchema = z.object({
  rows: z.array(importRowSchema).min(1, "Envie pelo menos uma linha"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = importSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Dados inválidos", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { rows } = parsed.data;

    const resultado = await prisma.$transaction(async (tx) => {
      const contratoCache = new Map<string, string>();
      const loteCache = new Map<string, string>();

      const criados: { brinco: string; lote: string; contrato: string }[] = [];
      const pulados: { brinco: string; motivo: string }[] = [];
      const lotesCriados = new Set<string>();

      // Pre-load existing contratos
      const contratosExistentes = await tx.contrato.findMany({ where: { ativo: true } });
      for (const c of contratosExistentes) {
        contratoCache.set(c.idContrato.trim().toLowerCase(), c.id);
      }

      // Pre-load existing lotes
      const lotesExistentes = await tx.lote.findMany({
        where: { ativo: true },
        include: { contrato: { select: { idContrato: true } } },
      });
      for (const l of lotesExistentes) {
        const key = `${l.contrato.idContrato.trim().toLowerCase()}|${l.nome.trim().toLowerCase()}`;
        loteCache.set(key, l.id);
      }

      // Pre-load existing brincos
      const brincosExistentes = await tx.animal.findMany({ select: { brinco: true } });
      const brincoSet = new Set(brincosExistentes.map((a) => a.brinco.trim().toLowerCase()));

      // Pre-load existing RFIDs
      const rfidsExistentes = await tx.animal.findMany({ where: { rfid: { not: null } }, select: { rfid: true } });
      const rfidSet = new Set(rfidsExistentes.map((a) => a.rfid!.trim().toLowerCase()));

      for (const row of rows) {
        const brincoNorm = row.brinco.trim();
        const brincoLower = brincoNorm.toLowerCase();

        if (brincoSet.has(brincoLower)) {
          pulados.push({ brinco: brincoNorm, motivo: "Brinco já existe no sistema" });
          continue;
        }

        if (row.rfid) {
          const rfidLower = row.rfid.trim().toLowerCase();
          if (rfidSet.has(rfidLower)) {
            pulados.push({ brinco: brincoNorm, motivo: `RFID ${row.rfid} já existe` });
            continue;
          }
          rfidSet.add(rfidLower);
        }

        // Resolve contrato (must exist)
        const contratoId = row.contrato.trim();
        const contratoKey = contratoId.toLowerCase();
        const ctrId = contratoCache.get(contratoKey);

        if (!ctrId) {
          pulados.push({ brinco: brincoNorm, motivo: `Contrato "${contratoId}" não encontrado` });
          continue;
        }

        // Resolve lote (auto-create if needed)
        const loteNome = row.lote.trim();
        const loteKey = `${contratoKey}|${loteNome.toLowerCase()}`;
        let loteId = loteCache.get(loteKey);

        if (!loteId) {
          const novoLote = await tx.lote.create({
            data: { nome: loteNome, contratoId: ctrId },
          });
          loteId = novoLote.id;
          loteCache.set(loteKey, loteId);
          lotesCriados.add(`${loteNome} (${contratoId})`);
        }

        const dataEntradaDate = new Date(row.dataEntrada);

        const novoAnimal = await tx.animal.create({
          data: {
            brinco: brincoNorm,
            rfid: row.rfid?.trim() || null,
            nome: row.nome?.trim() || null,
            raca: row.raca?.trim() || null,
            sexo: row.sexo,
            dataNascimento: row.dataNascimento ? new Date(row.dataNascimento) : null,
            pesoEntradaKg: row.pesoEntradaKg,
            custoAquisicao: row.custoAquisicao,
            tipoEntrada: row.tipoEntrada,
            origem: row.origem?.trim() || null,
            gtaEntrada: row.gta?.trim() || null,
            notaFiscal: row.notaFiscal?.trim() || null,
            observacoes: row.observacoes?.trim() || null,
          },
        });

        await tx.pesagem.create({
          data: { animalId: novoAnimal.id, dataPesagem: dataEntradaDate, pesoKg: row.pesoEntradaKg, tipo: "ENTRADA" },
        });

        await tx.pertinenciaLote.create({
          data: { animalId: novoAnimal.id, loteId, dataInicio: dataEntradaDate },
        });

        await tx.movimentacao.create({
          data: { animalId: novoAnimal.id, loteDestinoId: loteId, dataMovimentacao: dataEntradaDate, tipo: "ENTRADA_SISTEMA" },
        });

        brincoSet.add(brincoLower);
        criados.push({ brinco: brincoNorm, lote: loteNome, contrato: contratoId });
      }

      return { criados, pulados, lotesCriados: Array.from(lotesCriados) };
    });

    return NextResponse.json({ success: true, data: resultado }, { status: 201 });
  } catch (e) {
    console.error("Erro na importação:", e);
    const msg = e instanceof Error ? e.message : "Erro ao processar importação";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
