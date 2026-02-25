"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ProjectRangeCalendar } from "@/components/ui/ProjectRangeCalendar";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Save, CheckCircle, AlertCircle, RefreshCcw, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveInventoryCount, getPendingOperatorItems } from "@/actions/inventario";
import { toast } from "sonner";

interface OperatorScanViewProps {
    userCC: string | null;
    isAdmin?: boolean;
}

type PendingItem = {
    id: string;
    it_codigo: string;
    desc_item: string;
    counts: number[];
    dt_contagem: string | null;
    contado: boolean;
    centro_custo?: string;
};

export function OperatorScanView({ userCC, isAdmin = false }: OperatorScanViewProps) {
    const [items, setItems] = useState<PendingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [mounted, setMounted] = useState(false);
    const [date, setDate] = useState<DateRange | undefined>(undefined);
    const [searchTerm, setSearchTerm] = useState("");

    // Manage input state per item to allow typing
    const [inputs, setInputs] = useState<Record<string, string>>({});

    useEffect(() => {
        setMounted(true);
        setDate({
            from: new Date(),
            to: new Date(),
        })
    }, []);

    const fetchItems = async () => {
        if (!userCC && !isAdmin) return;
        setLoading(true);

        let start = "";
        let end = "";
        if (date?.from) start = format(date.from, 'yyyy-MM-dd');
        else start = format(new Date(), 'yyyy-MM-dd'); // Fallback

        if (date?.to) end = format(date.to, 'yyyy-MM-dd');
        else end = start;

        const data = await getPendingOperatorItems(userCC || "", start, end, isAdmin);
        setItems(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchItems();
    }, [userCC, date]);

    if (!userCC && !isAdmin) {
        return (
            <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6 text-center text-red-600">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2" />
                    <p>Seu perfil não está vinculado a um Centro de Custo.</p>
                </CardContent>
            </Card>
        )
    }

    const handleSaveRow = (item: PendingItem) => {
        const qtdValue = inputs[item.id];
        if (!qtdValue) {
            toast.error("Informe a quantidade.");
            return;
        }

        if (parseFloat(qtdValue) < 0) {
            toast.error("A quantidade não pode ser negativa.");
            return;
        }

        startTransition(async () => {
            const formData = new FormData();
            formData.append("it_codigo", item.it_codigo);
            formData.append("qtd_fisica", qtdValue);
            formData.append("centro_custo", userCC || item.centro_custo || "");
            formData.append("contado", "on");

            const result = await saveInventoryCount(null as any, formData);

            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`Item ${item.it_codigo} salvo!`);

                // UPDATE LOCAL STATE: Append new count and lock
                setItems(current => current.map(i => {
                    if (i.id === item.id) {
                        return {
                            ...i,
                            contado: true,
                            counts: [...i.counts, parseFloat(qtdValue)],
                            dt_contagem: new Date().toISOString()
                        };
                    }
                    return i;
                }));

                const newInputs = { ...inputs };
                delete newInputs[item.id];
                setInputs(newInputs);

                // Trigger refresh to check for auto-divergence (backend might have unlocked it)
                fetchItems();
            }
        });
    };

    // Helper to determine status of a specific count slot (1, 2, or 3)
    const getSlotStatus = (item: PendingItem, slotIndex: number) => {
        // slotIndex is 0, 1, 2 (corresponding to Qtd 1, 2, 3)
        const currentCountLength = item.counts.length;

        // Case A: Value already exists for this slot
        if (slotIndex < currentCountLength) {
            return { type: "value", value: item.counts[slotIndex] };
        }

        // Case B: This is the NEXT slot to be filled
        // Conditions: 
        // 1. It is the immediate next index (slotIndex === currentCountLength)
        // 2. The item is NOT locked (contado === false)
        if (slotIndex === currentCountLength && !item.contado) {
            return { type: "input" };
        }

        // Case C: Future slot or blocked
        // If it's the next slot but item IS locked (contado === true) -> Blocked (waiting for re-count request)
        // If it's 2+ slots ahead -> Blocked (obviously)
        return { type: "blocked", label: "Bloqueado" };
    };

    // Filter Logic
    const filteredItems = items.filter(item => {
        if (!searchTerm) return true;
        const lower = searchTerm.toLowerCase();
        return (
            item.it_codigo.toLowerCase().includes(lower) ||
            (item.desc_item || "").toLowerCase().includes(lower) ||
            (item.centro_custo || "").toLowerCase().includes(lower)
        );
    });

    return (
        <div className="grid gap-6">
            <Card className="border-l-4 border-l-[#68D9A6] shadow-sm">
                <CardHeader className="pb-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                        <CardTitle className="text-xl text-[#374151]">Lista de Produtos à Inventariar</CardTitle>
                        <CardDescription>
                            Setor: <span className="font-semibold text-slate-900">{userCC || "Todos (Admin)"}</span>
                        </CardDescription>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        {mounted && <ProjectRangeCalendar date={date} setDate={setDate} />}
                        <Button variant="ghost" size="icon" onClick={fetchItems} disabled={loading} className="shrink-0">
                            <RefreshCcw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>

                    {/* Search Bar */}
                    <div className="mb-4 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Pesquisar por item, descrição ou centro de custo..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-full max-w-none md:max-w-lg border-slate-200 focus-visible:ring-[#68D9A6]"
                        />
                    </div>

                    <div className="overflow-x-auto w-full pb-4">
                        <Table className="min-w-[800px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="min-w-[160px] w-[180px]">Item</TableHead>
                                    <TableHead className="w-[200px]">Descrição</TableHead>
                                    {isAdmin && <TableHead className="w-[100px]">C. Custo</TableHead>}
                                    <TableHead className="text-center w-[140px]">1ª Contagem</TableHead>
                                    <TableHead className="text-center w-[140px]">2ª Contagem</TableHead>
                                    <TableHead className="text-center w-[140px]">3ª Contagem</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredItems.map(item => {
                                    // Determine active input slot to show Save button correctly
                                    const activeSlot = !item.contado ? item.counts.length : -1;

                                    // NEW: Determine if item is "Approved" (Ghost Count Logic) to Unmask
                                    // Approved means contado=true AND length > 1 (because we duplicate on 1st approval)
                                    const isApproved = item.contado && item.counts.length > 1;

                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-semibold align-top">{item.it_codigo}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm align-top">
                                                {item.desc_item || "Sem descrição"}
                                                {item.dt_contagem && <div className="text-xs text-slate-400 mt-1">Última: {new Date(item.dt_contagem).toLocaleDateString()}</div>}
                                            </TableCell>
                                            {isAdmin && <TableCell className="align-top text-xs text-slate-500">{item.centro_custo}</TableCell>}

                                            {[0, 1, 2].map(slot => {
                                                const status = getSlotStatus(item, slot);
                                                return (
                                                    <TableCell key={slot} className="align-top p-2">
                                                        {status.type === "value" && (
                                                            <div className={`p-2 rounded text-center font-mono font-medium ${isAdmin ? "bg-slate-100 text-slate-700" : "bg-slate-50 text-slate-400"}`}>
                                                                {isAdmin || isApproved ? status.value?.toFixed(2) : "******"}
                                                            </div>
                                                        )}
                                                        {status.type === "blocked" && (
                                                            <div className="p-2 border border-red-200 rounded text-center text-xs font-semibold text-red-600 bg-red-50 h-10 flex items-center justify-center">
                                                                {status.label}
                                                            </div>
                                                        )}
                                                        {status.type === "input" && (
                                                            <Input
                                                                type="number"
                                                                step="0.01"
                                                                min={0}
                                                                placeholder="0.00"
                                                                className="font-mono text-center h-10 border-green-500 bg-green-50 focus-visible:ring-green-500 focus-visible:bg-white transition-colors"
                                                                value={inputs[item.id] || ""}
                                                                onChange={(e) => setInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === "Enter") handleSaveRow(item);
                                                                }}
                                                            />
                                                        )}
                                                    </TableCell>
                                                );
                                            })}

                                            <TableCell className="align-top">
                                                {activeSlot >= 0 && activeSlot < 3 && (
                                                    <Button
                                                        size="sm"
                                                        className="bg-[#68D9A6] hover:bg-[#57c595] mt-0.5"
                                                        disabled={isPending || !inputs[item.id]}
                                                        onClick={() => handleSaveRow(item)}
                                                    >
                                                        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}

                                {!loading && filteredItems.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-10 text-muted-foreground">
                                            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500/50" />
                                            {searchTerm ? "Nenhum item encontrado na busca." : "Nenhuma contagem pendente para hoje!"}
                                        </TableCell>
                                    </TableRow>
                                )}

                                {loading && (
                                    <TableRow>
                                        <TableCell colSpan={isAdmin ? 7 : 6} className="text-center py-10">
                                            <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
