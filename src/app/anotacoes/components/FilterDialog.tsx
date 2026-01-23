import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { COLLABORATORS, TOPICS } from "../mock-data";
import { useState, useEffect } from "react";
import { Check, Filter, Tag } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilterDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentFilters: string[];
    onApplyFilters: (filters: string[]) => void;
}

export function FilterDialog({ open, onOpenChange, currentFilters, onApplyFilters }: FilterDialogProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // Merge and sort all markers alphabetically
    const ALL_MARKERS = [
        ...COLLABORATORS.map(c => ({ ...c, type: 'person' })),
        ...TOPICS.map(t => ({ ...t, type: 'topic' }))
    ].sort((a, b) => a.name.localeCompare(b.name));

    // Sync state when modal opens
    useEffect(() => {
        if (open) {
            setSelectedIds(currentFilters);
        }
    }, [open, currentFilters]);

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleApply = () => {
        onApplyFilters(selectedIds);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl bg-slate-50 border-none shadow-2xl p-0 overflow-hidden">
                <div className="p-8 pb-0">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-bold text-slate-800 text-center flex items-center justify-center gap-3">
                            <Filter className="w-6 h-6 text-emerald-600" />
                            Filtrar por Marcadores
                        </DialogTitle>
                    </DialogHeader>

                    <div className="max-h-[50vh] overflow-y-auto p-2">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {/* TODOS Option */}
                            <button
                                onClick={() => setSelectedIds([])}
                                className={cn(
                                    "relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 outline-none text-left",
                                    selectedIds.length === 0
                                        ? "bg-emerald-50 border-emerald-500 scale-[1.02] shadow-md"
                                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                    selectedIds.length === 0 ? "bg-emerald-200 text-emerald-700" : "bg-slate-100 text-emerald-500"
                                )}>
                                    <Check size={18} className={selectedIds.length === 0 ? "opacity-100" : "opacity-0"} />
                                </div>

                                <span className={cn(
                                    "text-xs font-bold leading-tight",
                                    selectedIds.length === 0 ? "text-emerald-700" : "text-slate-700"
                                )}>
                                    Todos
                                </span>
                                {selectedIds.length === 0 && (
                                    <div className="absolute -right-1 -top-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-sm">
                                        <Check size={10} strokeWidth={4} />
                                    </div>
                                )}
                            </button>

                            {ALL_MARKERS.map((marker) => {
                                const isSelected = selectedIds.includes(marker.id);
                                return (
                                    <button
                                        key={marker.id}
                                        onClick={() => toggleSelection(marker.id)}
                                        className={cn(
                                            "relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all duration-200 outline-none text-left",
                                            isSelected
                                                ? "bg-emerald-50 border-emerald-500 scale-[1.02] shadow-md"
                                                : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                            isSelected ? "bg-emerald-200 text-emerald-700" : "bg-slate-100 text-emerald-500"
                                        )}>
                                            <Tag size={18} />
                                        </div>

                                        <span className={cn(
                                            "text-xs font-bold leading-tight line-clamp-2",
                                            isSelected ? "text-emerald-700" : "text-slate-700"
                                        )}>
                                            {marker.name}
                                        </span>
                                        {isSelected && (
                                            <div className="absolute -right-1 -top-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-sm">
                                                <Check size={10} strokeWidth={4} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-100 mt-6 flex justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        className="text-slate-500 hover:text-slate-700"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleApply}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 font-bold shadow-lg shadow-emerald-600/20"
                    >
                        Filtrar Anotações
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
