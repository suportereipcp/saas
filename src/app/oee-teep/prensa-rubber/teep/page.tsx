"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { BarChart3, Clock, Settings, Gauge, Filter, TrendingUp } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { DateRange } from "react-day-picker";
import { subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
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

// ─── SVG Gauge ─────────────────────────────────────────────────────────────

function GaugeMeter({
  value, size = 160, color, colorEnd, arcWidth = 12, showScale = true,
}: {
  value: number; size?: number; color: string; colorEnd?: string;
  arcWidth?: number; showScale?: boolean;
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
  const h = size * 0.72 + pad;
  const cx = w / 2;
  const cy = h - 12;
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
  const marks = showScale ? [0, 25, 50, 75, 100] : [];

  return (
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
      {marks.map((m) => {
        const a = Math.PI - (m / 100) * Math.PI;
        const o = polar(a, r + arcWidth / 2 + 4);
        const i = polar(a, r + arcWidth / 2 + 10);
        const lp = polar(a, r + arcWidth / 2 + 22);
        return (
          <g key={m}>
            <line x1={o.x} y1={o.y} x2={i.x} y2={i.y} stroke="#94a3b8" strokeWidth={1.5} />
            <text x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle"
              fontSize={11} fill="#475569" fontWeight="700">{m}</text>
          </g>
        );
      })}
      <polygon points={`${nEnd.x},${nEnd.y} ${bL.x},${bL.y} ${bR.x},${bR.y}`} fill={C.navy} opacity={0.85} />
      <circle cx={cx} cy={cy} r={5} fill={C.navy} />
      <circle cx={cx} cy={cy} r={2.5} fill="#fff" />
      <text x={cx} y={cy - 22} textAnchor="middle" fontSize={size * 0.18} fontWeight="900" fill={color} fontFamily="system-ui">
        {animVal}%
      </text>
    </svg>
  );
}

// ─── Animated Progress Bar ─────────────────────────────────────────────────

function ProgressBar({ value, color, colorEnd }: {
  value: number; color: string; colorEnd?: string;
}) {
  const [animVal, setAnimVal] = useState(0);
  useEffect(() => {
    const dur = 1000;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      setAnimVal(Math.round((1 - Math.pow(1 - p, 3)) * value));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);

  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${animVal}%`,
            background: colorEnd ? `linear-gradient(90deg, ${color}, ${colorEnd})` : color,
          }} />
      </div>
      <span className="text-sm font-black tabular-nums min-w-[38px] text-right" style={{ color }}>{animVal}%</span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function PrensaRubberTeepPage() {
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

      {/* ─── Filters ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap anim-d0">
        <div className="flex items-center gap-1.5 mr-1">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Filtros</span>
        </div>

        {/* Período */}
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[170px] h-9 text-sm font-semibold">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            {PERIODOS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>

        {periodo === "Personalizado" && (
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
        )}

        {/* Máquina */}
        <SearchableSelect
          options={maquinasOptions}
          value={maquina}
          onChange={setMaquina}
          placeholder="Máquina..."
          className="w-[180px]"
        />

        {/* Operador */}
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

      {/* ─── KPI Gauges ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-3 anim-d0">
        {[
          { label: "TEEP Geral", value: metrics.teep, color: C.purple, colorEnd: C.purpleDark, icon: TrendingUp },
          { label: "Utilização", value: Math.round((metrics.tempoOperacional / metrics.tempoCalendario) * 100) || 0, color: C.blue, colorEnd: C.blueDark, icon: Clock },
          { label: "Disponibilidade", value: metrics.disponibilidade, color: C.primary, colorEnd: C.primaryDark, icon: BarChart3 },
          { label: "Perf + Qualidade", value: Math.round((metrics.performance * metrics.qualidade) / 100), color: C.orange, colorEnd: C.orangeDark, icon: Gauge },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="hover:shadow-lg transition-shadow duration-300 overflow-hidden">
              <CardContent className="p-5 pb-6 flex flex-col items-center">
                <p className="text-xs font-bold uppercase tracking-widest text-foreground mb-3 flex items-center gap-1.5 self-start">
                  <Icon className="w-4 h-4" /> {kpi.label}
                </p>
                <GaugeMeter value={kpi.value} size={220} color={kpi.color} colorEnd={kpi.colorEnd} arcWidth={16} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ─── Decomposition + Charts ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 anim-d1">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-xs font-bold uppercase tracking-widest text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Decomposição de Perdas TEEP
            </CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-left py-2 pr-3">Indicador</th>
                  <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right py-2 px-3">Entrada</th>
                  <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right py-2 px-3">Perda</th>
                  <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-right py-2 px-3">Saída</th>
                  <th className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground py-2 pl-4 text-left">Resultado</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-dashed hover:bg-blue-50/30 transition-colors">
                  <td className="py-3.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: C.blue }} />
                      <span className="font-bold text-foreground">Utilização</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-[18px]">Tempo Calendário → Tempo Total</span>
                  </td>
                  <td className="text-right px-3 py-3.5 font-mono font-bold text-foreground">{metrics.tempoCalendario} min</td>
                  <td className="text-right px-3 py-3.5 font-mono text-red-500 font-semibold">-{metrics.tempoCalendario - metrics.tempoOperacional} min</td>
                  <td className="text-right px-3 py-3.5 font-mono font-bold text-foreground">{metrics.tempoOperacional} min</td>
                  <td className="py-3.5 pl-4"><ProgressBar value={Math.round((metrics.tempoOperacional / metrics.tempoCalendario) * 100) || 0} color={C.blue} colorEnd={C.blueDark} /></td>
                </tr>
                <tr className="border-b border-dashed hover:bg-emerald-50/30 transition-colors">
                  <td className="py-3.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: C.primary }} />
                      <span className="font-bold text-foreground">Disponibilidade</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-[18px]">Tempo Total → Operacional</span>
                  </td>
                  <td className="text-right px-3 py-3.5 font-mono font-bold text-foreground">{metrics.tempoOperacional} min</td>
                  <td className="text-right px-3 py-3.5 font-mono text-red-500 font-semibold">-{metrics.tempoOperacional - metrics.tempoProducaoReal} min</td>
                  <td className="text-right px-3 py-3.5 font-mono font-bold text-foreground">{metrics.tempoProducaoReal} min</td>
                  <td className="py-3.5 pl-4"><ProgressBar value={metrics.disponibilidade} color={C.primary} colorEnd={C.primaryDark} /></td>
                </tr>
                <tr className="border-b border-dashed hover:bg-amber-50/30 transition-colors">
                  <td className="py-3.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: C.orange }} />
                      <span className="font-bold text-foreground">Performance</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-[18px]">Tempo Oper. → Produção real</span>
                  </td>
                  <td className="text-right px-3 py-3.5 font-mono font-bold text-foreground">{metrics.tempoProducaoReal} min</td>
                  <td className="text-right px-3 py-3.5 font-mono text-red-500 font-semibold">-{Math.round(metrics.tempoProducaoReal * (1 - (metrics.performance/100)))} min</td>
                  <td className="text-right px-3 py-3.5 font-mono font-bold text-foreground">{Math.round(metrics.tempoProducaoReal * (metrics.performance/100))} min</td>
                  <td className="py-3.5 pl-4"><ProgressBar value={metrics.performance} color={C.orange} colorEnd={C.orangeDark} /></td>
                </tr>
                <tr className="hover:bg-purple-50/30 transition-colors">
                  <td className="py-3.5 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: C.purple }} />
                      <span className="font-bold text-foreground">Qualidade</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground ml-[18px]">Produzidas → Peças boas</span>
                  </td>
                  <td className="text-right px-3 py-3.5 font-mono font-bold text-foreground">100%</td>
                  <td className="text-right px-3 py-3.5 font-mono text-red-500 font-semibold">-</td>
                  <td className="text-right px-3 py-3.5 font-mono font-bold text-foreground">100%</td>
                  <td className="py-3.5 pl-4"><ProgressBar value={metrics.qualidade} color={C.purple} colorEnd={C.purpleDark} /></td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Tendência de TEEP ({periodo === "Personalizado" ? "Período selecionado" : periodo})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <div style={{ height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={metrics.trendData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="teepGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.purple} stopOpacity={0.25} />
                        <stop offset="95%" stopColor={C.purple} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="hora" tick={{ fontSize: 8, fill: C.muted }} interval={5} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                    <Area
                      type="natural"
                      dataKey="teep"
                      stroke={C.purple}
                      strokeWidth={2.5}
                      fill="url(#teepGrad)"
                      dot={{ r: 2.5, fill: C.purple, strokeWidth: 0 }}
                      activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: C.purple }}
                      animationDuration={2000}
                      animationEasing="ease-in-out"
                    >
                      <LabelList
                        dataKey="teep"
                        position="top"
                        offset={6}
                        style={{ fontSize: 7, fill: C.navy, fontWeight: 700 }}
                        formatter={(v: unknown) => `${v}%`}
                      />
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Perdas de Calendário e Paradas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 pb-3">
              <div style={{ height: 165 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.paretoData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="motivo" tick={{ fontSize: 8, fill: C.muted }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8 }} />
                    <Bar dataKey="minutos" fill={C.purple} radius={[4, 4, 0, 0]} animationDuration={1200}>
                      <LabelList
                        dataKey="minutos"
                        position="top"
                        offset={6}
                        style={{ fontSize: 8, fill: C.navy, fontWeight: 700 }}
                        formatter={(v: unknown) => `${v}m`}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="text-center anim-d2">
        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
          Dados alimentados via Server Actions
        </Badge>
      </div>
    </div>
  );
}
