"use client";

import { createBrowserClient } from "@supabase/ssr";
import { Save, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AppSettingsFormProps {
    app: {
        code: string;
        name: string;
        description: string | null;
        active: boolean;
    };
}

export function AppSettingsForm({ app: initialApp }: AppSettingsFormProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: initialApp.name,
        description: initialApp.description || "",
        active: initialApp.active,
    });
    const router = useRouter();

    // Client-side Supabase
    const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const handleSave = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("apps")
                .update({
                    name: formData.name,
                    description: formData.description,
                    active: formData.active,
                })
                .eq("code", initialApp.code)
                .select();

            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error("Falha na atualização. Verifique suas permissões de acesso.");
            }

            toast.success("Configurações salvas com sucesso!");
            router.refresh(); // Refresh server data
        } catch (error) {
            console.error("Erro ao salvar:", error);
            toast.error(error instanceof Error ? error.message : "Erro ao salvar alterações.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg border border-grey-light shadow-sm overflow-hidden">
            <div className="p-6 border-b border-grey-light flex justify-between items-center bg-zinc-50/50">
                <h3 className="font-semibold text-grey-darkest">Geral</h3>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {loading ? "Salvando..." : "Salvar Alterações"}
                </button>
            </div>

            <div className="p-6 space-y-8 max-w-4xl">
                {/* Status Toggle Configuration */}
                <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-lg border border-grey-lighter max-w-2xl">
                    <div>
                        <span className="block font-medium text-sm text-grey-darkest">
                            Status do Aplicativo
                        </span>
                        <span className="text-xs text-grey-darker">
                            Controle a visibilidade no portal.
                        </span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${formData.active
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                        >
                            {formData.active ? "ATIVO" : "INATIVO"}
                        </div>

                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.active}
                                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-grey-light peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-grey-darker">
                            Nome de Exibição
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full p-2.5 border border-grey-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow text-grey-darkest"
                            placeholder="Ex: Minha Ferramenta"
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-grey-darker">
                            Descrição
                        </label>
                        <input
                            type="text"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            className="w-full p-2.5 border border-grey-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow text-grey-darkest"
                            placeholder="Breve descrição da funcionalidade..."
                        />
                        <p className="text-xs text-grey-darker">Aparece no card do app.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
