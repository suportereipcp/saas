"use server";

import { createClient } from "@supabase/supabase-js";
import { subDays, startOfDay, endOfDay, differenceInSeconds } from "date-fns";

type MetricParams = {
  maquina: string;
  operador: string;
  periodo: string;
  dateRangeStr?: string; // serialized JSON of { from, to }
};

type MachineOeeCard = {
  maquina: string;
  oee: number;
  disponibilidade: number;
  performance: number;
  qualidade: number;
  tempoOperacional: number;
  qtdSessoes: number;
};

type MachineTeepCard = {
  maquina: string;
  teep: number;
  utilizacao: number;
  disponibilidade: number;
  performance: number;
  qualidade: number;
  tempoOperacional: number;
  qtdSessoes: number;
};

// Supabase client specifically for the 'apont_rubber_prensa' schema using Service Role
// This allows fast aggregations backend-side without RLS blocking cross-schema relations
const getSupabasePrensa = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: "apont_rubber_prensa" } }
);

const getSupabaseDatasul = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: "datasul" } }
);

export async function getOeeFiltersData() {
  const [dbPrensa, dbDatasul] = [getSupabasePrensa(), getSupabaseDatasul()];
  
  const { data: maquinasDb } = await dbPrensa.from("maquinas").select("num_maq").order("num_maq");
  const { data: operadoresDb } = await dbDatasul
    .from("operador_prod")
    .select("matricula, nome")
    .eq("cc_codigo", "3211800")
    .order("nome");

  return {
    maquinas: maquinasDb?.map((m) => m.num_maq) || [],
    operadores: operadoresDb?.map((o) => ({
      matricula: String(o.matricula),
      nome: o.nome
    })) || []
  };
}

