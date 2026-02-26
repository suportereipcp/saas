"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Play, Square, AlertTriangle, Layers, Search, Factory, ArrowLeft, XCircle } from "lucide-react";
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
  // Global state removal (now we only fetch what we need)
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
  // Refugos por sessão ativa
  const [refugos, setRefugos] = useState<Record<string, number>>({});

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
      const { count } = await supabase
        .schema("apont_rubber_prensa")
        .from("pulsos_producao")
        .select("*", { count: "exact", head: true })
        .eq("sessao_id", s.id);
      counts[s.id] = count || 0;
    }
    setPulsosCount(counts);

    if (sessoes.length > 0) {
      const sessaoIds = sessoes.map((s) => s.id);
      const { data: paradas } = await supabase
        .schema("apont_rubber_prensa")
        .from("paradas_maquina")
        .select("*")
        .in("sessao_id", sessaoIds)
        .eq("justificada", false);
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

  const iniciarSessao = async (plato: number) => {
    const data = formsData[plato];
    if (!selectedMaquina) return;
    
    // Aceita tanto a seleção validada quanto o texto livre digitado caso não selecione na lista
    const produtoFinal = data?.produto || data?.buscaProduto;
    const operadorFinal = globalOperador || buscaGlobalOperador;
    
    if (!produtoFinal || !operadorFinal) return;
    
    setActionLoading(true);
    try {
      const res = await fetch("/api/apont-rubber-prensa/sessoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maquina_id: selectedMaquina,
          produto_codigo: produtoFinal,
          plato: plato,
          operador_matricula: operadorFinal,
        }),
      });
      if (res.ok) {
        // Limpa formulário daquele plato
        setFormsData((prev) => ({ ...prev, [plato]: { produto: "", buscaProduto: "" } }));
        await checkSessoesAtivas();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const finalizarSessao = async (sessaoId: string) => {
    setActionLoading(true);
    try {
      await fetch("/api/apont-rubber-prensa/sessoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessao_id: sessaoId,
          total_refugo: refugos[sessaoId] || 0,
        }),
      });
      // Limpa refugo do estado
      setRefugos((prev) => {
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
    return (
      <div className="flex flex-col gap-8 w-full py-8 px-4 sm:px-6 lg:px-8">
        {maquinas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Factory className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold text-foreground">Nenhuma Máquina Encontrada</h2>
            <p className="text-muted-foreground mt-2 max-w-md">
              Não há máquinas ativas cadastradas no sistema. Por favor, libere os Exposed Schemas na API do Supabase e certifique-se de registrar suas prensas na tabela <code>maquinas</code>.
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap gap-6">
            {maquinas.map((maq) => {
              const ocupados = sessoesAtivas.filter((s) => s.maquina_id === maq.id).length;
              const paradas = sessoesAtivas
                .filter((s) => s.maquina_id === maq.id)
                .some((s) => paradasPendentes.some((p) => p.sessao_id === s.id));

              // Card minimalista: fundo verde (primary) claro/escuro, borda leve, texto grande
              let bgClass = "bg-primary/10 border-primary/30 hover:bg-primary/20 hover:border-primary/50 text-foreground";
              
              if (paradas) {
                 bgClass = "bg-destructive/10 border-destructive/30 hover:bg-destructive/20 hover:border-destructive/50 text-foreground";
              } else if (ocupados > 0) {
                 bgClass = "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 text-emerald-600 dark:text-emerald-400";
              }

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
  // VIEW: PAINEL DA MÁQUINA SELECIONADA
  // ==========================================
  if (!maquinaAtiva) return null;

  return (
    <div className="flex flex-col gap-6 w-full py-6 px-4 sm:px-6 lg:px-8">
      {/* Botão de Retorno Simples */}
      <div className="flex items-center">
        <Button 
          onClick={() => setViewMode("maquinas")}
          variant="outline"
          size="lg"
          className="text-lg py-6 px-6"
        >
          <ArrowLeft className="w-6 h-6 mr-2" />
          Voltar às Máquinas
        </Button>
      </div>

      {/* Operador Global */}
      <Card className="border-border bg-card shadow-sm">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
              Operador Responsável
            </h2>
            {globalOperador ? (
              <div className="flex items-center justify-between p-4 bg-muted border border-border/50 rounded-lg w-full max-w-2xl">
                <div>
                  <p className="font-bold text-xl text-foreground">{globalOperador}</p>
                </div>
                <Button 
                  variant="ghost"
                  onClick={() => { setGlobalOperador(""); setBuscaGlobalOperador(""); }}
                  className="text-muted-foreground hover:text-destructive h-12 w-12 p-0"
                >
                  <XCircle className="w-6 h-6" />
                </Button>
              </div>
            ) : (
              <div className="relative w-full max-w-2xl">
                <Search className="absolute left-4 top-4 w-6 h-6 text-muted-foreground" />
                <input
                  type="text"
                  value={buscaGlobalOperador}
                  onChange={(e) => searchGlobalOperadorAsync(e.target.value)}
                  placeholder="Matrícula ou Nome do Operador..."
                  className="flex h-14 w-full rounded-md border border-input bg-background pl-12 pr-4 py-2 text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                {buscaGlobalOperador && (
                  <div className="absolute z-20 w-full mt-1 bg-popover border border-border rounded-md shadow-xl max-h-48 overflow-y-auto">
                    {(() => {
                      const filtrados = globalOperadorOptions;
                      if (filtrados.length === 0) {
                        return <p className="text-sm text-center py-4 text-muted-foreground">Operador não localizado. Tente outra matrícula, ou clique &apos;Iniciar&apos; nos platos.</p>;
                      }
                      return filtrados.map(op => (
                        <button
                          key={op.matricula}
                          onClick={() => { setGlobalOperador(op.matricula); setBuscaGlobalOperador(""); }}
                          className="w-full px-4 py-4 text-left hover:bg-muted flex flex-col items-start focus:bg-muted focus:outline-none border-b border-border/50 last:border-0"
                        >
                          <span className="font-bold text-foreground text-lg">{op.matricula}</span>
                          <span className="text-sm text-muted-foreground">{op.nome}</span>
                        </button>
                      ));
                    })()}
                  </div>
                )}
              </div>
            )}
            
            {!(globalOperador || buscaGlobalOperador) && (
              <p className="text-sm text-muted-foreground">O operador informado acima assinará os próximos inícios de plato.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grid de Platos - Otimizado para Tablet com Layout Vertical (1 por linha) */}
      <div className="flex flex-col gap-6">
        {Array.from({ length: maquinaAtiva.qtd_platos }, (_, i) => i + 1).map((plato) => {
          const sessaoAtiva = sessoesAtivas.find((s) => s.maquina_id === maquinaAtiva.id && s.plato === plato);
          const paradasPlato = paradasPendentes.filter((p) => p.sessao_id === sessaoAtiva?.id);
          const formData = formsData[plato] || { produto: "", buscaProduto: "" };
          const pOptions = produtoOptions[plato] || [];

          return (
            <div key={plato} className="flex flex-col h-full">
              <div className="flex items-center gap-2 mb-3 px-1">
                <Layers className="w-6 h-6 text-primary" />
                <h2 className="text-2xl font-bold text-foreground">Plato {plato}</h2>
              </div>

              {sessaoAtiva ? (
                /* --- PLATO EM PRODUÇÃO --- */
                <Card className="flex-1 border-primary/20 shadow-sm flex flex-col">
                  <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge variant="default" className="mb-2 bg-emerald-600 hover:bg-emerald-700 text-sm py-1">
                          Produzindo
                        </Badge>
                        <CardTitle className="text-2xl">{sessaoAtiva.produto_codigo}</CardTitle>
                        {/* Descrição Produto - No estado atual não temos a lista de todos, o display só mostra o código da sessão.
                            Seria necessário buscar mas para não onerar vamos focar no Código e Produtividade */}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-6">
                    <div>
                      {/* Paradas Pendentes */}
                      {paradasPlato.length > 0 && (
                        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg space-y-3 mb-6">
                          <div className="flex items-center gap-2 text-destructive font-semibold text-lg">
                            <AlertTriangle className="w-6 h-6" />
                            <span>Máquina Parada!</span>
                          </div>
                          {paradasPlato.map(parada => (
                            <div key={parada.id} className="space-y-4">
                              <p className="font-medium text-foreground">
                                Desde as {new Date(parada.inicio_parada).toLocaleTimeString("pt-BR")}
                              </p>
                              <div className="grid grid-cols-2 gap-3">
                                {MOTIVOS_PARADA.map((motivo) => (
                                  <Button
                                    key={motivo.id}
                                    variant="outline"
                                    onClick={() => justificarParada(parada.id, motivo.id)}
                                    className="h-14 text-sm font-semibold border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
                                  >
                                    {motivo.label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted p-4 rounded-lg border border-border/50">
                          <span className="text-sm text-muted-foreground block mb-1 uppercase tracking-wider font-semibold">Operador</span>
                          <span className="font-bold text-2xl text-foreground">
                            {sessaoAtiva.operador_matricula}
                          </span>
                        </div>
                        <div className="bg-muted p-4 rounded-lg border border-border/50 text-right">
                          <span className="text-sm text-muted-foreground block mb-1 uppercase tracking-wider font-semibold">Peças Feitas</span>
                          <span className="text-4xl font-black text-primary font-mono">
                            {pulsosCount[sessaoAtiva.id] || 0}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/50 mt-auto">
                      <div>
                        <label className="text-lg text-foreground font-semibold block mb-2">Refugos (Opcional)</label>
                        <input
                          type="number"
                          min={0}
                          value={refugos[sessaoAtiva.id] || 0}
                          onChange={(e) => setRefugos({ ...refugos, [sessaoAtiva.id]: Number(e.target.value) })}
                          className="flex h-16 w-full rounded-md border border-input bg-background px-4 py-2 text-2xl font-bold text-center ring-offset-background file:border-0 file:bg-transparent file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        />
                      </div>

                      <Button
                        onClick={() => finalizarSessao(sessaoAtiva.id)}
                        disabled={actionLoading || paradasPlato.length > 0}
                        variant="destructive"
                        className="w-full h-16 text-xl font-bold"
                      >
                        {actionLoading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Square className="w-6 h-6 mr-2" />}
                        Finalizar Produção
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                /* --- PLATO LIVRE (FORMULÁRIO) --- */
                <Card className="flex-1 border-dashed bg-muted/10 shadow-sm flex flex-col">
                  <CardHeader className="pb-4">
                    <Badge variant="outline" className="self-start text-muted-foreground text-sm">Plato Livre</Badge>
                  </CardHeader>
                  <CardContent className="pt-0 flex-1 flex flex-col justify-between space-y-6">
                    <div className="space-y-6">
                      
                      {/* Produto Async Search */}
                      <div className="space-y-2 flex-col flex h-full">
                        <label className="text-lg font-semibold text-foreground">Produto</label>
                        {formData.produto ? (
                          <div className="flex items-center justify-between p-4 bg-primary/10 border border-primary/30 rounded-lg">
                            <div className="truncate pr-2">
                              <p className="font-bold text-lg text-primary">{formData.produto}</p>
                              <p className="text-sm text-foreground truncate">{pOptions.find(p => p.codigo_item === formData.produto)?.descricao || ""}</p>
                            </div>
                            <Button 
                              variant="ghost"
                              onClick={() => { updateForm(plato, "produto", ""); updateForm(plato, "buscaProduto", ""); }}
                              className="text-muted-foreground hover:text-destructive h-12 w-12 shrink-0 p-0"
                            >
                              <XCircle className="w-6 h-6" />
                            </Button>
                          </div>
                        ) : (
                          <div className="relative flex-1">
                            <Search className="absolute left-4 top-4 w-6 h-6 text-muted-foreground" />
                            <input
                              type="text"
                              value={formData.buscaProduto}
                              onChange={(e) => searchProdutoAsync(plato, e.target.value)}
                              placeholder="Digite código/nome..."
                              className="flex h-14 w-full rounded-md border border-input bg-background pl-12 pr-4 py-2 text-lg ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            {formData.buscaProduto && (
                              <div className="absolute z-10 w-full mt-1 bg-popover border border-border rounded-md shadow-xl max-h-60 overflow-y-auto">
                                {pOptions.length === 0 ? (
                                  <p className="text-sm text-muted-foreground p-4 text-center">Digite mais caracteres para buscar...</p>
                                ) : pOptions.map((prod) => (
                                  <button
                                    key={prod.codigo_item}
                                    onClick={() => updateForm(plato, "produto", prod.codigo_item)}
                                    className="w-full px-4 py-4 text-left hover:bg-muted focus:bg-muted focus:outline-none border-b border-border/50 last:border-0 transition-colors"
                                  >
                                    <span className="font-bold text-lg text-foreground block">{prod.codigo_item}</span>
                                    <span className="text-sm text-muted-foreground block truncate">{prod.descricao}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 mt-auto">
                      <Button
                        onClick={() => iniciarSessao(plato)}
                        disabled={actionLoading || !(formData.produto || formData.buscaProduto) || !(globalOperador || buscaGlobalOperador)}
                        className="w-full h-16 text-xl font-bold rounded-xl"
                      >
                        {actionLoading ? <Loader2 className="w-6 h-6 animate-spin mr-2" /> : <Play className="w-6 h-6 mr-2" />}
                        INICIAR PLATO {plato}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
