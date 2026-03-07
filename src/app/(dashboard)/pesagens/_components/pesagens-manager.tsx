"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Scale, TrendingUp, TrendingDown, Minus, ArrowRight, Pencil, Trash2 } from "lucide-react";
import { pesagensApi } from "@/lib/api";
import { formatPeso, formatCurrency, formatDate, formatNumber, parseBrNumber, todayLocalStr, numberToBrInput } from "@/lib/utils";

type Lote = { id: string; nome: string; contrato?: { nomeFazenda: string } | null; grupoContrato?: { nome: string } | null };
type Contrato = { id: string; idContrato: string; nomeFazenda: string };
type GrupoContrato = { id: string; nome: string };
type AnimalNoLote = {
  id: string;
  brinco: string;
  nome: string | null;
  pesoEntradaKg: number;
  ultimoPeso: number | null;
  ultimaData: string | null;
  diasSemPesagem: number | null;
};

type PesagemHistorico = {
  id: string;
  animalId: string;
  dataPesagem: string;
  pesoKg: number;
  tipo: string;
  gmdPeriodo: number | null;
  diasPeriodo: number | null;
  ativo?: boolean;
  motivoAlteracao?: string | null;
  alteradoPor?: string | null;
  alteradoEm?: string | null;
  animal: { id: string; brinco: string; nome: string | null; pesoEntradaKg: number };
};

type ResultadoPesagem = {
  animalId: string;
  brinco: string;
  pesoKg: number;
  pesoAnterior: number | null;
  gmdPeriodo: number | null;
  diasPeriodo: number | null;
  ganhoKg: number | null;
};

const today = todayLocalStr();

