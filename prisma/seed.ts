import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "YYYY-MM-DD" as noon UTC (same logic as parseLocalDate in utils.ts) */
function d(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

/** Realistic daily weight gain variance (kg/day) for recria phase */
function gmdVariado(base: number, spread = 0.15): number {
  return base + (Math.random() * 2 - 1) * spread;
}

/** Round to 1 decimal place */
function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ── Breed & name data ────────────────────────────────────────────────────────

const NOMES_NELORE = [
  "Trovão", "Relâmpago", "Ventania", "Tornado", "Faísca",
  "Rastro", "Bravo", "Valente", "Apolo", "Hércules",
];

const NOMES_CRUZADOS = [
  "Bandido", "Capoeira", "Pantanal", "Cerrado", "Sertão",
  "Chapadão", "Ipê", "Jatobá", "Buriti", "Araçá",
];

const NOMES_ANGUS = [
  "Thunder", "Shadow", "Ranger", "Duke", "Maverick",
];

const NOMES_FEMEAS = [
  "Estrela", "Mimosa", "Bonita", "Princesa", "Jóia",
  "Flor", "Pérola", "Aurora", "Safira", "Luna",
];

// ── Animal template type ─────────────────────────────────────────────────────

interface AnimalSeed {
  brinco: string;
  rfid?: string;
  nome: string;
  raca: string;
  sexo: "MACHO" | "FEMEA";
  dataNascimento: string;
  dataEntrada: string;
  pesoEntradaKg: number;
  custoAquisicao: number;
  tipoEntrada: "COMPRA_EXTERNA" | "NASCIMENTO_PROPRIO" | "TRANSFERENCIA_INTERNA";
  origem?: string;
  /** GMD médio para gerar pesagens realistas (kg/dia) */
  gmdBase: number;
}

// ── Main seed function ───────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Iniciando seed com dados de teste...\n");

  // ── Cleanup (dependency order) ──────────────────────────────────────────
  await prisma.carenciaMedicamento.deleteMany();
  await prisma.rateioMedicamento.deleteMany();
  await prisma.rateioSuplemento.deleteMany();
  await prisma.apontamentoMedicamento.deleteMany();
  await prisma.apontamentoSuplemento.deleteMany();
  await prisma.saida.deleteMany();
  await prisma.pesagem.deleteMany();
  await prisma.movimentacao.deleteMany();
  await prisma.pertinenciaLote.deleteMany();
  await prisma.animal.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.lote.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.user.deleteMany();
  console.log("🗑️  Dados anteriores removidos");

  // ── Users ───────────────────────────────────────────────────────────────
  const senhaHash = await bcrypt.hash("senha123", 10);
  await prisma.user.createMany({
    data: [
      { name: "Administrador", email: "admin@fazenda.com", password: senhaHash, role: "ADMIN" },
      { name: "João Gestor", email: "joao@fazenda.com", password: senhaHash, role: "GESTOR" },
      { name: "Maria Operadora", email: "maria@fazenda.com", password: senhaHash, role: "OPERADOR" },
    ],
  });
  console.log("✅ 3 usuários criados");

  // ── Contratos ───────────────────────────────────────────────────────────
  const contratoSantaFe = await prisma.contrato.create({
    data: {
      idContrato: "RCA-2025-001",
      nomeFazenda: "Fazenda Santa Fé",
      observacoes: "Parceria agrosilvopastoral — Uberaba/MG",
    },
  });

  const contratoBelaVista = await prisma.contrato.create({
    data: {
      idContrato: "RCA-2025-002",
      nomeFazenda: "Fazenda Bela Vista",
      observacoes: "Recria intensiva a pasto — Uberlândia/MG",
    },
  });

  const contratoSerraDourada = await prisma.contrato.create({
    data: {
      idContrato: "RCA-2026-001",
      nomeFazenda: "Fazenda Serra Dourada",
      observacoes: "Semiconfinamento — Araguari/MG",
    },
  });
  console.log("✅ 3 contratos criados");

  // ── Lotes ───────────────────────────────────────────────────────────────

  // Santa Fé: 3 lotes
  const loteSfA = await prisma.lote.create({
    data: { nome: "Lote A — Garrotes Nelore", descricao: "Nelore PO, compra outubro/2025, 230-270 kg", contratoId: contratoSantaFe.id },
  });
  const loteSfB = await prisma.lote.create({
    data: { nome: "Lote B — Garrotes Cruzados", descricao: "Nelore x Angus, compra novembro/2025, 210-250 kg", contratoId: contratoSantaFe.id },
  });
  const loteSfQ = await prisma.lote.create({
    data: { nome: "Lote Q — Quarentena", descricao: "Lote transitório para novos ingressos", contratoId: contratoSantaFe.id },
  });

  // Bela Vista: 3 lotes
  const loteBvC = await prisma.lote.create({
    data: { nome: "Lote C — Nelore Recria", descricao: "Nelore PO recria a pasto, 200-260 kg", contratoId: contratoBelaVista.id },
  });
  const loteBvD = await prisma.lote.create({
    data: { nome: "Lote D — Angus Puro", descricao: "Angus PO, compra dezembro/2025, 220-280 kg", contratoId: contratoBelaVista.id },
  });
  const loteBvE = await prisma.lote.create({
    data: { nome: "Lote E — Novilhas", descricao: "Novilhas Nelore x Angus, recria, 180-230 kg", contratoId: contratoBelaVista.id },
  });

  // Serra Dourada: 2 lotes
  const loteSdF = await prisma.lote.create({
    data: { nome: "Lote F — Semiconfinamento 1", descricao: "Garrotes semiconfinamento lote jan/2026", contratoId: contratoSerraDourada.id },
  });
  const loteSdG = await prisma.lote.create({
    data: { nome: "Lote G — Semiconfinamento 2", descricao: "Garrotes semiconfinamento lote fev/2026", contratoId: contratoSerraDourada.id },
  });
  console.log("✅ 8 lotes criados");

  // ── Products (supplements & medications) ────────────────────────────────
  await prisma.produto.createMany({
    data: [
      { nome: "Sal Mineral Fosbovi 40", tipo: "SUPLEMENTO_MINERAL", fabricante: "DSM", unidadeMedida: "kg", precoUnitario: 4.20 },
      { nome: "Proteinado Seco 45%", tipo: "SUPLEMENTO_PROTEICO", fabricante: "Matsuda", unidadeMedida: "kg", precoUnitario: 3.80 },
      { nome: "Ração Engorda 22%", tipo: "SUPLEMENTO_ENERGETICO", fabricante: "Guabi", unidadeMedida: "kg", precoUnitario: 2.50 },
      { nome: "Ivermectina 1%", tipo: "VERMIFUGO", fabricante: "Merial", principioAtivo: "Ivermectina", viaAdministracao: "Subcutânea", carenciaDias: 35, unidadeMedida: "mL", precoUnitario: 0.45 },
      { nome: "Dectomax", tipo: "VERMIFUGO", fabricante: "Zoetis", principioAtivo: "Doramectina", viaAdministracao: "Subcutânea", carenciaDias: 42, unidadeMedida: "mL", precoUnitario: 0.80 },
      { nome: "Vacina Aftosa", tipo: "VACINA", fabricante: "Vallée", carenciaDias: 0, unidadeMedida: "dose", precoUnitario: 2.50 },
    ],
  });
  console.log("✅ 6 produtos criados");

  // ── Animal definitions by lot ───────────────────────────────────────────

  // Lote A — Santa Fé: 6 garrotes Nelore (entered Oct 2025)
  const animaisLoteSfA: AnimalSeed[] = [
    { brinco: "SF-001", rfid: "982000411000001", nome: NOMES_NELORE[0], raca: "Nelore", sexo: "MACHO", dataNascimento: "2023-08-15", dataEntrada: "2025-10-10", pesoEntradaKg: 245, custoAquisicao: 3200, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Boa Esperança — Uberaba/MG", gmdBase: 0.85 },
    { brinco: "SF-002", rfid: "982000411000002", nome: NOMES_NELORE[1], raca: "Nelore", sexo: "MACHO", dataNascimento: "2023-07-20", dataEntrada: "2025-10-10", pesoEntradaKg: 260, custoAquisicao: 3350, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Boa Esperança — Uberaba/MG", gmdBase: 0.90 },
    { brinco: "SF-003", rfid: "982000411000003", nome: NOMES_NELORE[2], raca: "Nelore", sexo: "MACHO", dataNascimento: "2023-09-01", dataEntrada: "2025-10-10", pesoEntradaKg: 232, custoAquisicao: 3050, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Boa Esperança — Uberaba/MG", gmdBase: 0.78 },
    { brinco: "SF-004", rfid: "982000411000004", nome: NOMES_NELORE[3], raca: "Nelore", sexo: "MACHO", dataNascimento: "2023-06-10", dataEntrada: "2025-10-10", pesoEntradaKg: 270, custoAquisicao: 3500, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda São José — Conceição das Alagoas/MG", gmdBase: 0.95 },
    { brinco: "SF-005", rfid: "982000411000005", nome: NOMES_NELORE[4], raca: "Nelore", sexo: "MACHO", dataNascimento: "2023-10-12", dataEntrada: "2025-10-10", pesoEntradaKg: 238, custoAquisicao: 3100, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda São José — Conceição das Alagoas/MG", gmdBase: 0.82 },
    { brinco: "SF-006", rfid: "982000411000006", nome: NOMES_NELORE[5], raca: "Nelore", sexo: "MACHO", dataNascimento: "2023-08-28", dataEntrada: "2025-10-10", pesoEntradaKg: 252, custoAquisicao: 3280, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda São José — Conceição das Alagoas/MG", gmdBase: 0.88 },
  ];

  // Lote B — Santa Fé: 5 garrotes cruzados (entered Nov 2025)
  const animaisLoteSfB: AnimalSeed[] = [
    { brinco: "SF-011", rfid: "982000411000011", nome: NOMES_CRUZADOS[0], raca: "Nelore x Angus", sexo: "MACHO", dataNascimento: "2023-09-05", dataEntrada: "2025-11-05", pesoEntradaKg: 215, custoAquisicao: 3000, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Primavera — Araxá/MG", gmdBase: 0.95 },
    { brinco: "SF-012", rfid: "982000411000012", nome: NOMES_CRUZADOS[1], raca: "Nelore x Angus", sexo: "MACHO", dataNascimento: "2023-08-18", dataEntrada: "2025-11-05", pesoEntradaKg: 240, custoAquisicao: 3250, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Primavera — Araxá/MG", gmdBase: 1.00 },
    { brinco: "SF-013", rfid: "982000411000013", nome: NOMES_CRUZADOS[2], raca: "Nelore x Angus", sexo: "MACHO", dataNascimento: "2023-10-20", dataEntrada: "2025-11-05", pesoEntradaKg: 210, custoAquisicao: 2900, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Primavera — Araxá/MG", gmdBase: 0.92 },
    { brinco: "SF-014", rfid: "982000411000014", nome: NOMES_CRUZADOS[3], raca: "Nelore x Angus", sexo: "MACHO", dataNascimento: "2023-07-30", dataEntrada: "2025-11-05", pesoEntradaKg: 248, custoAquisicao: 3400, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Aurora — Patrocínio/MG", gmdBase: 1.05 },
    { brinco: "SF-015", rfid: "982000411000015", nome: NOMES_CRUZADOS[4], raca: "Nelore x Angus", sexo: "MACHO", dataNascimento: "2023-11-02", dataEntrada: "2025-11-05", pesoEntradaKg: 222, custoAquisicao: 3100, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Aurora — Patrocínio/MG", gmdBase: 0.88 },
  ];

  // Lote Q — Santa Fé: 2 quarantine animals (entered recently, Jan 2026)
  const animaisLoteSfQ: AnimalSeed[] = [
    { brinco: "SF-021", nome: NOMES_NELORE[6], raca: "Nelore", sexo: "MACHO", dataNascimento: "2024-02-10", dataEntrada: "2026-01-20", pesoEntradaKg: 198, custoAquisicao: 2700, tipoEntrada: "COMPRA_EXTERNA", origem: "Leilão Araguari/MG", gmdBase: 0.75 },
    { brinco: "SF-022", nome: NOMES_NELORE[7], raca: "Nelore", sexo: "MACHO", dataNascimento: "2024-03-05", dataEntrada: "2026-01-20", pesoEntradaKg: 185, custoAquisicao: 2500, tipoEntrada: "COMPRA_EXTERNA", origem: "Leilão Araguari/MG", gmdBase: 0.72 },
  ];

  // Lote C — Bela Vista: 5 Nelore recria (entered Sep 2025)
  const animaisLoteBvC: AnimalSeed[] = [
    { brinco: "BV-001", rfid: "982000422000001", nome: NOMES_NELORE[8], raca: "Nelore", sexo: "MACHO", dataNascimento: "2023-05-12", dataEntrada: "2025-09-15", pesoEntradaKg: 205, custoAquisicao: 2800, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Monte Alegre — Uberlândia/MG", gmdBase: 0.80 },
    { brinco: "BV-002", rfid: "982000422000002", nome: NOMES_NELORE[9], raca: "Nelore", sexo: "MACHO", dataNascimento: "2023-06-20", dataEntrada: "2025-09-15", pesoEntradaKg: 218, custoAquisicao: 2950, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Monte Alegre — Uberlândia/MG", gmdBase: 0.85 },
    { brinco: "BV-003", rfid: "982000422000003", nome: NOMES_CRUZADOS[5], raca: "Nelore", sexo: "MACHO", dataNascimento: "2023-07-08", dataEntrada: "2025-09-15", pesoEntradaKg: 225, custoAquisicao: 3050, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Monte Alegre — Uberlândia/MG", gmdBase: 0.88 },
    { brinco: "BV-004", rfid: "982000422000004", nome: NOMES_CRUZADOS[6], raca: "Nelore", sexo: "MACHO", dataNascimento: "2023-04-25", dataEntrada: "2025-09-15", pesoEntradaKg: 240, custoAquisicao: 3200, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Cachoeira — Ituiutaba/MG", gmdBase: 0.82 },
    { brinco: "BV-005", rfid: "982000422000005", nome: NOMES_CRUZADOS[7], raca: "Nelore", sexo: "MACHO", dataNascimento: "2023-08-30", dataEntrada: "2025-09-15", pesoEntradaKg: 200, custoAquisicao: 2750, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Cachoeira — Ituiutaba/MG", gmdBase: 0.78 },
  ];

  // Lote D — Bela Vista: 4 Angus puros (entered Dec 2025)
  const animaisLoteBvD: AnimalSeed[] = [
    { brinco: "BV-011", rfid: "982000422000011", nome: NOMES_ANGUS[0], raca: "Angus", sexo: "MACHO", dataNascimento: "2023-09-15", dataEntrada: "2025-12-01", pesoEntradaKg: 265, custoAquisicao: 4200, tipoEntrada: "COMPRA_EXTERNA", origem: "Cabanha Black River — Tupã/SP", gmdBase: 1.10 },
    { brinco: "BV-012", rfid: "982000422000012", nome: NOMES_ANGUS[1], raca: "Angus", sexo: "MACHO", dataNascimento: "2023-10-08", dataEntrada: "2025-12-01", pesoEntradaKg: 250, custoAquisicao: 4000, tipoEntrada: "COMPRA_EXTERNA", origem: "Cabanha Black River — Tupã/SP", gmdBase: 1.05 },
    { brinco: "BV-013", rfid: "982000422000013", nome: NOMES_ANGUS[2], raca: "Angus", sexo: "MACHO", dataNascimento: "2023-08-22", dataEntrada: "2025-12-01", pesoEntradaKg: 278, custoAquisicao: 4400, tipoEntrada: "COMPRA_EXTERNA", origem: "Cabanha Black River — Tupã/SP", gmdBase: 1.15 },
    { brinco: "BV-014", rfid: "982000422000014", nome: NOMES_ANGUS[3], raca: "Angus", sexo: "MACHO", dataNascimento: "2023-11-01", dataEntrada: "2025-12-01", pesoEntradaKg: 235, custoAquisicao: 3800, tipoEntrada: "COMPRA_EXTERNA", origem: "Cabanha Black River — Tupã/SP", gmdBase: 1.00 },
  ];

  // Lote E — Bela Vista: 4 novilhas (entered Nov 2025)
  const animaisLoteBvE: AnimalSeed[] = [
    { brinco: "BV-021", rfid: "982000422000021", nome: NOMES_FEMEAS[0], raca: "Nelore x Angus", sexo: "FEMEA", dataNascimento: "2023-10-10", dataEntrada: "2025-11-15", pesoEntradaKg: 190, custoAquisicao: 2600, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Esperança — Monte Carmelo/MG", gmdBase: 0.70 },
    { brinco: "BV-022", rfid: "982000422000022", nome: NOMES_FEMEAS[1], raca: "Nelore x Angus", sexo: "FEMEA", dataNascimento: "2023-09-25", dataEntrada: "2025-11-15", pesoEntradaKg: 200, custoAquisicao: 2750, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Esperança — Monte Carmelo/MG", gmdBase: 0.72 },
    { brinco: "BV-023", rfid: "982000422000023", nome: NOMES_FEMEAS[2], raca: "Nelore", sexo: "FEMEA", dataNascimento: "2023-11-18", dataEntrada: "2025-11-15", pesoEntradaKg: 182, custoAquisicao: 2500, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Esperança — Monte Carmelo/MG", gmdBase: 0.68 },
    { brinco: "BV-024", rfid: "982000422000024", nome: NOMES_FEMEAS[3], raca: "Nelore x Angus", sexo: "FEMEA", dataNascimento: "2023-08-05", dataEntrada: "2025-11-15", pesoEntradaKg: 210, custoAquisicao: 2900, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Esperança — Monte Carmelo/MG", gmdBase: 0.75 },
  ];

  // Lote F — Serra Dourada: 4 semiconfinamento (entered Jan 2026)
  const animaisLoteSdF: AnimalSeed[] = [
    { brinco: "SD-001", rfid: "982000433000001", nome: NOMES_CRUZADOS[8], raca: "Nelore x Brahman", sexo: "MACHO", dataNascimento: "2023-06-15", dataEntrada: "2026-01-10", pesoEntradaKg: 310, custoAquisicao: 4100, tipoEntrada: "COMPRA_EXTERNA", origem: "Leilão Elite Pecuária — Uberaba/MG", gmdBase: 1.20 },
    { brinco: "SD-002", rfid: "982000433000002", nome: NOMES_CRUZADOS[9], raca: "Nelore x Brahman", sexo: "MACHO", dataNascimento: "2023-05-20", dataEntrada: "2026-01-10", pesoEntradaKg: 325, custoAquisicao: 4300, tipoEntrada: "COMPRA_EXTERNA", origem: "Leilão Elite Pecuária — Uberaba/MG", gmdBase: 1.25 },
    { brinco: "SD-003", nome: NOMES_NELORE[0] + " II", raca: "Nelore", sexo: "MACHO", dataNascimento: "2023-07-10", dataEntrada: "2026-01-10", pesoEntradaKg: 295, custoAquisicao: 3900, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Cachoeira — Ituiutaba/MG", gmdBase: 1.10 },
    { brinco: "SD-004", nome: NOMES_NELORE[1] + " II", raca: "Nelore", sexo: "MACHO", dataNascimento: "2023-08-02", dataEntrada: "2026-01-10", pesoEntradaKg: 288, custoAquisicao: 3800, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Cachoeira — Ituiutaba/MG", gmdBase: 1.08 },
  ];

  // Lote G — Serra Dourada: 3 semiconfinamento (entered Feb 2026)
  const animaisLoteSdG: AnimalSeed[] = [
    { brinco: "SD-011", rfid: "982000433000011", nome: NOMES_FEMEAS[4], raca: "Nelore x Angus", sexo: "FEMEA", dataNascimento: "2023-12-01", dataEntrada: "2026-02-05", pesoEntradaKg: 220, custoAquisicao: 3100, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Sol Nascente — Araguari/MG", gmdBase: 0.80 },
    { brinco: "SD-012", rfid: "982000433000012", nome: NOMES_FEMEAS[5], raca: "Nelore", sexo: "FEMEA", dataNascimento: "2024-01-15", dataEntrada: "2026-02-05", pesoEntradaKg: 205, custoAquisicao: 2850, tipoEntrada: "COMPRA_EXTERNA", origem: "Fazenda Sol Nascente — Araguari/MG", gmdBase: 0.75 },
    { brinco: "SD-013", rfid: "982000433000013", nome: NOMES_ANGUS[4], raca: "Angus", sexo: "MACHO", dataNascimento: "2023-10-25", dataEntrada: "2026-02-05", pesoEntradaKg: 260, custoAquisicao: 4000, tipoEntrada: "COMPRA_EXTERNA", origem: "Cabanha Black River — Tupã/SP", gmdBase: 1.12 },
  ];

  // ── Weighing schedule: dates for periodic pesagens ──────────────────────
  // We generate pesagens every ~30 days from entry date up to Feb 2026

  const CUTOFF_DATE = d("2026-03-01"); // don't create pesagens after this date

  /** Generate weighing dates every ~intervalDays from entry until cutoff */
  function pesagemDates(entryDate: string, intervalDays = 30): string[] {
    const dates: string[] = [];
    const entry = d(entryDate);
    let current = new Date(entry.getTime());
    current.setUTCDate(current.getUTCDate() + intervalDays);
    while (current < CUTOFF_DATE) {
      const yyyy = current.getUTCFullYear();
      const mm = String(current.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(current.getUTCDate()).padStart(2, "0");
      dates.push(`${yyyy}-${mm}-${dd}`);
      current.setUTCDate(current.getUTCDate() + intervalDays);
    }
    return dates;
  }

  // ── Create animals with entry records + periodic pesagens ───────────────

  interface LoteBatch {
    loteId: string;
    animais: AnimalSeed[];
  }

  const batches: LoteBatch[] = [
    { loteId: loteSfA.id, animais: animaisLoteSfA },
    { loteId: loteSfB.id, animais: animaisLoteSfB },
    { loteId: loteSfQ.id, animais: animaisLoteSfQ },
    { loteId: loteBvC.id, animais: animaisLoteBvC },
    { loteId: loteBvD.id, animais: animaisLoteBvD },
    { loteId: loteBvE.id, animais: animaisLoteBvE },
    { loteId: loteSdF.id, animais: animaisLoteSdF },
    { loteId: loteSdG.id, animais: animaisLoteSdG },
  ];

  let totalAnimais = 0;
  let totalPesagens = 0;

  for (const batch of batches) {
    for (const a of batch.animais) {
      const dataEntradaDate = d(a.dataEntrada);

      // Create animal
      const animal = await prisma.animal.create({
        data: {
          brinco: a.brinco,
          rfid: a.rfid ?? null,
          nome: a.nome,
          raca: a.raca,
          sexo: a.sexo,
          dataNascimento: a.dataNascimento ? d(a.dataNascimento) : null,
          dataEntrada: dataEntradaDate,
          pesoEntradaKg: a.pesoEntradaKg,
          custoAquisicao: a.custoAquisicao,
          tipoEntrada: a.tipoEntrada,
          origem: a.origem ?? null,
        },
      });

      // Create entry pesagem
      await prisma.pesagem.create({
        data: {
          animalId: animal.id,
          dataPesagem: dataEntradaDate,
          pesoKg: a.pesoEntradaKg,
          tipo: "ENTRADA",
        },
      });

      // Create pertinência (active — dataFim = null)
      await prisma.pertinenciaLote.create({
        data: {
          animalId: animal.id,
          loteId: batch.loteId,
          dataInicio: dataEntradaDate,
        },
      });

      // Create movimentação (audit)
      await prisma.movimentacao.create({
        data: {
          animalId: animal.id,
          loteDestinoId: batch.loteId,
          dataMovimentacao: dataEntradaDate,
          tipo: "ENTRADA_SISTEMA",
        },
      });

      totalAnimais++;

      // Generate periodic pesagens with realistic weight progression
      const dates = pesagemDates(a.dataEntrada, 30);
      let lastPeso = a.pesoEntradaKg;
      let lastDate = dataEntradaDate;

      for (const dateStr of dates) {
        const pesDate = d(dateStr);
        const diasPeriodo = Math.round(
          (pesDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const gmd = gmdVariado(a.gmdBase);
        const novoPeso = r1(lastPeso + gmd * diasPeriodo);
        const gmdPeriodo = r1((novoPeso - lastPeso) / diasPeriodo * 100) / 100;

        await prisma.pesagem.create({
          data: {
            animalId: animal.id,
            dataPesagem: pesDate,
            pesoKg: novoPeso,
            tipo: "PERIODICA",
            gmdPeriodo,
            diasPeriodo,
            jejumHoras: 12,
            responsavel: "João Gestor",
          },
        });

        totalPesagens++;
        lastPeso = novoPeso;
        lastDate = pesDate;
      }
    }
  }

  console.log(`✅ ${totalAnimais} animais criados`);
  console.log(`✅ ${totalAnimais} pesagens de entrada criadas`);
  console.log(`✅ ${totalPesagens} pesagens periódicas criadas`);

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log("\n🐄 Seed concluído!");
  console.log("📊 Resumo:");
  console.log("   • 3 contratos (Santa Fé, Bela Vista, Serra Dourada)");
  console.log("   • 8 lotes distribuídos entre os contratos");
  console.log(`   • ${totalAnimais} animais com histórico de pesagens`);
  console.log(`   • ${totalAnimais + totalPesagens} pesagens totais (entrada + periódicas)`);
  console.log("   • 6 produtos (suplementos e medicamentos)");
  console.log("🔑 Acesso: admin@fazenda.com / senha123");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
