"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Scale, TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { pesagensApi } from "@/lib/api";
import { formatPeso, formatCurrency, formatDate, formatNumber, parseBrNumber, todayLocalStr } from "@/lib/utils";

type Lote = { id: string; nome: string; contrato?: { nomeFazenda: string } | null; grupoContrato?: { nome: string } | null };
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
  animaisPorLote,
}: {
  lotes: Lote[];
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
      {tab === "historico" && <Historico lotes={lotes} />}
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

function Historico({ lotes }: { lotes: Lote[] }) {
  const [loteId, setLoteId] = useState("todos");
  const [pesagens, setPesagens] = useState<PesagemHistorico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params: { loteId?: string; limit?: number } = { limit: 200 };
    if (loteId !== "todos") params.loteId = loteId;

    pesagensApi.list(params).then((data) => {
      setPesagens(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [loteId]);

  // Agrupar por data
  const sessoes = pesagens.reduce<Record<string, PesagemHistorico[]>>((acc, p) => {
    const key = p.dataPesagem.split("T")[0];
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const sessoesOrdenadas = Object.entries(sessoes).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <Select value={loteId} onValueChange={setLoteId}>
          <SelectTrigger className="w-72">
            <SelectValue placeholder="Filtrar por lote" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os lotes</SelectItem>
            {lotes.map((l) => (
              <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          const pesoMedio =
            pesagensData.length > 0
              ? pesagensData.reduce((s, p) => s + p.pesoKg, 0) / pesagensData.length
              : null;

          const gmdMedio =
            pesagensData.filter((p) => p.gmdPeriodo != null).length > 0
              ? pesagensData.reduce((s, p) => s + (p.gmdPeriodo ?? 0), 0) /
                pesagensData.filter((p) => p.gmdPeriodo != null).length
              : null;

          return (
            <div key={data} className="bg-white rounded-lg border shadow-sm">
              <div className="px-5 py-3 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {formatDate(data)}
                  </p>
                  <Badge variant="secondary" className="text-xs">
                    {pesagensData.length} animal(is)
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  {pesoMedio != null && (
                    <p className="text-xs text-gray-500">
                      Peso médio: <span className="text-gray-700 font-medium">
                        {formatNumber(pesoMedio, 1)} kg
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pesagensData
                    .sort((a, b) => a.animal.brinco.localeCompare(b.animal.brinco))
                    .map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono font-semibold text-green-700">
                          {p.animal.brinco}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">{p.animal.nome || "—"}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{formatNumber(p.pesoKg, 1)}</TableCell>
                        <TableCell className="text-right text-sm">
                          {p.gmdPeriodo != null ? (
                            <span className={p.gmdPeriodo >= 0 ? "text-green-600" : "text-red-600"}>
                              {formatNumber(p.gmdPeriodo, 3)}
                            </span>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-sm text-gray-500">
                          {p.diasPeriodo ? `${p.diasPeriodo}d` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {p.tipo === "ENTRADA" ? "Entrada" : p.tipo === "SAIDA" ? "Saída" : "Periódica"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          );
        })
      )}
    </div>
  );
}
