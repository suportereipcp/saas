import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { format, isSameDay, isWithinInterval, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ProjectRangeCalendarProps {
    date: DateRange | undefined;
    setDate: (date: DateRange | undefined) => void;
    className?: string;
}

export function ProjectRangeCalendar({ date, setDate, className }: ProjectRangeCalendarProps) {
    const [viewDate, setViewDate] = useState(date?.from || new Date());
    const [isOpen, setIsOpen] = useState(false);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const nextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleDateClick = (clickedDate: Date) => {
        const newDate = startOfDay(clickedDate);
        
        if (!date?.from || (date.from && date.to)) {
            // Start new selection
            setDate({ from: newDate, to: undefined });
        } else {
            // Complete selection
            if (newDate < date.from) {
                setDate({ from: newDate, to: date.from });
            } else {
                setDate({ from: date.from, to: newDate });
            }
            // Optional: Close popover on selection complete? Maybe keep open for adjustments.
        }
    };

    const isSelected = (d: Date) => {
        if (!date?.from) return false;
        if (date.to) {
            return isWithinInterval(d, { start: date.from, end: date.to });
        }
        return isSameDay(d, date.from);
    };

    const isSelectionStart = (d: Date) => date?.from && isSameDay(d, date.from);
    const isSelectionEnd = (d: Date) => date?.to && isSameDay(d, date.to);

    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    const isToday = (d: Date) => isSameDay(d, new Date());

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button
                    id="date"
                    variant={"outline"}
                    className={cn(
                        "w-[260px] justify-start text-left font-normal bg-white border-slate-200 hover:bg-slate-50 hover:text-slate-900",
                        !date && "text-muted-foreground",
                        className
                    )}
                >
                    <CalendarIcon className="mr-2 h-4 w-4 text-emerald-600" />
                    {date?.from ? (
                        date.to && !isSameDay(date.from, date.to) ? (
                            <>
                                {format(date.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                                {format(date.to, "dd/MM/yyyy", { locale: ptBR })}
                            </>
                        ) : (
                            format(date.from, "dd/MM/yyyy", { locale: ptBR })
                        )
                    ) : (
                        <span>Selecione o período</span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
                <div className="bg-white p-4 w-[320px] rounded-lg shadow-xl border border-slate-100">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-sm font-bold text-slate-800 capitalize">
                            {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </h2>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50" onClick={(e) => { e.preventDefault(); prevMonth(); }}>
                                <ChevronLeft size={16} />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50" onClick={(e) => { e.preventDefault(); nextMonth(); }}>
                                <ChevronRight size={16} />
                            </Button>
                        </div>
                    </div>

                    {/* Week Days */}
                    <div className="grid grid-cols-7 mb-2 text-center">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                            <div key={day} className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {blanks.map(i => <div key={`blank-${i}`} />)}
                        {days.map(day => {
                            const currentDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                            const selected = isSelected(currentDay);
                            const isStart = isSelectionStart(currentDay);
                            const isEnd = isSelectionEnd(currentDay);
                            const today = isToday(currentDay);
                            
                            // Style logic
                            let cellClass = "hover:bg-emerald-50 text-slate-700 bg-transparent"; // Default
                            if (selected) {
                                cellClass = "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"; // In range
                                if (isStart || isEnd) {
                                    cellClass = "bg-emerald-600 text-white shadow-md hover:bg-emerald-700"; // Start/End
                                }
                            }

                            return (
                                <button
                                    key={day}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        handleDateClick(currentDay);
                                    }}
                                    className={cn(
                                        "aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-all relative",
                                        cellClass,
                                        today && !selected && "ring-1 ring-emerald-500 ring-inset text-emerald-600 font-bold"
                                    )}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>
                    
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                setDate(undefined);
                            }}
                            className="text-xs font-medium text-slate-400 hover:text-red-500 flex items-center gap-1"
                        >
                            <X size={12} />
                            Limpar
                        </button>
                         <button 
                            onClick={(e) => {
                                e.preventDefault();
                                const today = startOfDay(new Date());
                                setDate({ from: today, to: today });
                                setViewDate(today);
                            }}
                            className="text-xs font-bold text-emerald-600 hover:text-emerald-700"
                        >
                            Hoje
                        </button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}
