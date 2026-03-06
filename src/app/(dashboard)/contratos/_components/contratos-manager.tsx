"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { contratosApi } from "@/lib/api";
import { useRouter } from "next/navigation";

const schema = z.object({
  idContrato:  z.string().min(1, "ID do Contrato é obrigatório").max(50),
  nomeFazenda: z.string().min(1, "Nome da Fazenda é obrigatório").max(200),
  observacoes: z.string().max(500).optional().nullable(),
});

type FormData = z.infer<typeof schema>;

type Contrato = {
  id: string; idContrato: string; nomeFazenda: string;
  observacoes?: string | null; ativo: boolean;
  _count?: { lotes: number };
};

export function ContratosManager({ initialData }: { initialData: Contrato[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialData);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Contrato | null>(null);
  const [deleting, setDeleting] = useState<Contrato | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { idContrato: "", nomeFazenda: "", observacoes: "" },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ idContrato: "", nomeFazenda: "", observacoes: "" });
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(item: Contrato) {
    setEditing(item);
    form.reset({ idContrato: item.idContrato, nomeFazenda: item.nomeFazenda, observacoes: item.observacoes ?? "" });
    setError(null);
    setSheetOpen(true);
  }

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      if (editing) {
        const updated = await contratosApi.update(editing.id, data);
        setItems(items.map(i => i.id === editing.id ? { ...i, ...updated } : i));
      } else {
        const created = await contratosApi.create(data);
        setItems([...items, { ...created, _count: { lotes: 0 } }]);
      }
      setSheetOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setError(null);
    try {
      await contratosApi.remove(deleting.id);
      setItems(items.filter(i => i.id !== deleting.id));
      setDeleting(null);
      router.refresh();
    } catch (e: any) {
      setDeleting(null);
      setError(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contratos / Parcerias</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} contrato(s) cadastrado(s)</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Contrato
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Contrato</TableHead>
              <TableHead>Fazenda</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead className="text-center">Lotes</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  Nenhum contrato cadastrado
                </TableCell>
              </TableRow>
            )}
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-mono font-semibold text-sm">{item.idContrato}</TableCell>
                <TableCell className="font-medium">{item.nomeFazenda}</TableCell>
                <TableCell className="text-gray-400 text-sm max-w-xs truncate">{item.observacoes || "—"}</TableCell>
                <TableCell className="text-center font-semibold">{item._count?.lotes ?? 0}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={item.ativo ? "success" : "secondary"}>{item.ativo ? "Ativo" : "Inativo"}</Badge>
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
            <SheetTitle>{editing ? "Editar Contrato" : "Novo Contrato"}</SheetTitle>
            <SheetDescription>Cadastre uma parceria com uma fazenda.</SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <FormField control={form.control} name="idContrato" render={({ field }) => (
                <FormItem>
                  <FormLabel>ID do Contrato *</FormLabel>
                  <FormControl><Input placeholder="Ex: RCA-2025-001" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="nomeFazenda" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Fazenda *</FormLabel>
                  <FormControl><Input placeholder="Ex: Fazenda Santa Fé" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="observacoes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detalhes do contrato, condições, etc." rows={3} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <SheetFooter>
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Salvando…" : editing ? "Salvar alterações" : "Criar contrato"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inativar contrato?</DialogTitle>
            <DialogDescription>
              O contrato <strong>{deleting?.idContrato}</strong> ({deleting?.nomeFazenda}) será inativado.
              Só é possível inativar contratos sem lotes ativos vinculados.
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
