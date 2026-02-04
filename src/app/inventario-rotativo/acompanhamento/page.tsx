import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { InventoryManagerView } from "@/components/inventario-manager-view";

export default async function AcompanhamentoPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return redirect("/login");

    // Admin Check
    const { data: profile } = await supabase
        .from("profiles")
        .select("is_super_admin")
        .eq("id", user.id)
        .single();

    if (!profile?.is_super_admin) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-center">
                <h2 className="text-2xl font-bold text-red-500">Acesso Negado</h2>
                <p className="text-muted-foreground">Apenas administradores podem ver o acompanhamento.</p>
            </div>
        );
    }


    return (
        <div className="flex flex-col gap-6 max-w-[1600px] mx-auto w-full">
             <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-[#374151]">Acompanhamento da Gestão</h1>
                <p className="text-muted-foreground">Visão geral e liberação de inventário.</p>
            </div>
            
            <InventoryManagerView />
        </div>
    );
}
