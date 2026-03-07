"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { lotesApi } from "@/lib/api";

type GrupoRef = { id: string; nome: string };
type Contrato = { id: string; idContrato: string; nomeFazenda: string };
type Lote = {
  id: string;
  nome: string;
  contratoId?: string | null;
  contrato?: Contrato | null;
  grupoContratoId?: string | null;
  grupoContrato?: GrupoRef | null;
  pertinencias: { id: string }[];
};

export function MoveLoteSheet({
  open,
  onOpenChange,
  lotes,
  contratos,
  grupos,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lotes: Lote[];
  contratos: Contrato[];
  grupos: GrupoRef[];
  onSuccess: () => void;
}) {
  const [destinoTipo, setDestinoTipo] = useState<"contrato" | "grupo">(
    contratos.length > 0 ? "contrato" : "grupo"
  );
  const [destinoId, setDestinoId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    movidos: number;
    ignorados: number;
  } | null>(null);

  const totalCabecas = lotes.reduce((sum, l) => sum + l.pertinencias.length, 0);

  function handleDestinoTipoChange(tipo: "contrato" | "grupo") {
    setDestinoTipo(tipo);
    setDestinoId("");
    setError(null);
    setResultado(null);
  }

  async function handleSubmit() {
    if (!destinoId) {
      setError("Selecione o destino");
      return;
    }
    setError(null);
    setResultado(null);
    setLoading(true);
    try {
      const res = await lotesApi.move({
        loteIds: lotes.map((l) => l.id),
        contratoId: destinoTipo === "contrato" ? destinoId : null,
        grupoContratoId: destinoTipo === "grupo" ? destinoId : null,
      });
      setResultado(res);
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao mover lotes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Mover Lotes</SheetTitle>
          <SheetDescription>
            Mover {lotes.length} lote(s) ({totalCabecas} cabeça(s)) para outro
            contrato ou grupo de contratos.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Lotes selecionados */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Lotes selecionados
            </p>
            <div className="flex flex-wrap gap-1.5">
              {lotes.map((l) => (
                <Badge key={l.id} variant="secondary" className="text-xs">
                  {l.nome}{" "}
                  <span className="text-gray-400 ml-1">
                    ({l.pertinencias.length} cab.)
                  </span>
                </Badge>
              ))}
            </div>
          </div>

          {/* Tipo de destino */}
          <div>
            <label className="text-sm font-medium">Tipo de destino *</label>
            <Select
              value={destinoTipo}
              onValueChange={(v) =>
                handleDestinoTipoChange(v as "contrato" | "grupo")
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contratos.length > 0 && (
                  <SelectItem value="contrato">
                    Contrato (fazenda individual)
                  </SelectItem>
                )}
                {grupos.length > 0 && (
                  <SelectItem value="grupo">Grupo de Contratos</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Destino selector */}
          <div>
            <label className="text-sm font-medium">
              {destinoTipo === "contrato"
                ? "Contrato de destino *"
                : "Grupo de destino *"}
            </label>
            <Select value={destinoId} onValueChange={setDestinoId}>
              <SelectTrigger className="mt-1">
                <SelectValue
                  placeholder={
                    destinoTipo === "contrato"
                      ? "Selecione o contrato"
                      : "Selecione o grupo"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {destinoTipo === "contrato"
                  ? contratos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.idContrato} — {c.nomeFazenda}
                      </SelectItem>
                    ))
                  : grupos.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.nome}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          {/* Warning about cost impact */}
          <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 rounded-md p-3">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Impacto nos custos</p>
              <p className="text-xs mt-0.5">
                Os custos futuros de suplementação e medicamentos dos animais
                nestes lotes passarão a ser vinculados ao novo contrato/grupo de
                destino.
              </p>
            </div>
          </div>

          {/* Resultado */}
          {resultado && (
            <div className="bg-green-50 border border-green-200 rounded-md p-3 text-sm text-green-800">
              <p className="font-medium">Movimentação concluída</p>
              <p className="text-xs mt-0.5">
                {resultado.movidos} lote(s) movido(s)
                {resultado.ignorados > 0 &&
                  `, ${resultado.ignorados} já estava(m) no destino`}
                .
              </p>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </p>
          )}
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {resultado ? "Fechar" : "Cancelar"}
          </Button>
          {!resultado && (
            <Button onClick={handleSubmit} disabled={loading || !destinoId}>
              {loading ? "Movendo…" : `Mover ${lotes.length} lote(s)`}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
