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

    // Soma total de peças. Pulsos de prensada vazia têm qtd_pecas = 0 e
    // não devem virar saldo no Datasul.
    const { data: pulsos } = await supabase
      .from("pulsos_producao")
      .select("qtd_pecas")
      .eq("sessao_id", sessao_id);

    const quantidadeTotal = (pulsos || []).reduce((acc, pulso) => acc + (pulso.qtd_pecas || 0), 0);

    if (quantidadeTotal <= 0) {
      return NextResponse.json({
        data: { skipped: true, reason: "sem_saldo", quantidade_total: 0 },
      }, { status: 200 });
    }

    // Insere na fila de exportação
    const { data, error } = await supabase.from("export_datasul").insert({
      sessao_id,
      item_codigo: sessao.produto_codigo || null,
      operador_matricula: sessao.operador_matricula || null,
      quantidade_total: sessao.qtd_produzida || quantidadeTotal,
      status_importacao: "pendente",
    }).select().single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
