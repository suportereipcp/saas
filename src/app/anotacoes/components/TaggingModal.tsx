import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { COLLABORATORS, TOPICS } from "../mock-data";
import { useState, useEffect } from "react";
import { Check, Loader2, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface TaggingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialSelectedTags?: string[]; // Names of tags
}

export function TaggingModal({ open, onOpenChange, initialSelectedTags = [] }: TaggingModalProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const router = useRouter();

    // Map initial tag names to IDs when opening
    useEffect(() => {
        if (open && initialSelectedTags.length > 0) {
            const ids: string[] = [];

            initialSelectedTags.forEach(tagName => {
                const collab = COLLABORATORS.find(c => c.name === tagName);
                if (collab) ids.push(collab.id);

                const topic = TOPICS.find(t => t.name === tagName);
                if (topic) ids.push(topic.id);
            });

            setSelectedIds(ids);
        } else if (open && initialSelectedTags.length === 0) {
            setSelectedIds([]);
        }
    }, [open, initialSelectedTags]);


    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleConfirm = async () => {
        if (selectedIds.length === 0) {
            toast.error("Por favor, selecione pelo menos uma pessoa ou tópico.");
            return;
        }

        setIsSaving(true);

        // Simulating AI Processing
        await new Promise(resolve => setTimeout(resolve, 1500));

        toast.success("Nota arquivada e indexada pela IA!");
        setIsSaving(false);
        onOpenChange(false);
        setSelectedIds([]);
        router.push('/anotacoes/memory'); // Redirect to chat to see the "result"
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl bg-slate-50 border-none shadow-2xl p-0 overflow-hidden">
                <div className="p-8 pb-0">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-3xl font-bold text-slate-800 text-center">
                            Identificar Contexto
                        </DialogTitle>
                        <p className="text-center text-slate-500 text-lg">
                            Quem participou e qual o assunto?
                        </p>
                    </DialogHeader>

                    <div className="max-h-[50vh] overflow-y-auto p-2 space-y-6">

                        {/* SECTION: PEOPLE */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 pl-1">Pessoas</h3>
                            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                {COLLABORATORS.map((user) => {
                                    const isSelected = selectedIds.includes(user.id);
                                    return (
                                        <button
                                            key={user.id}
                                            onClick={() => toggleSelection(user.id)}
                                            className={cn(
                                                "relative flex flex-col items-center p-2 rounded-xl border-2 transition-all duration-200 outline-none",
                                                isSelected
                                                    ? "bg-emerald-50 border-emerald-500 scale-[1.02] shadow-md"
                                                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                            )}
                                        >
                                            <div className="relative mb-1">
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-emerald-500">
                                                    <Tag size={16} />
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute -right-1 -bottom-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-sm">
                                                        <Check size={10} strokeWidth={4} />
                                                    </div>
                                                )}
                                            </div>
                                            <span className={cn(
                                                "text-[10px] font-bold text-center leading-tight w-full truncate",
                                                isSelected ? "text-emerald-700" : "text-slate-700"
                                            )}>
                                                {user.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* SECTION: TOPICS */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 pl-1 mt-6">Tópicos e Projetos</h3>
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                {TOPICS.map((topic) => {
                                    const isSelected = selectedIds.includes(topic.id);
                                    return (
                                        <button
                                            key={topic.id}
                                            onClick={() => toggleSelection(topic.id)}
                                            className={cn(
                                                "relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 outline-none text-left",
                                                isSelected
                                                    ? "bg-emerald-50 border-emerald-500 scale-[1.02] shadow-md"
                                                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                            )}
                                        >
                                            <div className={cn(
                                                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                                isSelected ? "bg-emerald-200 text-emerald-700" : "bg-slate-100 text-emerald-500"
                                            )}>
                                                <Tag size={20} />
                                            </div>

                                            <span className={cn(
                                                "text-sm font-bold leading-tight",
                                                isSelected ? "text-emerald-700" : "text-slate-700"
                                            )}>
                                                {topic.name}
                                            </span>
                                            {isSelected && (
                                                <div className="absolute right-2 top-2 text-emerald-500">
                                                    <Check size={14} strokeWidth={4} />
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                    </div>
                </div>

                <div className="p-6 bg-slate-100 mt-6 flex justify-end gap-3">
                    <Button
                        variant="ghost"
                        size="lg"
                        onClick={() => onOpenChange(false)}
                        className="text-slate-500 hover:text-slate-700 text-lg"
                    >
                        Cancelar
                    </Button>
                    <Button
                        size="lg"
                        onClick={handleConfirm}
                        disabled={isSaving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 text-lg font-bold shadow-lg shadow-emerald-600/20 disabled:opacity-70"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Processando...
                            </>
                        ) : (
                            "Finalizar e Arquivar"
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog >
    );
}
