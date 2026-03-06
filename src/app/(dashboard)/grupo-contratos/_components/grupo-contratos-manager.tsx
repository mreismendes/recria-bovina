"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, FolderOpen, Link2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { grupoContratoSchema, type GrupoContratoFormData } from "@/lib/validations";
import { grupoContratosApi, contratosApi } from "@/lib/api";
import { useRouter } from "next/navigation";

type ContratoRef = { id: string; idContrato: string; nomeFazenda: string; grupoContratoId?: string | null };
type LoteRef = { id: string; nome: string };
type GrupoContrato = {
  id: string; nome: string; descricao?: string | null; ativo: boolean;
  _count?: { contratos: number; lotes: number };
  contratos: { id: string; idContrato: string; nomeFazenda: string }[];
  lotes: LoteRef[];
};

export function GrupoContratosManager({ initialData, contratos }: { initialData: GrupoContrato[]; contratos: ContratoRef[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initialData);
  const [allContratos, setAllContratos] = useState(contratos);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<GrupoContrato | null>(null);
  const [deleting, setDeleting] = useState<GrupoContrato | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Vincular contrato
  const [linkingGrupo, setLinkingGrupo] = useState<GrupoContrato | null>(null);
  const [selectedContratoId, setSelectedContratoId] = useState("");

  const form = useForm<GrupoContratoFormData>({
    resolver: zodResolver(grupoContratoSchema),
    defaultValues: { nome: "", descricao: "" },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ nome: "", descricao: "" });
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(item: GrupoContrato) {
    setEditing(item);
    form.reset({ nome: item.nome, descricao: item.descricao ?? "" });
    setError(null);
    setSheetOpen(true);
  }

  async function onSubmit(data: GrupoContratoFormData) {
    setError(null);
    try {
      if (editing) {
        const updated = await grupoContratosApi.update(editing.id, data);
        setItems(items.map(i => i.id === editing.id ? { ...i, ...updated, contratos: i.contratos, _count: i._count } : i));
      } else {
        const created = await grupoContratosApi.create(data);
        setItems([...items, { ...created, _count: { contratos: 0, lotes: 0 }, contratos: [], lotes: [] }]);
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
      await grupoContratosApi.remove(deleting.id);
      setItems(items.filter(i => i.id !== deleting.id));
      setDeleting(null);
      router.refresh();
    } catch (e: any) {
      setDeleting(null);
      setError(e.message);
    }
  }

  // Contratos disponíveis para vincular (sem grupo ou em outro grupo)
  function getAvailableContratos(grupoId: string) {
    return allContratos.filter(c => !c.grupoContratoId || c.grupoContratoId === grupoId);
  }

  function getUnlinkedContratos(grupoId: string) {
    return allContratos.filter(c => !c.grupoContratoId);
  }

  async function linkContrato() {
    if (!linkingGrupo || !selectedContratoId) return;
    setError(null);
    try {
      await contratosApi.update(selectedContratoId, { grupoContratoId: linkingGrupo.id });
      const contrato = allContratos.find(c => c.id === selectedContratoId)!;
      // Update local state
      setItems(items.map(g => {
        if (g.id !== linkingGrupo.id) return g;
        return {
          ...g,
          contratos: [...g.contratos, { id: contrato.id, idContrato: contrato.idContrato, nomeFazenda: contrato.nomeFazenda }],
          _count: { contratos: (g._count?.contratos ?? 0) + 1, lotes: g._count?.lotes ?? 0 },
        };
      }));
      setAllContratos(allContratos.map(c => c.id === selectedContratoId ? { ...c, grupoContratoId: linkingGrupo.id } : c));
      setSelectedContratoId("");
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function unlinkContrato(grupoId: string, contratoId: string) {
    setError(null);
    try {
      await contratosApi.update(contratoId, { grupoContratoId: null });
      setItems(items.map(g => {
        if (g.id !== grupoId) return g;
        return {
          ...g,
          contratos: g.contratos.filter(c => c.id !== contratoId),
          _count: { contratos: Math.max((g._count?.contratos ?? 1) - 1, 0), lotes: g._count?.lotes ?? 0 },
        };
      }));
      setAllContratos(allContratos.map(c => c.id === contratoId ? { ...c, grupoContratoId: null } : c));
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grupos de Contratos</h1>
          <p className="text-sm text-gray-500 mt-1">
            Agrupe contratos que funcionam como uma unidade. {items.length} grupo(s) cadastrado(s).
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Grupo
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>
      )}

      <div className="space-y-4">
        {items.length === 0 && (
          <div className="bg-white rounded-lg border shadow-sm p-12 text-center text-gray-400">
            <FolderOpen className="h-10 w-10 mx-auto mb-2 opacity-30" />
            Nenhum grupo cadastrado
          </div>
        )}

        {items.map(grupo => (
          <div key={grupo.id} className="bg-white rounded-lg border shadow-sm">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="bg-indigo-50 rounded-lg p-2">
                  <FolderOpen className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{grupo.nome}</h3>
                  {grupo.descricao && <p className="text-sm text-gray-500">{grupo.descricao}</p>}
                </div>
                <Badge variant={grupo.ativo ? "success" : "secondary"} className="ml-2">
                  {grupo.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(grupo)}>
                  <Pencil className="h-4 w-4 text-gray-500" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setDeleting(grupo)}>
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              </div>
            </div>

            {/* Contratos do grupo */}
            <div className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Contratos vinculados ({grupo.contratos.length})
              </p>

              {grupo.contratos.length === 0 && (
                <p className="text-sm text-gray-400 mb-3">Nenhum contrato vinculado a este grupo.</p>
              )}

              {grupo.contratos.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Contrato</TableHead>
                      <TableHead>Fazenda</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grupo.contratos.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-mono text-sm">{c.idContrato}</TableCell>
                        <TableCell>{c.nomeFazenda}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => unlinkContrato(grupo.id, c.id)} title="Desvincular">
                            <Unlink className="h-4 w-4 text-gray-400" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {/* Vincular novo contrato */}
              <div className="flex items-center gap-2 mt-3">
                {linkingGrupo?.id === grupo.id ? (
                  <>
                    <Select value={selectedContratoId} onValueChange={setSelectedContratoId}>
                      <SelectTrigger className="w-80">
                        <SelectValue placeholder="Selecione um contrato" />
                      </SelectTrigger>
                      <SelectContent>
                        {getUnlinkedContratos(grupo.id).map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.idContrato} — {c.nomeFazenda}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={linkContrato} disabled={!selectedContratoId}>Vincular</Button>
                    <Button size="sm" variant="outline" onClick={() => { setLinkingGrupo(null); setSelectedContratoId(""); }}>Cancelar</Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="gap-1" onClick={() => { setLinkingGrupo(grupo); setSelectedContratoId(""); }}>
                    <Link2 className="h-3.5 w-3.5" /> Vincular contrato
                  </Button>
                )}
              </div>

              {/* Lotes vinculados diretamente */}
              {grupo.lotes.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Lotes vinculados diretamente ({grupo.lotes.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {grupo.lotes.map(l => (
                      <Badge key={l.id} variant="outline" className="font-normal">{l.nome}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sheet: Create/Edit Grupo */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? "Editar Grupo" : "Novo Grupo de Contratos"}</SheetTitle>
            <SheetDescription>Agrupe contratos que funcionam como uma unidade lógica.</SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do grupo *</FormLabel>
                  <FormControl><Input placeholder="Ex: Grupo Norte" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descricao</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Descreva o agrupamento, ex: fazendas da região norte que compartilham lotes" rows={3} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <SheetFooter>
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Salvando..." : editing ? "Salvar alteracoes" : "Criar grupo"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Dialog: Confirm Delete */}
      <Dialog open={!!deleting} onOpenChange={() => setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Inativar grupo?</DialogTitle>
            <DialogDescription>
              O grupo <strong>{deleting?.nome}</strong> sera inativado.
              So e possivel inativar grupos sem contratos ativos vinculados.
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
