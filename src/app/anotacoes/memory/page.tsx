'use client';

import { useState } from "react";
import Link from "next/link";
import { Search, Calendar, PenLine, Filter, Trash2 } from "lucide-react";
import { MOCK_CHAT_HISTORY, COLLABORATORS, TOPICS } from "../mock-data";
import { Button } from "@/components/ui/button";
import { NoteDetailModal } from "../components/NoteDetailModal";
import { FilterDialog } from "../components/FilterDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function MemoryPage() {
    const [selectedFilterIds, setSelectedFilterIds] = useState<string[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [viewingNote, setViewingNote] = useState<typeof MOCK_CHAT_HISTORY[0] | null>(null);

    const filteredHistory = selectedFilterIds.length > 0
        ? MOCK_CHAT_HISTORY.filter(msg => {
            // Check if ANY of the message tags match ANY of the selected filters
            return selectedFilterIds.some(filterId => {
                const userFilter = COLLABORATORS.find(c => c.id === filterId);
                if (userFilter) {
                    return msg.tags.some(tag => tag.includes(userFilter.name.split(' ')[0]));
                }
                const topicFilter = TOPICS.find(t => t.id === filterId);
                if (topicFilter) {
                    return msg.tags.includes(topicFilter.name);
                }
                return false;
            });
        })
        : MOCK_CHAT_HISTORY;

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
                onOpenChange={(open) => !open && setViewingNote(null)}
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
                                const entity = [...COLLABORATORS, ...TOPICS].find(e => e.id === id);
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


                {filteredHistory.map((msg) => (
                    <div key={msg.id} className="flex flex-col gap-2 max-w-3xl mx-auto">
                        <div className="flex items-center gap-3 text-xs font-bold text-slate-400 uppercase tracking-widest pl-4">
                            <Calendar size={12} /> {msg.date}
                        </div>
                        <div
                            onClick={() => setViewingNote(msg)}
                            className="bg-white p-6 rounded-2xl rounded-tl-none shadow-sm border border-slate-200 hover:shadow-md transition-shadow group relative cursor-pointer"
                        >
                            {/* Action Buttons */}
                            <div className="absolute top-4 right-4 z-10 flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                                <Link href={`/anotacoes?noteId=${msg.id}`}>
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
                                        toast.info("Exclusão será implementada em breve");
                                    }}
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>

                            <p className="text-lg text-slate-800 leading-relaxed line-clamp-4">
                                {msg.content}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                {msg.tags.map(tag => (
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
                        <p>Nenhuma memória encontrada para este filtro.</p>
                        <Button variant="link" onClick={() => setSelectedFilterIds([])}>
                            Limpar filtros
                        </Button>
                    </div>
                )}
            </div>


        </div >
    );
}
