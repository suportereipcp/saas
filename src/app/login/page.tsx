"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { SUPABASE_AUTH_COOKIE_NAME } from "@/lib/supabase-auth";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { InstallPrompt } from "@/components/install-prompt";

function clearSupabaseAuthCookies() {
    document.cookie
        .split(";")
        .map((cookie) => cookie.trim().split("=")[0])
        .filter(
            (name) =>
                name === SUPABASE_AUTH_COOKIE_NAME ||
                name.startsWith(`${SUPABASE_AUTH_COOKIE_NAME}.`)
        )
        .forEach((name) => {
            document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
        });
}

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleLogin(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setLoading(true);
        setError(null);

        const formData = new FormData(event.currentTarget);
        const email = String(formData.get("email") ?? "").trim();
        const password = String(formData.get("password") ?? "");

        clearSupabaseAuthCookies();

        try {
            const loginTimeout = new Promise<never>((_, reject) => {
                window.setTimeout(
                    () => reject(new Error("login_timeout")),
                    15000
                );
            });

            const { error } = await Promise.race([
                supabase.auth.signInWithPassword({
                    email,
                    password,
                }),
                loginTimeout,
            ]);

            if (error) {
                setError(
                    error.message === "Invalid login credentials"
                        ? "E-mail ou senha invalidos."
                        : error.message
                );
                setLoading(false);
                return;
            }
        } catch (error) {
            setError(
                error instanceof Error && error.message === "login_timeout"
                    ? "O login demorou demais para responder. Recarregue a pagina e tente novamente."
                    : "Nao foi possivel concluir o login."
            );
            setLoading(false);
            return;
        }

        router.replace("/portal");
        router.refresh();
    }

    return (
        <div className="min-h-screen bg-muted/40 font-sans flex flex-col items-center justify-center p-4">
            {/* Logo Section */}
            <div className="mb-8 scale-150">
                <Logo />
            </div>

            {/* Login Card */}
            <Card className="w-full max-w-sm shadow-md">
                <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl font-bold uppercase tracking-wide select-none cursor-default">
                        Bem-vindo!
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                placeholder="seu@email.com"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                placeholder="******"
                                required
                            />
                        </div>

                        {error && (
                            <div className="text-sm text-destructive font-medium text-center">
                                {error}
                            </div>
                        )}

                        <Button
                            className="w-full uppercase tracking-wider font-bold"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? "Entrando..." : "Entrar"}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="w-full max-w-sm">
                <InstallPrompt />
            </div>


        </div>
    );
}
