"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, RefreshCw, CheckCircle, Clock, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Sessao {
  id: string;
  operador_matricula: string;
  inicio_sessao: string;
  fim_sessao: string | null;
  status: string;
  total_refugo: number;
  maquinas: { num_maq: string; nome: string } | null;
  produto_codigo: string;
}

interface ExportItem {
  id: string;
  item_codigo: string;
  quantidade_total: number;
  status_importacao: string;
  data_finalizacao: string;
  log_erro: string | null;
}

export default function GestaoPage() {
  const [sessoes, setSessoes] = useState<Sessao[]>([]);
  const [exportQueue, setExportQueue] = useState<ExportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"sessoes" | "export">("sessoes");

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [sessoesRes, exportRes] = await Promise.all([
      supabase
        .schema("apont_rubber_prensa")
        .from("sessoes_producao")
        .select("*, maquinas(num_maq, nome)")
        .order("inicio_sessao", { ascending: false })
        .limit(50),
      supabase
        .schema("apont_rubber_prensa")
        .from("export_datasul")
        .select("*")
        .order("data_finalizacao", { ascending: false })
        .limit(50),
    ]);

    setSessoes((sessoesRes.data as unknown as Sessao[]) || []);
    setExportQueue((exportRes.data as ExportItem[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusBadge = (status: string) => {
    switch (status) {
      case "em_andamento":
        return <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50">Em Andamento</Badge>;
      case "finalizado":
        return <Badge className="bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/50">Finalizado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const exportBadge = (status: string) => {
    switch (status) {
      case "pendente":
        return <Badge className="bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/50"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
      case "processado":
        return <Badge className="bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/50"><CheckCircle className="w-3 h-3 mr-1" />Processado</Badge>;
      case "erro":
        return <Badge className="bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/50"><XCircle className="w-3 h-3 mr-1" />Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full py-8 px-4 sm:px-6 lg:px-8">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        {/* Tabs */}
        <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
          <button
            onClick={() => setTab("sessoes")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === "sessoes" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sessões ({sessoes.length})
          </button>
          <button
            onClick={() => setTab("export")}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              tab === "export" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Fila Datasul ({exportQueue.length})
          </button>
        </div>

        <Button onClick={fetchData} disabled={loading} variant="outline" className="border-border text-foreground shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Atualizar Dados
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : tab === "sessoes" ? (
        <div className="space-y-3">
          {sessoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Nenhuma sessão registrada.</p>
          ) : (
            sessoes.map((s) => (
              <Card key={s.id} className="hover:shadow-md transition-shadow border-border/50">
                <CardContent className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 py-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg text-foreground">{s.maquinas?.num_maq || "-"}</span>
                      <span className="text-muted-foreground">|</span>
                      <span className="text-foreground">{s.produto_codigo || "-"}</span>
                      {statusBadge(s.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Operador: {s.operador_matricula} · Início:{" "}
                      {new Date(s.inicio_sessao).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {s.fim_sessao && (
                        <>
                          {" "}· Fim:{" "}
                          {new Date(s.fim_sessao).toLocaleString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </>
                      )}
                    </p>
                  </div>
                  {s.status === "finalizado" && s.total_refugo > 0 && (
                    <Badge variant="destructive" className="bg-red-500/10 text-destructive border-destructive/20 hover:bg-red-500/20">Refugos: {s.total_refugo}</Badge>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {exportQueue.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">Fila de exportação vazia.</p>
          ) : (
            exportQueue.map((e) => (
              <Card key={e.id} className="border-border/50 hover:border-border transition-colors">
                <CardContent className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 py-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">{e.item_codigo || "-"}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-foreground">{e.quantidade_total} peças</span>
                      {exportBadge(e.status_importacao)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.data_finalizacao).toLocaleString("pt-BR")}
                    </p>
                    {e.log_erro && <p className="text-xs text-destructive mt-1">{e.log_erro}</p>}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
