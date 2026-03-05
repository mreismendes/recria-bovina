"use client";

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Loader2, Scale, Beef } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

type RowStatus = "ok" | "warning" | "error";

type ValidatedAnimalRow = {
  rowNum: number;
  status: RowStatus;
  messages: string[];
  data: {
    propriedade: string;
    lote: string;
    brinco: string;
    rfid: string | null;
    nome: string | null;
    raca: string | null;
    sexo: "MACHO" | "FEMEA" | null;
    dataNascimento: string | null;
    pesoEntradaKg: number | null;
    custoAquisicao: number;
    tipoEntrada: "COMPRA_EXTERNA" | "NASCIMENTO_PROPRIO" | "TRANSFERENCIA_INTERNA";
    origem: string | null;
    gta: string | null;
    dataEntrada: string;
    observacoes: string | null;
  };
  newProp: boolean;
  newLote: boolean;
};

type ValidatedPesagemRow = {
  rowNum: number;
  status: RowStatus;
  messages: string[];
  data: {
    brinco: string;
    dataPesagem: string;
    pesoKg: number | null;
    jejumHoras: number | null;
    responsavel: string | null;
    observacoes: string | null;
  };
  animalId: string | null;
};

type ImportResult = {
  animais?: {
    criados: { brinco: string; lote: string; propriedade: string }[];
    pulados: { brinco: string; motivo: string }[];
    propriedadesCriadas: string[];
    lotesCriados: string[];
  };
  pesagens?: {
    registradas: number;
    puladas: number;
  };
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function normSexo(val: unknown): "MACHO" | "FEMEA" | null {
  if (!val) return null;
  const s = String(val).trim().toUpperCase();
  if (["MACHO", "M"].includes(s)) return "MACHO";
  if (["FEMEA", "FÊMEA", "F"].includes(s)) return "FEMEA";
  return null;
}

function normTipoEntrada(val: unknown): "COMPRA_EXTERNA" | "NASCIMENTO_PROPRIO" | "TRANSFERENCIA_INTERNA" {
  if (!val) return "COMPRA_EXTERNA";
  const s = String(val).trim().toLowerCase();
  if (s.includes("nascimento")) return "NASCIMENTO_PROPRIO";
  if (s.includes("transfer")) return "TRANSFERENCIA_INTERNA";
  return "COMPRA_EXTERNA";
}

function normDate(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split("T")[0];
  const s = String(val).trim();
  const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split("T")[0];
  return null;
}

function normNumber(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function getCol(r: Record<string, unknown>, ...keys: string[]): unknown {
  for (const k of keys) {
    if (r[k] !== undefined && r[k] !== "") return r[k];
  }
  return "";
}

const today = new Date().toISOString().split("T")[0];

// ── Component ───────────────────────────────────────────────────────────────

export function ImportManager({
  existingProps,
  existingLotes,
  existingBrincos,
  existingRfids,
  existingPesagemKeys,
}: {
  existingProps: string[];
  existingLotes: { nome: string; propriedade: string }[];
  existingBrincos: string[];
  existingRfids: string[];
  existingPesagemKeys: string[];
}) {
  const [animalRows, setAnimalRows] = useState<ValidatedAnimalRow[] | null>(null);
  const [pesagemRows, setPesagemRows] = useState<ValidatedPesagemRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const propSet = new Set(existingProps.map((p) => p.toLowerCase()));
  const loteSet = new Set(existingLotes.map((l) => `${l.propriedade.toLowerCase()}|${l.nome.toLowerCase()}`));
  const brincoSet = new Set(existingBrincos.map((b) => b.toLowerCase()));
  const rfidSet = new Set(existingRfids.filter(Boolean).map((r) => r.toLowerCase()));
  const pesagemKeySet = new Set(existingPesagemKeys.map((k) => k.toLowerCase()));

  // Map brinco → animalId for pesagem validation (we don't have IDs client-side, but server resolves)
  const brincoExists = (b: string) => brincoSet.has(b.toLowerCase());

  // ── Parse XLSX ──

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      setResult(null);
      setError(null);
      setAnimalRows(null);
      setPesagemRows(null);

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target!.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array", cellDates: true });

          // ── Parse Animais sheet ──
          const animalSheet = wb.Sheets[wb.SheetNames[0]]; // First sheet = Importação
          const animalRaw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(animalSheet, { defval: "" });
          
          if (animalRaw.length > 0) {
            setAnimalRows(validateAnimalRows(animalRaw));
          }

          // ── Parse Pesagens sheet ──
          const pesagemSheetName = wb.SheetNames.find((n) =>
            n.toLowerCase().includes("pesag")
          );
          if (pesagemSheetName) {
            const pesagemSheet = wb.Sheets[pesagemSheetName];
            const pesagemRaw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(pesagemSheet, { defval: "" });
            if (pesagemRaw.length > 0) {
              setPesagemRows(validatePesagemRows(pesagemRaw));
            }
          }

          if (animalRaw.length === 0 && (!pesagemSheetName || XLSX.utils.sheet_to_json(wb.Sheets[pesagemSheetName!]).length === 0)) {
            setError("Nenhum dado encontrado. Preencha a aba 'Importação' e/ou 'Pesagens'.");
          }
        } catch {
          setError("Erro ao ler o arquivo. Verifique se é um .xlsx válido.");
        }
      };
      reader.readAsArrayBuffer(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [propSet, loteSet, brincoSet, rfidSet, pesagemKeySet]
  );

  // ── Validate animal rows ──

  function validateAnimalRows(raw: Record<string, unknown>[]): ValidatedAnimalRow[] {
    const brincosSeen = new Set<string>();
    const validated: ValidatedAnimalRow[] = [];

    for (let i = 0; i < raw.length; i++) {
      const r = raw[i];
      const msgs: string[] = [];
      let status: RowStatus = "ok";

      const prop = String(getCol(r, "Propriedade", "propriedade")).trim();
      const lote = String(getCol(r, "Lote", "lote")).trim();
      const brinco = String(getCol(r, "Brinco", "brinco")).trim();
      const rfid = String(getCol(r, "RFID", "rfid")).trim() || null;
      const nome = String(getCol(r, "Nome", "nome")).trim() || null;
      const raca = String(getCol(r, "Raça", "Raca", "raca", "raça")).trim() || null;
      const sexo = normSexo(getCol(r, "Sexo", "sexo"));
      const dataNasc = normDate(getCol(r, "Data Nascimento", "data nascimento", "Data nascimento"));
      const peso = normNumber(getCol(r, "Peso Entrada (kg)", "Peso entrada (kg)", "peso"));
      const custo = normNumber(getCol(r, "Custo Aquisição (R$)", "Custo aquisição (R$)", "custo")) ?? 0;
      const tipo = normTipoEntrada(getCol(r, "Tipo Entrada", "tipo entrada", "Tipo entrada"));
      const origem = String(getCol(r, "Origem", "origem")).trim() || null;
      const gta = String(getCol(r, "GTA", "gta")).trim() || null;
      const dataEnt = normDate(getCol(r, "Data Entrada", "data entrada", "Data entrada")) ?? today;
      const obs = String(getCol(r, "Observações", "Observacoes", "observações", "observacoes")).trim() || null;

      if (!prop) { msgs.push("Propriedade vazia"); status = "error"; }
      if (!lote) { msgs.push("Lote vazio"); status = "error"; }
      if (!brinco) { msgs.push("Brinco vazio"); status = "error"; }
      if (!sexo) { msgs.push("Sexo inválido"); status = "error"; }
      if (peso == null || peso <= 0) { msgs.push("Peso inválido"); status = "error"; }
      if (custo < 0) { msgs.push("Custo negativo"); status = "error"; }

      if (brinco) {
        if (brincoSet.has(brinco.toLowerCase())) {
          msgs.push("Brinco já existe no sistema"); status = "error";
        } else if (brincosSeen.has(brinco.toLowerCase())) {
          msgs.push("Brinco duplicado na planilha"); status = "error";
        }
        brincosSeen.add(brinco.toLowerCase());
      }

      if (rfid && rfidSet.has(rfid.toLowerCase())) {
        msgs.push("RFID já existe"); status = "error";
      }

      const newProp = prop ? !propSet.has(prop.toLowerCase()) : false;
      const newLote = prop && lote ? !loteSet.has(`${prop.toLowerCase()}|${lote.toLowerCase()}`) : false;

      if (newProp && status !== "error") {
        msgs.push(`Propriedade "${prop}" será criada`);
        if (status === "ok") status = "warning";
      }
      if (newLote && status !== "error") {
        msgs.push(`Lote "${lote}" será criado`);
        if (status === "ok") status = "warning";
      }

      validated.push({
        rowNum: i + 2,
        status,
        messages: msgs,
        newProp,
        newLote,
        data: { propriedade: prop, lote, brinco, rfid, nome, raca, sexo, dataNascimento: dataNasc, pesoEntradaKg: peso, custoAquisicao: custo, tipoEntrada: tipo, origem, gta, dataEntrada: dataEnt, observacoes: obs },
      });
    }
    return validated;
  }

  // ── Validate pesagem rows ──

  function validatePesagemRows(raw: Record<string, unknown>[]): ValidatedPesagemRow[] {
    const seenKeys = new Set<string>();
    const validated: ValidatedPesagemRow[] = [];

    for (let i = 0; i < raw.length; i++) {
      const r = raw[i];
      const msgs: string[] = [];
      let status: RowStatus = "ok";

      const brinco = String(getCol(r, "Brinco", "brinco")).trim();
      const dataPesagem = normDate(getCol(r, "Data Pesagem", "data pesagem", "Data pesagem", "Data"));
      const pesoKg = normNumber(getCol(r, "Peso (kg)", "peso (kg)", "Peso", "peso"));
      const jejum = normNumber(getCol(r, "Jejum (horas)", "jejum (horas)", "Jejum", "jejum"));
      const responsavel = String(getCol(r, "Responsável", "Responsavel", "responsável", "responsavel")).trim() || null;
      const obs = String(getCol(r, "Observações", "Observacoes", "observações", "observacoes")).trim() || null;

      if (!brinco) { msgs.push("Brinco vazio"); status = "error"; }
      if (!dataPesagem) { msgs.push("Data inválida"); status = "error"; }
      if (pesoKg == null || pesoKg <= 0) { msgs.push("Peso inválido"); status = "error"; }

      // Check animal exists
      if (brinco && !brincoExists(brinco)) {
        msgs.push("Animal não encontrado no sistema"); status = "error";
      }

      // RN-02: no duplicate brinco+date
      if (brinco && dataPesagem) {
        const key = `${brinco.toLowerCase()}|${dataPesagem}`;
        if (pesagemKeySet.has(key)) {
          msgs.push("Pesagem já existe para este animal nesta data"); status = "error";
        } else if (seenKeys.has(key)) {
          msgs.push("Duplicado na planilha (mesmo brinco+data)"); status = "error";
        }
        seenKeys.add(key);
      }

      validated.push({
        rowNum: i + 2,
        status,
        messages: msgs,
        data: { brinco, dataPesagem: dataPesagem ?? "", pesoKg, jejumHoras: jejum, responsavel, observacoes: obs },
        animalId: null, // resolved server-side
      });
    }
    return validated;
  }

  // ── Import ──

  async function handleImport() {
    setImporting(true);
    setError(null);
    const importResult: ImportResult = {};

    try {
      // Import animais
      const validAnimais = animalRows?.filter((r) => r.status !== "error") ?? [];
      if (validAnimais.length > 0) {
        const res = await fetch("/api/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rows: validAnimais.map((r) => r.data) }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        importResult.animais = json.data;
      }

      // Import pesagens - group by date, send each as a session
      const validPesagens = pesagemRows?.filter((r) => r.status !== "error") ?? [];
      if (validPesagens.length > 0) {
        // Resolve brinco → animalId server-side: send to a simple endpoint
        const res = await fetch("/api/weighings/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pesagens: validPesagens.map((r) => r.data),
          }),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        importResult.pesagens = json.data;
      }

      setResult(importResult);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro na importação");
    } finally {
      setImporting(false);
    }
  }

  // ── Counts ──

  const animalCountOk = animalRows?.filter((r) => r.status === "ok").length ?? 0;
  const animalCountWarn = animalRows?.filter((r) => r.status === "warning").length ?? 0;
  const animalCountErr = animalRows?.filter((r) => r.status === "error").length ?? 0;
  const animalCountValid = animalCountOk + animalCountWarn;

  const pesagemCountOk = pesagemRows?.filter((r) => r.status === "ok").length ?? 0;
  const pesagemCountErr = pesagemRows?.filter((r) => r.status === "error").length ?? 0;

  const totalValid = animalCountValid + pesagemCountOk;
  const hasData = (animalRows && animalRows.length > 0) || (pesagemRows && pesagemRows.length > 0);

  // ── Result screen ──

  if (result) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Importação Concluída</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {result.animais && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-2xl font-bold text-green-800">{result.animais.criados.length}</p>
              <p className="text-sm text-green-700">Animais importados</p>
            </div>
          )}
          {result.animais && result.animais.pulados.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-2xl font-bold text-red-800">{result.animais.pulados.length}</p>
              <p className="text-sm text-red-700">Animais pulados</p>
            </div>
          )}
          {result.pesagens && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-800">{result.pesagens.registradas}</p>
              <p className="text-sm text-blue-700">Pesagens registradas</p>
            </div>
          )}
        </div>

        {result.animais?.propriedadesCriadas && result.animais.propriedadesCriadas.length > 0 && (
          <p className="text-sm text-gray-600"><span className="font-medium">Propriedades criadas:</span> {result.animais.propriedadesCriadas.join(", ")}</p>
        )}
        {result.animais?.lotesCriados && result.animais.lotesCriados.length > 0 && (
          <p className="text-sm text-gray-600"><span className="font-medium">Lotes criados:</span> {result.animais.lotesCriados.join(", ")}</p>
        )}
        {result.animais?.pulados && result.animais.pulados.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-red-700">Animais pulados:</p>
            {result.animais.pulados.map((p, i) => (
              <p key={i} className="text-sm text-red-600"><span className="font-mono">{p.brinco}</span> — {p.motivo}</p>
            ))}
          </div>
        )}

        <Button onClick={() => { setResult(null); setAnimalRows(null); setPesagemRows(null); setFileName(null); }}>
          Nova importação
        </Button>
      </div>
    );
  }

  // ── Main screen ──

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importar Dados</h1>
          <p className="text-sm text-gray-500 mt-1">Upload de planilha para cadastro em lote</p>
        </div>
        <a href="/modelo-importacao.xlsx" download>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Baixar modelo
          </Button>
        </a>
      </div>

      {/* Upload */}
      <div
        className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
        {fileName ? (
          <div className="flex items-center justify-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">{fileName}</p>
              <p className="text-sm text-gray-500">Clique para trocar</p>
            </div>
          </div>
        ) : (
          <div>
            <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-600">Clique ou arraste um arquivo <strong>.xlsx</strong></p>
            <p className="text-xs text-gray-400 mt-1">O modelo tem abas para Animais e Pesagens</p>
          </div>
        )}
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>}

      {/* ── Animais Preview ── */}
      {animalRows && animalRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Beef className="h-5 w-5 text-green-700" />
            <h2 className="text-lg font-semibold text-gray-900">Animais ({animalRows.length} linhas)</h2>
            <div className="flex gap-2 ml-auto">
              <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle2 className="h-3 w-3" /> {animalCountOk}</Badge>
              {animalCountWarn > 0 && <Badge className="bg-amber-100 text-amber-800 gap-1"><AlertTriangle className="h-3 w-3" /> {animalCountWarn}</Badge>}
              {animalCountErr > 0 && <Badge className="bg-red-100 text-red-800 gap-1"><XCircle className="h-3 w-3" /> {animalCountErr}</Badge>}
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Propriedade</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Brinco</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead className="text-right">Peso</TableHead>
                  <TableHead>Mensagens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {animalRows.map((r, i) => (
                  <TableRow key={i} className={r.status === "error" ? "bg-red-50/50" : r.status === "warning" ? "bg-amber-50/50" : ""}>
                    <TableCell className="text-xs text-gray-400">{r.rowNum}</TableCell>
                    <TableCell>
                      {r.status === "ok" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {r.status === "warning" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      {r.status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.data.propriedade}
                      {r.newProp && <Badge variant="outline" className="ml-1 text-[10px] text-blue-600">nova</Badge>}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.data.lote}
                      {r.newLote && <Badge variant="outline" className="ml-1 text-[10px] text-blue-600">novo</Badge>}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-green-700">{r.data.brinco || "—"}</TableCell>
                    <TableCell className="text-sm">{r.data.sexo === "MACHO" ? "M" : r.data.sexo === "FEMEA" ? "F" : "—"}</TableCell>
                    <TableCell className="text-right text-sm">{r.data.pesoEntradaKg?.toFixed(1) ?? "—"}</TableCell>
                    <TableCell>
                      {r.messages.map((m, j) => (
                        <p key={j} className={`text-xs ${r.status === "error" ? "text-red-600" : "text-amber-600"}`}>{m}</p>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Pesagens Preview ── */}
      {pesagemRows && pesagemRows.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Scale className="h-5 w-5 text-blue-700" />
            <h2 className="text-lg font-semibold text-gray-900">Pesagens ({pesagemRows.length} linhas)</h2>
            <div className="flex gap-2 ml-auto">
              <Badge className="bg-green-100 text-green-800 gap-1"><CheckCircle2 className="h-3 w-3" /> {pesagemCountOk}</Badge>
              {pesagemCountErr > 0 && <Badge className="bg-red-100 text-red-800 gap-1"><XCircle className="h-3 w-3" /> {pesagemCountErr}</Badge>}
            </div>
          </div>

          <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Brinco</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                  <TableHead className="text-right">Jejum</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Mensagens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pesagemRows.map((r, i) => (
                  <TableRow key={i} className={r.status === "error" ? "bg-red-50/50" : ""}>
                    <TableCell className="text-xs text-gray-400">{r.rowNum}</TableCell>
                    <TableCell>
                      {r.status === "ok" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                      {r.status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                    </TableCell>
                    <TableCell className="font-mono text-sm font-semibold text-green-700">{r.data.brinco || "—"}</TableCell>
                    <TableCell className="text-sm">{r.data.dataPesagem || "—"}</TableCell>
                    <TableCell className="text-right text-sm">{r.data.pesoKg?.toFixed(1) ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm text-gray-500">{r.data.jejumHoras != null ? `${r.data.jejumHoras}h` : "—"}</TableCell>
                    <TableCell className="text-sm text-gray-500">{r.data.responsavel || "—"}</TableCell>
                    <TableCell>
                      {r.messages.map((m, j) => (
                        <p key={j} className="text-xs text-red-600">{m}</p>
                      ))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ── Action bar ── */}
      {hasData && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {totalValid} linha(s) válida(s) para importar
            {(animalCountErr + pesagemCountErr > 0) && `. ${animalCountErr + pesagemCountErr} serão ignoradas.`}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setAnimalRows(null); setPesagemRows(null); setFileName(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleImport} disabled={importing || totalValid === 0} className="gap-2">
              {importing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Importando…</>
              ) : (
                `Confirmar importação`
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
