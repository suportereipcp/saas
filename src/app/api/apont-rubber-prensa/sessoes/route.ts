import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
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

    const { data, error } = await supabase.from("sessoes_producao").insert({
      maquina_id,
      produto_codigo,
      plato,
      operador_matricula,
      status: "em_andamento",
    }).select().single();

    if (error) throw error;
    
    // Resolve alerta de produção fantasma se houver algum engasgado na máquina
    await supabase.from("alertas_maquina")
      .update({ resolvido: true, updated_at: new Date().toISOString() })
      .eq("maquina_id", maquina_id)
      .eq("tipo", "producao_fantasma")
      .eq("resolvido", false);

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
    const { sessao_id, total_refugo = 0 } = body;

    if (!sessao_id) {
      return NextResponse.json({ error: "Campo obrigatório" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("sessoes_producao")
      .update({
        status: "finalizado",
        fim_sessao: new Date().toISOString(),
        total_refugo,
      })
      .eq("id", sessao_id)
      .select("*")
      .single();

    if (error) throw error;

    const { count } = await supabase
      .from("pulsos_producao")
      .select("*", { count: "exact", head: true })
      .eq("sessao_id", sessao_id);

    await supabase.from("export_datasul").insert({
      sessao_id,
      item_codigo: (data as any)?.produto_codigo || null,
      quantidade_total: count || 0,
      status_importacao: "pendente",
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
