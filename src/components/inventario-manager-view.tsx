"use client";

import { useState, useTransition, useEffect } from "react";
import { ProjectRangeCalendar } from "@/components/ui/ProjectRangeCalendar";
import { getInventoryReport, InventoryReportItem, requestRecount, approveInventoryItem } from "@/actions/inventario";
import { Loader2, RefreshCw, Check, X, RefreshCcw, CheckCircle, XCircle } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

// Extracted Component for Individual Rows to handle state (Selection Override)
function InventoryRow({ item, detail, refresh }: { item: InventoryReportItem, detail: any, refresh: () => void }) {
    const [overrideValue, setOverrideValue] = useState<number | null>(null);

    // Determines displayed value: Override > Last Count
    const displayedValue = overrideValue !== null ? overrideValue : detail.qtd_fisica;
    const isOverridden = overrideValue !== null;

    const handleApprove = async () => {
        toast.promise(approveInventoryItem(detail.id, 'approve', overrideValue || undefined), {
            loading: 'Aprovando...',
            success: (msg) => {
                 refresh();
                 return typeof msg === 'string' ? msg : "Aprovado!";
            },
            error: "Erro ao aprovar"
        });
    };

    const handleReject = async () => {
        toast.promise(approveInventoryItem(detail.id, 'reject'), {
            loading: 'Reprovando...',
            success: (msg) => {
                refresh();
                return "Reprovado. Reiniciando contagem.";
            },
            error: "Erro ao reprovar"
        });
    };

    // LOGIC: Show APPROVED badge only if fully finalized (counts > 1).
    // If counts == 1, it's Pending Admin Action (even if contado=true due to lock).
    const isFullyApproved = detail.contado && (detail.counts_history && detail.counts_history.length > 1);

    return (
        <TableRow>
            <TableCell className="font-medium">
                <div className="flex flex-col">
                    <span>{item.it_codigo}</span>
                    <span className="text-xs text-muted-foreground truncate w-40" title={item.desc_item}>{item.desc_item}</span>
                </div>
            </TableCell>
            <TableCell>{detail.centro_custo}</TableCell>
            <TableCell className="text-right font-mono relative group">
                {/* HOVER CARD FOR HISTORY & SELECTION */}
                <HoverCard>
                    <HoverCardTrigger asChild>
                        <span className={`cursor-help decoration-dashed underline underline-offset-4 ${isOverridden ? "text-amber-600 font-bold decoration-amber-300" : "decoration-slate-300"}`}>
                            {displayedValue.toFixed(2)}
                        </span>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-72 bg-white p-4 shadow-xl border rounded-lg z-50">
                        <div className="space-y-2">
                            <h4 className="text-sm font-semibold text-slate-700">Histórico de Contagens</h4>
                            <div className="flex flex-col gap-1">
                                {(detail.counts_history || []).map((val: number, idx: number) => {
                                    const countNum = idx + 1;
                                    const isSelected = overrideValue === val;
                                    
                                    // Allow selection if >= 3 counts and NOT finalized
                                    const canSelect = detail.counts_history && detail.counts_history.length >= 3 && !detail.contado;

                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={() => canSelect && setOverrideValue(val)}
                                            className={`flex justify-between items-center text-sm p-2 rounded transition-colors ${canSelect ? "cursor-pointer hover:bg-slate-100" : ""} ${isSelected ? "bg-green-50 border border-green-200" : ""}`}
                                        >
                                            <span className="text-slate-500">{countNum}ª Contagem:</span>
                                            <span className="font-mono font-medium">{val.toFixed(2)}</span>
                                            {isSelected && <CheckCircle className="w-3 h-3 text-green-600 ml-2" />}
                                        </div>
                                    )
                                })}
                            </div>
                            {detail.counts_history && detail.counts_history.length >= 3 && !detail.contado && (
                                <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-amber-600">
                                    <p>⚠️ Divergência em 3 contagens. Clique no valor correto acima para selecionar antes de Aprovar.</p>
                                </div>
                            )}
                        </div>
                    </HoverCardContent>
                </HoverCard>
            </TableCell>
            <TableCell className="text-center">
                {isFullyApproved ? (
                    <div className="flex items-center justify-center">
                        {/* APPROVED STATE (Outline Badge) */}
                        <div className="flex items-center gap-1 border border-green-500 text-green-600 px-3 py-1 rounded-md bg-white text-sm font-bold select-none cursor-default shadow-sm">
                            <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
                            Aprovado
                        </div>
                    </div>
                ) : (
                        <div className="flex items-center justify-center gap-3">
                        {/* PENDING ACTIONS (Outline Circular Buttons) */}
                        <button
                            onClick={handleApprove}
                            className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${isOverridden ? "border-amber-500 text-amber-500 hover:bg-amber-50" : "border-green-500 text-green-500 hover:bg-green-50"}`}
                            title={isOverridden ? "Aprovar com Valor Selecionado" : "Aprovar"}
                        >
                            <Check className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                        
                        <button
                            onClick={handleReject}
                            className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-50 transition-colors"
                            title="Reprovar"
                        >
                            <X className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                    </div>
                )}
            </TableCell>
        </TableRow>
    );
}

export function InventoryManagerView() {
    const [mounted, setMounted] = useState(false);
    const [date, setDate] = useState<DateRange | undefined>(undefined);
    const [reportData, setReportData] = useState<InventoryReportItem[]>([]);
    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        setMounted(true);
        setDate({
            from: new Date(),
            to: new Date()
        });
    }, []);

    const fetchReport = () => {
         if (date?.from && date?.to) {
            startTransition(async () => {
                const start = date.from!.toISOString().split('T')[0];
                const end = date.to!.toISOString().split('T')[0];
                const data = await getInventoryReport(start, end);
                setReportData(data);
            });
        }
    };

    useEffect(() => {
        fetchReport();
    }, [date]);

    if (!mounted) return null;

    return (
        <div className="flex flex-col gap-6">
            
            {/* Filter Section */}
            <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm border">
                <div className="flex items-center gap-4">
                    <span className="font-semibold text-sm text-gray-600">Período de Contagem:</span>
                    <ProjectRangeCalendar date={date} setDate={setDate} />
                    <Button variant="ghost" size="icon" onClick={fetchReport} disabled={isPending}>
                        <RefreshCcw className={`w-5 h-5 ${isPending ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* Content Section - Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Left Column: Detailed View */}
                <Card className="h-full">
                    <CardHeader className="bg-[#68D9A6]/10 pb-3">
                        <CardTitle className="text-lg text-[#374151]">Detalhamento (Por Centro de Custo)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Centro de Custo</TableHead>
                                    <TableHead className="text-right">Qtd. Física</TableHead>
                                    <TableHead className="text-center">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {reportData.flatMap(item => 
                                item.details.map(detail => (
                                    <InventoryRow key={detail.id} item={item} detail={detail} refresh={fetchReport} />
                                ))
                            )}
                            {reportData.length === 0 && !isPending && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        Nenhum registro encontrado para a data.
                                    </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Right Column: Consolidated View */}
                <Card className="h-full border-l-4 border-l-blue-500">
                    <CardHeader className="bg-blue-50/50 pb-3">
                        <CardTitle className="text-lg text-[#374151]">Consolidado (Por Item)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Item</TableHead>
                                    <TableHead className="text-right">Qtd. Total</TableHead>
                                    <TableHead className="text-center">Status Geral</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                            {reportData.map(item => (
                                <TableRow key={item.it_codigo}>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span className="text-blue-700 font-bold">{item.it_codigo}</span>
                                            <span className="text-xs text-muted-foreground w-64 truncate" title={item.desc_item}>
                                                {item.desc_item}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-mono text-lg font-semibold">
                                        {item.total_qtd.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {item.status_geral === "liberado" ? (
                                            <Badge className="bg-green-600 hover:bg-green-700 text-white rounded-full px-4 font-bold">LIBERADO</Badge>
                                        ) : (
                                            <Badge variant="destructive" className="rounded-full px-4 font-bold">NÃO LIBERADO</Badge>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {reportData.length === 0 && !isPending && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                        -
                                    </TableCell>
                                </TableRow>
                            )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
