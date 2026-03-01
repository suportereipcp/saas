import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Usando as credenciais de admin
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

    // Busca na tabela base do datasul.item
    const { data, error } = await supabase
      .schema("datasul")
      .from("item")
      .select("it_codigo, desc_item")
      .or(`it_codigo.ilike.%${query}%,desc_item.ilike.%${query}%`)
      .limit(10);

    if (error) {
      console.error("Erro ao buscar produto Datasul:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Mapeia para o formato esperado pelo frontend 'vw_produtos_datasul'
    const formatado = (data || []).map((p: any) => ({
      codigo_item: String(p.it_codigo),
      descricao: p.desc_item,
    }));

    return NextResponse.json({ data: formatado });
  } catch (err: any) {
    console.error("Erro interno API produtos:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
