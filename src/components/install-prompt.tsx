"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isIOS, setIsIOS] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);

        const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
        setIsIOS(isIosDevice);

        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener("beforeinstallprompt", handler);
        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        setDeferredPrompt(null);
    };

    if (!mounted) return null;

    if (deferredPrompt) {
        return (
            <div className="w-full mt-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <Button
                    onClick={handleInstallClick}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-semibold py-6 shadow-lg border border-slate-700"
                >
                    <Download className="mr-3 h-5 w-5 text-emerald-400" />
                    Instalar App na Área de Trabalho
                </Button>
            </div>
        );
    }

    if (isIOS) {
        return (
            <div className="w-full mt-4 text-center text-sm text-muted-foreground bg-muted p-3 rounded-lg border border-border">
                <p>Para instalar no iOS:</p>
                <p>Toque em <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</p>
            </div>
        );
    }

    return null;
}
