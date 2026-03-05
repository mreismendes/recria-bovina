"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Beef, Scale, Layers, Download, Loader2 } from "lucide-react";

type Lote = { id: string; nome: string };
type Propriedade = { id: string; nome: string };

// ── XLSX download helper ────────────────────────────────────────────────────

function downloadXlsx(data: Record<string, unknown>[], headers: Record<string, string>, filename: string) {
  // headers maps API field → display column name
  const displayHeaders = Object.values(headers);
  const keys = Object.keys(headers);

  const rows = data.map((row) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < keys.length; i++) {
      obj[displayHeaders[i]] = row[keys[i]] ?? "";
    }
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-width columns
  const colWidths = displayHeaders.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...rows.map((r) => String(r[h] ?? "").length)
    );
    return { wch: Math.min(Math.max(maxLen + 2, 10), 35) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, filename);
}

// ── Component ───────────────────────────────────────────────────────────────

export function ExportManager({
  lotes,
  propriedades,
}: {
  lotes: Lote[];
  propriedades: Propriedade[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Exportar Dados</h1>
        <p className="text-sm text-gray-500 mt-1">Gere planilhas com os dados do sistema</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <ExportAnimais lotes={lotes} />
        <ExportPesagens lotes={lotes} />
        <ExportLotes propriedades={propriedades} />
      </div>
    </div>
  );
}

// ── Exportar Animais ────────────────────────────────────────────────────────

function ExportAnimais({ lotes }: { lotes: Lote[] }) {
  const [loteId, setLoteId] = useState("todos");
  const [status, setStatus] = useState("ATIVO");
  const [sexo, setSexo] = useState("TODOS");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ total: number } | null>(null);

  async function handleExport() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (loteId !== "todos") qs.set("loteId", loteId);
      if (status !== "TODOS") qs.set("status", status);
      if (sexo !== "TODOS") qs.set("sexo", sexo);

      const res = await fetch(`/api/export/animais?${qs}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      if (json.data.length === 0) {
        setPreview({ total: 0 });
        return;
      }

      setPreview({ total: json.data.length });

      downloadXlsx(json.data, {
        brinco: "Brinco",
        rfid: "RFID",
        nome: "Nome",
        raca: "Raça",
        sexo: "Sexo",
        dataNascimento: "Data Nascimento",
        pesoEntradaKg: "Peso Entrada (kg)",
        custoAquisicao: "Custo Aquisição (R$)",
        tipoEntrada: "Tipo Entrada",
        origem: "Origem",
        gta: "GTA",
        loteAtual: "Lote Atual",
        propriedade: "Propriedade",
        status: "Status",
        observacoes: "Observações",
      }, `animais_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-green-50 rounded-lg p-2.5">
          <Beef className="h-5 w-5 text-green-700" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Cadastro de Animais</h2>
          <p className="text-xs text-gray-500">Exporta brinco, raça, sexo, peso, lote, propriedade e mais</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-gray-500">Lote</label>
          <Select value={loteId} onValueChange={(v) => { setLoteId(v); setPreview(null); }}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os lotes</SelectItem>
              {lotes.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Status</label>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPreview(null); }}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="ATIVO">Ativos</SelectItem>
              <SelectItem value="INATIVO">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Sexo</label>
          <Select value={sexo} onValueChange={(v) => { setSexo(v); setPreview(null); }}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="MACHO">Macho</SelectItem>
              <SelectItem value="FEMEA">Fêmea</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {preview && (
          <p className="text-sm text-gray-500">
            {preview.total === 0 ? "Nenhum animal encontrado com esses filtros." : `${preview.total} animal(is) exportado(s).`}
          </p>
        )}
        {!preview && <span />}
        <Button onClick={handleExport} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar XLSX
        </Button>
      </div>
    </div>
  );
}

// ── Exportar Pesagens ───────────────────────────────────────────────────────

function ExportPesagens({ lotes }: { lotes: Lote[] }) {
  const [loteId, setLoteId] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ total: number } | null>(null);

  async function handleExport() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (loteId !== "todos") qs.set("loteId", loteId);
      if (dataInicio) qs.set("dataInicio", dataInicio);
      if (dataFim) qs.set("dataFim", dataFim);

      const res = await fetch(`/api/export/pesagens?${qs}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      if (json.data.length === 0) {
        setPreview({ total: 0 });
        return;
      }

      setPreview({ total: json.data.length });

      downloadXlsx(json.data, {
        brinco: "Brinco",
        nome: "Nome",
        dataPesagem: "Data Pesagem",
        pesoKg: "Peso (kg)",
        tipo: "Tipo",
        gmdPeriodo: "GMD (kg/dia)",
        diasPeriodo: "Dias do Período",
        jejumHoras: "Jejum (horas)",
        responsavel: "Responsável",
        observacoes: "Observações",
      }, `pesagens_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-blue-50 rounded-lg p-2.5">
          <Scale className="h-5 w-5 text-blue-700" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Pesagens</h2>
          <p className="text-xs text-gray-500">Exporta brinco, data, peso, GMD, período e responsável</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-gray-500">Lote</label>
          <Select value={loteId} onValueChange={(v) => { setLoteId(v); setPreview(null); }}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os lotes</SelectItem>
              {lotes.map((l) => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Data início</label>
          <Input type="date" className="mt-1" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setPreview(null); }} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Data fim</label>
          <Input type="date" className="mt-1" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setPreview(null); }} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        {preview && (
          <p className="text-sm text-gray-500">
            {preview.total === 0 ? "Nenhuma pesagem encontrada." : `${preview.total} pesagem(ns) exportada(s).`}
          </p>
        )}
        {!preview && <span />}
        <Button onClick={handleExport} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar XLSX
        </Button>
      </div>
    </div>
  );
}

// ── Exportar Lotes ──────────────────────────────────────────────────────────

function ExportLotes({ propriedades }: { propriedades: Propriedade[] }) {
  const [propriedadeId, setPropId] = useState("todas");
  const [status, setStatus] = useState("ATIVO");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ total: number } | null>(null);

  async function handleExport() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (propriedadeId !== "todas") qs.set("propriedadeId", propriedadeId);
      if (status !== "TODOS") qs.set("status", status);

      const res = await fetch(`/api/export/lotes?${qs}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      if (json.data.length === 0) {
        setPreview({ total: 0 });
        return;
      }

      setPreview({ total: json.data.length });

      downloadXlsx(json.data, {
        nome: "Lote",
        propriedade: "Propriedade",
        cabecasAtivas: "Cabeças Ativas",
        ativo: "Ativo",
        descricao: "Descrição",
        criadoEm: "Criado em",
      }, `lotes_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-amber-50 rounded-lg p-2.5">
          <Layers className="h-5 w-5 text-amber-700" />
        </div>
        <div>
          <h2 className="font-semibold text-gray-900">Cadastro de Lotes</h2>
          <p className="text-xs text-gray-500">Exporta lote, propriedade, cabeças ativas e status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-gray-500">Propriedade</label>
          <Select value={propriedadeId} onValueChange={(v) => { setPropId(v); setPreview(null); }}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas</SelectItem>
              {propriedades.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Status</label>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPreview(null); }}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="TODOS">Todos</SelectItem>
              <SelectItem value="ATIVO">Ativos</SelectItem>
              <SelectItem value="INATIVO">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        {preview && (
          <p className="text-sm text-gray-500">
            {preview.total === 0 ? "Nenhum lote encontrado." : `${preview.total} lote(s) exportado(s).`}
          </p>
        )}
        {!preview && <span />}
        <Button onClick={handleExport} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar XLSX
        </Button>
      </div>
    </div>
  );
}
