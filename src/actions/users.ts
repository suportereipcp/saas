"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { revalidatePath } from "next/cache";

export type ActionState = {
    error?: string;
    success?: string;
};

export async function createUser(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const isSuperAdmin = formData.get("isSuperAdmin") === "on";
    const sector = formData.get("sector") as string | null;
    const appCodesJson = formData.get("appCodes") as string;
    const appCodes = appCodesJson ? JSON.parse(appCodesJson) : [];

    if (!email || !password || !fullName) {
        return { error: "Preencha todos os campos obrigatórios." };
    }

    try {
        // 1. Create user in Supabase Auth
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: fullName },
        });

        if (authError) throw authError;

        if (authData.user) {
            // 2. Explicitly Create/Update Profile to ensure it exists immediately
            const { error: profileError } = await supabaseAdmin
                .from("profiles")
                .upsert({
                    id: authData.user.id,
                    email: email,
                    full_name: fullName,
                    is_super_admin: isSuperAdmin,
                    sector: sector, // Add sector
                    centro_custo: formData.get("centroCusto") as string | null, // Add centro_custo
                })
                .select()
                .single();

            if (profileError) {
                console.error("Error creating profile:", profileError);
            }

            // 3. Insert Permissions (Apps)
            if (appCodes.length > 0) {
                const permissionsData = appCodes.map((code: string) => ({
                    user_id: authData.user!.id,
                    app_code: code,
                    role: 'access' // Default role
                }));

                const { error: permError } = await supabaseAdmin
                    .from("permissions")
                    .insert(permissionsData);

                if (permError) {
                    console.error("Error creating permissions:", permError);
                }
            }
        }

        revalidatePath("/admin");
        return { success: "Usuário criado com sucesso!" };
    } catch (error: any) {
        // Provide friendly messages for common Supabase Auth errors
        if (error.message?.toLowerCase().includes("already registered") || error.message?.toLowerCase().includes("user already exists")) {
            return { error: "Este e-mail já está cadastrado no sistema." };
        }
        return { error: error.message || "Erro ao criar usuário." };
    }
}

export async function updateUser(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const userId = formData.get("userId") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const sector = formData.get("sector") as string | null;
    const isSuperAdmin = formData.get("isSuperAdmin") === "on";

    // appCodes logic
    const appCodesJson = formData.get("appCodes") as string;
    const centroCusto = formData.get("centroCusto") as string | null;
    console.log("updateUser payload:", { userId, email, fullName, sector, centroCusto, isSuperAdmin, appCodesJson });

    let appCodes: string[] | null = null;
    if (appCodesJson) {
        try {
            appCodes = JSON.parse(appCodesJson);
        } catch (e) {
            console.error("Error parsing appCodes:", e);
        }
    }

    if (!userId) return { error: "ID do usuário não fornecido." };

    try {
        const updates: any = {};
        if (email) updates.email = email;
        if (password) updates.password = password;

        // 1. Update Auth data
        if (Object.keys(updates).length > 0) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
                userId,
                updates
            );
            if (authError) throw authError;
        }

        // 2. Update Public Profile data
        const profileUpdates: any = {};
        if (fullName) profileUpdates.full_name = fullName;
        // Check filtering for null/undef if sector wasn't passed, but formData.get returns string or null.
        // If it's empty string we might want to save it as null or empty string.
        if (sector !== undefined) profileUpdates.sector = sector;

        if (centroCusto !== undefined) profileUpdates.centro_custo = centroCusto;

        profileUpdates.is_super_admin = isSuperAdmin;

        if (Object.keys(profileUpdates).length > 0) {
            const { error: profileError } = await supabaseAdmin
                .from("profiles")
                .update(profileUpdates)
                .eq("id", userId);
            if (profileError) throw profileError;
        }

        // 3. Update Permissions (Apps)
        if (appCodes !== null) {
            // Delete existing
            console.log("Deleting existing permissions for user:", userId);
            const { error: delError } = await supabaseAdmin
                .from("permissions")
                .delete()
                .eq("user_id", userId);

            if (delError) {
                console.error("Error deleting permissions:", delError);
                throw delError;
            }

            // Insert new
            if (appCodes.length > 0) {
                console.log("Inserting new permissions:", appCodes);
                const permissionsData = appCodes.map((code: string) => ({
                    user_id: userId,
                    app_code: code,
                    role: null
                }));

                const { error: insertError } = await supabaseAdmin
                    .from("permissions")
                    .insert(permissionsData);

                if (insertError) {
                    console.error("Error inserting permissions:", insertError);
                    throw insertError;
                }
            }
        } else {
            console.log("appCodes is null, skipping permissions update");
        }

        revalidatePath("/admin");
        return { success: "Usuário atualizado com sucesso!" };
    } catch (error: any) {
        console.error("updateUser Exception:", error);
        return { error: error.message || "Erro ao atualizar usuário." };
    }
}