export async function getOeeDashboardMetrics(params: MetricParams) {
  // 1. Resolve Datas
  let startDate = new Date();
  let endDate = new Date();
  let tempoCalendarioMinutos = 1440;

  switch (params.periodo) {
    case "Hoje":
      startDate = startOfDay(new Date());
      endDate = new Date(); 
      tempoCalendarioMinutos = Math.max(1, Math.round(differenceInSeconds(endDate, startDate) / 60));
      break;
    case "Últimas 24h":
      startDate = subDays(new Date(), 1);
      endDate = new Date();
      tempoCalendarioMinutos = 1440;
      break;
    case "Últimos 7 dias":
      startDate = startOfDay(subDays(new Date(), 7));
      endDate = endOfDay(new Date());
      tempoCalendarioMinutos = 7 * 1440;
      break;
    case "Últimos 30 dias":
      startDate = startOfDay(subDays(new Date(), 30));
      endDate = endOfDay(new Date());
      tempoCalendarioMinutos = 30 * 1440;
      break;
    case "Personalizado":
      if (params.dateRangeStr) {
        const dr = JSON.parse(params.dateRangeStr);
        if (dr.from) startDate = startOfDay(new Date(dr.from));
        if (dr.to) endDate = endOfDay(new Date(dr.to));
        
        const diffDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        tempoCalendarioMinutos = diffDays * 1440;
      }
      break;
  }

  const supabase = getSupabasePrensa();

  // 2. Resolver Filtros de Máquina e Operador
  let maquinaId = null;
  if (params.maquina !== "Todas") {
    const { data: m } = await supabase.from("maquinas").select("id").eq("num_maq", params.maquina).single();
    if (m) maquinaId = m.id;
  }

  // Se o operador for diferente de "Todos", o params.operador será a matrícula dele (ex: "8243")
  let filterOperadorMatricula = null;
  if (params.operador !== "Todos") {
    filterOperadorMatricula = params.operador;
  }

  // 3. Buscar Sessões de Produção no período
  let sessoesQuery = supabase
    .from("sessoes_producao")
    .select("id, maquina_id, operador_matricula, produto_codigo, inicio_sessao, fim_sessao, qtd_produzida, status")
    .gte("inicio_sessao", startDate.toISOString())
    .lte("inicio_sessao", endDate.toISOString());

  if (maquinaId) {
    sessoesQuery = sessoesQuery.eq("maquina_id", maquinaId);
  }
  if (filterOperadorMatricula) {
    sessoesQuery = sessoesQuery.eq("operador_matricula", filterOperadorMatricula);
  }

  const { data: sessoes, error: errSessoes } = await sessoesQuery;
  
  if (errSessoes || !sessoes || sessoes.length === 0) {
    // Sem dados
    return emptyMetrics(params, startDate, endDate, tempoCalendarioMinutos);
  }

  // 4. Buscar Paradas das Sessões encontradas
  const sessIds = sessoes.map(s => s.id);
  
  // Paradas podem ser muitas, dividimos em chunks se sessIds > 100
  let todasParadas: Array<{
    id: string;
    sessao_id: string;
    inicio_parada: string;
    fim_parada: string | null;
    motivo_id: string | number | null;
  }> = [];
  for (let i = 0; i < sessIds.length; i += 100) {
    const chunk = sessIds.slice(i, i + 100);
    const { data: parad } = await supabase
      .from("paradas_maquina")
      .select("id, sessao_id, inicio_parada, fim_parada, motivo_id")
      .in("sessao_id", chunk);
    if (parad) todasParadas = todasParadas.concat(parad);
  }

  // 5. Buscar Tempos de Ciclo
  const codigos = Array.from(new Set(sessoes.map(s => s.produto_codigo)));
  const produtosMap = new Map<string, number>();
  
  for (let i = 0; i < codigos.length; i += 50) {
    const chunk = codigos.slice(i, i + 50);
    const { data: prods } = await supabase
      .from("vw_produtos_datasul")
      .select("codigo_item, tempo_ciclo_ideal_segundos")
      .in("codigo_item", chunk);
    
    if (prods) {
      prods.forEach(p => produtosMap.set(p.codigo_item, p.tempo_ciclo_ideal_segundos || 300));
    }
  }

  // 6. Buscar Nomes de Motivos de Parada
  const { data: motivosDb } = await supabase.from("motivos_parada_prensa").select("codigo, descricao");
  const motivosMap = new Map<string, string>();
  if (motivosDb) {
    motivosDb.forEach(m => motivosMap.set(m.codigo, m.descricao));
  } else {
    // Fallback padrão se tabela não existir
    motivosMap.set("00", "Parada Não Justificada");
    motivosMap.set("01", "Setup / Troca de Molde");
    motivosMap.set("02", "Manutenção Mecânica");
  }

  // ==========================================
  // 7. CÁLCULOS MATEMÁTICOS
  // ==========================================
  
  let tempoOperacionalPlanejadoSegundos = 0;
  let tempoParadoTotalSegundos = 0;
  let tempoIdealNecessarioSegundos = 0;
  const paradasAgrupadas = new Map<string, number>();

  const dataReferenciaAtual = new Date();

  sessoes.forEach((sessao) => {
    // Calcula tempo planejado da sessão (se não terminou, calcula até o "agora" ou endDate)
    const inicioTs = new Date(sessao.inicio_sessao).getTime();
    const fimTs = sessao.fim_sessao 
      ? new Date(sessao.fim_sessao).getTime()
      : Math.min(dataReferenciaAtual.getTime(), endDate.getTime());
    
    const planejado = Math.max(0, (fimTs - inicioTs) / 1000);
    tempoOperacionalPlanejadoSegundos += planejado;

    // Performance da Sessão (Peças Produzidas * Ciclo Ideal)
    const qtd = sessao.qtd_produzida || 0;
    const cicloIdeal = produtosMap.get(sessao.produto_codigo) || 300;
    tempoIdealNecessarioSegundos += (qtd * cicloIdeal);
  });

  todasParadas.forEach((parada) => {
    const inicioP = new Date(parada.inicio_parada).getTime();
    const fimP = parada.fim_parada 
      ? new Date(parada.fim_parada).getTime()
      : Math.min(dataReferenciaAtual.getTime(), endDate.getTime());
    
    const parado = Math.max(0, (fimP - inicioP) / 1000);
    tempoParadoTotalSegundos += parado;

    // Somar no agrupador do gráfico de pareto
    const nomeMotivo = motivosMap.get(String(parada.motivo_id)) || `Motivo ${parada.motivo_id}`;
    const acumulado = paradasAgrupadas.get(nomeMotivo) || 0;
    paradasAgrupadas.set(nomeMotivo, acumulado + parado);
  });

  // Cálculo TEEP / Capacidade Gap
  const capacityGapMinutes = tempoCalendarioMinutos - (tempoOperacionalPlanejadoSegundos / 60);
  if (capacityGapMinutes > 0) {
    // "Sem Turno" equivale a diferença entre calendário de 24h e o tempo de máquinas ligadas (Sessões)
    paradasAgrupadas.set("Sem Turno / Máquina Desligada", capacityGapMinutes * 60);
  }

  // ==========================================
  // PERCENTUAIS FINAIS OEE/TEEP
  // ==========================================
  const tempoTrabalhadoRealSegundos = Math.max(0, tempoOperacionalPlanejadoSegundos - tempoParadoTotalSegundos);

  let disponibilidade = 0;
  if (tempoOperacionalPlanejadoSegundos > 0) {
    disponibilidade = tempoTrabalhadoRealSegundos / tempoOperacionalPlanejadoSegundos;
  }

  let performance = 0;
  if (tempoTrabalhadoRealSegundos > 0) {
    performance = tempoIdealNecessarioSegundos / tempoTrabalhadoRealSegundos;
  }

  // Teto de 100% para os cálculos lógicos não ficarem confusos se algo acelerar anormalmente
  disponibilidade = Math.min(1, Math.max(0, disponibilidade));
  performance = Math.min(1, Math.max(0, performance));
  const qualidade = 1.0; // Travado em 100% a pedido do usuário (sem refugo no momento)

  const oee = Math.round((disponibilidade * performance * qualidade) * 100);
  const utilizacao = Math.min(1, tempoOperacionalPlanejadoSegundos / (tempoCalendarioMinutos * 60));
  const teep = Math.round((utilizacao * disponibilidade * performance * qualidade) * 100);

  // Formatar Pareto
  const paretoData = Array.from(paradasAgrupadas.entries())
    .map(([motivo, segundos]) => ({
      motivo,
      minutos: Math.round(segundos / 60)
    }))
    .filter(p => p.minutos > 0)
    .sort((a, b) => b.minutos - a.minutos)
    .slice(0, 5); // top 5

  return {
    filtros: {
      maquina: params.maquina,
      operador: params.operador,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    oee: isNaN(oee) ? 0 : oee,
    teep: isNaN(teep) ? 0 : teep,
    disponibilidade: Math.round(disponibilidade * 100),
    performance: Math.round(performance * 100),
    qualidade: Math.round(qualidade * 100),
    tempoCalendario: tempoCalendarioMinutos,
    tempoOperacional: Math.round(tempoOperacionalPlanejadoSegundos / 60),
    tempoProducaoReal: Math.round(tempoTrabalhadoRealSegundos / 60),
    paretoData,
    
    // Trend data mockado dinâmico por enquanto (fazer o group by hora depois é possível, 
    // mas exige varrer pulsos por hora. Deixaremos suavizado simulado baseado no dia real).
    trendData: Array.from({ length: 12 }, (_, i) => ({
      hora: `${String(i * 2).padStart(2, "0")}:00`,
      oee: Math.max(0, Math.min(100, Math.round(oee - 10 + Math.random() * 20))),
      teep: Math.max(0, Math.min(100, Math.round(teep - 10 + Math.random() * 20))),
    }))
  };
}

function emptyMetrics(params: MetricParams, startDate: Date, endDate: Date, calMin: number) {
  return {
    filtros: { maquina: params.maquina, operador: params.operador, startDate: startDate.toISOString(), endDate: endDate.toISOString() },
    oee: 0, teep: 0, disponibilidade: 0, performance: 0, qualidade: 0,
    tempoCalendario: calMin, tempoOperacional: 0, tempoProducaoReal: 0,
    paretoData: [{ motivo: "Máquina Ociosa / Sem Turno", minutos: calMin }],
    trendData: Array.from({ length: 12 }, (_, i) => ({ hora: `${String(i * 2).padStart(2, "0")}:00`, oee: 0, teep: 0 }))
  };
}

export async function getAllMachinesOeeTeep(periodo: string) {
  let startDate = new Date();
  let endDate = new Date();
  let tempoCalendarioMinutos = 1440;

  switch (periodo) {
    case "Hoje":
      startDate = startOfDay(new Date());
      endDate = new Date(); 
      tempoCalendarioMinutos = Math.max(1, Math.round(differenceInSeconds(endDate, startDate) / 60));
      break;
    case "Últimas 24h":
      startDate = subDays(new Date(), 1);
      endDate = new Date();
      tempoCalendarioMinutos = 1440;
      break;
    default:
      startDate = startOfDay(new Date());
      endDate = new Date(); 
      tempoCalendarioMinutos = Math.max(1, Math.round(differenceInSeconds(endDate, startDate) / 60));
      break;
  }

  const supabase = getSupabasePrensa();

  // Buscar todas as máquinas
  const { data: maquinasDb } = await supabase.from("maquinas").select("id, num_maq").order("num_maq");
  if (!maquinasDb) return [];

  // Buscar sessões no período (todas as máquinas)
  const { data: sessoes, error: errSessoes } = await supabase
    .from("sessoes_producao")
    .select("id, maquina_id, produto_codigo, inicio_sessao, fim_sessao, qtd_produzida")
    .gte("inicio_sessao", startDate.toISOString())
    .lte("inicio_sessao", endDate.toISOString());

  if (errSessoes || !sessoes || sessoes.length === 0) {
    return maquinasDb.map(m => ({ maquina: m.num_maq, oee: 0, teep: 0 }));
  }

  // Buscar Paradas
  const sessIds = sessoes.map(s => s.id);
  let todasParadas: Array<{
    sessao_id: string;
    inicio_parada: string;
    fim_parada: string | null;
  }> = [];
  for (let i = 0; i < sessIds.length; i += 100) {
    const chunk = sessIds.slice(i, i + 100);
    const { data: parad } = await supabase
      .from("paradas_maquina")
      .select("sessao_id, inicio_parada, fim_parada")
      .in("sessao_id", chunk);
    if (parad) todasParadas = todasParadas.concat(parad);
  }

  // Buscar Tempo de Ciclo
  const codigos = Array.from(new Set(sessoes.map(s => s.produto_codigo)));
  const produtosMap = new Map<string, number>();
  for (let i = 0; i < codigos.length; i += 50) {
    const chunk = codigos.slice(i, i + 50);
    const { data: prods } = await supabase
      .from("vw_produtos_datasul")
      .select("codigo_item, tempo_ciclo_ideal_segundos")
      .in("codigo_item", chunk);
    
    if (prods) {
      prods.forEach(p => produtosMap.set(p.codigo_item, p.tempo_ciclo_ideal_segundos || 300));
    }
  }

  const dataReferenciaAtual = new Date();

  // Agrupar sessoes e paradas por máquina
  const result = maquinasDb.map(maq => {
    const sessoesMaq = sessoes.filter(s => s.maquina_id === maq.id);
    const paradasMaq = todasParadas.filter(p => sessoesMaq.some(s => s.id === p.sessao_id));

    let tempoOperacionalPlanejadoSegundos = 0;
    let tempoIdealNecessarioSegundos = 0;
    let tempoParadoTotalSegundos = 0;

    sessoesMaq.forEach((sessao) => {
      const inicioTs = new Date(sessao.inicio_sessao).getTime();
      const fimTs = sessao.fim_sessao 
        ? new Date(sessao.fim_sessao).getTime()
        : Math.min(dataReferenciaAtual.getTime(), endDate.getTime());
      
      const planejado = Math.max(0, (fimTs - inicioTs) / 1000);
      tempoOperacionalPlanejadoSegundos += planejado;

      const qtd = sessao.qtd_produzida || 0;
      const cicloIdeal = produtosMap.get(sessao.produto_codigo) || 300;
      tempoIdealNecessarioSegundos += (qtd * cicloIdeal);
    });

    paradasMaq.forEach((parada) => {
      const inicioP = new Date(parada.inicio_parada).getTime();
      const fimP = parada.fim_parada 
        ? new Date(parada.fim_parada).getTime()
        : Math.min(dataReferenciaAtual.getTime(), endDate.getTime());
      
      const parado = Math.max(0, (fimP - inicioP) / 1000);
      tempoParadoTotalSegundos += parado;
    });

    const tempoTrabalhadoRealSegundos = Math.max(0, tempoOperacionalPlanejadoSegundos - tempoParadoTotalSegundos);

    let disponibilidade = 0;
    if (tempoOperacionalPlanejadoSegundos > 0) {
      disponibilidade = tempoTrabalhadoRealSegundos / tempoOperacionalPlanejadoSegundos;
    }

    let performance = 0;
    if (tempoTrabalhadoRealSegundos > 0) {
      performance = tempoIdealNecessarioSegundos / tempoTrabalhadoRealSegundos;
    }

    disponibilidade = Math.min(1, Math.max(0, disponibilidade));
    performance = Math.min(1, Math.max(0, performance));
    const qualidade = 1.0;

    const oee = Math.round((disponibilidade * performance * qualidade) * 100);
    const utilizacao = Math.min(1, tempoOperacionalPlanejadoSegundos / (tempoCalendarioMinutos * 60));
    const teep = Math.round((utilizacao * disponibilidade * performance * qualidade) * 100);

    return {
      maquina: maq.num_maq,
      oee: isNaN(oee) ? 0 : oee,
      teep: isNaN(teep) ? 0 : teep
    };
  });

  return result;
}

export async function getFilteredMachinesOee(params: MetricParams): Promise<MachineOeeCard[]> {
  let startDate = new Date();
  let endDate = new Date();

  switch (params.periodo) {
    case "Hoje":
      startDate = startOfDay(new Date());
      endDate = new Date();
      break;
    case "Últimas 24h":
      startDate = subDays(new Date(), 1);
      endDate = new Date();
      break;
    case "Últimos 7 dias":
      startDate = startOfDay(subDays(new Date(), 7));
      endDate = endOfDay(new Date());
      break;
    case "Últimos 30 dias":
      startDate = startOfDay(subDays(new Date(), 30));
      endDate = endOfDay(new Date());
      break;
    case "Personalizado":
      if (params.dateRangeStr) {
        const dr = JSON.parse(params.dateRangeStr);
        if (dr.from) startDate = startOfDay(new Date(dr.from));
        if (dr.to) endDate = endOfDay(new Date(dr.to));
      }
      break;
  }

  const supabase = getSupabasePrensa();

  let maquinasQuery = supabase.from("maquinas").select("id, num_maq").order("num_maq");
  if (params.maquina !== "Todas") {
    maquinasQuery = maquinasQuery.eq("num_maq", params.maquina);
  }

  const { data: maquinasDb } = await maquinasQuery;
  if (!maquinasDb || maquinasDb.length === 0) return [];

  const maquinaIds = maquinasDb.map((m) => m.id);

  let sessoesQuery = supabase
    .from("sessoes_producao")
    .select("id, maquina_id, operador_matricula, produto_codigo, inicio_sessao, fim_sessao, qtd_produzida")
    .in("maquina_id", maquinaIds)
    .gte("inicio_sessao", startDate.toISOString())
    .lte("inicio_sessao", endDate.toISOString());

  if (params.operador !== "Todos") {
    sessoesQuery = sessoesQuery.eq("operador_matricula", params.operador);
  }

  const { data: sessoes, error: errSessoes } = await sessoesQuery;
  if (errSessoes || !sessoes) {
    return maquinasDb.map((m) => ({
      maquina: m.num_maq,
      oee: 0,
      disponibilidade: 0,
      performance: 0,
      qualidade: 100,
      tempoOperacional: 0,
      qtdSessoes: 0,
    }));
  }

  const sessIds = sessoes.map((s) => s.id);
  let todasParadas: Array<{
    sessao_id: string;
    inicio_parada: string;
    fim_parada: string | null;
  }> = [];

  for (let i = 0; i < sessIds.length; i += 100) {
    const chunk = sessIds.slice(i, i + 100);
    if (!chunk.length) continue;

    const { data: parad } = await supabase
      .from("paradas_maquina")
      .select("sessao_id, inicio_parada, fim_parada")
      .in("sessao_id", chunk);

    if (parad) {
      todasParadas = todasParadas.concat(parad);
    }
  }

  const codigos = Array.from(new Set(sessoes.map((s) => s.produto_codigo).filter(Boolean)));
  const produtosMap = new Map<string, number>();

  for (let i = 0; i < codigos.length; i += 50) {
    const chunk = codigos.slice(i, i + 50);
    if (!chunk.length) continue;

    const { data: prods } = await supabase
      .from("vw_produtos_datasul")
      .select("codigo_item, tempo_ciclo_ideal_segundos")
      .in("codigo_item", chunk);

    if (prods) {
      prods.forEach((p) => produtosMap.set(p.codigo_item, p.tempo_ciclo_ideal_segundos || 300));
    }
  }

  const dataReferenciaAtual = new Date();

  const result = maquinasDb.map((maq) => {
    const sessoesMaq = sessoes.filter((s) => s.maquina_id === maq.id);
    const sessaoIdsDaMaquina = new Set(sessoesMaq.map((s) => s.id));
    const paradasMaq = todasParadas.filter((p) => sessaoIdsDaMaquina.has(p.sessao_id));

    let tempoOperacionalPlanejadoSegundos = 0;
    let tempoIdealNecessarioSegundos = 0;
    let tempoParadoTotalSegundos = 0;

    sessoesMaq.forEach((sessao) => {
      const inicioTs = new Date(sessao.inicio_sessao).getTime();
      const fimTs = sessao.fim_sessao
        ? new Date(sessao.fim_sessao).getTime()
        : Math.min(dataReferenciaAtual.getTime(), endDate.getTime());

      const planejado = Math.max(0, (fimTs - inicioTs) / 1000);
      tempoOperacionalPlanejadoSegundos += planejado;

      const qtd = sessao.qtd_produzida || 0;
      const cicloIdeal = produtosMap.get(sessao.produto_codigo) || 300;
      tempoIdealNecessarioSegundos += qtd * cicloIdeal;
    });

    paradasMaq.forEach((parada) => {
      const inicioP = new Date(parada.inicio_parada).getTime();
      const fimP = parada.fim_parada
        ? new Date(parada.fim_parada).getTime()
        : Math.min(dataReferenciaAtual.getTime(), endDate.getTime());

      const parado = Math.max(0, (fimP - inicioP) / 1000);
      tempoParadoTotalSegundos += parado;
    });

    const tempoTrabalhadoRealSegundos = Math.max(0, tempoOperacionalPlanejadoSegundos - tempoParadoTotalSegundos);

    let disponibilidade = 0;
    if (tempoOperacionalPlanejadoSegundos > 0) {
      disponibilidade = tempoTrabalhadoRealSegundos / tempoOperacionalPlanejadoSegundos;
    }

    let performance = 0;
    if (tempoTrabalhadoRealSegundos > 0) {
      performance = tempoIdealNecessarioSegundos / tempoTrabalhadoRealSegundos;
    }

    disponibilidade = Math.min(1, Math.max(0, disponibilidade));
    performance = Math.min(1, Math.max(0, performance));
    const qualidade = 1.0;
    const oee = Math.round(disponibilidade * performance * qualidade * 100);

    return {
      maquina: maq.num_maq,
      oee: Number.isNaN(oee) ? 0 : oee,
      disponibilidade: Math.round(disponibilidade * 100),
      performance: Math.round(performance * 100),
      qualidade: Math.round(qualidade * 100),
      tempoOperacional: Math.round(tempoTrabalhadoRealSegundos / 60),
      qtdSessoes: sessoesMaq.length,
    };
  });

  return result.sort((a, b) => {
    if (b.oee !== a.oee) return b.oee - a.oee;
    return a.maquina.localeCompare(b.maquina, "pt-BR", { numeric: true });
  });
}

export async function getFilteredMachinesTeep(params: MetricParams): Promise<MachineTeepCard[]> {
  let startDate = new Date();
  let endDate = new Date();
  let tempoCalendarioMinutos = 1440;

  switch (params.periodo) {
    case "Hoje":
      startDate = startOfDay(new Date());
      endDate = new Date();
      tempoCalendarioMinutos = Math.max(1, Math.round(differenceInSeconds(endDate, startDate) / 60));
      break;
    case "Últimas 24h":
      startDate = subDays(new Date(), 1);
      endDate = new Date();
      tempoCalendarioMinutos = 1440;
      break;
    case "Últimos 7 dias":
      startDate = startOfDay(subDays(new Date(), 7));
      endDate = endOfDay(new Date());
      tempoCalendarioMinutos = 7 * 1440;
      break;
    case "Últimos 30 dias":
      startDate = startOfDay(subDays(new Date(), 30));
      endDate = endOfDay(new Date());
      tempoCalendarioMinutos = 30 * 1440;
      break;
    case "Personalizado":
      if (params.dateRangeStr) {
        const dr = JSON.parse(params.dateRangeStr);
        if (dr.from) startDate = startOfDay(new Date(dr.from));
        if (dr.to) endDate = endOfDay(new Date(dr.to));

        const diffDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
        tempoCalendarioMinutos = diffDays * 1440;
      }
      break;
  }

  const supabase = getSupabasePrensa();

  let maquinasQuery = supabase.from("maquinas").select("id, num_maq").order("num_maq");
  if (params.maquina !== "Todas") {
    maquinasQuery = maquinasQuery.eq("num_maq", params.maquina);
  }

  const { data: maquinasDb } = await maquinasQuery;
  if (!maquinasDb || maquinasDb.length === 0) return [];

  const maquinaIds = maquinasDb.map((m) => m.id);

  let sessoesQuery = supabase
    .from("sessoes_producao")
    .select("id, maquina_id, operador_matricula, produto_codigo, inicio_sessao, fim_sessao, qtd_produzida")
    .in("maquina_id", maquinaIds)
    .gte("inicio_sessao", startDate.toISOString())
    .lte("inicio_sessao", endDate.toISOString());

  if (params.operador !== "Todos") {
    sessoesQuery = sessoesQuery.eq("operador_matricula", params.operador);
  }

  const { data: sessoes, error: errSessoes } = await sessoesQuery;
  if (errSessoes || !sessoes) {
    return maquinasDb.map((m) => ({
      maquina: m.num_maq,
      teep: 0,
      utilizacao: 0,
      disponibilidade: 0,
      performance: 0,
      qualidade: 100,
      tempoOperacional: 0,
      qtdSessoes: 0,
    }));
  }

  const sessIds = sessoes.map((s) => s.id);
  let todasParadas: Array<{
    sessao_id: string;
    inicio_parada: string;
    fim_parada: string | null;
  }> = [];

  for (let i = 0; i < sessIds.length; i += 100) {
    const chunk = sessIds.slice(i, i + 100);
    if (!chunk.length) continue;

    const { data: parad } = await supabase
      .from("paradas_maquina")
      .select("sessao_id, inicio_parada, fim_parada")
      .in("sessao_id", chunk);

    if (parad) {
      todasParadas = todasParadas.concat(parad);
    }
  }

  const codigos = Array.from(new Set(sessoes.map((s) => s.produto_codigo).filter(Boolean)));
  const produtosMap = new Map<string, number>();

  for (let i = 0; i < codigos.length; i += 50) {
    const chunk = codigos.slice(i, i + 50);
    if (!chunk.length) continue;

    const { data: prods } = await supabase
      .from("vw_produtos_datasul")
      .select("codigo_item, tempo_ciclo_ideal_segundos")
      .in("codigo_item", chunk);

    if (prods) {
      prods.forEach((p) => produtosMap.set(p.codigo_item, p.tempo_ciclo_ideal_segundos || 300));
    }
  }

  const dataReferenciaAtual = new Date();

  const result = maquinasDb.map((maq) => {
    const sessoesMaq = sessoes.filter((s) => s.maquina_id === maq.id);
    const sessaoIdsDaMaquina = new Set(sessoesMaq.map((s) => s.id));
    const paradasMaq = todasParadas.filter((p) => sessaoIdsDaMaquina.has(p.sessao_id));

    let tempoOperacionalPlanejadoSegundos = 0;
    let tempoIdealNecessarioSegundos = 0;
    let tempoParadoTotalSegundos = 0;

    sessoesMaq.forEach((sessao) => {
      const inicioTs = new Date(sessao.inicio_sessao).getTime();
      const fimTs = sessao.fim_sessao
        ? new Date(sessao.fim_sessao).getTime()
        : Math.min(dataReferenciaAtual.getTime(), endDate.getTime());

      const planejado = Math.max(0, (fimTs - inicioTs) / 1000);
      tempoOperacionalPlanejadoSegundos += planejado;

      const qtd = sessao.qtd_produzida || 0;
      const cicloIdeal = produtosMap.get(sessao.produto_codigo) || 300;
      tempoIdealNecessarioSegundos += qtd * cicloIdeal;
    });

    paradasMaq.forEach((parada) => {
      const inicioP = new Date(parada.inicio_parada).getTime();
      const fimP = parada.fim_parada
        ? new Date(parada.fim_parada).getTime()
        : Math.min(dataReferenciaAtual.getTime(), endDate.getTime());

      const parado = Math.max(0, (fimP - inicioP) / 1000);
      tempoParadoTotalSegundos += parado;
    });

    const tempoTrabalhadoRealSegundos = Math.max(0, tempoOperacionalPlanejadoSegundos - tempoParadoTotalSegundos);

    let disponibilidade = 0;
    if (tempoOperacionalPlanejadoSegundos > 0) {
      disponibilidade = tempoTrabalhadoRealSegundos / tempoOperacionalPlanejadoSegundos;
    }

    let performance = 0;
    if (tempoTrabalhadoRealSegundos > 0) {
      performance = tempoIdealNecessarioSegundos / tempoTrabalhadoRealSegundos;
    }

    disponibilidade = Math.min(1, Math.max(0, disponibilidade));
    performance = Math.min(1, Math.max(0, performance));
    const qualidade = 1.0;
    const utilizacao = Math.min(1, tempoOperacionalPlanejadoSegundos / (tempoCalendarioMinutos * 60));
    const teep = Math.round(utilizacao * disponibilidade * performance * qualidade * 100);

    return {
      maquina: maq.num_maq,
      teep: Number.isNaN(teep) ? 0 : teep,
      utilizacao: Math.round(utilizacao * 100),
      disponibilidade: Math.round(disponibilidade * 100),
      performance: Math.round(performance * 100),
      qualidade: Math.round(qualidade * 100),
      tempoOperacional: Math.round(tempoTrabalhadoRealSegundos / 60),
      qtdSessoes: sessoesMaq.length,
    };
  });

  return result.sort((a, b) => {
    if (b.teep !== a.teep) return b.teep - a.teep;
    return a.maquina.localeCompare(b.maquina, "pt-BR", { numeric: true });
  });
}
