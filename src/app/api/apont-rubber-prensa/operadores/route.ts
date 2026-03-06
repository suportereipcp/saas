import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Usando as credenciais de admin para contornar limitações de schema/rls do usuário anônimo
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.length < 2) {
      return NextResponse.json({ data: [] });
    }

    const isNumeric = !isNaN(Number(query));
    const orCondition = isNumeric
      ? `cdn_operador.eq.${query},nome_operador.ilike.%${query}%`
      : `nome_operador.ilike.%${query}%`;

    // Busca apenas operadores do centro de custo 3211800
    const { data, error } = await supabase
      .schema("datasul")
      .from("operador_prod")
      .select("cdn_operador, nome_operador")
      .eq("cc_codigo", "3211800")
      .or(orCondition)
      .limit(10);

    if (error) {
      console.error("Erro ao buscar operador Datasul:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mapeia para o formato esperado pelo frontend
    const formatado = (data || []).map((op) => ({
      matricula: String(op.cdn_operador),
      nome: op.nome_operador,
    }));

    return NextResponse.json({ data: formatado });
  } catch (err: any) {
    console.error("Erro interno API operadores:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
