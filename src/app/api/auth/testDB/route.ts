import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { db: { schema: "apont_rubber_prensa" } }
    );

    const { data: mData } = await supabase.from("maquinas").select("id").limit(1).single();
    
    const { data, error } = await supabase.from("sessoes_producao").insert({
      maquina_id: mData?.id,
      produto_codigo: "R-025/PRENSADO",
      plato: 1,
      operador_matricula: "1181",
      status: "em_andamento",
    }).select().single();

    if (error) {
      return NextResponse.json({ success: false, error, hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY });
    }

    await supabase.from("sessoes_producao").delete().eq("id", data.id);
    return NextResponse.json({ success: true, data, hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message, hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY });
  }
}
