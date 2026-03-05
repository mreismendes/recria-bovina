"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Beef, Scale, Layers, Download, Loader2 } from "lucide-react";

type Lote = { id: string; nome: string };
type Contrato = { id: string; idContrato: string; nomeFazenda: string };

// ── XLSX download ───────────────────────────────────────────────────────────

function downloadXlsx(data: Record<string, unknown>[], headers: Record<string, string>, filename: string) {
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
  ws["!cols"] = displayHeaders.map((h) => {
    const maxLen = Math.max(h.length, ...rows.map((r) => String(r[h] ?? "").length));
    return { wch: Math.min(Math.max(maxLen + 2, 10), 35) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Dados");
  XLSX.writeFile(wb, filename);
}

// ── Component ───────────────────────────────────────────────────────────────

export function ExportManager({
  lotes,
  contratos,
}: {
  lotes: Lote[];
  contratos: Contrato[];
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
        <ExportLotes contratos={contratos} />
      </div>
    </div>
  );
}

// ── Exportar Animais ────────────────────────────────────────────────────────

function ExportAnimais({ lotes }: { lotes: Lote[] }) {
  const [loteIds, setLoteIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>(["ATIVO"]);
  const [sexos, setSexos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setMsg(null);
    try {
      const qs = new URLSearchParams();
      if (loteIds.length > 0) qs.set("loteIds", loteIds.join(","));
      if (statuses.length > 0) qs.set("status", statuses.join(","));
      if (sexos.length > 0) qs.set("sexo", sexos.join(","));

      const res = await fetch(`/api/export/animais?${qs}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      if (json.data.length === 0) { setMsg("Nenhum animal encontrado."); return; }

      downloadXlsx(json.data, {
        brinco: "Brinco", rfid: "RFID", nome: "Nome", raca: "Raça", sexo: "Sexo",
        dataNascimento: "Data Nascimento", pesoEntradaKg: "Peso Entrada (kg)",
        custoAquisicao: "Custo Aquisição (R$)", tipoEntrada: "Tipo Entrada",
        origem: "Origem", gta: "GTA", loteAtual: "Lote Atual",
        fazenda: "Fazenda (Contrato)", status: "Status", observacoes: "Observações",
      }, `animais_${new Date().toISOString().split("T")[0]}.xlsx`);

      setMsg(`${json.data.length} animal(is) exportado(s).`);
    } catch { setMsg("Erro na exportação."); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-green-50 rounded-lg p-2.5"><Beef className="h-5 w-5 text-green-700" /></div>
        <div>
          <h2 className="font-semibold text-gray-900">Cadastro de Animais</h2>
          <p className="text-xs text-gray-500">Brinco, raça, sexo, peso, lote, fazenda e mais</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-gray-500">Lotes</label>
          <MultiSelect
            className="mt-1"
            options={lotes.map((l) => ({ value: l.id, label: l.nome }))}
            selected={loteIds}
            onChange={(v) => { setLoteIds(v); setMsg(null); }}
            allLabel="Todos os lotes"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Status</label>
          <MultiSelect
            className="mt-1"
            options={[{ value: "ATIVO", label: "Ativo" }, { value: "INATIVO", label: "Inativo" }]}
            selected={statuses}
            onChange={(v) => { setStatuses(v); setMsg(null); }}
            allLabel="Todos"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Sexo</label>
          <MultiSelect
            className="mt-1"
            options={[{ value: "MACHO", label: "Macho" }, { value: "FEMEA", label: "Fêmea" }]}
            selected={sexos}
            onChange={(v) => { setSexos(v); setMsg(null); }}
            allLabel="Todos"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        {msg && <p className="text-sm text-gray-500">{msg}</p>}
        {!msg && <span />}
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
  const [loteIds, setLoteIds] = useState<string[]>([]);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setMsg(null);
    try {
      const qs = new URLSearchParams();
      if (loteIds.length > 0) qs.set("loteIds", loteIds.join(","));
      if (dataInicio) qs.set("dataInicio", dataInicio);
      if (dataFim) qs.set("dataFim", dataFim);

      const res = await fetch(`/api/export/pesagens?${qs}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      if (json.data.length === 0) { setMsg("Nenhuma pesagem encontrada."); return; }

      downloadXlsx(json.data, {
        brinco: "Brinco", nome: "Nome", dataPesagem: "Data Pesagem",
        pesoKg: "Peso (kg)", tipo: "Tipo", gmdPeriodo: "GMD (kg/dia)",
        diasPeriodo: "Dias do Período", jejumHoras: "Jejum (horas)",
        responsavel: "Responsável", observacoes: "Observações",
      }, `pesagens_${new Date().toISOString().split("T")[0]}.xlsx`);

      setMsg(`${json.data.length} pesagem(ns) exportada(s).`);
    } catch { setMsg("Erro na exportação."); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-blue-50 rounded-lg p-2.5"><Scale className="h-5 w-5 text-blue-700" /></div>
        <div>
          <h2 className="font-semibold text-gray-900">Pesagens</h2>
          <p className="text-xs text-gray-500">Brinco, data, peso, GMD, período e responsável</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-gray-500">Lotes</label>
          <MultiSelect
            className="mt-1"
            options={lotes.map((l) => ({ value: l.id, label: l.nome }))}
            selected={loteIds}
            onChange={(v) => { setLoteIds(v); setMsg(null); }}
            allLabel="Todos os lotes"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Data início</label>
          <Input type="date" className="mt-1" value={dataInicio} onChange={(e) => { setDataInicio(e.target.value); setMsg(null); }} />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Data fim</label>
          <Input type="date" className="mt-1" value={dataFim} onChange={(e) => { setDataFim(e.target.value); setMsg(null); }} />
        </div>
      </div>

      <div className="flex items-center justify-between">
        {msg && <p className="text-sm text-gray-500">{msg}</p>}
        {!msg && <span />}
        <Button onClick={handleExport} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar XLSX
        </Button>
      </div>
    </div>
  );
}

// ── Exportar Lotes ──────────────────────────────────────────────────────────

function ExportLotes({ contratos }: { contratos: Contrato[] }) {
  const [contratoIds, setPropIds] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>(["ATIVO"]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function handleExport() {
    setLoading(true);
    setMsg(null);
    try {
      const qs = new URLSearchParams();
      if (contratoIds.length > 0) qs.set("contratoIds", contratoIds.join(","));
      if (statuses.length > 0) qs.set("status", statuses.join(","));

      const res = await fetch(`/api/export/lotes?${qs}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      if (json.data.length === 0) { setMsg("Nenhum lote encontrado."); return; }

      downloadXlsx(json.data, {
        nome: "Lote", fazenda: "Fazenda (Contrato)", cabecasAtivas: "Cabeças Ativas",
        ativo: "Ativo", descricao: "Descrição", criadoEm: "Criado em",
      }, `lotes_${new Date().toISOString().split("T")[0]}.xlsx`);

      setMsg(`${json.data.length} lote(s) exportado(s).`);
    } catch { setMsg("Erro na exportação."); }
    finally { setLoading(false); }
  }

  return (
    <div className="bg-white rounded-lg border shadow-sm p-5">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-amber-50 rounded-lg p-2.5"><Layers className="h-5 w-5 text-amber-700" /></div>
        <div>
          <h2 className="font-semibold text-gray-900">Cadastro de Lotes</h2>
          <p className="text-xs text-gray-500">Lote, fazenda, cabeças ativas e status</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs font-medium text-gray-500">Contratos</label>
          <MultiSelect
            className="mt-1"
            options={contratos.map((c) => ({ value: c.id, label: c.idContrato + " — " + c.nomeFazenda }))}
            selected={contratoIds}
            onChange={(v) => { setPropIds(v); setMsg(null); }}
            allLabel="Todas"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500">Status</label>
          <MultiSelect
            className="mt-1"
            options={[{ value: "ATIVO", label: "Ativos" }, { value: "INATIVO", label: "Inativos" }]}
            selected={statuses}
            onChange={(v) => { setStatuses(v); setMsg(null); }}
            allLabel="Todos"
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        {msg && <p className="text-sm text-gray-500">{msg}</p>}
        {!msg && <span />}
        <Button onClick={handleExport} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          Exportar XLSX
        </Button>
      </div>
    </div>
  );
}
