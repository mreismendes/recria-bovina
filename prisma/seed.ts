/**
 * prisma/seed.ts
 * Dados de exemplo para desenvolvimento e demonstração.
 * Execução: npm run db:seed
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Iniciando seed...");

  // ── Limpar dados existentes (ordem respeitando FK) ──────────────────────────
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
  await prisma.piquete.deleteMany();
  await prisma.lote.deleteMany();
  await prisma.propriedade.deleteMany();
  await prisma.user.deleteMany();

  // ── Usuários ────────────────────────────────────────────────────────────────
  const senhaHash = await bcrypt.hash("senha123", 10);

  await prisma.user.createMany({
    data: [
      { name: "Administrador", email: "admin@fazenda.com", password: senhaHash, role: "ADMIN" },
      { name: "João Gestor",   email: "joao@fazenda.com",  password: senhaHash, role: "GESTOR" },
      { name: "Maria Operadora", email: "maria@fazenda.com", password: senhaHash, role: "OPERADOR" },
    ],
  });
  console.log("✅ Usuários criados");

  // ── Propriedade ─────────────────────────────────────────────────────────────
  const fazenda = await prisma.propriedade.create({
    data: {
      nome: "Fazenda Santa Fé",
      cnpjCpf: "12.345.678/0001-99",
      municipio: "Uberaba",
      estado: "MG",
    },
  });
  console.log("✅ Propriedade criada");

  // ── Piquetes ─────────────────────────────────────────────────────────────────
  await prisma.piquete.createMany({
    data: [
      { nome: "Piquete 01 — Brachiaria",  areaHectares: 8.5,  propriedadeId: fazenda.id },
      { nome: "Piquete 02 — Panicum",     areaHectares: 12.0, propriedadeId: fazenda.id },
      { nome: "Piquete 03 — Tifton",      areaHectares: 6.0,  propriedadeId: fazenda.id },
      { nome: "Piquete 04 — Quarentena",  areaHectares: 2.0,  propriedadeId: fazenda.id },
      { nome: "Curral de Manejo",         areaHectares: 0.5,  propriedadeId: fazenda.id },
    ],
  });
  console.log("✅ Piquetes criados");

  // ── Lotes ────────────────────────────────────────────────────────────────────
  const loteA = await prisma.lote.create({
    data: { nome: "Lote A — Garrotes Nelore", descricao: "Nelore PO, compra outubro/2025, 230-270 kg", propriedadeId: fazenda.id },
  });
  const loteB = await prisma.lote.create({
    data: { nome: "Lote B — Garrotes Cruzados", descricao: "Nelore x Angus, compra novembro/2025, 210-250 kg", propriedadeId: fazenda.id },
  });
  const loteQ = await prisma.lote.create({
    data: { nome: "Lote Q — Quarentena", descricao: "Lote transitório para novos ingressos", propriedadeId: fazenda.id },
  });
  console.log("✅ Lotes criados");

  // ── Produtos ─────────────────────────────────────────────────────────────────
  const supMineral = await prisma.produto.create({
    data: { nome: "Mineral Proteico 30%", tipo: "SUPLEMENTO_PROTEICO", unidadeMedida: "kg", precoUnitario: 3.20 },
  });
  const supMineralBasico = await prisma.produto.create({
    data: { nome: "Sal Mineral Branco", tipo: "SUPLEMENTO_MINERAL", unidadeMedida: "kg", precoUnitario: 2.10 },
  });
  const vermifugo = await prisma.produto.create({
    data: { nome: "Ivermectina 1% Injetável", tipo: "VERMIFUGO", principioAtivo: "Ivermectina", viaAdministracao: "Subcutânea", carenciaDias: 28, unidadeMedida: "mL", precoUnitario: 0.95 },
  });
  const carrapaticida = await prisma.produto.create({
    data: { nome: "Cipermetrina 15% Pour-on", tipo: "CARRAPATICIDA", principioAtivo: "Cipermetrina", viaAdministracao: "Pour-on", carenciaDias: 14, unidadeMedida: "mL", precoUnitario: 0.45 },
  });
  const vacAfto = await prisma.produto.create({
    data: { nome: "Vacina Febre Aftosa", tipo: "VACINA", principioAtivo: "Vírus aftosa inativado", viaAdministracao: "Intramuscular", carenciaDias: 0, unidadeMedida: "dose", precoUnitario: 2.80 },
  });
  console.log("✅ Produtos criados");

  // ── Animais — Lote A (10 garrotes Nelore) ────────────────────────────────────
  const hoje = new Date();
  const dataEntradaA = subDays(hoje, 90); // entraram há 90 dias

  const animaisLoteAData = [
    { brinco: "NE-001", raca: "Nelore PO", pesoEntradaKg: 242, custoAquisicao: 2420 },
    { brinco: "NE-002", raca: "Nelore PO", pesoEntradaKg: 258, custoAquisicao: 2580 },
    { brinco: "NE-003", raca: "Nelore PO", pesoEntradaKg: 235, custoAquisicao: 2350 },
    { brinco: "NE-004", raca: "Nelore PO", pesoEntradaKg: 269, custoAquisicao: 2690 },
    { brinco: "NE-005", raca: "Nelore PO", pesoEntradaKg: 251, custoAquisicao: 2510 },
    { brinco: "NE-006", raca: "Nelore PO", pesoEntradaKg: 248, custoAquisicao: 2480 },
    { brinco: "NE-007", raca: "Nelore PO", pesoEntradaKg: 263, custoAquisicao: 2630 },
    { brinco: "NE-008", raca: "Nelore PO", pesoEntradaKg: 237, custoAquisicao: 2370 },
    { brinco: "NE-009", raca: "Nelore PO", pesoEntradaKg: 255, custoAquisicao: 2550 },
    { brinco: "NE-010", raca: "Nelore PO", pesoEntradaKg: 261, custoAquisicao: 2610 },
  ];

  const animaisLoteA = [];
  for (const a of animaisLoteAData) {
    const animal = await prisma.animal.create({
      data: {
        brinco: a.brinco,
        raca: a.raca,
        sexo: "MACHO",
        dataNascimento: subDays(hoje, 365 + Math.floor(Math.random() * 60)),
        pesoEntradaKg: a.pesoEntradaKg,
        custoAquisicao: a.custoAquisicao,
        tipoEntrada: "COMPRA_EXTERNA",
        origem: "Fazenda Bom Retiro — Uberaba/MG",
        gtaEntrada: `GTA-2025-${a.brinco}`,
      },
    });
    // Pesagem de entrada
    await prisma.pesagem.create({
      data: { animalId: animal.id, dataPesagem: dataEntradaA, pesoKg: a.pesoEntradaKg, tipo: "ENTRADA" },
    });
    // Pertinência ao Lote A
    await prisma.pertinenciaLote.create({
      data: { animalId: animal.id, loteId: loteA.id, dataInicio: dataEntradaA },
    });
    // Movimentação de entrada
    await prisma.movimentacao.create({
      data: { animalId: animal.id, loteDestinoId: loteA.id, dataMovimentacao: dataEntradaA, tipo: "ENTRADA_SISTEMA" },
    });
    animaisLoteA.push(animal);
  }
  console.log("✅ Animais Lote A criados");

  // ── Animais — Lote B (8 garrotes cruzados) ───────────────────────────────────
  const dataEntradaB = subDays(hoje, 60);

  const animaisLoteBData = [
    { brinco: "CR-001", raca: "Nelore x Angus", pesoEntradaKg: 218, custoAquisicao: 2180 },
    { brinco: "CR-002", raca: "Nelore x Angus", pesoEntradaKg: 234, custoAquisicao: 2340 },
    { brinco: "CR-003", raca: "Nelore x Angus", pesoEntradaKg: 226, custoAquisicao: 2260 },
    { brinco: "CR-004", raca: "Nelore x Angus", pesoEntradaKg: 241, custoAquisicao: 2410 },
    { brinco: "CR-005", raca: "Nelore x Angus", pesoEntradaKg: 213, custoAquisicao: 2130 },
    { brinco: "CR-006", raca: "Nelore x Angus", pesoEntradaKg: 229, custoAquisicao: 2290 },
    { brinco: "CR-007", raca: "Nelore x Angus", pesoEntradaKg: 245, custoAquisicao: 2450 },
    { brinco: "CR-008", raca: "Nelore x Angus", pesoEntradaKg: 222, custoAquisicao: 2220 },
  ];

  const animaisLoteB = [];
  for (const a of animaisLoteBData) {
    const animal = await prisma.animal.create({
      data: {
        brinco: a.brinco,
        raca: a.raca,
        sexo: "MACHO",
        dataNascimento: subDays(hoje, 330 + Math.floor(Math.random() * 60)),
        pesoEntradaKg: a.pesoEntradaKg,
        custoAquisicao: a.custoAquisicao,
        tipoEntrada: "COMPRA_EXTERNA",
        origem: "Leilão Triângulo — Uberlândia/MG",
        gtaEntrada: `GTA-2025-${a.brinco}`,
      },
    });
    await prisma.pesagem.create({
      data: { animalId: animal.id, dataPesagem: dataEntradaB, pesoKg: a.pesoEntradaKg, tipo: "ENTRADA" },
    });
    await prisma.pertinenciaLote.create({
      data: { animalId: animal.id, loteId: loteB.id, dataInicio: dataEntradaB },
    });
    await prisma.movimentacao.create({
      data: { animalId: animal.id, loteDestinoId: loteB.id, dataMovimentacao: dataEntradaB, tipo: "ENTRADA_SISTEMA" },
    });
    animaisLoteB.push(animal);
  }
  console.log("✅ Animais Lote B criados");

  // ── Pesagens periódicas — Lote A ─────────────────────────────────────────────
  // Pesagem 1 (30 dias após entrada)
  const dataPes1A = addDays(dataEntradaA, 30);
  const gmdEsperado = 0.85; // kg/dia

  for (const animal of animaisLoteA) {
    const pesoP1 = animal.pesoEntradaKg + gmdEsperado * 30 + (Math.random() * 4 - 2);
    await prisma.pesagem.create({
      data: {
        animalId: animal.id,
        dataPesagem: dataPes1A,
        pesoKg: Math.round(pesoP1 * 10) / 10,
        tipo: "PERIODICA",
        gmdPeriodo: Math.round(((pesoP1 - animal.pesoEntradaKg) / 30) * 100) / 100,
        diasPeriodo: 30,
      },
    });
  }

  // Pesagem 2 (60 dias após entrada)
  const dataPes2A = addDays(dataEntradaA, 60);
  for (const animal of animaisLoteA) {
    const pesoP2 = animal.pesoEntradaKg + gmdEsperado * 60 + (Math.random() * 6 - 3);
    const pesoP1 = animal.pesoEntradaKg + gmdEsperado * 30;
    await prisma.pesagem.create({
      data: {
        animalId: animal.id,
        dataPesagem: dataPes2A,
        pesoKg: Math.round(pesoP2 * 10) / 10,
        tipo: "PERIODICA",
        gmdPeriodo: Math.round(((pesoP2 - pesoP1) / 30) * 100) / 100,
        diasPeriodo: 30,
      },
    });
  }
  console.log("✅ Pesagens criadas");

  // ── Apontamentos de suplemento — Lote A ──────────────────────────────────────
  // Mês 1 (3 apontamentos semanais)
  for (let semana = 1; semana <= 3; semana++) {
    const dataAp = addDays(dataEntradaA, semana * 7);
    const qtd = 10 * animaisLoteA.length; // 10 kg/cabeça/semana
    const custo = qtd * supMineral.precoUnitario!;

    const apt = await prisma.apontamentoSuplemento.create({
      data: {
        loteId: loteA.id,
        produtoId: supMineral.id,
        dataApontamento: dataAp,
        quantidadeTotal: qtd,
        custoTotal: custo,
        cabecasAtivas: animaisLoteA.length,
        custoPerCapita: custo / animaisLoteA.length,
        modoFornecimento: "Cocho coletivo",
      },
    });

    await prisma.rateioSuplemento.createMany({
      data: animaisLoteA.map((a) => ({
        apontamentoId: apt.id,
        animalId: a.id,
        valorRateio: apt.custoPerCapita,
      })),
    });
  }
  console.log("✅ Apontamentos de suplemento criados");

  // ── Apontamento de medicamento — Vermifugação Lote A ─────────────────────────
  const dataVermif = addDays(dataEntradaA, 5);
  const doseTotal = animaisLoteA.length * 5; // 5 mL por cabeça
  const custoVerm = doseTotal * vermifugo.precoUnitario!;

  const aptVerm = await prisma.apontamentoMedicamento.create({
    data: {
      loteId: loteA.id,
      produtoId: vermifugo.id,
      dataApontamento: dataVermif,
      doseTotalAplicada: doseTotal,
      unidadeDose: "mL",
      custoTotal: custoVerm,
      loteProduto: "IVM-2025-0341",
      validade: new Date("2027-06-30"),
      carenciaDias: 28,
      cabecasAtivas: animaisLoteA.length,
      custoPerCapita: custoVerm / animaisLoteA.length,
      responsavelTecnico: "Dr. Pedro Vet",
      crmv: "CRMV-MG 12345",
    },
  });

  for (const animal of animaisLoteA) {
    await prisma.rateioMedicamento.create({
      data: { apontamentoId: aptVerm.id, animalId: animal.id, valorRateio: aptVerm.custoPerCapita },
    });
    await prisma.carenciaMedicamento.create({
      data: {
        animalId: animal.id,
        apontamentoId: aptVerm.id,
        dataInicio: dataVermif,
        dataFim: addDays(dataVermif, 28),
        ativa: addDays(dataVermif, 28) > hoje,
      },
    });
  }
  console.log("✅ Apontamento de medicamento criado");

  // ── Apontamento de vacina — Lotes A e B ──────────────────────────────────────
  const dataVacina = subDays(hoje, 45);
  const todosAnimais = [...animaisLoteA, ...animaisLoteB];
  const custoVac = todosAnimais.length * vacAfto.precoUnitario!;

  // Vacina no Lote A
  const aptVacA = await prisma.apontamentoMedicamento.create({
    data: {
      loteId: loteA.id,
      produtoId: vacAfto.id,
      dataApontamento: dataVacina,
      doseTotalAplicada: animaisLoteA.length,
      unidadeDose: "dose",
      custoTotal: animaisLoteA.length * vacAfto.precoUnitario!,
      carenciaDias: 0,
      cabecasAtivas: animaisLoteA.length,
      custoPerCapita: vacAfto.precoUnitario!,
      responsavelTecnico: "Dr. Pedro Vet",
      crmv: "CRMV-MG 12345",
      observacoes: "Campanha oficial febre aftosa — 2º semestre 2025",
    },
  });
  await prisma.rateioMedicamento.createMany({
    data: animaisLoteA.map((a) => ({ apontamentoId: aptVacA.id, animalId: a.id, valorRateio: aptVacA.custoPerCapita })),
  });

  // Vacina no Lote B
  const aptVacB = await prisma.apontamentoMedicamento.create({
    data: {
      loteId: loteB.id,
      produtoId: vacAfto.id,
      dataApontamento: dataVacina,
      doseTotalAplicada: animaisLoteB.length,
      unidadeDose: "dose",
      custoTotal: animaisLoteB.length * vacAfto.precoUnitario!,
      carenciaDias: 0,
      cabecasAtivas: animaisLoteB.length,
      custoPerCapita: vacAfto.precoUnitario!,
      responsavelTecnico: "Dr. Pedro Vet",
      crmv: "CRMV-MG 12345",
    },
  });
  await prisma.rateioMedicamento.createMany({
    data: animaisLoteB.map((a) => ({ apontamentoId: aptVacB.id, animalId: a.id, valorRateio: aptVacB.custoPerCapita })),
  });
  console.log("✅ Vacinações criadas");

  console.log("\n🐄 Seed concluído com sucesso!");
  console.log("──────────────────────────────────────────");
  console.log(`   Propriedade:  ${fazenda.nome}`);
  console.log(`   Lotes:        3 (A, B, Quarentena)`);
  console.log(`   Animais:      ${animaisLoteA.length + animaisLoteB.length}`);
  console.log(`   Pesagens:     ${animaisLoteA.length * 3 + animaisLoteB.length} registros`);
  console.log("──────────────────────────────────────────");
  console.log("\n🔑 Acesso:");
  console.log("   admin@fazenda.com   / senha123  (Admin)");
  console.log("   joao@fazenda.com    / senha123  (Gestor)");
  console.log("   maria@fazenda.com   / senha123  (Operador)");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
