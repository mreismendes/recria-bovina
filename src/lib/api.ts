/**
 * src/lib/api.ts
 * Funções de fetch tipadas para uso nos Client Components.
 * Centraliza tratamento de erros e evita fetch direto nos componentes.
 */

import type { ApiResponse } from "@/types";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error((json as { success: false; error: string }).error);
  return (json as { success: true; data: T }).data;
}

// ── Grupos de Contratos ───────────────────────────────────────────────────

export const grupoContratosApi = {
  list: () => apiFetch<any[]>("/api/grupo-contratos"),
  get: (id: string) => apiFetch<any>(`/api/grupo-contratos/${id}`),
  create: (data: unknown) => apiFetch<any>("/api/grupo-contratos", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => apiFetch<any>(`/api/grupo-contratos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) => apiFetch<any>(`/api/grupo-contratos/${id}`, { method: "DELETE" }),
};

// ── Contratos ──────────────────────────────────────────────────────────────

export const contratosApi = {
  list: () => apiFetch<any[]>("/api/contratos"),
  create: (data: unknown) => apiFetch<any>("/api/contratos", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => apiFetch<any>(`/api/contratos/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) => apiFetch<any>(`/api/contratos/${id}`, { method: "DELETE" }),
};

// ── Lotes ─────────────────────────────────────────────────────────────────────

export const lotesApi = {
  list: (params?: { contratoId?: string }) => {
    const qs = params?.contratoId ? `?contratoId=${params.contratoId}` : "";
    return apiFetch<any[]>(`/api/lots${qs}`);
  },
  create: (data: unknown) => apiFetch<any>("/api/lots", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => apiFetch<any>(`/api/lots/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) => apiFetch<any>(`/api/lots/${id}`, { method: "DELETE" }),
};

// ── Produtos ──────────────────────────────────────────────────────────────────

export const produtosApi = {
  list: (grupo?: "suplemento" | "medicamento") => {
    const qs = grupo ? `?grupo=${grupo}` : "";
    return apiFetch<any[]>(`/api/products${qs}`);
  },
  create: (data: unknown) => apiFetch<any>("/api/products", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => apiFetch<any>(`/api/products/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) => apiFetch<any>(`/api/products/${id}`, { method: "DELETE" }),
};

// ── Animais ───────────────────────────────────────────────────────────────────

export const animaisApi = {
  list: (params?: { loteId?: string; status?: string }) => {
    const qs = new URLSearchParams();
    if (params?.loteId) qs.set("loteId", params.loteId);
    if (params?.status) qs.set("status", params.status);
    return apiFetch<any[]>(`/api/animals${qs.toString() ? `?${qs}` : ""}`);
  },
  get: (id: string) => apiFetch<any>(`/api/animals/${id}`),
  create: (data: unknown) => apiFetch<any>("/api/animals", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => apiFetch<any>(`/api/animals/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteBatch: (animalIds: string[]) =>
    apiFetch<{ excluidos: number; bloqueados: { brinco: string; motivo: string }[] }>(
      "/api/animals/delete",
      { method: "POST", body: JSON.stringify({ animalIds }) }
    ),
  movimentar: (data: unknown) => apiFetch<any>("/api/animals/movimentar", { method: "POST", body: JSON.stringify(data) }),
  saida: (data: unknown) => apiFetch<any>("/api/animals/saida", { method: "POST", body: JSON.stringify(data) }),
  estornoSaida: (data: unknown) => apiFetch<any>("/api/animals/estorno-saida", { method: "POST", body: JSON.stringify(data) }),
};

// ── Pesagens ─────────────────────────────────────────────────────────────────

export const pesagensApi = {
  list: (params?: { loteId?: string; animalId?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.loteId) qs.set("loteId", params.loteId);
    if (params?.animalId) qs.set("animalId", params.animalId);
    if (params?.limit) qs.set("limit", String(params.limit));
    return apiFetch<any[]>(`/api/weighings${qs.toString() ? `?${qs}` : ""}`);
  },
  registrarSessao: (data: unknown) => apiFetch<any[]>("/api/weighings", { method: "POST", body: JSON.stringify(data) }),
};

// ── Usuários ─────────────────────────────────────────────────────────────────

export const usersApi = {
  list: () => apiFetch<any[]>("/api/users"),
  create: (data: unknown) => apiFetch<any>("/api/users", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => apiFetch<any>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deactivate: (id: string) => apiFetch<any>(`/api/users/${id}`, { method: "DELETE" }),
};
