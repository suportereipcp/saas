'use client';

import { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Mock Data
interface Reminder {
    id: string;
    date: Date;
    title: string;
    description: string;
}

const INITIAL_REMINDERS: Reminder[] = [
    { id: '1', date: new Date(), title: "Reunião de Diretoria", description: "Apresentar resultados do trimestre e alinhar metas para o próximo período." },
    { id: '2', date: new Date(new Date().setDate(new Date().getDate() + 2)), title: "Entrega do Projeto", description: "Finalizar documentação e enviar para o cliente." },
];

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Add Reminder Dialog State
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [newTitle, setNewTitle] = useState("");
    const [newDesc, setNewDesc] = useState("");

    // View Reminder Dialog State
    const [viewReminder, setViewReminder] = useState<Reminder | null>(null);

    // Helpers
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getDate() === d2.getDate() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getFullYear() === d2.getFullYear();
    };

    const handleAddReminder = () => {
        if (!newTitle.trim()) return;
        const newReminder: Reminder = {
            id: Math.random().toString(36).substr(2, 9),
            date: selectedDate,
            title: newTitle,
            description: newDesc
        };
        setReminders([...reminders, newReminder]);
        setNewTitle("");
        setNewDesc("");
        setIsAddOpen(false);
    };

    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    const remindersForSelectedDate = reminders.filter(r => isSameDay(r.date, selectedDate));

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <CalendarIcon size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Calendário</h1>
                        <p className="text-xs text-slate-500 font-medium">Seus lembretes e prazos</p>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-4 lg:p-6">
                <div className="max-w-4xl mx-auto flex flex-col lg:flex-row gap-6 h-full lg:h-auto">

                    {/* Calendar Grid Section */}
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-slate-800 capitalize">
                                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                            </h2>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft size={20} /></Button>
                                <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight size={20} /></Button>
                            </div>
                        </div>

                        {/* Week Days */}
                        <div className="grid grid-cols-7 mb-2 text-center">
                            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                                <div key={day} className="text-xs font-semibold text-slate-400 py-2 uppercase tracking-wider">{day}</div>
                            ))}
                        </div>

                        {/* Days Grid */}
                        <div className="grid grid-cols-7 gap-1 lg:gap-2 flex-1 auto-rows-fr">
                            {blanks.map(i => <div key={`blank-${i}`} />)}
                            {days.map(day => {
                                const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                const isSelected = isSameDay(date, selectedDate);
                                const isToday = isSameDay(date, new Date());
                                const hasReminder = reminders.some(r => isSameDay(r.date, date));

                                return (
                                    <button
                                        key={day}
                                        onClick={() => setSelectedDate(date)}
                                        className={`
                                            aspect-square rounded-lg flex flex-col items-center justify-center relative transition-all
                                            ${isSelected ? 'bg-emerald-600 text-white shadow-md' : 'hover:bg-slate-100 text-slate-700 bg-slate-50'}
                                            ${isToday && !isSelected ? 'ring-2 ring-emerald-400 ring-inset bg-emerald-50' : ''}
                                        `}
                                    >
                                        <span className={`text-sm font-medium ${isSelected ? 'text-white' : ''}`}>{day}</span>
                                        {hasReminder && (
                                            <div className={`mt-1 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Side Panel: Selected Day Details */}
                    <div className="w-full lg:w-80 flex flex-col gap-4">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex flex-col h-full min-h-[300px]">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <span className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Selecionado</span>
                                    <h3 className="text-xl font-bold text-slate-800">
                                        {selectedDate.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                                    </h3>
                                    <p className="text-sm text-slate-400 capitalize">
                                        {selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })}
                                    </p>
                                </div>
                                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                                    <DialogTrigger asChild>
                                        <Button size="icon" className="bg-emerald-600 hover:bg-emerald-700 rounded-full h-10 w-10 shrink-0">
                                            <Plus size={20} />
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Novo Lembrete</DialogTitle>
                                            <DialogDescription>
                                                Adicionar lembrete para {selectedDate.toLocaleDateString('pt-BR')}
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="title">Título</Label>
                                                <Input id="title" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Pagar boleto" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="desc">Descrição (Opcional)</Label>
                                                <Textarea id="desc" value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Detalhes do lembrete..." />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
                                            <Button onClick={handleAddReminder} disabled={!newTitle.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">Salvar</Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                {remindersForSelectedDate.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2 min-h-[150px]">
                                        <Clock size={40} strokeWidth={1.5} />
                                        <p className="text-sm font-medium">Sem lembretes</p>
                                    </div>
                                ) : (
                                    remindersForSelectedDate.map(reminder => (
                                        <div
                                            key={reminder.id}
                                            onClick={() => setViewReminder(reminder)}
                                            className="group p-3 rounded-lg border border-slate-100 hover:border-emerald-200 bg-slate-50 hover:bg-emerald-50 transition-all cursor-pointer flex items-center gap-3"
                                        >
                                            <div className="h-2 w-2 rounded-full bg-emerald-400 group-hover:scale-125 transition-transform" />
                                            <span className="text-sm font-medium text-slate-700 line-clamp-1">{reminder.title}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* View Reminder Details Dialog */}
            <Dialog open={!!viewReminder} onOpenChange={(open) => !open && setViewReminder(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="text-xl flex items-center gap-2">
                            <Clock className="text-emerald-500 w-5 h-5" />
                            {viewReminder?.title}
                        </DialogTitle>
                        <DialogDescription>
                            {viewReminder?.date.toLocaleDateString('pt-BR', { dateStyle: 'full' })}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-slate-700 text-sm whitespace-pre-wrap">
                            {viewReminder?.description || <span className="text-slate-400 italic">Sem descrição.</span>}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setViewReminder(null)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
