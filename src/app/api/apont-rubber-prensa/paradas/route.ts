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

// PATCH: Justificar uma parada
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await getSupabase();
    const body = await req.json();
    const { parada_id, motivo_id } = body;

    if (!parada_id || !motivo_id) {
      return NextResponse.json({ error: "Campos obrigatórios: parada_id, motivo_id" }, { status: 400 });
    }

    // Verifica se a parada é órfã (sem sessão vinculada)
    const { data: paradaAtual } = await supabase
      .from("paradas_maquina")
      .select("sessao_id")
      .eq("id", parada_id)
      .single();

    // Parada órfã NÃO fecha ao justificar — só fecha quando iniciar produção
    const updatePayload: Record<string, any> = {
      motivo_id,
      justificada: true,
    };

    if (paradaAtual?.sessao_id !== null) {
      updatePayload.fim_parada = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("paradas_maquina")
      .update(updatePayload)
      .eq("id", parada_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
