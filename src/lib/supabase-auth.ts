export const SUPABASE_AUTH_COOKIE_NAME = "saas-pcp-auth-token";

export const SUPABASE_COOKIE_OPTIONS = {
    name: SUPABASE_AUTH_COOKIE_NAME,
} as const;

export const SUPABASE_COOKIE_ENCODING = "base64url" as const;
