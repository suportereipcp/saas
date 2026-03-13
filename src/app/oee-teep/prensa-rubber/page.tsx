"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { BarChart3, Clock, Settings, Gauge, Filter, TrendingUp, LayoutDashboard } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, LabelList, Area, AreaChart,
} from "recharts";
import { getOeeDashboardMetrics, getOeeFiltersData } from "@/actions/oee-metrics";
import { SearchableSelect, Option } from "@/components/ui/searchable-select";

// ─── Project Colors ────────────────────────────────────────────────────────
const C = {
  primary: "#68D9A6",
  primaryDark: "#3BB87A",
  blue: "#3B82F6",
  blueDark: "#2563EB",
  orange: "#F59E0B",
  orangeDark: "#D97706",
  green: "#10B981",
  navy: "#2D3A4A",
  muted: "#94a3b8",
  red: "#EF4444",
  purple: "#8b5cf6",
  purpleDark: "#6d28d9",
};

const PERIODOS = ["Hoje", "Últimas 24h", "Últimos 7 dias", "Últimos 30 dias", "Personalizado"];

// ─── SVG Mini Gauge ────────────────────────────────────────────────────────
// A slightly smaller version of the gauge for the combined view
function GaugeMeter({
  value, size = 180, color, colorEnd, arcWidth = 14, title, subtitle,
}: {
  value: number; size?: number; color: string; colorEnd?: string;
  arcWidth?: number; title: string; subtitle?: string;
}) {
  const [animVal, setAnimVal] = useState(0);
  const uid = useRef(`gm-${Math.random().toString(36).slice(2, 7)}`).current;

  useEffect(() => {
    const dur = 1400;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 4);
      setAnimVal(Math.round(e * value));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  const pad = 24;
  const w = size + pad * 2;
  const h = size * 0.75 + pad;
  const cx = w / 2;
  const cy = h - 20;
  const r = (size - arcWidth * 2 - 16) / 2;

  const polar = (angle: number, radius: number) => ({
    x: cx + radius * Math.cos(angle),
    y: cy - radius * Math.sin(angle),
  });

  const arc = (sA: number, eA: number, rad: number) => {
    const s = polar(sA, rad);
    const e = polar(eA, rad);
    return `M ${s.x} ${s.y} A ${rad} ${rad} 0 ${sA - eA <= Math.PI ? 0 : 1} 1 ${e.x} ${e.y}`;
  };

  const bgPath = arc(Math.PI, 0, r);
  const vAngle = Math.PI - (animVal / 100) * Math.PI;
  const valPath = animVal > 0 ? arc(Math.PI, vAngle, r) : "";
  const nR = r - arcWidth - 6;
  const nEnd = polar(vAngle, nR);
  const bL = polar(vAngle + Math.PI / 2, 3);
  const bR = polar(vAngle - Math.PI / 2, 3);

  return (
    <div className="flex flex-col items-center">
      <div className="text-center mb-[-10px] z-10">
        <h3 className="text-sm font-black text-foreground uppercase tracking-widest">{title}</h3>
        {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
      </div>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <defs>
          <linearGradient id={uid} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor={colorEnd || color} />
          </linearGradient>
          <filter id={`${uid}-s`} x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodColor={color} floodOpacity="0.3" />
          </filter>
        </defs>
        <path d={bgPath} fill="none" stroke="#f1f5f9" strokeWidth={arcWidth + 4} strokeLinecap="round" />
        <path d={bgPath} fill="none" stroke="#e2e8f0" strokeWidth={arcWidth} strokeLinecap="round" />
        {animVal > 0 && (
          <path d={valPath} fill="none" stroke={`url(#${uid})`}
            strokeWidth={arcWidth} strokeLinecap="round" filter={`url(#${uid}-s)`} />
        )}
        {[0, 25, 50, 75, 100].map((m) => {
          const a = Math.PI - (m / 100) * Math.PI;
          const o = polar(a, r + arcWidth / 2 + 4);
          const i = polar(a, r + arcWidth / 2 + 10);
          const lp = polar(a, r + arcWidth / 2 + 22);
          return (
            <g key={m}>
              <line x1={o.x} y1={o.y} x2={i.x} y2={i.y} stroke="#cbd5e1" strokeWidth={1.5} />
              <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
                fontSize={10} fill="#64748b" fontWeight="600">{m}</text>
            </g>
          );
        })}
        <polygon points={`${nEnd.x},${nEnd.y} ${bL.x},${bL.y} ${bR.x},${bR.y}`} fill={C.navy} opacity={0.85} />
        <circle cx={cx} cy={cy} r={5} fill={C.navy} />
        <circle cx={cx} cy={cy} r={2.5} fill="#fff" />
        <text x={cx} y={cy - 20} textAnchor="middle" fontSize={size * 0.18} fontWeight="900" fill={color} fontFamily="system-ui">
          {animVal}%
        </text>
      </svg>
    </div>
  );
}

// ─── Simple Progress Bar ───────────────────────────────────────────────────

function SimpleBar({ label, value, color }: { label: string; value: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => { setW(value); }, [value]);
  return (
    <div>
      <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${w}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function PrensaRubberDashboardPage() {
  const [maquina, setMaquina] = useState("Todas");
  const [operador, setOperador] = useState("Todos");
  const [periodo, setPeriodo] = useState("Últimas 24h");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);

  const [maquinasOptions, setMaquinasOptions] = useState<Option[]>([{ label: "Todas", value: "Todas" }]);
  const [operadoresOptions, setOperadoresOptions] = useState<Option[]>([{ label: "Todos", value: "Todos" }]);

  useEffect(() => {
    async function loadFilters() {
      const data = await getOeeFiltersData();
      setMaquinasOptions([
        { label: "Todas", value: "Todas" },
        ...data.maquinas.map((m) => ({ label: m, value: m }))
      ]);
      setOperadoresOptions([
        { label: "Todos", value: "Todos" },
        ...data.operadores.map((o) => ({ label: o.nome, value: o.matricula }))
      ]);
    }
    loadFilters();
  }, []);

  useEffect(() => {
    async function fetchMetrics() {
      setLoading(true);
      const data = await getOeeDashboardMetrics({
        maquina,
        operador,
        periodo,
        dateRangeStr: periodo === "Personalizado" ? JSON.stringify(dateRange) : undefined,
      });
      setMetrics(data);
      setLoading(false);
    }
    fetchMetrics();
  }, [maquina, operador, periodo, dateRange]);

  const isFiltered = maquina !== "Todas" || operador !== "Todos" || periodo !== "Últimas 24h";

  if (loading || !metrics) {
    return (
      <div className="p-4 sm:p-5 flex flex-col items-center justify-center h-[60vh] text-primary">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
        <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground animate-pulse">
          Calculando Métricas...
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-5 space-y-4">
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        .anim-d0 { animation: fadeUp .5s ease-out forwards; opacity:0 }
        .anim-d1 { animation: fadeUp .5s ease-out .15s forwards; opacity:0 }
        .anim-d2 { animation: fadeUp .5s ease-out .3s forwards; opacity:0 }
      `}</style>

      {/* ─── Header & Filters ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 anim-d0">
        <div>
          <h1 className="text-xl font-black tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-indigo-600" />
            Visão Geral — Prensa Rubber
          </h1>
          <p className="text-xs text-muted-foreground ml-7 font-medium uppercase tracking-widest">
            Comparativo Executivo: OEE vs TEEP
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 mr-1">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Filtros</span>
          </div>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[150px] h-9 text-sm font-semibold">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {PERIODOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          {periodo === "Personalizado" && (
            <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          )}
          <SearchableSelect
            options={maquinasOptions}
            value={maquina}
            onChange={setMaquina}
            placeholder="Máquina..."
            className="w-[180px]"
          />
          <SearchableSelect
            options={operadoresOptions}
            value={operador}
            onChange={setOperador}
            placeholder="Operador..."
            className="w-[200px]"
          />
          {isFiltered && (
            <button
              onClick={() => { setMaquina("Todas"); setOperador("Todos"); setPeriodo("Últimas 24h"); }}
              className="text-xs font-bold text-primary hover:underline ml-1"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* ─── Split Gauges (OEE vs TEEP) ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 anim-d1">
        {/* OEE Card */}
        <Card className="border-t-4 border-t-primary shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <GaugeMeter 
                  value={metrics.oee} 
                  color={C.primary} 
                  colorEnd={C.primaryDark} 
                  title="OEE Geral" 
                  subtitle="Eficácia Global do Equipamento"
                />
              </div>
              <div className="flex-1 w-full space-y-5 px-4 lg:px-0">
                <SimpleBar label="Disponibilidade" value={metrics.disponibilidade} color={C.blue} />
                <SimpleBar label="Performance" value={metrics.performance} color={C.orange} />
                <SimpleBar label="Qualidade" value={metrics.qualidade} color={C.primary} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TEEP Card */}
        <Card className="border-t-4 border-t-purple-500 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
              <div className="flex-1">
                <GaugeMeter 
                  value={metrics.teep} 
                  color={C.purple} 
                  colorEnd={C.purpleDark} 
                  title="TEEP Geral" 
                  subtitle="Performance Total (24/7)"
                />
              </div>
              <div className="flex-1 w-full space-y-5 px-4 lg:px-0">
                <SimpleBar label="Utilização" value={Math.round((metrics.tempoOperacional / metrics.tempoCalendario) * 100)} color={C.blue} />
                <SimpleBar label="OEE (Disp/Perf/Qual)" value={metrics.oee} color={C.primary} />
                <div className="bg-purple-50 p-2.5 rounded-md border border-purple-100 flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-purple-800">Gap de Capacidade</div>
                    <div className="text-sm font-black text-purple-900">{100 - metrics.teep}% Perda Real</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Comparative Chart ─────────────────────────────────────── */}
      <Card className="anim-d2 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-5">
          <CardTitle className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Comparativo de Tendência ({periodo})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics.trendData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="oeeG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.primary} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={C.primary} stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="teepG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.purple} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={C.purple} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="hora" tick={{ fontSize: 10, fill: C.navy, fontWeight: 600 }} interval={1} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: C.muted }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip 
                  contentStyle={{ fontSize: 11, borderRadius: 8, fontWeight: 700, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                  itemStyle={{ fontWeight: 800 }} 
                />
                
                {/* TEEP (Lower value usually) */}
                <Area 
                  type="monotone" 
                  dataKey="teep" 
                  name="TEEP %"
                  stroke={C.purple} 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#teepG)" 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  animationDuration={1500}
                />
                
                {/* OEE (Higher value) */}
                <Area 
                  type="monotone" 
                  dataKey="oee" 
                  name="OEE %"
                  stroke={C.primaryDark} 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#oeeG)" 
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  animationDuration={1500}
                />
                
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-[#3BB87A]" />
               <span className="text-xs font-bold text-foreground">OEE</span>
               <span className="text-[10px] text-muted-foreground">(Plano de Produção)</span>
             </div>
             <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
               <span className="text-xs font-bold text-foreground">TEEP</span>
               <span className="text-[10px] text-muted-foreground">(Capacidade Máx 24h)</span>
             </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center anim-d2">
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
          Dados alimentados via Server Actions
        </Badge>
      </div>
    </div>
  );
}
