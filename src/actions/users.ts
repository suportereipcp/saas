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
            // (We don't rely on triggers since they might be missing or slow)
            const { error: profileError } = await supabaseAdmin
                .from("profiles")
                .upsert({
                    id: authData.user.id,
                    email: email,
                    full_name: fullName,
                    is_super_admin: isSuperAdmin,
                    // created_at will be handled by default or we can set it
                })
                .select()
                .single();

            if (profileError) {
                console.error("Error creating profile:", profileError);
                // We don't throw here to avoid rolling back the auth user, but we technically should clean up if strict transaction.
                // For now, we warn.
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
        return { error: error.message || "Erro ao criar usuário." };
    }
}

export async function updateUser(prevState: ActionState, formData: FormData): Promise<ActionState> {
    const userId = formData.get("userId") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const isSuperAdmin = formData.get("isSuperAdmin") === "on";

    // appCodes logic
    const appCodesJson = formData.get("appCodes") as string;
    console.log("updateUser payload:", { userId, email, fullName, isSuperAdmin, appCodesJson });

    let appCodes: string[] | null = null;
    if (appCodesJson) {
        try {
            appCodes = JSON.parse(appCodesJson);
            console.log("Parsed appCodes:", appCodes);
        } catch (e) {
            console.error("Error parsing appCodes:", e);
        }
    }

    if (!userId) return { error: "ID do usuário não fornecido." };

    try {
        const updates: any = {};
        if (email) updates.email = email;
        if (password) updates.password = password;

        // 1. Update Auth data (Email, Password)
        // Only call auth.admin if there are sensitive updates (email which triggers reconfirm or password)
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
        // isSuperAdmin: explicit check for boolean since it's a checkbox
        // If the checkbox is present in the form (even if unchecked), we might want to update it.
        // However, standard HTML forms don't send anything for unchecked.
        // We'll trust the intent: if present 'on' -> true. If we want to allow uncheck, we verify existence.
        // For simplicity let's say we only update if it changed.
        // But for now, let's just update `is_super_admin`.
        // CAUTION: Determining "unchecked" in FormData:
        // If `isSuperAdmin` key is missing, it implies false IF user had the checkbox visible.
        // We'll update it to match the form state.

        // Let's rely on a hidden input or just assume missing = false?
        // Safer: isSuperAdmin is derived from presence.
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
