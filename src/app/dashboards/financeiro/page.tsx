"use client";

import { useState, useMemo } from 'react';

import { Target, TrendingUp, TrendingDown, Briefcase, Calendar, Percent, ArrowDown, ArrowUp } from "lucide-react";
import AnimatedCounter from "@/components/paineis/AnimatedCounter";
import AnimatedProgressBar from "@/components/paineis/AnimatedProgressBar";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function FinanceiroPage() {
    const cards = [
        { label: "Falta Atingir", value: "R$ 8.762.718,86", icon: Target, bg: "bg-[#a8e6cf]/20", border: "border-[#a8e6cf]", text: "text-[#374151]" },
        { label: "Projeção (R$)", value: "R$ 14.004.888,61", icon: TrendingUp, bg: "bg-[#a8e6cf]/20", border: "border-[#a8e6cf]", text: "text-[#374151]" },
        { label: "Projeção (%)", value: "71.25%", icon: Percent, bg: "bg-[#ff8b94]/20", border: "border-[#ff8b94]", text: "text-[#374151]" },
        { label: "Carteira Pedidos MI", value: "R$ 11.476.319,64", icon: Briefcase, bg: "bg-[#a8e6cf]/20", border: "border-[#a8e6cf]", text: "text-[#374151]" },
        { label: "Carteira Pedidos ME", value: "R$ 2.479.557,47", icon: Briefcase, bg: "bg-[#a8e6cf]/20", border: "border-[#a8e6cf]", text: "text-[#374151]" },
        { label: "Faturamento Ontem", value: "R$ 3.343.730,74", icon: Calendar, bg: "bg-[#a8e6cf]/20", border: "border-[#a8e6cf]", text: "text-[#374151]" },
        { label: "Média Fat. Necessária", value: "R$ 4.381.359,43", icon: TrendingDown, bg: "bg-[#ff8b94]/20", border: "border-[#ff8b94]", text: "text-[#374151]" },
        { label: "Média Vendas Necessária", value: "R$ 0,00", icon: TrendingDown, bg: "bg-[#a8e6cf]/20", border: "border-[#a8e6cf]", text: "text-[#374151]" },
    ];

    // Data for Table
    const tableDataRaw = [
        { date: "27/01", fat: "R$ 1.171.382,87", vend: "R$ 695.199,14", trend: "down", fatNum: 1171382.87, vendNum: 695199.14 },
        { date: "26/01", fat: "R$ 3.343.730,74", vend: "R$ 1.074.809,25", trend: "down", fatNum: 3343730.74, vendNum: 1074809.25 },
        { date: "24/01", fat: "R$ 0,00", vend: "R$ 34.037,88", trend: "up", fatNum: 0, vendNum: 34037.88 },
        { date: "23/01", fat: "R$ 37.784,67", vend: "R$ 1.159.195,74", trend: "up", fatNum: 37784.67, vendNum: 1159195.74 },
        { date: "22/01", fat: "R$ 2.353.234,04", vend: "R$ 780.264,66", trend: "down", fatNum: 2353234.04, vendNum: 780264.66 },
        { date: "21/01", fat: "R$ 67.505,49", vend: "R$ 1.554.115,12", trend: "up", fatNum: 67505.49, vendNum: 1554115.12 },
        { date: "20/01", fat: "R$ 1.376.746,18", vend: "R$ 2.044.959,66", trend: "up", fatNum: 1376746.18, vendNum: 2044959.66 },
        { date: "19/01", fat: "R$ 0,00", vend: "R$ 1.613.089,83", trend: "up", fatNum: 0, vendNum: 1613089.83 },
        { date: "17/01", fat: "R$ 0,00", vend: "R$ 15.270,00", trend: "up", fatNum: 0, vendNum: 15270.00 },
        { date: "16/01", fat: "R$ 0,00", vend: "R$ 1.553.278,13", trend: "up", fatNum: 0, vendNum: 1553278.13 },
        { date: "15/01", fat: "R$ 0,00", vend: "R$ 1.511.307,20", trend: "up", fatNum: 0, vendNum: 1511307.20 },
        { date: "14/01", fat: "R$ 1.938.474,09", vend: "R$ 1.735.325,04", trend: "down", fatNum: 1938474.09, vendNum: 1735325.04 },
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
        if (!sortConfig) return tableDataRaw;
        return [...tableDataRaw].sort((a: any, b: any) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [tableDataRaw, sortConfig]);

    const gaugeMI = [{ name: 'A', value: 59 }, { name: 'B', value: 41 }];
    const gaugeME = [{ name: 'A', value: 0 }, { name: 'B', value: 100 }];
    const gaugeTotal = [{ name: 'A', value: 61 }, { name: 'B', value: 39 }];

    // Visualization Data for Carteira MI Wallet
    const walletData = [
        { name: 'NÃO EFETIVADO', value: 400000, fill: '#ff8b94', labelStr: '' },
        { name: 'SEM SALDO', value: 100000, fill: '#ffd3b6', labelStr: '' },
        { name: 'EMBARQUE CRIADO', value: 5623886, fill: '#a8e6cf', labelStr: 'R$ 5.623.886' },
        { name: 'FAF IMPRESSA', value: 2802698, fill: '#dcedc1', labelStr: 'R$ 2.802.698' },
        { name: 'EMBALANDO PARCIAL', value: 300000, fill: '#ffd3b6', labelStr: '' },
        { name: 'PESAGEM REALIZADA', value: 1658176, fill: '#dcedc1', labelStr: 'R$ 1.658.176' },
    ];

    return (
        <div className="flex flex-col h-full w-full gap-4 p-4 overflow-auto xl:overflow-hidden font-sans">

            {/* TOP ROW: 8 KPI Cards (Fixed Height) */}
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
                    <div className="bg-[#a8e6cf] border-t border-border py-2 xl:py-3 px-2 xl:px-4 grid grid-cols-4 gap-2 text-[10px] xl:text-xs sticky bottom-0 z-20 shadow-[-10px]">
                        <div className="font-bold text-[#374151] uppercase flex flex-col justify-center text-center"><span>Total</span><span>Média</span></div>
                        <div className="text-center flex flex-col font-bold text-[#374151]"><span>R$ 12.064.074,01</span><span>R$ 1.505.509,25</span></div>
                        <div className="text-center flex flex-col font-bold text-[#374151]"><span>R$ 18.655.410,00</span><span>R$ 979.117,50</span></div>
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
                                    value={59}
                                    format="percent"
                                    className="text-5xl xl:text-6xl font-black text-[#374151] drop-shadow-sm leading-none mb-1"
                                />
                                <div className="w-full max-w-[200px] xl:max-w-[80%]">
                                    <AnimatedProgressBar value={59} height="h-3 xl:h-4" />
                                </div>
                                <div className="w-full max-w-[200px] xl:max-w-[80%] flex justify-between text-[9px] xl:text-sm text-muted-foreground mt-2 font-medium">
                                    <span>Meta: R$ 19.6M</span>
                                    <span>R$ 11.5M</span>
                                </div>
                            </div>
                            {/* Bar 2: Mercado Externo */}
                            <div className="flex-1 flex flex-col items-center justify-center p-2">
                                <span className="text-[#374151] font-bold text-xs xl:text-lg mb-1 uppercase tracking-tight">Mercado Externo</span>
                                <AnimatedCounter
                                    value={0}
                                    format="percent"
                                    className="text-5xl xl:text-6xl font-black text-[#374151] drop-shadow-sm leading-none mb-1"
                                />
                                <div className="w-full max-w-[200px] xl:max-w-[80%]">
                                    <AnimatedProgressBar value={0} height="h-3 xl:h-4" />
                                </div>
                                <div className="w-full max-w-[200px] xl:max-w-[80%] flex justify-between text-[9px] xl:text-sm text-muted-foreground mt-2 font-medium">
                                    <span>Meta: R$ 0,00</span>
                                    <span>R$ 508k</span>
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
                                    value={61}
                                    format="percent"
                                    className="text-6xl xl:text-7xl font-black text-[#374151] drop-shadow-md leading-none mb-1"
                                />
                                <div className="w-full max-w-[280px] xl:max-w-[90%] mb-2">
                                    <AnimatedProgressBar value={61} height="h-4 xl:h-5" />
                                </div>
                                <div className="w-full max-w-[280px] xl:max-w-[90%] flex justify-between text-xs xl:text-base text-[#374151] font-bold px-1">
                                    <div className="flex flex-col items-start bg-muted px-3 py-1 rounded-lg border border-border">
                                        <span className="text-[10px] xl:text-xs text-muted-foreground uppercase">Meta Global</span>
                                        <AnimatedCounter value={19655410.00} format="currency" className="text-[#374151]" decimals={2} />
                                    </div>
                                    <div className="flex flex-col items-end bg-[#a8e6cf]/20 px-3 py-1 rounded-lg border border-[#a8e6cf]/50 text-[#374151]">
                                        <span className="text-[10px] xl:text-xs text-[#374151] uppercase">Realizado</span>
                                        <AnimatedCounter value={12064074.01} format="currency" className="text-[#374151]" decimals={2} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BOTTOM: Desdobramento Carteira MI (Bar Chart) */}
                    <div className="w-full xl:flex-1 bg-card/95 backdrop-blur rounded-xl shadow-sm border border-border overflow-hidden flex flex-col h-[250px] xl:h-auto">
                        <div className="bg-[#a8e6cf] text-[#374151] py-1 px-3 text-center font-bold text-[10px] xl:text-xs uppercase tracking-wide shadow-md">Desdobramento Carteira MI</div>
                        <div className="flex-1 p-2 xl:p-3 flex flex-col justify-center gap-1 xl:gap-2">
                            {walletData.map((item, i) => (
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
