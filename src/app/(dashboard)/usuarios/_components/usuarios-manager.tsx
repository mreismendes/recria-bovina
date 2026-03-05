"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, UserX, Users, Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { usersApi } from "@/lib/api";
import { useRouter } from "next/navigation";

const createSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  role: z.enum(["ADMIN", "GESTOR", "OPERADOR"]),
});

const editSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(200),
  email: z.string().email("Email inválido"),
  password: z.string().optional().refine((v) => !v || v.length >= 6, "Mínimo 6 caracteres"),
  role: z.enum(["ADMIN", "GESTOR", "OPERADOR"]),
});

type CreateData = z.infer<typeof createSchema>;
type EditData = z.infer<typeof editSchema>;

type UserItem = {
  id: string;
  name: string;
  email: string;
  role: string;
  ativo: boolean;
  createdAt: string;
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador",
  GESTOR: "Gestor",
  OPERADOR: "Operador",
};

const ROLE_ICONS: Record<string, typeof Shield> = {
  ADMIN: ShieldAlert,
  GESTOR: ShieldCheck,
  OPERADOR: Shield,
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-red-100 text-red-700",
  GESTOR: "bg-blue-100 text-blue-700",
  OPERADOR: "bg-gray-100 text-gray-700",
};

export function UsuariosManager({ initialData, currentUserId }: { initialData: UserItem[]; currentUserId: string }) {
  const router = useRouter();
  const [items, setItems] = useState(initialData);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [deactivating, setDeactivating] = useState<UserItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CreateData | EditData>({
    resolver: zodResolver(editing ? editSchema : createSchema),
    defaultValues: { name: "", email: "", password: "", role: "OPERADOR" },
  });

  function openCreate() {
    setEditing(null);
    form.reset({ name: "", email: "", password: "", role: "OPERADOR" });
    setError(null);
    setSheetOpen(true);
  }

  function openEdit(item: UserItem) {
    setEditing(item);
    form.reset({ name: item.name, email: item.email, password: "", role: item.role as any });
    setError(null);
    setSheetOpen(true);
  }

  async function onSubmit(data: CreateData | EditData) {
    setError(null);
    try {
      if (editing) {
        const payload: Record<string, unknown> = {
          name: data.name,
          email: data.email,
          role: data.role,
        };
        if (data.password && data.password.length > 0) {
          payload.password = data.password;
        }
        const updated = await usersApi.update(editing.id, payload);
        setItems(items.map((i) => (i.id === editing.id ? { ...i, ...updated } : i)));
      } else {
        const created = await usersApi.create(data);
        setItems([...items, created]);
      }
      setSheetOpen(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function confirmDeactivate() {
    if (!deactivating) return;
    setError(null);
    try {
      await usersApi.deactivate(deactivating.id);
      setItems(items.map((i) => (i.id === deactivating.id ? { ...i, ativo: false } : i)));
      setDeactivating(null);
      router.refresh();
    } catch (e: any) {
      setDeactivating(null);
      setError(e.message);
    }
  }

  async function reactivate(item: UserItem) {
    setError(null);
    try {
      const updated = await usersApi.update(item.id, { ativo: true });
      setItems(items.map((i) => (i.id === item.id ? { ...i, ...updated } : i)));
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          <p className="text-sm text-gray-500 mt-1">
            {items.filter((u) => u.ativo).length} ativo(s) de {items.length} total
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">{error}</div>}

      {/* Table */}
      <div className="bg-white rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-gray-400">
                  <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  Nenhum usuário cadastrado
                </TableCell>
              </TableRow>
            )}
            {items.map((item) => {
              const RoleIcon = ROLE_ICONS[item.role] ?? Shield;
              const isSelf = item.id === currentUserId;
              return (
                <TableRow key={item.id} className={!item.ativo ? "opacity-50" : ""}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {item.name}
                      {isSelf && (
                        <span className="text-xs text-green-600 font-normal">(você)</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-500">{item.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <RoleIcon className="h-4 w-4 text-gray-500" />
                      <span className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${ROLE_COLORS[item.role]}`}>
                        {ROLE_LABELS[item.role] ?? item.role}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={item.ativo ? "success" : "secondary"}>
                      {item.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </Button>
                      {!isSelf && item.ativo && (
                        <Button variant="ghost" size="icon" onClick={() => setDeactivating(item)}>
                          <UserX className="h-4 w-4 text-red-400" />
                        </Button>
                      )}
                      {!item.ativo && (
                        <Button variant="ghost" size="sm" onClick={() => reactivate(item)} className="text-xs text-green-600">
                          Reativar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Sheet — criar / editar */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editing ? "Editar Usuário" : "Novo Usuário"}</SheetTitle>
            <SheetDescription>
              {editing
                ? "Altere os dados do usuário. Deixe a senha em branco para mantê-la."
                : "Preencha os dados do novo usuário."}
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="usuario@fazenda.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{editing ? "Nova senha (opcional)" : "Senha *"}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={editing ? "Deixe em branco para manter" : "Mínimo 6 caracteres"}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil *</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="OPERADOR">Operador — acesso básico</option>
                        <option value="GESTOR">Gestor — acesso intermediário</option>
                        <option value="ADMIN">Administrador — acesso total</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && <p className="text-sm text-red-600">{error}</p>}

              <SheetFooter>
                <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting
                    ? "Salvando…"
                    : editing
                    ? "Salvar alterações"
                    : "Criar usuário"}
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      {/* Dialog — confirmar desativação */}
      <Dialog open={!!deactivating} onOpenChange={() => setDeactivating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desativar usuário?</DialogTitle>
            <DialogDescription>
              O usuário <strong>{deactivating?.name}</strong> ({deactivating?.email}) não poderá
              mais acessar o sistema. Você pode reativá-lo depois.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeactivating(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeactivate}>
              Desativar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
