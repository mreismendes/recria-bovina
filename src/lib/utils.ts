import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

/**
 * Parses a "YYYY-MM-DD" date string as a local calendar date.
 * Sets time to noon UTC to avoid timezone-boundary day shifts that occur
 * with new Date("YYYY-MM-DD") (which parses as midnight UTC).
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
}

/** Returns today's date as "YYYY-MM-DD" using local timezone. */
export function todayLocalStr(): string {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)) }
export function formatCurrency(v: number) { return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v) }
export function formatDate(d: Date | string) { return format(typeof d==='string'?new Date(d):d, 'dd/MM/yyyy', { locale: ptBR }) }
export function formatWeight(kg: number) { return `${kg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg` }
export function formatGmd(gmd: number) { return `${gmd.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} kg/dia` }
export function calcArrobas(gainKg: number) { return gainKg / 15 }
export function daysBetween(a: Date, b: Date) { return Math.abs(differenceInDays(b, a)) }
export const SEX_LABEL: Record<string,string> = { MACHO:'Macho', FEMEA:'Fêmea' }
export const ENTRY_TYPE_LABEL: Record<string,string> = { COMPRA_EXTERNA:'Compra externa', NASCIMENTO_PROPRIO:'Nascimento próprio', TRANSFERENCIA_INTERNA:'Transferência interna' }
export const EXIT_TYPE_LABEL: Record<string,string> = { VENDA:'Venda', MORTE:'Morte', TRANSFERENCIA_EXTERNA:'Transferência externa', DESCARTE:'Descarte' }
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
export const LOT_STATUS_LABEL: Record<string,string> = { ATIVO:'Ativo', INATIVO:'Inativo' }
export const ANIMAL_STATUS_LABEL: Record<string,string> = { ATIVO:'Ativo', INATIVO:'Baixado' }
export function getStatusColor(status: string) {
  const m: Record<string,string> = { ATIVO:'bg-green-100 text-green-800', INATIVO:'bg-gray-100 text-gray-600', MACHO:'bg-blue-100 text-blue-800', FEMEA:'bg-pink-100 text-pink-800', SUPPLEMENT:'bg-amber-100 text-amber-800', MEDICATION:'bg-red-100 text-red-800' }
  return m[status] ?? 'bg-gray-100 text-gray-600'
}
export function isWithdrawalActive(d: Date) { return d > new Date() }
export function withdrawalDaysLeft(d: Date) { return Math.max(0, differenceInDays(d, new Date())) }

// ─── Aliases PT-BR (usados nos componentes) ────────────────────────────────
export const formatPeso = formatWeight

/** Converts a number to a Brazilian-formatted string for use in form inputs. */
export function numberToBrInput(value: number | null | undefined): string {
  if (value == null) return ""
  return String(value).replace('.', ',')
}

/** Formats a number using Brazilian notation (comma as decimal separator). */
export function formatNumber(value: number, decimals: number): string {
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Parses a Brazilian-formatted number string to a JS number.
 * "1.234,56" → 1234.56, "245,0" → 245.0, "245.0" → 245.0 (also accepts dot notation)
 */
export function parseBrNumber(str: string): number {
  if (!str) return NaN
  const trimmed = str.trim()
  // If it has both dot and comma, it's Brazilian format: 1.234,56
  if (trimmed.includes(',') && trimmed.includes('.')) {
    return parseFloat(trimmed.replace(/\./g, '').replace(',', '.'))
  }
  // If it has comma but no dot, comma is decimal: 245,5
  if (trimmed.includes(',')) {
    return parseFloat(trimmed.replace(',', '.'))
  }
  // Otherwise treat as standard: 245.5
  return parseFloat(trimmed)
}
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
