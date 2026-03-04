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

type Propriedade = { id: string; nome: string };
type Lote = { id: string; nome: string; descricao?: string | null; propriedadeId: string; propriedade: Propriedade; pertinencias: { id: string }[]; ativo: boolean };

export function LotesManager({ initialLotes, propriedades }: { initialLotes: Lote[]; propriedades: Propriedade[] }) {
  const router = useRouter();
  const [items, setItems]   = useState(initialLotes);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing]     = useState<Lote | null>(null);
  const [deleting, setDeleting]   = useState<Lote | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const form = useForm<LoteFormData>({
    resolver: zodResolver(loteSchema),
    defaultValues: { nome: "", descricao: "", propriedadeId: "" },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ nome: "", descricao: "", propriedadeId: propriedades[0]?.id ?? "" });
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(item: Lote) {
    setEditing(item);
    form.reset({ nome: item.nome, descricao: item.descricao ?? "", propriedadeId: item.propriedadeId });
    setError(null);
    setSheetOpen(true);
  }

  async function onSubmit(data: LoteFormData) {
    setError(null);
    try {
      const prop = propriedades.find(p => p.id === data.propriedadeId)!;
      if (editing) {
        const updated = await lotesApi.update(editing.id, data);
        setItems(items.map(i => i.id === editing.id ? { ...i, ...updated, propriedade: prop, pertinencias: i.pertinencias } : i));
      } else {
        const created = await lotesApi.create(data);
        setItems([...items, { ...created, propriedade: prop, pertinencias: [] }]);
      }
      setSheetOpen(false);
      router.refresh();
    } catch (e: any) { setError(e.message); }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await lotesApi.remove(deleting.id);
      setItems(items.filter(i => i.id !== deleting.id));
      setDeleting(null);
      router.refresh();
    } catch (e: any) { setDeleting(null); setError(e.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lotes</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} lote(s) ativo(s)</p>
        </div>
        <Button onClick={openCreate} className="gap-2" disabled={propriedades.length === 0}>
          <Plus className="h-4 w-4" /> Novo Lote
        </Button>
      </div>

      {propriedades.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-700">
          Cadastre ao menos uma propriedade antes de criar lotes.
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome do Lote</TableHead>
              <TableHead>Propriedade</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-center">Cabeças ativas</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                  <Layers className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  Nenhum lote cadastrado
                </TableCell>
              </TableRow>
            )}
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nome}</TableCell>
                <TableCell className="text-gray-500">{item.propriedade.nome}</TableCell>
                <TableCell className="text-gray-400 text-sm max-w-xs truncate">{item.descricao || "—"}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={item.pertinencias.length > 0 ? "success" : "secondary"} className="font-semibold">
                    {item.pertinencias.length} cab.
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 justify-end">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4 text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(item)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? "Editar Lote" : "Novo Lote"}</SheetTitle>
            <SheetDescription>Lotes agrupam animais com perfil similar para gestão.</SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <FormField control={form.control} name="propriedadeId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Propriedade *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Selecione a propriedade" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {propriedades.map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do lote *</FormLabel>
                  <FormControl><Input placeholder="Ex: Lote A — Garrotes Nelore" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ex: Nelore PO, compra out/2025, 230-270 kg" rows={3} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {error && <p className="text-sm text-red-600">{error}</p>}
              <SheetFooter>
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Salvando…" : editing ? "Salvar alterações" : "Criar lote"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inativar lote?</DialogTitle>
            <DialogDescription>
              O lote <strong>{deleting?.nome}</strong> será inativado. Não é possível inativar lotes com animais ativos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Inativar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
