"use client";

import { useState, useMemo, useEffect } from 'react';
import { Truck, CheckSquare, Clock, Calendar, Package, FileText, PackagePlus, Box, Layers, AlignLeft, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, XAxis, ResponsiveContainer, Tooltip, CartesianGrid, LabelList } from 'recharts';
import { createBrowserClient } from '@supabase/ssr';

// --- Interfaces ---
// --- Interfaces ---
interface CardsPedidos {
    conferir: number;
    pendente: number;
    frete_faf: number;
    programado: number;
    expedicao: number;
    emitir_nf: number;
    chegou_hoje: number;
    total: number;
}

interface ResumoItem {
    it_codigo: string;
    desc_item: string;
    curva: string;
    qtd_pecas: number;
    qtd_pedidos: number;
}

interface HistoricoPedido {
    data: string;
    qtd_ped: number;
}

interface PerformanceEntrega {
    label: string;
    qtd: number;
    pct: string;
    acu: string;
    pctNum: number;
}

// Reusing interface for clarity, could be shared
interface PedidosChartData {
    date: string;
    val: number;
}

interface BalanceamentoAcabado {
    carteira_pedidos: number;
    estoque_total: number;
    estoque_disponivel: number;
}

interface BalanceamentoCurva {
    curva: string;
    d0_15: number;
    d15_30: number;
    d15_60: number;
    d60_120: number;
    acima_120: number;
    total: number;
}

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;

