import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Instancia Supabase com Admin privileges para bypassar RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: "apont_rubber_prensa" } }
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("cad_motivos_parada")
      .select("*")
      .order("id", { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, descricao, ativo } = body;

    const { data, error } = await supabaseAdmin
      .from("cad_motivos_parada")
      .insert([{ id, descricao, ativo: ativo ?? true }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, descricao, ativo, newId } = body;

    const updatePayload: any = { ativo };
    if (descricao) updatePayload.descricao = descricao;
    if (newId) updatePayload.id = newId;

    const { data, error } = await supabaseAdmin
      .from("cad_motivos_parada")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) throw new Error("ID obrigatório");

    const { error } = await supabaseAdmin
      .from("cad_motivos_parada")
      .delete()
      .eq("id", id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
