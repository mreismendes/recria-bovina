"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Search, Beef, ArrowRightLeft, LogOut, CheckSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { animalSchema, type AnimalFormData } from "@/lib/validations";
import { animaisApi } from "@/lib/api";
import { formatPeso, formatCurrency, parseBrNumber, SEXO_LABEL, TIPO_ENTRADA_LABEL, todayLocalStr } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { MovimentacaoSheet } from "./movimentacao-sheet";
import { SaidaSheet } from "./saida-sheet";

type Lote = { id: string; nome: string; contrato?: { nomeFazenda: string } | null; grupoContrato?: { nome: string } | null };
type Pesagem = { id: string; pesoKg: number; dataPesagem: string; gmdPeriodo?: number | null };
type Pertinencia = { lote: Lote; dataInicio: string; dataFim?: string | null };
type Animal = {
  id: string; brinco: string; rfid?: string | null; nome?: string | null; raca?: string | null;
  sexo: string; dataNascimento?: string | null; pesoEntradaKg: number; custoAquisicao: number;
  tipoEntrada: string; origem?: string | null; notaFiscal?: string | null; status: string; observacoes?: string | null;
  pertinencias: Pertinencia[];
  pesagens: Pesagem[];
};

const today = todayLocalStr();


export function AnimaisManager({ initialAnimais, lotes, userRole }: { initialAnimais: Animal[]; lotes: Lote[]; userRole: string }) {
  const isAdmin = userRole === "ADMIN";
  const router = useRouter();
  const [items, setItems]         = useState(initialAnimais);
  const [search, setSearch]       = useState("");
  const [loteFilter, setLoteFilter] = useState("todos");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing]     = useState<Animal | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [movimentacaoOpen, setMovimentacaoOpen] = useState(false);
  const [saidaOpen, setSaidaOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<AnimalFormData>({
    resolver: zodResolver(animalSchema),
    defaultValues: {
      brinco: "", rfid: "", nome: "", raca: "", sexo: "MACHO",
      dataNascimento: "", pesoEntradaKg: undefined as any,
      custoAquisicao: undefined as any, tipoEntrada: "COMPRA_EXTERNA",
      origem: "", gtaEntrada: "", notaFiscal: "", loteId: lotes[0]?.id ?? "", dataEntrada: today,
      observacoes: "",
    },
  });

  // Filtering
  const filtered = items.filter(a => {
    const matchSearch = search === "" ||
      a.brinco.toLowerCase().includes(search.toLowerCase()) ||
      (a.nome?.toLowerCase().includes(search.toLowerCase())) ||
      (a.rfid?.toLowerCase().includes(search.toLowerCase()));
    const matchLote = loteFilter === "todos" ||
      a.pertinencias.some(p => !p.dataFim && p.lote.id === loteFilter);
    return matchSearch && matchLote;
  });

  function openCreate() {
    setEditing(null);
    form.reset({
      brinco: "", rfid: "", nome: "", raca: "", sexo: "MACHO", dataNascimento: "",
      pesoEntradaKg: undefined as any, custoAquisicao: undefined as any, tipoEntrada: "COMPRA_EXTERNA",
      origem: "", gtaEntrada: "", notaFiscal: "", loteId: lotes[0]?.id ?? "", dataEntrada: today, observacoes: "",
    });
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(item: Animal) {
    setEditing(item);
    form.reset({
      brinco: item.brinco, rfid: item.rfid ?? "", nome: item.nome ?? "", raca: item.raca ?? "",
      sexo: item.sexo as any, dataNascimento: item.dataNascimento?.toString().split("T")[0] ?? "",
      pesoEntradaKg: String(item.pesoEntradaKg) as any, custoAquisicao: String(item.custoAquisicao) as any,
      tipoEntrada: item.tipoEntrada as any, origem: item.origem ?? "", gtaEntrada: "",
      notaFiscal: item.notaFiscal ?? "",
      loteId: item.pertinencias[0]?.lote.id ?? lotes[0]?.id ?? "",
      dataEntrada: today, observacoes: item.observacoes ?? "",
    });
    setError(null);
    setSheetOpen(true);
  }

  async function onSubmit(data: AnimalFormData) {
    setError(null);
    try {
      if (editing) {
        // On edit: only update mutable fields
        const updated = await animaisApi.update(editing.id, {
          nome: data.nome, raca: data.raca, rfid: data.rfid, notaFiscal: data.notaFiscal, observacoes: data.observacoes,
        });
        setItems(items.map(i => i.id === editing.id ? { ...i, ...updated } : i));
      } else {
        const created = await animaisApi.create(data);
        const loteAtual = lotes.find(l => l.id === data.loteId);
        setItems([...items, {
          ...created,
          pertinencias: loteAtual ? [{ lote: loteAtual, dataInicio: data.dataEntrada }] : [],
          pesagens: [{ id: "new", pesoKg: data.pesoEntradaKg, dataPesagem: data.dataEntrada }],
        }]);
      }
      setSheetOpen(false);
      router.refresh();
    } catch (e: any) { setError(e.message); }
  }

  // Helpers
  function getLoteAtual(animal: Animal) {
    return animal.pertinencias.find(p => !p.dataFim)?.lote;
  }
  function getPesoAtual(animal: Animal) {
    return animal.pesagens[0]?.pesoKg;
  }

  // Selection helpers
  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((a) => a.id)));
    }
  }
  const selectedAnimais = items.filter((a) => selectedIds.has(a.id));
  const selectedLoteId = selectedAnimais[0]?.pertinencias.find((p) => !p.dataFim)?.lote.id ?? null;

  async function onDeleteBatch() {
    if (selectedIds.size === 0) return;
    setDeleting(true);
    setError(null);
    try {
      const result = await animaisApi.deleteBatch(Array.from(selectedIds));
      const deletedIds = new Set(
        items.filter(i => selectedIds.has(i.id) && !result.bloqueados.some(b => b.brinco === i.brinco)).map(i => i.id)
      );
      setItems(items.filter(i => !deletedIds.has(i.id)));
      setSelectedIds(new Set());
      setDeleteDialogOpen(false);
      if (result.bloqueados.length > 0) {
        setError(
          `${result.excluidos} animal(is) excluído(s). ` +
          `${result.bloqueados.length} não pôde(puderam) ser excluído(s): ` +
          result.bloqueados.map(b => `${b.brinco} (${b.motivo})`).join("; ")
        );
      }
      router.refresh();
    } catch (e: any) {
      setError(e.message);
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Animais</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} animal(is) ativo(s)</p>
        </div>
        <Button onClick={openCreate} className="gap-2" disabled={lotes.length === 0}>
          <Plus className="h-4 w-4" /> Entrada de Animal
        </Button>
      </div>

      {lotes.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-700">
          Cadastre ao menos um lote antes de registrar animais.
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>}

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input placeholder="Buscar por brinco, nome ou RFID…" className="pl-9"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={loteFilter} onValueChange={setLoteFilter}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Todos os lotes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os lotes</SelectItem>
            {lotes.map(l => <SelectItem key={l.id} value={l.id}>{l.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Selection action bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">
              {selectedIds.size} animal(is) selecionado(s)
            </span>
            <button
              className="text-xs text-blue-600 underline ml-2"
              onClick={() => setSelectedIds(new Set())}
            >
              Limpar seleção
            </button>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => setMovimentacaoOpen(true)}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Mover
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-red-700 border-red-200 hover:bg-red-50"
              onClick={() => setSaidaOpen(true)}
            >
              <LogOut className="h-3.5 w-3.5" />
              Registrar Saída
            </Button>
            {isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-red-700 border-red-300 hover:bg-red-50"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  checked={filtered.length > 0 && selectedIds.size === filtered.length}
                  onChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Brinco</TableHead>
              <TableHead>Nome / Raça</TableHead>
              <TableHead>Lote atual</TableHead>
              <TableHead className="text-center">Sexo</TableHead>
              <TableHead className="text-right">Peso entrada</TableHead>
              <TableHead className="text-right">Peso atual</TableHead>
              <TableHead className="text-right">Custo aquisição</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-gray-400">
                  <Beef className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  {search || loteFilter !== "todos" ? "Nenhum animal encontrado com os filtros aplicados" : "Nenhum animal cadastrado"}
                </TableCell>
              </TableRow>
            )}
            {filtered.map(item => {
              const loteAtual = getLoteAtual(item);
              const pesoAtual = getPesoAtual(item);
              return (
                <TableRow key={item.id} className={selectedIds.has(item.id) ? "bg-blue-50/50" : ""}>
                  <TableCell>
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedIds.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-mono font-semibold text-green-700">{item.brinco}</span>
                      {item.rfid && <p className="text-xs text-gray-400 mt-0.5">RFID: {item.rfid}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="font-medium">{item.nome || "—"}</span>
                      {item.raca && <p className="text-xs text-gray-400 mt-0.5">{item.raca}</p>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {loteAtual
                      ? <div>
                          <span className="text-sm font-medium">{loteAtual.nome}</span>
                          <p className="text-xs text-gray-400">{loteAtual.contrato?.nomeFazenda ?? loteAtual.grupoContrato?.nome ?? ""}</p>
                        </div>
                      : <span className="text-gray-300">—</span>
                    }
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">{SEXO_LABEL[item.sexo]}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatPeso(item.pesoEntradaKg)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {pesoAtual ? (
                      <span className={pesoAtual > item.pesoEntradaKg ? "text-green-600" : "text-red-600"}>
                        {formatPeso(pesoAtual)}
                      </span>
                    ) : "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(item.custoAquisicao)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4 text-gray-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Sheet — Entrada / Edição */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? `Editar Animal — ${editing.brinco}` : "Entrada de Animal (P01.1)"}</SheetTitle>
            <SheetDescription>
              {editing
                ? "Apenas nome, raça, RFID e observações podem ser editados após o cadastro."
                : "Registra o animal no sistema, cria a pesagem de entrada e aloca no lote."}
            </SheetDescription>
          </SheetHeader>

          <div className="overflow-y-auto max-h-[calc(100vh-200px)] pr-1">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 mt-2">

                {/* Identificação */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Identificação</p>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="brinco" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Brinco *</FormLabel>
                          <FormControl><Input placeholder="NE-001" {...field} disabled={!!editing} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="rfid" render={({ field }) => (
                        <FormItem>
                          <FormLabel>RFID</FormLabel>
                          <FormControl><Input placeholder="(opcional)" {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="nome" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl><Input placeholder="(opcional)" {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="raca" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Raça</FormLabel>
                          <FormControl><Input placeholder="Ex: Nelore PO" {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <FormField control={form.control} name="sexo" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sexo *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value} disabled={!!editing}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="MACHO">Macho</SelectItem>
                              <SelectItem value="FEMEA">Fêmea</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="dataNascimento" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de nascimento</FormLabel>
                          <FormControl><Input type="date" {...field} value={field.value ?? ""} disabled={!!editing} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                {!editing && <>
                  <Separator />
                  {/* Entrada */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Entrada</p>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="tipoEntrada" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de entrada *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                {Object.entries(TIPO_ENTRADA_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="dataEntrada" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data de entrada *</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <FormField control={form.control} name="loteId" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lote de destino *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Selecione o lote" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {lotes.map(l => <SelectItem key={l.id} value={l.id}>{l.nome} — {l.contrato?.nomeFazenda ?? l.grupoContrato?.nome ?? ""}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="pesoEntradaKg" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Peso de entrada (kg) *</FormLabel>
                            <FormControl>
                              <Input type="text" inputMode="decimal" placeholder="Ex: 245,0" {...field}
                                value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.value)} />
                            </FormControl>
                            <FormDescription>Gera a 1ª pesagem automática.</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="custoAquisicao" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Custo de aquisição (R$)</FormLabel>
                            <FormControl>
                              <Input type="text" inputMode="decimal" placeholder="0,00" {...field}
                                value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : e.target.value)} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>

                      <FormField control={form.control} name="origem" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Origem</FormLabel>
                          <FormControl><Input placeholder="Ex: Fazenda Bom Retiro — Uberaba/MG" {...field} value={field.value ?? ""} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="gtaEntrada" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número da GTA</FormLabel>
                            <FormControl><Input placeholder="Ex: GTA-2025-001" {...field} value={field.value ?? ""} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="notaFiscal" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nota Fiscal</FormLabel>
                            <FormControl><Input placeholder="Ex: NF-e 12345" {...field} value={field.value ?? ""} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                    </div>
                  </div>
                </>}

                {editing && (
                  <FormField control={form.control} name="notaFiscal" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nota Fiscal</FormLabel>
                      <FormControl><Input placeholder="Ex: NF-e 12345" {...field} value={field.value ?? ""} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                <Separator />
                <FormField control={form.control} name="observacoes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

                <SheetFooter>
                  <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? "Salvando…" : editing ? "Salvar alterações" : "Registrar entrada"}
                  </Button>
                </SheetFooter>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Movimentação Sheet */}
      <MovimentacaoSheet
        open={movimentacaoOpen}
        onOpenChange={setMovimentacaoOpen}
        animais={selectedAnimais.map((a) => ({ id: a.id, brinco: a.brinco, nome: a.nome }))}
        lotes={lotes}
        loteAtualId={selectedLoteId}
        onSuccess={() => { setSelectedIds(new Set()); router.refresh(); }}
      />

      {/* Saída Sheet */}
      <SaidaSheet
        open={saidaOpen}
        onOpenChange={setSaidaOpen}
        animais={selectedAnimais.map((a) => ({ id: a.id, brinco: a.brinco, nome: a.nome, pesoEntradaKg: a.pesoEntradaKg }))}
        onSuccess={() => { setSelectedIds(new Set()); router.refresh(); }}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir {selectedIds.size} animal(is)</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir permanentemente{" "}
              {selectedIds.size === 1
                ? <>o animal <strong className="text-gray-900">{selectedAnimais[0]?.brinco}</strong></>
                : <><strong className="text-gray-900">{selectedIds.size} animais</strong> selecionados</>
              }? Serão removidos os registros de pesagens, pertinências de lote e movimentações.
              Animais com registros financeiros não serão excluídos. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {selectedIds.size <= 10 && (
            <div className="text-sm text-gray-600 space-y-0.5">
              {selectedAnimais.map(a => (
                <div key={a.id} className="font-mono text-xs">
                  {a.brinco}{a.nome ? ` — ${a.nome}` : ""}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={onDeleteBatch} disabled={deleting}>
              {deleting ? "Excluindo…" : `Excluir ${selectedIds.size} animal(is)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
