import { createClient } from "@supabase/supabase-js";
import { Database } from "./database.types";

// Note: This client should ONLY be used in server-side contexts (Server Actions, API routes)
// where the SERVICE_ROLE_KEY is available and safe to use.

const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is missing. Please add it to your .env.local file. " +
        "You can find this key in your Supabase Project Settings > API > service_role secret."
    );
}

export const supabaseAdmin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);
