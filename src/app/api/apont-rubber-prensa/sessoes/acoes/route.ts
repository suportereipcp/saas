import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: "apont_rubber_prensa" },
  }
);

type SessaoProducao = {
  id: string;
  maquina_id: string;
  produto_codigo: string;
  plato: number;
  operador_matricula: string;
  cavidades?: number | null;
};

async function getSessao(sessaoId: string) {
  const { data, error } = await supabaseAdmin
    .from("sessoes_producao")
    .select("id, maquina_id, produto_codigo, plato, operador_matricula, cavidades")
    .eq("id", sessaoId)
    .eq("status", "em_andamento")
    .single();

  if (error || !data) {
    throw new Error("Sessao em andamento nao encontrada.");
  }

  return data as SessaoProducao;
}

async function getPulsosResumo(sessaoId: string) {
  const { data: pulsos, error } = await supabaseAdmin
    .from("pulsos_producao")
    .select("qtd_pecas, timestamp_ciclo")
    .eq("sessao_id", sessaoId)
    .order("timestamp_ciclo", { ascending: false });

  if (error) throw error;

  const total = (pulsos || []).reduce((acc, pulso) => acc + (pulso.qtd_pecas || 0), 0);
  return {
    total,
    count: pulsos?.length || 0,
    ultimoTimestamp: pulsos?.[0]?.timestamp_ciclo || null,
  };
}

async function recalcularSessao(sessaoId: string) {
  const resumo = await getPulsosResumo(sessaoId);
  const { error } = await supabaseAdmin
    .from("sessoes_producao")
    .update({ qtd_produzida: resumo.total })
    .eq("id", sessaoId);

  if (error) throw error;
  return resumo;
}

async function finalizarOuRemoverSessao(sessao: SessaoProducao) {
  const resumo = await getPulsosResumo(sessao.id);

  if (resumo.count === 0) {
    await supabaseAdmin.from("paradas_maquina").delete().eq("sessao_id", sessao.id);
    await supabaseAdmin.from("sessoes_producao").delete().eq("id", sessao.id);
    return { deleted: true, total: 0 };
  }

  const { error } = await supabaseAdmin
    .from("sessoes_producao")
    .update({
      status: "finalizado",
      fim_sessao: resumo.ultimoTimestamp || new Date().toISOString(),
      qtd_produzida: resumo.total,
    })
    .eq("id", sessao.id);

  if (error) throw error;
  return { deleted: false, total: resumo.total };
}

async function encerrarModoSemSaldo(sessaoId: string) {
  const { data: alertas, error } = await supabaseAdmin
    .from("alertas_maquina")
    .select("id, metadata")
    .eq("tipo", "modo_sem_saldo")
    .eq("resolvido", false);

  if (error) throw error;

  const ids = (alertas || [])
    .filter((alerta) => alerta.metadata?.sessao_id === sessaoId)
    .map((alerta) => alerta.id);

  if (ids.length === 0) return;

  const { error: updateError } = await supabaseAdmin
    .from("alertas_maquina")
    .update({ resolvido: true, updated_at: new Date().toISOString() })
    .in("id", ids);

  if (updateError) throw updateError;
}

async function getCavidadesPadrao(produtoCodigo: string) {
  const { data } = await supabaseAdmin
    .from("vw_produtos_datasul")
    .select("cavidades")
    .eq("codigo_item", produtoCodigo)
    .limit(1)
    .maybeSingle();

  return data?.cavidades || 1;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sessao_id } = body;

    if (!action || !sessao_id) {
      return NextResponse.json({ error: "Campos obrigatorios: action, sessao_id" }, { status: 400 });
    }

    if (action === "registrar_vazias") {
      const quantidade = Number(body.quantidade);
      if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 200) {
        return NextResponse.json({ error: "Quantidade deve estar entre 1 e 200." }, { status: 400 });
      }

      const sessao = await getSessao(sessao_id);
      const now = Date.now();
      const registros = Array.from({ length: quantidade }, (_, index) => ({
        sessao_id: sessao.id,
        timestamp_ciclo: new Date(now - (quantidade - index - 1) * 1000).toISOString(),
        qtd_pecas: 0,
        intervalo_segundos: null,
        mariadb_id: `manual_empty_${now}_${index}_p${sessao.plato}`,
      }));

      const { error } = await supabaseAdmin.from("pulsos_producao").insert(registros);
      if (error) throw error;

      const resumo = await recalcularSessao(sessao.id);

      return NextResponse.json({
        data: {
          sessao_id: sessao.id,
          prensadas_vazias_registradas: quantidade,
          qtd_produzida: resumo.total,
        },
      });
    }

    if (action === "liberar_saldo") {
      await getSessao(sessao_id);
      await encerrarModoSemSaldo(sessao_id);
      return NextResponse.json({ data: { sessao_id, modo_sem_saldo: false } });
    }

    if (action === "trocar_item") {
      const novoProdutoCodigo = String(body.novo_produto_codigo || "").trim();
      const modoEntrada = body.modo_entrada === "sem_saldo" ? "sem_saldo" : "saldo";

      if (!novoProdutoCodigo) {
        return NextResponse.json({ error: "Informe o novo item." }, { status: 400 });
      }

      const sessaoAtual = await getSessao(sessao_id);
      await finalizarOuRemoverSessao(sessaoAtual);
      await encerrarModoSemSaldo(sessaoAtual.id);

      const cavidades = await getCavidadesPadrao(novoProdutoCodigo);

      const { data: novaSessao, error: insertError } = await supabaseAdmin
        .from("sessoes_producao")
        .insert({
          maquina_id: sessaoAtual.maquina_id,
          produto_codigo: novoProdutoCodigo,
          plato: sessaoAtual.plato,
          operador_matricula: sessaoAtual.operador_matricula,
          status: "em_andamento",
          inicio_sessao: new Date().toISOString(),
          cavidades,
        })
        .select("*")
        .single();

      if (insertError) throw insertError;

      if (modoEntrada === "sem_saldo") {
        const { error: alertaError } = await supabaseAdmin.from("alertas_maquina").insert({
          maquina_id: sessaoAtual.maquina_id,
          tipo: "modo_sem_saldo",
          resolvido: false,
          metadata: {
            sessao_id: novaSessao.id,
            plato: novaSessao.plato,
            produto_codigo: novoProdutoCodigo,
            motivo: "troca_item_aquecimento",
          },
        });

        if (alertaError) throw alertaError;
      }

      return NextResponse.json({
        data: {
          sessao_anterior_id: sessaoAtual.id,
          nova_sessao: novaSessao,
          modo_sem_saldo: modoEntrada === "sem_saldo",
        },
      });
    }

    return NextResponse.json({ error: "Acao invalida." }, { status: 400 });
  } catch (error: unknown) {
    console.error("[API] POST /sessoes/acoes", error);
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
