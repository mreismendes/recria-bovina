/**
 * src/lib/validations/index.ts
 * Schemas Zod compartilhados entre frontend (react-hook-form) e backend (API routes).
 */

import { z } from "zod";
import { parseBrNumber } from "@/lib/utils";

/** Preprocessor that converts Brazilian-formatted number strings to JS numbers. */
function brNumber(val: unknown): unknown {
  if (val === null || val === undefined || val === "") return undefined;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const num = parseBrNumber(val);
    return isNaN(num) ? val : num;
  }
  return val;
}

// ─────────────────────────────────────────────────────────────────────────────
// ANIMAL
// ─────────────────────────────────────────────────────────────────────────────

export const animalSchema = z.object({
  brinco: z.string().min(1, "Brinco é obrigatório").max(50),
  rfid: z.string().max(100).optional().nullable(),
  nome: z.string().max(100).optional().nullable(),
  raca: z.string().max(100).optional().nullable(),
  sexo: z.enum(["MACHO", "FEMEA"]),
  dataNascimento: z.string().optional().nullable(),
  pesoEntradaKg: z.preprocess(brNumber, z.number({ required_error: "Peso de entrada é obrigatório" }).positive("Peso deve ser maior que zero")),
  custoAquisicao: z.preprocess(brNumber, z.number().min(0).default(0)),
  tipoEntrada: z.enum(["COMPRA_EXTERNA", "NASCIMENTO_PROPRIO", "TRANSFERENCIA_INTERNA"]),
  origem: z.string().max(200).optional().nullable(),
  gtaEntrada: z.string().max(100).optional().nullable(),
  notaFiscal: z.string().max(100).optional().nullable(),
  loteId: z.string().min(1, "Lote é obrigatório"),
  dataEntrada: z.string().min(1, "Data de entrada é obrigatória"),
  observacoes: z.string().max(500).optional().nullable(),
});

export type AnimalFormData = z.infer<typeof animalSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// MOVIMENTAÇÃO INTERNA
// ─────────────────────────────────────────────────────────────────────────────

export const movimentacaoSchema = z.object({
  animalIds: z.array(z.string()).min(1, "Selecione ao menos um animal"),
  loteDestinoId: z.string().min(1, "Lote de destino é obrigatório"),
  dataMovimentacao: z.string().min(1, "Data é obrigatória"),
  motivo: z.string().max(300).optional().nullable(),
  observacoes: z.string().max(500).optional().nullable(),
});

export type MovimentacaoFormData = z.infer<typeof movimentacaoSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// SAÍDA
// ─────────────────────────────────────────────────────────────────────────────

export const saidaSchema = z
  .object({
    animalIds: z.array(z.string()).min(1, "Selecione ao menos um animal"),
    tipoSaida: z.enum(["VENDA", "TRANSFERENCIA_EXTERNA", "MORTE", "DESCARTE"]),
    dataSaida: z.string().min(1, "Data de saída é obrigatória"),
    pesoSaidaKg: z.preprocess(brNumber, z.number().positive().optional().nullable()),
    valorVenda: z.preprocess(brNumber, z.number().min(0).optional().nullable()),
    comprador: z.string().max(200).optional().nullable(),
    cnpjCpf: z.string().max(20).optional().nullable(),
    municipioDestino: z.string().max(200).optional().nullable(),
    gtaSaida: z.string().max(100).optional().nullable(),
    causaMorte: z.string().max(300).optional().nullable(),
    observacoes: z.string().max(500).optional().nullable(),
  })
  .refine(
    (data) => data.tipoSaida !== "MORTE" || !!data.causaMorte,
    { message: "Causa da morte é obrigatória quando tipo = Morte", path: ["causaMorte"] }
  )
  .refine(
    (data) => data.tipoSaida !== "VENDA" || (data.pesoSaidaKg != null && data.valorVenda != null),
    { message: "Peso e valor de venda são obrigatórios para venda", path: ["valorVenda"] }
  );

export type SaidaFormData = z.infer<typeof saidaSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PESAGEM
// ─────────────────────────────────────────────────────────────────────────────

export const pesagemSchema = z.object({
  animalId: z.string().min(1),
  dataPesagem: z.string().min(1, "Data é obrigatória"),
  pesoKg: z.preprocess(brNumber, z.number({ required_error: "Peso é obrigatório" }).positive("Peso deve ser maior que zero")),
  jejumHoras: z.preprocess(brNumber, z.number().min(0).max(72).optional().nullable()),
  responsavel: z.string().max(100).optional().nullable(),
  observacoes: z.string().max(500).optional().nullable(),
});

export type PesagemFormData = z.infer<typeof pesagemSchema>;

export const sessaoPesagemSchema = z.object({
  loteId: z.string().min(1, "Lote é obrigatório"),
  dataPesagem: z.string().min(1, "Data é obrigatória"),
  pesagens: z.array(
    z.object({
      animalId: z.string(),
      pesoKg: z.number().positive(),
      jejumHoras: z.number().optional().nullable(),
    })
  ).min(1, "Informe ao menos uma pesagem"),
  responsavel: z.string().max(100).optional().nullable(),
  observacoes: z.string().max(500).optional().nullable(),
});

export type SessaoPesagemFormData = z.infer<typeof sessaoPesagemSchema>;

