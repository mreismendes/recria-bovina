"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { propriedadesApi } from "@/lib/api";
import { useRouter } from "next/navigation";

const schema = z.object({
  nome:      z.string().min(1, "Nome é obrigatório").max(200),
  cnpjCpf:   z.string().max(20).optional().nullable(),
  municipio: z.string().max(200).optional().nullable(),
  estado:    z.string().max(2, "Use a sigla do estado (ex: MG)").optional().nullable(),
});

type FormData = z.infer<typeof schema>;

type Propriedade = {
  id: string; nome: string; cnpjCpf?: string | null;
  municipio?: string | null; estado?: string | null;
  ativa: boolean; _count?: { lotes: number };
};

export function PropriedadesManager({ initialData }: { initialData: Propriedade[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialData);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Propriedade | null>(null);
  const [deleting, setDeleting] = useState<Propriedade | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { nome: "", cnpjCpf: "", municipio: "", estado: "" } });

  function openCreate() {
    setEditing(null);
    form.reset({ nome: "", cnpjCpf: "", municipio: "", estado: "" });
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(item: Propriedade) {
    setEditing(item);
    form.reset({ nome: item.nome, cnpjCpf: item.cnpjCpf ?? "", municipio: item.municipio ?? "", estado: item.estado ?? "" });
    setError(null);
    setSheetOpen(true);
  }

  async function onSubmit(data: FormData) {
    setError(null);
    try {
      if (editing) {
        const updated = await propriedadesApi.update(editing.id, data);
        setItems(items.map(i => i.id === editing.id ? { ...i, ...updated } : i));
      } else {
        const created = await propriedadesApi.create(data);
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
      await propriedadesApi.remove(deleting.id);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propriedades</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} propriedade(s) cadastrada(s)</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Propriedade
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CNPJ / CPF</TableHead>
              <TableHead>Município / Estado</TableHead>
              <TableHead className="text-center">Lotes</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-gray-400">
                  <Building2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  Nenhuma propriedade cadastrada
                </TableCell>
              </TableRow>
            )}
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nome}</TableCell>
                <TableCell className="text-gray-500">{item.cnpjCpf || "—"}</TableCell>
                <TableCell className="text-gray-500">
                  <div className="flex items-center gap-1">
                    {(item.municipio || item.estado) ? (
                      <><MapPin className="h-3 w-3" />{[item.municipio, item.estado].filter(Boolean).join(" / ")}</>
                    ) : "—"}
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold">{item._count?.lotes ?? 0}</TableCell>
                <TableCell className="text-center">
                  <Badge variant={item.ativa ? "success" : "secondary"}>{item.ativa ? "Ativa" : "Inativa"}</Badge>
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

      {/* Sheet — criar / editar */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? "Editar Propriedade" : "Nova Propriedade"}</SheetTitle>
            <SheetDescription>Preencha os dados da propriedade rural.</SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da propriedade *</FormLabel>
                  <FormControl><Input placeholder="Ex: Fazenda Santa Fé" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="cnpjCpf" render={({ field }) => (
                <FormItem>
                  <FormLabel>CNPJ / CPF</FormLabel>
                  <FormControl><Input placeholder="00.000.000/0001-00" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="municipio" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Município</FormLabel>
                    <FormControl><Input placeholder="Ex: Uberaba" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="estado" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl><Input placeholder="MG" maxLength={2} className="uppercase" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <SheetFooter>
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Salvando…" : editing ? "Salvar alterações" : "Criar propriedade"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Dialog — confirmar exclusão */}
      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir propriedade?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. A propriedade <strong>{deleting?.nome}</strong> será removida permanentemente.
              Só é possível excluir propriedades sem lotes vinculados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
