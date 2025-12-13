import { createClient } from "@/lib/supabase-server";
import { AppSettingsForm } from "@/components/admin/app-settings-form";
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
                    <h2 className="text-xl font-bold text-[#2B4964]">Configurações: {app.name}</h2>
                    <p className="text-xs text-grey-darker font-mono">ID: {app.code}</p>
                </div>
            </div>

            {/* Config Sections Wrapper */}
            <AppSettingsForm app={{ ...app, active: app.active ?? false }} />

            {/* Placeholder for specific settings */}
            <div className="bg-white rounded-lg border border-grey-light shadow-sm p-8 text-center text-grey-darker">
                <p>Aqui entrarão configurações específicas do app <strong>{app.name}</strong> futuramente.</p>
            </div>
        </div>
    );
}
