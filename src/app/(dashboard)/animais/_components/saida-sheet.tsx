"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { animaisApi } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

type Animal = { id: string; brinco: string; nome?: string | null; pesoEntradaKg: number };

const today = new Date().toISOString().split("T")[0];

const TIPO_SAIDA_LABEL: Record<string, string> = {
  VENDA: "Venda",
  TRANSFERENCIA_EXTERNA: "Transferência externa",
  MORTE: "Morte",
  DESCARTE: "Descarte",
};

type PesoAnimal = { animalId: string; pesoSaidaKg: string };

export function SaidaSheet({
  open,
  onOpenChange,
  animais,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animais: Animal[];
  onSuccess: () => void;
}) {
  const [tipoSaida, setTipoSaida] = useState<string>("VENDA");
  const [dataSaida, setDataSaida] = useState(today);
  const [pesos, setPesos] = useState<PesoAnimal[]>(
    animais.map((a) => ({ animalId: a.id, pesoSaidaKg: "" }))
  );
  const [valorVendaTotal, setValorVendaTotal] = useState("");
  const [comprador, setComprador] = useState("");
  const [cnpjCpf, setCnpjCpf] = useState("");
  const [municipioDestino, setMunicipioDestino] = useState("");
  const [gtaSaida, setGtaSaida] = useState("");
  const [causaMorte, setCausaMorte] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<{
    processados: { brinco: string; custoTotalAcumulado: number; resultadoLiquido: number | null; gmdTotal: number | null }[];
    bloqueados: { brinco: string; motivo: string }[];
  } | null>(null);

  // Reseta o estado dos pesos sempre que a lista de animais mudar ou o sheet abrir
  useEffect(() => {
    if (open && animais.length > 0) {
      setPesos(animais.map((a) => ({ animalId: a.id, pesoSaidaKg: "" })));
      setError(null);
      setResultado(null);
    }
  }, [open, animais]);

  const isVenda = tipoSaida === "VENDA";
  const isMorte = tipoSaida === "MORTE";

  function updatePeso(animalId: string, value: string) {
    setPesos((prev) =>
      prev.map((p) => (p.animalId === animalId ? { ...p, pesoSaidaKg: value } : p))
    );
  }

  async function handleSubmit() {
    setError(null);
    setResultado(null);
    setLoading(true);

    try {
      const data = await animaisApi.saida({
        animais: pesos.map((p) => ({
          animalId: p.animalId,
          pesoSaidaKg: p.pesoSaidaKg ? parseFloat(p.pesoSaidaKg) : null,
        })),
        tipoSaida,
        dataSaida,
        valorVendaTotal: valorVendaTotal ? parseFloat(valorVendaTotal) : null,
        comprador: comprador || null,
        cnpjCpf: cnpjCpf || null,
        municipioDestino: municipioDestino || null,
        gtaSaida: gtaSaida || null,
        causaMorte: causaMorte || null,
        observacoes: observacoes || null,
        forcarSaidaComCarencia: false,
      });

      setResultado(data);

      // Se todos foram processados, fechar após delay
      if (data.bloqueados.length === 0) {
        setTimeout(() => {
          onOpenChange(false);
          onSuccess();
        }, 2000);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao processar saída");
    } finally {
      setLoading(false);
    }
  }

  // Tela de resultado
  if (resultado) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Resultado da Saída</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4">
            {resultado.processados.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-green-700 mb-2">
                  {resultado.processados.length} animal(is) processado(s)
                </p>
                <div className="space-y-2">
                  {resultado.processados.map((p) => (
                    <div key={p.brinco} className="bg-green-50 border border-green-200 rounded p-3 text-sm">
                      <p className="font-mono font-semibold text-green-800">{p.brinco}</p>
                      <div className="grid grid-cols-2 gap-x-4 mt-1 text-xs text-green-700">
                        <span>Custo acumulado: {formatCurrency(p.custoTotalAcumulado)}</span>
                        {p.resultadoLiquido != null && (
                          <span className={p.resultadoLiquido >= 0 ? "text-green-700" : "text-red-600"}>
                            Resultado: {formatCurrency(p.resultadoLiquido)}
                          </span>
                        )}
                        {p.gmdTotal != null && (
                          <span>GMD: {p.gmdTotal.toFixed(3)} kg/dia</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {resultado.bloqueados.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-700 mb-2">
                  {resultado.bloqueados.length} animal(is) bloqueado(s)
                </p>
                {resultado.bloqueados.map((b) => (
                  <div key={b.brinco} className="bg-red-50 border border-red-200 rounded p-3 text-sm">
                    <p className="font-mono font-semibold text-red-800">{b.brinco}</p>
                    <p className="text-xs text-red-600 mt-0.5">{b.motivo}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <SheetFooter className="mt-6">
            <Button onClick={() => { onOpenChange(false); onSuccess(); }}>
              Fechar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registrar Saída (P01.3)</SheetTitle>
          <SheetDescription>
            Dar baixa em {animais.length} animal(is).
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 mt-4">
          {/* Tipo de saída */}
          <div>
            <label className="text-sm font-medium">Tipo de saída *</label>
            <Select value={tipoSaida} onValueChange={setTipoSaida}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIPO_SAIDA_LABEL).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Data */}
          <div>
            <label className="text-sm font-medium">Data de saída *</label>
            <Input
              type="date"
              className="mt-1"
              value={dataSaida}
              onChange={(e) => setDataSaida(e.target.value)}
            />
          </div>

          <Separator />

          {/* Pesos individuais */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Peso de saída por animal
            </p>
            <div className="space-y-2">
              {animais.map((a) => {
                const peso = pesos.find((p) => p.animalId === a.id);
                return (
                  <div key={a.id} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-sm font-semibold text-green-700">{a.brinco}</span>
                      {a.nome && <span className="text-xs text-gray-400 ml-2">{a.nome}</span>}
                      <span className="text-xs text-gray-400 ml-2">(entrada: {a.pesoEntradaKg} kg)</span>
                    </div>
                    <Input
                      type="number"
                      step="0.1"
                      min={0}
                      className="w-28"
                      placeholder="kg"
                      value={peso?.pesoSaidaKg ?? ""}
                      onChange={(e) => updatePeso(a.id, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Campos condicionais: Venda */}
          {isVenda && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Dados da venda
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium">Valor total da venda (R$)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      className="mt-1"
                      placeholder="0,00"
                      value={valorVendaTotal}
                      onChange={(e) => setValorVendaTotal(e.target.value)}
                    />
                    {animais.length > 1 && valorVendaTotal && (
                      <p className="text-xs text-gray-500 mt-1">
                        = {formatCurrency(parseFloat(valorVendaTotal) / animais.length)} por cabeça
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Comprador</label>
                      <Input className="mt-1" value={comprador} onChange={(e) => setComprador(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">CPF/CNPJ</label>
                      <Input className="mt-1" value={cnpjCpf} onChange={(e) => setCnpjCpf(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Município destino</label>
                      <Input className="mt-1" value={municipioDestino} onChange={(e) => setMunicipioDestino(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-sm font-medium">GTA de saída</label>
                      <Input className="mt-1" value={gtaSaida} onChange={(e) => setGtaSaida(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Campo condicional: Morte */}
          {isMorte && (
            <>
              <Separator />
              <div>
                <label className="text-sm font-medium">Causa da morte *</label>
                <Textarea
                  className="mt-1"
                  rows={2}
                  value={causaMorte}
                  onChange={(e) => setCausaMorte(e.target.value)}
                />
              </div>
            </>
          )}

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
          <Button
            onClick={handleSubmit}
            disabled={loading}
            variant={isMorte ? "destructive" : "default"}
          >
            {loading ? "Processando…" : `Confirmar ${TIPO_SAIDA_LABEL[tipoSaida]?.toLowerCase()}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
