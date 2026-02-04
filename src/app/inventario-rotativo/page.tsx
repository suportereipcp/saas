import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { OperatorScanView } from "@/components/inventario-operator-view"; 

export default async function ContagensPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("centro_custo, is_super_admin")
        .eq("id", user.id)
        .single();
    
    // User Cost Center (primary one if comma separated, or logic to handle multiple)
    const userCC = profile?.centro_custo ? profile.centro_custo.split(',')[0].trim() : null;
    const isAdmin = profile?.is_super_admin || false;

    return (
        <div className="flex flex-col gap-6 max-w-4xl mx-auto w-full">
            <div className="md:col-span-3">
                <OperatorScanView userCC={userCC} isAdmin={isAdmin} />
            </div>
        </div>
    );
}
