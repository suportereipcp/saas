import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Check, Loader2, Tag, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TaggingModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    initialSelectedTags?: string[];
    initialTranscription?: string;
    onConfirm: (tags: string[], transcription: string) => Promise<void>;
    onAutoTranscribe: () => Promise<string>;
}

interface Marker {
    id: string;
    name: string;
    type: "PERSON" | "TOPIC";
    avatar_url?: string | null;
}

export function TaggingModal({ open, onOpenChange, initialSelectedTags = [], initialTranscription = "", onConfirm, onAutoTranscribe }: TaggingModalProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [transcription, setTranscription] = useState(initialTranscription);
    const [isSaving, setIsSaving] = useState(false);
    const [markers, setMarkers] = useState<Marker[]>([]);
    const [isLoadingMarkers, setIsLoadingMarkers] = useState(false);

    // New Loading State (Starts true if we need to transcribe)


    // Fetch Markers on Mount (or when Open)
    useEffect(() => {
        if (open && markers.length === 0) {
            const fetchMarkers = async () => {
                setIsLoadingMarkers(true);
                const { data, error } = await supabase
                    .schema('app_anotacoes')
                    .from('markers')
                    .select('*')
                    .eq('is_active', true)
                    .order('name');

                if (error) {
                    console.error("Error fetching markers:", error);
                    toast.error("Erro ao carregar marcadores.");
                } else {
                    setMarkers(data || []);
                }
                setIsLoadingMarkers(false);
            };
            fetchMarkers();
        }
    }, [open, markers.length]);

    // Map initial tag names to IDs
    useEffect(() => {
        if (open && initialSelectedTags.length > 0 && markers.length > 0) {
            const ids: string[] = [];
            initialSelectedTags.forEach(tagName => {
                const marker = markers.find(m => m.name === tagName);
                if (marker) ids.push(marker.id);
            });
            setSelectedIds(ids);
        } else if (open && initialSelectedTags.length === 0) {
            setSelectedIds([]);
        }

        // Reset or Set transcription on open
        if (open) {
            setTranscription(initialTranscription);
        }
    }, [open, initialSelectedTags, markers, initialTranscription]);

    // AUTO TRANSCRIPTION IS NOW HANDLED IN BACKGROUND AFTER SAVE
    // Modal opens instantly without waiting for LLM analysis

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleConfirm = async () => {
        // Validation: At least one tag OR some text content
        if (selectedIds.length === 0 && !transcription.trim()) {
            toast.error("Adicione marcadores ou uma transcrição para salvar.");
            return;
        }

        setIsSaving(true);
        try {
            // Convert IDs back to Names for storage
            const tagsToSave: string[] = [];
            selectedIds.forEach(id => {
                const marker = markers.find(m => m.id === id);
                if (marker) tagsToSave.push(marker.name);
            });

            await onConfirm(tagsToSave, transcription);
            onOpenChange(false);
            setSelectedIds([]);
            setTranscription("");
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar nota.");
        } finally {
            setIsSaving(false);
        }
    };

    const people = markers.filter(m => m.type === 'PERSON');
    const topics = markers.filter(m => m.type === 'TOPIC');

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={cn(
                "bg-slate-50 border-none shadow-2xl p-0 overflow-hidden flex flex-col transition-all duration-500",
                "max-w-4xl max-h-[90vh]"
            )}>

                    <>
                        <div className="p-8 pb-0 shrink-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <DialogHeader className="mb-6">
                                <DialogTitle className="text-3xl font-bold text-slate-800 text-center">
                                    Salvar Nota
                                </DialogTitle>
                                <DialogDescription className="text-center text-slate-500 text-lg">
                                    Revise a transcrição e adicione marcadores.
                                </DialogDescription>
                            </DialogHeader>
                        </div>

                        <div className="flex-1 overflow-y-auto px-8 min-h-0 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
                            {/* Transcription Section */}
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2 text-emerald-700 font-bold uppercase tracking-wider text-xs">
                                        <FileText size={14} />
                                        Resumo / Transcrição
                                    </div>
                                </div>

                                <Textarea
                                    placeholder="O que foi anotado? Digite um resumo ou a transcrição aqui..."
                                    className="min-h-[120px] bg-white border-slate-200 focus:border-emerald-500 text-base shadow-sm p-4 leading-relaxed"
                                    value={transcription}
                                    onChange={(e) => setTranscription(e.target.value)}
                                />
                                <p className="text-xs text-slate-400 mt-2 text-right">
                                    *Gerado automaticamente pelo Jarvis. Edite se necessário.
                                </p>
                            </div>

                            <div className="w-full h-px bg-slate-200 mb-8" />

                            {/* Markers Section */}
                            <div className="space-y-6 pb-6">
                                <div className="flex items-center gap-2 mb-1 text-emerald-700 font-bold uppercase tracking-wider text-xs">
                                    <Tag size={14} />
                                    Marcadores
                                </div>

                                {isLoadingMarkers && (
                                    <div className="flex justify-center py-10">
                                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                    </div>
                                )}

                                {!isLoadingMarkers && markers.length === 0 && (
                                    <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                        Nenhum marcador disponível.
                                    </div>
                                )}

                                {/* SECTION: PEOPLE */}
                                {!isLoadingMarkers && people.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-slate-400 mb-3 pl-1">Pessoas Envolvidas</h3>
                                        <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                            {people.map((user) => {
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
                                                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-emerald-500 overflow-hidden">
                                                                {user.avatar_url ? (
                                                                    <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <Tag size={16} />
                                                                )}
                                                            </div>
                                                            {isSelected && (
                                                                <div className="absolute -right-1 -bottom-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-sm">
                                                                    <Check size={10} strokeWidth={4} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <span className={cn(
                                                            "text-[10px] font-bold text-center leading-tight w-full truncate px-1",
                                                            isSelected ? "text-emerald-700" : "text-slate-700"
                                                        )}>
                                                            {user.name}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* SECTION: TOPICS */}
                                {!isLoadingMarkers && topics.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-slate-400 mb-3 pl-1 mt-4">Tópicos e Projetos</h3>
                                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                            {topics.map((topic) => {
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
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-slate-100 mt-auto flex justify-end gap-3 shrink-0 animate-in slide-in-from-bottom-2">
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
                                    "Salvar Nota"
                                )}
                            </Button>
                        </div>
                    </>
            </DialogContent>
        </Dialog >
    );
}
