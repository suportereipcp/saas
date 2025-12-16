"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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

export default function LoginPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleLogin(formData: FormData) {
        setLoading(true);
        setError(null);

        const email = formData.get('email') as string;
        const password = formData.get('password') as string;

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            router.push('/portal');
            router.refresh();
        }
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
                    <form action={handleLogin} className="space-y-4">
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
                            {loading ? 'Entrando...' : 'Entrar'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            <div className="absolute bottom-4 right-4 text-xs text-muted-foreground font-medium">
                Powered by PCP
            </div>
        </div>
    );
}
