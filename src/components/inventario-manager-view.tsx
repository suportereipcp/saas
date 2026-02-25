"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { ProjectRangeCalendar } from "@/components/ui/ProjectRangeCalendar";
import { getInventoryReport, InventoryReportItem, approveInventoryItem, getCcSectorMap } from "@/actions/inventario";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import {
    HoverCard,
    HoverCardContent,
    HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
    Check,
    X,
    RefreshCcw,
    CheckCircle,
    Search,
    Maximize2,
    Minimize2,
    FileText,
    Table2,
    Filter,
    ChevronLeft,
    ChevronRight,
    BarChart3,
    Info,
} from "lucide-react";

// ─── Constants ───────────────────────────────────────────────────────
const COLORS = {
    primary: "#50d298",
    secondary: "#3B82F6",
    danger: "#EF4444",
    success: "#10B981",
    bgLight: "#F3F4F6",
    cardLight: "#FFFFFF",
    textLight: "#1F2937",
    mutedLight: "#6B7280",
    borderLight: "#E5E7EB",
};

// ─── Inventory Row (Detalhamento) ────────────────────────────────────
function InventoryRow({ item, detail, refresh, ccNames }: { item: InventoryReportItem; detail: any; refresh: () => void; ccNames: Record<string, string> }) {
    const [overrideValue, setOverrideValue] = useState<number | null>(null);
    const displayedValue = overrideValue !== null ? overrideValue : detail.qtd_fisica;
    const isOverridden = overrideValue !== null;
    const isFullyApproved = detail.cc_status === "liberado";

    const handleApprove = async () => {
        toast.promise(approveInventoryItem(detail.id, "approve", overrideValue || undefined), {
            loading: "Aprovando...",
            success: (msg) => { refresh(); return typeof msg === "string" ? msg : "Aprovado!"; },
            error: "Erro ao aprovar",
        });
    };

    const handleReject = async () => {
        toast.promise(approveInventoryItem(detail.id, "reject"), {
            loading: "Reprovando...",
            success: () => { refresh(); return "Reprovado. Reiniciando contagem."; },
            error: "Erro ao reprovar",
        });
    };



    // CC Status label map
    const ccStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
        aguardando_2a: { bg: "bg-amber-100 border-amber-200", text: "text-amber-800", label: `1ª Contagem` },
        contagem_2a: { bg: "bg-orange-100 border-orange-200", text: "text-orange-800", label: "2ª Contagem" },
        contagem_3a: { bg: "bg-red-100 border-red-200", text: "text-red-800", label: "3ª Contagem" },
        liberado: { bg: "bg-green-100 border-green-200", text: "text-green-800", label: "Liberado" },
    };
    const ccSt = ccStatusConfig[detail.cc_status] || ccStatusConfig.aguardando_2a;

    return (
        <tr className="hover:bg-gray-50 transition-colors group">
            <td className="py-4 px-6">
                <div className="flex items-start gap-3">
                    <div>
                        <div className="font-bold text-gray-800 text-base">{item.it_codigo}</div>
                        <div className="text-sm text-gray-500 mt-1">{item.desc_item}</div>
                    </div>
                </div>
            </td>
            <td className="py-4 px-6">
                <div className="flex flex-col gap-1">
                    <span className="text-gray-800 font-medium text-base">{ccNames[detail.centro_custo] || detail.centro_custo}</span>
                    <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">CC: {detail.centro_custo}</span>
                </div>
            </td>
            <td className="py-4 px-6">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${ccSt.bg} ${ccSt.text} border`}>
                    {ccSt.label}
                </span>
                <div className="text-[10px] text-gray-400 mt-1">
                    {detail.counts_count} contagem(ns)
                </div>
            </td>
            <td className="py-4 px-6 font-mono text-right text-gray-800 font-bold text-base">
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
                                    const canSelect = detail.counts_history && detail.counts_history.length >= 3 && detail.cc_status === "contagem_3a";
                                    const isSelected = overrideValue === val;
                                    return (
                                        <div key={idx} onClick={() => canSelect && setOverrideValue(val)}
                                            className={`flex justify-between items-center text-sm p-2 rounded transition-colors ${canSelect ? "cursor-pointer hover:bg-slate-100" : ""} ${isSelected ? "bg-green-50 border border-green-200" : ""}`}>
                                            <span className="text-slate-500">{idx + 1}ª Contagem:</span>
                                            <span className="font-mono font-medium">{val.toFixed(2)}</span>
                                            {isSelected && <CheckCircle className="w-3 h-3 text-green-600 ml-2" />}
                                        </div>
                                    );
                                })}
                            </div>
                            {detail.cc_status === "contagem_3a" && (
                                <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-amber-600">
                                    <p>⚠️ Divergência em 3 contagens. Clique no valor correto acima para selecionar antes de Aprovar.</p>
                                </div>
                            )}
                        </div>
                    </HoverCardContent>
                </HoverCard>
            </td>
            <td className="py-4 px-6">
                {isFullyApproved ? (
                    <div className="flex items-center justify-center">
                        <div className="flex items-center gap-1 border border-green-500 text-green-600 px-3 py-1 rounded-md bg-white text-sm font-bold select-none cursor-default shadow-sm">
                            <CheckCircle className="w-4 h-4" strokeWidth={2.5} />
                            Aprovado
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button onClick={handleApprove} title={isOverridden ? "Aprovar com Valor Selecionado" : "Aprovar"}
                            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all shadow-sm ${isOverridden ? "border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white" : "border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white"}`}>
                            <Check className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                        <button onClick={handleReject} title="Reprovar"
                            className="w-9 h-9 rounded-full border border-red-500 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all shadow-sm">
                            <X className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                    </div>
                )}
            </td>
        </tr>
    );
}

