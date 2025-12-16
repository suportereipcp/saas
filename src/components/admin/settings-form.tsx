"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Key, Loader2, Save, Globe, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { saveSetting } from "@/actions/settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { UserList } from "@/components/admin/user-list";
import { Users } from "lucide-react";

type User = {
    id: string;
    email: string;
    full_name: string | null;
    is_super_admin: boolean | null;
    created_at: string;
    sector?: string | null;
    authorized_apps?: string[];
};

type App = {
    code: string;
    name: string;
    active: boolean | null;
};

type SettingsFormProps = {
    initialSettings: Record<string, string>;
    users?: User[];
    currentUserId?: string;
    allApps?: App[];
};

export function SettingsForm({ initialSettings, users = [], currentUserId, allApps = [] }: SettingsFormProps) {
    const [isPending, startTransition] = useTransition();
    const [geminiKey, setGeminiKey] = useState(initialSettings["gemini_key"] || "");
    const [baseUrl, setBaseUrl] = useState(initialSettings["system_base_url"] || "");
    const [webhookSource, setWebhookSource] = useState("datasul");
    const [copied, setCopied] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            // Save settings in parallel
            const results = await Promise.all([
                saveSetting("gemini_key", geminiKey, "API Key do Google Gemini"),
                saveSetting("system_base_url", baseUrl, "URL Base do Sistema")
            ]);

            const errors = results.filter(r => r.error).map(r => r.error);

            if (errors.length > 0) {
                toast.error(`Erro ao salvar: ${errors.join(", ")}`);
            } else {
                toast.success("Configurações salvas com sucesso!");
            }
        });
    };

    const generatedWebhookUrl = baseUrl
        ? `${baseUrl.replace(/\/$/, "")}/api/webhook?source=${webhookSource}`
        : "/api/webhook (Configure a URL Base primeiro)";

    const copyToClipboard = () => {
        if (!baseUrl) {
            toast.error("Configure a URL Base do sistema antes de copiar.");
            return;
        }
        navigator.clipboard.writeText(generatedWebhookUrl);
        setCopied(true);
        toast.success("URL copiada!");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            <Tabs defaultValue="users" className="w-full">
                <TabsList>
                    <TabsTrigger value="users">Usuários</TabsTrigger>
                    <TabsTrigger value="keys">Chaves</TabsTrigger>
                    <TabsTrigger value="general">Geral</TabsTrigger>
                    <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="mt-4">
                    <div className="bg-white rounded-lg border border-grey-light shadow-sm p-6 text-grey-darker">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-blue-100 rounded-md text-blue-700">
                                <Users size={20} />
                            </div>
                            <div>
                                <h4 className="font-semibold">Gestão de Usuários</h4>
                                <p className="text-xs text-grey-darker">Administre acessos e permissões.</p>
                            </div>
                        </div>
                        <UserList users={users} currentUserId={currentUserId} allApps={allApps} />
                    </div>
                </TabsContent>

                <TabsContent value="keys">
                    <div className="bg-white rounded-lg border border-grey-light shadow-sm p-6 text-grey-darker mt-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-yellow-100 rounded-md text-yellow-700">
                                <Key size={20} />
                            </div>
                            <div>
                                <h4 className="font-semibold">Chaves de API</h4>
                                <p className="text-xs text-grey-darker">Gerencie as chaves de integração.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6 max-w-lg">
                            {/* Gemini Key */}
                            <div className="space-y-2">
                                <Label htmlFor="geminiKey">Gemini API Key</Label>
                                <Input
                                    id="geminiKey"
                                    type="password"
                                    placeholder="Ex: AIzaSy..."
                                    value={geminiKey}
                                    onChange={(e) => setGeminiKey(e.target.value)}
                                />
                                <p className="text-xs text-grey-darker opacity-80">
                                    Chave para recursos de IA.
                                </p>
                            </div>

                            <Button type="submit" disabled={isPending} size="sm">
                                {isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Salvar Chaves
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>
                </TabsContent>

                <TabsContent value="general">
                    <div className="bg-white rounded-lg border border-grey-light shadow-sm p-6 text-grey-darker mt-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-primary/10 rounded-md text-primary">
                                <Globe size={20} />
                            </div>
                            <div>
                                <h4 className="font-semibold">Configurações Gerais</h4>
                                <p className="text-xs text-grey-darker">URLs do sistema.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSave} className="space-y-6 max-w-lg">
                            {/* Base URL */}
                            <div className="space-y-2">
                                <Label htmlFor="baseUrl">URL Base do Sistema</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Globe className="absolute left-2.5 top-2.5 h-4 w-4 text-grey-darker" />
                                        <Input
                                            id="baseUrl"
                                            type="url"
                                            placeholder="https://seu-saas.com"
                                            className="pl-9"
                                            value={baseUrl}
                                            onChange={(e) => setBaseUrl(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-grey-darker opacity-80">
                                    Usada para gerar links de convite e webhooks.
                                </p>
                            </div>

                            <Button type="submit" disabled={isPending} size="sm">
                                {isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Salvar Configurações
                                    </>
                                )}
                            </Button>
                        </form>
                    </div>
                </TabsContent>

                <TabsContent value="webhooks">
                    {/* Webhook Generator Section */}
                    <div className="bg-white rounded-lg border border-grey-light shadow-sm p-6 text-grey-darker mt-4">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-green-100 rounded-md text-green-700">
                                <ExternalLink size={20} />
                            </div>
                            <div>
                                <h4 className="font-semibold">Integração Webhook</h4>
                                <p className="text-xs text-grey-darker">Gere URLs para receber dados externos.</p>
                            </div>
                        </div>

                        <div className="space-y-4 max-w-xl">
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2 col-span-1">
                                    <Label htmlFor="source">Origem (Source)</Label>
                                    <Input
                                        id="source"
                                        value={webhookSource}
                                        onChange={(e) => setWebhookSource(e.target.value)}
                                        placeholder="ex: n8n"
                                    />
                                </div>
                                <div className="space-y-2 col-span-2">
                                    <Label>URL Gerada</Label>
                                    <div className="flex gap-2">
                                        <code className="flex-1 bg-grey-lighter p-2 rounded border border-grey-light text-xs flex items-center overflow-x-auto whitespace-nowrap">
                                            {generatedWebhookUrl}
                                        </code>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            onClick={copyToClipboard}
                                            title="Copiar URL"
                                        >
                                            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                            <p className="text-xs text-grey-darker opacity-80">
                                Configure esta URL na ferramenta externa (ex: Datasul, N8N) para enviar dados JSON via POST.
                            </p>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
