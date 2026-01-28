"use client";

import { useState, useEffect } from "react";
import { Target, TrendingDown, TrendingUp, Clock, Activity, BarChart3, ArrowDown, ArrowUp, Minus, Box, Layers } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, LabelList } from "recharts";
import { calculateWorkingDays } from "@/utils/paineis/calendar";
import { startOfYear, endOfYear, startOfMonth, endOfMonth, format } from "date-fns";

export default function ProducaoPage() {
    // State for Dynamic Data
    const [stats, setStats] = useState({
        metaMensal: 280000, // Fallback
        metaAnual: 8200000, // Fallback
        valorFechadoAnterior: 0, // Valor fechado até o mês anterior
        workingDaysMonth: 22,
        workingDaysYear: 250,
        realizedDaysMonth: 0,
        realizedDaysYear: 0
    });

    // Mock Production Data (These would usually come from API too)
    const producaoAtualMensal = 173707;
    // producaoAtualAnual will be calculated from valorFechadoAnterior + producaoAtualMensal

    useEffect(() => {
        // Load Configuration
        const savedMetas = JSON.parse(localStorage.getItem("pd_metas") || "{}");
        const holidays = JSON.parse(localStorage.getItem("pd_holidays") || "[]");
        const halfDays = JSON.parse(localStorage.getItem("pd_halfDays") || "[]");

        const now = new Date(); // Use actual date or simulation

        // 1. Calculate Working Days for FULL YEAR
        const yearStart = startOfYear(now);
        const yearEnd = endOfYear(now);
        const totalWorkingDaysYear = calculateWorkingDays(yearStart, yearEnd, holidays, halfDays, []);

        // 2. Calculate Working Days for CURRENT MONTH
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const totalWorkingDaysMonth = calculateWorkingDays(monthStart, monthEnd, holidays, halfDays, []);

        // 3. Calculate "Realized" Days (Up to today) for Pacing
        // const realizedDaysMonth = calculateWorkingDays(monthStart, now, holidays, halfDays, []);

        setStats({
            metaMensal: savedMetas.metaProducaoMensal || 280000,
            metaAnual: savedMetas.metaProducaoAnual || 8200000,
            valorFechadoAnterior: savedMetas.valorFechadoAnterior || 0,
            workingDaysMonth: totalWorkingDaysMonth,
            workingDaysYear: totalWorkingDaysYear,
            realizedDaysMonth: 0,
            realizedDaysYear: 0
        });
    }, []);

    // Derived Values for UI

    // Dynamic Monthly Target Logic:
    // Option A: Just use the configured monthly target.
    // Option B: Scale Annual Target by Month Days? 
    // User said: "no anual somo op 9,5 com o 21,5". This suggests the Annual Target Accumulator is built by summing monthly targets?
    // Let's assume the "Meta Mensal" in Config IS the target for a standard month, OR the user wants us to calculate it.
    // Given the request, it's safer to use the Configured Meta Mensal as the "Goal for this Month" but use the working days to calculate the "Media Diaria Necessaria".
    // Wait, if Jan has 9.5 days, the goal should be lower than a month with 22 days?
    // "dia util deve acompanahr ao calendario" -> implies Target IS variable.
    // Let's calculate a "Daily Capacity" from the Annual Goal and apply it?
    // DailyCapacity = MetaAnual / TotalWorkingDaysYear.
    // TargetThisMonth = DailyCapacity * WorkingDaysThisMonth.

    const dailyCapacity = stats.workingDaysYear > 0 ? (stats.metaAnual / stats.workingDaysYear) : 0;
    const dynamicMetaMensal = Math.round(dailyCapacity * stats.workingDaysMonth);

    // Update the UI variables
    const metaMensal = dynamicMetaMensal; // Use calculated dynamic meta
    const atendidoMensal = producaoAtualMensal;
    const pctMensal = metaMensal > 0 ? (atendidoMensal / metaMensal) * 100 : 0;
    const dataMensal = [{ name: "Atendido", value: atendidoMensal }, { name: "Restante", value: Math.max(0, metaMensal - atendidoMensal) }];

    const metaAnual = stats.metaAnual;
    // Atendido anual = valor fechado até mês anterior + produção do mês atual
    const atendidoAnual = stats.valorFechadoAnterior + producaoAtualMensal;
    const pctAnual = metaAnual > 0 ? (atendidoAnual / metaAnual) * 100 : 0;
    const dataAnual = [{ name: "Atendido", value: atendidoAnual }, { name: "Restante", value: Math.max(0, metaAnual - atendidoAnual) }];

    const COLORS = ["#83e0b6", "#e2e8f0"];

    // Pacing Calculations
    const mediaDiariaAtual = 24510; // Mock from previous code
    const daysPassed = 10; // Mock or calculate
    const remainingDays = Math.max(0, stats.workingDaysMonth - daysPassed); // Approximation
    const mediaNecessaria = remainingDays > 0 ? (metaMensal - atendidoMensal) / remainingDays : 0;

    // Annual Pacing
    const mediaAnualNecessaria = (metaAnual - atendidoAnual) / (stats.workingDaysYear > 0 ? stats.workingDaysYear : 1); // Simplified

    // Daily Table Data
    const dailyDataRaw = [
        { date: "2026-01-27", prod: "13.272", fat: "14.953", vend: "12.098", status: "down", prodNum: 13272, fatNum: 14953, vendNum: 12098 },
        { date: "2026-01-26", prod: "21.775", fat: "54.043", vend: "14.260", status: "down", prodNum: 21775, fatNum: 54043, vendNum: 14260 },
        { date: "2026-01-24", prod: "817", fat: "0", vend: "552", status: "down", prodNum: 817, fatNum: 0, vendNum: 552 },
        { date: "2026-01-23", prod: "25.231", fat: "857", vend: "17.052", status: "down", prodNum: 25231, fatNum: 857, vendNum: 17052 },
        { date: "2026-01-22", prod: "26.810", fat: "33.849", vend: "12.008", status: "down", prodNum: 26810, fatNum: 33849, vendNum: 12008 },
        { date: "2026-01-21", prod: "30.783", fat: "844", vend: "28.608", status: "neutral", prodNum: 30783, fatNum: 844, vendNum: 28608 },
        { date: "2026-01-20", prod: "24.973", fat: "17.535", vend: "35.257", status: "down", prodNum: 24973, fatNum: 17535, vendNum: 35257 },
        { date: "2026-01-18", prod: "359", fat: "0", vend: "0", status: "down", prodNum: 359, fatNum: 0, vendNum: 0 },
        { date: "2026-01-15", prod: "2.083", fat: "0", vend: "22.212", status: "down", prodNum: 2083, fatNum: 0, vendNum: 22212 },
        { date: "2026-01-14", prod: "4.153", fat: "28.180", vend: "29.209", status: "down", prodNum: 4153, fatNum: 28180, vendNum: 29209 },
    ];

    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const sortedDailyData = [...dailyDataRaw].sort((a: any, b: any) => {
        if (!sortConfig) return 0;
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    const formatDate = (dateStr: string) => {
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}`;
    };

    // Bar Chart Data (Prod x Venda x Fat)
    // Bar Chart Data (Prod x Venda x Fat)
    const chartData = [
        { name: 'Prensa', value: 4000, fill: '#a8e6cf' },
        { name: 'Injetora', value: 2400, fill: '#ffd3b6' },
        { name: 'Fat.', value: 27179, fill: '#ffd3b6' },
    ];

    return (
        <div className="flex flex-col h-full w-full gap-4 p-4 overflow-auto xl:overflow-hidden font-sans">

            {/* ================= TOP SECTION (42%) ================= */}
            <div className="h-auto xl:h-[42%] flex flex-col xl:flex-row w-full gap-4 shrink-0">

                {/* MENSAL SECTION */}
                <div className="w-full xl:flex-1 flex flex-col xl:flex-row gap-4 pr-0 xl:pr-4 border-r-0 xl:border-r border-border/50">
                    <div className="w-full xl:w-[300px] 2xl:w-[340px] grid grid-cols-2 sm:grid-cols-3 xl:flex xl:flex-col gap-2 xl:gap-3 shrink-0 h-auto xl:h-full justify-center">
                        <div className="bg-card/90 backdrop-blur rounded-xl p-2 xl:p-4 text-[#374151] shadow-lg border-l-4 border-[#ff8b94] relative overflow-hidden group flex-1 flex flex-col justify-center min-h-[80px] xl:min-h-[100px]">
                            <div className="absolute top-0 right-0 p-2 xl:p-3 opacity-10"><Target className="w-8 h-8 xl:w-12 xl:h-12" /></div>
                            <div className="relative z-10 flex flex-col">
                                <span className="font-semibold text-xs xl:text-sm opacity-80 mb-0 xl:mb-1 uppercase tracking-wider">Falta Meta Mensal</span>
                                <span className="text-2xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight drop-shadow-lg text-[#374151]">106.293</span>
                            </div>
                        </div>
                        <div className="bg-card/90 backdrop-blur rounded-xl p-2 xl:p-4 text-[#374151] shadow-lg border-l-4 border-destructive relative overflow-hidden group flex-1 flex flex-col justify-center min-h-[80px] xl:min-h-[100px]">
                            <div className="absolute top-0 right-0 p-2 xl:p-3 opacity-10"><TrendingDown className="w-8 h-8 xl:w-12 xl:h-12" /></div>
                            <div className="relative z-10 flex flex-col">
                                <span className="font-semibold text-xs xl:text-sm opacity-80 mb-0 xl:mb-1 uppercase tracking-wider">Média Produção Atual</span>
                                <span className="text-2xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight drop-shadow-lg text-[#374151]">24.510</span>
                            </div>
                        </div>
                        <div className="bg-card/90 backdrop-blur rounded-xl p-2 xl:p-4 text-[#374151] shadow-lg border-l-4 border-[#a8e6cf] relative overflow-hidden group flex-1 flex flex-col justify-center min-h-[80px] xl:min-h-[100px]">
                            <div className="absolute top-0 right-0 p-2 xl:p-3 opacity-10"><TrendingUp className="w-8 h-8 xl:w-12 xl:h-12" /></div>
                            <div className="relative z-10 flex flex-col">
                                <span className="font-semibold text-xs xl:text-sm opacity-80 mb-0 xl:mb-1 uppercase tracking-wider">Média Prod. Necessária</span>
                                <span className="text-2xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight drop-shadow-lg text-[#374151]">42.517</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-md border border-border overflow-hidden flex flex-col h-[280px] xl:h-auto">
                        <div className="bg-[#a8e6cf] text-[#374151] p-1 xl:p-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 tracking-widest shadow-md z-10">
                            <Clock className="w-4 h-4 xl:w-5 xl:h-5 text-[#374151]" /> Meta de Produção Mensal - 01/2026
                        </div>
                        <div className="bg-muted/50 border-b border-border p-1 xl:p-2 flex justify-between px-2 xl:px-4 text-muted-foreground">
                            <div className="text-center"><span className="text-[10px] xl:text-xs font-bold uppercase text-muted-foreground block">Dias Úteis</span><span className="text-xl xl:text-3xl font-bold text-foreground">{stats.workingDaysMonth}</span></div>
                            <div className="text-center"><span className="text-[10px] xl:text-xs font-bold uppercase text-muted-foreground block">Realizados</span><span className="text-xl xl:text-3xl font-bold text-foreground">6.5</span></div>
                            <div className="text-center"><span className="text-[10px] xl:text-xs font-bold uppercase text-muted-foreground block">Restantes</span><span className="text-xl xl:text-3xl font-bold text-foreground">2.5</span></div>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center p-2 xl:p-4">
                            {/* Simple SVG Circular Gauge */}
                            <div className="relative w-28 h-28 xl:w-36 xl:h-36">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                                    <circle
                                        cx="50" cy="50" r="42" fill="none" stroke="#a8e6cf" strokeWidth="12"
                                        strokeDasharray={`${Math.min(pctMensal, 100) * 2.64} 264`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl xl:text-3xl font-black text-primary">{Math.round(pctMensal)}%</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center text-sm xl:text-base leading-tight mt-2">
                                <div className="text-foreground font-bold">Meta: <span className="text-primary">{metaMensal.toLocaleString('pt-BR')}</span></div>
                                <div className="text-foreground font-bold">Atendido: <span className="text-green-600">{atendidoMensal.toLocaleString('pt-BR')}</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ANUAL SECTION */}
                <div className="w-full xl:flex-1 flex flex-col xl:flex-row gap-4 pl-0 xl:pl-2">
                    <div className="w-full xl:w-[300px] 2xl:w-[340px] grid grid-cols-2 sm:grid-cols-3 xl:flex xl:flex-col gap-3 shrink-0 h-auto xl:h-full justify-center">
                        <div className="bg-card/90 backdrop-blur rounded-xl p-2 xl:p-4 text-[#374151] shadow-lg border-l-4 border-[#ff8b94] relative overflow-hidden group flex-1 flex flex-col justify-center min-h-[80px] xl:min-h-[100px]">
                            <div className="absolute top-0 right-0 p-2 xl:p-3 opacity-10"><Target className="w-8 h-8 xl:w-12 xl:h-12" /></div>
                            <div className="relative z-10 flex flex-col">
                                <span className="font-semibold text-xs xl:text-sm opacity-80 mb-0 xl:mb-1 uppercase tracking-wider">Falta Meta Anual</span>
                                <span className="text-2xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight drop-shadow-lg text-[#374151]">8.200.000</span>
                            </div>
                        </div>
                        <div className="bg-card/90 backdrop-blur rounded-xl p-2 xl:p-4 text-[#374151] shadow-lg border-l-4 border-[#ffd3b6] relative overflow-hidden group flex-1 flex flex-col justify-center min-h-[80px] xl:min-h-[100px]">
                            <div className="absolute top-0 right-0 p-2 xl:p-3 opacity-10"><ArrowDown className="w-8 h-8 xl:w-12 xl:h-12" /></div>
                            <div className="relative z-10 flex flex-col">
                                <span className="font-semibold text-xs xl:text-sm opacity-80 mb-0 xl:mb-1 uppercase tracking-wider">Média Prod. Anual Atual</span>
                                <span className="text-2xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight drop-shadow-lg text-[#374151]">0</span>
                            </div>
                        </div>
                        <div className="bg-card/90 backdrop-blur rounded-xl p-2 xl:p-4 text-[#374151] shadow-lg border-l-4 border-[#a8e6cf] relative overflow-hidden group flex-1 flex flex-col justify-center min-h-[80px] xl:min-h-[100px]">
                            <div className="absolute top-0 right-0 p-2 xl:p-3 opacity-10"><ArrowUp className="w-8 h-8 xl:w-12 xl:h-12" /></div>
                            <div className="relative z-10 flex flex-col">
                                <span className="font-semibold text-xs xl:text-sm opacity-80 mb-0 xl:mb-1 uppercase tracking-wider">Média Prod. Anual Necessária</span>
                                <span className="text-2xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight drop-shadow-lg text-[#374151]">36.937</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-md border border-border overflow-hidden flex flex-col h-[280px] xl:h-auto">
                        <div className="bg-[#a8e6cf] text-[#374151] p-1 xl:p-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 tracking-widest shadow-md z-10">
                            <Clock className="w-4 h-4 xl:w-5 xl:h-5 text-[#374151]" /> Meta de Produção Anual - 2026
                        </div>
                        <div className="bg-muted/50 border-b border-border p-1 xl:p-2 flex justify-between px-2 xl:px-4 text-muted-foreground">
                            <div className="text-center"><span className="text-[10px] xl:text-xs font-bold uppercase text-muted-foreground block">Dias Úteis</span><span className="text-xl xl:text-3xl font-bold text-foreground">{stats.workingDaysYear}</span></div>
                            <div className="text-center"><span className="text-[10px] xl:text-xs font-bold uppercase text-muted-foreground block">Realizados</span><span className="text-xl xl:text-3xl font-bold text-foreground">0</span></div>
                            <div className="text-center"><span className="text-[10px] xl:text-xs font-bold uppercase text-muted-foreground block">Restantes</span><span className="text-xl xl:text-3xl font-bold text-foreground">222</span></div>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center p-2 xl:p-4">
                            {/* Simple SVG Circular Gauge */}
                            <div className="relative w-28 h-28 xl:w-36 xl:h-36">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                                    <circle
                                        cx="50" cy="50" r="42" fill="none" stroke="#dcedc1" strokeWidth="12"
                                        strokeDasharray={`${Math.min(pctAnual, 100) * 2.64} 264`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl xl:text-3xl font-black text-primary">{Math.round(pctAnual)}%</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center text-sm xl:text-base leading-tight mt-2">
                                <div className="text-foreground font-bold">Meta: <span className="text-primary">{metaAnual.toLocaleString('pt-BR')}</span></div>
                                <div className="text-foreground font-bold">Atendido: <span className="text-green-600">{atendidoAnual.toLocaleString('pt-BR')}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= BOTTOM SECTION (58%) ================= */}
            <div className="flex-1 flex flex-col xl:flex-row w-full gap-4 min-h-0 h-auto">

                {/* COLUMN 1: Acompanhamento Diário Table (Larger Width) */}
                <div className="w-full xl:w-[35%] bg-card/95 backdrop-blur rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-[400px] xl:h-auto">
                    <div className="bg-[#a8e6cf] text-[#374151] py-1 xl:py-2 px-2 xl:px-4 grid grid-cols-4 gap-2 font-bold text-[10px] xl:text-xs uppercase items-center sticky top-0 z-20 tracking-wide shadow-md cursor-pointer">
                        <div className="flex items-center justify-center gap-2 hover:text-[#dcedc1] transition-colors" onClick={() => handleSort('date')}>
                            <Activity className="w-4 h-4 xl:w-5 xl:h-5 text-[#374151]" /> Data {sortConfig?.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#374151]" /> : <ArrowDown className="w-3 h-3 text-[#374151]" />)}
                        </div>
                        <div className="flex items-center justify-center gap-2 hover:text-[#dcedc1] transition-colors" onClick={() => handleSort('prodNum')}>
                            Prod {sortConfig?.key === 'prodNum' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#374151]" /> : <ArrowDown className="w-3 h-3 text-[#374151]" />)}
                        </div>
                        <div className="flex items-center justify-center gap-2 hover:text-[#dcedc1] transition-colors" onClick={() => handleSort('fatNum')}>
                            Fat {sortConfig?.key === 'fatNum' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#374151]" /> : <ArrowDown className="w-3 h-3 text-[#374151]" />)}
                        </div>
                        <div className="flex items-center justify-center gap-2 hover:text-[#dcedc1] transition-colors" onClick={() => handleSort('vendNum')}>
                            Vend {sortConfig?.key === 'vendNum' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-[#374151]" /> : <ArrowDown className="w-3 h-3 text-[#374151]" />)}
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-xs xl:text-base text-foreground">
                            <thead className="sr-only"> {/* Hidden header for accessibility, actual header is the div above */}
                                <tr>
                                    <th>Data</th>
                                    <th>Prod</th>
                                    <th>Fat</th>
                                    <th>Vend</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {sortedDailyData.map((row, i) => (
                                    <tr key={i} className={`hover:bg-primary/5 transition-colors ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                                        <td className="p-2 xl:p-3 text-center font-bold text-[#374151]">{formatDate(row.date)}</td>
                                        <td className="p-2 xl:p-3 text-center font-bold text-[#374151] flex items-center justify-center gap-2">
                                            {row.prod}
                                            {row.status === 'down' && <ArrowDown className="w-3 h-3 xl:w-4 xl:h-4 text-red-500" />}
                                            {row.status === 'neutral' && <Minus className="w-3 h-3 xl:w-4 xl:h-4 text-yellow-500" />}
                                        </td>
                                        <td className="p-2 xl:p-3 text-center font-medium text-[#374151]">{row.fat}</td>
                                        <td className="p-2 xl:p-3 text-center font-medium text-[#374151]">{row.vend}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* COLUMN 2: Middle Charts */}
                <div className="w-full xl:flex-1 flex flex-col gap-4 h-auto">
                    {/* TOP CHART: Média Prensa x Injetora */}
                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-[220px] xl:h-auto">
                        <div className="bg-[#a8e6cf] text-[#374151] py-1 xl:py-2 px-2 xl:px-3 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 tracking-wide shadow-md">
                            <BarChart3 className="w-4 h-4 xl:w-5 xl:h-5 text-[#374151]" /> Média Prensa x Injetora
                        </div>
                        <div className="flex-1 p-2 xl:p-4 flex flex-col justify-center gap-2 xl:gap-3">
                            {[
                                { label: 'Injetora Rei', val: '5.472', w: '30%', color: 'from-[#34d399] to-[#a8e6cf]' },
                                { label: 'Injetora Rubber', val: '7.682', w: '45%', color: 'from-[#a8e6cf] to-[#dcedc1]' },
                                { label: 'Prensa Rei', val: '8.282', w: '50%', color: 'from-[#dcedc1] to-[#ffd3b6]' },
                                { label: 'Prensa Rubber', val: '12.045', w: '80%', color: 'from-[#ffd3b6] to-[#ff8b94]' },
                            ].map((item, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    {item.label && <span className="w-24 xl:w-28 text-right text-[10px] xl:text-xs font-bold text-muted-foreground uppercase tracking-tight">{item.label}</span>}
                                    {!item.label && <span className="w-24 xl:w-28"></span>}
                                    <div style={{ width: item.w }} className={`h-6 xl:h-8 bg-gradient-to-r ${item.color} rounded-r-lg flex items-center px-2 text-[#374151] text-xs xl:text-base font-bold shadow-md`}>
                                        {item.val}
                                    </div>
                                </div>
                            ))}
                            <div className="mt-1 xl:mt-2 text-center text-xs xl:text-sm font-bold text-[#374151] border-t border-border pt-1 xl:pt-2">
                                Média Diária: <span className="text-[#374151] text-base xl:text-lg drop-shadow-sm">33.481</span>
                            </div>
                        </div>
                    </div>
                    {/* BOTTOM CHART: Média Prod x Venda x Fat */}
                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-[220px] xl:h-auto">
                        <div className="bg-[#a8e6cf] text-[#374151] py-1 px-3 text-center font-bold text-[10px] xl:text-lg uppercase tracking-wide shadow-md">
                            <BarChart3 className="w-4 h-4 xl:w-5 xl:h-5 inline-block mr-2 text-[#374151]" />
                            Média Prod x Venda x Fat
                        </div>
                        <div className="flex-1 p-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#374151', fontSize: 12, fontWeight: 700 }}
                                        dy={10}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(168, 230, 207, 0.2)' }}
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            borderRadius: '12px',
                                            border: '1px solid #a8e6cf',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                            padding: '12px'
                                        }}
                                        itemStyle={{ color: '#374151', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#0f3460', fontWeight: 'bold' }}
                                        formatter={(value: any) => value?.toLocaleString('pt-BR')}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        <LabelList dataKey="value" position="insideTop" offset={10} fill="#374151" fontSize={14} fontWeight="bold" formatter={(val: any) => val?.toLocaleString('pt-BR')} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* COLUMN 3: New Charts (Recebimento & Estoque) */}
                <div className="w-full xl:flex-1 flex flex-col gap-4 h-auto">

                    {/* CHART 1: Recebimento RAP */}
                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-[180px] xl:h-auto">
                        <div className="bg-[#a8e6cf] text-[#374151] py-1 xl:py-2 px-2 xl:px-3 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 tracking-wide shadow-md">
                            <Box className="w-4 h-4 xl:w-5 xl:h-5 text-[#374151]" /> Recebimento RAP
                        </div>
                        <div className="flex-1 p-2 xl:p-4 flex flex-col justify-center gap-3 xl:gap-5">
                            <div className="flex items-center gap-3">
                                <span className="w-16 text-right text-[10px] xl:text-xs font-bold text-[#374151] uppercase">Fundido</span>
                                <div className="flex-1 h-8 xl:h-12 bg-gradient-to-r from-[#34d399] to-[#a8e6cf] rounded-lg flex items-center justify-center text-[#374151] font-bold text-lg xl:text-2xl shadow-lg">
                                    44.693
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-16 text-right text-[10px] xl:text-xs font-bold text-[#374151] uppercase">Alumínio</span>
                                <div className="flex items-center gap-2 w-full">
                                    <div className="h-8 xl:h-12 w-[30%] bg-gradient-to-r from-[#a8e6cf] to-[#dcedc1] rounded-lg shadow-md"></div>
                                    <span className="text-[#374151] font-bold text-lg xl:text-2xl">15.883</span>
                                </div>
                            </div>
                            <div className="text-center font-bold text-[#374151] mt-0 xl:mt-1 uppercase text-xs xl:text-sm">
                                Total Recebido: <span className="text-xl xl:text-2xl text-[#374151] ml-1">60.576</span>
                            </div>
                        </div>
                    </div>

                    {/* CHART 2: Estoque Fund. x Alum. */}
                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-[180px] xl:h-auto">
                        <div className="bg-[#a8e6cf] text-[#374151] py-1 xl:py-2 px-2 xl:px-3 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 tracking-wide shadow-md">
                            <Layers className="w-4 h-4 xl:w-5 xl:h-5 text-[#374151]" /> Estoque Fund. x Alum.
                        </div>
                        <div className="flex-1 p-2 xl:p-4 flex flex-col justify-center gap-3 xl:gap-5">
                            <div className="flex items-center gap-3">
                                <span className="w-16 text-right text-[10px] xl:text-xs font-bold text-[#374151] uppercase">Fundido</span>
                                <div className="flex-1 h-8 xl:h-12 bg-gradient-to-r from-[#34d399] to-[#a8e6cf] rounded-lg flex items-center justify-center text-[#374151] font-bold text-lg xl:text-2xl shadow-lg">
                                    243.841
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-16 text-right text-[10px] xl:text-xs font-bold text-[#374151] uppercase">Alumínio</span>
                                <div className="flex items-center gap-2 w-full">
                                    <div className="h-8 xl:h-12 w-[20%] bg-gradient-to-r from-[#a8e6cf] to-[#dcedc1] rounded-lg shadow-md"></div>
                                    <span className="text-[#374151] font-bold text-lg xl:text-2xl">33.183</span>
                                </div>
                            </div>
                            <div className="text-center font-bold text-[#374151] mt-0 xl:mt-1 uppercase text-xs xl:text-sm">
                                Total Estoque: <span className="text-xl xl:text-2xl text-[#374151] ml-1">277.024</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    );
}
