"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Play, Square, AlertTriangle, Package, Gauge, Layers } from "lucide-react";
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
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [sessoesAtivas, setSessoesAtivas] = useState<SessaoAtiva[]>([]);
  const [paradasPendentes, setParadasPendentes] = useState<Parada[]>([]);
  const [pulsosCount, setPulsosCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Campos de formulário para nova sessão
  const [selectedMaquina, setSelectedMaquina] = useState("");
  const [selectedProduto, setSelectedProduto] = useState("");
  const [selectedPlato, setSelectedPlato] = useState(1);
  const [matricula, setMatricula] = useState("");
  const [refugos, setRefugos] = useState<Record<string, number>>({});

  // Máquina ativa selecionada
  const maquinaAtiva = maquinas.find((m) => m.id === selectedMaquina);

  const loadCadastros = useCallback(async () => {
    const [maqResult, prodResult] = await Promise.all([
      supabase.schema("apont_rubber_prensa").from("maquinas").select("*").eq("ativo", true),
      supabase.schema("apont_rubber_prensa").from("vw_produtos_datasul").select("*"),
    ]);
    setMaquinas(maqResult.data || []);
    setProdutos(prodResult.data || []);
  }, []);

  // Busca todas as sessões ativas (todos os platos, todas as máquinas)
  const checkSessoesAtivas = useCallback(async () => {
    const { data } = await supabase
      .schema("apont_rubber_prensa")
      .from("sessoes_producao")
      .select("*")
      .eq("status", "em_andamento")
      .order("plato", { ascending: true });

    const sessoes = data || [];
    setSessoesAtivas(sessoes);

    // Conta pulsos por sessão
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

    // Busca paradas não justificadas
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

  // Iniciar sessão de produção para um plato
  const iniciarSessao = async () => {
    if (!selectedMaquina || !selectedProduto || !matricula) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/apont-rubber-prensa/sessoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maquina_id: selectedMaquina,
          produto_codigo: selectedProduto,
          plato: selectedPlato,
          operador_matricula: matricula,
        }),
      });
      if (res.ok) {
        setSelectedProduto("");
        await checkSessoesAtivas();
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Finalizar uma sessão (um plato)
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
      await checkSessoesAtivas();
    } finally {
      setActionLoading(false);
    }
  };

  // Justificar parada
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
      <div className="flex items-center justify-center min-h-screen bg-neutral-950">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-400" />
      </div>
    );
  }

  // Verifica quais platos já têm sessão ativa para a máquina selecionada
  const platosOcupados = sessoesAtivas
    .filter((s) => s.maquina_id === selectedMaquina)
    .map((s) => s.plato);

  return (
    <div className="min-h-screen bg-neutral-950 text-white p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          <Gauge className="inline w-6 h-6 mr-2 text-emerald-400" />
          Apontamento Prensa
        </h1>
        <a href="/portal" className="text-sm text-neutral-400 hover:text-white transition">← Portal</a>
      </div>

      {/* ---- SESSÕES ATIVAS (PLATOS EM PRODUÇÃO) ---- */}
      {sessoesAtivas.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-emerald-400 flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Platos em Produção
          </h2>

          {sessoesAtivas.map((sessao) => {
            const maq = maquinas.find((m) => m.id === sessao.maquina_id);
            const prod = produtos.find((p) => p.codigo_item === sessao.produto_codigo);

            return (
              <Card key={sessao.id} className="bg-neutral-900 border-emerald-500/30">
                <CardContent className="py-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                        Plato {sessao.plato}
                      </Badge>
                      <span className="font-bold">{maq?.num_maq || "-"}</span>
                      <span className="text-neutral-600">|</span>
                      <span className="text-neutral-300">{sessao.produto_codigo}</span>
                    </div>
                    <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
                      Produzindo
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <span className="text-xs text-neutral-500 block">Operador</span>
                      <span className="font-semibold">{sessao.operador_matricula}</span>
                    </div>
                    <div>
                      <span className="text-xs text-neutral-500 block">Início</span>
                      <span className="font-semibold">
                        {new Date(sessao.inicio_sessao).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-neutral-500 block">Ciclos</span>
                      <span className="text-2xl font-bold font-mono text-emerald-400">{pulsosCount[sessao.id] || 0}</span>
                    </div>
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      <label className="text-xs text-neutral-500 block mb-1">Refugos</label>
                      <input
                        type="number"
                        min={0}
                        value={refugos[sessao.id] || 0}
                        onChange={(e) => setRefugos({ ...refugos, [sessao.id]: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-center"
                      />
                    </div>
                    <Button
                      onClick={() => finalizarSessao(sessao.id)}
                      disabled={actionLoading}
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white h-[42px] px-4"
                    >
                      {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4 mr-1" />}
                      Finalizar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Paradas Pendentes */}
      {paradasPendentes.length > 0 && (
        <Card className="bg-neutral-900 border-amber-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-amber-400 text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Paradas Pendentes ({paradasPendentes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {paradasPendentes.map((parada) => {
              const sessao = sessoesAtivas.find((s) => s.id === parada.sessao_id);
              return (
                <div key={parada.id} className="bg-neutral-800/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm text-neutral-300">
                    Plato {sessao?.plato || "?"} — Início: {new Date(parada.inicio_parada).toLocaleTimeString("pt-BR")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {MOTIVOS_PARADA.map((motivo) => (
                      <button
                        key={motivo.id}
                        onClick={() => justificarParada(parada.id, motivo.id)}
                        className="text-xs px-3 py-2 bg-neutral-700 hover:bg-amber-600 rounded-md transition-colors"
                      >
                        {motivo.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* ---- FORMULÁRIO NOVA SESSÃO (PLATO) ---- */}
      <Card className="bg-neutral-900 border-neutral-800">
        <CardHeader>
          <CardTitle className="text-lg">Iniciar Plato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Matrícula */}
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-1">Matrícula do Operador</label>
            <input
              type="text"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
              placeholder="Ex: 12345"
              className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white text-lg"
            />
          </div>

          {/* Máquina */}
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-1">Máquina</label>
            <div className="grid grid-cols-2 gap-2">
              {maquinas.map((maq) => (
                <button
                  key={maq.id}
                  onClick={() => { setSelectedMaquina(maq.id); setSelectedPlato(1); }}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedMaquina === maq.id
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600"
                  }`}
                >
                  <span className="text-lg font-bold block">{maq.num_maq}</span>
                  <span className="text-xs text-neutral-500">{maq.nome || ""} · {maq.qtd_platos} plato(s)</span>
                </button>
              ))}
            </div>
          </div>

          {/* Plato */}
          {selectedMaquina && maquinaAtiva && (
            <div>
              <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-1">
                <Layers className="inline w-4 h-4 mr-1" />
                Plato
              </label>
              <div className="flex gap-2">
                {Array.from({ length: maquinaAtiva.qtd_platos }, (_, i) => i + 1).map((plato) => {
                  const ocupado = platosOcupados.includes(plato);
                  return (
                    <button
                      key={plato}
                      onClick={() => !ocupado && setSelectedPlato(plato)}
                      disabled={ocupado}
                      className={`flex-1 p-3 rounded-lg border text-center transition-all ${
                        ocupado
                          ? "border-neutral-800 bg-neutral-800/50 text-neutral-600 cursor-not-allowed"
                          : selectedPlato === plato
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                          : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600"
                      }`}
                    >
                      <span className="text-lg font-bold block">{plato}</span>
                      <span className="text-xs">{ocupado ? "Em uso" : "Livre"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Produto */}
          <div>
            <label className="text-xs text-neutral-500 uppercase tracking-wider block mb-1">
              <Package className="inline w-4 h-4 mr-1" />
              Produto
            </label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {produtos.map((prod) => (
                <button
                  key={prod.codigo_item}
                  onClick={() => setSelectedProduto(prod.codigo_item)}
                  className={`w-full p-3 rounded-lg border text-left transition-all ${
                    selectedProduto === prod.codigo_item
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                      : "border-neutral-700 bg-neutral-800 text-neutral-300 hover:border-neutral-600"
                  }`}
                >
                  <span className="font-bold">{prod.codigo_item}</span>
                  <span className="text-xs text-neutral-500 block">{prod.descricao} · {prod.cavidades} cav.</span>
                </button>
              ))}
            </div>
          </div>

          {/* Botão Iniciar */}
          <Button
            onClick={iniciarSessao}
            disabled={actionLoading || !selectedMaquina || !selectedProduto || !matricula || platosOcupados.includes(selectedPlato)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-14 text-lg"
          >
            {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 mr-2" />}
            Iniciar Plato {selectedPlato}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
