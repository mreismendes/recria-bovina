"use client";

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Upload, Download, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

type RowStatus = "ok" | "warning" | "error";

type ValidatedRow = {
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

type ImportResult = {
  criados: { brinco: string; lote: string; propriedade: string }[];
  pulados: { brinco: string; motivo: string }[];
  propriedadesCriadas: string[];
  lotesCriados: string[];
};

// ── Normalization helpers ───────────────────────────────────────────────────

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
  // If it's already a Date from XLSX
  if (val instanceof Date) {
    return val.toISOString().split("T")[0];
  }
  const s = String(val).trim();
  // DD/MM/YYYY
  const match = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split("T")[0];
  return null;
}

function normNumber(val: unknown): number | null {
  if (val == null || val === "") return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

const today = new Date().toISOString().split("T")[0];

// ── Component ───────────────────────────────────────────────────────────────

export function ImportManager({
  existingProps,
  existingLotes,
  existingBrincos,
  existingRfids,
}: {
  existingProps: string[];
  existingLotes: { nome: string; propriedade: string }[];
  existingBrincos: string[];
  existingRfids: string[];
}) {
  const [rows, setRows] = useState<ValidatedRow[] | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const propSet = new Set(existingProps.map((p) => p.toLowerCase()));
  const loteSet = new Set(existingLotes.map((l) => `${l.propriedade.toLowerCase()}|${l.nome.toLowerCase()}`));
  const brincoSet = new Set(existingBrincos.map((b) => b.toLowerCase()));
  const rfidSet = new Set(existingRfids.filter(Boolean).map((r) => r.toLowerCase()));

  // ── Parse and validate ──

  const handleFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setFileName(file.name);
      setResult(null);
      setError(null);

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target!.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array", cellDates: true });
          const sheetName = wb.SheetNames[0];
          const ws = wb.Sheets[sheetName];
          const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });

          if (raw.length === 0) {
            setError("Planilha vazia. Preencha pelo menos uma linha de dados.");
            setRows(null);
            return;
          }

          const brincosSeen = new Set<string>();
          const validated: ValidatedRow[] = [];

          for (let i = 0; i < raw.length; i++) {
            const r = raw[i];
            const msgs: string[] = [];
            let status: RowStatus = "ok";

            // Map columns (flexible: accept multiple header names)
            const prop = String(r["Propriedade"] ?? r["propriedade"] ?? "").trim();
            const lote = String(r["Lote"] ?? r["lote"] ?? "").trim();
            const brinco = String(r["Brinco"] ?? r["brinco"] ?? "").trim();
            const rfid = String(r["RFID"] ?? r["rfid"] ?? "").trim() || null;
            const nome = String(r["Nome"] ?? r["nome"] ?? "").trim() || null;
            const raca = String(r["Raça"] ?? r["Raca"] ?? r["raca"] ?? r["raça"] ?? "").trim() || null;
            const sexo = normSexo(r["Sexo"] ?? r["sexo"]);
            const dataNasc = normDate(r["Data Nascimento"] ?? r["data nascimento"] ?? r["Data nascimento"]);
            const peso = normNumber(r["Peso Entrada (kg)"] ?? r["Peso entrada (kg)"] ?? r["peso"]);
            const custo = normNumber(r["Custo Aquisição (R$)"] ?? r["Custo aquisição (R$)"] ?? r["custo"]) ?? 0;
            const tipo = normTipoEntrada(r["Tipo Entrada"] ?? r["tipo entrada"] ?? r["Tipo entrada"]);
            const origem = String(r["Origem"] ?? r["origem"] ?? "").trim() || null;
            const gta = String(r["GTA"] ?? r["gta"] ?? "").trim() || null;
            const dataEnt = normDate(r["Data Entrada"] ?? r["data entrada"] ?? r["Data entrada"]) ?? today;
            const obs = String(r["Observações"] ?? r["Observacoes"] ?? r["observações"] ?? r["observacoes"] ?? "").trim() || null;

            // Validations
            if (!prop) { msgs.push("Propriedade vazia"); status = "error"; }
            if (!lote) { msgs.push("Lote vazio"); status = "error"; }
            if (!brinco) { msgs.push("Brinco vazio"); status = "error"; }
            if (!sexo) { msgs.push("Sexo inválido (use Macho/Fêmea/M/F)"); status = "error"; }
            if (peso == null || peso <= 0) { msgs.push("Peso inválido ou vazio"); status = "error"; }
            if (custo < 0) { msgs.push("Custo negativo"); status = "error"; }

            // Duplicate checks
            if (brinco) {
              if (brincoSet.has(brinco.toLowerCase())) {
                msgs.push("Brinco já existe no sistema");
                status = "error";
              } else if (brincosSeen.has(brinco.toLowerCase())) {
                msgs.push("Brinco duplicado na planilha");
                status = "error";
              }
              brincosSeen.add(brinco.toLowerCase());
            }

            if (rfid && rfidSet.has(rfid.toLowerCase())) {
              msgs.push("RFID já existe no sistema");
              status = "error";
            }

            // New entity warnings
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
              rowNum: i + 2, // Excel row (1-indexed + header)
              status,
              messages: msgs,
              newProp,
              newLote,
              data: {
                propriedade: prop,
                lote,
                brinco,
                rfid,
                nome,
                raca,
                sexo,
                dataNascimento: dataNasc,
                pesoEntradaKg: peso,
                custoAquisicao: custo,
                tipoEntrada: tipo,
                origem,
                gta,
                dataEntrada: dataEnt,
                observacoes: obs,
              },
            });
          }

          setRows(validated);
        } catch (err) {
          setError("Erro ao ler o arquivo. Verifique se é um .xlsx válido.");
          setRows(null);
        }
      };
      reader.readAsArrayBuffer(file);
    },
    [propSet, loteSet, brincoSet, rfidSet]
  );

  // ── Import ──

  async function handleImport() {
    if (!rows) return;
    const validRows = rows.filter((r) => r.status !== "error");
    if (validRows.length === 0) {
      setError("Nenhuma linha válida para importar.");
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: validRows.map((r) => r.data),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro na importação");
    } finally {
      setImporting(false);
    }
  }

  // ── Counts ──

  const countOk = rows?.filter((r) => r.status === "ok").length ?? 0;
  const countWarn = rows?.filter((r) => r.status === "warning").length ?? 0;
  const countErr = rows?.filter((r) => r.status === "error").length ?? 0;
  const countValid = countOk + countWarn;

  // ── Result screen ──

  if (result) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importação Concluída</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-800">{result.criados.length}</p>
            <p className="text-sm text-green-700">Animais importados</p>
          </div>
          {result.pulados.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-2xl font-bold text-red-800">{result.pulados.length}</p>
              <p className="text-sm text-red-700">Pulados (conflito)</p>
            </div>
          )}
          {(result.propriedadesCriadas.length > 0 || result.lotesCriados.length > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-800">
                {result.propriedadesCriadas.length + result.lotesCriados.length}
              </p>
              <p className="text-sm text-blue-700">Propriedades / Lotes criados</p>
            </div>
          )}
        </div>

        {result.propriedadesCriadas.length > 0 && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Propriedades criadas:</span> {result.propriedadesCriadas.join(", ")}
          </div>
        )}
        {result.lotesCriados.length > 0 && (
          <div className="text-sm text-gray-600">
            <span className="font-medium">Lotes criados:</span> {result.lotesCriados.join(", ")}
          </div>
        )}

        {result.pulados.length > 0 && (
          <div className="space-y-1">
            <p className="text-sm font-medium text-red-700">Animais pulados:</p>
            {result.pulados.map((p, i) => (
              <p key={i} className="text-sm text-red-600">
                <span className="font-mono">{p.brinco}</span> — {p.motivo}
              </p>
            ))}
          </div>
        )}

        <Button onClick={() => { setResult(null); setRows(null); setFileName(null); }}>
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

      {/* Upload area */}
      <div
        className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-10 text-center cursor-pointer hover:border-green-400 hover:bg-green-50/30 transition-colors"
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFile}
        />
        {fileName ? (
          <div className="flex items-center justify-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-green-600" />
            <div className="text-left">
              <p className="font-medium text-gray-900">{fileName}</p>
              <p className="text-sm text-gray-500">Clique para trocar o arquivo</p>
            </div>
          </div>
        ) : (
          <div>
            <Upload className="h-10 w-10 mx-auto text-gray-400 mb-3" />
            <p className="text-sm text-gray-600">Clique aqui ou arraste um arquivo <strong>.xlsx</strong></p>
            <p className="text-xs text-gray-400 mt-1">Use o modelo para garantir o formato correto</p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Preview */}
      {rows && rows.length > 0 && (
        <>
          {/* Summary */}
          <div className="flex gap-3 flex-wrap">
            <Badge className="bg-green-100 text-green-800 gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> {countOk} OK
            </Badge>
            {countWarn > 0 && (
              <Badge className="bg-amber-100 text-amber-800 gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> {countWarn} com avisos (serão importados)
              </Badge>
            )}
            {countErr > 0 && (
              <Badge className="bg-red-100 text-red-800 gap-1.5">
                <XCircle className="h-3.5 w-3.5" /> {countErr} com erros (serão ignorados)
              </Badge>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-lg border shadow-sm overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Linha</TableHead>
                  <TableHead className="w-12">Status</TableHead>
                  <TableHead>Propriedade</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Brinco</TableHead>
                  <TableHead>Sexo</TableHead>
                  <TableHead className="text-right">Peso (kg)</TableHead>
                  <TableHead>Mensagens</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow
                    key={i}
                    className={
                      r.status === "error"
                        ? "bg-red-50/50"
                        : r.status === "warning"
                        ? "bg-amber-50/50"
                        : ""
                    }
                  >
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
                    <TableCell className="font-mono text-sm font-semibold text-green-700">
                      {r.data.brinco || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.data.sexo === "MACHO" ? "M" : r.data.sexo === "FEMEA" ? "F" : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {r.data.pesoEntradaKg?.toFixed(1) ?? "—"}
                    </TableCell>
                    <TableCell>
                      {r.messages.length > 0 && (
                        <div className="space-y-0.5">
                          {r.messages.map((m, j) => (
                            <p key={j} className={`text-xs ${r.status === "error" ? "text-red-600" : "text-amber-600"}`}>
                              {m}
                            </p>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Action */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {countValid} de {rows.length} linha(s) serão importadas.
              {countErr > 0 && ` ${countErr} serão ignoradas.`}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => { setRows(null); setFileName(null); }}>
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                disabled={importing || countValid === 0}
                className="gap-2"
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Importando…</>
                ) : (
                  `Confirmar importação de ${countValid} animal(is)`
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
