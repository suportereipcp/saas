"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Play, Square, AlertTriangle, Layers, Search, Factory, ArrowLeft, XCircle, Settings, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Maquina {
  id: string;
  num_maq: string;
  nome: string;
  setor: string | null;
  qtd_platos: number;
}

interface Produto {
  codigo_item: string;
  descricao: string;
  tempo_ciclo_ideal_segundos: number;
  cavidades: number;
}

interface Operador {
  matricula: string;
  nome: string;
}

interface SessaoAtiva {
  id: string;
  maquina_id: string;
  produto_codigo: string;
  plato: number;
  operador_matricula: string;
  inicio_sessao: string;
  status: string;
  total_refugo: number;
}

interface Parada {
  id: string;
  inicio_parada: string;
  fim_parada: string | null;
  motivo_id: string | null;
  justificada: boolean;
  sessao_id: string;
}

const MOTIVOS_PARADA = [
  { id: "setup", label: "Setup / Troca de Molde" },
  { id: "manutencao", label: "Manutenção Corretiva" },
  { id: "material", label: "Falta de Material" },
  { id: "qualidade", label: "Problema de Qualidade" },
  { id: "intervalo", label: "Intervalo / Refeição" },
  { id: "outro", label: "Outro" },
];

export default function OperadorPage() {
  const [viewMode, setViewMode] = useState<"maquinas" | "painel">("maquinas");
  const [selectedMaquina, setSelectedMaquina] = useState<string>("");

  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [sessoesAtivas, setSessoesAtivas] = useState<SessaoAtiva[]>([]);
  const [paradasPendentes, setParadasPendentes] = useState<Parada[]>([]);
  const [pulsosCount, setPulsosCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Estado Global do Operador
  const [globalOperador, setGlobalOperador] = useState("");
  const [buscaGlobalOperador, setBuscaGlobalOperador] = useState("");
  const [globalOperadorOptions, setGlobalOperadorOptions] = useState<Operador[]>([]);

  // Estado dos formulários de início (produtos por plato)
  const [formsData, setFormsData] = useState<Record<number, { produto: string; buscaProduto: string }>>({});
  const [produtoOptions, setProdutoOptions] = useState<Record<number, Produto[]>>({});
  
  // Refugos e Modal
  const [modalAcoesOpen, setModalAcoesOpen] = useState(false);
  const [refugosForms, setRefugosForms] = useState<Record<string, number>>({});

  const maquinaAtiva = maquinas.find((m) => m.id === selectedMaquina);

  const loadCadastros = useCallback(async () => {
    const { data } = await supabase.schema("apont_rubber_prensa").from("maquinas").select("*").eq("ativo", true).order("num_maq");
    setMaquinas(data || []);
  }, []);

  const searchProdutoAsync = async (plato: number, query: string) => {
    updateForm(plato, "buscaProduto", query);
    if (!query || query.length < 2) {
      setProdutoOptions((prev) => ({ ...prev, [plato]: [] }));
      return;
    }
    try {
      const res = await fetch(`/api/apont-rubber-prensa/produtos?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const { data } = await res.json();
        setProdutoOptions((prev) => ({ ...prev, [plato]: data || [] }));
      }
    } catch (e) {
      console.error("fetch produto:", e);
    }
  };

  const searchGlobalOperadorAsync = async (query: string) => {
    setBuscaGlobalOperador(query);
    if (!query || query.length < 2) {
      setGlobalOperadorOptions([]);
      return;
    }
    try {
      const res = await fetch(`/api/apont-rubber-prensa/operadores?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const { data } = await res.json();
        setGlobalOperadorOptions(data || []);
      }
    } catch (e) {
      console.error("fetch operador:", e);
    }
  };

  const checkSessoesAtivas = useCallback(async () => {
    const { data } = await supabase
      .schema("apont_rubber_prensa")
      .from("sessoes_producao")
      .select("*")
      .eq("status", "em_andamento")
      .order("plato", { ascending: true });

    const sessoes = data || [];
    setSessoesAtivas(sessoes);

    const counts: Record<string, number> = {};
    for (const s of sessoes) {
      const { data: pulsos } = await supabase
        .schema("apont_rubber_prensa")
        .from("pulsos_producao")
        .select("qtd_pecas")
        .eq("sessao_id", s.id);
      
      const sumPecas = (pulsos || []).reduce((acc, p) => acc + (p.qtd_pecas || 0), 0);
      counts[s.id] = sumPecas;
    }
    setPulsosCount(counts);

    if (sessoes.length > 0) {
      const sessaoIds = sessoes.map((s) => s.id);
      const { data: paradas } = await supabase
        .schema("apont_rubber_prensa")
        .from("paradas_maquina")
        .select("*")
        .in("sessao_id", sessaoIds)
        .is("fim_parada", null); 
      setParadasPendentes(paradas || []);
    } else {
      setParadasPendentes([]);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadCadastros();
      await checkSessoesAtivas();
      setLoading(false);
    };
    init();
    const interval = setInterval(checkSessoesAtivas, 10_000);
    return () => clearInterval(interval);
  }, [loadCadastros, checkSessoesAtivas]);

  const updateForm = (plato: number, key: "produto" | "buscaProduto", val: string) => {
    setFormsData((prev) => ({
      ...prev,
      [plato]: { ...(prev[plato] || { produto: "", buscaProduto: "" }), [key]: val },
    }));
  };

  const iniciarSessoesSelecionadas = async () => {
    if (!selectedMaquina) return;
    
    setActionLoading(true);
    try {
      const platosLivres = Array.from({ length: maquinaAtiva?.qtd_platos || 0 }, (_, i) => i + 1)
        .filter(plato => !sessoesAtivas.some(s => s.plato === plato));

      for (const plato of platosLivres) {
        const data = formsData[plato];
        const produtoFinal = data?.produto || data?.buscaProduto;
        const operadorFinal = globalOperador || buscaGlobalOperador;
        
        if (produtoFinal && operadorFinal) {
          await fetch("/api/apont-rubber-prensa/sessoes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              maquina_id: selectedMaquina,
              produto_codigo: produtoFinal,
              plato: plato,
              operador_matricula: operadorFinal,
            }),
          });
          // Limpa formulário daquele plato
          setFormsData((prev) => ({ ...prev, [plato]: { produto: "", buscaProduto: "" } }));
        }
      }
      await checkSessoesAtivas();
    } finally {
      setActionLoading(false);
    }
  };

  const finalizarPlatoUnico = async (sessaoId: string) => {
    setActionLoading(true);
    try {
      await fetch("/api/apont-rubber-prensa/sessoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessao_id: sessaoId,
          total_refugo: refugosForms[sessaoId] || 0,
        }),
      });
      // Limpa refugo do estado
      setRefugosForms((prev) => {
        const next = { ...prev };
        delete next[sessaoId];
        return next;
      });
      await checkSessoesAtivas();
    } finally {
      setActionLoading(false);
    }
  };

  const justificarParada = async (paradaId: string, motivoId: string) => {
    await fetch("/api/apont-rubber-prensa/paradas", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parada_id: paradaId,
        motivo_id: motivoId,
        classificacao: motivoId === "intervalo" ? "planejada" : "nao_planejada",
      }),
    });
    await checkSessoesAtivas();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ==========================================
  // VIEW: DASHBOARD DE MÁQUINAS
  // ==========================================
  if (viewMode === "maquinas") {
    // Mantemos a tela inicial de seleção inalterada
    return (
      <div className="flex flex-col gap-8 w-full py-8 px-4 sm:px-6 lg:px-8">
        {maquinas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Factory className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold text-foreground">Nenhuma Máquina Encontrada</h2>
          </div>
        ) : (
          <div className="flex flex-wrap gap-6">
            {maquinas.map((maq) => {
              const ocupados = sessoesAtivas.filter((s) => s.maquina_id === maq.id).length;
              const paradas = sessoesAtivas
                .filter((s) => s.maquina_id === maq.id)
                .some((s) => paradasPendentes.some((p) => p.sessao_id === s.id));

              let bgClass = "bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary/50 text-foreground";
              if (paradas) bgClass = "bg-destructive/10 border-destructive/30 hover:bg-destructive/20 hover:border-destructive/50 text-foreground";
              else if (ocupados > 0) bgClass = "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 text-emerald-600 dark:text-emerald-400";

              return (
                <div 
                  key={maq.id} 
                  className={`cursor-pointer rounded-2xl flex flex-col items-center justify-center w-[160px] h-[160px] border-2 transition-transform duration-200 hover:scale-105 ${bgClass}`}
                  onClick={() => { setSelectedMaquina(maq.id); setViewMode("painel"); }}
                >
                   <span className="text-xl sm:text-2xl font-black uppercase tracking-widest text-center px-1">
                     Prensa {maq.num_maq}
                   </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // VIEW: PAINEL DA MÁQUINA SELECIONADA (SINGLE FOLD)
  // ==========================================
  if (!maquinaAtiva) return null;

  // CÁLCULO DE STATUS GLOBAL DA MÁQUINA
  const paradasDaMaquina = paradasPendentes.filter(p => sessoesAtivas.some(s => s.id === p.sessao_id));
  
  const isAnyPlatoMaintenance = paradasDaMaquina.some(p => p.justificada && p.motivo_id === "manutencao");
  const isAnyPlatoParadoNaoJustificado = paradasDaMaquina.some(p => !p.justificada);
  const isAnyPlatoOutraParada = paradasDaMaquina.some(p => p.justificada && p.motivo_id !== "manutencao");
  const isEmProducao = sessoesAtivas.length > 0 && paradasDaMaquina.length === 0;

  let statusGlobal = "PARADA / OCIOSA";
  let statusColorClass = "border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/40";
  let statusHeaderBgClass = "bg-gray-500 dark:bg-gray-700 text-white";

  if (isAnyPlatoParadoNaoJustificado) {
    statusGlobal = "PARADA NÃO JUSTIFICADA";
    statusColorClass = "border-destructive dark:border-red-600 bg-destructive/10 dark:bg-red-900/20";
    statusHeaderBgClass = "bg-destructive dark:bg-red-600 text-white";
  } else if (isAnyPlatoMaintenance) {
    statusGlobal = "MÁQUINA EM MANUTENÇÃO";
    statusColorClass = "border-red-600 dark:border-red-500 bg-red-100 dark:bg-red-950/40";
    statusHeaderBgClass = "bg-red-600 text-white";
  } else if (isEmProducao) {
    statusGlobal = "MÁQUINA EM PRODUÇÃO";
    statusColorClass = "border-emerald-500 dark:border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40";
    statusHeaderBgClass = "bg-emerald-600 text-white";
  } else if (isAnyPlatoOutraParada) {
    statusGlobal = "MÁQUINA PARADA (JUSTIFICADA)";
    statusColorClass = "border-gray-500 bg-gray-100 dark:bg-gray-800";
    statusHeaderBgClass = "bg-gray-600 text-white";
  }

  // Verifica se o Operador tem platos selecionados mas que ainda não iniciaram
  const temPlatoParaIniciar = Array.from({ length: maquinaAtiva.qtd_platos }, (_, i) => i + 1).some(plato => {
    const isLivre = !sessoesAtivas.some(s => s.plato === plato);
    const hasData = formsData[plato]?.produto || formsData[plato]?.buscaProduto;
    return isLivre && hasData;
  });

  return (
    <div className="flex flex-col min-h-[100vh] w-full bg-background relative pb-28">
      
      {/* HEADER DE NAVEGAÇÃO SUPERIOR (Simples) */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 xl:py-6 border-b border-border bg-card">
        <Button onClick={() => setViewMode("maquinas")} variant="ghost" size="lg" className="text-base sm:text-lg xl:text-2xl xl:h-14">
          <ArrowLeft className="w-5 h-5 xl:w-8 xl:h-8 mr-2" />
          Voltar
        </Button>
        <div className="text-xl sm:text-2xl xl:text-4xl font-black px-4 py-2 xl:px-8 xl:py-4 bg-muted rounded-xl border border-border">
          PRENSA {maquinaAtiva.num_maq}
        </div>
      </div>

      <div className="flex-1 px-2 sm:px-6 py-6 xl:py-10 pb-12 flex flex-col items-center">
        
        {/* OPERADOR RESPONSÁVEL (Fixo no topo da View) */}
        {!isAnyPlatoParadoNaoJustificado && (
          <div className="w-full max-w-5xl xl:max-w-[90vw] 2xl:max-w-[80vw] mb-6 xl:mb-10">
            <Card className="border-border shadow-sm">
              <CardContent className="pt-6 pb-6 xl:pt-8 xl:pb-8 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-sm xl:text-xl font-bold text-muted-foreground uppercase mb-2">Operador Responsável</h3>
                  {globalOperador ? (
                    <div className="flex items-center justify-between p-3 xl:p-5 bg-muted border border-border/50 rounded-lg">
                      <span className="font-bold text-xl xl:text-3xl">{globalOperador}</span>
                      <Button variant="ghost" onClick={() => { setGlobalOperador(""); setBuscaGlobalOperador(""); }} className="h-10 w-10 xl:h-14 xl:w-14 p-0">
                        <XCircle className="w-6 h-6 xl:w-10 xl:h-10 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <Search className="absolute left-4 top-3.5 w-5 h-5 text-muted-foreground" />
                      <input
                        type="text"
                        value={buscaGlobalOperador}
                        onChange={(e) => searchGlobalOperadorAsync(e.target.value)}
                        placeholder="Matrícula ou Nome do Operador..."
                        className="flex h-12 xl:h-16 w-full rounded-md border border-input bg-background pl-12 pr-4 text-base xl:text-2xl ring-offset-background file:border-0 file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                      {buscaGlobalOperador && (
                        <div className="absolute z-30 w-full mt-1 bg-popover border border-border rounded-md shadow-xl max-h-48 xl:max-h-72 overflow-y-auto">
                          {globalOperadorOptions.length === 0 ? (
                            <p className="text-sm text-center py-4 text-muted-foreground">Operador não localizado.</p>
                          ) : globalOperadorOptions.map(op => (
                            <button
                              key={op.matricula}
                              onClick={() => { setGlobalOperador(op.matricula); setBuscaGlobalOperador(""); }}
                              className="w-full px-4 py-3 text-left hover:bg-muted focus:bg-muted border-b border-border/50 last:border-0"
                            >
                              <span className="font-bold block text-lg">{op.matricula}</span>
                              <span className="text-sm text-muted-foreground block">{op.nome}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* CONTAINER DA MÁQUINA (Borda Dupla Colorida e Status Global) */}
        {/* ========================================================= */}
        <div className={`w-full max-w-5xl xl:max-w-[90vw] 2xl:max-w-[80vw] border-[6px] sm:border-[8px] xl:border-[12px] rounded-2xl xl:rounded-3xl overflow-visible shadow-2xl ${statusColorClass} flex flex-col relative`}>
          
          {/* HEADER DO CONTAINER */}
          <div className={`w-full py-3 sm:py-4 xl:py-8 text-center text-xl sm:text-3xl xl:text-5xl font-black tracking-[0.1em] sm:tracking-[0.2em] shadow-sm ${statusHeaderBgClass}`}>
            {statusGlobal}
          </div>

          {/* GRID DOS PLATORES MANTIDOS NUMA ÚNICA DOBRA */}
          <div className="p-3 sm:p-6 xl:p-10 grid grid-cols-1 gap-4 sm:gap-6 xl:gap-8 h-full min-h-[350px] xl:min-h-[500px]">
            {/* Se houver qualquer parada Não Justificada, trancamos a máquina pedindo Justificativa */}
            {isAnyPlatoParadoNaoJustificado ? (
              <div className="col-span-1 md:col-span-3 flex flex-col items-center justify-center p-6 sm:p-8 xl:p-16 bg-background/80 backdrop-blur-sm rounded-xl border border-destructive/30 space-y-6 sm:space-y-8 xl:space-y-12">
                <div className="flex flex-col items-center gap-3 text-destructive font-black text-2xl sm:text-3xl xl:text-6xl text-center">
                  <AlertTriangle className="w-12 h-12 sm:w-16 sm:h-16 xl:w-28 xl:h-28 animate-pulse" />
                  <span>A MÁQUINA PAROU. QUAL O MOTIVO?</span>
                  {paradasDaMaquina.filter(p => !p.justificada).map(parada => (
                    <span key={parada.id} className="text-lg sm:text-xl xl:text-3xl font-medium text-foreground mt-2">
                      Parada desde {new Date(parada.inicio_parada).toLocaleTimeString("pt-BR")}
                    </span>
                  ))}
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 xl:gap-6 w-full max-w-4xl xl:max-w-7xl">
                  {paradasDaMaquina.filter(p => !p.justificada).map(parada => (
                    MOTIVOS_PARADA.map((motivo) => (
                      <Button
                        key={motivo.id}
                        variant="outline"
                        onClick={() => justificarParada(parada.id, motivo.id)}
                        className="h-16 sm:h-20 xl:h-28 text-base sm:text-lg xl:text-3xl font-bold border-destructive/40 hover:bg-destructive hover:text-white whitespace-normal break-words"
                      >
                        {motivo.label}
                      </Button>
                    ))
                  ))}
                </div>
              </div>
            ) : (
              // SE NÃO HOUVER PARADA TRANCADA, MOSTRA OS PLATOS NORMALMENTE
              Array.from({ length: maquinaAtiva.qtd_platos }, (_, i) => i + 1).map((plato) => {
                const sessaoAtiva = sessoesAtivas.find((s) => s.maquina_id === maquinaAtiva.id && s.plato === plato);
                const formData = formsData[plato] || { produto: "", buscaProduto: "" };
                const pOptions = produtoOptions[plato] || [];

                return (
                  <Card key={plato} className="flex flex-col border-border shadow-sm h-full bg-background/90 backdrop-blur">
                    <CardHeader className="py-2.5 px-3 sm:py-3 sm:px-4 xl:py-6 xl:px-8 border-b border-border/50 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-base sm:text-lg xl:text-3xl text-foreground flex items-center gap-2">
                          <Layers className="w-5 h-5 xl:w-8 xl:h-8" /> Plato {plato}
                        </span>
                        {sessaoAtiva ? (
                          <Badge className="bg-emerald-600 text-white hover:bg-emerald-700 xl:text-xl xl:py-2 xl:px-4">Ativo</Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground xl:text-xl xl:py-2 xl:px-4">Livre</Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="p-4 xl:p-8 flex-1 flex flex-col justify-center">
                      {sessaoAtiva ? (
                        /* PLATO OCUPADO */
                        <div className="flex flex-col space-y-4 xl:space-y-10">
                          <div className="text-center">
                            <span className="text-xs sm:text-sm xl:text-xl font-semibold text-muted-foreground block uppercase mb-1">Produto</span>
                            <span className="text-2xl xl:text-5xl font-black text-foreground">{sessaoAtiva.produto_codigo}</span>
                          </div>
                          
                          <div className="bg-muted p-4 xl:p-8 rounded-lg xl:rounded-2xl border border-border/50 text-center">
                            <span className="text-xs xl:text-xl uppercase font-bold text-muted-foreground tracking-wider mb-2 block">Peças Produzidas</span>
                            <span className="text-5xl xl:text-8xl font-black text-primary font-mono">{pulsosCount[sessaoAtiva.id] || 0}</span>
                          </div>
                          
                          <div className="text-center pt-2 xl:pt-6">
                            <span className="text-sm xl:text-2xl font-medium text-muted-foreground">Operador: <strong className="text-foreground">{sessaoAtiva.operador_matricula}</strong></span>
                          </div>
                        </div>
                      ) : sessoesAtivas.length > 0 ? (
                        /* PLATO BLOQUEADO (HÁ OUTRAS SESSÕES ATIVAS NA MÁQUINA) */
                        <div className="flex flex-col space-y-4 justify-center items-center h-full text-center">
                          <AlertTriangle className="w-12 h-12 xl:w-20 xl:h-20 text-muted-foreground mx-auto opacity-30" />
                          <span className="text-lg xl:text-2xl font-black text-muted-foreground uppercase opacity-50">Plato Bloqueado</span>
                          <span className="text-xs sm:text-sm xl:text-lg text-muted-foreground max-w-xs xl:max-w-md mx-auto opacity-70">
                            Aguarde a finalização de todas as ordens desta máquina para configurar novos itens.
                          </span>
                        </div>
                      ) : (
                        /* PLATO LIVRE (BUSCA DE PRODUTO) */
                        <div className="flex flex-col space-y-4 xl:space-y-8 justify-center h-full">
                          <span className="text-sm xl:text-xl font-semibold text-muted-foreground text-center">Vincular Produto</span>
                          {formData.produto ? (
                            <div className="flex items-center justify-between p-3 xl:p-6 bg-primary/10 border border-primary/20 rounded-lg">
                              <span className="font-bold text-lg xl:text-3xl text-primary truncate max-w-[150px] xl:max-w-xs">{formData.produto}</span>
                              <Button variant="ghost" onClick={() => { updateForm(plato, "produto", ""); updateForm(plato, "buscaProduto", ""); }} className="h-8 w-8 xl:h-14 xl:w-14 p-0">
                                <XCircle className="w-5 h-5 xl:w-8 xl:h-8 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <div className="relative">
                              <Search className="absolute left-3 xl:left-5 top-3.5 xl:top-5 w-4 h-4 xl:w-6 xl:h-6 text-muted-foreground" />
                              <input
                                type="text"
                                value={formData.buscaProduto}
                                onChange={(e) => searchProdutoAsync(plato, e.target.value)}
                                placeholder="Cód/Nome..."
                                className="flex h-11 xl:h-16 w-full rounded-md border border-input bg-background pl-9 xl:pl-14 pr-2 text-sm xl:text-xl ring-offset-background file:border-0 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2"
                              />
                              {formData.buscaProduto && (
                                <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-md shadow-xl max-h-48 xl:max-h-72 overflow-y-auto">
                                  {pOptions.map((prod) => (
                                    <button
                                      key={prod.codigo_item}
                                      onClick={() => updateForm(plato, "produto", prod.codigo_item)}
                                      className="w-full p-3 xl:p-5 text-left hover:bg-muted border-b border-border/50 transition-colors"
                                    >
                                      <span className="font-bold text-foreground block xl:text-xl">{prod.codigo_item}</span>
                                      <span className="text-xs xl:text-base text-muted-foreground block truncate">{prod.descricao}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}

          </div>
        </div>

      </div>

      {/* ========================================================= */}
      {/* BOTÃO MESTRE ÚNICO FLUTUANTE NO RODAPÉ                    */}
      {/* ========================================================= */}
      {!isAnyPlatoParadoNaoJustificado && (
        <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-5 xl:p-8 bg-background/95 backdrop-blur border-t border-border flex justify-center shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)] z-40">
          <div className="w-full max-w-5xl xl:max-w-[70vw] flex gap-4">
            
            {/* BOTÃO INTELIGENTE: INICIAR OU ABRIR MENU DE AÇÕES */}
            {temPlatoParaIniciar ? (
               <Button 
                size="lg"
                className="w-full h-16 sm:h-20 xl:h-28 text-lg sm:text-xl xl:text-4xl font-black tracking-widest uppercase rounded-2xl shadow-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all transform hover:-translate-y-1"
                onClick={iniciarSessoesSelecionadas}
                disabled={actionLoading || !(globalOperador || buscaGlobalOperador)}
               >
                 {actionLoading ? <Loader2 className="w-8 h-8 xl:w-12 xl:h-12 animate-spin" /> : <Play className="w-8 h-8 xl:w-12 xl:h-12 mr-3 xl:mr-6 fill-white" />}
                 Iniciar Platos Selecionados
               </Button>
            ) : sessoesAtivas.length > 0 ? (
               <Button 
                size="lg"
                variant="default"
                className="w-full h-16 sm:h-20 xl:h-28 text-lg sm:text-xl xl:text-4xl font-black tracking-widest uppercase rounded-2xl shadow-lg transition-all transform hover:-translate-y-1"
                onClick={() => setModalAcoesOpen(true)}
               >
                 <Settings className="w-6 h-6 sm:w-8 sm:h-8 xl:w-12 xl:h-12 mr-3 xl:mr-6" />
                 Gerenciar Produção / Finalizar
               </Button>
            ) : (
              <div className="w-full h-16 sm:h-20 xl:h-28 flex items-center justify-center text-sm sm:text-lg xl:text-3xl font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 rounded-2xl border border-dashed border-border px-4 text-center">
                Selecione produtos para iniciar a máquina
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL / POPUP DE FINALIZAÇÃO E REFUGOS                    */}
      {/* ========================================================= */}
      {modalAcoesOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-background rounded-3xl shadow-2xl w-full max-w-3xl xl:max-w-5xl overflow-hidden border border-border flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-5 xl:py-8 border-b border-border bg-muted/40 flex justify-between items-center">
              <h2 className="text-xl sm:text-2xl xl:text-4xl font-black uppercase text-foreground">Gerenciar Platos Ativos</h2>
              <Button variant="ghost" onClick={() => setModalAcoesOpen(false)} className="rounded-full w-12 h-12 xl:w-16 xl:h-16 p-0 bg-background hover:bg-muted border border-border">
                <XCircle className="w-7 h-7 xl:w-10 xl:h-10" />
              </Button>
            </div>

            <div className="p-4 sm:p-6 xl:p-10 overflow-y-auto flex-1 space-y-4 xl:space-y-8">
              {sessoesAtivas.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 xl:text-2xl">Nenhum plato em produção nesta máquina.</p>
              ) : (
                sessoesAtivas.map(sessao => (
                  <Card key={sessao.id} className="border-border shadow-sm">
                    <CardHeader className="py-3 px-5 xl:py-5 xl:px-8 bg-muted/20 border-b border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-lg xl:text-2xl">PLATO {sessao.plato}</span>
                        <Badge className="bg-primary/20 text-primary hover:bg-primary/30 text-sm xl:text-xl xl:py-2">Em Andamento</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-5 xl:p-8 flex flex-col sm:flex-row gap-6 items-center">
                      
                      <div className="flex-1 space-y-2 xl:space-y-4 text-center sm:text-left">
                        <p className="text-sm xl:text-lg text-muted-foreground uppercase font-semibold">Produto</p>
                        <p className="text-2xl xl:text-4xl font-black text-foreground">{sessao.produto_codigo}</p>
                        <p className="text-sm xl:text-xl font-medium">Operador: {sessao.operador_matricula}</p>
                        <p className="text-lg xl:text-3xl font-bold text-emerald-600 dark:text-emerald-500 mt-2">Peças: {pulsosCount[sessao.id] || 0}</p>
                      </div>

                      <div className="w-full sm:w-auto flex flex-col space-y-3 xl:space-y-5 min-w-[200px] xl:min-w-[300px]">
                        <div>
                          <label className="text-sm xl:text-xl font-bold block mb-1 uppercase text-muted-foreground">Qtd. Refugos</label>
                          <input
                            type="number"
                            min={0}
                            placeholder="0"
                            value={refugosForms[sessao.id] || ""}
                            onChange={(e) => setRefugosForms({ ...refugosForms, [sessao.id]: Number(e.target.value) })}
                            className="h-14 xl:h-20 w-full rounded-md border border-input bg-background px-4 text-center font-bold text-xl xl:text-4xl focus:ring-2 focus:ring-primary outline-none transition-all"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          disabled={actionLoading}
                          onClick={() => finalizarPlatoUnico(sessao.id)}
                          className="h-14 xl:h-20 font-black uppercase text-sm xl:text-2xl"
                        >
                          {actionLoading ? <Loader2 className="w-5 h-5 xl:w-8 xl:h-8 animate-spin" /> : <CheckCircle2 className="w-5 h-5 xl:w-8 xl:h-8 mr-2" />}
                          Finalizar Plato {sessao.plato}
                        </Button>
                      </div>

                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="px-6 py-5 xl:py-8 border-t border-border bg-muted/40 flex justify-end">
               <Button size="lg" variant="outline" onClick={() => setModalAcoesOpen(false)} className="text-lg xl:text-3xl xl:h-16 font-bold px-8 xl:px-12">
                 Fechar Pop-up
               </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
