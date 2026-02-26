import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { db: { schema: "apont_rubber_prensa" } }
);

// PATCH: Justificar uma parada
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { parada_id, motivo_id, classificacao } = body;

    if (!parada_id || !motivo_id) {
      return NextResponse.json({ error: "Campos obrigatórios: parada_id, motivo_id" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("paradas_maquina")
      .update({
        motivo_id,
        classificacao: classificacao || "nao_planejada",
        justificada: true,
        fim_parada: new Date().toISOString(),
      })
      .eq("id", parada_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