// ─── Donut Chart Component ───────────────────────────────────────────
function DonutChart({ data }: { data: { liberado: number; naoLiberado: number; pendente: number; total: number } }) {
    const pctLib = data.total > 0 ? (data.liberado / data.total) * 100 : 0;
    const pctNao = data.total > 0 ? (data.naoLiberado / data.total) * 100 : 0;
    const pctPend = data.total > 0 ? (data.pendente / data.total) * 100 : 100;

    const gradient = `conic-gradient(
    ${COLORS.danger} 0% ${pctNao}%,
    ${COLORS.primary} ${pctNao}% ${pctNao + pctLib}%,
    ${COLORS.success} ${pctNao + pctLib}% 100%
  )`;

    return (
        <div className="flex items-center justify-center mb-6">
            <div className="relative w-40 h-40 rounded-full shadow-lg" style={{ background: gradient }}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-white shadow-inner flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-gray-800">{data.total}</span>
                    <span className="text-[10px] uppercase text-gray-500 tracking-widest font-semibold mt-1">TOTAL ITENS</span>
                </div>
            </div>
        </div>
    );
}

// ─── Status Badge ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const config: Record<string, { bg: string; text: string; dot: string; label: string }> = {
        liberado: { bg: "bg-green-100 border-green-200", text: "text-green-800", dot: "bg-green-600", label: "LIBERADO" },
        pendente: { bg: "bg-yellow-100 border-yellow-200", text: "text-yellow-800", dot: "bg-yellow-600", label: "PENDENTE" },
        nao_liberado: { bg: "bg-red-100 border-red-200", text: "text-red-800", dot: "bg-red-600", label: "NÃO LIBERADO" },
    };
    const c = config[status] || config.nao_liberado;

    return (
        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${c.bg} ${c.text} border`}>
            <span className={`w-1.5 h-1.5 rounded-full ${c.dot} mr-2`} />
            {c.label}
        </span>
    );
}

// ─── Main Component ──────────────────────────────────────────────────
export function InventoryManagerView() {
    const [mounted, setMounted] = useState(false);
    const [date, setDate] = useState<DateRange | undefined>(undefined);
    const [reportData, setReportData] = useState<InventoryReportItem[]>([]);
    const [isPending, startTransition] = useTransition();
    const [ccNames, setCcNames] = useState<Record<string, string>>({});

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [ccFilter, setCcFilter] = useState("");

    // Fullscreen
    const [fullscreenPanel, setFullscreenPanel] = useState<"detalhamento" | "consolidado" | null>(null);

    useEffect(() => {
        setMounted(true);
        setDate({ from: new Date(), to: new Date() });
        getCcSectorMap().then(setCcNames);
    }, []);

    const fetchReport = () => {
        if (date?.from && date?.to) {
            startTransition(async () => {
                const start = date.from!.toISOString().split("T")[0];
                const end = date.to!.toISOString().split("T")[0];
                const data = await getInventoryReport(start, end);
                setReportData(data);
            });
        }
    };

    useEffect(() => { fetchReport(); }, [date]);

    // Filtered data
    const filteredDetails = useMemo(() => {
        return reportData.flatMap((item) =>
            item.details.filter((detail) => {
                const searchMatch = !searchTerm ||
                    item.it_codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    item.desc_item.toLowerCase().includes(searchTerm.toLowerCase());
                const ccMatch = !ccFilter || detail.centro_custo === ccFilter;
                const statusMatch = !statusFilter ||
                    (statusFilter === "liberado" && detail.cc_status === "liberado") ||
                    (statusFilter === "nao_liberado" && detail.cc_status !== "liberado");
                return searchMatch && ccMatch && statusMatch;
            }).map((detail) => ({ item, detail }))
        );
    }, [reportData, searchTerm, statusFilter, ccFilter]);

    const filteredItems = useMemo(() => {
        return reportData.filter((item) => {
            const searchMatch = !searchTerm ||
                item.it_codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.desc_item.toLowerCase().includes(searchTerm.toLowerCase());
            const statusMatch = !statusFilter ||
                (statusFilter === "liberado" && item.status_geral === "liberado") ||
                (statusFilter === "nao_liberado" && item.status_geral !== "liberado");
            return searchMatch && statusMatch;
        });
    }, [reportData, searchTerm, statusFilter]);

    // Summary stats for donut
    const summaryStats = useMemo(() => {
        const total = reportData.length;
        const liberado = reportData.filter((i) => i.status_geral === "liberado").length;
        const naoLiberado = total - liberado;
        // total_qtd now includes ALL partial counts from server
        const totalPecas = reportData.reduce((sum, i) => sum + i.total_qtd, 0);
        // Count how many CCs have submitted at least 1 count vs total CCs
        const totalCCs = reportData.reduce((sum, i) => sum + i.details.length, 0);
        const liberadoCCs = reportData.reduce((sum, i) => sum + i.details.filter(d => d.cc_status === "liberado").length, 0);
        return { total, liberado, naoLiberado, pendente: 0, totalPecas, totalCCs, liberadoCCs };
    }, [reportData]);

    // Unique CCs
    const uniqueCCs = useMemo(() => {
        const ccs = new Set<string>();
        reportData.forEach((item) => item.details.forEach((d) => ccs.add(d.centro_custo)));
        return Array.from(ccs).sort();
    }, [reportData]);



    if (!mounted) return null;

    // ── Fullscreen: Detalhamento ──────────────────────────────────────
    if (fullscreenPanel === "detalhamento") {
        return (
            <div className="flex flex-col h-[calc(100vh-5rem)] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-green-50 rounded-lg text-emerald-600">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                                Detalhamento
                                <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">Visão Expandida</span>
                            </h2>
                            <p className="text-gray-500 text-sm">Análise detalhada por centro de custo</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm bg-[#50d298] text-white hover:bg-[#50d298]/90 transition-colors">
                            <FileText className="w-4 h-4" /> Exportar PDF
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm border border-[#50d298] text-[#50d298] bg-white hover:bg-green-50 transition-colors">
                            <Table2 className="w-4 h-4" /> Exportar Excel
                        </button>
                        <div className="h-6 w-px bg-gray-200 mx-1" />
                        <button onClick={() => setFullscreenPanel(null)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm border border-red-500 text-red-500 bg-white hover:bg-red-50 transition-colors">
                            <Minimize2 className="w-4 h-4" /> Fechar Tela Cheia
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row flex-wrap items-center gap-4 bg-gray-50/30 overflow-x-auto">
                    <div className="relative w-full sm:w-80 flex-shrink-0">
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar item, código..."
                            className="pl-10 pr-4 py-2 w-full bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#50d298] focus:border-[#50d298] text-gray-700 shadow-sm transition-all outline-none" />
                    </div>
                    <ProjectRangeCalendar date={date} setDate={setDate} />
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                        className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-3 pr-8 rounded-lg text-sm shadow-sm outline-none cursor-pointer hover:border-[#50d298] transition-colors">
                        <option value="">Status: Todos</option>
                        <option value="liberado">Liberado</option>
                        <option value="nao_liberado">Não Liberado</option>
                    </select>
                    <select value={ccFilter} onChange={(e) => setCcFilter(e.target.value)}
                        className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-3 pr-8 rounded-lg text-sm shadow-sm outline-none cursor-pointer hover:border-[#50d298] transition-colors">
                        <option value="">Centro de Custo: Todos</option>
                        {uniqueCCs.map((cc) => (
                            <option key={cc} value={cc}>{cc} - {ccNames[cc] || cc}</option>
                        ))}
                    </select>
                    <button onClick={fetchReport} className="p-2 text-gray-500 hover:text-[#50d298] hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100" title="Atualizar">
                        <RefreshCcw className={`w-5 h-5 ${isPending ? "animate-spin" : ""}`} />
                    </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 w-[35%]">Item / Descrição</th>
                                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 w-[20%]">Centro de Custo</th>
                                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 w-[15%]">Status CC</th>
                                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 text-right w-[15%]">Qtd. Física</th>
                                <th className="py-4 px-6 text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-200 text-center w-[15%]">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 text-sm">
                            {filteredDetails.map(({ item, detail }) => (
                                <InventoryRow key={detail.id} item={item} detail={detail} refresh={fetchReport} ccNames={ccNames} />
                            ))}
                            {filteredDetails.length === 0 && !isPending && (
                                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Nenhum registro encontrado.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 bg-gray-50 p-4 flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                        Mostrando <span className="font-medium text-gray-800">{filteredDetails.length}</span> resultados
                    </span>
                </div>
            </div>
        );
    }

    // ── Fullscreen: Consolidado ───────────────────────────────────────
    if (fullscreenPanel === "consolidado") {
        return (
            <div className="flex flex-col md:flex-row h-[calc(100vh-5rem)] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* Sidebar with Chart */}
                <div className="w-full md:w-80 lg:w-96 bg-white border-b md:border-b-0 md:border-r border-gray-200 p-6 flex flex-col gap-6 overflow-y-auto flex-shrink-0 min-h-[50%] md:min-h-0">
                    <div>
                        <h3 className="font-semibold text-gray-800 mb-1">Status Geral dos Itens</h3>
                        <p className="text-xs text-gray-500 mb-6">Distribuição total do inventário</p>
                        <DonutChart data={summaryStats} />

                        {/* Total pieces card */}
                        <div className="bg-gradient-to-br from-white to-green-50 rounded-xl p-5 border border-green-100 shadow-sm relative overflow-hidden group">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-1">
                                    <BarChart3 className="w-4 h-4 text-[#50d298]" />
                                    <h4 className="text-sm font-semibold text-gray-700">Total de Peças</h4>
                                </div>
                                <div className="text-4xl font-bold text-gray-800 mt-2">
                                    {summaryStats.totalPecas.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                                </div>
                                <p className="text-xs text-gray-500 mt-2 font-medium">Soma parcial e total (inclui contagens em andamento)</p>
                            </div>
                        </div>

                        {/* CC Progress card */}
                        <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl p-5 border border-blue-100 shadow-sm">
                            <div className="flex items-center gap-2 mb-1">
                                <Info className="w-4 h-4 text-blue-500" />
                                <h4 className="text-sm font-semibold text-gray-700">Progresso por Setor</h4>
                            </div>
                            <div className="text-2xl font-bold text-gray-800 mt-2">
                                {summaryStats.liberadoCCs} / {summaryStats.totalCCs}
                            </div>
                            <p className="text-xs text-gray-500 mt-1 font-medium">Centros de custo liberados</p>
                            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                                <div className="bg-[#50d298] h-2 rounded-full transition-all" style={{ width: `${summaryStats.totalCCs > 0 ? (summaryStats.liberadoCCs / summaryStats.totalCCs) * 100 : 0}%` }} />
                            </div>
                        </div>

                        {/* Status breakdown */}
                        <div className="space-y-4 mt-6">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                                <div className="flex items-center gap-3">
                                    <span className="w-3 h-3 rounded-full bg-red-500" />
                                    <span className="text-sm font-medium text-gray-800">Não Liberado</span>
                                </div>
                                <span className="text-sm font-bold text-red-500">
                                    {summaryStats.total > 0 ? Math.round((summaryStats.naoLiberado / summaryStats.total) * 100) : 0}%
                                </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-100">
                                <div className="flex items-center gap-3">
                                    <span className="w-3 h-3 rounded-full bg-[#50d298]" />
                                    <span className="text-sm font-medium text-gray-800">Liberado</span>
                                </div>
                                <span className="text-sm font-bold text-[#50d298]">
                                    {summaryStats.total > 0 ? Math.round((summaryStats.liberado / summaryStats.total) * 100) : 0}%
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Info box */}
                    <div className="mt-auto pt-6 border-t border-gray-200">
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="flex items-start gap-3">
                                <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="text-sm font-semibold text-blue-600 mb-1">Resumo</h4>
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        {summaryStats.naoLiberado > summaryStats.liberado
                                            ? "A maioria dos itens ainda requer validação. Foque nos itens \"Não Liberados\" para agilizar o fechamento."
                                            : "Boa parte dos itens já foi validada. Continue o trabalho de liberação."}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Table */}
                <div className="flex-1 flex flex-col min-w-0 bg-white md:border-l border-gray-200">
                    {/* Table Header */}
                    <div className="px-4 md:px-8 py-4 md:py-5 border-b border-gray-200 bg-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm z-20">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
                                <Table2 className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                                    Consolidado Geral
                                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">Visão Expandida</span>
                                </h2>
                                <p className="text-gray-500 text-sm">Análise detalhada por item e status</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm bg-[#50d298] text-white hover:bg-[#50d298]/90 transition-colors">
                                <FileText className="w-4 h-4" /> Exportar PDF
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm border border-[#50d298] text-[#50d298] bg-white hover:bg-green-50 transition-colors">
                                <Table2 className="w-4 h-4" /> Exportar Excel
                            </button>
                            <div className="h-6 w-px bg-gray-200 mx-1" />
                            <button onClick={() => setFullscreenPanel(null)}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg shadow-sm border border-red-500 text-red-500 bg-white hover:bg-red-50 transition-colors">
                                <Minimize2 className="w-4 h-4" /> Fechar Tela Cheia
                            </button>
                        </div>
                    </div>

                    {/* Filters bar */}
                    <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row flex-wrap items-center gap-4 bg-gray-50/30 overflow-x-auto">
                        <div className="relative w-full sm:w-64 flex-shrink-0">
                            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por item..."
                                className="pl-10 pr-4 py-2 w-full bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#50d298] focus:border-[#50d298] text-gray-700 shadow-sm transition-all outline-none" />
                        </div>
                        <ProjectRangeCalendar date={date} setDate={setDate} />
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                            className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-3 pr-8 rounded-lg text-sm shadow-sm outline-none cursor-pointer hover:border-[#50d298] transition-colors">
                            <option value="">Status: Todos</option>
                            <option value="liberado">Liberado</option>
                            <option value="nao_liberado">Não Liberado</option>
                        </select>
                        <select value={ccFilter} onChange={(e) => setCcFilter(e.target.value)}
                            className="appearance-none bg-white border border-gray-300 text-gray-700 py-2 pl-3 pr-8 rounded-lg text-sm shadow-sm outline-none cursor-pointer hover:border-[#50d298] transition-colors">
                            <option value="">Centro de Custo: Todos</option>
                            {uniqueCCs.map((cc) => (
                                <option key={cc} value={cc}>{cc} - {ccNames[cc] || cc}</option>
                            ))}
                        </select>
                        <button onClick={fetchReport} className="p-2 text-gray-500 hover:text-[#50d298] hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100" title="Resetar Filtros">
                            <RefreshCcw className={`w-5 h-5 ${isPending ? "animate-spin" : ""}`} />
                        </button>
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto p-0">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200 w-[65%]">Item / Descrição</th>
                                    <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200 text-right w-[15%]">Qtd. Total</th>
                                    <th className="py-4 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200 text-right w-[20%]">Status Geral</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-sm bg-white">
                                {filteredItems.map((item) => {
                                    const abbr = item.desc_item.substring(0, 2).toUpperCase();
                                    return (
                                        <tr key={item.it_codigo} className="hover:bg-gray-50 transition-colors group">
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 font-bold text-xs">
                                                        {abbr}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-blue-500 text-base">{item.it_codigo}</div>
                                                        <div className="text-sm text-gray-500 mt-0.5">{item.desc_item}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 font-mono font-bold text-right text-base">{item.total_qtd.toFixed(2)}</td>
                                            <td className="py-4 px-6 text-right">
                                                <StatusBadge status={item.status_geral === "liberado" ? "liberado" : "nao_liberado"} />
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredItems.length === 0 && !isPending && (
                                    <tr><td colSpan={3} className="text-center py-12 text-gray-400">-</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    // ── Default View: Dual Panel ──────────────────────────────────────
    return (
        <div className="flex flex-col gap-0 h-full">
            {/* Header */}
            <div className="bg-white py-3 px-4 md:py-6 md:px-8 border-b border-gray-200 flex flex-col gap-3 md:gap-4 shadow-sm rounded-t-xl z-20">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-lg md:text-2xl font-bold text-gray-800 leading-tight">Acompanhamento</h1>
                        <p className="hidden sm:block text-gray-500 text-sm mt-1">Visão geral e liberação de inventário.</p>
                    </div>
                    <div className="flex items-center gap-2 md:gap-3">
                        <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-[#50d298] text-white text-xs md:text-sm font-medium rounded-lg hover:bg-[#50d298]/90 transition-colors shadow-sm">
                            <FileText className="w-4 h-4" /> PDF
                        </button>
                        <button className="hidden sm:flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 border border-[#50d298] text-[#50d298] text-xs md:text-sm font-medium rounded-lg hover:bg-green-50 transition-colors shadow-sm">
                            <Table2 className="w-4 h-4" /> Excel
                        </button>
                    </div>
                </div>

                {/* Filter bar */}
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between mt-0 md:mt-2 pt-2 border-t border-gray-200">
                    <div className="flex flex-col sm:flex-row md:flex-wrap gap-2 md:gap-3 w-full lg:w-auto flex-1">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar item, código..."
                                className="pl-9 pr-4 py-2 w-full bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#50d298] focus:border-[#50d298] text-gray-700 shadow-sm transition-all outline-none" />
                        </div>
                        <div className="flex flex-wrap gap-3 items-center">
                            <div className="w-full sm:w-auto">
                                <ProjectRangeCalendar date={date} setDate={setDate} />
                            </div>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                                className="pl-3 pr-8 py-1.5 md:py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#50d298] focus:border-[#50d298] text-gray-700 shadow-sm transition-all outline-none appearance-none cursor-pointer hover:border-[#50d298] w-full sm:w-auto">
                                <option value="">Status: Todos</option>
                                <option value="liberado">Liberado</option>
                                <option value="nao_liberado">Não Liberado</option>
                                <option value="pendente">Pendente</option>
                            </select>
                            <select value={ccFilter} onChange={(e) => setCcFilter(e.target.value)}
                                className="pl-3 pr-8 py-1.5 md:py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-[#50d298] focus:border-[#50d298] text-gray-700 shadow-sm transition-all outline-none appearance-none cursor-pointer hover:border-[#50d298] w-full sm:w-auto">
                                <option value="">Centro de Custo: Todos</option>
                                {uniqueCCs.map((cc) => (
                                    <option key={cc} value={cc}>{cc} - {ccNames[cc] || cc}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end lg:self-auto">
                        <button onClick={() => { setSearchTerm(""); setStatusFilter(""); setCcFilter(""); }}
                            className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-[#50d298] hover:bg-green-50 rounded-lg transition-colors">
                            <Filter className="w-4 h-4" /> Limpar
                        </button>
                        <button onClick={fetchReport}
                            className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors" title="Atualizar">
                            <RefreshCcw className={`w-5 h-5 ${isPending ? "animate-spin" : ""}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content - Dual Panel */}
            <div className="flex-1 overflow-auto p-4 md:p-6 bg-gray-100">
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-10">

                    {/* Left Panel: Detalhamento */}
                    <div className="xl:col-span-7 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-fit max-h-[70vh] min-h-[400px] transition-all duration-300">
                        <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center sticky top-0">
                            <h2 className="font-semibold text-base md:text-lg text-gray-800 flex items-center gap-2">
                                <span className="w-1 h-5 bg-[#50d298] rounded-full" />
                                Detalhamento
                                <span className="text-gray-500 text-xs md:text-sm font-normal hidden sm:inline">(Por Centro de Custo)</span>
                            </h2>
                            <button onClick={() => setFullscreenPanel("detalhamento")}
                                className="p-1.5 rounded-lg text-[#50d298] hover:bg-green-50 transition-colors" title="Expandir Tela Cheia">
                                <Maximize2 className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-x-hidden md:overflow-auto flex-1 bg-white">
                            <table className="w-full text-left border-collapse min-w-full md:min-w-[700px]">
                                <thead className="bg-gray-50 sticky top-0 z-10 hidden md:table-header-group">
                                    <tr>
                                        <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200">Item</th>
                                        <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200">Centro de Custo</th>
                                        <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200 text-right">Qtd. Física</th>
                                        <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 md:divide-gray-200 text-sm">
                                    {filteredDetails.map(({ item, detail }) => (
                                        <tr key={detail.id} className="hover:bg-gray-50 transition-colors group flex flex-col md:table-row p-4 md:p-0 border-b border-gray-200 md:border-none">
                                            <td className="py-1 md:py-4 px-0 md:px-6 block md:table-cell">
                                                <div className="font-medium text-gray-800 text-base md:text-sm">{item.it_codigo}</div>
                                                <div className="text-sm md:text-xs text-gray-500 mt-0.5">{item.desc_item}</div>
                                            </td>
                                            <td className="py-1 md:py-4 px-0 md:px-6 block md:table-cell text-gray-500 text-sm mt-2 md:mt-0">
                                                <span className="md:hidden font-semibold text-gray-700 mr-2 text-xs uppercase tracking-wider">CC:</span>
                                                {detail.centro_custo}{ccNames[detail.centro_custo] ? ` - ${ccNames[detail.centro_custo]}` : ""}
                                            </td>
                                            <td className="py-2 md:py-4 px-0 md:px-6 flex justify-between items-center md:table-cell font-mono text-gray-800 md:text-right border-t border-dashed border-gray-200 md:border-none mt-3 md:mt-0 pt-3 md:pt-4">
                                                <span className="md:hidden font-semibold text-gray-700 text-xs uppercase tracking-wider">Qtd. Física:</span>
                                                <HoverCard>
                                                    <HoverCardTrigger asChild>
                                                        <span className="cursor-help decoration-dashed underline underline-offset-4 decoration-slate-300">
                                                            {detail.qtd_fisica.toFixed(2)}
                                                        </span>
                                                    </HoverCardTrigger>
                                                    <HoverCardContent className="w-72 bg-white p-4 shadow-xl border rounded-lg z-50">
                                                        <div className="space-y-2">
                                                            <h4 className="text-sm font-semibold text-slate-700">Histórico de Contagens</h4>
                                                            <div className="flex flex-col gap-1">
                                                                {(detail.counts_history || []).map((val: number, idx: number) => (
                                                                    <div key={idx} className="flex justify-between items-center text-sm p-2 rounded">
                                                                        <span className="text-slate-500">{idx + 1}ª Contagem:</span>
                                                                        <span className="font-mono font-medium">{val.toFixed(2)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </HoverCardContent>
                                                </HoverCard>
                                            </td>
                                            <td className="py-2 md:py-4 px-0 md:px-6 flex justify-between items-center md:table-cell">
                                                <span className="md:hidden font-semibold text-gray-700 text-xs uppercase tracking-wider">Ações:</span>
                                                {detail.cc_status === "liberado" ? (
                                                    <div className="flex items-center justify-center">
                                                        <div className="flex items-center gap-1 border border-green-500 text-green-600 px-3 py-1 rounded-md bg-white text-sm font-bold">
                                                            <CheckCircle className="w-4 h-4" strokeWidth={2.5} /> Aprovado
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => {
                                                            toast.promise(approveInventoryItem(detail.id, "approve"), {
                                                                loading: "Aprovando...",
                                                                success: () => { fetchReport(); return "Aprovado!"; },
                                                                error: "Erro ao aprovar",
                                                            });
                                                        }}
                                                            className="w-8 h-8 rounded-full border border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors">
                                                            <Check className="w-4 h-4" strokeWidth={2.5} />
                                                        </button>
                                                        <button onClick={() => {
                                                            toast.promise(approveInventoryItem(detail.id, "reject"), {
                                                                loading: "Reprovando...",
                                                                success: () => { fetchReport(); return "Reprovado."; },
                                                                error: "Erro ao reprovar",
                                                            });
                                                        }}
                                                            className="w-8 h-8 rounded-full border border-red-500 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors">
                                                            <X className="w-4 h-4" strokeWidth={2.5} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredDetails.length === 0 && !isPending && (
                                        <tr><td colSpan={4} className="text-center py-8 text-gray-400">Nenhum registro encontrado para a data.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Panel: Consolidado */}
                    <div className="xl:col-span-5 flex flex-col bg-white rounded-xl shadow-sm border border-l-4 border-l-blue-500 border-y border-r border-gray-200 overflow-hidden h-fit max-h-[70vh] min-h-[400px] transition-all duration-300">
                        <div className="px-4 md:px-6 py-4 border-b border-gray-200 bg-blue-50/30 flex justify-between items-center sticky top-0">
                            <h2 className="font-semibold text-base md:text-lg text-gray-800 flex items-center gap-2">
                                Consolidado
                                <span className="text-gray-500 text-xs md:text-sm font-normal hidden sm:inline">(Por Item)</span>
                            </h2>
                            <button onClick={() => setFullscreenPanel("consolidado")}
                                className="p-1.5 rounded-lg text-[#50d298] hover:bg-green-50 transition-colors" title="Expandir Tela Cheia">
                                <Maximize2 className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="overflow-x-hidden md:overflow-auto flex-1 bg-white">
                            <table className="w-full text-left border-collapse min-w-full md:min-w-[500px]">
                                <thead className="bg-gray-50 sticky top-0 z-10 hidden md:table-header-group">
                                    <tr>
                                        <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200">Item</th>
                                        <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200 text-right">Qtd. Total</th>
                                        <th className="py-3 px-6 text-xs font-semibold uppercase tracking-wider text-gray-500 border-b border-gray-200 text-right">Status Geral</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 md:divide-gray-200 text-sm">
                                    {filteredItems.map((item) => (
                                        <tr key={item.it_codigo} className="hover:bg-gray-50 transition-colors flex flex-col md:table-row p-4 md:p-0 border-b border-gray-200 md:border-none">
                                            <td className="py-1 md:py-3 px-0 md:px-6 block md:table-cell">
                                                <div className="font-semibold text-blue-500 text-base md:text-sm">{item.it_codigo}</div>
                                                <div className="text-sm md:text-xs text-gray-500 mt-0.5 md:truncate md:max-w-[150px]">{item.desc_item}</div>
                                            </td>
                                            <td className="py-2 md:py-3 px-0 md:px-6 font-mono font-bold flex justify-between items-center md:table-cell md:text-right border-t border-dashed border-gray-200 md:border-none mt-3 md:mt-0 pt-3 md:pt-3">
                                                <span className="md:hidden font-semibold text-gray-700 text-xs uppercase tracking-wider">Total:</span>
                                                {item.total_qtd.toFixed(2)}
                                            </td>
                                            <td className="py-2 md:py-3 px-0 md:px-6 flex justify-between items-center md:table-cell md:text-right">
                                                <span className="md:hidden font-semibold text-gray-700 text-xs uppercase tracking-wider">Status:</span>
                                                <StatusBadge status={item.status_geral === "liberado" ? "liberado" : "nao_liberado"} />
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredItems.length === 0 && !isPending && (
                                        <tr><td colSpan={3} className="text-center py-8 text-gray-400">-</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
