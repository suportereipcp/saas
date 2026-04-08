import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

async function getSupabase() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {}
      },
      db: { schema: "apont_rubber_prensa" }
    }
  );
}

// POST: Iniciar nova sessão de produção
export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const body = await req.json();
    const { maquina_id, produto_codigo, plato = 1, operador_matricula } = body;

    if (!maquina_id || !produto_codigo || !operador_matricula) {
      return NextResponse.json({ error: "Campos obrigatórios" }, { status: 400 });
    }

    const { data: existing, error: errExist } = await supabase
      .from("sessoes_producao")
      .select("id")
      .eq("maquina_id", maquina_id)
      .eq("plato", plato)
      .eq("status", "em_andamento")
      .limit(1)
      .single();

    if (errExist && errExist.code !== "PGRST116") throw errExist;

    if (existing) {
      return NextResponse.json({ error: "Já possui sessão" }, { status: 409 });
    }

    // Resolve alerta de produção fantasma se houver algum engasgado na máquina
    // Busca alertas não resolvidos OU resolvidos muito recentemente (< 60s, por outro plato da mesma máquina)
    const { data: alertaCandidatos } = await supabase.from("alertas_maquina")
      .select("id, metadata, resolvido, updated_at")
      .eq("maquina_id", maquina_id)
      .eq("tipo", "producao_fantasma")
      .order("created_at", { ascending: false })
      .limit(1);

    const alertaPend = alertaCandidatos?.find(a => {
      if (!a.resolvido) return true; // Ainda não resolvido
      // Resolvido recentemente (outro plato da mesma máquina acabou de resolver)
      if (a.updated_at) {
        const diffMs = Date.now() - new Date(a.updated_at).getTime();
        return diffMs < 60_000; // 60 segundos de janela
      }
      return false;
    }) || null;

    let inicio_sessao = new Date();

    const { data: prodData } = await supabase
      .from("vw_produtos_datasul")
      .select("tempo_ciclo_ideal_segundos, cavidades")
      .eq("codigo_item", produto_codigo)
      .limit(1)
      .maybeSingle();
      
    const cavidadesPadrao = prodData?.cavidades || 1;

    if (alertaPend) {
      // É Produção Fantasma! Recuperamos o TS original do MariaDB
      const mariadbTsStr = alertaPend.metadata?.timestamp_mariadb;
      if (mariadbTsStr) {
        inicio_sessao = new Date(mariadbTsStr);
      }

      // Agora retroagiremos pelo Tempo Padrão do Ciclo para abraçar o pulso órfão inteiro
      const cicloPadrão = prodData?.tempo_ciclo_ideal_segundos || 300; // Padrão 5 min
      inicio_sessao.setSeconds(inicio_sessao.getSeconds() - cicloPadrão);

      // Marca o alerta como resolvido (se ainda não foi)
      if (!alertaPend.resolvido) {
        await supabase.from("alertas_maquina")
          .update({ resolvido: true, updated_at: new Date().toISOString() })
          .eq("id", alertaPend.id);
      }
    }

    console.log(`[API] POST /sessoes → maq=${maquina_id}, prod=${produto_codigo}, plato=${plato}, op=${operador_matricula}, inicio=${inicio_sessao.toISOString()}, alertaFantasma=${!!alertaPend}`);

    const { data, error } = await supabase.from("sessoes_producao").insert({
      maquina_id,
      produto_codigo,
      plato,
      operador_matricula,
      status: "em_andamento",
      inicio_sessao: inicio_sessao.toISOString(),
      cavidades: cavidadesPadrao
    }).select().single();

    if (error) {
      console.error("[API] ❌ Erro ao criar sessão:", error);
      throw error;
    }
    console.log(`[API] ✅ Sessão criada: ${data.id}`);

    // Zero-Gaps: Encerramento de eventual parada órfã ao iniciar nova sessão
    const { data: paradaOrfa } = await supabase
      .from("paradas_maquina")
      .select("id")
      .eq("maquina_id", maquina_id)
      .is("sessao_id", null)
      .is("fim_parada", null)
      .limit(1)
      .maybeSingle();

    if (paradaOrfa) {
      // Fecha a parada 1 segundo antes do início da sessão (sem sobreposição)
      const fimParada = new Date(inicio_sessao.getTime() - 1000).toISOString();
      await supabase.from("paradas_maquina")
        .update({
          fim_parada: fimParada,
          justificada: true
        })
        .eq("id", paradaOrfa.id);
    }

    // Resolvendo Ghost Pulse: Agora que temos o ID da sessão recém-criada, insere TODOS os pulsos esquecidos
    // IMPORTANTE: Usa service_role (admin) pois pulsos_producao tem RLS que bloqueia escrita via anon
    if (alertaPend && alertaPend.metadata) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { db: { schema: "apont_rubber_prensa" } }
      );

      const cavidades = cavidadesPadrao;
      
      // Usa o array acumulado de pulsos perdidos, ou fallback para o timestamp único (compatibilidade)
      const pulsosPerdidos: { mariadb_id?: number; timestamp: string }[] = 
        alertaPend.metadata.pulsos_perdidos || 
        (alertaPend.metadata.timestamp_mariadb 
          ? [{ timestamp: alertaPend.metadata.timestamp_mariadb }] 
          : []);

      let totalPecasInseridas = 0;

      for (let i = 0; i < pulsosPerdidos.length; i++) {
        const pulso = pulsosPerdidos[i];
        const pulsoId = pulso.mariadb_id ? `${pulso.mariadb_id}_p${plato}` : `ghost_${Math.floor(Date.now() / 1000)}_${i}_p${plato}`;
        
        const { error: pulsoErr } = await supabaseAdmin.from("pulsos_producao").insert({
          sessao_id: data.id,
          timestamp_ciclo: new Date(pulso.timestamp).toISOString(),
          qtd_pecas: cavidades,
          intervalo_segundos: null,
          mariadb_id: pulsoId,
        });

        if (!pulsoErr) {
          totalPecasInseridas += cavidades;

          // Export Datasul por pulso retroativo (ghost)
          await supabaseAdmin.from("export_datasul").insert({
            sessao_id: data.id,
            item_codigo: produto_codigo,
            operador_matricula: operador_matricula,
            quantidade_total: cavidades,
            status_importacao: "pendente",
          });
        } else {
          console.error(`[API] ❌ Erro ao inserir Ghost Pulse #${i}:`, pulsoErr);
        }
      }

      if (totalPecasInseridas > 0) {
        await supabaseAdmin.from("sessoes_producao").update({ qtd_produzida: totalPecasInseridas }).eq("id", data.id);
        data.qtd_produzida = totalPecasInseridas;
        console.log(`[API] ✅ ${pulsosPerdidos.length} Ghost Pulse(s) inserido(s) para sessão ${data.id} (${totalPecasInseridas} pçs)`);
      }
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Finalizar sessão de produção
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const body = await req.json();
    const { sessao_id } = body;

    if (!sessao_id) {
      return NextResponse.json({ error: "Campo obrigatório" }, { status: 400 });
    }

    const { data: pulsos } = await supabase
      .from("pulsos_producao")
      .select("qtd_pecas")
      .eq("sessao_id", sessao_id);

    const quantidadeTotal = pulsos?.reduce((acc, p) => acc + (p.qtd_pecas || 0), 0) || 0;

    if (quantidadeTotal > 0) {
      // Busca o timestamp do último ciclo (pulso) recebido
      const { data: ultimoPulso } = await supabase
        .from("pulsos_producao")
        .select("timestamp_ciclo")
        .eq("sessao_id", sessao_id)
        .order("timestamp_ciclo", { ascending: false })
        .limit(1)
        .single();

      // fim_sessao = timestamp do último ciclo, não a hora do clique do operador
      const fimSessao = ultimoPulso?.timestamp_ciclo
        ? new Date(ultimoPulso.timestamp_ciclo).toISOString()
        : new Date().toISOString();

      const { data, error } = await supabase
        .from("sessoes_producao")
        .update({
          status: "finalizado",
          fim_sessao: fimSessao,
          qtd_produzida: quantidadeTotal,
        })
        .eq("id", sessao_id)
        .select("*")
        .single();

      if (error) throw error;

      // Zero-Gaps: Verifica se era a última sessão em andamento na máquina
      if (data?.maquina_id) {
        const { data: activeSessoes } = await supabase
          .from("sessoes_producao")
          .select("id")
          .eq("maquina_id", data.maquina_id)
          .eq("status", "em_andamento")
          .limit(1);

        if (!activeSessoes || activeSessoes.length === 0) {
          // Parada órfã inicia 1 segundo após o último ciclo (sem gap, sem sobreposição)
          const inicioParada = new Date(new Date(fimSessao).getTime() + 1000).toISOString();
          const { error: insErr } = await supabase.from("paradas_maquina").insert({
            maquina_id: data.maquina_id,
            sessao_id: null,
            inicio_parada: inicioParada,
            motivo_id: "00",
            justificada: false,
          });
          if (insErr) console.error("[API] Falha ao criar parada órfã (Lacuna OEE):", insErr);
        }
      }

      return NextResponse.json({ data }, { status: 200 });
    } else {
      console.log(`[API] Sessão sem peças produzidas (${sessao_id}). Excluindo rastro...`);
      // Lógica de Cancelamento Limpo: Exclui filhas e a própria sessão Vazia
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { db: { schema: "apont_rubber_prensa" } }
      );

      const { data: sessaoDel } = await supabaseAdmin.from("sessoes_producao").select("maquina_id").eq("id", sessao_id).single();

      await supabaseAdmin.from("paradas_maquina").delete().eq("sessao_id", sessao_id);
      await supabaseAdmin.from("pulsos_producao").delete().eq("sessao_id", sessao_id);
      const { error: delError } = await supabaseAdmin.from("sessoes_producao").delete().eq("id", sessao_id);
      
      if (delError) throw delError;

      // Zero-Gaps: Verifica se exclusão deixou a máquina vazia (Sem sessão rolando)
      if (sessaoDel?.maquina_id) {
        const { data: activeSessoes } = await supabase
          .from("sessoes_producao")
          .select("id")
          .eq("maquina_id", sessaoDel.maquina_id)
          .eq("status", "em_andamento")
          .limit(1);

        if (!activeSessoes || activeSessoes.length === 0) {
          // Evita duplicação caso já exista uma parada vazia
          const { data: existingOrphan } = await supabase.from("paradas_maquina").select("id").eq("maquina_id", sessaoDel.maquina_id).is("sessao_id", null).is("fim_parada", null).limit(1);
          if (!existingOrphan || existingOrphan.length === 0) {
            // Busca o fim_parada da última parada fechada para esta máquina
            const { data: ultimaParada } = await supabase
              .from("paradas_maquina")
              .select("fim_parada")
              .eq("maquina_id", sessaoDel.maquina_id)
              .not("fim_parada", "is", null)
              .order("fim_parada", { ascending: false })
              .limit(1)
              .maybeSingle();

            // Início da nova parada = 1 segundo após o fim da última parada (sem gap)
            const inicioParadaOrfa = ultimaParada?.fim_parada
              ? new Date(new Date(ultimaParada.fim_parada).getTime() + 1000).toISOString()
              : new Date().toISOString();

            const { error: insErr } = await supabase.from("paradas_maquina").insert({
              maquina_id: sessaoDel.maquina_id,
              sessao_id: null,
              inicio_parada: inicioParadaOrfa,
              motivo_id: "00",
              justificada: false,
            });
            if (insErr) console.error("[API] Falha ao criar parada órfã em cancelamento limpo:", insErr);
          }
        }
      }
      
      return NextResponse.json({ data: { deleted: true, reason: 'zero_production' } }, { status: 200 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
