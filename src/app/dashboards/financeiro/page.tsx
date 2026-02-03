"use client";

import { useState, useMemo, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { calculateWorkingDays } from "@/utils/paineis/calendar";
import { startOfMonth, endOfMonth, isSameMonth, isYesterday, parseISO, format } from "date-fns";

import { Target, TrendingUp, TrendingDown, Briefcase, Calendar, Percent, ArrowDown, ArrowUp, BarChart3, PieChart as PieChartIcon } from "lucide-react";
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
    const [dollarRate, setDollarRate] = useState<number>(6.00); // Default fallback

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

    // Fetch Dollar Rate
    useEffect(() => {
        fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL')
            .then(res => res.json())
            .then(data => {
                if (data.USDBRL && data.USDBRL.bid) {
                    setDollarRate(Number(data.USDBRL.bid));
                }
            })
            .catch(err => console.error("Error fetching dollar rate:", err));
    }, []);

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

            // 6. Metas (Latest)
            const { data: metasData } = await supabase
                .schema('dashboards_pcp')
                .from('metas')
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
                // Map fields to specific display logic
                // Sum all for Total Carteira MI
                const fields = ['sem_saldo', 'nao_alocado', 'faf_impressa', 'nao_efetivado', 'alocad_parcial', 'embarque_criado', 'pesagem_realizada', 'frete_analisado', 'pedido_separado', 'pedido_embalando_total', 'pedido_embalando_parcial'];
                fields.forEach(f => totalMI += Number(miData[f] || 0));

                // Specific Breakdown for "Desdobramento Carteira MI" Chart
                // Use fetched metas
                if (metasData) {
                    setFinStats(prev => ({
                        ...prev,
                        metaMI: Number(metasData.meta_faturamento_int || 0),
                        metaME: Number(metasData.meta_faturamento_ext || 0),
                        metaGlobal: Number(metasData.meta_faturamento_int || 0) + Number(metasData.meta_faturamento_ext || 0)
                    }));
                }

                // Specific Breakdown for "Desdobramento Carteira MI" Chart
                // 1. Including ALL columns
                // 2. Colors restricted to BLUE and GREEN shades only (as requested)
                // 3. Dark text logic maintained
                wb.push({ name: 'NÃO EFETIVADO', value: Number(miData.nao_efetivado || 0), fill: '#86efac' }); // Green 300
                wb.push({ name: 'SEM SALDO', value: Number(miData.sem_saldo || 0), fill: '#4ade80' }); // Green 400
                wb.push({ name: 'NÃO ALOCADO', value: Number(miData.nao_alocado || 0), fill: '#22c55e' }); // Green 500
                wb.push({ name: 'ALOCADO PARCIAL', value: Number(miData.alocad_parcial || 0), fill: '#93c5fd' }); // Blue 300
                wb.push({ name: 'EMBARQUE CRIADO', value: Number(miData.embarque_criado || 0), fill: '#60a5fa' }); // Blue 400
                wb.push({ name: 'FAF IMPRESSA', value: Number(miData.faf_impressa || 0), fill: '#3b82f6' }); // Blue 500
                wb.push({ name: 'FRETE ANALISADO', value: Number(miData.frete_analisado || 0), fill: '#2563eb' }); // Blue 600
                wb.push({ name: 'PEDIDO SEPARADO', value: Number(miData.pedido_separado || 0), fill: '#bfdbfe' }); // Blue 200
                wb.push({ name: 'EMBALANDO', value: Number(miData.pedido_embalando_total || 0) + Number(miData.pedido_embalando_parcial || 0), fill: '#60a5fa' }); // Blue 400
                wb.push({ name: 'PESAGEM REALIZADA', value: Number(miData.pesagem_realizada || 0), fill: '#3b82f6' }); // Standard Blue
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

        // Atualização automática a cada 1 minuto (polling)
        const intervalId = setInterval(() => {
            loadData(); // Recarrega dados em background
        }, 60000); // 60 segundos

        return () => {
            clearInterval(intervalId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount

    // Advanced Calculations
    const [calculations, setCalculations] = useState({
        projecaoFat: 0,
        projecaoPercent: 0,
        mediaVendasNecessaria: 0,
        mediaFatNecessaria: 0
    });

    useEffect(() => {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        // 1. Calculate Working Days
        // Days Passed (from start of month up to yesterday for accurate pacing, or today if including today's partial)
        // User logic: "Total Faturado / Dias Faturaveis (Passados)"
        // Let's assume passed days = working days from Start to Yesterday. If today is 1st, 1 day? Or 0?
        // Safe bet: Working Days from Start Month to NOW.
        const totalWorkingDays = calculateWorkingDays(monthStart, monthEnd, holidays, halfDays, []);
        const daysPassed = calculateWorkingDays(monthStart, now, holidays, halfDays, []); // Includes today if working day
        const daysRemaining = Math.max(0, totalWorkingDays - daysPassed);

        // 2. Projeção Faturamento
        // Logic: (FatMensal / DaysPassed) * DaysRemaining + FatMensal
        // If DaysPassed is 0 (start of month), avoid infinity.
        let projecaoR = 0;
        if (daysPassed > 0) {
            const dailyAvg = finStats.fatMensal / daysPassed;
            projecaoR = (dailyAvg * daysRemaining) + finStats.fatMensal;
        } else {
            projecaoR = finStats.fatMensal; // Just what we have
        }

        // 3. Projeção %
        const projecaoP = finStats.metaGlobal > 0 ? (projecaoR / finStats.metaGlobal) * 100 : 0;

        // 4. Média Fat. Necessária (Matches previous logic roughly, but using refined remaining days)
        const faltaAtingirFat = Math.max(0, finStats.metaGlobal - finStats.fatMensal);
        const mediaFat = daysRemaining > 0 ? (faltaAtingirFat / daysRemaining) : 0;

        // 5. Média Vendas Necessária
        // Logic: (MetaGlobal - CarteiraMI - FatMensal) / DiasRestantes
        // If result < 0, then 0.
        const gapVendas = finStats.metaGlobal - finStats.carteiraMI - finStats.fatMensal;
        const mediaVendas = (daysRemaining > 0 && gapVendas > 0) ? (gapVendas / daysRemaining) : 0;

        setCalculations({
            projecaoFat: projecaoR,
            projecaoPercent: projecaoP,
            mediaFatNecessaria: mediaFat,
            mediaVendasNecessaria: mediaVendas
        });
    }, [finStats, holidays, halfDays, dollarRate]);

    const cards = [
        { label: "Falta Atingir", value: Math.max(0, finStats.metaGlobal - finStats.fatMensal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: Target, bg: "bg-white", border: "border-[#2563eb]", text: "text-[#374151]" },
        { label: "Projeção (R$)", value: calculations.projecaoFat.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: TrendingUp, bg: "bg-white", border: "border-[#2563eb]", text: "text-[#374151]" },
        { label: "Projeção (%)", value: `${calculations.projecaoPercent.toFixed(2)}%`, icon: Percent, bg: "bg-white", border: "border-[#ef4444]", text: "text-[#374151]" },
        { label: "Carteira Pedidos MI", value: finStats.carteiraMI.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: Briefcase, bg: "bg-white", border: "border-[#2563eb]", text: "text-[#374151]" },
        { label: "Carteira Pedidos ME", value: (finStats.carteiraME * dollarRate).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: Briefcase, bg: "bg-white", border: "border-[#2563eb]", text: "text-[#374151]" },
        { label: "Faturamento Ontem", value: finStats.fatOntem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: Calendar, bg: "bg-white", border: "border-[#2563eb]", text: "text-[#374151]" },
        { label: "Média Fat. Necessária", value: calculations.mediaFatNecessaria.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: TrendingDown, bg: "bg-white", border: "border-[#ef4444]", text: "text-[#374151]" },
        { label: "Média Vendas Necessária", value: calculations.mediaVendasNecessaria.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: TrendingDown, bg: "bg-white", border: "border-[#2563eb]", text: "text-[#374151]" },
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
        <div className="flex flex-col h-full w-full gap-4 p-0 overflow-auto xl:overflow-hidden font-sans">
            {/* Same Top Row */}
            <div className="shrink-0 h-auto xl:h-[140px] grid grid-cols-2 sm:grid-cols-4 2xl:grid-cols-8 gap-3 xl:gap-4">
                {cards.map((card, idx) => (
                    <div key={idx} className={`${card.bg} backdrop-blur border-b-4 ${card.border} rounded-xl p-2 xl:p-3 shadow-lg relative overflow-hidden group flex flex-col justify-between h-[100px] xl:h-full hover:scale-[1.02] transition-transform duration-300`}>
                        <div className="flex justify-between items-start relative z-10 w-full">
                            <span className="font-bold text-xs xl:text-sm opacity-90 uppercase tracking-widest truncate pr-2 text-muted-foreground" title={card.label}>{card.label}</span>
                            <card.icon className="w-5 h-5 xl:w-6 xl:h-6 shrink-0 opacity-80 text-primary" />
                        </div>
                        <div className="relative z-10">
                            <span className="text-base xl:text-lg 2xl:text-xl font-bold tracking-tight block truncate drop-shadow-sm text-[#374151]" title={card.value}>{card.value}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* BOTTOM START */}
            <div className="flex-1 flex flex-col xl:flex-row gap-4 min-h-0 h-auto">

                {/* LEFT: Daily Table (45%) */}
                <div className="w-full xl:w-[45%] bg-card/95 backdrop-blur rounded-xl shadow-lg border border-border overflow-hidden flex flex-col h-[400px] xl:h-auto">
                    {/* ... Header ... */}
                    <div className="bg-[#2563eb] text-white py-2 xl:py-3 px-3 xl:px-4 grid grid-cols-4 gap-2 font-bold text-xs xl:text-sm uppercase items-center sticky top-0 z-20 tracking-wide shadow-md cursor-pointer">
                        <div className="flex items-center justify-center gap-2 hover:text-[#bfdbfe] transition-colors" onClick={() => handleSort('date')}>
                            Data {sortConfig?.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />)}
                        </div>
                        <div className="text-center hover:text-[#bfdbfe] transition-colors flex justify-center gap-1" onClick={() => handleSort('fatNum')}>
                            Faturamento {sortConfig?.key === 'fatNum' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />)}
                        </div>
                        <div className="text-center hover:text-[#bfdbfe] transition-colors flex justify-center gap-1" onClick={() => handleSort('vendNum')}>
                            Vendas {sortConfig?.key === 'vendNum' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />)}
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
                    <div className="bg-[#2563eb] text-white border-t border-border py-2 xl:py-3 px-2 xl:px-4 grid grid-cols-4 gap-2 text-xs xl:text-sm sticky bottom-0 z-20 shadow-[-10px]">
                        <div className="font-bold text-white uppercase flex flex-col justify-center text-center"><span>Total</span><span>Média</span></div>
                        <div className="text-center flex flex-col font-bold text-white"><span>{finStats.fatMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><span>{(finStats.fatMensal / Math.max(1, dailyData.length)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                        <div className="text-center flex flex-col font-bold text-white"><span>{finStats.vendasMensal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span><span>{(finStats.vendasMensal / Math.max(1, dailyData.length)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                        <div></div>
                    </div>
                </div>

                {/* RIGHT: Charts (55%) */}
                <div className="w-full xl:flex-1 flex flex-col gap-3 h-auto">

                    {/* UPPER: Desdobramento Faturamento (Linear Bars) */}
                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-[180px] xl:h-auto">
                        <div className="bg-[#2563eb] text-white py-1 px-3 text-center font-bold text-sm xl:text-lg uppercase tracking-wide shadow-md flex items-center justify-center gap-2">
                            <PieChartIcon className="w-5 h-5 text-white" /> Desdobramento Faturamento
                        </div>
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
                                    <AnimatedProgressBar value={finStats.metaMI > 0 ? (finStats.fatMI / finStats.metaMI) * 100 : 0} height="h-3 xl:h-4" colorClass="bg-[#2563eb]" />
                                </div>
                                <div className="w-full max-w-[200px] xl:max-w-[80%] flex justify-between text-[9px] xl:text-sm text-foreground mt-2 font-medium">
                                    <span className="text-[#374151] font-bold">Meta: {finStats.metaMI.toLocaleString('pt-BR', { notation: "standard", maximumFractionDigits: 0 })}</span>
                                    <span className="text-[#374151] font-bold">{finStats.fatMI.toLocaleString('pt-BR', { notation: "standard", maximumFractionDigits: 0 })}</span>
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
                                    <AnimatedProgressBar value={finStats.metaME > 0 ? (finStats.fatME / finStats.metaME) * 100 : 0} height="h-3 xl:h-4" colorClass="bg-[#2563eb]" />
                                </div>
                                <div className="w-full max-w-[200px] xl:max-w-[80%] flex justify-between text-[9px] xl:text-sm text-foreground mt-2 font-medium">
                                    <span className="text-[#374151] font-bold">Meta: {finStats.metaME.toLocaleString('pt-BR', { notation: "standard", maximumFractionDigits: 0 })}</span>
                                    <span className="text-[#374151] font-bold">{finStats.fatME.toLocaleString('pt-BR', { notation: "standard", maximumFractionDigits: 0 })}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* MIDDLE: Faturamento Total (Linear Bar) */}
                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-[180px] xl:h-auto">
                        <div className="bg-[#2563eb] text-white py-1 px-3 text-center font-bold text-sm xl:text-lg uppercase tracking-wide shadow-md flex items-center justify-center gap-2">
                            <BarChart3 className="w-5 h-5 text-white" /> Faturamento Total
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center p-2">
                            <div className="flex flex-col items-center w-full">
                                <AnimatedCounter
                                    value={(finStats.fatMensal / finStats.metaGlobal) * 100}
                                    format="percent"
                                    className="text-6xl xl:text-7xl font-black text-[#374151] drop-shadow-md leading-none mb-1"
                                />
                                <div className="w-full max-w-[280px] xl:max-w-[90%] mb-2">
                                    <AnimatedProgressBar value={(finStats.fatMensal / finStats.metaGlobal) * 100} height="h-4 xl:h-5" colorClass="bg-[#2563eb]" />
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
                        <div className="bg-[#2563eb] text-white py-1 px-3 text-center font-bold text-sm xl:text-base uppercase tracking-wide shadow-md flex items-center justify-center gap-2">
                            <Briefcase className="w-4 h-4 text-white" /> Desdobramento Carteira MI
                        </div>
                        <div className="flex-1 p-2 xl:p-3 flex flex-col justify-start gap-1 xl:gap-2 overflow-y-auto max-h-[220px] custom-scrollbar">
                            {walletBreakdown.map((item: any, i: number) => (
                                <div key={i} className="flex items-center text-[9px] xl:text-[10px]">
                                    <span className="w-24 xl:w-32 text-right pr-2 font-bold text-[#374151] truncate">{item.name}</span>
                                    <div className="flex-1 h-4 xl:h-6 bg-muted/50 rounded-md relative flex items-center shadow-inner">
                                        <div
                                            style={{ width: `${Math.max((item.value / 6000000) * 100, 0.5)}%`, backgroundColor: item.fill }}
                                            className={`h-full rounded-md shadow-sm flex items-center justify-end px-1 xl:px-2 overflow-visible`}
                                        >
                                            {item.value > 0 && (
                                                <span className="text-[#374151] font-bold text-[7px] xl:text-[9px] whitespace-nowrap drop-shadow-sm transform translate-x-full pl-2 left-0 absolute">
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
