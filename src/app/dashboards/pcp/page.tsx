"use client";

import { useState, useMemo, useEffect } from 'react';
import { Truck, CheckSquare, Clock, Calendar, Package, FileText, PackagePlus, Box, Layers, AlignLeft, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip, CartesianGrid, LabelList } from 'recharts';
import { createBrowserClient } from '@supabase/ssr';

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

interface EstoqueEstrategico {
    prensado: number;
    jato: number;
    adesivo: number;
}

interface PedidosRecebidos {
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
    acima_120: number; // Assuming we might want this, though logic uses total - others
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
    const [estoqueEstrategico, setEstoqueEstrategico] = useState<EstoqueEstrategico | null>(null);
    const [pedidosRecebidos, setPedidosRecebidos] = useState<PedidosRecebidos[]>([]);
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
                    // Fix: Parse string directly to avoid Timezone offset
                    // Assumes format YYYY-MM-DD from DB
                    data: h.data ? h.data.split('-').reverse().join('-') : h.data,
                    qtd_ped: h.qtd_ped
                })));
            }

            // 4. Performance Entrega (Complex Mapping)
            const { data: perf } = await supabase.schema('dashboards_pcp').from('performance_entrega').select('*').order('id', { ascending: false }).limit(1).single();
            if (perf) {
                // Map columns to rows
                const p0 = Number(perf.perc_0 || 0);
                const p1 = Number(perf.perc_1 || 0);
                const p2 = Number(perf.perc_2 || 0);
                const p3 = Number(perf.perc_3 || 0);
                const p4 = Number(perf.perc_4 || 0);
                const p5 = Number(perf.perc_5 || 0);
                const pAcima = Number(perf.perc_acima_5 || 0); // Assuming this column exists based on user request logic, or we should sum remnants? 
                // User said "tem na tabela". Let's assume standard formatting. 
                // Actually, often tables have `perc_acima`. I will guess `perc_acima_5` or similar. 
                // Let's protect against NaN.

                const mappedPerf = [
                    { label: "Mesmo dia", qtd: perf.dias_0, pct: `${p0.toFixed(0)}%`, acu: `${p0.toFixed(0)}%`, pctNum: p0 },
                    { label: "1 dia", qtd: perf.dias_1, pct: `${p1.toFixed(0)}%`, acu: `${(p0 + p1).toFixed(0)}%`, pctNum: p1 },
                    { label: "2 dias", qtd: perf.dias_2, pct: `${p2.toFixed(0)}%`, acu: `${(p0 + p1 + p2).toFixed(0)}%`, pctNum: p2 },
                    { label: "3 dias", qtd: perf.dias_3, pct: `${p3.toFixed(0)}%`, acu: `${(p0 + p1 + p2 + p3).toFixed(0)}%`, pctNum: p3 },
                    { label: "4 dias", qtd: perf.dias_4, pct: `${p4.toFixed(0)}%`, acu: `${(p0 + p1 + p2 + p3 + p4).toFixed(0)}%`, pctNum: p4 },
                    { label: "5 dias", qtd: perf.dias_5, pct: `${p5.toFixed(0)}%`, acu: `${(p0 + p1 + p2 + p3 + p4 + p5).toFixed(0)}%`, pctNum: p5 },
                    { label: "> 5 dias", qtd: perf.dias_acima_5, pct: `${pAcima.toFixed(0)}%`, acu: "100%", pctNum: pAcima },
                ];
                setPerformanceData(mappedPerf);
            }

            // 5. Estoque Estrategico
            const { data: est } = await supabase.schema('dashboards_pcp').from('estoque_produtos_estrategicos').select('*').order('id', { ascending: false }).limit(1).single();
            if (est) setEstoqueEstrategico(est);

            // 6. Pedidos Recebidos (Chart)
            // Fix: Order DESC to get LATEST dates, then limit, then reverse for chart display
            const { data: pedRec } = await supabase.schema('dashboards_pcp').from('pedidos_recebidos').select('*').order('data', { ascending: false }).limit(10);
            if (pedRec) {
                const sorted = pedRec.filter((p: any) => p.data).reverse().map((p: any) => {
                    // Fix: Robust date parsing for YYYY-MM-DD
                    const dateStr = String(p.data);
                    // Handle potential T timestamp if Supabase changes behavior
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

            // 9. Sync Time (Get from any table created_at or general_data if implemented)
            // For now using cards_pedidos created_at
            if (cards && cards.created_at) {
                const dateObj = new Date(cards.created_at);
                setSyncDate(dateObj.toLocaleDateString('pt-BR'));
                setSyncTime(dateObj.toLocaleTimeString('pt-BR'));
            }
        };

        fetchData().catch(console.error);

        // Polling: atualiza a cada 1 minuto
        const intervalId = setInterval(() => {
            fetchData(); // Recarrega dados em background
        }, 60000); // 1 minuto

        return () => {
            clearInterval(intervalId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount


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
        <div className="flex flex-col min-h-screen xl:h-screen gap-2 p-2 font-sans overflow-y-auto xl:overflow-hidden bg-background pb-20 xl:pb-0">
            {/* TOP SECTION (68%) */}
            <div className="flex flex-col xl:flex-row gap-2 h-[68%] min-h-0">
                {/* KPI Cards */}
                <div className="w-full xl:w-[320px] 2xl:w-[360px] flex flex-col gap-2 shrink-0 h-full">
                    <div className="bg-[#2563eb] text-white p-2 rounded-lg text-center font-bold text-xl uppercase tracking-wider border-b-4 border-[#2563eb] shadow-lg flex items-center justify-center gap-2 shrink-0">
                        <Truck className="w-6 h-6 text-white" />
                        <span className="drop-shadow-md">Pedidos Mercado Interno</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-1 flex-1 min-h-0">
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
                            <div key={idx} className={`glass-card ${card.color} border ${card.border} p-0.5 xl:p-1 flex flex-col items-center justify-center text-center gap-0 hover:scale-[1.02] transition-transform duration-300 shadow-xl backdrop-blur-md ${card.animate ? 'animate-soft-pulse' : ''}`}>
                                <div className="flex items-center gap-1 mb-0">
                                    <card.icon className="w-5 h-5 xl:w-6 xl:h-6 opacity-80" />
                                    <span className="text-3xl xl:text-5xl 2xl:text-6xl font-bold tracking-tighter drop-shadow-lg">{fmtNum(card.val)}</span>
                                </div>
                                <span className="font-semibold uppercase tracking-widest text-xs xl:text-sm 2xl:text-base opacity-90">{card.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Tables/Charts */}
                <div className="flex-1 flex flex-col gap-2 h-full overflow-hidden">
                    <div className="h-[55%] flex flex-col xl:grid xl:grid-cols-3 gap-2 min-h-0">
                        {/* Table Resumo */}
                        <div className="flex flex-col bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border h-[200px] xl:h-full overflow-hidden">
                            <div className="bg-[#2563eb] text-white py-1 px-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                                <Package className="w-4 h-4 xl:w-5 xl:h-5 text-white" /> Resumo por Item
                            </div>
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-xs xl:text-base 2xl:text-lg text-[#374151] leading-tight font-sans">
                                    <thead className="bg-[#2563eb] text-white sticky top-0 shadow-md z-10 text-xs xl:text-lg cursor-pointer">
                                        <tr>
                                            <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('it_codigo', sortResumo, setSortResumo)}>Itens <SortIcon active={sortResumo?.key === 'it_codigo'} direction={sortResumo?.direction} /></th>
                                            <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('qtd_pecas', sortResumo, setSortResumo)}>Qtd <SortIcon active={sortResumo?.key === 'qtd_pecas'} direction={sortResumo?.direction} /></th>
                                            <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('qtd_pedidos', sortResumo, setSortResumo)}>Ped <SortIcon active={sortResumo?.key === 'qtd_pedidos'} direction={sortResumo?.direction} /></th>
                                            <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('curva', sortResumo, setSortResumo)}>ABC <SortIcon active={sortResumo?.key === 'curva'} direction={sortResumo?.direction} /></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {sortedResumo.map((row, i) => (
                                            <tr key={i} className={`hover:bg-primary/5 transition-colors ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                                                <td className="p-1 xl:p-2 text-center font-bold text-[#374151] text-base xl:text-2xl">{row.it_codigo}</td>
                                                <td className="p-1 xl:p-2 text-center font-sans font-bold text-[#374151] text-base xl:text-2xl">{fmtNum(row.qtd_pecas)}</td>
                                                <td className="p-1 xl:p-2 text-center font-sans font-bold text-[#374151] text-base xl:text-2xl">{fmtNum(row.qtd_pedidos)}</td>
                                                <td className="p-1 xl:p-2 text-center font-bold text-[#374151] bg-muted/50 mx-1 rounded text-base xl:text-xl">{row.curva}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Table Historico */}
                        <div className="flex flex-col bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border h-[200px] xl:h-full overflow-hidden">
                            <div className="bg-[#2563eb] text-white py-1 px-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                                <Clock className="w-4 h-4 xl:w-5 xl:h-5 text-white" /> Histórico de Pedidos
                            </div>
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-xs xl:text-base 2xl:text-lg text-[#374151] leading-tight font-sans">
                                    <thead className="bg-[#2563eb] text-white sticky top-0 shadow-md z-10 text-xs xl:text-lg cursor-pointer">
                                        <tr>
                                            <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('data', sortHistorico, setSortHistorico)}>Data <SortIcon active={sortHistorico?.key === 'data'} direction={sortHistorico?.direction} /></th>
                                            <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('qtd_ped', sortHistorico, setSortHistorico)}>Qtd <SortIcon active={sortHistorico?.key === 'qtd_ped'} direction={sortHistorico?.direction} /></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {sortedHistorico.map((row, i) => (
                                            <tr key={i} className={`hover:bg-primary/5 transition-colors ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                                                <td className="p-1 xl:p-2 text-center font-bold text-[#374151] text-base xl:text-2xl">{row.data}</td>
                                                <td className="p-1 xl:p-2 text-center font-bold text-[#374151] text-base xl:text-2xl">{row.qtd_ped}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Table Performance */}
                        <div className="flex flex-col bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border h-[200px] xl:h-full overflow-hidden">
                            <div className="bg-[#2563eb] text-white py-1 px-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                                <Clock className="w-4 h-4 xl:w-5 xl:h-5 text-white" /> Performance de Entrega
                            </div>
                            <div className="flex-1 overflow-auto custom-scrollbar">
                                <table className="w-full text-xs xl:text-base 2xl:text-lg text-[#374151] leading-tight font-sans">
                                    <thead className="bg-[#2563eb] text-white sticky top-0 shadow-md z-10 text-xs xl:text-lg cursor-pointer">
                                        <tr>
                                            <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('label', sortPerformance, setSortPerformance)}>Data <SortIcon active={sortPerformance?.key === 'label'} direction={sortPerformance?.direction} /></th>
                                            <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('qtd', sortPerformance, setSortPerformance)}>Qtd <SortIcon active={sortPerformance?.key === 'qtd'} direction={sortPerformance?.direction} /></th>
                                            <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('pctNum', sortPerformance, setSortPerformance)}>% <SortIcon active={sortPerformance?.key === 'pctNum'} direction={sortPerformance?.direction} /></th>
                                            <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#bfdbfe]" onClick={() => handleSort('acu', sortPerformance, setSortPerformance)}>Acu. <SortIcon active={sortPerformance?.key === 'acu'} direction={sortPerformance?.direction} /></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {sortedPerformance.map((row, i) => (
                                            <tr key={i} className={`hover:bg-primary/5 transition-colors ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                                                <td className="p-1 xl:p-2 text-center font-bold text-[#374151] text-base xl:text-2xl">{row.label}</td>
                                                <td className="p-1 xl:p-2 text-center text-[#374151] font-bold text-base xl:text-2xl">{fmtNum(row.qtd)}</td>
                                                <td className="p-1 xl:p-2 text-center text-[#374151] font-bold text-base xl:text-2xl">{row.pct}</td>
                                                <td className="p-1 xl:p-2 text-center font-bold text-[#374151] text-base xl:text-2xl">{row.acu}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Middle Row Charts - Fill remaining space */}
                    <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-2 min-h-0">
                        {/* Estoque Produtos Estratégicos */}
                        <div className="bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border flex flex-col h-full overflow-hidden">
                            <div className="bg-[#2563eb] text-white py-1 px-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                                <Package className="w-4 h-4 xl:w-5 xl:h-5 text-white" /> Estoque Produtos Estratégicos
                            </div>
                            <div className="flex-1 p-2 xl:p-4 flex flex-col justify-center gap-2 xl:gap-4">
                                {[
                                    { label: 'Prensado', val: estoqueEstrategico?.prensado, w: '40%', color: 'bg-[#60a5fa]' },
                                    { label: 'Adesivo', val: estoqueEstrategico?.adesivo, w: '30%', color: 'bg-[#bfdbfe]' },
                                    { label: 'Jato', val: estoqueEstrategico?.jato, w: '90%', color: 'bg-[#86efac]' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 xl:gap-3">
                                        <span className="w-20 xl:w-24 text-right text-xs xl:text-sm font-bold text-[#374151] uppercase tracking-tight">{item.label}</span>
                                        <div className="flex-1 h-6 xl:h-8 2xl:h-10 bg-muted/50 rounded-lg overflow-hidden relative shadow-inner">
                                            <div style={{ width: item.w }} className={`h-full ${item.color} flex items-center justify-end pr-2 text-[#374151] text-[10px] xl:text-xs font-bold transition-all duration-1000 shadow-lg`}>
                                            </div>
                                            <span className="absolute inset-y-0 left-2 flex items-center text-sm xl:text-xl font-bold text-[#374151] drop-shadow-md z-10">{fmtNum(item.val)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Qtd Pedidos Recebidos Chart */}
                        <div className="bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border flex flex-col h-full overflow-hidden">
                            <div className="bg-[#2563eb] text-white py-1 px-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                                <Package className="w-4 h-4 xl:w-5 xl:h-5 text-white" /> Qtd Pedidos Recebidos
                            </div>
                            <div className="flex-1 p-2">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={pedidosRecebidos} margin={{ top: 30, right: 30, left: 30, bottom: 25 }}>
                                        <defs>
                                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} dy={10} />
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
                                                    <text x={x} y={y} dy={-10} fill="#374151" textAnchor="middle" className="text-sm xl:text-4xl font-bold">
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
            <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-2 min-h-0">
                {/* Balanceamento de Estoque Acabado */}
                <div className="bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border flex flex-col h-full overflow-hidden">
                    <div className="bg-[#2563eb] text-white py-1 px-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                        <Layers className="w-4 h-4 xl:w-5 xl:h-5 text-white" /> Balanceamento de Estoque Acabado
                    </div>
                    <div className="flex-1 p-2 xl:p-4 flex flex-col justify-center gap-2 xl:gap-3">
                        {[
                            { label: 'Carteira Ped.', val: balancoAcabado?.carteira_pedidos, w: '25%', color: 'bg-[#60a5fa]' },
                            { label: 'Estoque Total', val: balancoAcabado?.estoque_total, w: '95%', color: 'bg-[#bfdbfe]' },
                            { label: 'Estoque Disp.', val: balancoAcabado?.estoque_disponivel, w: '80%', color: 'bg-[#86efac]' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-2 xl:gap-3">
                                <span className="w-24 xl:w-32 text-right text-xs xl:text-sm font-bold text-[#374151] uppercase">{item.label}</span>
                                <div className="flex-1 h-8 xl:h-10 bg-muted/50 rounded-md overflow-hidden relative shadow-inner">
                                    <div style={{ width: item.w }} className={`h-full ${item.color} flex items-center px-2 xl:px-4 text-[#374151] text-sm xl:text-xl font-bold shadow-lg`}>
                                        {fmtNum(item.val)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Balanceamento Curva ABC */}
                <div className="bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border flex flex-col h-full overflow-hidden">
                    <div className="bg-[#2563eb] text-white py-1 px-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                        <AlignLeft className="w-4 h-4 xl:w-5 xl:h-5 text-white" /> Balanceamento do Estoque com Curva A B C
                    </div>
                    <div className="flex-1 flex flex-col">
                        <table className="w-full text-xs xl:text-base 2xl:text-lg text-[#374151] h-full font-sans">
                            <thead className="bg-[#2563eb] text-white">
                                <tr>
                                    <th className="p-1 xl:p-2 text-center font-medium">Curva</th>
                                    <th className="p-1 xl:p-2 text-center font-medium">0-15</th>
                                    <th className="p-1 xl:p-2 text-center font-medium">15-30</th>
                                    <th className="p-1 xl:p-2 text-center font-medium">30-60</th>
                                    <th className="p-1 xl:p-2 text-center font-medium">60-120</th>
                                    <th className="p-1 xl:p-2 text-center font-medium">&gt;120</th>
                                    <th className="p-1 xl:p-2 text-center font-medium border-l border-border/50 bg-[#2563eb]">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50 text-center font-black text-sm xl:text-xl">
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
                                <tr className="bg-muted text-[#374151] border-t-2 border-border text-base xl:text-2xl">
                                    {/* Footer Totals */}
                                    <td className="font-black">Total</td>
                                    <td>{fmtNum(balancoCurva.reduce((acc, r) => acc + (r.d0_15 || 0), 0))}</td>
                                    <td>{fmtNum(balancoCurva.reduce((acc, r) => acc + (r.d15_30 || 0), 0))}</td>
                                    <td>{fmtNum(balancoCurva.reduce((acc, r) => acc + (r.d15_60 || 0), 0))}</td>
                                    <td>{fmtNum(balancoCurva.reduce((acc, r) => acc + (r.d60_120 || 0), 0))}</td>
                                    {/* Calculate Total for >120 column based on the calculated logic */}
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
            <div className="h-6 shrink-0 flex justify-center pb-2">
                <div className="bg-muted text-[#2563eb] rounded-full px-6 flex items-center gap-4 text-[10px] uppercase font-bold tracking-widest shadow-2xl border border-border hover:border-primary transition-colors">
                    <span className="opacity-70">ÚLTIMA SINCRONIZAÇÃO:</span>
                    <div className="flex items-center gap-2 text-[#2563eb]">
                        <Calendar className="w-3 h-3 text-[#2563eb]" />
                        {syncDate}
                    </div>
                    <div className="flex items-center gap-2 text-[#2563eb]">
                        <Clock className="w-3 h-3 text-[#2563eb]" />
                        {syncTime}
                    </div>
                </div>
            </div>

        </div>
    );
}