export function PesagensManager({
  lotes,
  contratos,
  grupoContratos,
  animaisPorLote,
}: {
  lotes: Lote[];
  contratos: Contrato[];
  grupoContratos: GrupoContrato[];
  animaisPorLote: Record<string, AnimalNoLote[]>;
}) {
  const [tab, setTab] = useState<"nova" | "historico">("nova");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pesagens</h1>
          <p className="text-sm text-gray-500 mt-1">Controle de peso e GMD do rebanho</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "nova" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setTab("nova")}
        >
          Nova Sessão
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            tab === "historico" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
          }`}
          onClick={() => setTab("historico")}
        >
          Histórico
        </button>
      </div>

      {tab === "nova" && (
        <NovaSessao lotes={lotes} animaisPorLote={animaisPorLote} />
      )}
      {tab === "historico" && <Historico lotes={lotes} contratos={contratos} grupoContratos={grupoContratos} />}
    </div>
  );
}

// ── Nova Sessão de Pesagem ────────────────────────────────────────────────────

function NovaSessao({
  lotes,
  animaisPorLote,
}: {
  lotes: Lote[];
  animaisPorLote: Record<string, AnimalNoLote[]>;
}) {
  const [loteId, setLoteId] = useState(lotes[0]?.id ?? "");
  const [dataPesagem, setDataPesagem] = useState(today);
  const [responsavel, setResponsavel] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [pesos, setPesos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoPesagem[] | null>(null);

  const animais = animaisPorLote[loteId] ?? [];

  // Reset pesos quando muda de lote
  useEffect(() => {
    setPesos({});
    setResultado(null);
    setError(null);
  }, [loteId]);

  function updatePeso(animalId: string, value: string) {
    setPesos((prev) => ({ ...prev, [animalId]: value }));
  }

  const pesagensPreenchidas = animais.filter((a) => pesos[a.id] && parseBrNumber(pesos[a.id]) > 0);

  async function handleSubmit() {
    if (pesagensPreenchidas.length === 0) {
      setError("Preencha o peso de pelo menos um animal");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const data = await pesagensApi.registrarSessao({
        loteId,
        dataPesagem,
        pesagens: pesagensPreenchidas.map((a) => ({
          animalId: a.id,
          pesoKg: parseBrNumber(pesos[a.id]),
        })),
        responsavel: responsavel || null,
        observacoes: observacoes || null,
      });
      setResultado(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao registrar pesagens");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setPesos({});
    setResultado(null);
    setError(null);
  }

  // ── Tela de resultado ──
  if (resultado) {
    const totalGanho = resultado.reduce((sum, r) => sum + (r.ganhoKg ?? 0), 0);
    const gmdMedio =
      resultado.filter((r) => r.gmdPeriodo != null).length > 0
        ? resultado.reduce((sum, r) => sum + (r.gmdPeriodo ?? 0), 0) /
          resultado.filter((r) => r.gmdPeriodo != null).length
        : null;

    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-green-800">
            {resultado.length} pesagem(ns) registrada(s) com sucesso
          </p>
          {gmdMedio != null && (
            <p className="text-xs text-green-700 mt-1">
              GMD médio da sessão: {formatNumber(gmdMedio, 3)} kg/dia | Ganho total acumulado: {formatNumber(totalGanho, 1)} kg
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brinco</TableHead>
                <TableHead className="text-right">Peso anterior</TableHead>
                <TableHead className="text-center"><ArrowRight className="h-4 w-4 mx-auto" /></TableHead>
                <TableHead className="text-right">Peso atual</TableHead>
                <TableHead className="text-right">Ganho</TableHead>
                <TableHead className="text-right">GMD</TableHead>
                <TableHead className="text-right">Dias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resultado.map((r) => (
                <TableRow key={r.animalId}>
                  <TableCell className="font-mono font-semibold text-green-700">{r.brinco}</TableCell>
                  <TableCell className="text-right text-sm">
                    {r.pesoAnterior ? `${formatNumber(r.pesoAnterior, 1)} kg` : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    {r.ganhoKg != null ? (
                      r.ganhoKg > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500 mx-auto" />
                      ) : r.ganhoKg < 0 ? (
                        <TrendingDown className="h-4 w-4 text-red-500 mx-auto" />
                      ) : (
                        <Minus className="h-4 w-4 text-gray-400 mx-auto" />
                      )
                    ) : null}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-sm">{formatNumber(r.pesoKg, 1)} kg</TableCell>
                  <TableCell className="text-right text-sm">
                    {r.ganhoKg != null ? (
                      <span className={r.ganhoKg >= 0 ? "text-green-600" : "text-red-600"}>
                        {r.ganhoKg > 0 ? "+" : ""}{formatNumber(r.ganhoKg, 1)} kg
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {r.gmdPeriodo != null ? (
                      <span className={r.gmdPeriodo >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatNumber(r.gmdPeriodo, 3)} kg/dia
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right text-sm text-gray-500">
                    {r.diasPeriodo ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <Button onClick={resetForm}>Nova sessão</Button>
      </div>
    );
  }

  // ── Formulário ──
  return (
    <div className="space-y-5">
      {/* Cabeçalho da sessão */}
      <div className="bg-white rounded-lg border shadow-sm p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Lote *</label>
            <Select value={loteId} onValueChange={setLoteId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o lote" />
              </SelectTrigger>
              <SelectContent>
                {lotes.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nome} — {l.contrato?.nomeFazenda ?? l.grupoContrato?.nome ?? ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Data *</label>
            <Input
              type="date"
              className="mt-1"
              value={dataPesagem}
              onChange={(e) => setDataPesagem(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Responsável</label>
            <Input
              className="mt-1"
              placeholder="Nome do pesador"
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Lista de animais para pesar */}
      {animais.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
          <Scale className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>Nenhum animal ativo neste lote.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="px-5 py-3 border-b flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              {animais.length} animal(is) no lote — {pesagensPreenchidas.length} peso(s) preenchido(s)
            </p>
            {pesagensPreenchidas.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {pesagensPreenchidas.length}/{animais.length}
              </Badge>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Brinco</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="text-right">Último peso</TableHead>
                <TableHead className="text-right">Dias sem pesagem</TableHead>
                <TableHead className="text-right w-36">Peso atual (kg) *</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {animais.map((a) => (
                <TableRow key={a.id} className={a.diasSemPesagem != null && a.diasSemPesagem > 45 ? "bg-yellow-50/50" : ""}>
                  <TableCell className="font-mono font-semibold text-green-700">{a.brinco}</TableCell>
                  <TableCell className="text-sm text-gray-500">{a.nome || "—"}</TableCell>
                  <TableCell className="text-right text-sm">
                    {a.ultimoPeso ? (
                      <span>{formatNumber(a.ultimoPeso, 1)} kg</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {a.diasSemPesagem != null ? (
                      <span className={a.diasSemPesagem > 45 ? "text-amber-600 font-medium" : "text-gray-500"}>
                        {a.diasSemPesagem}d
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="text"
                      inputMode="decimal"
                      className="w-28 ml-auto text-right"
                      placeholder="0,0"
                      value={pesos[a.id] ?? ""}
                      onChange={(e) => updatePeso(a.id, e.target.value)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Observações + Submit */}
      <div className="bg-white rounded-lg border shadow-sm p-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Observações</label>
          <Textarea
            className="mt-1"
            rows={2}
            placeholder="Ex: Pesagem após jejum de 12h"
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={loading || pesagensPreenchidas.length === 0}
            className="gap-2"
          >
            <Scale className="h-4 w-4" />
            {loading
              ? "Registrando…"
              : `Registrar ${pesagensPreenchidas.length} pesagem(ns)`}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Histórico de Pesagens ─────────────────────────────────────────────────────

function Historico({ lotes, contratos, grupoContratos }: { lotes: Lote[]; contratos: Contrato[]; grupoContratos: GrupoContrato[] }) {
  const [selectedLoteIds, setSelectedLoteIds] = useState<string[]>([]);
  const [selectedContratoIds, setSelectedContratoIds] = useState<string[]>([]);
  const [selectedGrupoContratoIds, setSelectedGrupoContratoIds] = useState<string[]>([]);
  const [pesagens, setPesagens] = useState<PesagemHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  // Edit dialog state
  const [editPesagem, setEditPesagem] = useState<PesagemHistorico | null>(null);
  const [editPeso, setEditPeso] = useState("");
  const [editMotivo, setEditMotivo] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete dialog state
  const [deletePesagem, setDeletePesagem] = useState<PesagemHistorico | null>(null);
  const [deleteMotivo, setDeleteMotivo] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params: { loteIds?: string[]; contratoIds?: string[]; grupoContratoIds?: string[]; limit?: number; includeDeleted?: boolean } = { limit: 200, includeDeleted: true };
    if (selectedLoteIds.length > 0) params.loteIds = selectedLoteIds;
    if (selectedContratoIds.length > 0) params.contratoIds = selectedContratoIds;
    if (selectedGrupoContratoIds.length > 0) params.grupoContratoIds = selectedGrupoContratoIds;

    pesagensApi.list(params).then((data) => {
      setPesagens(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedLoteIds, selectedContratoIds, selectedGrupoContratoIds, refreshKey]);

  function reload() {
    setRefreshKey((k) => k + 1);
  }

  // ── Edit handlers ──

  function openEdit(p: PesagemHistorico) {
    setEditPesagem(p);
    setEditPeso(numberToBrInput(p.pesoKg));
    setEditMotivo("");
    setEditError(null);
  }

  async function handleEdit() {
    if (!editPesagem) return;
    if (editMotivo.length < 10) {
      setEditError("Justificativa deve ter ao menos 10 caracteres");
      return;
    }
    const pesoNum = parseBrNumber(editPeso);
    if (!pesoNum || pesoNum <= 0) {
      setEditError("Peso deve ser maior que zero");
      return;
    }

    setEditLoading(true);
    setEditError(null);

    try {
      await pesagensApi.update(editPesagem.id, {
        pesoKg: pesoNum,
        motivoAlteracao: editMotivo,
      });
      setEditPesagem(null);
      reload();
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : "Erro ao editar pesagem");
    } finally {
      setEditLoading(false);
    }
  }

  // ── Delete handlers ──

  function openDelete(p: PesagemHistorico) {
    setDeletePesagem(p);
    setDeleteMotivo("");
    setDeleteError(null);
  }

  async function handleDelete() {
    if (!deletePesagem) return;
    if (deleteMotivo.length < 10) {
      setDeleteError("Justificativa deve ter ao menos 10 caracteres");
      return;
    }

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      await pesagensApi.remove(deletePesagem.id, { motivoAlteracao: deleteMotivo });
      setDeletePesagem(null);
      reload();
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Erro ao excluir pesagem");
    } finally {
      setDeleteLoading(false);
    }
  }

  // Agrupar por data
  const sessoes = pesagens.reduce<Record<string, PesagemHistorico[]>>((acc, p) => {
    const key = p.dataPesagem.split("T")[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const sessoesOrdenadas = Object.entries(sessoes).sort(([a], [b]) => b.localeCompare(a));

  const canEdit = (p: PesagemHistorico) => (p.tipo === "PERIODICA" || p.tipo === "ENTRADA") && p.ativo !== false;
  const canDelete = (p: PesagemHistorico) => p.tipo === "PERIODICA" && p.ativo !== false;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        {grupoContratos.length > 0 && (
          <div className="w-56">
            <label className="text-xs font-medium text-gray-500 mb-1 block">Grupo de Contrato</label>
            <MultiSelect
              options={grupoContratos.map((g) => ({ value: g.id, label: g.nome }))}
              selected={selectedGrupoContratoIds}
              onChange={setSelectedGrupoContratoIds}
              allLabel="Todos os grupos"
            />
          </div>
        )}
        <div className="w-64">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Contrato</label>
          <MultiSelect
            options={contratos.map((c) => ({ value: c.id, label: `${c.idContrato} — ${c.nomeFazenda}` }))}
            selected={selectedContratoIds}
            onChange={setSelectedContratoIds}
            allLabel="Todos os contratos"
          />
        </div>
        <div className="w-56">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Lote</label>
          <MultiSelect
            options={lotes.map((l) => ({ value: l.id, label: l.nome }))}
            selected={selectedLoteIds}
            onChange={setSelectedLoteIds}
            allLabel="Todos os lotes"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
          Carregando…
        </div>
      ) : sessoesOrdenadas.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-gray-400">
          <Scale className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p>Nenhuma pesagem registrada.</p>
        </div>
      ) : (
        sessoesOrdenadas.map(([data, pesagensData]) => {
          const ativas = pesagensData.filter((p) => p.ativo !== false);
          const pesoMedio =
            ativas.length > 0
              ? ativas.reduce((s, p) => s + p.pesoKg, 0) / ativas.length
              : null;

          const gmdMedio =
            ativas.filter((p) => p.gmdPeriodo != null).length > 0
              ? ativas.reduce((s, p) => s + (p.gmdPeriodo ?? 0), 0) /
                ativas.filter((p) => p.gmdPeriodo != null).length
              : null;

          return (
            <div key={data} className="bg-white rounded-lg border shadow-sm">
              <div className="px-5 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(data)}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {ativas.length} animal(is)
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  {pesoMedio != null && (
                    <p className="text-xs text-gray-500">
                      Peso médio: <span className="text-gray-700 font-medium">
                        {formatNumber(pesoMedio, 1)} kg ({formatNumber(pesoMedio / 30, 1)} @)
                      </span>
                    </p>
                  )}
                  {gmdMedio != null && (
                    <p className="text-xs text-gray-500">
                      GMD médio: <span className={gmdMedio >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                        {formatNumber(gmdMedio, 3)} kg/dia
                      </span>
                    </p>
                  )}
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Brinco</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-right">Peso (kg)</TableHead>
                    <TableHead className="text-right">GMD</TableHead>
                    <TableHead className="text-right">Período</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pesagensData
                    .sort((a, b) => a.animal.brinco.localeCompare(b.animal.brinco))
                    .map((p) => {
                      const isDeleted = p.ativo === false;
                      return (
                        <TableRow key={p.id} className={isDeleted ? "opacity-50 bg-red-50/30" : ""}>
                          <TableCell className={`font-mono font-semibold ${isDeleted ? "text-gray-400 line-through" : "text-green-700"}`}>
                            {p.animal.brinco}
                          </TableCell>
                          <TableCell className={`text-sm ${isDeleted ? "text-gray-400 line-through" : "text-gray-500"}`}>
                            {p.animal.nome || "—"}
                          </TableCell>
                          <TableCell className={`text-right font-mono text-sm ${isDeleted ? "line-through text-gray-400" : ""}`}>
                            {formatNumber(p.pesoKg, 1)}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {isDeleted ? (
                              <span className="text-gray-400">—</span>
                            ) : p.gmdPeriodo != null ? (
                              <span className={p.gmdPeriodo >= 0 ? "text-green-600" : "text-red-600"}>
                                {formatNumber(p.gmdPeriodo, 3)}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-right text-sm text-gray-500">
                            {isDeleted ? "—" : p.diasPeriodo ? `${p.diasPeriodo}d` : "—"}
                          </TableCell>
                          <TableCell>
                            {isDeleted ? (
                              <div className="flex items-center gap-1">
                                <Badge variant="outline" className="text-xs border-red-300 text-red-500">
                                  Excluída
                                </Badge>
                                {p.motivoAlteracao && (
                                  <span className="text-xs text-gray-400 italic max-w-[150px] truncate" title={p.motivoAlteracao}>
                                    {p.motivoAlteracao}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {p.tipo === "ENTRADA" ? "Entrada" : p.tipo === "SAIDA" ? "Saída" : "Periódica"}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {(canEdit(p) || canDelete(p)) && (
                              <div className="flex items-center justify-end gap-1">
                                {canEdit(p) && (
                                  <button
                                    onClick={() => openEdit(p)}
                                    className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                    title={p.tipo === "ENTRADA" ? "Editar peso de entrada" : "Editar pesagem"}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {canDelete(p) && (
                                  <button
                                    onClick={() => openDelete(p)}
                                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                    title="Excluir pesagem"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </div>
          );
        })
      )}

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editPesagem} onOpenChange={(open) => !open && setEditPesagem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editPesagem?.tipo === "ENTRADA" ? "Editar Peso de Entrada" : "Editar Pesagem"}</DialogTitle>
            <DialogDescription>
              {editPesagem && (
                <>
                  Animal: <span className="font-mono font-semibold text-green-700">{editPesagem.animal.brinco}</span>
                  {" "}— Data: {formatDate(editPesagem.dataPesagem)}
                  {editPesagem.tipo === "ENTRADA" && (
                    <span className="block mt-1 text-amber-600">
                      O peso de entrada do animal também será atualizado.
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-gray-700">Peso (kg) *</label>
              <Input
                type="text"
                inputMode="decimal"
                className="mt-1"
                value={editPeso}
                onChange={(e) => setEditPeso(e.target.value)}
                placeholder="0,0"
              />
              {editPesagem && (
                <p className="text-xs text-gray-400 mt-1">
                  Peso atual: {formatNumber(editPesagem.pesoKg, 1)} kg
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Justificativa da alteração *</label>
              <Textarea
                className="mt-1"
                rows={3}
                value={editMotivo}
                onChange={(e) => setEditMotivo(e.target.value)}
                placeholder="Ex: Erro de digitação no peso original, valor correto conferido na planilha de campo"
              />
              <p className="text-xs text-gray-400 mt-1">
                Mínimo 10 caracteres ({editMotivo.length}/10)
              </p>
            </div>

            {editError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{editError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPesagem(null)} disabled={editLoading}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={editLoading || editMotivo.length < 10}>
              {editLoading ? "Salvando…" : "Salvar alteração"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={!!deletePesagem} onOpenChange={(open) => !open && setDeletePesagem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Pesagem</DialogTitle>
            <DialogDescription>
              {deletePesagem && (
                <>
                  Animal: <span className="font-mono font-semibold text-green-700">{deletePesagem.animal.brinco}</span>
                  {" "}— Data: {formatDate(deletePesagem.dataPesagem)}
                  {" "}— Peso: {formatNumber(deletePesagem.pesoKg, 1)} kg
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">
                Esta pesagem será marcada como excluída. O registro será mantido para rastreabilidade,
                mas não será considerado nos cálculos de GMD e relatórios.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Justificativa da exclusão *</label>
              <Textarea
                className="mt-1"
                rows={3}
                value={deleteMotivo}
                onChange={(e) => setDeleteMotivo(e.target.value)}
                placeholder="Ex: Pesagem duplicada registrada por engano, animal foi pesado duas vezes no mesmo dia"
              />
              <p className="text-xs text-gray-400 mt-1">
                Mínimo 10 caracteres ({deleteMotivo.length}/10)
              </p>
            </div>

            {deleteError && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{deleteError}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePesagem(null)} disabled={deleteLoading}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteLoading || deleteMotivo.length < 10}
            >
              {deleteLoading ? "Excluindo…" : "Confirmar exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
