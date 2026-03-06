"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { loteSchema, type LoteFormData } from "@/lib/validations";
import { lotesApi } from "@/lib/api";
import { useRouter } from "next/navigation";

type GrupoRef = { id: string; nome: string };
type Contrato = { id: string; idContrato: string; nomeFazenda: string };
type Lote = {
  id: string; nome: string; descricao?: string | null;
  contratoId?: string | null; contrato?: Contrato | null;
  grupoContratoId?: string | null; grupoContrato?: GrupoRef | null;
  pertinencias: { id: string }[]; ativo: boolean;
};

const NONE_VALUE = "__none__";

/** Display helper: shows "Contrato" or "Grupo" label for a lote */
function loteParentLabel(item: Lote): string {
  if (item.contrato) return `${item.contrato.idContrato} — ${item.contrato.nomeFazenda}`;
  if (item.grupoContrato) return item.grupoContrato.nome;
  return "—";
}

export function LotesManager({ initialLotes, contratos, grupos }: { initialLotes: Lote[]; contratos: Contrato[]; grupos: GrupoRef[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialLotes);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Lote | null>(null);
  const [deleting, setDeleting] = useState<Lote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [parentType, setParentType] = useState<"contrato" | "grupo">("contrato");

  const form = useForm<LoteFormData>({
    resolver: zodResolver(loteSchema),
    defaultValues: { nome: "", descricao: "", contratoId: null, grupoContratoId: null },
  });

  function openCreate() {
    setEditing(null);
    const defaultType = contratos.length > 0 ? "contrato" : (grupos.length > 0 ? "grupo" : "contrato");
    setParentType(defaultType);
    form.reset({
      nome: "", descricao: "",
      contratoId: defaultType === "contrato" ? (contratos[0]?.id ?? null) : null,
      grupoContratoId: defaultType === "grupo" ? (grupos[0]?.id ?? null) : null,
    });
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(item: Lote) {
    setEditing(item);
    const type = item.grupoContratoId ? "grupo" : "contrato";
    setParentType(type);
    form.reset({
      nome: item.nome,
      descricao: item.descricao ?? "",
      contratoId: item.contratoId ?? null,
      grupoContratoId: item.grupoContratoId ?? null,
    });
    setError(null);
    setSheetOpen(true);
  }

  function handleParentTypeChange(type: "contrato" | "grupo") {
    setParentType(type);
    if (type === "contrato") {
      form.setValue("grupoContratoId", null);
      form.setValue("contratoId", contratos[0]?.id ?? null);
    } else {
      form.setValue("contratoId", null);
      form.setValue("grupoContratoId", grupos[0]?.id ?? null);
    }
  }

  async function onSubmit(data: LoteFormData) {
    setError(null);
    try {
      const payload = {
        ...data,
        contratoId: data.contratoId || null,
        grupoContratoId: data.grupoContratoId || null,
      };
      if (editing) {
        const updated = await lotesApi.update(editing.id, payload);
        const ctr = contratos.find(c => c.id === payload.contratoId) ?? null;
        const grp = grupos.find(g => g.id === payload.grupoContratoId) ?? null;
        setItems(items.map(i => i.id === editing.id ? { ...i, ...updated, contrato: ctr, grupoContrato: grp, pertinencias: i.pertinencias } : i));
      } else {
        const created = await lotesApi.create(payload);
        const ctr = contratos.find(c => c.id === payload.contratoId) ?? null;
        const grp = grupos.find(g => g.id === payload.grupoContratoId) ?? null;
        setItems([...items, { ...created, contrato: ctr, grupoContrato: grp, pertinencias: [] }]);
      }
      setSheetOpen(false); router.refresh();
    } catch (e: any) { setError(e.message); }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try { await lotesApi.remove(deleting.id); setItems(items.filter(i => i.id !== deleting.id)); setDeleting(null); router.refresh(); }
    catch (e: any) { setDeleting(null); setError(e.message); }
  }

  const canCreate = contratos.length > 0 || grupos.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Lotes</h1><p className="text-sm text-gray-500 mt-1">{items.length} lote(s) ativo(s)</p></div>
        <Button onClick={openCreate} className="gap-2" disabled={!canCreate}><Plus className="h-4 w-4" /> Novo Lote</Button>
      </div>
      {!canCreate && (<div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-700">Cadastre ao menos um contrato ou grupo antes de criar lotes.</div>)}
      {error && <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>}
      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Nome do Lote</TableHead><TableHead>Tipo</TableHead><TableHead>Contrato / Grupo</TableHead><TableHead>Descrição</TableHead><TableHead className="text-center">Cabeças ativas</TableHead><TableHead className="w-24"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.length === 0 && (<TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-400"><Layers className="h-10 w-10 mx-auto mb-2 opacity-30" />Nenhum lote cadastrado</TableCell></TableRow>)}
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nome}</TableCell>
                <TableCell className="text-sm">
                  {item.grupoContratoId
                    ? <Badge variant="outline" className="font-normal text-indigo-700 border-indigo-200 bg-indigo-50">Grupo</Badge>
                    : <Badge variant="outline" className="font-normal">Contrato</Badge>
                  }
                </TableCell>
                <TableCell className="text-sm text-gray-600">{loteParentLabel(item)}</TableCell>
                <TableCell className="text-gray-400 text-sm max-w-xs truncate">{item.descricao || "—"}</TableCell>
                <TableCell className="text-center"><Badge variant={item.pertinencias.length > 0 ? "success" : "secondary"} className="font-semibold">{item.pertinencias.length} cab.</Badge></TableCell>
                <TableCell><div className="flex items-center gap-1 justify-end">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4 text-gray-500" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => setDeleting(item)}><Trash2 className="h-4 w-4 text-red-400" /></Button>
                </div></TableCell>
              </TableRow>))}
          </TableBody>
        </Table>
      </div>
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}><SheetContent>
        <SheetHeader><SheetTitle>{editing ? "Editar Lote" : "Novo Lote"}</SheetTitle><SheetDescription>Lotes agrupam animais com perfil similar para gestão.</SheetDescription></SheetHeader>
        <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">

          {/* Parent type toggle */}
          <FormItem>
            <FormLabel>Vincular a *</FormLabel>
            <Select value={parentType} onValueChange={(v) => handleParentTypeChange(v as "contrato" | "grupo")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {contratos.length > 0 && <SelectItem value="contrato">Contrato (fazenda individual)</SelectItem>}
                {grupos.length > 0 && <SelectItem value="grupo">Grupo de Contratos</SelectItem>}
              </SelectContent>
            </Select>
          </FormItem>

          {/* Contrato selector */}
          {parentType === "contrato" && (
            <FormField control={form.control} name="contratoId" render={({ field }) => (
              <FormItem><FormLabel>Contrato / Fazenda *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o contrato" /></SelectTrigger></FormControl>
                  <SelectContent>{contratos.map(c => <SelectItem key={c.id} value={c.id}>{c.idContrato} — {c.nomeFazenda}</SelectItem>)}</SelectContent>
                </Select><FormMessage /></FormItem>)} />
          )}

          {/* Grupo selector */}
          {parentType === "grupo" && (
            <FormField control={form.control} name="grupoContratoId" render={({ field }) => (
              <FormItem><FormLabel>Grupo de Contratos *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value ?? ""}><FormControl><SelectTrigger><SelectValue placeholder="Selecione o grupo" /></SelectTrigger></FormControl>
                  <SelectContent>{grupos.map(g => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}</SelectContent>
                </Select><FormMessage /></FormItem>)} />
          )}

          <FormField control={form.control} name="nome" render={({ field }) => (<FormItem><FormLabel>Nome do lote *</FormLabel><FormControl><Input placeholder="Ex: Lote A — Garrotes Nelore" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="descricao" render={({ field }) => (<FormItem><FormLabel>Descrição</FormLabel><FormControl><Textarea placeholder="Ex: Nelore PO, compra out/2025, 230-270 kg" rows={3} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>)} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <SheetFooter><Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button><Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Salvando…" : editing ? "Salvar alterações" : "Criar lote"}</Button></SheetFooter>
        </form></Form>
      </SheetContent></Sheet>
      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}><DialogContent>
        <DialogHeader><DialogTitle>Inativar lote?</DialogTitle><DialogDescription>O lote <strong>{deleting?.nome}</strong> será inativado. Não é possível inativar lotes com animais ativos.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button><Button variant="destructive" onClick={confirmDelete}>Inativar</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
