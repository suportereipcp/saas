"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { saveSetting } from "@/actions/settings";

type SettingsFormProps = {
    initialSettings: Record<string, string>;
};

export function SettingsForm({ initialSettings }: SettingsFormProps) {
    const [isPending, startTransition] = useTransition();
    const [geminiKey, setGeminiKey] = useState(initialSettings["gemini_key"] || "");

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const result = await saveSetting("gemini_key", geminiKey, "API Key do Google Gemini");
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(result.success);
            }
        });
    };

    return (
        <div className="bg-white rounded-lg border border-grey-light shadow-sm p-6 text-grey-darker mt-6">
            <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-primary/10 rounded-md text-primary">
                    <Key size={20} />
                </div>
                <div>
                    <h4 className="font-semibold text-[#2B4964]">Chaves de API (LLM)</h4>
                    <p className="text-xs text-grey-darker">Gerencie as chaves de acesso para serviços de Inteligência Artificial.</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4 max-w-lg">
                <div className="space-y-2">
                    <Label htmlFor="geminiKey">Gemini API Key</Label>
                    <div className="flex gap-2">
                        <Input
                            id="geminiKey"
                            type="password"
                            placeholder="Ex: AIzaSy..."
                            value={geminiKey}
                            onChange={(e) => setGeminiKey(e.target.value)}
                            className="flex-1"
                        />
                        <Button type="submit" disabled={isPending} size="sm">
                            {isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar
                                </>
                            )}
                        </Button>
                    </div>
                    <p className="text-xs text-grey-darker opacity-80">
                        Chave utilizada para gerar textos e respostas inteligentes no sistema.
                    </p>
                </div>
            </form>
        </div>
    );
}
