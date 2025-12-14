import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

// Note: This client should ONLY be used in server-side contexts (Server Actions, API routes)
// where the SERVICE_ROLE_KEY is available and safe to use.

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    console.warn(
        "SUPABASE_SERVICE_ROLE_KEY is missing. " +
        "This is expected during build time, but will fail at runtime if not provided."
    );
}

export const supabaseAdmin = serviceRoleKey
    ? createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    )
    : ({} as unknown as ReturnType<typeof createClient<Database>>);
