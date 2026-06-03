import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_COOKIE_ENCODING, SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase-auth";

export async function middleware(request: NextRequest) {
    const isPublicRoute =
        request.nextUrl.pathname === "/login" ||
        request.nextUrl.pathname === "/" ||
        request.nextUrl.pathname.startsWith("/api/auth");

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    // Avoid touching auth cookies on public routes.
    // This keeps the login page light and prevents bloated Set-Cookie headers.
    if (isPublicRoute) {
        return response;
    }

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookieOptions: SUPABASE_COOKIE_OPTIONS,
            cookieEncoding: SUPABASE_COOKIE_ENCODING,
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    response = NextResponse.next({
                        request: {
                            headers: request.headers,
                        },
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        response.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user && !isPublicRoute) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return response;
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (images etc)
         */
        "/((?!_next/static|_next/image|favicon.ico|api/webhook|sw.js|manifest.json|icon-192.png|icon-512.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
