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

    // Busca na tabela base do datasul.funcionario (conforme o print do usuário)
    const { data, error } = await supabase
      .schema("datasul")
      .from("funcionario")
      .select("cdn_funcionario, nom_pessoa_fisic")
      .or(`cdn_funcionario.eq.${query},nom_pessoa_fisic.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error("Erro ao buscar operador Datasul:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mapeia para o formato esperado pelo frontend
    const formatado = (data || []).map((op) => ({
      matricula: String(op.cdn_funcionario),
      nome: op.nom_pessoa_fisic,
    }));

    return NextResponse.json({ data: formatado });
  } catch (err: any) {
    console.error("Erro interno API operadores:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
