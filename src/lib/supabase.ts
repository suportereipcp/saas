import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_COOKIE_ENCODING, SUPABASE_COOKIE_OPTIONS } from './supabase-auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const dbSchema = process.env.NEXT_PUBLIC_DB_SCHEMA || 'public';

export const supabase = createBrowserClient(supabaseUrl, supabaseKey, {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
    cookieEncoding: SUPABASE_COOKIE_ENCODING,
    db: {
        schema: dbSchema, // <--- A MÁGICA ACONTECE AQUI
    },
});
