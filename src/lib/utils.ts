import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
export function formatCurrency(v: number) { return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v) }
export function formatDate(d: Date | string) { return format(typeof d==='string'?new Date(d):d, 'dd/MM/yyyy', { locale: ptBR }) }
export function formatWeight(kg: number) { return `${kg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg` }
export function formatGmd(gmd: number) { return `${gmd.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} kg/dia` }
export function calcArrobas(gainKg: number) { return gainKg / 15 }
export function daysBetween(a: Date, b: Date) { return Math.abs(differenceInDays(b, a)) }
export const SEX_LABEL: Record<string,string> = { MALE:'Macho', FEMALE:'Fêmea' }
export const ENTRY_TYPE_LABEL: Record<string,string> = { PURCHASE:'Compra', OWN_BIRTH:'Nascimento próprio', TRANSFER_IN:'Transferência de entrada' }
export const EXIT_TYPE_LABEL: Record<string,string> = { SALE:'Venda', DEATH:'Morte', TRANSFER_OUT:'Transferência de saída', DISCARD:'Descarte' }
export const ANIMAL_CATEGORY_LABEL: Record<string,string> = { GARROTE:'Garrote', NOVILHO:'Novilho', NOVILHA:'Novilha', BEZERRA:'Bezerra', BEZERRO:'Bezerro', VACA_RECRIA:'Vaca (recria)' }
export const PRODUCT_TYPE_LABEL: Record<string,string> = {
  SUPLEMENTO_MINERAL: 'Suplemento Mineral',
  SUPLEMENTO_PROTEICO: 'Suplemento Proteico',
  SUPLEMENTO_ENERGETICO: 'Suplemento Energético',
  SUPLEMENTO_MISTO: 'Suplemento Misto',
  VERMIFUGO: 'Vermífugo',
  CARRAPATICIDA: 'Carrapaticida',
  VACINA: 'Vacina',
  ANTIBIOTICO: 'Antibiótico',
  VITAMINA: 'Vitamina',
  OUTRO_MEDICAMENTO: 'Outro Medicamento',
  SUPPLEMENT: 'Suplemento',
  MEDICATION: 'Medicamento',
}
export const LOT_STATUS_LABEL: Record<string,string> = { ACTIVE:'Ativo', INACTIVE:'Inativo' }
export const ANIMAL_STATUS_LABEL: Record<string,string> = { ACTIVE:'Ativo', INACTIVE:'Baixado' }
export function getStatusColor(status: string) {
  const m: Record<string,string> = { ACTIVE:'bg-green-100 text-green-800', INACTIVE:'bg-gray-100 text-gray-600', MALE:'bg-blue-100 text-blue-800', FEMALE:'bg-pink-100 text-pink-800', SUPPLEMENT:'bg-amber-100 text-amber-800', MEDICATION:'bg-red-100 text-red-800' }
  return m[status] ?? 'bg-gray-100 text-gray-600'
}
export function isWithdrawalActive(d: Date) { return d > new Date() }
export function withdrawalDaysLeft(d: Date) { return Math.max(0, differenceInDays(d, new Date())) }

// ─── Aliases PT-BR (usados nos componentes) ────────────────────────────────
export const formatPeso = formatWeight
export const SEXO_LABEL = SEX_LABEL
export const TIPO_ENTRADA_LABEL = ENTRY_TYPE_LABEL
export const TIPO_PRODUTO_LABEL = PRODUCT_TYPE_LABEL

// ─── Funções adicionais ────────────────────────────────────────────────────
/** Retorna true se o tipo de produto é suplemento */
export function isSuplemento(tipo: string): boolean {
  return tipo.startsWith("SUPLEMENTO") || tipo === "SUPPLEMENT"
}

/** Calcula Ganho Médio Diário: (pesoFinal - pesoInicial) / dias */
export function calcularGMD(pesoInicial: number, pesoFinal: number, dias: number): number {
  if (dias <= 0) return 0
  return (pesoFinal - pesoInicial) / dias
}
