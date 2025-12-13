import { createClient } from "@/lib/supabase-server";
import { Settings } from "lucide-react";

export default async function AdminGlobalSettings() {
    const supabase = await createClient();

    // In a real app, we would fetch system settings from a 'settings' table here
    // const { data: settings } = await supabase.from("system_settings").select("*").single();

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-grey-lighter rounded-full text-[#2B4964]">
                    <Settings size={24} />
                </div>
                <div>
                    <h2 className="text-xl font-bold text-[#2B4964]">Geral do Sistema</h2>
                    <p className="text-sm text-grey-darker">Configurações que afetam todo o ambiente SaaS.</p>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-grey-light shadow-sm p-8 max-w-4xl text-center text-grey-darker">
                <p>
                    Aqui você poderá configurar opções globais como:
                </p>
                <ul className="mt-4 space-y-2 text-sm text-left inline-block">
                    <li>• Modo de Manutenção Global</li>
                    <li>• Tema Padrão do Sistema</li>
                    <li>• Políticas de Senha</li>
                    <li>• Integrações de Email (SMTP)</li>
                </ul>
                <p className="mt-8 text-xs opacity-50">Funcionalidade em desenvolvimento.</p>
            </div>
        </div>
    );
}