export const editPesagemSchema = z.object({
  pesoKg: z.preprocess(brNumber, z.number({ required_error: "Peso é obrigatório" }).positive("Peso deve ser maior que zero")),
  jejumHoras: z.preprocess(brNumber, z.number().min(0).max(72).optional().nullable()),
  responsavel: z.string().max(100).optional().nullable(),
  observacoes: z.string().max(500).optional().nullable(),
  motivoAlteracao: z.string().min(10, "Justificativa deve ter ao menos 10 caracteres").max(500),
});

export type EditPesagemFormData = z.infer<typeof editPesagemSchema>;

export const deletePesagemSchema = z.object({
  motivoAlteracao: z.string().min(10, "Justificativa deve ter ao menos 10 caracteres").max(500),
});

export type DeletePesagemFormData = z.infer<typeof deletePesagemSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// APONTAMENTO SUPLEMENTO
// ─────────────────────────────────────────────────────────────────────────────

export const apontamentoSuplementoSchema = z.object({
  loteId: z.string().min(1, "Lote é obrigatório"),
  produtoId: z.string().min(1, "Produto é obrigatório"),
  dataApontamento: z.string().min(1, "Data é obrigatória"),
  quantidadeTotal: z.preprocess(brNumber, z.number().positive("Quantidade deve ser maior que zero")),
  custoTotal: z.preprocess(brNumber, z.number().min(0, "Custo não pode ser negativo")),
  modoFornecimento: z.string().max(100).optional().nullable(),
  observacoes: z.string().max(500).optional().nullable(),
});

export type ApontamentoSuplementoFormData = z.infer<typeof apontamentoSuplementoSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// APONTAMENTO MEDICAMENTO
// ─────────────────────────────────────────────────────────────────────────────

export const apontamentoMedicamentoSchema = z.object({
  loteId: z.string().min(1, "Lote é obrigatório"),
  produtoId: z.string().min(1, "Medicamento é obrigatório"),
  dataApontamento: z.string().min(1, "Data é obrigatória"),
  doseTotalAplicada: z.preprocess(brNumber, z.number().positive("Dose deve ser maior que zero")),
  unidadeDose: z.string().min(1).default("mL"),
  custoTotal: z.preprocess(brNumber, z.number().min(0)),
  loteProduto: z.string().max(100).optional().nullable(),
  validade: z.string().optional().nullable(),
  carenciaDias: z.number().int().min(0, "Carência não pode ser negativa"),
  responsavelTecnico: z.string().max(100).optional().nullable(),
  crmv: z.string().max(50).optional().nullable(),
  observacoes: z.string().max(500).optional().nullable(),
});

export type ApontamentoMedicamentoFormData = z.infer<typeof apontamentoMedicamentoSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// PRODUTO
// ─────────────────────────────────────────────────────────────────────────────

export const produtoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(200),
  tipo: z.enum([
    "SUPLEMENTO_MINERAL", "SUPLEMENTO_PROTEICO", "SUPLEMENTO_ENERGETICO", "SUPLEMENTO_MISTO",
    "VERMIFUGO", "CARRAPATICIDA", "VACINA", "ANTIBIOTICO", "VITAMINA", "OUTRO_MEDICAMENTO",
  ]),
  fabricante: z.string().max(200).optional().nullable(),
  principioAtivo: z.string().max(200).optional().nullable(),
  viaAdministracao: z.string().max(100).optional().nullable(),
  carenciaDias: z.number().int().min(0).optional().nullable(),
  unidadeMedida: z.string().min(1).default("kg"),
  precoUnitario: z.preprocess(brNumber, z.number().min(0).optional().nullable()),
  observacoes: z.string().max(500).optional().nullable(),
});

export type ProdutoFormData = z.infer<typeof produtoSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// FAZENDA
// ─────────────────────────────────────────────────────────────────────────────

export const fazendaSchema = z.object({
  nome: z.string().min(1, "Nome da fazenda é obrigatório").max(200),
  proprietario: z.string().max(200).optional().nullable(),
  comunidade: z.string().max(200).optional().nullable(),
  cidade: z.string().max(200).optional().nullable(),
  estado: z.string().max(2).optional().nullable(),
  areaHectares: z.preprocess(brNumber, z.number().positive("Área deve ser positiva").optional().nullable()),
  observacoes: z.string().max(500).optional().nullable(),
});

export type FazendaFormData = z.infer<typeof fazendaSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// GRUPO DE CONTRATOS
// ─────────────────────────────────────────────────────────────────────────────

export const grupoContratoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(200),
  descricao: z.string().max(500).optional().nullable(),
});

export type GrupoContratoFormData = z.infer<typeof grupoContratoSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// LOTE
// ─────────────────────────────────────────────────────────────────────────────

export const loteSchema = z
  .object({
    nome: z.string().min(1, "Nome é obrigatório").max(200),
    descricao: z.string().max(500).optional().nullable(),
    contratoId: z.string().optional().nullable(),
    grupoContratoId: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      const hasContrato = !!data.contratoId;
      const hasGrupo = !!data.grupoContratoId;
      return hasContrato !== hasGrupo; // XOR: exactly one must be set
    },
    { message: "Informe um Contrato ou um Grupo de Contratos (não ambos)", path: ["contratoId"] }
  );

export type LoteFormData = z.infer<typeof loteSchema>;
