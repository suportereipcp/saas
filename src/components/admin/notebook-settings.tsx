"use client";

import { useState } from "react";
import { Save, Loader2, BrainCircuit, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { saveSetting } from "@/actions/settings";

// Todos os modelos em uma lista única, agrupados por provedor
const MODEL_GROUPS = [
    {
        provider: "gemini",
        label: "Google Gemini",
        models: [
            { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
            { value: "gemini-2.0-flash-lite", label: "Gemini 2.0 Flash Lite" },
            { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
            { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
            { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
            { value: "gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)" },
            { value: "gemini-3-pro-preview", label: "Gemini 3 Pro (Preview)" },
        ],
    },
    {
        provider: "openrouter",
        label: "OpenRouter",
        models: [
            { value: "deepseek/deepseek-r1-0528:free", label: "DeepSeek R1 0528 (Free)" },
            { value: "z-ai/glm-4.5-air:free", label: "GLM 4.5 Air (Free)" },
            { value: "z-ai/glm-5", label: "GLM 5" },
            { value: "moonshotai/kimi-k2.5", label: "Kimi k2.5" },
            { value: "google/gemini-2.0-flash-lite-preview-02-05:free", label: "Gemini 2.0 Flash Lite (Preview)" }, 
            { value: "google/gemini-2.0-pro-exp-02-05:free", label: "Gemini 2.0 Pro Experimental" },
            { value: "google/gemini-flash-1.5", label: "Gemini 1.5 Flash" },
            { value: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
            { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Preview)" },
            { value: "google/gemini-3-pro-preview", label: "Gemini 3 Pro (Preview)" },
            { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
            { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
        ],
    },
];

// Dado um model value, determinar o provider automaticamente
function getProviderFromModel(modelValue: string): string {
    for (const group of MODEL_GROUPS) {
        if (group.models.some(m => m.value === modelValue)) {
            return group.provider;
        }
    }
    return "gemini";
}

interface CustomModel {
    value: string;
    label: string;
    provider: string; // 'gemini' | 'openrouter'
}

interface NotebookSettingsProps {
    currentProvider: string;
    currentModel: string;
    customModels?: CustomModel[];
}

export function NotebookSettings({ currentModel, customModels = [] }: NotebookSettingsProps) {
    const [model, setModel] = useState(currentModel || "gemini-2.0-flash");
    const [localCustomModels, setLocalCustomModels] = useState<CustomModel[]>(customModels);
    const [saving, setSaving] = useState(false);
    
    // Form State
    const [isAdding, setIsAdding] = useState(false);
    const [newModelId, setNewModelId] = useState("");
    const [newModelLabel, setNewModelLabel] = useState("");
    const [newModelProvider, setNewModelProvider] = useState("openrouter");

    const handleAddCustomModel = async () => {
        if (!newModelId || !newModelLabel) {
            toast.error("Preencha o ID e o Nome do modelo.");
            return;
        }

        const newModel: CustomModel = {
            value: newModelId.trim(),
            label: newModelLabel.trim(),
            provider: newModelProvider,
        };

        const updatedList = [...localCustomModels, newModel];
        setLocalCustomModels(updatedList);
        
        // Save to system_settings immediately (or could be on global save, but immediate is better for list management)
        try {
            const res = await saveSetting("anotacoes_custom_models", JSON.stringify(updatedList), "Modelos LLM personalizados");
            if (res.error) throw new Error(res.error);
            toast.success("Modelo personalizado adicionado!");
            setIsAdding(false);
            setNewModelId("");
            setNewModelLabel("");
            // Auto-select the new model? Maybe.
            setModel(newModel.value);
        } catch (error: any) {
            toast.error("Erro ao salvar modelo personalizado.");
            console.error(error);
        }
    };

    const handleDeleteCustomModel = async (value: string) => {
        if (!confirm("Remover este modelo personalizado?")) return;

        const updatedList = localCustomModels.filter(m => m.value !== value);
        setLocalCustomModels(updatedList);

        try {
            const res = await saveSetting("anotacoes_custom_models", JSON.stringify(updatedList), "Modelos LLM personalizados");
            if (res.error) throw new Error(res.error);
            toast.success("Modelo removido.");
            if (model === value) setModel("gemini-2.0-flash"); // Reset selection if deleted
        } catch (error: any) {
             toast.error("Erro ao remover modelo.");
        }
    };
    
    // Combine standard groups with custom group
    const allGroups = [
        ...MODEL_GROUPS,
        {
            provider: 'custom',
            label: 'Modelos Personalizados',
            models: localCustomModels
        }
    ];

    // Helper to find provider including custom
    const getProviderIncludingCustom = (val: string) => {
        // Check standard groups
        const standard = getProviderFromModel(val);
        if (standard !== 'gemini') return standard; // found in standard list (openrouter or gemini)
        
        // Check custom
        const custom = localCustomModels.find(m => m.value === val);
        if (custom) return custom.provider;
        
        return 'gemini'; // fallback
    };

    const handleSave = async () => {
        try {
            setSaving(true);

            setSaving(true);

            const provider = getProviderIncludingCustom(model);

            const res1 = await saveSetting("anotacoes_llm_provider", provider, "Provedor de LLM usado pelo Caderno Inteligente");
            if (res1.error) throw new Error(res1.error);

            const res2 = await saveSetting("anotacoes_llm_model", model, "Modelo de LLM usado pelo Caderno Inteligente");
            if (res2.error) throw new Error(res2.error);

            toast.success("Modelo de IA salvo com sucesso!");
        } catch (error: any) {
            console.error("Erro ao salvar:", error);
            toast.error(error.message || "Erro ao salvar configurações.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-lg border border-grey-light shadow-sm overflow-hidden">
            <div className="p-6 border-b border-grey-light flex justify-between items-center bg-zinc-50/50">
                <div className="flex items-center gap-2">
                    <BrainCircuit size={20} className="text-primary" />
                    <h3 className="font-semibold text-grey-darkest">Configurações de IA</h3>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {saving ? "Salvando..." : "Salvar"}
                </button>
            </div>

            <div className="p-6 max-w-4xl">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-grey-darker">
                        Modelo de IA:
                    </label>
                    <select
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full max-w-md p-2.5 border border-grey-light rounded-md focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-shadow text-grey-darkest bg-white"
                    >
                        {allGroups.map((group) => (
                            group.models.length > 0 && (
                            <optgroup key={group.label} label={group.label}>
                                {group.models.map((m) => (
                                    <option key={m.value} value={m.value}>
                                        {m.label}
                                    </option>
                                ))}
                            </optgroup>
                            )
                        ))}
                    </select>
                </div>

                {/* Custom Models Section */}
                <div className="mt-8 pt-6 border-t border-dashed border-grey-light">
                    <h4 className="text-sm font-semibold text-grey-darkest mb-4 flex items-center justify-between">
                        Modelos Personalizados
                        <button 
                            onClick={() => setIsAdding(!isAdding)}
                            className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded transition-colors"
                        >
                            {isAdding ? "Cancelar" : "+ Adicionar Novo"}
                        </button>
                    </h4>

                    {isAdding && (
                        <div className="bg-slate-50 p-4 rounded-md border border-slate-200 mb-4 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">ID do Modelo (ex: openai/gpt-4o)</label>
                                <input 
                                    type="text" 
                                    value={newModelId}
                                    onChange={(e) => setNewModelId(e.target.value)}
                                    className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-primary outline-none"
                                    placeholder="openai/gpt-4o"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Nome de Exibição</label>
                                <input 
                                    type="text" 
                                    value={newModelLabel}
                                    onChange={(e) => setNewModelLabel(e.target.value)}
                                    className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-primary outline-none"
                                    placeholder="GPT-4o (OpenRouter)"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Provedor</label>
                                <select 
                                    value={newModelProvider}
                                    onChange={(e) => setNewModelProvider(e.target.value)}
                                    className="w-full text-sm p-2 border border-slate-300 rounded focus:ring-1 focus:ring-primary outline-none bg-white"
                                >
                                    <option value="openrouter">OpenRouter</option>
                                    <option value="gemini">Google Gemini</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setIsAdding(false)}
                                    className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddCustomModel}
                                    className="px-3 py-1.5 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                >
                                    Salvar Modelo
                                </button>
                            </div>
                        </div>
                    )}

                    {localCustomModels.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">Nenhum modelo personalizado adicionado.</p>
                    ) : (
                        <div className="space-y-2">
                             {localCustomModels.map(m => (
                                 <div key={m.value} className="flex items-center justify-between bg-slate-50 p-2 rounded border border-slate-100 text-sm">
                                     <div>
                                         <span className="font-medium text-slate-700">{m.label}</span>
                                         <span className="text-xs text-slate-400 ml-2">({m.value})</span>
                                         <span className="text-[10px] uppercase bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded ml-2">{m.provider}</span>
                                     </div>
                                     <button
                                        onClick={() => handleDeleteCustomModel(m.value)}
                                        className="text-red-400 hover:text-red-600 p-1"
                                        title="Remover"
                                     >
                                         <Trash2 size={14} />
                                     </button>
                                 </div>
                             ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
