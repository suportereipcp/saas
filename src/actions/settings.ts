"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export type ActionState = {
    error?: string;
    success?: string;
};

export async function saveSetting(key: string, value: string, description?: string): Promise<ActionState> {
    try {
        const { error } = await supabaseAdmin
            .from("system_settings")
            .upsert({
                key,
                value,
                description,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;

        revalidatePath("/admin");
        return { success: "Configuração salva com sucesso." };
    } catch (error: any) {
        console.error("Erro ao salvar configuração:", error);
        return { error: error.message || "Erro ao salvar configuração." };
    }
}

export async function fetchSettings() {
    try {
        const { data, error } = await supabaseAdmin
            .from("system_settings")
            .select("*");

        if (error) throw error;

        // Convert array to object for easier access { key: value }
        const settingsMap: Record<string, string> = {};
        data?.forEach(setting => {
            settingsMap[setting.key] = setting.value;
        });

        return settingsMap;
    } catch (error) {
        console.error("Erro ao buscar configurações:", error);
        return {};
    }
}
