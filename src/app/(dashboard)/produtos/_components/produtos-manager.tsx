"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, Package, Wheat, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { produtoSchema, type ProdutoFormData } from "@/lib/validations";
import { produtosApi } from "@/lib/api";
import { TIPO_PRODUTO_LABEL, isSuplemento, formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

const TIPOS_SUPLEMENTO = ["SUPLEMENTO_MINERAL","SUPLEMENTO_PROTEICO","SUPLEMENTO_ENERGETICO","SUPLEMENTO_MISTO"] as const;
const TIPOS_MEDICAMENTO = ["VERMIFUGO","CARRAPATICIDA","VACINA","ANTIBIOTICO","VITAMINA","OUTRO_MEDICAMENTO"] as const;

type Produto = {
  id: string; nome: string; tipo: string; fabricante?: string | null; principioAtivo?: string | null;
  viaAdministracao?: string | null; carenciaDias?: number | null;
  unidadeMedida: string; precoUnitario?: number | null; ativo: boolean; observacoes?: string | null;
};

type Tab = "todos" | "suplemento" | "medicamento";

export function ProdutosManager({ initialProdutos }: { initialProdutos: Produto[] }) {
  const router = useRouter();
  const [items, setItems]         = useState(initialProdutos);
  const [tab, setTab]             = useState<Tab>("todos");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing]     = useState<Produto | null>(null);
  const [deleting, setDeleting]   = useState<Produto | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [tipoGrupo, setTipoGrupo] = useState<"suplemento" | "medicamento">("suplemento");

  const form = useForm<ProdutoFormData>({
    resolver: zodResolver(produtoSchema),
    defaultValues: { nome: "", tipo: "SUPLEMENTO_MINERAL", unidadeMedida: "kg", precoUnitario: undefined, fabricante: "" },
  });

  const watchTipo = form.watch("tipo");
  const isMed = watchTipo && !isSuplemento(watchTipo);

  const filtered = items.filter(i =>
    tab === "todos" ? true :
    tab === "suplemento" ? isSuplemento(i.tipo) :
    !isSuplemento(i.tipo)
  );

  function openCreate(grupo: "suplemento" | "medicamento") {
    setTipoGrupo(grupo);
    setEditing(null);
    form.reset({
      nome: "", tipo: grupo === "suplemento" ? "SUPLEMENTO_MINERAL" : "VERMIFUGO",
      unidadeMedida: grupo === "suplemento" ? "kg" : "mL",
      precoUnitario: undefined, fabricante: "", principioAtivo: "", viaAdministracao: "", carenciaDias: undefined,
    });
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(item: Produto) {
    setEditing(item);
    setTipoGrupo(isSuplemento(item.tipo) ? "suplemento" : "medicamento");
    form.reset({
      nome: item.nome, tipo: item.tipo as any, unidadeMedida: item.unidadeMedida,
      precoUnitario: item.precoUnitario ?? undefined, fabricante: item.fabricante ?? "",
      principioAtivo: item.principioAtivo ?? "", viaAdministracao: item.viaAdministracao ?? "",
      carenciaDias: item.carenciaDias ?? undefined, observacoes: item.observacoes ?? "",
    });
    setError(null);
    setSheetOpen(true);
  }

  async function onSubmit(data: ProdutoFormData) {
    setError(null);
    try {
      if (editing) {
        const updated = await produtosApi.update(editing.id, data);
        setItems(items.map(i => i.id === editing.id ? { ...i, ...updated } : i));
      } else {
        const created = await produtosApi.create(data);
        setItems([...items, created]);
      }
      setSheetOpen(false);
      router.refresh();
    } catch (e: any) { setError(e.message); }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await produtosApi.remove(deleting.id);
      setItems(items.filter(i => i.id !== deleting.id));
      setDeleting(null);
    } catch (e: any) { setDeleting(null); setError(e.message); }
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "todos", label: "Todos", icon: Package },
    { key: "suplemento", label: "Suplementos", icon: Wheat },
    { key: "medicamento", label: "Medicamentos", icon: Pill },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-sm text-gray-500 mt-1">{items.length} produto(s) cadastrado(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => openCreate("suplemento")} className="gap-2">
            <Wheat className="h-4 w-4" /> Suplemento
          </Button>
          <Button onClick={() => openCreate("medicamento")} className="gap-2">
            <Pill className="h-4 w-4" /> Medicamento
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            <t.icon className="h-4 w-4" />{t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Fabricante</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Princípio Ativo</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead className="text-right">Preço Unit.</TableHead>
              <TableHead className="text-center">Carência</TableHead>
              <TableHead className="w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  Nenhum produto nesta categoria
                </TableCell>
              </TableRow>
            )}
            {filtered.map(item => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.nome}</TableCell>
                <TableCell className="text-gray-500 text-sm">{item.fabricante || "—"}</TableCell>
                <TableCell>
                  <Badge variant={isSuplemento(item.tipo) ? "secondary" : "outline"} className="text-xs">
                    {TIPO_PRODUTO_LABEL[item.tipo] ?? item.tipo}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-500 text-sm">{item.principioAtivo || "—"}</TableCell>
                <TableCell className="text-gray-500">{item.unidadeMedida}</TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {item.precoUnitario ? formatCurrency(item.precoUnitario) : "—"}
                </TableCell>
                <TableCell className="text-center">
                  {item.carenciaDias != null
                    ? <Badge variant={item.carenciaDias > 0 ? "warning" : "secondary"}>{item.carenciaDias}d</Badge>
                    : <span className="text-gray-300">—</span>
                  }
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

      {/* Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? "Editar Produto" : tipoGrupo === "suplemento" ? "Novo Suplemento" : "Novo Medicamento"}</SheetTitle>
            <SheetDescription>
              {tipoGrupo === "suplemento" ? "Suplementos minerais, proteicos, energéticos ou mistos." : "Vermífugos, vacinas, antibióticos e outros medicamentos."}
            </SheetDescription>
          </SheetHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {(tipoGrupo === "suplemento" ? TIPOS_SUPLEMENTO : TIPOS_MEDICAMENTO).map(t => (
                        <SelectItem key={t} value={t}>{TIPO_PRODUTO_LABEL[t]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome comercial *</FormLabel>
                  <FormControl><Input placeholder="Ex: Mineral Proteico 30%" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="fabricante" render={({ field }) => (
                <FormItem>
                  <FormLabel>Fabricante</FormLabel>
                  <FormControl><Input placeholder="Ex: Tortuga, Zoetis, MSD" {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {isMed && <>
                <FormField control={form.control} name="principioAtivo" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Princípio ativo</FormLabel>
                    <FormControl><Input placeholder="Ex: Ivermectina" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="viaAdministracao" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Via de administração</FormLabel>
                    <FormControl><Input placeholder="Ex: Subcutânea, Pour-on, IM" {...field} value={field.value ?? ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="carenciaDias" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Carência padrão (dias)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} placeholder="Ex: 28" {...field}
                        value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : +e.target.value)} />
                    </FormControl>
                    <FormDescription>Editável a cada apontamento se necessário.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </>}

              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="unidadeMedida" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unidade *</FormLabel>
                    <FormControl><Input placeholder="kg / mL / dose" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="precoUnitario" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço unitário (R$)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min={0} placeholder="0,00" {...field}
                        value={field.value ?? ""} onChange={e => field.onChange(e.target.value === "" ? undefined : +e.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="observacoes" render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl><Textarea rows={2} {...field} value={field.value ?? ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {error && <p className="text-sm text-red-600">{error}</p>}
              <SheetFooter>
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Salvando…" : editing ? "Salvar alterações" : "Criar produto"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inativar produto?</DialogTitle>
            <DialogDescription>
              <strong>{deleting?.nome}</strong> será inativado e não aparecerá em novos apontamentos.
              O histórico existente é preservado.
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
