"use client";

import { useState, useMemo, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { calculateWorkingDays } from "@/utils/paineis/calendar";
import { startOfMonth, endOfMonth, isSameMonth, isYesterday, parseISO, format } from "date-fns";

import { Target, TrendingUp, TrendingDown, Briefcase, Calendar, Percent, ArrowDown, ArrowUp } from "lucide-react";
import AnimatedCounter from "@/components/paineis/AnimatedCounter";
import AnimatedProgressBar from "@/components/paineis/AnimatedProgressBar";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function FinanceiroPage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { db: { schema: 'dashboards_pcp' } }
    );

    const [holidays, setHolidays] = useState<string[]>([]);
    const [halfDays, setHalfDays] = useState<string[]>([]);

    // Financial Data State
    const [finStats, setFinStats] = useState({
        fatMensal: 0,
        fatOntem: 0,
        fatMI: 0,
        fatME: 0,
        vendasMensal: 0,
        carteiraMI: 0,
        carteiraME: 0,
        metaGlobal: 19655410.00, // Configurable?
        metaMI: 19655410.00,
        metaME: 0
    });

    const [walletBreakdown, setWalletBreakdown] = useState<any[]>([]);
    const [dailyData, setDailyData] = useState<any[]>([]);
    const [mediaFatNecessaria, setMediaFatNecessaria] = useState<number>(0);

    // Fetch All Data
    useEffect(() => {
        const loadData = async () => {
            const now = new Date();

            // 1. Calendar
            const { data: calData } = await supabase
                .schema('dashboards_pcp')
                .from('calendario_fatur')
                .select('*');

            if (calData) {
                setHolidays(calData.filter((d: any) => d.type === 'feriado').map((d: any) => d.date));
                setHalfDays(calData.filter((d: any) => d.type === 'meio_dia').map((d: any) => d.date));
            }

            // 2. Faturamento Diario
            const { data: fatData } = await supabase
                .schema('dashboards_pcp')
                .from('faturamento_diario')
                .select('*');

            // 3. Vendas Diaria
            const { data: vendData } = await supabase
                .schema('dashboards_pcp')
                .from('vendas_diaria')
                .select('*');

            // 4. Carteira MI (Latest)
            const { data: miData } = await supabase
                .schema('dashboards_pcp')
                .from('carteira_mi')
                .select('*')
                .order('id', { ascending: false })
                .limit(1)
                .single();

            // 5. Carteira ME (Latest)
            const { data: meData } = await supabase
                .schema('dashboards_pcp')
                .from('carteira_me')
                .select('*')
                .order('id', { ascending: false })
                .limit(1)
                .single();

            // Process Faturamento
            let totalFat = 0;
            let totalFatOntem = 0;
            let totalFatMI = 0;
            let totalFatME = 0;
            const fatMap: Record<string, number> = {};

            fatData?.forEach((row: any) => {
                const d = parseISO(row.data); // data is YYYY-MM-DD
                const val = Number(row.valor || 0);

                if (isSameMonth(d, now)) {
                    totalFat += val;
                    if (row.mercado === 1) totalFatMI += val;
                    else totalFatME += val;

                    if (isYesterday(d)) totalFatOntem += val;
                }

                // Group for Table
                fatMap[row.data] = (fatMap[row.data] || 0) + val;
            });

            // Process Vendas (for Table)
            const vendMap: Record<string, number> = {};
            let totalVendas = 0;
            vendData?.forEach((row: any) => {
                const d = parseISO(row.data);
                const val = Number(row.valor || 0);
                if (isSameMonth(d, now)) totalVendas += val;
                vendMap[row.data] = (vendMap[row.data] || 0) + val;
            });

            // Build Table Data (Merge Fat and Vend keys)
            const allDates = new Set([...Object.keys(fatMap), ...Object.keys(vendMap)]);
            const tableRows: any[] = [];
            allDates.forEach(dateStr => {
                tableRows.push({
                    dateStr, // Keep ISO for sorting
                    date: format(parseISO(dateStr), "dd/MM"),
                    fatNum: fatMap[dateStr] || 0,
                    vendNum: vendMap[dateStr] || 0,
                    fat: (fatMap[dateStr] || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    vend: (vendMap[dateStr] || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    trend: (fatMap[dateStr] || 0) > (vendMap[dateStr] || 0) ? 'up' : 'down' // Simplistic trend
                });
            });
            // Sort Descending Date
            tableRows.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
            setDailyData(tableRows);

            // Process Carteira MI
            // Columns: sem_saldo, nao_alocado, faf_impressa, nao_efetivado, alocad_parcial, embarque_criado, pesagem_realizada, frete_analisado, pedido_separado, pedido_embalando_total, pedido_embalando_parcial
            let totalMI = 0;
            const wb = [];
            if (miData) {
                // Map fields to specific display logic
                // Sum all for Total Carteira MI
                const fields = ['sem_saldo', 'nao_alocado', 'faf_impressa', 'nao_efetivado', 'alocad_parcial', 'embarque_criado', 'pesagem_realizada', 'frete_analisado', 'pedido_separado', 'pedido_embalando_total', 'pedido_embalando_parcial'];
                fields.forEach(f => totalMI += Number(miData[f] || 0));

                // Specific Breakdown for "Desdobramento Carteira MI" Chart
                wb.push({ name: 'NÃO EFETIVADO', value: Number(miData.nao_efetivado || 0), fill: '#ff8b94' });
                wb.push({ name: 'SEM SALDO', value: Number(miData.sem_saldo || 0), fill: '#ffd3b6' });
                wb.push({ name: 'EMBARQUE CRIADO', value: Number(miData.embarque_criado || 0), fill: '#a8e6cf' });
                wb.push({ name: 'FAF IMPRESSA', value: Number(miData.faf_impressa || 0), fill: '#dcedc1' });
                wb.push({ name: 'EMBALANDO', value: Number(miData.pedido_embalando_total || 0) + Number(miData.pedido_embalando_parcial || 0), fill: '#ffd3b6' });
                wb.push({ name: 'PESAGEM REALIZADA', value: Number(miData.pesagem_realizada || 0), fill: '#dcedc1' });
            }
            setWalletBreakdown(wb);

            // Process Carteira ME
            let totalME = 0;
            if (meData) {
                const fields = ['sem_saldo', 'nao_alocado', 'faf_impressa', 'nao_efetivado', 'alocad_parcial', 'embarque_criado', 'pesagem_realizada', 'frete_analisado', 'pedido_separado', 'pedido_embalando_total', 'pedido_embalando_parcial'];
                fields.forEach(f => totalME += Number(meData[f] || 0));
            }

            setFinStats(prev => ({
                ...prev,
                fatMensal: totalFat,
                fatOntem: totalFatOntem,
                fatMI: totalFatMI,
                fatME: totalFatME,
                vendasMensal: totalVendas,
                carteiraMI: totalMI,
                carteiraME: totalME
            }));
        };

        loadData();
    }, [supabase]);

    useEffect(() => {
        // Mock "Falta Atingir" for Calculation
        const faltaAtingir = 8762718.86;
        const now = new Date();
        const monthEnd = endOfMonth(now);

        // Calculate Remaining Working Days including Today
        // Note: Using now as start might exclude today if logic is strict, but usually acceptable for dashboard pacing
        const remainingDays = calculateWorkingDays(now, monthEnd, holidays, halfDays, []);

        const media = remainingDays > 0 ? (faltaAtingir / remainingDays) : 0;
        setMediaFatNecessaria(media);
    }, [holidays, halfDays]);

    // Pacing Calculation
    useEffect(() => {
        const faltaAtingir = Math.max(0, finStats.metaGlobal - finStats.fatMensal);
        const now = new Date();
        const monthEnd = endOfMonth(now);
        const remainingDays = calculateWorkingDays(now, monthEnd, holidays, halfDays, []);
        const media = remainingDays > 0 ? (faltaAtingir / remainingDays) : 0;
        setMediaFatNecessaria(media);
    }, [finStats.fatMensal, finStats.metaGlobal, holidays, halfDays]);

    const cards = [
        { label: "Falta Atingir", value: (finStats.metaGlobal - finStats.fatMensal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: Target, bg: "bg-[#a8e6cf]/20", border: "border-[#a8e6cf]", text: "text-[#374151]" },
        // Projeção: (Fat / Realized) * TotalWorking? Or simplistic: Fat + (MediaNecessaria * Remaining)? 
        // Let's use simpler Pace: (Fat / DaysPassed) * TotalDays
        { label: "Projeção (R$)", value: "R$ --", icon: TrendingUp, bg: "bg-[#a8e6cf]/20", border: "border-[#a8e6cf]", text: "text-[#374151]" },
        { label: "Projeção (%)", value: `${finStats.metaGlobal > 0 ? ((finStats.fatMensal / finStats.metaGlobal) * 100).toFixed(2) : 0}%`, icon: Percent, bg: "bg-[#ff8b94]/20", border: "border-[#ff8b94]", text: "text-[#374151]" },
        { label: "Carteira Pedidos MI", value: finStats.carteiraMI.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: Briefcase, bg: "bg-[#a8e6cf]/20", border: "border-[#a8e6cf]", text: "text-[#374151]" },
        { label: "Carteira Pedidos ME", value: finStats.carteiraME.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: Briefcase, bg: "bg-[#a8e6cf]/20", border: "border-[#a8e6cf]", text: "text-[#374151]" },
        { label: "Faturamento Ontem", value: finStats.fatOntem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: Calendar, bg: "bg-[#a8e6cf]/20", border: "border-[#a8e6cf]", text: "text-[#374151]" },
        { label: "Média Fat. Necessária", value: mediaFatNecessaria.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: TrendingDown, bg: "bg-[#ff8b94]/20", border: "border-[#ff8b94]", text: "text-[#374151]" },
        // Média Vendas Necessária: Similar logic for Sales Goal? Mock for now
        { label: "Média Vendas Necessária", value: "R$ 0,00", icon: TrendingDown, bg: "bg-[#a8e6cf]/20", border: "border-[#a8e6cf]", text: "text-[#374151]" },
    ];

    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedTableData = useMemo(() => {
        if (!sortConfig) return dailyData;
        return [...dailyData].sort((a: any, b: any) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [dailyData, sortConfig]);

    return (
        <div className="flex flex-col h-full w-full gap-4 p-4 overflow-auto xl:overflow-hidden font-sans">
            {/* Same Top Row */}
            <div className="shrink-0 h-auto xl:h-[140px] grid grid-cols-2 sm:grid-cols-4 2xl:grid-cols-8 gap-3 xl:gap-4">
                {cards.map((card, idx) => (
                    <div key={idx} className={`${card.bg} backdrop-blur border-l-4 ${card.border} rounded-xl p-2 xl:p-3 shadow-xl relative overflow-hidden group flex flex-col justify-between h-[100px] xl:h-full hover:scale-[1.02] transition-transform duration-300`}>
                        <div className="flex justify-between items-start relative z-10 w-full">
                            <span className="font-bold text-[10px] xl:text-[11px] 2xl:text-xs opacity-90 uppercase tracking-widest truncate pr-2 text-muted-foreground" title={card.label}>{card.label}</span>
                            <card.icon className="w-4 h-4 xl:w-5 xl:h-5 shrink-0 opacity-80 text-primary" />
                        </div>
                        <div className="relative z-10">
                            <span className="text-sm xl:text-base 2xl:text-lg font-bold tracking-tight block truncate drop-shadow-md text-[#374151]" title={card.value}>{card.value}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* BOTTOM START */}
            <div className="flex-1 flex flex-col xl:flex-row gap-4 min-h-0 h-auto">

                {/* LEFT: Daily Table (45%) */}
                <div className="w-full xl:w-[45%] bg-card/95 backdrop-blur rounded-xl shadow-lg border border-border overflow-hidden flex flex-col h-[400px] xl:h-auto">
                    {/* ... Header ... */}
                    <div className="bg-[#a8e6cf] text-[#374151] py-1 xl:py-2 px-2 xl:px-4 grid grid-cols-4 gap-2 font-bold text-[10px] xl:text-xs uppercase items-center sticky top-0 z-20 tracking-wide shadow-md cursor-pointer">
                        <div className="flex items-center justify-center gap-2 hover:text-[#dcedc1] transition-colors" onClick={() => handleSort('date')}>
                            Data {sortConfig?.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#374151]" /> : <ArrowDown className="w-3 h-3 text-[#374151]" />)}
                        </div>
                        <div className="text-center hover:text-[#dcedc1] transition-colors flex justify-center gap-1" onClick={() => handleSort('fatNum')}>
                            Faturamento {sortConfig?.key === 'fatNum' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#374151]" /> : <ArrowDown className="w-3 h-3 text-[#374151]" />)}
                        </div>
                        <div className="text-center hover:text-[#dcedc1] transition-colors flex justify-center gap-1" onClick={() => handleSort('vendNum')}>
                            Vendas {sortConfig?.key === 'vendNum' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#374151]" /> : <ArrowDown className="w-3 h-3 text-[#374151]" />)}
                        </div>
                        <div className="text-center">+/-</div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar bg-card">
                        <table className="w-full text-xs xl:text-sm text-[#374151] font-sans">
                            <tbody className="divide-y divide-border/50">
                                {sortedTableData.map((row, i) => (
                                    <tr key={i} className={`hover:bg-primary/5 transition-colors ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                                        <td className="py-1 xl:py-2 px-2 xl:px-4 text-center font-bold text-[#374151]">{row.date}</td>
                                        <td className="py-1 xl:py-2 px-2 xl:px-4 text-center font-medium text-[#374151]">{row.fat}</td>
                                        <td className="py-1 xl:py-2 px-2 xl:px-4 text-center font-medium text-[#374151]">{row.vend}</td>
                                        <td className="py-1 xl:py-2 px-2 xl:px-4 text-center flex justify-center">
                                            {row.trend === 'up' ? <ArrowUp className="w-3 h-3 xl:w-4 xl:h-4 text-green-500" /> : <ArrowDown className="w-3 h-3 xl:w-4 xl:h-4 text-destructive" />}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* ... Footer ... */}
                    <div className="bg-[#a8e6cf] border-t border-border py-2 xl:py-3 px-2 xl:px-4 grid grid-cols-4 gap-2 text-[10px] xl:text-xs sticky bottom-0 z-20 shadow-[-10px]">
                        <div className="font-bold text-[#374151] uppercase flex flex-col justify-center text-center"><span>Total</span><span>Média</span></div>
                        <div className="text-center flex flex-col font-bold text-[#374151]"><span>{finStats.fatMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><span>{(finStats.fatMensal / Math.max(1, dailyData.length)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                        <div className="text-center flex flex-col font-bold text-[#374151]"><span>{finStats.vendasMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><span>{(finStats.vendasMensal / Math.max(1, dailyData.length)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                        <div></div>
                    </div>
                </div>

                {/* RIGHT: Charts (55%) */}
                <div className="w-full xl:flex-1 flex flex-col gap-3 h-auto">

                    {/* UPPER: Desdobramento Faturamento (Linear Bars) */}
                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-[180px] xl:h-auto">
                        <div className="bg-[#a8e6cf] text-[#374151] py-1 px-3 text-center font-bold text-[10px] xl:text-lg uppercase tracking-wide shadow-md">Desdobramento Faturamento</div>
                        <div className="flex-1 flex">
                            {/* Bar 1: Mercado Interno */}
                            <div className="flex-1 flex flex-col items-center justify-center p-2 border-r border-border">
                                <span className="text-[#374151] font-bold text-xs xl:text-lg mb-1 uppercase tracking-tight">Mercado Interno</span>
                                <AnimatedCounter
                                    value={finStats.metaMI > 0 ? (finStats.fatMI / finStats.metaMI) * 100 : 0}
                                    format="percent"
                                    className="text-5xl xl:text-6xl font-black text-[#374151] drop-shadow-sm leading-none mb-1"
                                />
                                <div className="w-full max-w-[200px] xl:max-w-[80%]">
                                    <AnimatedProgressBar value={finStats.metaMI > 0 ? (finStats.fatMI / finStats.metaMI) * 100 : 0} height="h-3 xl:h-4" />
                                </div>
                                <div className="w-full max-w-[200px] xl:max-w-[80%] flex justify-between text-[9px] xl:text-sm text-muted-foreground mt-2 font-medium">
                                    <span>Meta: {finStats.metaMI.toLocaleString('pt-BR', { notation: "compact" })}</span>
                                    <span>{finStats.fatMI.toLocaleString('pt-BR', { notation: "compact" })}</span>
                                </div>
                            </div>
                            {/* Bar 2: Mercado Externo */}
                            <div className="flex-1 flex flex-col items-center justify-center p-2">
                                <span className="text-[#374151] font-bold text-xs xl:text-lg mb-1 uppercase tracking-tight">Mercado Externo</span>
                                <AnimatedCounter
                                    value={finStats.metaME > 0 ? (finStats.fatME / finStats.metaME) * 100 : 0}
                                    format="percent"
                                    className="text-5xl xl:text-6xl font-black text-[#374151] drop-shadow-sm leading-none mb-1"
                                />
                                <div className="w-full max-w-[200px] xl:max-w-[80%]">
                                    <AnimatedProgressBar value={finStats.metaME > 0 ? (finStats.fatME / finStats.metaME) * 100 : 0} height="h-3 xl:h-4" />
                                </div>
                                <div className="w-full max-w-[200px] xl:max-w-[80%] flex justify-between text-[9px] xl:text-sm text-muted-foreground mt-2 font-medium">
                                    <span>Meta: {finStats.metaME.toLocaleString('pt-BR', { notation: "compact" })}</span>
                                    <span>{finStats.fatME.toLocaleString('pt-BR', { notation: "compact" })}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MIDDLE: Faturamento Total (Linear Bar) */}
                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-[180px] xl:h-auto">
                        <div className="bg-[#a8e6cf] text-[#374151] py-1 px-3 text-center font-bold text-[10px] xl:text-lg uppercase tracking-wide shadow-md">Faturamento Total</div>
                        <div className="flex-1 flex flex-col items-center justify-center p-2">
                            <div className="flex flex-col items-center w-full">
                                <AnimatedCounter
                                    value={(finStats.fatMensal / finStats.metaGlobal) * 100}
                                    format="percent"
                                    className="text-6xl xl:text-7xl font-black text-[#374151] drop-shadow-md leading-none mb-1"
                                />
                                <div className="w-full max-w-[280px] xl:max-w-[90%] mb-2">
                                    <AnimatedProgressBar value={(finStats.fatMensal / finStats.metaGlobal) * 100} height="h-4 xl:h-5" />
                                </div>
                                <div className="w-full max-w-[280px] xl:max-w-[90%] flex justify-between text-xs xl:text-base text-[#374151] font-bold px-1">
                                    <div className="flex flex-col items-start bg-muted px-3 py-1 rounded-lg border border-border">
                                        <span className="text-[10px] xl:text-xs text-muted-foreground uppercase">Meta Global</span>
                                        <AnimatedCounter value={finStats.metaGlobal} format="currency" className="text-[#374151]" decimals={2} />
                                    </div>
                                    <div className="flex flex-col items-end bg-[#a8e6cf]/20 px-3 py-1 rounded-lg border border-[#a8e6cf]/50 text-[#374151]">
                                        <span className="text-[10px] xl:text-xs text-[#374151] uppercase">Realizado</span>
                                        <AnimatedCounter value={finStats.fatMensal} format="currency" className="text-[#374151]" decimals={2} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM: Desdobramento Carteira MI (Bar Chart) */}
                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-[250px] xl:h-auto">
                        <div className="bg-[#a8e6cf] text-[#374151] py-1 px-3 text-center font-bold text-[10px] xl:text-xs uppercase tracking-wide shadow-md">Desdobramento Carteira MI</div>
                        <div className="flex-1 p-2 xl:p-3 flex flex-col justify-center gap-1 xl:gap-2">
                            {walletBreakdown.map((item: any, i: number) => (
                                <div key={i} className="flex items-center text-[9px] xl:text-[10px]">
                                    <span className="w-24 xl:w-32 text-right pr-2 font-bold text-[#374151] truncate">{item.name}</span>
                                    <div className="flex-1 h-4 xl:h-6 bg-muted/50 rounded-md overflow-hidden relative flex items-center shadow-inner">
                                        <div
                                            style={{ width: `${Math.max((item.value / 6000000) * 100, 8)}%`, backgroundColor: item.fill }}
                                            className={`h-full rounded-md shadow-md flex items-center justify-end px-1 xl:px-2`}
                                        >
                                            {item.value > 0 && (
                                                <span className="text-[#374151] font-bold text-[7px] xl:text-[9px] whitespace-nowrap">
                                                    {`R$ ${item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
