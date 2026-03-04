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

// ── Propriedades ──────────────────────────────────────────────────────────────

export const propriedadesApi = {
  list: () => apiFetch<any[]>("/api/propriedades"),
  create: (data: unknown) => apiFetch<any>("/api/propriedades", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => apiFetch<any>(`/api/propriedades/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) => apiFetch<any>(`/api/propriedades/${id}`, { method: "DELETE" }),
};

// ── Lotes ─────────────────────────────────────────────────────────────────────

export const lotesApi = {
  list: (params?: { propriedadeId?: string }) => {
    const qs = params?.propriedadeId ? `?propriedadeId=${params.propriedadeId}` : "";
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
  create: (data: unknown) => apiFetch<any>("/api/animals", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => apiFetch<any>(`/api/animals/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  remove: (id: string) => apiFetch<any>(`/api/animals/${id}`, { method: "DELETE" }),
};
