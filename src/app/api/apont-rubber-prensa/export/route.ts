import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { db: { schema: "apont_rubber_prensa" } }
);

// POST: Consolidar sessão e enviar para Datasul
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessao_id } = body;

    if (!sessao_id) {
      return NextResponse.json({ error: "Campo obrigatório: sessao_id" }, { status: 400 });
    }

    // Busca dados da sessão
    const { data: sessao, error: sessaoErr } = await supabase
      .from("sessoes_producao")
      .select("*")
      .eq("id", sessao_id)
      .single();

    if (sessaoErr || !sessao) {
      return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 });
    }

    // Conta total de peças
    const { count } = await supabase
      .from("pulsos_producao")
      .select("*", { count: "exact", head: true })
      .eq("sessao_id", sessao_id);

    // Insere na fila de exportação
    const { data, error } = await supabase.from("export_datasul").insert({
      sessao_id,
      item_codigo: sessao.produto_codigo || null,
      operador_matricula: sessao.operador_matricula || null,
      quantidade_total: sessao.qtd_produzida || (count || 0),
      status_importacao: "pendente",
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
