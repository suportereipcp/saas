'use client';

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Calendar, PenLine, Filter, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NoteDetailModal } from "../components/NoteDetailModal";
import { FilterDialog } from "../components/FilterDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

export default function MemoryPage() {
    const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [viewingNote, setViewingNote] = useState<any | null>(null);
    const [notes, setNotes] = useState<any[]>([]);
    const [markers, setMarkers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);

        try {
            // Fetch Notes
            const notesReq = supabase
                .schema('app_anotacoes')
                .from('notes')
                .select('*')
                .order('updated_at', { ascending: false });

            // Fetch Markers
            const markersReq = supabase
                .schema('app_anotacoes')
                .from('markers')
                .select('*');

            const [notesRes, markersRes] = await Promise.all([notesReq, markersReq]);

            if (notesRes.error) throw new Error(`Notas: ${notesRes.error.message}`);
            setNotes(notesRes.data || []);

            if (markersRes.error) {
                console.warn("Markers warning:", markersRes.error.message);
                // Non-critical, just empty markers
                setMarkers([]);
            } else {
                setMarkers(markersRes.data || []);
            }

        } catch (error: any) {
            console.error("Fetch Error:", error);
            toast.error(`Erro: ${error.message || "Falha ao carregar dados"}`);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (id: string) => {
        try {
            const { error } = await supabase
                .schema('app_anotacoes')
                .from('notes')
                .delete()
                .eq('id', id);

            if (error) throw error;

            toast.success("Nota excluída.");
            setNotes(prev => prev.filter(n => n.id !== id));
        } catch (error: any) {
            toast.error("Erro ao excluir nota.");
            console.error(error);
        }
    };

    const filteredHistory = selectedFilterIds.length > 0
        ? notes.filter(note => {
            if (!note.tags) return false;
            // Check if ANY of the message tags match ANY of the selected filters
            return selectedFilterIds.some(filterId => {
                const marker = markers.find(m => m.id === filterId);
                if (marker) {
                    // Exact match preferable, but keeping "contains" for existing logic flexibility
                    return note.tags.some((tag: string) => tag === marker.name || (marker.type === 'PERSON' && tag.includes(marker.name)));
                }
                return false;
            });
        })
        : notes;

    return (
        <div className="flex flex-col h-full bg-slate-100">
            {/* Header / Filter Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm shrink-0 flex items-center justify-between">
                <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Search className="w-5 h-5 text-slate-400" />
                    Minhas Anotações
                </h1>

                <Button
                    onClick={() => setIsFilterOpen(true)}
                    className={cn(
                        "rounded-full w-10 h-10 p-0 shadow-sm border-2 transition-all",
                        selectedFilterIds.length > 0
                            ? "bg-emerald-100 border-emerald-500 text-emerald-600 hover:bg-emerald-200"
                            : "bg-white border-slate-200 text-emerald-600 hover:bg-slate-50 hover:border-slate-300"
                    )}
                    title="Filtrar Marcadores"
                >
                    <Filter size={20} />
                </Button>
            </div>

            <FilterDialog
                open={isFilterOpen}
                onOpenChange={setIsFilterOpen}
                currentFilters={selectedFilterIds}
                onApplyFilters={setSelectedFilterIds}
            />

            <NoteDetailModal
                note={viewingNote}
                open={!!viewingNote}
                onOpenChange={(open: boolean) => !open && setViewingNote(null)}
            />

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {selectedFilterIds.length > 0 && (
                    <div className="max-w-3xl mx-auto flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                            Filtros ativos:
                        </span>
                        <div className="flex flex-wrap gap-2">
                            {selectedFilterIds.map(id => {
                                const entity = markers.find(e => e.id === id);
                                if (!entity) return null;
                                return (
                                    <span key={id} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold border border-emerald-200">
                                        {entity.name}
                                    </span>
                                );
                            })}
                            <button
                                onClick={() => setSelectedFilterIds([])}
                                className="text-xs text-slate-400 hover:text-red-500 underline ml-2"
                            >
                                Limpar
                            </button>
                        </div>
                    </div>
                )}

                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                ) : (
                    <>
                        {filteredHistory.map((note) => (
                            <div key={note.id} className="flex flex-col gap-2 max-w-3xl mx-auto">
                                <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest pl-4">
                                    <Calendar size={12} /> {new Date(note.created_at).toLocaleString('pt-BR')}
                                </div>
                                <div
                                    onClick={() => setViewingNote(note)}
                                    className="bg-white p-6 rounded-2xl rounded-tl-none shadow-sm border border-slate-200 hover:shadow-md transition-shadow group relative cursor-pointer"
                                >
                                    {/* Action Buttons */}
                                    <div className="absolute top-4 right-4 z-10 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                                        <Link href={`/anotacoes?noteId=${note.id}`}>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600 bg-emerald-50 hover:text-emerald-700 hover:bg-emerald-100 rounded-full" title="Editar Manuscrito Original">
                                                <PenLine size={16} />
                                            </Button>
                                        </Link>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-8 w-8 text-red-500 bg-red-50 hover:text-red-700 hover:bg-red-100 rounded-full"
                                            title="Excluir Anotação"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm("Tem certeza que deseja excluir?")) {
                                                    handleDelete(note.id);
                                                }
                                            }}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>

                                    <h3 className="text-lg font-bold text-slate-800 mb-2">{note.title}</h3>

                                    {/* Transcription / Summary Display */}
                                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-3">
                                        {note.transcription ? (
                                            <p className="text-slate-600 text-sm leading-relaxed line-clamp-4 whitespace-pre-wrap font-medium">
                                                {note.transcription}
                                            </p>
                                        ) : (
                                            <p className="text-slate-400 text-xs italic">
                                                Sem transcrição ou resumo disponível.
                                            </p>
                                        )}
                                    </div>

                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {note.tags && note.tags.map((tag: string) => (
                                            <span key={tag} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-wide">
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredHistory.length === 0 && (
                            <div className="text-center py-20 opacity-50">
                                <p>Nenhuma memória encontrada.</p>
                                <Button variant="link" onClick={() => setSelectedFilterIds([])}>
                                    Limpar filtros
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div >
    );
}
