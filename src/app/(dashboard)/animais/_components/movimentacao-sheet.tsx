"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { animaisApi } from "@/lib/api";

type Lote = { id: string; nome: string; contrato: { nomeFazenda: string } };
type Animal = { id: string; brinco: string; nome?: string | null };

const today = new Date().toISOString().split("T")[0];

export function MovimentacaoSheet({
  open,
  onOpenChange,
  animais,
  lotes,
  loteAtualId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animais: Animal[];
  lotes: Lote[];
  loteAtualId?: string | null;
  onSuccess: () => void;
}) {
  const [loteDestinoId, setLoteDestinoId] = useState("");
  const [dataMovimentacao, setDataMovimentacao] = useState(today);
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtrar lotes disponíveis (excluir lote atual)
  const lotesDisponiveis = lotes.filter((l) => l.id !== loteAtualId);

  async function handleSubmit() {
    if (!loteDestinoId) {
      setError("Selecione o lote de destino");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await animaisApi.movimentar({
        animalIds: animais.map((a) => a.id),
        loteDestinoId,
        dataMovimentacao,
        motivo: motivo || null,
        observacoes: observacoes || null,
      });
      onOpenChange(false);
      onSuccess();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao movimentar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Movimentação Interna (P01.2)</SheetTitle>
          <SheetDescription>
            Mover {animais.length} animal(is) para outro lote.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Animais selecionados */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Animais selecionados
            </p>
            <div className="flex flex-wrap gap-1.5">
              {animais.map((a) => (
                <Badge key={a.id} variant="secondary" className="text-xs">
                  {a.brinco}{a.nome ? ` — ${a.nome}` : ""}
                </Badge>
              ))}
            </div>
          </div>

          {/* Lote destino */}
          <div>
            <label className="text-sm font-medium">Lote de destino *</label>
            <Select value={loteDestinoId} onValueChange={setLoteDestinoId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Selecione o lote" />
              </SelectTrigger>
              <SelectContent>
                {lotesDisponiveis.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nome} — {l.contrato.nomeFazenda}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {lotesDisponiveis.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                Não há outros lotes ativos disponíveis.
              </p>
            )}
          </div>

          {/* Data */}
          <div>
            <label className="text-sm font-medium">Data da movimentação *</label>
            <Input
              type="date"
              className="mt-1"
              value={dataMovimentacao}
              onChange={(e) => setDataMovimentacao(e.target.value)}
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="text-sm font-medium">Motivo</label>
            <Input
              className="mt-1"
              placeholder="Ex: Reagrupamento por categoria"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          {/* Observações */}
          <div>
            <label className="text-sm font-medium">Observações</label>
            <Textarea
              className="mt-1"
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>
          )}
        </div>

        <SheetFooter className="mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || lotesDisponiveis.length === 0}>
            {loading ? "Movendo…" : `Mover ${animais.length} animal(is)`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
