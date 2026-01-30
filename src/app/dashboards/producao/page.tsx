"use client";

import { useState, useEffect } from "react";
import { Target, TrendingDown, TrendingUp, Clock, Activity, BarChart3, ArrowDown, ArrowUp, Minus, Box, Layers, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LabelList } from "recharts";
import { calculateWorkingDays } from "@/utils/paineis/calendar";
import { startOfYear, endOfYear, startOfMonth, endOfMonth, format, isSameMonth } from "date-fns";

import { createBrowserClient } from '@supabase/ssr';

export default function ProducaoPage() {
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { db: { schema: 'dashboards_pcp' } }
    );

    // State for Dynamic Data
    const [stats, setStats] = useState({
        metaMensal: 280000,
        metaAnual: 8200000,
        valorFechadoAnterior: 0,
        workingDaysMonth: 22,
        workingDaysYear: 250,
        realizedDaysMonth: 0,
        realizedDaysYear: 0,
        producaoMensal: 0,
        producaoAnual: 0,
        producaoMensalClosed: 0,
        producaoAnualClosed: 0,
        fatMensalClosed: 0,
        vendMensalClosed: 0
    } as any);

    const [syncTime, setSyncTime] = useState<string>("-");
    const [syncDate, setSyncDate] = useState<string>("-");

    const [holidays, setHolidays] = useState<string[]>([]);
    const [halfDays, setHalfDays] = useState<string[]>([]);
    const [dailyData, setDailyData] = useState<any[]>([]);

    const fmtNum = (n: number | undefined) => n ? n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0';

    const [estoqueRecebimento, setEstoqueRecebimento] = useState<any>(null); // Legacy, can remove
    const [estoqueFundicao, setEstoqueFundicao] = useState<any>(null);
    const [mediaPrensaInjetora, setMediaPrensaInjetora] = useState<any>(null);

    // Calculate Max values for Bars scaling
    const maxRecebido = Math.max((estoqueFundicao?.recebido_fundido || 0), (estoqueFundicao?.recebido_aluminio || 0), 1);
    const maxEstoque = Math.max((estoqueFundicao?.fundido || estoqueFundicao?.estoque_fundido || 0), (estoqueFundicao?.aluminio || estoqueFundicao?.estoque_aluminio || 0), 1);

    // Chart Data State for Media Prensa Injetora
    const [mediaPrensaChartData, setMediaPrensaChartData] = useState([
        { name: 'Injetora Rei', value: 0, fill: '#3b82f6' }, // Blue 500
        { name: 'Injetora Rubber', value: 0, fill: '#60a5fa' }, // Blue 400
        { name: 'Prensa Rei', value: 0, fill: '#22c55e' }, // Green 500
        { name: 'Prensa Rubber', value: 0, fill: '#86efac' }, // Green 300
    ]);

    // Initial Data Load
    useEffect(() => {
        const loadData = async () => {
            // 0. Fetch Config / Sync Time
            const { data: configData } = await supabase.schema('dashboards_pcp').from('config').select('*').limit(1).single();
            if (configData) {
                // ... config logic
                const lastSync = configData.last_sync ? new Date(configData.last_sync) : new Date();
                setSyncDate(lastSync.toLocaleDateString('pt-BR'));
                setSyncTime(lastSync.toLocaleTimeString('pt-BR'));
            }

            // 0.5 Fetch Estoque Fundicao (contains both Estoque and Recebimento data)
            const { data: estData } = await supabase.schema('dashboards_pcp').from('estoque_fundicao').select('*').order('id', { ascending: false }).limit(1).single();
            if (estData) setEstoqueFundicao(estData);

            // 0.6 Fetch Media Prensa Injetora
            const { data: mediaPI } = await supabase.schema('dashboards_pcp').from('media_prensa_injetora').select('*').order('id', { ascending: false }).limit(1).single();
            setMediaPrensaInjetora(mediaPI);

            // 1. Fetch Holidays & Half Days
            const { data: calData } = await supabase
                .schema('dashboards_pcp')
                .from('calendario_prod')
                .select('*');

            if (calData) {
                const holidaysList = calData.filter((d: any) => d.type === 'feriado').map((d: any) => d.date);
                const halfDaysList = calData.filter((d: any) => d.type === 'meio_dia').map((d: any) => d.date);
                setHolidays(holidaysList);
                setHalfDays(halfDaysList);
            }

            // 1.1 Calculate Realized Days from calendario_prod
            // IMPORTANT: Calendar only contains EXCEPTIONS (holidays/vacations)
            // Logic: Count all weekdays (Mon-Fri) until YESTERDAY, excluding calendar holidays
            let realizedMonthDB = 0;
            let realizedYearDB = 0;
            const today = new Date();
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

            // Create Sets of exception dates for fast lookup
            const holidayDates = new Set<string>();
            const halfDayDates = new Set<string>();

            if (calData) {
                calData.forEach((d: any) => {
                    if (d.type === 'feriado') {
                        holidayDates.add(d.date);
                    } else if (d.type === 'meio_periodo') {
                        halfDayDates.add(d.date);
                    }
                });
            }



            // Count working days for MONTH (from month start to yesterday)
            const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
            for (let d = new Date(monthStart); d < todayStart; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay();
                const dateStr = d.toISOString().split('T')[0];

                if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends
                if (holidayDates.has(dateStr)) continue; // Skip holidays

                realizedMonthDB += halfDayDates.has(dateStr) ? 0.5 : 1;
            }

            // Count working days for YEAR (from year start to yesterday)
            const yearStart = new Date(today.getFullYear(), 0, 1);
            for (let d = new Date(yearStart); d < todayStart; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay();
                const dateStr = d.toISOString().split('T')[0];

                if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends
                if (holidayDates.has(dateStr)) continue; // Skip holidays

                realizedYearDB += halfDayDates.has(dateStr) ? 0.5 : 1;
            }



            // 2. Production Data (Acompanhamento Diario)
            const { data: prodData } = await supabase
                .schema('dashboards_pcp')
                .from('acompanhamento_diario')
                .select('*');

            let prodMensal = 0;
            let prodAnual = 0;
            let prodMensalClosed = 0;
            let prodAnualClosed = 0;
            let fatMensalClosed = 0;
            let vendMensalClosed = 0;
            const now = new Date();
            const nowStartOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            if (prodData) {
                prodData.forEach((item: any) => {
                    // Dates in DB are YYYY-MM-DD
                    const itemDate = new Date(item.data + 'T12:00:00'); // Safe parse

                    // Sum Annual
                    const isToday = itemDate.getDate() === now.getDate() &&
                        itemDate.getMonth() === now.getMonth() &&
                        itemDate.getFullYear() === now.getFullYear();

                    // Sum Annual
                    if (itemDate.getFullYear() === now.getFullYear()) {
                        const val = Number(item.prod || 0);
                        const valFat = Number(item.fat || 0);
                        const valVend = Number(item.vend || 0);

                        prodAnual += val;
                        // Sum Annual Closed (Exclude Today)
                        if (itemDate < nowStartOfDay) {
                            prodAnualClosed += val;
                        }

                        // Sum Monthly
                        if (isSameMonth(itemDate, now)) {
                            prodMensal += val;
                            // Sum Monthly Closed (Exclude Today)
                            if (itemDate < nowStartOfDay) {
                                prodMensalClosed += val;
                                fatMensalClosed += valFat;
                                vendMensalClosed += valVend;
                            }
                        }
                    }
                });

                // Sort by date Descending for the table
                const sortedProdData = prodData.sort((a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime());

                // Process for Table (Add status? Compare with previous day?)
                const processedDaily = sortedProdData.map((item: any, idx: number) => {
                    // Simple status logic: Compare with next item (which is previous date in desc list)
                    // OR just random/static as user didn't specify logic?
                    // User image shows down arrows. 
                    // Let's implement basic comparison with previous day logic if possible.
                    // But simplest is just map raw values.
                    // Note: user said "nao esta trazendo todos valores".

                    // Status Logic: < 30k (Red/Down), 30k-33k (Yellow/Neutral), > 33k (Green/Up)
                    const val = Number(item.prod);
                    let status = 'neutral';
                    if (val < 30000) status = 'down';
                    else if (val > 33000) status = 'up';
                    else status = 'neutral';

                    return {
                        date: item.data, // YYYY-MM-DD
                        prod: fmtNum(item.prod),
                        fat: fmtNum(item.fat),
                        vend: fmtNum(item.vend),
                        prodNum: Number(item.prod),
                        fatNum: Number(item.fat),
                        vendNum: Number(item.vend),
                        status: status
                    };
                });
                setDailyData(processedDaily);
            }

            // Load Configuration for Metas (Fetch from DB: metas table)
            const { data: metasData } = await supabase
                .schema('dashboards_pcp')
                .from('metas')
                .select('*')
                .order('id', { ascending: false })
                .limit(1)
                .single();

            const metasDB = metasData;
            const savedMetas = JSON.parse(localStorage.getItem("pd_metas") || "{}");

            // Working Days Logic
            // ... (keep existing logic but move here to centralize if cleaner, 
            // but for now keeping separate effect is fine, or merging)
            setStats((prev: any) => ({
                ...prev,
                producaoMensal: prodMensal,
                producaoAnual: prodAnual,
                producaoMensalClosed: prodMensalClosed,
                producaoAnualClosed: prodAnualClosed,
                fatMensalClosed: fatMensalClosed,
                vendMensalClosed: vendMensalClosed,
                metaMensal: metasDB?.meta_producao_mensal || 280000,
                metaAnual: metasDB?.meta_producao_anual || 8200000,
                valorFechadoAnterior: metasDB.valor_fechado_anterior || 0,
                realizedDaysMonth: realizedMonthDB,
                realizedDaysYear: realizedYearDB,
            }));

            if (mediaPI) {
                const safeDays = Math.max(1, realizedMonthDB); // Use realizedMonthDB calculated above
                setMediaPrensaChartData([
                    { name: 'Injetora Rei', value: Math.round((Number(mediaPI.injetora_rei) || 0) / safeDays), fill: '#3b82f6' },
                    { name: 'Injetora Rubber', value: Math.round((Number(mediaPI.injetora_rubber) || 0) / safeDays), fill: '#60a5fa' },
                    { name: 'Prensa Rei', value: Math.round((Number(mediaPI.prensa_rei) || 0) / safeDays), fill: '#22c55e' },
                    { name: 'Prensa Rubber', value: Math.round((Number(mediaPI.prensa_rubber) || 0) / safeDays), fill: '#86efac' },
                ]);
            }

            // Set Sync Time
            const nowTime = new Date();
            setSyncDate(nowTime.toLocaleDateString('pt-BR'));
            setSyncTime(nowTime.toLocaleTimeString('pt-BR'));
        };

        loadData();

        // Polling: atualiza a cada 1 minuto
        const interval = setInterval(() => {
            loadData(); // Recarrega dados em background
        }, 60000);

        return () => {
            clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on mount


    useEffect(() => {
        const now = new Date();

        // 1. Calculate Working Days for FULL YEAR
        const yearStart = startOfYear(now);
        const yearEnd = endOfYear(now);
        const totalWorkingDaysYear = calculateWorkingDays(yearStart, yearEnd, holidays, halfDays, []);

        // 2. Calculate Working Days for CURRENT MONTH
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const totalWorkingDaysMonth = calculateWorkingDays(monthStart, monthEnd, holidays, halfDays, []);

        // 3. Update Working Days in State (Preserve other stats like Meta/Prod from proper loadData)
        setStats((prev: any) => ({
            ...prev,
            workingDaysMonth: totalWorkingDaysMonth,
            workingDaysYear: totalWorkingDaysYear,
        }));
    }, [holidays, halfDays]); // Re-run when calendar data loads

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

    // Use configured annual meta for daily capacity calc if needed, but for monthly target use DB value directly as requested.
    const metaMensal = stats.metaMensal;
    const atendidoMensal = stats.producaoMensal;
    const pctMensal = metaMensal > 0 ? (atendidoMensal / metaMensal) * 100 : 0;
    const dataMensal = [{ name: "Atendido", value: atendidoMensal }, { name: "Restante", value: Math.max(0, metaMensal - atendidoMensal) }];

    const metaAnual = stats.metaAnual;
    // Atendido anual = Soma Produção Anual (Calculada do Banco) + Valor Fechado Anterior (Metas DB)
    const atendidoAnual = stats.producaoAnual + stats.valorFechadoAnterior;
    const pctAnual = metaAnual > 0 ? (atendidoAnual / metaAnual) * 100 : 0;
    const dataAnual = [{ name: "Atendido", value: atendidoAnual }, { name: "Restante", value: Math.max(0, metaAnual - atendidoAnual) }];

    const COLORS = ["#83e0b6", "#e2e8f0"];

    // Pacing Calculations
    const daysPassed = stats.realizedDaysMonth;
    const remainingDays = Math.max(0, stats.workingDaysMonth - daysPassed);
    const mediaNecessaria = remainingDays > 0 ? (metaMensal - atendidoMensal) / remainingDays : 0;

    const mediaAnualNecessaria = (metaAnual - atendidoAnual) / (stats.workingDaysYear > 0 ? stats.workingDaysYear : 1); // Simplified

    // Dynamic Averages (Using CLOSED Data: Up to Yesterday)
    const mediaMensalAtual = stats.realizedDaysMonth > 0 ? stats.producaoMensalClosed / stats.realizedDaysMonth : 0;
    const mediaAnualAtual = stats.realizedDaysYear > 0 ? stats.producaoAnualClosed / stats.realizedDaysYear : 0;

    // Logic for Colors & Icons
    const MediaIconMensal = mediaMensalAtual >= mediaNecessaria ? CheckCircle2 : XCircle;
    const statusMensalColor = mediaMensalAtual >= mediaNecessaria ? 'bg-[#22c55e]' : 'bg-[#ef4444]';

    const MediaIconAnual = mediaAnualAtual >= mediaAnualNecessaria ? CheckCircle2 : XCircle;
    const statusAnualColor = mediaAnualAtual >= mediaAnualNecessaria ? 'bg-[#22c55e]' : 'bg-[#ef4444]';

    // Daily Table Data
    // Daily Table Data (Use State `dailyData`)
    // If state is empty, use empty list.
    const dailyDataRaw = dailyData;

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
    // Chart Data (Prod x Venda x Fat) using calculated averages
    const mediaFatAtual = stats.realizedDaysMonth > 0 ? stats.fatMensalClosed / stats.realizedDaysMonth : 0;
    const mediaVendAtual = stats.realizedDaysMonth > 0 ? stats.vendMensalClosed / stats.realizedDaysMonth : 0;

    const chartData = [
        { name: 'Prod', value: Math.round(mediaMensalAtual), fill: '#3b82f6' },
        { name: 'Vend', value: Math.round(mediaVendAtual), fill: '#22c55e' },
        { name: 'Fat.', value: Math.round(mediaFatAtual), fill: '#60a5fa' },
    ];



    return (
        <div className={`min-h-screen xl:h-screen w-full bg-[#f8f9fa] text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-y-auto xl:overflow-hidden flex flex-col pb-20 xl:pb-0`}>

            {/* ================= TOP SECTION (38%) ================= */}
            <div className="h-auto xl:h-[38%] flex flex-col xl:flex-row w-full gap-4 shrink-0 p-4">

                {/* MENSAL SECTION */}
                <div className="w-full xl:flex-1 flex flex-col xl:flex-row gap-4 pr-0 xl:pr-4 border-r-0 xl:border-r border-border/50">
                    <div className="w-full xl:w-[300px] 2xl:w-[340px] grid grid-cols-2 sm:grid-cols-3 xl:flex xl:flex-col gap-2 xl:gap-3 shrink-0 h-auto xl:h-full justify-center">
                        <div className="bg-[#2563eb] rounded-xl p-1 xl:p-2 text-white shadow-lg relative overflow-hidden group flex-1 flex flex-col justify-center min-h-[40px] xl:min-h-[50px]">
                            <div className="absolute top-0 right-0 p-2 xl:p-3 opacity-20"><Target className="w-8 h-8 xl:w-12 xl:h-12 text-white" /></div>
                            <div className="relative z-10 flex flex-col">
                                <span className="font-semibold text-xs xl:text-sm opacity-90 mb-0 xl:mb-1 uppercase tracking-wider text-white">Falta Meta Mensal</span>
                                <span className="text-2xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight drop-shadow-md text-white">{fmtNum(Math.max(0, metaMensal - atendidoMensal))}</span>
                            </div>
                        </div>
                        <div className="bg-[#3b82f6] rounded-xl p-1 xl:p-2 text-white shadow-lg relative overflow-hidden group flex-1 flex flex-col justify-center min-h-[40px] xl:min-h-[50px]">
                            <div className="absolute top-0 right-0 p-2 xl:p-3 opacity-20"><TrendingDown className="w-8 h-8 xl:w-12 xl:h-12 text-white" /></div>
                            <div className="relative z-10 flex flex-col">
                                <span className="font-semibold text-xs xl:text-sm opacity-90 mb-0 xl:mb-1 uppercase tracking-wider text-white">Média Prod. Atual</span>
                                <span className="text-2xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight drop-shadow-md text-white">{fmtNum(mediaMensalAtual)}</span>
                            </div>
                        </div>
                        <div className={`${statusMensalColor} rounded-xl p-1 xl:p-2 text-white shadow-lg relative overflow-hidden group flex-1 flex flex-col justify-center min-h-[40px] xl:min-h-[50px] transition-colors duration-500`}>
                            <div className="absolute top-0 right-0 p-2 xl:p-3 opacity-20"><MediaIconMensal className="w-8 h-8 xl:w-12 xl:h-12 text-white" /></div>
                            <div className="relative z-10 flex flex-col">
                                <span className="font-semibold text-xs xl:text-sm opacity-90 mb-0 xl:mb-1 uppercase tracking-wider text-white">Média Prod. Necessária</span>
                                <span className="text-2xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight drop-shadow-md text-white">{fmtNum(mediaNecessaria)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-md border border-border overflow-hidden flex flex-col h-[280px] xl:h-auto">
                        <div className="bg-[#2563eb] text-white p-1 xl:p-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 tracking-widest shadow-md z-10">
                            <Clock className="w-4 h-4 xl:w-5 xl:h-5 text-white" /> Meta de Produção Mensal - 01/2026
                        </div>
                        <div className="bg-muted/50 border-b border-border p-1 xl:p-2 flex justify-between px-2 xl:px-4 text-muted-foreground">
                            <div className="text-center"><span className="text-[10px] xl:text-xs font-bold uppercase text-muted-foreground block">Dias Úteis</span><span className="text-xl xl:text-3xl font-bold text-[#374151]">{stats.workingDaysMonth}</span></div>
                            <div className="text-center"><span className="text-[10px] xl:text-xs font-bold uppercase text-muted-foreground block">Realizados</span><span className="text-xl xl:text-3xl font-bold text-foreground">{stats.realizedDaysMonth}</span></div>
                            <div className="text-center"><span className="text-[10px] xl:text-xs font-bold uppercase text-muted-foreground block">Restantes</span><span className="text-xl xl:text-3xl font-bold text-foreground">{Math.max(0, stats.workingDaysMonth - stats.realizedDaysMonth).toFixed(1)}</span></div>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center p-2 xl:p-4">
                            {/* Simple SVG Circular Gauge */}
                            <div className="relative w-32 h-32 xl:w-40 xl:h-40">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                                    <circle
                                        cx="50" cy="50" r="42" fill="none" stroke="#2563eb" strokeWidth="12"
                                        strokeDasharray={`${Math.min(pctMensal, 100) * 2.64} 264`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl xl:text-3xl font-black text-[#374151]">{Math.round(pctMensal)}%</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center text-base xl:text-lg leading-tight mt-2">
                                <div className="text-foreground font-bold">Meta: <span className="text-[#374151] text-lg xl:text-xl">{fmtNum(metaMensal)}</span></div>
                                <div className="text-foreground font-bold">Atendido: <span className="text-blue-600 text-lg xl:text-xl">{fmtNum(atendidoMensal)}</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ANUAL SECTION */}
                <div className="w-full xl:flex-1 flex flex-col xl:flex-row gap-4 pl-0 xl:pl-2">
                    <div className="w-full xl:w-[300px] 2xl:w-[340px] grid grid-cols-2 sm:grid-cols-3 xl:flex xl:flex-col gap-3 shrink-0 h-auto xl:h-full justify-center">
                        <div className="bg-[#2563eb] rounded-xl p-1 xl:p-2 text-white shadow-lg relative overflow-hidden group flex-1 flex flex-col justify-center min-h-[40px] xl:min-h-[50px]">
                            <div className="absolute top-0 right-0 p-2 xl:p-3 opacity-20"><Target className="w-8 h-8 xl:w-12 xl:h-12 text-white" /></div>
                            <div className="relative z-10 flex flex-col">
                                <span className="font-semibold text-xs xl:text-sm opacity-90 mb-0 xl:mb-1 uppercase tracking-wider text-white">Falta Meta Anual</span>
                                <span className="text-2xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight drop-shadow-md text-white">{fmtNum(Math.max(0, metaAnual - atendidoAnual))}</span>
                            </div>
                        </div>
                        <div className="bg-[#3b82f6] rounded-xl p-1 xl:p-2 text-white shadow-lg relative overflow-hidden group flex-1 flex flex-col justify-center min-h-[40px] xl:min-h-[50px]">
                            <div className="absolute top-0 right-0 p-2 xl:p-3 opacity-20"><TrendingDown className="w-8 h-8 xl:w-12 xl:h-12 text-white" /></div>
                            <div className="relative z-10 flex flex-col">
                                <span className="font-semibold text-xs xl:text-sm opacity-90 mb-0 xl:mb-1 uppercase tracking-wider text-white">Média Prod. Anual Atual</span>
                                <span className="text-2xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight drop-shadow-md text-white">{fmtNum(mediaAnualAtual)}</span>
                            </div>
                        </div>
                        <div className={`${statusAnualColor} rounded-xl p-1 xl:p-2 text-white shadow-lg relative overflow-hidden group flex-1 flex flex-col justify-center min-h-[40px] xl:min-h-[50px] transition-colors duration-500`}>
                            <div className="absolute top-0 right-0 p-2 xl:p-3 opacity-20"><MediaIconAnual className="w-8 h-8 xl:w-12 xl:h-12 text-white" /></div>
                            <div className="relative z-10 flex flex-col">
                                <span className="font-semibold text-xs xl:text-sm opacity-90 mb-0 xl:mb-1 uppercase tracking-wider text-white">Média Prod. Anual Necessária</span>
                                <span className="text-2xl xl:text-4xl 2xl:text-5xl font-bold tracking-tight drop-shadow-md text-white">{fmtNum(mediaAnualNecessaria)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-md border border-border overflow-hidden flex flex-col h-[280px] xl:h-auto">
                        <div className="bg-[#2563eb] text-white p-1 xl:p-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 tracking-widest shadow-md z-10">
                            <Clock className="w-4 h-4 xl:w-5 xl:h-5 text-white" /> Meta de Produção Anual - 2026
                        </div>
                        <div className="bg-muted/50 border-b border-border p-1 xl:p-2 flex justify-between px-2 xl:px-4 text-muted-foreground">
                            <div className="text-center"><span className="text-[10px] xl:text-xs font-bold uppercase text-muted-foreground block">Dias Úteis</span><span className="text-xl xl:text-3xl font-bold text-[#374151]">{stats.workingDaysYear}</span></div>
                            <div className="text-center"><span className="text-[10px] xl:text-xs font-bold uppercase text-muted-foreground block">Realizados</span><span className="text-xl xl:text-3xl font-bold text-foreground">{stats.realizedDaysYear}</span></div>
                            <div className="text-center"><span className="text-[10px] xl:text-xs font-bold uppercase text-muted-foreground block">Restantes</span><span className="text-xl xl:text-3xl font-bold text-foreground">{Math.max(0, stats.workingDaysYear - stats.realizedDaysYear)}</span></div>
                        </div>
                        <div className="flex-1 flex flex-col items-center justify-center p-2 xl:p-4">
                            {/* Simple SVG Circular Gauge */}
                            <div className="relative w-32 h-32 xl:w-40 xl:h-40">
                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                                    <circle
                                        cx="50" cy="50" r="42" fill="none" stroke="#2563eb" strokeWidth="12"
                                        strokeDasharray={`${Math.min(pctAnual, 100) * 2.64} 264`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl xl:text-3xl font-black text-[#374151]">{Math.round(pctAnual)}%</span>
                                </div>
                            </div>
                            <div className="flex flex-col items-center text-base xl:text-lg leading-tight mt-2">
                                <div className="text-foreground font-bold">Meta: <span className="text-[#374151] text-lg xl:text-xl">{fmtNum(metaAnual)}</span></div>
                                <div className="text-foreground font-bold">Atendido: <span className="text-blue-600 text-lg xl:text-xl">{fmtNum(atendidoAnual)}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ================= BOTTOM SECTION (58%) ================= */}
            <div className="flex-1 flex flex-col xl:flex-row w-full gap-2 pb-2 min-h-0 pt-4 px-4">

                {/* COLUMN 1: Acompanhamento Diário Table (Larger Width) */}
                <div className="w-full xl:w-[40%] bg-card/95 backdrop-blur rounded-xl shadow-sm border border-border overflow-hidden flex flex-col">
                    <div className="bg-[#2563eb] text-white py-1 xl:py-2 px-2 xl:px-4 grid grid-cols-4 gap-2 font-bold text-xs xl:text-sm uppercase items-center sticky top-0 z-20 tracking-wide shadow-md cursor-pointer">
                        <div className="flex items-center justify-center gap-2 hover:text-[#bfdbfe] transition-colors" onClick={() => handleSort('date')}>
                            <Activity className="w-4 h-4 xl:w-5 xl:h-5 text-white" /> Data {sortConfig?.key === 'date' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />)}
                        </div>
                        <div className="flex items-center justify-center gap-2 hover:text-[#bfdbfe] transition-colors" onClick={() => handleSort('prodNum')}>
                            Prod {sortConfig?.key === 'prodNum' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />)}
                        </div>
                        <div className="flex items-center justify-center gap-2 hover:text-[#bfdbfe] transition-colors" onClick={() => handleSort('fatNum')}>
                            Fat {sortConfig?.key === 'fatNum' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />)}
                        </div>
                        <div className="flex items-center justify-center gap-2 hover:text-[#bfdbfe] transition-colors" onClick={() => handleSort('vendNum')}>
                            Vend {sortConfig?.key === 'vendNum' && (sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-white" /> : <ArrowDown className="w-3 h-3 text-white" />)}
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-sm xl:text-lg text-foreground">
                            <thead className="sr-only">
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
                                        <td className="p-2 xl:p-3 text-center font-bold text-[#374151] align-middle">{formatDate(row.date)}</td>
                                        <td className="p-2 xl:p-3 text-center font-bold text-[#374151] align-middle">
                                            <div className="flex items-center justify-center gap-2 h-full">
                                                <span className="text-right w-16 xl:w-20">{row.prod}</span>
                                                <div className="flex items-center justify-center w-4 h-4">
                                                    {row.status === 'down' && <ArrowDown className="w-3 h-3 xl:w-4 xl:h-4 text-red-500" />}
                                                    {row.status === 'up' && <ArrowUp className="w-3 h-3 xl:w-4 xl:h-4 text-green-500" />}
                                                    {row.status === 'neutral' && <Minus className="w-3 h-3 xl:w-4 xl:h-4 text-yellow-500" />}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-2 xl:p-3 text-center font-medium text-[#374151] align-middle">{row.fat}</td>
                                        <td className="p-2 xl:p-3 text-center font-medium text-[#374151] align-middle">{row.vend}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* COLUMN 2: Middle Charts */}
                <div className="w-full xl:flex-1 flex flex-col gap-2 h-full">
                    {/* TOP CHART: Média Prensa x Injetora */}
                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-sm border border-border overflow-hidden flex flex-col gap-1 h-[250px] xl:h-full min-h-0">
                        <div className="bg-[#2563eb] text-white py-1 xl:py-2 px-2 xl:px-3 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 tracking-wide shadow-md">
                            <BarChart3 className="w-4 h-4 xl:w-5 xl:h-5 text-white" /> Média Prensa x Injetora
                        </div>
                        <div className="flex-1 p-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={mediaPrensaChartData} margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#374151', fontSize: 13, fontWeight: 700 }} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(168, 230, 207, 0.2)' }}
                                        contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: '1px solid #2563eb', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', padding: '12px' }}
                                        itemStyle={{ color: '#374151', fontWeight: 'bold' }}
                                        labelStyle={{ display: 'none' }}
                                        formatter={(value: any) => value?.toLocaleString('pt-BR')}
                                    />
                                    <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={32}>
                                        {mediaPrensaChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        <LabelList dataKey="value" position="insideRight" offset={10} fill="#374151" fontSize={16} fontWeight="bold" formatter={(val: any) => val?.toLocaleString('pt-BR')} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    {/* BOTTOM CHART: Média Prod x Venda x Fat */}
                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-[180px] xl:h-auto">
                        <div className="bg-[#2563eb] text-white py-1 px-3 text-center font-bold text-sm xl:text-base uppercase tracking-wide shadow-md">
                            <BarChart3 className="w-4 h-4 xl:w-5 xl:h-5 inline-block mr-2 text-white" />
                            Média Prod x Venda x Fat
                        </div>
                        <div className="flex-1 p-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#374151', fontSize: 18, fontWeight: 700 }}
                                        dy={10}
                                    />
                                    <Tooltip
                                        cursor={{ fill: 'rgba(168, 230, 207, 0.2)' }}
                                        contentStyle={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                            borderRadius: '12px',
                                            border: '1px solid #2563eb',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                            padding: '12px'
                                        }}
                                        itemStyle={{ color: '#374151', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#0f3460', fontWeight: 'bold' }}
                                        formatter={(value: any) => value?.toLocaleString('pt-BR')}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                        <LabelList dataKey="value" position="insideTop" offset={10} fill="#374151" fontSize={16} fontWeight="bold" formatter={(val: any) => val?.toLocaleString('pt-BR')} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* COLUMN 3: New Charts (Recebimento & Estoque) */}
                <div className="w-full xl:flex-1 flex flex-col gap-2 h-full">

                    {/* CHART 1: Recebimento RAP */}
                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-sm border border-border overflow-hidden flex flex-col gap-3 h-[180px] xl:h-auto">
                        <div className="bg-[#2563eb] text-white py-1 xl:py-2 px-2 xl:px-3 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 tracking-wide shadow-md shrink-0">
                            <Box className="w-4 h-4 xl:w-5 xl:h-5 text-white" /> Recebimento RAP
                        </div>
                        <div className="flex-1 p-2 xl:p-3 flex flex-col justify-center gap-2 pt-1">
                            <div className="flex items-center gap-3">
                                <span className="w-16 text-right text-xs xl:text-sm font-bold text-[#374151] uppercase">Fundido</span>
                                <div className="flex-1 relative h-8 xl:h-12 bg-gray-100 rounded-lg overflow-hidden shadow-inner">
                                    <div
                                        style={{ width: `${Math.min(100, ((estoqueFundicao?.recebido_fundido || 0) / maxRecebido) * 100)}%` }}
                                        className="absolute top-0 left-0 h-full bg-[#60a5fa] transition-all duration-500"
                                    />
                                    <div className="relative z-10 w-full h-full flex items-center justify-center text-[#374151] font-bold text-xl xl:text-3xl shadow-sm">
                                        {fmtNum(estoqueFundicao?.recebido_fundido || 0)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-16 text-right text-xs xl:text-sm font-bold text-[#374151] uppercase">Alumínio</span>
                                <div className="flex-1 relative h-8 xl:h-12 bg-gray-100 rounded-lg overflow-hidden shadow-inner">
                                    <div
                                        style={{ width: `${Math.min(100, ((estoqueFundicao?.recebido_aluminio || 0) / maxRecebido) * 100)}%` }}
                                        className="absolute top-0 left-0 h-full bg-[#bfdbfe] transition-all duration-500"
                                    />
                                    <div className="relative z-10 w-full h-full flex items-center justify-center text-[#374151] font-bold text-xl xl:text-3xl shadow-sm">
                                        {fmtNum(estoqueFundicao?.recebido_aluminio || 0)}
                                    </div>
                                </div>
                            </div>
                            <div className="text-center font-bold text-[#374151] mt-0 xl:mt-1 uppercase text-sm xl:text-base">
                                Total Recebido: <span className="text-2xl xl:text-3xl text-[#374151] ml-1">{fmtNum((estoqueFundicao?.recebido_fundido || 0) + (estoqueFundicao?.recebido_aluminio || 0))}</span>
                            </div>
                        </div>
                    </div>

                    {/* CHART 2: Estoque Fund. x Alum. */}
                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-sm border border-border overflow-hidden flex flex-col gap-3 h-[180px] xl:h-auto">
                        <div className="bg-[#2563eb] text-white py-1 xl:py-2 px-2 xl:px-3 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 tracking-wide shadow-md shrink-0">
                            <Layers className="w-4 h-4 xl:w-5 xl:h-5 text-white" /> Estoque Fund. x Alum.
                        </div>
                        <div className="flex-1 p-2 xl:p-3 flex flex-col justify-center gap-2 pt-1">
                            <div className="flex items-center gap-3">
                                <span className="w-16 text-right text-xs xl:text-sm font-bold text-[#374151] uppercase">Fundido</span>
                                <div className="flex-1 relative h-8 xl:h-12 bg-gray-100 rounded-lg overflow-hidden shadow-inner">
                                    <div
                                        style={{ width: `${Math.min(100, ((estoqueFundicao?.fundido || estoqueFundicao?.estoque_fundido || 0) / maxEstoque) * 100)}%` }}
                                        className="absolute top-0 left-0 h-full bg-[#60a5fa] transition-all duration-500"
                                    />
                                    <div className="relative z-10 w-full h-full flex items-center justify-center text-[#374151] font-bold text-xl xl:text-3xl shadow-sm">
                                        {fmtNum(estoqueFundicao?.fundido || estoqueFundicao?.estoque_fundido || 0)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-16 text-right text-xs xl:text-sm font-bold text-[#374151] uppercase">Alumínio</span>
                                <div className="flex-1 relative h-8 xl:h-12 bg-gray-100 rounded-lg overflow-hidden shadow-inner">
                                    <div
                                        style={{ width: `${Math.min(100, ((estoqueFundicao?.aluminio || estoqueFundicao?.estoque_aluminio || 0) / maxEstoque) * 100)}%` }}
                                        className="absolute top-0 left-0 h-full bg-[#bfdbfe] transition-all duration-500"
                                    />
                                    <div className="relative z-10 w-full h-full flex items-center justify-center text-[#374151] font-bold text-xl xl:text-3xl shadow-sm">
                                        {fmtNum(estoqueFundicao?.aluminio || estoqueFundicao?.estoque_aluminio || 0)}
                                    </div>
                                </div>
                            </div>
                            <div className="text-center font-bold text-[#374151] mt-0 xl:mt-1 uppercase text-sm xl:text-base">
                                Total Estoque: <span className="text-2xl xl:text-3xl text-[#374151] ml-1">{fmtNum((estoqueFundicao?.fundido || estoqueFundicao?.estoque_fundido || 0) + (estoqueFundicao?.aluminio || estoqueFundicao?.estoque_aluminio || 0))}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Sync Bar - Mobile Only as requested (No Calendar/Meta info) */}
            <div className="w-full bg-[#1e1e1e] text-white py-1 px-4 flex justify-between items-center text-xs xl:hidden mt-2 rounded-t-lg">
                <div className="flex gap-4">
                    {/* Calendar/Meta info hidden per request, showing Sync status or static text */}
                    <span>Última Sincronização: {syncDate} {syncTime}</span>
                </div>
            </div>

        </div>
    );
}
