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

// PATCH: Atualizar a quantidade de cavidades de uma sessão
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const body = await req.json();
    const { sessao_id, novas_cavidades, retroativo } = body;

    if (!sessao_id || novas_cavidades === undefined || typeof novas_cavidades !== 'number') {
      return NextResponse.json({ error: "Campos obrigatórios (sessao_id, novas_cavidades)" }, { status: 400 });
    }

    if (novas_cavidades < 1) {
       return NextResponse.json({ error: "Cavidades não pode ser menor que 1" }, { status: 400 });
    }

    // 1. Atualizar a coluna na tabela `sessoes_producao` para valer nos próximos ciclos
    const { data: sessaoAtualizada, error: updError } = await supabase
      .from("sessoes_producao")
      .update({ cavidades: novas_cavidades })
      .eq("id", sessao_id)
      .select("*")
      .single();

    if (updError) throw updError;

    // 2. [Opcional mas recomendado] Atualizar retroativamente os pulsos dessa mesma sessão
    if (retroativo) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { db: { schema: "apont_rubber_prensa" } }
      );

      // Atualiza pulsos daquela sessão
      const { data: pulsos, error: errPulsos } = await supabaseAdmin
        .from("pulsos_producao")
        .update({ qtd_pecas: novas_cavidades })
        .eq("sessao_id", sessao_id)
        .select("id");

      if (errPulsos) {
        console.error("[API] Erro ao reprocessar pulsos antigos", errPulsos);
        throw errPulsos;
      }

      // Recalcular Total da Sessão
      const totalNovo = (pulsos?.length || 0) * novas_cavidades;
      
      const { error: calcError } = await supabaseAdmin
        .from("sessoes_producao")
        .update({ qtd_produzida: totalNovo })
        .eq("id", sessao_id);

      if (calcError) throw calcError;
      
      console.log(`[API] Sessao ${sessao_id} cavidades => ${novas_cavidades} (${pulsos?.length || 0} pulsos retroativos atualizados: Total=${totalNovo})`);
      sessaoAtualizada.qtd_produzida = totalNovo;
    } else {
      console.log(`[API] Sessao ${sessao_id} cavidades => ${novas_cavidades} (Apenas daqui pra frente)`);
    }

    return NextResponse.json({ data: sessaoAtualizada }, { status: 200 });
  } catch (error: any) {
    console.error("[API] PATCH /sessoes/cavidades", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
