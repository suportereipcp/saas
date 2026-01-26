import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProjectCalendarProps {
    /** The currently selected date */
    selectedDate?: Date;
    /** Callback when a date is selected */
    onDateSelect: (date: Date) => void;
    /** Optional class name */
    className?: string;
}

export function ProjectCalendar({ selectedDate, onDateSelect, className }: ProjectCalendarProps) {
    // Internal state for the view (which month is being displayed)
    // Default to selectedDate or today
    const [viewDate, setViewDate] = useState(selectedDate || new Date());

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

    const isSameDate = (d1: Date, d2?: Date) => {
        if (!d2) return false;
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const isToday = (d: Date) => {
        const today = new Date();
        return isSameDate(d, today);
    };

    const daysInMonth = getDaysInMonth(viewDate);
    const firstDay = getFirstDayOfMonth(viewDate);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    return (
        <div className={cn("bg-white p-4 w-[300px]", className)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-slate-800 capitalize">
                    {viewDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                </h2>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.preventDefault(); prevMonth(); }}>
                        <ChevronLeft size={16} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.preventDefault(); nextMonth(); }}>
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
                    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                    const isSelected = isSameDate(date, selectedDate);
                    const today = isToday(date);
                    
                    return (
                        <button
                            key={day}
                            onClick={(e) => {
                                e.preventDefault();
                                onDateSelect(date);
                            }}
                            className={cn(
                                "aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-all relative",
                                isSelected 
                                    ? "bg-emerald-600 text-white shadow-md" 
                                    : "hover:bg-emerald-50 text-slate-700 bg-transparent",
                                today && !isSelected && "ring-1 ring-emerald-500 ring-inset text-emerald-600 font-bold"
                            )}
                        >
                            {day}
                        </button>
                    );
                })}
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between">
                 <button 
                    onClick={(e) => {
                        e.preventDefault();
                        onDateSelect(new Date()); // Select Today
                    }}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                >
                    Hoje
                </button>
            </div>
        </div>
    );
}
