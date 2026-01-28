"use client";

import { useState, useMemo } from 'react';
import { Truck, CheckSquare, Clock, Calendar, Package, FileText, PackagePlus, Box, Layers, AlignLeft, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { AreaChart, Area, XAxis, ResponsiveContainer, Tooltip, CartesianGrid, BarChart, Bar, Cell, LabelList } from 'recharts';

const lineChartData = [
  { date: '21/01', val: 121 },
  { date: '22/01', val: 57 },
  { date: '23/01', val: 69 },
  { date: '26/01', val: 72 },
];

const resumoDataInitial = [
  { item: "R-2279", qtd: "1.340", ped: 45, curve: "C", qtdNum: 1340 },
  { item: "R-2217", qtd: "86", ped: 35, curve: "A", qtdNum: 86 },
  { item: "R-666", qtd: "151", ped: 34, curve: "B", qtdNum: 151 },
  { item: "R-012A", qtd: "83", ped: 32, curve: "A", qtdNum: 83 },
  { item: "R-5062", qtd: "249", ped: 31, curve: "A", qtdNum: 249 },
  { item: "R-3001", qtd: "120", ped: 28, curve: "B", qtdNum: 120 },
  { item: "R-1120", qtd: "543", ped: 22, curve: "A", qtdNum: 543 },
  { item: "R-4402", qtd: "800", ped: 20, curve: "C", qtdNum: 800 },
  { item: "R-1005", qtd: "1.230", ped: 18, curve: "A", qtdNum: 1230 },
];

const historicoDataInitial = [
  { date: "05/Jan", qtd: 2 },
  { date: "07/Jan", qtd: 2 },
  { date: "08/Jan", qtd: 2 },
  { date: "09/Jan", qtd: 6 },
  { date: "12/Jan", qtd: 1 },
  { date: "13/Jan", qtd: 1 },
  { date: "14/Jan", qtd: 4 },
  { date: "15/Jan", qtd: 3 },
  { date: "16/Jan", qtd: 5 },
];

const performanceDataInitial = [
  { label: "Mesmo dia", qtd: "3.586", pct: "16%", acu: "16%", pctNum: 16 },
  { label: "1 dia", qtd: "8.690", pct: "40%", acu: "56%", pctNum: 40 },
  { label: "2 dias", qtd: "3.086", pct: "14%", acu: "71%", pctNum: 14 },
  { label: "3 dias", qtd: "2.239", pct: "10%", acu: "81%", pctNum: 10 },
  { label: "4 dias", qtd: "1.669", pct: "7%", acu: "89%", pctNum: 7 },
];

type SortConfig = { key: string; direction: 'asc' | 'desc' } | null;


export default function Home() {
  const [sortResumo, setSortResumo] = useState<SortConfig>(null);
  const [sortHistorico, setSortHistorico] = useState<SortConfig>(null);
  const [sortPerformance, setSortPerformance] = useState<SortConfig>(null);

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

      // Handle numeric strings formatted with dots/commas if needed, but for now we added numeric fields or rely on simple string sort for some
      if (typeof valA === 'string' && valA.includes('%')) valA = parseFloat(valA.replace('%', ''));
      if (typeof valB === 'string' && valB.includes('%')) valB = parseFloat(valB.replace('%', ''));

      // Specific checks for formatted numbers like "1.340" -> 1340
      // Or pick hidden numeric fields if available (e.g. qtdNum)
      if (sort.key === 'qtd' && a.qtdNum !== undefined) {
        valA = a.qtdNum;
        valB = b.qtdNum;
      }

      if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortedResumo = useMemo(() => sortData(resumoDataInitial, sortResumo), [sortResumo]);
  const sortedHistorico = useMemo(() => sortData(historicoDataInitial, sortHistorico), [sortHistorico]);
  const sortedPerformance = useMemo(() => sortData(performanceDataInitial, sortPerformance), [sortPerformance]);

  const SortIcon = ({ active, direction }: { active: boolean, direction?: 'asc' | 'desc' }) => {
    if (!active) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-20" />;
    return direction === 'asc' ? <ArrowUp className="w-3 h-3 ml-1 text-blue-500" /> : <ArrowDown className="w-3 h-3 ml-1 text-blue-500" />;
  };

  return (
    <div className="flex flex-col h-auto xl:h-full gap-3 overflow-visible xl:overflow-hidden p-4 font-sans">

      {/* TOP SECTION: Cards (Left) + Tables/Charts (Right) */}
      <div className="flex flex-col xl:flex-row xl:flex-1 gap-4 h-auto min-h-0 overflow-visible xl:overflow-hidden">
        {/* Left Column: KPI Cards Grid */}
        <div className="w-full xl:w-[380px] 2xl:w-[420px] flex flex-col gap-3 shrink-0 h-auto xl:h-full">
          <div className="bg-[#a8e6cf] text-[#374151] p-2 rounded-lg text-center font-bold text-xl uppercase tracking-wider border-b-4 border-[#88d8b0] shadow-lg flex items-center justify-center gap-2 shrink-0">
            <Truck className="w-6 h-6 text-[#374151]" />
            <span className="drop-shadow-md">Pedidos Mercado Interno</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-2 gap-3 flex-1 min-h-[300px] xl:min-h-0">
            {[
              { label: 'Conferir', val: 21, icon: CheckSquare, color: 'bg-[#a8e6cf]', border: 'border-[#88d8b0]' },
              { label: 'Pendente', val: 163, icon: Clock, color: 'bg-[#ff8b94]', border: 'border-[#ff5c6b]', animate: true },
              { label: 'Frete/FAF', val: 54, icon: Truck, color: 'bg-[#a8e6cf]', border: 'border-[#88d8b0]' },
              { label: 'Programado', val: 15, icon: Calendar, color: 'bg-[#dcedc1]', border: 'border-[#c5e1a5]' },
              { label: 'Expedição', val: 110, icon: Package, color: 'bg-[#ffd3b6]', border: 'border-[#ffcc99]' },
              { label: 'Emitir NF', val: 100, icon: FileText, color: 'bg-[#ffd3b6]', border: 'border-[#ffcc99]' },
              { label: 'Chegou Hoje', val: 56, icon: PackagePlus, color: 'bg-[#ffaaa5]', border: 'border-[#ff8a8a]' },
              { label: 'Total', val: 463, icon: Box, color: 'bg-[#dcedc1]', border: 'border-[#c5e1a5]' },
            ].map((card, idx) => (
              <div key={idx} className={`glass-card ${card.color} border ${card.border} text-primary-foreground p-1 flex flex-col items-center justify-center text-center gap-0 hover:scale-[1.02] transition-transform duration-300 shadow-xl backdrop-blur-md ${card.animate ? 'animate-soft-pulse' : ''}`}>
                <div className="flex items-center gap-2 mb-0">
                  <card.icon className="w-4 h-4 xl:w-6 xl:h-6 sm:w-8 sm:h-8 opacity-80" />
                  <span className="text-2xl xl:text-4xl sm:text-5xl font-bold tracking-tighter drop-shadow-lg">{card.val}</span>
                </div>
                <span className="font-semibold uppercase tracking-widest text-[9px] xl:text-[10px] sm:text-xs text-primary-foreground/70">{card.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Tables and Charts */}
        <div className="flex-1 flex flex-col gap-3 h-full overflow-visible xl:overflow-hidden">

          {/* Top Row: 3 Tables (55% of Right side) */}
          <div className="h-auto xl:h-[55%] flex flex-col xl:grid xl:grid-cols-3 gap-3 min-h-0">
            {/* Table 1 */}
            <div className="flex flex-col bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border h-[200px] xl:h-full overflow-hidden">
              <div className="bg-[#a8e6cf] text-[#374151] py-1 px-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                <Package className="w-4 h-4 xl:w-5 xl:h-5 text-[#374151]" /> Resumo por Item
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-xs xl:text-base 2xl:text-lg text-[#374151] leading-tight font-sans">
                  <thead className="bg-[#a8e6cf] text-[#374151] sticky top-0 shadow-md z-10 text-xs xl:text-lg cursor-pointer">
                    <tr>
                      <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#dcedc1]" onClick={() => handleSort('item', sortResumo, setSortResumo)}>Itens <SortIcon active={sortResumo?.key === 'item'} direction={sortResumo?.direction} /></th>
                      <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#dcedc1]" onClick={() => handleSort('qtd', sortResumo, setSortResumo)}>Qtd <SortIcon active={sortResumo?.key === 'qtd'} direction={sortResumo?.direction} /></th>
                      <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#dcedc1]" onClick={() => handleSort('ped', sortResumo, setSortResumo)}>Ped <SortIcon active={sortResumo?.key === 'ped'} direction={sortResumo?.direction} /></th>
                      <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#dcedc1]" onClick={() => handleSort('curve', sortResumo, setSortResumo)}>ABC <SortIcon active={sortResumo?.key === 'curve'} direction={sortResumo?.direction} /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {sortedResumo.map((row, i) => (
                      <tr key={i} className={`hover:bg-primary/5 transition-colors ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                        <td className="p-1 xl:p-2 text-center font-bold text-[#374151] text-base xl:text-2xl">{row.item}</td>
                        <td className="p-1 xl:p-2 text-center font-sans font-bold text-[#374151] text-base xl:text-2xl">{row.qtd}</td>
                        <td className="p-1 xl:p-2 text-center font-sans font-bold text-[#374151] text-base xl:text-2xl">{row.ped}</td>
                        <td className="p-1 xl:p-2 text-center font-bold text-[#374151] bg-muted/50 mx-1 rounded text-base xl:text-xl">{row.curve}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 2 */}
            <div className="flex flex-col bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border h-[200px] xl:h-full overflow-hidden">
              <div className="bg-[#a8e6cf] text-[#374151] py-1 px-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                <Clock className="w-4 h-4 xl:w-5 xl:h-5 text-[#374151]" /> Histórico
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-xs xl:text-base 2xl:text-lg text-[#374151] leading-tight font-sans">
                  <thead className="bg-[#a8e6cf] text-[#374151] sticky top-0 shadow-md z-10 text-xs xl:text-lg cursor-pointer">
                    <tr>
                      <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#dcedc1]" onClick={() => handleSort('date', sortHistorico, setSortHistorico)}>Data <SortIcon active={sortHistorico?.key === 'date'} direction={sortHistorico?.direction} /></th>
                      <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#dcedc1]" onClick={() => handleSort('qtd', sortHistorico, setSortHistorico)}>Qtd <SortIcon active={sortHistorico?.key === 'qtd'} direction={sortHistorico?.direction} /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {sortedHistorico.map((row, i) => (
                      <tr key={i} className={`hover:bg-primary/5 transition-colors ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                        <td className="p-1 xl:p-2 text-center font-bold text-[#374151] text-base xl:text-2xl">{row.date}</td>
                        <td className="p-1 xl:p-2 text-center font-bold text-[#374151] text-base xl:text-2xl">{row.qtd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Table 3 */}
            <div className="flex flex-col bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border h-[200px] xl:h-full overflow-hidden">
              <div className="bg-[#a8e6cf] text-[#374151] py-1 px-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                <Clock className="w-4 h-4 xl:w-5 xl:h-5 text-[#374151]" /> Performance
              </div>
              <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-xs xl:text-base 2xl:text-lg text-[#374151] leading-tight font-sans">
                  <thead className="bg-[#a8e6cf] text-[#374151] sticky top-0 shadow-md z-10 text-xs xl:text-lg cursor-pointer">
                    <tr>
                      <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#dcedc1]" onClick={() => handleSort('label', sortPerformance, setSortPerformance)}>Data <SortIcon active={sortPerformance?.key === 'label'} direction={sortPerformance?.direction} /></th>
                      <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#dcedc1]" onClick={() => handleSort('qtd', sortPerformance, setSortPerformance)}>Qtd <SortIcon active={sortPerformance?.key === 'qtd'} direction={sortPerformance?.direction} /></th>
                      <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#dcedc1]" onClick={() => handleSort('pctNum', sortPerformance, setSortPerformance)}>% <SortIcon active={sortPerformance?.key === 'pctNum'} direction={sortPerformance?.direction} /></th>
                      <th className="p-1 xl:p-2 text-center font-medium hover:bg-[#dcedc1]" onClick={() => handleSort('acu', sortPerformance, setSortPerformance)}>Acu. <SortIcon active={sortPerformance?.key === 'acu'} direction={sortPerformance?.direction} /></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {sortedPerformance.map((row, i) => (
                      <tr key={i} className={`hover:bg-primary/5 transition-colors ${i % 2 === 0 ? 'bg-card' : 'bg-muted/20'}`}>
                        <td className="p-1 xl:p-2 text-center font-bold text-[#374151] text-base xl:text-2xl">{row.label}</td>
                        <td className="p-1 xl:p-2 text-center text-[#374151] font-bold text-base xl:text-2xl">{row.qtd}</td>
                        <td className="p-1 xl:p-2 text-center text-[#374151] font-bold text-base xl:text-2xl">{row.pct}</td>
                        <td className="p-1 xl:p-2 text-center font-bold text-[#374151] text-base xl:text-2xl">{row.acu}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Middle Row: Charts (Filling remaining Right side) */}
          <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-3 min-h-0">
            {/* Estoque Produtos Estratégicos */}
            <div className="bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border flex flex-col h-[250px] xl:min-h-[250px] overflow-visible xl:overflow-hidden">
              <div className="bg-[#a8e6cf] text-[#374151] py-1 px-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                <Package className="w-4 h-4 xl:w-5 xl:h-5 text-[#374151]" /> Estoque Produtos Estratégicos
              </div>
              <div className="flex-1 p-2 xl:p-4 flex flex-col justify-center gap-2 xl:gap-4">
                {[
                  { label: 'Prensado', val: '356.859', w: '40%', color: 'bg-[#a8e6cf]' },
                  { label: 'Adesivo', val: '278.199', w: '30%', color: 'bg-[#dcedc1]' },
                  { label: 'Jato', val: '871.259', w: '90%', color: 'bg-[#ffd3b6]' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 xl:gap-3">
                    <span className="w-20 xl:w-24 text-right text-xs xl:text-sm font-bold text-[#374151] uppercase tracking-tight">{item.label}</span>
                    <div className="flex-1 h-6 xl:h-8 2xl:h-10 bg-muted/50 rounded-lg overflow-hidden relative shadow-inner">
                      <div style={{ width: item.w }} className={`h-full ${item.color} flex items-center justify-end pr-2 text-white text-[10px] xl:text-xs font-bold transition-all duration-1000 shadow-lg`}>
                      </div>
                      <span className="absolute inset-y-0 left-2 flex items-center text-sm xl:text-xl font-bold text-[#374151] drop-shadow-md z-10">{item.val}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Qtd Pedidos Recebidos Chart (Area Chart) */}
            <div className="bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border flex flex-col h-[250px] xl:min-h-[250px] overflow-visible xl:overflow-hidden">
              <div className="bg-[#a8e6cf] text-[#374151] py-1 px-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
                <Package className="w-4 h-4 xl:w-5 xl:h-5 text-[#374151]" /> Qtd Pedidos Recebidos
              </div>
              <div className="flex-1 p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={lineChartData} margin={{ top: 30, right: 30, left: 30, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a8e6cf" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#a8e6cf" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 700 }} dy={10} />
                    <Tooltip
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', color: 'hsl(var(--card-foreground))', borderRadius: '8px', border: '1px solid hsl(var(--border))', backdropFilter: 'blur(4px)' }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontSize: 12 }}
                      cursor={{ stroke: '#a8e6cf', strokeWidth: 2 }}
                    />
                    <Area type="monotone" dataKey="val" stroke="#a8e6cf" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)">
                      <LabelList
                        dataKey="val"
                        position="top"
                        content={({ x, y, value }: any) => (
                          <text x={x} y={y} dy={-10} fill="#000000" textAnchor="middle" className="text-sm xl:text-4xl font-bold">
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

      {/* BOTTOM SECTION: Balanceamento Widgets (Full Width) */}
      <div className="h-auto xl:h-[22%] 2xl:h-[25%] grid grid-cols-1 xl:grid-cols-2 gap-3 shrink-0">
        {/* Balanceamento de Estoque Acabado */}
        <div className="bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border flex flex-col h-auto xl:min-h-[200px] overflow-visible xl:overflow-hidden">
          <div className="bg-[#a8e6cf] text-[#374151] py-1 px-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
            <Layers className="w-4 h-4 xl:w-5 xl:h-5 text-[#374151]" /> Balanceamento de Estoque Acabado
          </div>
          <div className="flex-1 p-2 xl:p-4 flex flex-col justify-center gap-2 xl:gap-3">
            {[
              { label: 'Carteira Ped.', val: '194.189', w: '25%', color: 'from-[#34d399] to-[#a8e6cf]' },
              { label: 'Estoque Total', val: '950.781', w: '95%', color: 'from-[#a8e6cf] to-[#dcedc1]' },
              { label: 'Estoque Disp.', val: '756.592', w: '80%', color: 'from-[#dcedc1] to-[#ffd3b6]' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 xl:gap-3">
                <span className="w-24 xl:w-32 text-right text-xs xl:text-sm font-bold text-[#374151] uppercase">{item.label}</span>
                <div className="flex-1 h-8 xl:h-10 bg-muted/50 rounded-md overflow-hidden relative shadow-inner">
                  <div style={{ width: item.w }} className={`h-full bg-gradient-to-r ${item.color} flex items-center px-2 xl:px-4 text-[#374151] text-sm xl:text-xl font-bold shadow-lg`}>
                    {item.val}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Balanceamento Curva ABC Layout Table */}
        <div className="bg-card/95 backdrop-blur rounded-lg shadow-sm border border-border flex flex-col h-auto xl:min-h-[200px] overflow-visible xl:overflow-hidden">
          <div className="bg-[#a8e6cf] text-[#374151] py-1 px-2 text-center font-bold text-sm xl:text-base uppercase flex items-center justify-center gap-2 shrink-0 tracking-wide">
            <AlignLeft className="w-4 h-4 xl:w-5 xl:h-5 text-[#374151]" /> Balanceamento do Estoque com Curva A B C
          </div>
          <div className="flex-1 flex flex-col">
            <table className="w-full text-xs xl:text-base 2xl:text-lg text-[#374151] h-full font-sans">
              <thead className="bg-[#a8e6cf] text-[#374151]">
                <tr>
                  <th className="p-1 xl:p-2 text-center font-medium">Curva</th>
                  <th className="p-1 xl:p-2 text-center font-medium">0-15</th>
                  <th className="p-1 xl:p-2 text-center font-medium">15-30</th>
                  <th className="p-1 xl:p-2 text-center font-medium">30-60</th>
                  <th className="p-1 xl:p-2 text-center font-medium">60-120</th>
                  <th className="p-1 xl:p-2 text-center font-medium">&gt;120</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50 text-center font-black text-sm xl:text-xl">
                <tr className="bg-card hover:bg-muted/50 text-[#374151]"><td>A</td><td>117</td><td>26</td><td>24</td><td>6</td><td>0</td></tr>
                <tr className="bg-muted/20 hover:bg-muted/50 text-[#374151]"><td>B</td><td>120</td><td>59</td><td>58</td><td>24</td><td>4</td></tr>
                <tr className="bg-card hover:bg-muted/50 text-[#374151]"><td>C</td><td>188</td><td>181</td><td>265</td><td>283</td><td>0</td></tr>
                <tr className="bg-muted text-[#374151] border-t-2 border-border text-base xl:text-2xl">
                  <td className="font-black">Total</td><td>425</td><td>266</td><td>347</td><td>313</td><td>4</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer Sync Bar (Fixed height) */}
      <div className="h-6 shrink-0 flex justify-center pb-2">
        <div className="bg-muted text-[#374151] rounded-full px-6 flex items-center gap-4 text-[10px] uppercase font-bold tracking-widest shadow-2xl border border-border hover:border-primary transition-colors">
          <span className="opacity-70">ÚLTIMA SINCRONIZAÇÃO:</span>
          <div className="flex items-center gap-2 text-[#374151]">
            <Calendar className="w-3 h-3 text-[#2d9d7a]" />
            27/01/2026
          </div>
          <div className="flex items-center gap-2 text-[#374151]">
            <Clock className="w-3 h-3 text-[#2d9d7a]" />
            13:39:20
          </div>
        </div>
      </div>

    </div>
  );
}
