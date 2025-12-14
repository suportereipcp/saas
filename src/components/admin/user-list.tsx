"use client";

import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { createUser, updateUser, type ActionState } from "@/actions/users";

type User = {
    id: string;
    email: string;
    full_name: string | null;
    is_super_admin: boolean | null;
    created_at: string;
    authorized_apps?: string[];
};

type App = {
    code: string;
    name: string;
    active: boolean | null;
};

export function UserList({ users, currentUserId, allApps }: { users: User[], currentUserId?: string, allApps: App[] }) {
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-[#2B4964]">Usuários do Sistema</h3>
                <UserDialog mode="create" allApps={allApps} />
            </div>

            <div className="bg-white rounded-lg border border-grey-light shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Apps</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="w-[100px]">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => {
                            const isCurrentUser = user.id === currentUserId;
                            return (
                                <TableRow key={user.id} className={isCurrentUser ? "bg-primary/5" : ""}>
                                    <TableCell className="font-medium">
                                        {user.full_name || "Sem nome"}
                                        {isCurrentUser && <span className="ml-2 text-xs text-primary font-bold">(Você)</span>}
                                    </TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell>
                                        <span className="text-xs text-grey-darker">
                                            {user.is_super_admin
                                                ? "Todos"
                                                : (user.authorized_apps?.length ? `${user.authorized_apps.length} apps` : "Nenhum")
                                            }
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${user.is_super_admin ? 'bg-primary/10 text-primary' : 'bg-grey-lighter text-grey-darker'}`}>
                                            {user.is_super_admin ? "Admin" : "Comum"}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <UserDialog mode="edit" user={user} isCurrentUser={isCurrentUser} allApps={allApps} />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        {users.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-6 text-grey-darker">
                                    Nenhum usuário encontrado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function UserDialog({
    mode,
    user,
    isCurrentUser,
    allApps
}: {
    mode: "create" | "edit";
    user?: User;
    isCurrentUser?: boolean;
    allApps: App[];
}) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isAdmin, setIsAdmin] = useState(user?.is_super_admin || false);
    const [selectedApps, setSelectedApps] = useState<string[]>(user?.authorized_apps || []);

    // Sync state when user prop updates (e.g. from table refresh) or when dialog opens
    useEffect(() => {
        if (open) { // Only sync when opening to avoid fighting local state? 
            // Actually better to sync when user/mode changes if open
            setIsAdmin(user?.is_super_admin || false);
            setSelectedApps(user?.authorized_apps || []);
        }
    }, [user, mode, open]);

    const handleAppToggle = (code: string, checked: boolean) => {
        if (checked) {
            setSelectedApps(prev => [...prev, code]);
        } else {
            setSelectedApps(prev => prev.filter(c => c !== code));
        }
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        if (mode === "edit" && user) {
            formData.append("userId", user.id);
        }

        startTransition(async () => {
            const action = mode === "create" ? createUser : updateUser;
            const result = await action({}, formData);

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(result.success);
                setOpen(false);
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {mode === "create" ? (
                    <Button size="sm" className="bg-primary hover:bg-primary/90">
                        <Plus size={16} className="mr-2" /> Novo Usuário
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary border-grey-light">
                        <Pencil size={14} className="text-[#2B4964]" />
                        <span className="sr-only">Editar</span>
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{mode === "create" ? "Novo Usuário" : "Editar Usuário"}</DialogTitle>
                </DialogHeader>

                {isCurrentUser && (
                    <div className="bg-yellow-50 text-yellow-800 p-3 rounded-md text-sm border border-yellow-200 mb-2">
                        <strong>Atenção:</strong> Alterar sua própria senha, email ou remover seu acesso de administrador fará com que você seja desconectado.
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
                    {/* Hack to prevent Chrome credential autofill */}
                    <input type="text" style={{ display: "none" }} />
                    <input type="password" style={{ display: "none" }} />

                    {/* Send selected apps as JSON */}
                    <input type="hidden" name="appCodes" value={JSON.stringify(selectedApps)} />

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Nome Completo</Label>
                            <Input
                                id="fullName"
                                name="fullName"
                                defaultValue={user?.full_name || ""}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                defaultValue={user?.email || ""}
                                required
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">
                            {mode === "create" ? "Senha" : "Nova Senha (deixe em branco para manter)"}
                        </Label>
                        <Input
                            id="password"
                            name="password"
                            type="password"
                            required={mode === "create"}
                            minLength={6}
                            autoComplete="new-password"
                        />
                    </div>

                    <div className="flex items-center space-x-2 py-2 border-t border-b border-grey-light bg-grey-lighter/30 p-2 rounded">
                        {/* Explicitly control the input value for FormData */}
                        {isAdmin && <input type="hidden" name="isSuperAdmin" value="on" />}
                        <Checkbox
                            id="isSuperAdmin"
                            checked={isAdmin}
                            onCheckedChange={(checked) => setIsAdmin(checked === true)}
                        />
                        <div className="flex flex-col">
                            <Label htmlFor="isSuperAdmin" className="font-semibold text-primary">Administrador Geral</Label>
                            <span className="text-xs text-grey-darker">Tem acesso total a todos os apps e configurações.</span>
                        </div>
                    </div>

                    {!isAdmin && (
                        <div className="space-y-2">
                            <Label className="mb-2 block">Aplicativos Permitidos</Label>
                            <div className="grid grid-cols-2 gap-2 border border-grey-light rounded-md p-3 max-h-[150px] overflow-y-auto">
                                {allApps.length === 0 && <p className="text-xs text-grey-darker col-span-2">Nenhum app ativo.</p>}
                                {allApps.map(app => (
                                    <div key={app.code} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`app-${app.code}`}
                                            checked={selectedApps.includes(app.code)}
                                            onCheckedChange={(checked) => handleAppToggle(app.code, checked === true)}
                                        />
                                        <Label htmlFor={`app-${app.code}`} className="text-sm font-normal cursor-pointer text-grey-darker">
                                            {app.name}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {mode === "create" ? "Criar" : "Salvar"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
