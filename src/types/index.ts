/**
 * src/types/index.ts
 * Tipos TypeScript compartilhados em toda a aplicação.
 */

import type { Animal, Lote, Pesagem, PertinenciaLote } from "@prisma/client";

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string; details?: unknown };

export type AnimalComLote = Animal & {
  pertinencias: (PertinenciaLote & { lote: Lote })[];
  pesagens: Pesagem[];
};

export interface ResumoFinanceiroAnimal {
  animalId: string;
  brinco: string;
  custoAquisicao: number;
  totalSuplemento: number;
  totalMedicamento: number;
  custoTotalAcumulado: number;
  pesoAtualKg?: number;
  gmdTotal?: number;
  arrobaProduzida?: number;
  custoPorArroba?: number;
}

export interface PreviewRateio {
  loteId: string;
  loteNome: string;
  dataApontamento: string;
  cabecasAtivas: number;
  custoTotal: number;
  custoPerCapita: number;
  animais: { id: string; brinco: string; nome?: string | null; valorRateio: number }[];
}

export interface AlertaCarencia {
  animalId: string;
  brinco: string;
  medicamento: string;
  dataFimCarencia: Date;
  diasRestantes: number;
}

export interface AlertaPesagem {
  animalId: string;
  brinco: string;
  ultimaPesagem: Date | null;
  diasSemPesagem: number;
  loteNome: string;
}
