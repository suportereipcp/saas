import { createClient } from "@/lib/supabase-server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { AppSettingsForm } from "@/components/admin/app-settings-form";
import { NotebookSettings } from "@/components/admin/notebook-settings";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface AppSettingsPageProps {
    params: Promise<{ appCode: string }>;
}

export default async function AppSettingsPage({ params }: AppSettingsPageProps) {
    const { appCode } = await params;
    const supabase = await createClient();

    const { data: app } = await supabase
        .from("apps")
        .select("*")
        .eq("code", appCode)
        .single();

    if (!app) {
        notFound();
    }

    // Buscar configurações de LLM do system_settings (apenas para o Caderno Inteligente)
    let currentProvider = "gemini";
    let currentModel = "gemini-2.0-flash";
    let customModels: any[] = [];

    if (appCode === "anotacoes") {
        const { data: providerSetting } = await supabaseAdmin
            .from("system_settings")
            .select("value")
            .eq("key", "anotacoes_llm_provider")
            .single();
        if (providerSetting?.value) currentProvider = providerSetting.value;

        const { data: modelSetting } = await supabaseAdmin
            .from("system_settings")
            .select("value")
            .eq("key", "anotacoes_llm_model")
            .single();
        if (modelSetting?.value) currentModel = modelSetting.value;

        const { data: customModelsSetting } = await supabaseAdmin
            .from("system_settings")
            .select("value")
            .eq("key", "anotacoes_custom_models")
            .single();
        
        if (customModelsSetting?.value) {
            try {
                customModels = JSON.parse(customModelsSetting.value);
            } catch (e) {
                console.error("Error parsing custom models JSON", e);
            }
        }
    }

    return (
        <div className="space-y-6">
            {/* Header / Nav Back */}
            <div className="flex items-center gap-4">
                <Link
                    href="/admin"
                    className="p-2 -ml-2 text-grey-darker hover:text-black rounded-full hover:bg-grey-lighter transition-colors"
                    title="Voltar"
                >
                    <ArrowLeft size={20} />
                </Link>
                <div>
                    <h2 className="text-xl font-bold">Configurações: {app.name}</h2>
                    <p className="text-xs text-grey-darker font-mono">ID: {app.code}</p>
                </div>
            </div>

            {/* Config Sections Wrapper */}
            <AppSettingsForm app={{ ...app, active: app.active ?? false }} />

            {/* Configurações específicas por app */}
            {appCode === "anotacoes" ? (
                <NotebookSettings currentProvider={currentProvider} currentModel={currentModel} customModels={customModels} />
            ) : (
                <div className="bg-white rounded-lg border border-grey-light shadow-sm p-8 text-center text-grey-darker">
                    <p>Aqui entrarão configurações específicas do app <strong>{app.name}</strong> futuramente.</p>
                </div>
            )}
        </div>
    );
}