export default function Home() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { db: { schema: 'dashboards_pcp' } }
    );

    // --- State ---
    const [cardsData, setCardsData] = useState<CardsPedidos | null>(null);
    const [resumoData, setResumoData] = useState<ResumoItem[]>([]);
    const [historicoData, setHistoricoData] = useState<HistoricoPedido[]>([]);
    const [performanceData, setPerformanceData] = useState<PerformanceEntrega[]>([]);
    const [pedidosRecebidos, setPedidosRecebidos] = useState<PedidosChartData[]>([]);
    const [pedidosLiberados, setPedidosLiberados] = useState<PedidosChartData[]>([]);
    const [balancoAcabado, setBalancoAcabado] = useState<BalanceamentoAcabado | null>(null);
    const [balancoCurva, setBalancoCurva] = useState<BalanceamentoCurva[]>([]);
    const [syncTime, setSyncTime] = useState<string>("-");
    const [syncDate, setSyncDate] = useState<string>("-");

    const [sortResumo, setSortResumo] = useState<SortConfig>({ key: 'qtd_pedidos', direction: 'desc' });
    const [sortHistorico, setSortHistorico] = useState<SortConfig>(null);
    const [sortPerformance, setSortPerformance] = useState<SortConfig>(null);

    // --- Fetch Data ---
    useEffect(() => {
        const fetchData = async () => {
            // 1. Cards Pedidos
            const { data: cards, error: cardsError } = await supabase.schema('dashboards_pcp').from('cards_pedidos').select('*').order('id', { ascending: false }).limit(1).single();
            if (cardsError) {
                console.error("Error fetching cards:", JSON.stringify(cardsError, null, 2));
            }
            if (cards) setCardsData(cards);

            // 2. Resumo por Item
            const { data: resumo } = await supabase.schema('dashboards_pcp').from('resumo_por_item').select('*');
            if (resumo) setResumoData(resumo);

            // 3. Historico Pedidos
            const { data: hist } = await supabase.schema('dashboards_pcp').from('historico_pedidos').select('*').order('data', { ascending: true });
            if (hist) {
                setHistoricoData(hist.map((h: any) => ({
                    data: h.data ? h.data.split('-').reverse().join('-') : h.data,
                    qtd_ped: h.qtd_ped
                })));
            }

            // 4. Performance Entrega
            const { data: perf } = await supabase.schema('dashboards_pcp').from('performance_entrega').select('*').order('id', { ascending: false }).limit(1).single();
            if (perf) {
                const p0 = Number(perf.perc_0 || 0);
                const p1 = Number(perf.perc_1 || 0);
                const p2 = Number(perf.perc_2 || 0);
                const p3 = Number(perf.perc_3 || 0);
                const p4 = Number(perf.perc_4 || 0);
                const p5 = Number(perf.perc_5 || 0);
                const pAcima = Number(perf.perc_acima_5 || 0);

                const mappedPerf = [
                    { label: "Mesmo dia", qtd: perf.dias_0, pct: `${p0.toFixed(0)}%`, acu: `${p0.toFixed(0)}%`, pctNum: p0 },
                    { label: "1 dia", qtd: perf.dias_1, pct: `${p1.toFixed(0)}%`, acu: `${(p0 + p1).toFixed(0)}%`, pctNum: p1 },
                    { label: "2 dias", qtd: perf.dias_2, pct: `${p2.toFixed(0)}%`, acu: `${(p0 + p1 + p2).toFixed(0)}%`, pctNum: p2 },
                    { label: "3 dias", qtd: perf.dias_3, pct: `${p3.toFixed(0)}%`, acu: `${(p0 + p1 + p2 + p3).toFixed(0)}%`, pctNum: p3 },
                    { label: "4 dias", qtd: perf.dias_4, pct: `${p4.toFixed(0)}%`, acu: `${(p0 + p1 + p2 + p3 + p4).toFixed(0)}%`, pctNum: p4 },
                    { label: "5 dias", qtd: perf.dias_5, pct: `${p5.toFixed(0)}%`, acu: `${(p0 + p1 + p2 + p3 + p4 + p5).toFixed(0)}%`, pctNum: p5 },
                    { label: "> 5 dias", qtd: perf.acima_5, pct: `${pAcima.toFixed(0)}%`, acu: "100%", pctNum: pAcima },
                ];
                setPerformanceData(mappedPerf);
            }

            // 5. Pedidos Liberados (Chart) - REPLACES ESTOQUE ESTRATEGICO
            // Uses historico_embarques table, same chart style as Pedidos Recebidos
            const { data: pedLib } = await supabase.schema('dashboards_pcp').from('historico_embarques').select('*').order('data', { ascending: false }).limit(10);
            if (pedLib) {
                const sorted = pedLib.filter((p: any) => p.data).reverse().map((p: any) => {
                    const dateStr = String(p.data);
                    const cleanDate = dateStr.split('T')[0];
                    const [year, month, day] = cleanDate.split('-');
                    return {
                        date: `${day}/${month}`,
                        val: p.qtd_ped
                    };
                });
                setPedidosLiberados(sorted);
            }

            // 6. Pedidos Recebidos (Chart)
            const { data: pedRec } = await supabase.schema('dashboards_pcp').from('pedidos_recebidos').select('*').order('data', { ascending: false }).limit(10);
            if (pedRec) {
                const sorted = pedRec.filter((p: any) => p.data).reverse().map((p: any) => {
                    const dateStr = String(p.data);
                    const cleanDate = dateStr.split('T')[0];
                    const [year, month, day] = cleanDate.split('-');
                    return {
                        date: `${day}/${month}`,
                        val: p.qtd_ped
                    };
                });
                setPedidosRecebidos(sorted);
            }

            // 7. Balanceamento Acabado
            const { data: balAcab } = await supabase.schema('dashboards_pcp').from('balanceamento_estoque_acabado').select('*').order('id', { ascending: false }).limit(1).single();
            if (balAcab) setBalancoAcabado(balAcab);

            // 8. Balanceamento Curva
            const { data: balCurva } = await supabase.schema('dashboards_pcp').from('balanceamento_curva').select('*').order('curva');
            if (balCurva) setBalancoCurva(balCurva);

            // 9. Sync Time
            if (cards && cards.created_at) {
                const dateObj = new Date(cards.created_at);
                setSyncDate(dateObj.toLocaleDateString('pt-BR'));
                setSyncTime(dateObj.toLocaleTimeString('pt-BR'));
            }
        };

        fetchData().catch(console.error);

        const intervalId = setInterval(() => {
            fetchData();
        }, 60000);

        return () => {
            clearInterval(intervalId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    // --- Sorting Logic ---
    const handleSort = (key: string, currentSort: SortConfig, setSort: any) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (currentSort && currentSort.key === key && currentSort.direction === 'asc') {
            direction = 'desc';
        }
        setSort({ key, direction });
    };

    const sortData = (data: any[], sort: SortConfig) => {
        if (!sort) return data;
        return [...data].sort((a, b) => {
            let valA = a[sort.key];
            let valB = b[sort.key];
            // Simple numeric/string sort
            if (typeof valA === 'string' && valA.includes('%')) valA = parseFloat(valA.replace('%', ''));
            if (typeof valB === 'string' && valB.includes('%')) valB = parseFloat(valB.replace('%', ''));
            if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const sortedResumo = useMemo(() => sortData(resumoData, sortResumo), [resumoData, sortResumo]);
    const sortedHistorico = useMemo(() => sortData(historicoData, sortHistorico), [historicoData, sortHistorico]);
    const sortedPerformance = useMemo(() => sortData(performanceData, sortPerformance), [performanceData, sortPerformance]);

    const SortIcon = ({ active, direction }: { active: boolean, direction?: 'asc' | 'desc' }) => {
        if (!active) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
        return direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-blue-500" /> : <ArrowDown className="w-3 h-3 ml-1 text-blue-500" />;
    };

    // --- Format Helpers ---
    const fmtNum = (n: number | undefined) => n ? n.toLocaleString('pt-BR') : '0';

    return (
        <div className="flex flex-col h-full lg:overflow-hidden overflow-y-auto gap-1 p-0 font-sans bg-background lg:pb-1">
            {/* TOP SECTION (65%) */}
            <div className="h-auto lg:h-[65%] flex flex-col lg:flex-row gap-1 min-h-0 shrink-0">
                {/* KPI Cards */}
                <div className="w-full lg:w-[280px] xl:w-[320px] 2xl:w-[360px] flex flex-col gap-1 shrink-0 h-auto lg:h-full">
                    <div className="bg-[#2563eb] text-white p-1 rounded-lg text-center font-bold text-lg lg:text-xl uppercase tracking-wider border-b-4 border-[#2563eb] shadow-lg flex items-center justify-center gap-2 shrink-0">
                        <Truck className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                        <span className="drop-shadow-md">Pedidos M. Interno</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-1 flex-1 min-h-0">
                        {[
                            { label: 'Conferir', val: cardsData?.conferir, icon: CheckSquare, color: 'bg-[#2563eb] text-white', border: 'border-[#2563eb]' },
                            { label: 'Pendente', val: cardsData?.pendente, icon: Clock, color: 'bg-[#dc2626] text-white', border: 'border-[#b91c1c]', animate: true },
                            { label: 'Frete/FAF', val: cardsData?.frete_faf, icon: Truck, color: 'bg-[#2563eb] text-white', border: 'border-[#2563eb]' },
                            { label: 'Programado', val: cardsData?.programado, icon: Calendar, color: 'bg-[#2563eb] text-white', border: 'border-[#2563eb]' },
                            { label: 'Expedição', val: cardsData?.expedicao, icon: Package, color: 'bg-[#2563eb] text-white', border: 'border-[#2563eb]' },
                            { label: 'Emitir NF', val: cardsData?.emitir_nf, icon: FileText, color: 'bg-[#2563eb] text-white', border: 'border-[#2563eb]' },
                            { label: 'Chegou Hoje', val: cardsData?.chegou_hoje, icon: PackagePlus, color: 'bg-yellow-400 text-[#374151]', border: 'border-yellow-500' },
                            { label: 'Total', val: cardsData?.total, icon: Box, color: 'bg-[#2563eb] text-white', border: 'border-[#2563eb]' },
                        ].map((card, idx) => (
                            <div key={idx} className={`glass-card ${card.color} border ${card.border} p-0.5 flex flex-col items-center justify-center text-center gap-0 hover:scale-[1.02] transition-transform duration-300 shadow-xl backdrop-blur-md ${card.animate ? 'animate-soft-pulse' : ''}`}>
                                <div className="flex items-center gap-1 mb-0">
                                    <card.icon className="w-4 h-4 lg:w-5 lg:h-5 opacity-80" />
                                    <span className="text-2xl lg:text-4xl xl:text-5xl font-bold tracking-tighter drop-shadow-lg">{fmtNum(card.val)}</span>
                                </div>
                                <span className="font-semibold uppercase tracking-widest text-[10px] lg:text-xs xl:text-sm opacity-90">{card.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Tables/Charts */}
                <div className="flex-1 flex flex-col gap-1 h-auto lg:h-full overflow-hidden">
                    <div className="h-auto lg:h-[58%] flex flex-col lg:grid lg:grid-cols-3 gap-1 min-h-0">
                        {/* Table Resumo */}
                        <div className="flex flex-col bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border h-[300px] lg:h-full overflow-hidden">
                            <div className="bg-[#2563eb] text-white py-0.5 px-2 text-center font-bold text-xs lg:text-sm uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                                <Package className="w-4 h-4 text-white" /> Resumo por Item
                            </div>
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-xs lg:text-base xl:text-lg text-[#374151] leading-tight font-sans">
                                    <thead className="bg-[#2563eb] text-white sticky top-0 shadow-md z-10 text-xs lg:text-base cursor-pointer">
                                        <tr>
                                            <th className="p-0.5 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('it_codigo', sortResumo, setSortResumo)}>Itens <SortIcon active={sortResumo?.key === 'it_codigo'} direction={sortResumo?.direction} /></th>
                                            <th className="p-0.5 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('qtd_pecas', sortResumo, setSortResumo)}>Qtd <SortIcon active={sortResumo?.key === 'qtd_pecas'} direction={sortResumo?.direction} /></th>
                                            <th className="p-0.5 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('qtd_pedidos', sortResumo, setSortResumo)}>Ped <SortIcon active={sortResumo?.key === 'qtd_pedidos'} direction={sortResumo?.direction} /></th>
                                            <th className="p-0.5 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('curva', sortResumo, setSortResumo)}>ABC <SortIcon active={sortResumo?.key === 'curva'} direction={sortResumo?.direction} /></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {sortedResumo.map((row, i) => (
                                            <tr key={i} className={`hover:bg-primary/5 transition-colors ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                                                <td className="px-0.5 py-0 lg:py-0.5 text-center font-bold text-[#374151] text-sm lg:text-lg">{row.it_codigo}</td>
                                                <td className="px-0.5 py-0 lg:py-0.5 text-center font-sans font-bold text-[#374151] text-sm lg:text-lg">{fmtNum(row.qtd_pecas)}</td>
                                                <td className="px-0.5 py-0 lg:py-0.5 text-center font-sans font-bold text-[#374151] text-sm lg:text-lg">{fmtNum(row.qtd_pedidos)}</td>
                                                <td className="px-0.5 py-0 lg:py-0.5 text-center font-bold text-[#374151] bg-muted/50 mx-1 rounded text-sm lg:text-lg">{row.curva}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Table Historico */}
                        <div className="flex flex-col bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border h-[300px] lg:h-full overflow-hidden">
                            <div className="bg-[#2563eb] text-white py-0.5 px-2 text-center font-bold text-xs lg:text-sm uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                                <Clock className="w-4 h-4 text-white" /> Histórico de Pedidos
                            </div>
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-xs lg:text-base xl:text-lg text-[#374151] leading-tight font-sans">
                                    <thead className="bg-[#2563eb] text-white sticky top-0 shadow-md z-10 text-xs lg:text-base cursor-pointer">
                                        <tr>
                                            <th className="p-0.5 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('data', sortHistorico, setSortHistorico)}>Data <SortIcon active={sortHistorico?.key === 'data'} direction={sortHistorico?.direction} /></th>
                                            <th className="p-0.5 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('qtd_ped', sortHistorico, setSortHistorico)}>Qtd <SortIcon active={sortHistorico?.key === 'qtd_ped'} direction={sortHistorico?.direction} /></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {sortedHistorico.map((row, i) => (
                                            <tr key={i} className={`hover:bg-primary/5 transition-colors ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                                                <td className="px-0.5 py-0 lg:py-0.5 text-center font-bold text-[#374151] text-sm lg:text-lg">{row.data}</td>
                                                <td className="px-0.5 py-0 lg:py-0.5 text-center font-bold text-[#374151] text-sm lg:text-lg">{row.qtd_ped}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Table Performance */}
                        <div className="flex flex-col bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border h-[300px] lg:h-full overflow-hidden">
                            <div className="bg-[#2563eb] text-white py-0.5 px-2 text-center font-bold text-xs lg:text-sm uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                                <Clock className="w-4 h-4 text-white" /> Performance de Entrega
                            </div>
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-xs lg:text-base xl:text-lg text-[#374151] leading-tight font-sans">
                                    <thead className="bg-[#2563eb] text-white sticky top-0 shadow-md z-10 text-xs lg:text-base cursor-pointer">
                                        <tr>
                                            <th className="p-0.5 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('label', sortPerformance, setSortPerformance)}>Data <SortIcon active={sortPerformance?.key === 'label'} direction={sortPerformance?.direction} /></th>
                                            <th className="p-0.5 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('qtd', sortPerformance, setSortPerformance)}>Qtd <SortIcon active={sortPerformance?.key === 'qtd'} direction={sortPerformance?.direction} /></th>
                                            <th className="p-0.5 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('pctNum', sortPerformance, setSortPerformance)}>% <SortIcon active={sortPerformance?.key === 'pctNum'} direction={sortPerformance?.direction} /></th>
                                            <th className="p-0.5 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('acu', sortPerformance, setSortPerformance)}>Acu. <SortIcon active={sortPerformance?.key === 'acu'} direction={sortPerformance?.direction} /></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {sortedPerformance.map((row, i) => (
                                            <tr key={i} className={`hover:bg-primary/5 transition-colors ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                                                <td className="px-0.5 py-0 lg:py-0.5 text-center font-bold text-[#374151] text-sm lg:text-lg">{row.label}</td>
                                                <td className="px-0.5 py-0 lg:py-0.5 text-center text-[#374151] font-bold text-sm lg:text-lg">{fmtNum(row.qtd)}</td>
                                                <td className="px-0.5 py-0 lg:py-0.5 text-center text-[#374151] font-bold text-sm lg:text-lg">{row.pct}</td>
                                                <td className="px-0.5 py-0 lg:py-0.5 text-center font-bold text-[#374151] text-sm lg:text-lg">{row.acu}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Middle Row Charts - Fill remaining space */}
                    <div className="h-auto lg:flex-1 grid grid-cols-1 lg:grid-cols-2 gap-1 min-h-0">
                        {/* Qtd Pedidos Liberados Chart - NEW */}
                        <div className="bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border flex flex-col h-[250px] lg:h-full overflow-hidden">
                            <div className="bg-[#2563eb] text-white py-0.5 px-2 text-center font-bold text-xs lg:text-sm uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                                <Truck className="w-4 h-4 text-white" /> Qtd Pedidos Liberados
                            </div>
                            <div className="flex-1 p-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={pedidosLiberados} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} dy={5} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', borderRadius: '8px', border: '1px solid hsl(var(--border))', backdropFilter: 'blur(4px)' }}
                                            itemStyle={{ color: 'hsl(var(--foreground))', fontSize: 12 }}
                                            cursor={{ fill: '#f1f5f9' }}
                                        />
                                        <Bar dataKey="val" fill="#86EFAC" radius={[4, 4, 0, 0]}>
                                            <LabelList
                                                dataKey="val"
                                                position="top"
                                                content={({ x, y, width, value }: any) => (
                                                    <text x={x + width / 2} y={y} dy={-5} fill="#374151" textAnchor="middle" className="text-sm lg:text-xl font-bold">
                                                        {value}
                                                    </text>
                                                )}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Qtd Pedidos Recebidos Chart */}
                        <div className="bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border flex flex-col h-[250px] lg:h-full overflow-hidden">
                            <div className="bg-[#2563eb] text-white py-0.5 px-2 text-center font-bold text-xs lg:text-sm uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                                <Package className="w-4 h-4 text-white" /> Qtd Pedidos Recebidos
                            </div>
                            <div className="flex-1 p-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={pedidosRecebidos} margin={{ top: 20, right: 30, left: 30, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} dy={5} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', borderRadius: '8px', border: '1px solid hsl(var(--border))', backdropFilter: 'blur(4px)' }}
                                            itemStyle={{ color: 'hsl(var(--foreground))', fontSize: 12 }}
                                            cursor={{ stroke: '#2563eb', strokeWidth: 2 }}
                                        />
                                        <Area type="monotone" dataKey="val" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)">
                                            <LabelList
                                                dataKey="val"
                                                position="top"
                                                content={({ x, y, value }: any) => (
                                                    <text x={x} y={y} dy={-5} fill="#374151" textAnchor="middle" className="text-sm lg:text-2xl font-bold">
                                                        {value}
                                                    </text>
                                                )}
                                            />
                                        </Area>
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* BOTTOM SECTION: Balanceamento (Remaining Space) */}
            <div className="h-auto lg:flex-1 grid grid-cols-1 lg:grid-cols-2 gap-1 min-h-0">
                {/* Balanceamento de Estoque Acabado */}
                <div className="bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border flex flex-col h-[250px] lg:h-full overflow-hidden">
                    <div className="bg-[#2563eb] text-white py-0.5 px-2 text-center font-bold text-xs lg:text-sm uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                        <Layers className="w-4 h-4 text-white" /> Balanceamento de Estoque Acabado
                    </div>
                    <div className="flex-1 p-1 lg:p-2 flex flex-col justify-center gap-1">
                        {[
                            { label: 'Carteira Ped.', val: balancoAcabado?.carteira_pedidos, w: '25%', color: 'bg-[#60a5fa]' },
                            { label: 'Estoque Total', val: balancoAcabado?.estoque_total, w: '95%', color: 'bg-[#bfdbfe]' },
                            { label: 'Estoque Disp.', val: balancoAcabado?.estoque_disponivel, w: '80%', color: 'bg-[#86efac]' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2">
                                <span className="w-20 lg:w-24 text-right text-xs lg:text-base font-bold text-[#374151] uppercase">{item.label}</span>
                                <div className="flex-1 h-8 lg:h-10 bg-muted/50 rounded-md overflow-hidden relative shadow-inner">
                                    <div style={{ width: item.w }} className={`h-full ${item.color} flex items-center px-2 lg:px-4 text-[#374151] text-sm lg:text-2xl font-bold shadow-lg`}>
                                        {fmtNum(item.val)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Balanceamento Curva ABC */}
                <div className="bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border flex flex-col h-[300px] lg:h-full overflow-hidden">
                    <div className="bg-[#2563eb] text-white py-0.5 px-2 text-center font-bold text-xs lg:text-sm uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                        <AlignLeft className="w-4 h-4 text-white" /> Balanceamento do Estoque com Curva A B C
                    </div>
                    <div className="flex-1 flex flex-col overflow-auto">
                        <table className="w-full text-xs lg:text-base xl:text-lg text-[#374151] h-full font-sans">
                            <thead className="bg-[#2563eb] text-white sticky top-0">
                                <tr>
                                    <th className="p-0.5 text-center font-medium">Curva</th>
                                    <th className="p-0.5 text-center font-medium">0-15</th>
                                    <th className="p-0.5 text-center font-medium">15-30</th>
                                    <th className="p-0.5 text-center font-medium">30-60</th>
                                    <th className="p-0.5 text-center font-medium">60-120</th>
                                    <th className="p-0.5 text-center font-medium">&gt;120</th>
                                    <th className="p-0.5 text-center font-medium border-l border-border/50 bg-[#2563eb]">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50 text-center font-black text-xs lg:text-lg">
                                {balancoCurva.map((row) => {
                                    // Calculate >120 as Total - (Sum of others)
                                    const calcAcima120 = (row.total || 0) - ((row.d0_15 || 0) + (row.d15_30 || 0) + (row.d15_60 || 0) + (row.d60_120 || 0));

                                    return (
                                        <tr key={row.curva} className="bg-card hover:bg-muted/50 text-[#374151]">
                                            <td>{row.curva}</td>
                                            <td>{fmtNum(row.d0_15)}</td>
                                            <td>{fmtNum(row.d15_30)}</td>
                                            <td>{fmtNum(row.d15_60)}</td>
                                            <td>{fmtNum(row.d60_120)}</td>
                                            <td>{fmtNum(calcAcima120)}</td>
                                            <td className="border-l border-border/50 bg-muted/20">{fmtNum(row.total)}</td>
                                        </tr>
                                    );
                                })}
                                <tr className="bg-muted text-[#374151] border-t-2 border-border text-sm lg:text-xl">
                                    {/* Footer Totals */}
                                    <td className="font-black">Total</td>
                                    <td>{fmtNum(balancoCurva.reduce((acc, r) => acc + (r.d0_15 || 0), 0))}</td>
                                    <td>{fmtNum(balancoCurva.reduce((acc, r) => acc + (r.d15_30 || 0), 0))}</td>
                                    <td>{fmtNum(balancoCurva.reduce((acc, r) => acc + (r.d15_60 || 0), 0))}</td>
                                    <td>{fmtNum(balancoCurva.reduce((acc, r) => acc + (r.d60_120 || 0), 0))}</td>
                                    <td>{fmtNum(balancoCurva.reduce((acc, r) => {
                                        const calc = (r.total || 0) - ((r.d0_15 || 0) + (r.d15_30 || 0) + (r.d15_60 || 0) + (r.d60_120 || 0));
                                        return acc + calc;
                                    }, 0))}</td>
                                    <td className="border-l border-border/50">{fmtNum(balancoCurva.reduce((acc, r) => acc + (r.total || 0), 0))}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Footer Sync Bar */}
            <div className="h-5 shrink-0 flex justify-center pb-0 lg:pb-0">
                <div className="bg-muted text-[#2563eb] rounded-full px-4 lg:px-6 flex items-center gap-2 lg:gap-4 text-[9px] lg:text-[10px] uppercase font-bold tracking-widest shadow-2xl border border-border hover:border-primary transition-colors cursor-default">
                    <span className="opacity-70">ÚLTIMA ATUALIZAÇÃO:</span>
                    <div className="flex items-center gap-1 lg:gap-2 text-[#2563eb]">
                        <Calendar className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-[#2563eb]" />
                        {syncDate}
                    </div>
                    <div className="flex items-center gap-1 lg:gap-2 text-[#2563eb]">
                        <Clock className="w-2.5 h-2.5 lg:w-3 lg:h-3 text-[#2563eb]" />
                        {syncTime}
                    </div>
                </div>
            </div>

        </div>
    );
}
