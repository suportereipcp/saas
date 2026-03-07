"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Activity,
  Database,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Ghost,
  Filter,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface UnifiedRow {
  pulso_id: string;
  pulso_pecas: number;
  pulso_timestamp: string;
  pulso_criado: string;
  sessao_id: string | null;
  sessao_maquina: string | null;
  sessao_produto: string | null;
  sessao_operador: string | null;
  sessao_plato: number | null;
  sessao_status: string | null;
  sessao_qtd: number;
  export_status: string;
  export_updated_at: string | null;
}

interface DiagnosticData {
  syncState: { id: number; ultimo_mariadb_id: number; ultima_sincronizacao: string } | null;
  totalPulsos: number;
  sessoesAtivas: number;
  totalExportsPendentes: number;
  alertasAtivos: any[];
  maquinas: any[];
  tabelaUnificada: UnifiedRow[];
  diagnostico: {
    pulsosSemSessao: number;
    sessoesOciosas: number;
    alertasFantasmaAtivos: number;
  };
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

function timeSince(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h${m % 60}m`;
  return `${Math.floor(h / 24)}d`;
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Badge
      variant="outline"
      className={`text-xs font-semibold px-2 py-0.5 ${
        ok ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-red-500 bg-red-50 text-red-600"
      }`}
    >
      {ok ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
      {label}
    </Badge>
  );
}

function ExportStatusBadge({ status, updatedAt }: { status: string; updatedAt?: string | null }) {
  const map: Record<string, { label: string; cls: string }> = {
    pendente: { label: "PENDENTE", cls: "border-amber-500 bg-amber-50 text-amber-700" },
    em_andamento: { label: "EM ANDAMENTO", cls: "border-blue-500 bg-blue-50 text-blue-700" },
    importado: { label: "CONCLUÍDO", cls: "border-emerald-500 bg-emerald-50 text-emerald-700" },
    erro: { label: "COM ERRO", cls: "border-red-500 bg-red-50 text-red-600" },
    sem_export: { label: "SEM EXPORT", cls: "border-gray-300 bg-gray-50 text-gray-500" },
    sem_sessao: { label: "SEM SESSÃO", cls: "border-red-300 bg-red-50 text-red-500" },
  };
  const cfg = map[status] || map.sem_export;
  return (
    <div className="flex flex-col items-start gap-0.5">
      <Badge variant="outline" className={`text-[10px] font-bold px-2 py-0.5 ${cfg.cls}`}>
        {cfg.label}
      </Badge>
      {updatedAt && <span className="text-[9px] text-muted-foreground">{timeSince(updatedAt)}</span>}
    </div>
  );
}

export default function SyncDiagnosticsPage() {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [page, setPage] = useState(0);
  const [filterMaquina, setFilterMaquina] = useState<string>("");
  const [filterProduto, setFilterProduto] = useState<string>("");
  const [filterExport, setFilterExport] = useState<string>("");
  const [filterValidacao, setFilterValidacao] = useState<string>("");
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const PAGE_SIZE = 10;

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/apont-rubber-prensa/sync-diagnostics");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(fetchData, 10_000);
    return () => clearInterval(iv);
  }, [autoRefresh, fetchData]);

  const getMaqNome = (id: string | null) => {
    if (!id) return "—";
    const maq = data?.maquinas?.find((m) => m.id === id);
    return maq ? `Prensa ${maq.num_maq}` : id.slice(0, 8);
  };

  const syncAge = data?.syncState?.ultima_sincronizacao
    ? (Date.now() - new Date(data.syncState.ultima_sincronizacao).getTime()) / 1000
    : Infinity;
  const syncOk = syncAge < 30;
  const diag = data?.diagnostico;

  // Filtered data
  const allRows = data?.tabelaUnificada || [];
  const filteredRows = allRows.filter(row => {
    if (filterMaquina && !getMaqNome(row.sessao_maquina).toLowerCase().includes(filterMaquina.toLowerCase())) return false;
    if (filterProduto && !(row.sessao_produto || "").toLowerCase().includes(filterProduto.toLowerCase())) return false;
    if (filterExport && row.export_status !== filterExport) return false;
    const validacao = (row.sessao_id && row.export_status !== "sem_sessao") ? "ok" : "erro";
    if (filterValidacao && validacao !== filterValidacao) return false;
    return true;
  });
  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);
  const pagedRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Unique values for export filter only
  const uniqueExportStatus = [...new Set(allRows.map(r => r.export_status))];

  const exportStatusLabel: Record<string, string> = {
    pendente: "Pendente",
    em_andamento: "Em Andamento",
    importado: "Concluído",
    erro: "Com Erro",
    sem_sessao: "Sem Sessão",
  };

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [filterMaquina, filterProduto, filterExport, filterValidacao]);

  function TextFilter({ value, onChange, placeholder }: {
    value: string; onChange: (v: string) => void; placeholder: string;
  }) {
    return (
      <div className="relative inline-block ml-1">
        <button
          onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === placeholder ? null : placeholder); }}
          className={`p-0.5 rounded hover:bg-muted ${value ? "text-emerald-600" : "text-muted-foreground"}`}
        >
          <Filter className="w-3.5 h-3.5" />
        </button>
        {openFilter === placeholder && (
          <div className="absolute z-50 top-6 left-0 bg-white border rounded-lg shadow-lg p-2 min-w-[160px]" onClick={e => e.stopPropagation()}>
            <input
              autoFocus
              type="text"
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full text-xs border rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-emerald-500"
            />
            {value && (
              <button className="text-[10px] text-muted-foreground mt-1 hover:text-red-500" onClick={() => onChange("")}>
                Limpar
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  function DropdownFilter({ column, value, options, labels, onChange }: {
    column: string; value: string; options: string[]; labels?: Record<string, string>;
    onChange: (v: string) => void;
  }) {
    const isOpen = openFilter === column;
    return (
      <div className="relative inline-block ml-1">
        <button
          onClick={(e) => { e.stopPropagation(); setOpenFilter(isOpen ? null : column); }}
          className={`p-0.5 rounded hover:bg-muted ${value ? "text-emerald-600" : "text-muted-foreground"}`}
        >
          <Filter className="w-3.5 h-3.5" />
        </button>
        {isOpen && (
          <div className="absolute z-50 top-6 left-0 bg-white border rounded-lg shadow-lg py-1 min-w-[140px]">
            <button
              className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-muted ${!value ? "font-bold text-emerald-600" : ""}`}
              onClick={() => { onChange(""); setOpenFilter(null); }}
            >
              Todos
            </button>
            {options.map(opt => (
              <button
                key={opt}
                className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-muted ${value === opt ? "font-bold text-emerald-600" : ""}`}
                onClick={() => { onChange(opt); setOpenFilter(null); }}
              >
                {labels?.[opt] || opt}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 space-y-3" onClick={() => setOpenFilter(null)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/apont-rubber-prensa">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              Sync Diagnostics
            </h1>
            <p className="text-xs text-muted-foreground">Integração MariaDB → Supabase</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? "default" : "outline"} size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${autoRefresh ? "animate-spin" : ""}`} />
            {autoRefresh ? "Auto 10s" : "Parado"}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchData}>Atualizar</Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-600 text-sm">
          <AlertTriangle className="w-4 h-4 inline mr-1" /> {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-2 text-center">
            <div className="text-xl font-black text-emerald-600">{data?.syncState?.ultimo_mariadb_id || "—"}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Último MariaDB ID</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 text-center">
            <div className="text-xl font-black text-blue-600">{data?.totalPulsos || 0}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Pulsos</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 text-center">
            <div className="text-xl font-black text-amber-600">{typeof data?.sessoesAtivas === "number" ? data.sessoesAtivas : Array.isArray(data?.sessoesAtivas) ? (data.sessoesAtivas as any[]).length : 0}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Sessões Ativas</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 text-center">
            <div className="text-xl font-black text-purple-600">{data?.totalExportsPendentes || 0}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider">Exports Pendentes</div>
          </CardContent>
        </Card>
      </div>

      {/* Sync State - inline */}
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center gap-6 text-xs">
            <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Database className="w-3.5 h-3.5" /> sync_state
            </span>
            <span>ID: <strong className="font-mono">{data?.syncState?.ultimo_mariadb_id || "—"}</strong></span>
            <span>Sync: <strong className="font-mono">{data?.syncState?.ultima_sincronizacao ? formatDate(data.syncState.ultima_sincronizacao) : "—"}</strong></span>
            <span className={syncOk ? "text-emerald-600 font-bold" : "text-red-600 font-bold"}>
              {data?.syncState?.ultima_sincronizacao ? timeSince(data.syncState.ultima_sincronizacao) + " atrás" : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Ghost Alerts */}
      {data?.alertasAtivos && data.alertasAtivos.length > 0 && (
        <Card className="border-amber-300">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-amber-600 flex items-center gap-2">
              <Ghost className="w-4 h-4" /> Alertas Fantasma ({data.alertasAtivos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.alertasAtivos.map((a) => (
              <div key={a.id} className="flex items-center justify-between bg-amber-50 rounded px-3 py-2 mb-1 border border-amber-200 text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="font-bold">{getMaqNome(a.maquina_id)}</span>
                </div>
                <span className="text-muted-foreground">{a.metadata?.pulsos_perdidos?.length || 1} pulso(s) • {formatDate(a.created_at)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tabela Unificada */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Rastreamento Pulso → Sessão → Export
            </CardTitle>
            {(filterMaquina || filterProduto || filterExport) && (
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground"
                onClick={() => { setFilterMaquina(""); setFilterProduto(""); setFilterExport(""); setFilterValidacao(""); }}>
                Limpar filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">MariaDB ID</th>
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Peças</th>
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">
                  <span className="flex items-center">
                    Máquina
                    <TextFilter value={filterMaquina} onChange={setFilterMaquina} placeholder="Buscar máquina..." />
                  </span>
                </th>
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">
                  <span className="flex items-center">
                    Produto
                    <TextFilter value={filterProduto} onChange={setFilterProduto} placeholder="Buscar produto..." />
                  </span>
                </th>
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Plato</th>
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Sessão ID</th>
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">Sessão</th>
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">
                  <span className="flex items-center">
                    Exportação Datasul
                    <DropdownFilter column="export" value={filterExport} options={uniqueExportStatus} labels={exportStatusLabel} onChange={setFilterExport} />
                  </span>
                </th>
                <th className="text-left px-4 py-2 font-semibold text-muted-foreground">
                  <span className="flex items-center">
                    Validação
                    <DropdownFilter column="validacao" value={filterValidacao} options={["ok","erro"]} labels={{ok:"OK",erro:"Com Erro"}} onChange={setFilterValidacao} />
                  </span>
                </th>
                <th className="text-right px-4 py-2 font-semibold text-muted-foreground">Criado</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row, i) => (
                <tr
                  key={i}
                  className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${!row.sessao_id ? "bg-red-50" : ""}`}
                >
                  <td className="px-4 py-2 font-mono font-bold text-xs">{row.pulso_id || "—"}</td>
                  <td className="px-4 py-2">{row.pulso_pecas}</td>
                  <td className="px-4 py-2 font-semibold">{getMaqNome(row.sessao_maquina)}</td>
                  <td className="px-4 py-2 text-xs">{row.sessao_produto || "—"}</td>
                  <td className="px-4 py-2">
                    {row.sessao_plato ? <Badge variant="outline" className="text-[10px]">P{row.sessao_plato}</Badge> : "—"}
                  </td>
                  <td className="px-4 py-2 font-mono text-[10px] text-muted-foreground">
                    {row.sessao_id ? row.sessao_id.slice(0, 8) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {row.sessao_status === "em_andamento" ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">ATIVO</Badge>
                    ) : row.sessao_status === "finalizado" ? (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">FIM</Badge>
                    ) : (
                      <span className="text-red-500 text-xs font-bold">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2"><ExportStatusBadge status={row.export_status} updatedAt={row.export_updated_at} /></td>
                  <td className="px-4 py-2">
                    {row.sessao_id && row.export_status !== "sem_sessao" ? (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300 text-[10px]">OK</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-600 border-red-300 text-[10px]">Com Erro</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-xs text-muted-foreground">
                    {row.pulso_criado ? timeSince(row.pulso_criado) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-xs text-muted-foreground">
              {filteredRows.length} registro(s) • Página {page + 1} de {totalPages || 1}
            </span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
