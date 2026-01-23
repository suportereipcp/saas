"use client";

import { useState, useTransition, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Loader2, RefreshCw, Users, Key, LayoutGrid } from "lucide-react";
import { toast } from "sonner";
import { createUser, updateUser, type ActionState } from "@/actions/users";

type User = {
    id: string;
    email: string;
    full_name: string | null;
    is_super_admin: boolean | null;
    created_at: string;
    sector?: string | null;
    authorized_apps?: string[];
};

type App = {
    code: string;
    name: string;
    active: boolean | null;
};

import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export function UserList({ users, currentUserId, allApps }: { users: User[], currentUserId?: string, allApps: App[] }) {
    const [search, setSearch] = useState("");
    const [sectorFilter, setSectorFilter] = useState("all");

    // Compute Stats
    // Get unique non-null sectors
    const uniqueSectors = Array.from(new Set(users.map(u => u.sector).filter(Boolean))) as string[];

    // Filter Logic
    const filteredUsers = users.filter(user => {
        const matchesSearch = (user.full_name?.toLowerCase() || "").includes(search.toLowerCase()) ||
            (user.email?.toLowerCase() || "").includes(search.toLowerCase());
        const matchesSector = sectorFilter === "all" || user.sector === sectorFilter;
        return matchesSearch && matchesSector;
    });

    return (
        <div className="space-y-4">

            <Card>
                <CardHeader className="flex flex-row items-center justify-end space-y-0 pb-4">
                    <UserDialog mode="create" allApps={allApps} existingSectors={uniqueSectors} />
                </CardHeader>
                <CardContent>
                    {/* Toolbar */}
                    <div className="flex items-center gap-2 mb-4">
                        <div className="relative flex-1 max-w-sm">
                            <Input
                                placeholder="Buscar por nome ou email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-8 w-full"
                            />
                        </div>
                        <Select value={sectorFilter} onValueChange={setSectorFilter}>
                            <SelectTrigger className="h-8 w-[180px]">
                                <SelectValue placeholder="Filtrar por Setor" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Setores</SelectItem>
                                {uniqueSectors.map(sector => (
                                    <SelectItem key={sector} value={sector}>{sector}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="pl-4">Nome</TableHead>
                                    <TableHead>Setor</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Apps</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead className="w-[100px] text-right pr-4">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => {
                                    const isCurrentUser = user.id === currentUserId;
                                    return (
                                        <TableRow key={user.id} className={isCurrentUser ? "bg-primary/5 hover:bg-primary/5" : ""}>
                                            <TableCell className="font-medium pl-4">
                                                {user.full_name || "Sem nome"}
                                                {isCurrentUser && <span className="ml-2 text-xs text-primary font-bold">(Você)</span>}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground uppercase text-xs font-semibold">
                                                {user.sector || "-"}
                                            </TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <span className="text-xs text-muted-foreground">
                                                    {user.is_super_admin
                                                        ? "Todos"
                                                        : (user.authorized_apps?.length ? `${user.authorized_apps.length} apps` : "Nenhum")
                                                    }
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${user.is_super_admin
                                                    ? 'bg-primary/10 text-primary ring-primary/20'
                                                    : 'bg-muted text-muted-foreground ring-gray-500/10'
                                                    }`}>
                                                    {user.is_super_admin ? "Admin" : "Comum"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right pr-4">
                                                <UserDialog mode="edit" user={user} isCurrentUser={isCurrentUser} allApps={allApps} existingSectors={uniqueSectors} />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                                {filteredUsers.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                                            Nenhum usuário encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}

function UserDialog({
    mode,
    user,
    isCurrentUser,
    allApps,
    existingSectors = []
}: {
    mode: "create" | "edit";
    user?: User;
    isCurrentUser?: boolean;
    allApps: App[];
    existingSectors?: string[];
}) {
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [isAdmin, setIsAdmin] = useState(user?.is_super_admin || false);
    const [selectedApps, setSelectedApps] = useState<string[]>(user?.authorized_apps || []);

    // Sync state
    useEffect(() => {
        if (open) {
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
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                        <Pencil size={14} />
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
                    <input type="text" style={{ display: "none" }} />
                    <input type="password" style={{ display: "none" }} />
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
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="sector">Setor</Label>
                            <Input
                                id="sector"
                                name="sector"
                                defaultValue={user?.sector || ""}
                                placeholder="Ex: Financeiro, TI..."
                                list="sector-suggestions"
                            />
                            <datalist id="sector-suggestions">
                                {existingSectors.map(s => <option key={s} value={s} />)}
                            </datalist>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">
                                {mode === "create" ? "Senha" : "Nova Senha"}
                            </Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required={mode === "create"}
                                minLength={6}
                                placeholder={mode === "edit" ? "Deixe em branco para manter" : ""}
                            />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 py-2 border rounded-md p-3 bg-muted/20">
                        <Checkbox
                            id="isSuperAdmin"
                            name="isSuperAdmin"
                            checked={isAdmin}
                            onCheckedChange={(checked) => setIsAdmin(checked === true)}
                        />
                        <div className="space-y-0.5">
                            <Label htmlFor="isSuperAdmin" className="text-sm font-semibold cursor-pointer">Administrador Geral</Label>
                            <p className="text-xs text-muted-foreground">Acesso total ao sistema e configurações.</p>
                        </div>
                    </div>

                    {!isAdmin && (
                        <div className="space-y-2">
                            <Label className="mb-2 block">Acesso aos Aplicativos</Label>
                            <div className="grid grid-cols-2 gap-2 border rounded-md p-3 max-h-[150px] overflow-y-auto bg-muted/10">
                                {allApps.length === 0 && <p className="text-xs text-muted-foreground col-span-2">Nenhum app ativo.</p>}
                                {allApps.map(app => (
                                    <div key={app.code} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`app-${app.code}`}
                                            checked={selectedApps.includes(app.code)}
                                            onCheckedChange={(checked) => handleAppToggle(app.code, checked === true)}
                                        />
                                        <Label htmlFor={`app-${app.code}`} className="text-sm font-normal cursor-pointer">
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
                            {mode === "create" ? "Salvar Registro" : "Atualizar"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
