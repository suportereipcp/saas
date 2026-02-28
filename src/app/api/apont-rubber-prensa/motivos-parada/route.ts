import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase"; // Use se esse for o server client
import { createClient } from "@supabase/supabase-js";

export async function GET() {
  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: motivos, error } = await supabaseAdmin
      .schema("apont_rubber_prensa")
      .from("cad_motivos_parada")
      .select("id, descricao")
      .eq("ativo", true)
      .order("id", { ascending: true });

    if (error) {
      console.error("Erro ao buscar motivos na API interna:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: motivos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
