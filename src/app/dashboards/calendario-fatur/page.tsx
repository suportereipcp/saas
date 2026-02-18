"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Save, Calendar as CalendarIcon, CheckCircle2, XCircle, Clock3, Check } from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";

export default function CalendarioPage() {
    const [currentDate, setCurrentDate] = useState(new Date());

    // Arrays of date strings "yyyy-MM-dd"
    const [holidays, setHolidays] = useState<string[]>([]);         // Explicitly OFF
    const [customWorkDays, setCustomWorkDays] = useState<string[]>([]); // Explicitly FULL WORK
    const [halfDays, setHalfDays] = useState<string[]>([]);         // Explicitly HALF WORK

    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [comments, setComments] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);

    // Generate days for the current view
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

    // Load Data
    useEffect(() => {
        loadCalendar();
    }, []);

    const loadCalendar = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .schema('dashboards_pcp')
                .from('calendario_fatur')
                .select('*');

            if (error) throw error;

            const dbHolidays: string[] = [];
            const dbCustomWork: string[] = [];
            const dbHalf: string[] = [];
            const dbComments: Record<string, string> = {};

            data?.forEach((row: any) => {
                if (row.type === 'feriado') dbHolidays.push(row.date);
                if (row.type === 'dia_util') dbCustomWork.push(row.date);
                if (row.type === 'meio_dia') dbHalf.push(row.date);
                if (row.description) dbComments[row.date] = row.description;
            });

            setHolidays(dbHolidays);
            setCustomWorkDays(dbCustomWork);
            setHalfDays(dbHalf);
            setComments(dbComments);

        } catch (error: any) {
            console.error("Erro ao carregar calendário:", error);
        } finally {
            setLoading(false);
        }
    };

    const saveChanges = async () => {
        try {
            setLoading(true);
            const records: any[] = [];

            // Collect all unique dates involved
            const allDates = new Set([
                ...holidays,
                ...customWorkDays,
                ...halfDays,
                ...Object.keys(comments)
            ]);

            allDates.forEach(date => {
                let status = null;
                if (holidays.includes(date)) status = 'off';
                else if (customWorkDays.includes(date)) status = 'work';
                else if (halfDays.includes(date)) status = 'half';

                const obs = comments[date] || null;

                let dbType = null;
                if (status === 'off') dbType = 'feriado';
                if (status === 'work') dbType = 'dia_util';
                if (status === 'half') dbType = 'meio_dia';

                if (!dbType && obs) {
                    const d = new Date(date + 'T12:00:00');
                    dbType = isWeekend(d) ? 'feriado' : 'dia_util';
                }

                if (dbType) {
                    records.push({ date: date, type: dbType, description: obs });
                }
            });

            // Strategy: Use RPC function for atomic save (Delete + Insert)
            const { error: rpcError } = await supabase.rpc('save_calendar_fatur', {
                payload: records
            });

            if (rpcError) throw rpcError;

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err: any) {
            console.error("Erro ao salvar:", JSON.stringify(err, null, 2), err);
            alert("Erro ao salvar calendário: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDayClick = (day: Date) => {
        setSelectedDate(day);
    };

    // Helper to determine the effective status of a day
    // Returns: 'work' | 'half' | 'off'
    const getDayType = (dateStr: string, day: Date) => {
        // 1. Explicit Overrides
        if (holidays.includes(dateStr)) return 'off';
        if (halfDays.includes(dateStr)) return 'half';
        if (customWorkDays.includes(dateStr)) return 'work';

        // 2. Default Weekend Logic
        if (isWeekend(day)) return 'off';

        // 3. Default Weekday Logic
        return 'work';
    };

    const setStatus = (type: 'work' | 'half' | 'off') => {
        if (!selectedDate) return;
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const isWknd = isWeekend(selectedDate);

        // Clear all explicit states first to reset to "default" foundation
        const clearAll = () => {
            setHolidays(prev => prev.filter(d => d !== dateStr));
            setCustomWorkDays(prev => prev.filter(d => d !== dateStr));
            setHalfDays(prev => prev.filter(d => d !== dateStr));
        };

        clearAll();

        // Apply new state ONLY if it differs from the default behavior
        if (isWknd) {
            // Default is OFF
            if (type === 'work') setCustomWorkDays(prev => [...prev, dateStr]);
            if (type === 'half') setHalfDays(prev => [...prev, dateStr]);
            // if type === 'off', do nothing (it's already default)
        } else {
            // Default is WORK
            if (type === 'off') setHolidays(prev => [...prev, dateStr]);
            if (type === 'half') setHalfDays(prev => [...prev, dateStr]);
            // if type === 'work', do nothing (it's already default)
        }
    };

    const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedDate) return;
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        setComments(prev => ({ ...prev, [dateStr]: e.target.value }));
    };

    const getDayInfo = (day: Date) => {
        const dateStr = format(day, "yyyy-MM-dd");
        const type = getDayType(dateStr, day);
        const comment = comments[dateStr] || "";
        const isWknd = isWeekend(day);

        // Determine if it's an exception to the rule (for styling)
        let isException = false;
        if (isWknd && type !== 'off') isException = true; // Weekend working
        if (!isWknd && type !== 'work') isException = true; // Weekday off or half

        return { type, comment, isException, isWknd };
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    if (loading) {
        return <div className="flex items-center justify-center h-full text-muted-foreground">Carregando calendário...</div>;
    }

    return (
        <div className="flex flex-col h-full w-full p-0 gap-4 font-sans text-foreground overflow-hidden relative">

            {/* Success Toast */}
            {showSuccess && (
                <div className="absolute top-4 right-4 z-50 bg-[#34d399] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <Check className="w-6 h-6" />
                    <span className="font-bold text-lg">Salvo com sucesso!</span>
                </div>
            )}

            {/* Header Compact */}
            <div className="flex items-center justify-between bg-card p-3 rounded-2xl border border-border backdrop-blur-md shadow-lg shrink-0">

                {/* Calendar Controls */}
                <div className="flex items-center justify-center gap-4">
                    <button onClick={prevMonth} className="p-1 hover:bg-muted rounded-full transition-colors"><ChevronLeft className="w-6 h-6 text-foreground" /></button>
                    <div className="text-2xl font-bold uppercase tracking-widest min-w-[200px] text-center text-foreground">
                        {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                    </div>
                    <button onClick={nextMonth} className="p-1 hover:bg-muted rounded-full transition-colors"><ChevronRight className="w-6 h-6 text-foreground" /></button>
                </div>
                <button
                    onClick={saveChanges}
                    className="flex items-center gap-2 bg-[#34d399] hover:bg-[#2dba87] text-white px-4 py-2 rounded-xl font-bold transition-all shadow-lg hover:shadow-[#34d399]/30 active:scale-95"
                >
                    <Save className="w-4 h-4" />
                    Salvar
                </button>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-500/80 border border-green-500"></div>
                    <span className="text-xs font-semibold text-muted-foreground">Dia Útil</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-amber-500/80 border border-amber-400"></div>
                    <span className="text-xs font-semibold text-muted-foreground">Meio Período</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-muted/80 border border-border dashed border-2"></div>
                    <span className="text-xs font-semibold text-muted-foreground">Folga / Fim de Semana</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-destructive/50 border border-destructive"></div>
                    <span className="text-xs font-semibold text-muted-foreground">Feriado</span>
                </div>
            </div>

            {/* Grid */}
            <div className="flex-1 bg-card/30 backdrop-blur rounded-2xl p-4 border border-border shadow-inner flex flex-col min-h-0">
                <div className="grid grid-cols-7 gap-2 h-full">
                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
                        <div key={day} className="text-center font-bold text-muted-foreground uppercase tracking-widest text-sm h-6">{day}</div>
                    ))}

                    {/* Padding for start of month */}
                    {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} className="opacity-0"></div>
                    ))}

                    {/* Days */}
                    {calendarDays.map(day => {
                        const { type, comment, isException, isWknd } = getDayInfo(day);

                        let bgClass = "bg-muted/40 hover:bg-muted/60 border-border";
                        let textClass = "text-muted-foreground";

                        if (type === 'work') {
                            if (isWknd) { // Extra Day
                                bgClass = "bg-blue-500/10 hover:bg-blue-500/20 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]";
                                textClass = "text-blue-600 dark:text-blue-400";
                            } else { // Normal Work Day
                                bgClass = "bg-green-500/10 hover:bg-green-500/20 border-green-500/30";
                                textClass = "text-green-700 dark:text-green-400";
                            }
                        } else if (type === 'half') {
                            bgClass = "bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30";
                            textClass = "text-amber-700 dark:text-amber-400";
                        } else { // Off
                            if (!isWknd) { // Holiday on weekday
                                bgClass = "bg-destructive/10 hover:bg-destructive/20 border-destructive/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]";
                                textClass = "text-destructive";
                            } else { // Weekend
                                bgClass = "bg-muted/40 border-border border-dashed opacity-60";
                                textClass = "text-muted-foreground";
                            }
                        }

                        return (
                            <button
                                key={day.toString()}
                                onClick={() => handleDayClick(day)}
                                className={`relative rounded-lg border flex flex-col items-start justify-between p-2 transition-all duration-200 active:scale-95 group ${bgClass} overflow-hidden`}
                            >
                                <div className="flex justify-between w-full z-10">
                                    <span className={`text-xl 2xl:text-2xl font-bold ${textClass}`}>{format(day, "d")}</span>
                                    {comment && <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_5px_currentColor]"></div>}
                                </div>

                                {comment ? (
                                    <span className="text-[10px] bg-background/80 px-1 rounded text-foreground truncate w-full text-left mt-auto z-10">{comment}</span>
                                ) : (
                                    <span className={`text-[9px] uppercase font-bold tracking-wider ${textClass} opacity-70 truncate w-full text-left mt-auto`}>
                                        {type === 'work' ? (isWknd ? "Extra" : "Útil") : (type === 'half' ? "Meio Per." : (isWknd ? "Folga" : "Feriado"))}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Modal for Edit */}
            {selectedDate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-card border border-border p-6 rounded-2xl shadow-2xl w-full max-w-md flex flex-col gap-6 scale-100">
                        <div className="flex justify-between items-center border-b border-border pb-4">
                            <h3 className="text-2xl font-bold text-foreground flex items-center gap-2">
                                <CalendarIcon className="w-6 h-6 text-primary" />
                                {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                            </h3>
                            <button onClick={() => setSelectedDate(null)} className="text-muted-foreground hover:text-foreground transition-colors"><XCircle className="w-8 h-8" /></button>
                        </div>

                        <div className="flex flex-col gap-3">
                            <label className="text-sm text-muted-foreground font-bold uppercase tracking-wider">Definir Status</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setStatus('work')}
                                    className={`p-3 rounded-xl font-bold text-sm transition-all border-2 flex flex-col items-center gap-2 ${getDayType(format(selectedDate, "yyyy-MM-dd"), selectedDate) === 'work'
                                        ? "bg-green-500/20 border-green-500 text-green-700 dark:text-green-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                        : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                                        }`}
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    Dia Completo
                                </button>

                                <button
                                    onClick={() => setStatus('half')}
                                    className={`p-3 rounded-xl font-bold text-sm transition-all border-2 flex flex-col items-center gap-2 ${getDayType(format(selectedDate, "yyyy-MM-dd"), selectedDate) === 'half'
                                        ? "bg-amber-500/20 border-amber-500 text-amber-700 dark:text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                                        : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                                        }`}
                                >
                                    <Clock3 className="w-5 h-5" />
                                    Meio Período
                                </button>

                                <button
                                    onClick={() => setStatus('off')}
                                    className={`p-3 rounded-xl font-bold text-sm transition-all border-2 flex flex-col items-center gap-2 ${getDayType(format(selectedDate, "yyyy-MM-dd"), selectedDate) === 'off'
                                        ? "bg-destructive/20 border-destructive text-destructive shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                                        : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                                        }`}
                                >
                                    <XCircle className="w-5 h-5" />
                                    Folga / Off
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <label className="text-sm text-muted-foreground font-bold uppercase tracking-wider">Comentário (Opcional)</label>
                            <input
                                type="text"
                                value={comments[format(selectedDate, "yyyy-MM-dd")] || ""}
                                onChange={handleCommentChange}
                                placeholder="Ex: Manutenção, Feriado Local, Hora Extra..."
                                className="bg-background border border-border rounded-xl p-4 text-foreground focus:border-primary outline-none placeholder:text-muted-foreground"
                            />
                            <p className="text-xs text-muted-foreground">Este comentário aparecerá no dia, independentemente do status.</p>
                        </div>

                        <button
                            onClick={() => setSelectedDate(null)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground p-4 rounded-xl font-bold mt-2 shadow-lg transition-transform active:scale-95"
                        >
                            Concluir
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
