import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export default async function ApontRubberPrensaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect("/login");

  // Verifica o role do usuário para redirecionar
  const { data: permission } = await supabase
    .from("permissions")
    .select("role")
    .eq("user_id", user.id)
    .eq("app_code", "apont_rubber_prensa")
    .single();

  return redirect("/apont-rubber-prensa/operador");
}
