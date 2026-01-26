import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Check, Filter, Tag, Loader2, User, Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ProjectCalendar } from "@/components/ui/ProjectCalendar";

interface FilterDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentFilters: string[];
    currentDateRange?: { start: string, end: string };
    onApplyFilters: (filters: string[], dateRange: { start: string, end: string }) => void;
}

interface Marker {
    id: string;
    name: string;
    type: "PERSON" | "TOPIC";
}

export function FilterDialog({ open, onOpenChange, currentFilters, currentDateRange, onApplyFilters }: FilterDialogProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [markers, setMarkers] = useState<Marker[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Sync state when modal opens
    useEffect(() => {
        if (open) {
            setSelectedIds(currentFilters);
            setStartDate(currentDateRange?.start || "");
            setEndDate(currentDateRange?.end || "");
            fetchMarkers();
        }
    }, [open, currentFilters, currentDateRange]);

    const fetchMarkers = async () => {
        // If we already have markers, don't re-fetch unless force invalidation (not needed here)
        if (markers.length > 0) return;

        setIsLoading(true);
        const { data, error } = await supabase
            .schema('app_anotacoes')
            .from('markers')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) {
            console.error("Error fetching markers for filter:", error);
            toast.error("Erro ao carregar filtros.");
        } else {
            setMarkers(data || []);
        }
        setIsLoading(false);
    };

    const toggleSelection = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleApply = () => {
        onApplyFilters(selectedIds, { start: startDate, end: endDate });
        onOpenChange(false);
    };

    // Helper to format date for display or return Date object
    const formatDateDisplay = (isoString?: string) => {
        if (!isoString) return "dd/mm/aaaa";
        // Convert YYYY-MM-DD to Date to solve timezone issues, better treat as UTC or local noon
        const [year, month, day] = isoString.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('pt-BR');
    };

    const getDateObject = (isoString?: string) => {
        if (!isoString) return undefined;
        const [year, month, day] = isoString.split('-').map(Number);
        return new Date(year, month - 1, day);
    };

    const handleDateSelect = (date: Date, type: 'start' | 'end') => {
        // Store as YYYY-MM-DD string to match existing logic
        // Use local time components to avoid timezone shifts
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateString = `${year}-${month}-${day}`;

        if (type === 'start') setStartDate(dateString);
        else setEndDate(dateString);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl bg-slate-50 border-none shadow-2xl p-0 overflow-hidden">
                <div className="p-8 pb-0">
                    <DialogHeader className="mb-6">
                        <DialogTitle className="text-2xl font-bold text-slate-800 text-center flex items-center justify-center gap-3">
                            <Filter className="w-6 h-6 text-emerald-600" />
                            Filtrar Anotações
                        </DialogTitle>
                    </DialogHeader>

                    <div className="max-h-[60vh] overflow-y-auto p-2 min-h-[200px] space-y-8">

                        {/* Date Range Section */}
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm relative overflow-visible">
                            <div className="flex items-center gap-2 mb-4 text-emerald-700 font-bold uppercase tracking-wider text-xs">
                                <CalendarIcon size={14} />
                                Período
                            </div>
                            <div className="grid grid-cols-2 gap-6 relative z-10">
                                {/* Start Date */}
                                <div className="space-y-2 flex flex-col">
                                    <Label className="text-xs text-slate-500">De</Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button 
                                                variant="outline" 
                                                className={cn(
                                                    "w-full justify-between text-left font-normal border-slate-200 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 transition-colors h-11",
                                                    !startDate && "text-slate-400"
                                                )}
                                            >
                                                {formatDateDisplay(startDate)}
                                                <div className="flex items-center gap-2">
                                                    {startDate && (
                                                        <div 
                                                            role="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setStartDate("");
                                                            }}
                                                            className="hover:text-red-500 p-1"
                                                        >
                                                            <X size={14} />
                                                        </div>
                                                    )}
                                                    <CalendarIcon className="h-4 w-4 opacity-50" />
                                                </div>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="p-0 border-none shadow-xl bg-transparent" align="start">
                                            <ProjectCalendar 
                                                selectedDate={getDateObject(startDate)}
                                                onDateSelect={(date) => handleDateSelect(date, 'start')}
                                            />
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                {/* End Date */}
                                <div className="space-y-2 flex flex-col">
                                    <Label className="text-xs text-slate-500">Até</Label>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button 
                                                variant="outline" 
                                                className={cn(
                                                    "w-full justify-between text-left font-normal border-slate-200 bg-slate-50 hover:bg-slate-100 hover:text-slate-900 transition-colors h-11",
                                                    !endDate && "text-slate-400"
                                                )}
                                            >
                                                {formatDateDisplay(endDate)}
                                                <div className="flex items-center gap-2">
                                                    {endDate && (
                                                        <div 
                                                            role="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEndDate("");
                                                            }}
                                                            className="hover:text-red-500 p-1"
                                                        >
                                                            <X size={14} />
                                                        </div>
                                                    )}
                                                    <CalendarIcon className="h-4 w-4 opacity-50" />
                                                </div>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="p-0 border-none shadow-xl bg-transparent" align="start">
                                            <ProjectCalendar 
                                                selectedDate={getDateObject(endDate)}
                                                onDateSelect={(date) => handleDateSelect(date, 'end')}
                                            />
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>

                        {/* Markers Section */}
                        <div>
                            <div className="flex items-center gap-2 mb-4 text-emerald-700 font-bold uppercase tracking-wider text-xs">
                                <Tag size={14} />
                                Marcadores
                            </div>

                            {isLoading && (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                                </div>
                            )}

                            {!isLoading && markers.length === 0 && (
                                <div className="text-center py-10 text-slate-400">
                                    Nenhum marcador disponível.
                                </div>
                            )}

                            {!isLoading && markers.length > 0 && (
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

                                    {markers.map((marker) => {
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
                            )}
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
                        Aplicar Filtros
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
