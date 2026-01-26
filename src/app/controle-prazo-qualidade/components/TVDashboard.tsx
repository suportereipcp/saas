import React, { useEffect, useState } from 'react';
import { ProductionItemWithDetails, ProcessStatus, WarehouseRequest } from '../types';
import { supabase } from '@/lib/supabase';
import { Hash, ArrowLeft, User, Clock, Box, Hammer, ClipboardList, Zap, Settings, Play, Square, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TVDashboardProps {
    items: ProductionItemWithDetails[];
    warehouseRequests: WarehouseRequest[];
    userEmail: string;
    onSimulateTime: () => void;
    onBack: () => void;
}

export const TVDashboard: React.FC<TVDashboardProps> = ({ items, warehouseRequests, onBack, userEmail }) => {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [filter, setFilter] = useState<'ALL' | 'WASHING' | 'ADHESIVE' | 'PROFILE' | 'HARDWARE'>('ALL');

    // --- ROTATION SETTINGS ---
    const [isRotating, setIsRotating] = useState(false);
    const [rotationInterval, setRotationInterval] = useState(30); // seconds
    const [selectedFilters, setSelectedFilters] = useState<string[]>(['WASHING', 'ADHESIVE']);
    const [rotationIndex, setRotationIndex] = useState(0);
    const [showSettings, setShowSettings] = useState(false);

    // --- DATABASE SYNC ---
    useEffect(() => {
        const fetchSettings = async () => {
            if (!userEmail) return;
            const { data, error } = await supabase
                .schema('app_controle_prazo_qualidade')
                .from('tv_settings')
                .select('*')
                .eq('user_email', userEmail)
                .single();

            if (data && !error) {
                setIsRotating(data.rotation_enabled);
                setRotationInterval(data.rotation_interval);
                setSelectedFilters(data.selected_filters);
            }
        };
        fetchSettings();
    }, [userEmail]);

    const saveSettings = async (updates: any) => {
        if (!userEmail) return;
        await supabase
            .schema('app_controle_prazo_qualidade')
            .from('tv_settings')
            .upsert({
                user_email: userEmail,
                rotation_enabled: isRotating,
                rotation_interval: rotationInterval,
                selected_filters: selectedFilters,
                ...updates
            });
    };

    useEffect(() => {
        if (!isRotating || selectedFilters.length <= 1) return;

        const interval = setInterval(() => {
            setRotationIndex((prev) => {
                const next = (prev + 1) % selectedFilters.length;
                setFilter(selectedFilters[next] as any);
                return next;
            });
        }, rotationInterval * 1000);

        return () => clearInterval(interval);
    }, [isRotating, rotationInterval, selectedFilters]);

    const toggleFilterSelection = (f: string) => {
        setSelectedFilters(prev =>
            prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
        );
    };

    useEffect(() => {
        // Hydration mismatch fix: set time only after mount
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const activeProductionItems = items.filter(i => {
        const isActiveStage = i.status !== ProcessStatus.FINISHED;
        if (!isActiveStage) return false;
        if (filter === 'WASHING') return [ProcessStatus.WASHING].includes(i.status as any) || (!i.wash_started_at);
        if (filter === 'ADHESIVE') return [ProcessStatus.ADHESIVE].includes(i.status as any) || (i.wash_finished_at && !i.adhesive_started_at);
        if (filter === 'PROFILE' || filter === 'HARDWARE') return false;
        return true;
    });

    const getUrgencyInfo = (item: ProductionItemWithDetails) => {
        if (!item.deadline) return { timeLeftMs: 0, percentUsed: 0, colorStatus: 'emerald', isLate: false };
        const now = new Date().getTime();
        const deadline = new Date(item.deadline).getTime();
        const timeLeftMs = deadline - now;
        const minutesLeft = Math.floor(timeLeftMs / (1000 * 60));

        let startRef = item.datasul_finished_at;
        if (item.status === ProcessStatus.ADHESIVE && item.wash_finished_at) startRef = item.wash_finished_at;

        const startTime = new Date(startRef).getTime();

        // Total base de 2h para cálculo de preenchimento da barra
        const totalThreshold = 2 * 60 * 60 * 1000;
        const elapsed = now - startTime;
        const percentUsed = Math.max(0, Math.min(1, elapsed / totalThreshold));

        const isLate = timeLeftMs <= 0;
        let colorStatus = 'emerald';

        if (isLate) {
            colorStatus = 'red';
        } else if (minutesLeft < 20) {
            colorStatus = 'amber';
        }

        return { timeLeftMs, percentUsed, colorStatus, isLate };
    };

    const sortedProductionItems = activeProductionItems.map(item => ({
        ...item,
        ...getUrgencyInfo(item)
    })).sort((a, b) => a.timeLeftMs - b.timeLeftMs);

    const warehouseItems = warehouseRequests
        .filter(r => {
            if (r.status !== 'PENDING') return false;
            if (filter === 'PROFILE') return r.type === 'PROFILE';
            if (filter === 'HARDWARE') return r.type === 'HARDWARE';
            return true;
        })
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const isWarehouseView = filter === 'PROFILE' || filter === 'HARDWARE';

    return (
        <div className="fixed inset-0 bg-slate-50 z-40 flex flex-col font-sans select-none overflow-hidden text-slate-900">
            <header className="flex justify-between items-center p-6 border-b border-slate-200 shrink-0 bg-white/80 backdrop-blur-md shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={onBack} className="bg-white border-slate-200 hover:bg-slate-50 hover:text-slate-900">
                        <ArrowLeft className="w-5 h-5 text-slate-600" />
                    </Button>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Monitoramento Industrial <span className="text-emerald-500">Andon</span></h1>
                </div>
                <div className="flex items-center gap-6">
                    <div className="bg-slate-100 p-1 rounded-xl flex border border-slate-200 shadow-sm">
                        {['ALL', 'WASHING', 'ADHESIVE', 'PROFILE', 'HARDWARE'].map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f as any)}
                                className={cn(
                                    "px-5 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider",
                                    filter === f ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-slate-500 hover:text-slate-900"
                                )}
                            >
                                {f === 'ALL' ? 'Todos' : f === 'WASHING' ? 'Lavagem' : f === 'ADHESIVE' ? 'Adesivo' : f === 'PROFILE' ? 'Perfis' : 'Ferragens'}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Dialog open={showSettings} onOpenChange={setShowSettings}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900 border border-transparent hover:border-slate-200">
                                    <Settings className={cn("w-5 h-5", isRotating && "animate-spin-slow")} />
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] bg-white">
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                        <Settings className="w-5 h-5" /> Configurações do Monitor
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-6 py-6">
                                    <div className="space-y-4">
                                        <Label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Intercalar Filtros</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[
                                                { id: 'ALL', label: 'Todos' },
                                                { id: 'WASHING', label: 'Lavagem' },
                                                { id: 'ADHESIVE', label: 'Adesivo' },
                                                { id: 'PROFILE', label: 'Perfis' },
                                                { id: 'HARDWARE', label: 'Ferragens' }
                                            ].map((f) => (
                                                <div key={f.id} className="flex items-center space-x-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                                    <Checkbox
                                                        id={`filter-${f.id}`}
                                                        checked={selectedFilters.includes(f.id)}
                                                        onCheckedChange={() => {
                                                            const newFilters = selectedFilters.includes(f.id)
                                                                ? selectedFilters.filter(x => x !== f.id)
                                                                : [...selectedFilters, f.id];
                                                            setSelectedFilters(newFilters);
                                                            saveSettings({ selected_filters: newFilters });
                                                        }}
                                                    />
                                                    <Label htmlFor={`filter-${f.id}`} className="text-sm font-medium cursor-pointer">{f.label}</Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <Label htmlFor="interval" className="text-sm font-bold text-slate-500 uppercase tracking-wider">Intervalo (Segundos)</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                id="interval"
                                                type="number"
                                                min="5"
                                                value={rotationInterval}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    setRotationInterval(val);
                                                    saveSettings({ rotation_interval: val });
                                                }}
                                                className="font-mono font-bold"
                                            />
                                            <span className="text-slate-400 text-sm font-medium">seg</span>
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-slate-100">
                                        <Button
                                            className={cn(
                                                "w-full h-12 text-base font-bold transition-all",
                                                isRotating
                                                    ? "bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                                                    : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/20"
                                            )}
                                            onClick={() => {
                                                const newRotating = !isRotating;
                                                if (newRotating && selectedFilters.length > 0) {
                                                    setFilter(selectedFilters[0] as any);
                                                    setRotationIndex(0);
                                                }
                                                setIsRotating(newRotating);
                                                saveSettings({ rotation_enabled: newRotating });
                                                setShowSettings(false);
                                            }}
                                        >
                                            {isRotating ? (
                                                <><Square className="w-5 h-5 mr-2 fill-current" /> Parar Rotação</>
                                            ) : (
                                                <><Play className="w-5 h-5 mr-2 fill-current" /> Iniciar Rotação</>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>

                        <div className="text-right border-l border-slate-200 pl-6 hidden md:block">
                            <div className="text-4xl font-mono font-bold text-slate-900 leading-none tracking-tighter mb-1">
                                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center justify-end gap-2 text-right">
                                {isRotating && <span className="flex items-center gap-1 text-emerald-500 animate-pulse"><Zap className="w-3 h-3 fill-current" /> Rotação Ativa</span>}
                                {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-4 gap-6 h-full grid-rows-2">
                    {!isWarehouseView && sortedProductionItems.map((item) => (
                        <Card key={item.id} className={cn(
                            "rounded-2xl bg-white border-l-[12px] shadow-xl relative overflow-hidden flex flex-col transition-all duration-500 hover:scale-[1.02]",
                            item.colorStatus === 'red' ? "border-red-600 animate-pulse" :
                                item.colorStatus === 'amber' ? "border-amber-500" : "border-emerald-500"
                        )}>
                            <CardContent className="p-8 flex flex-col h-full justify-between">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-black bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg border border-slate-200 uppercase tracking-tighter shadow-sm">
                                        {item.status === 'WASHING' ? 'LAVAGEM' : item.status === 'ADHESIVE' ? 'ADESIVO' : item.status}
                                    </span>
                                    <span className={cn(
                                        "text-2xl font-black italic",
                                        item.calculation_priority === 'Calculo 1' ? "text-red-600" : "text-slate-400"
                                    )}>
                                        {item.calculation_priority || ('#' + item.nr_solicitacao.toString().slice(-4))}
                                    </span>
                                </div>

                                <div className="flex-1 flex flex-col justify-center">
                                    <h2 className="text-5xl font-black text-slate-900 mb-2 truncate leading-none tracking-tight">{item.it_codigo}</h2>
                                    <p className="text-slate-500 text-lg flex items-center gap-2 font-bold">
                                        <Hash className="w-5 h-5" /> {item.calculation_priority || item.nr_solicitacao} • Qtd: <strong className="text-slate-900 text-3xl ml-1">{item.quantity}</strong>
                                    </p>
                                </div>

                                <div className="mt-auto bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
                                    <div className="flex justify-between items-end mb-2">
                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Tempo Restante</span>
                                        <span className={cn(
                                            "text-2xl font-mono font-bold",
                                            item.colorStatus === 'red' ? "text-red-600" :
                                                item.colorStatus === 'amber' ? "text-amber-500" : "text-emerald-500"
                                        )}>
                                            {item.isLate ? 'ATRASADO' : `${Math.floor(item.timeLeftMs / (1000 * 60))} m`}
                                        </span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden p-[1px]">
                                        <div
                                            className={cn(
                                                "h-full transition-all duration-1000 rounded-full",
                                                item.colorStatus === 'red' ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.3)]" :
                                                    item.colorStatus === 'amber' ? "bg-amber-500" : "bg-emerald-500"
                                            )}
                                            style={{ width: `${Math.min(100, item.percentUsed * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {(isWarehouseView || filter === 'ALL') && warehouseItems.map((req) => (
                        <Card key={req.id} className="rounded-2xl bg-white border-l-[10px] border-emerald-500 shadow-xl relative overflow-hidden flex flex-col transition-all hover:scale-[1.02] ring-1 ring-emerald-500/5">
                            <CardContent className="p-6 flex flex-col h-full">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-2">
                                        {req.type === 'PROFILE' ? <Box className="w-4 h-4 text-emerald-500" /> : <Hammer className="w-4 h-4 text-emerald-500" />}
                                        <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg border border-emerald-200 uppercase tracking-tighter">
                                            {req.type === 'PROFILE' ? 'Almox. Perfil' : 'Solic. Ferragem'}
                                        </span>
                                    </div>
                                    <div className="p-1.5 bg-slate-100 rounded-full"><ClipboardList className="w-4 h-4 text-slate-300" /></div>
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 mb-1 truncate leading-tight uppercase">{req.item_code}</h2>
                                <div className="flex items-center gap-3 mb-4">
                                    <span className="text-3xl font-black text-emerald-500 drop-shadow-[0_2px_4px_rgba(16,185,129,0.1)]">x{req.quantity}</span>
                                    <span className="text-slate-200 font-light text-xl">|</span>
                                    <div className="flex items-center gap-1.5 text-slate-600 text-sm bg-slate-50 px-2 py-1 rounded-lg">
                                        <User className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="font-semibold">{req.requester}</span>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between text-slate-400">
                                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                        <Clock className="w-3.5 h-3.5 text-emerald-500/30" />
                                        {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-500/70 tracking-widest uppercase">Pendente</span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {((!isWarehouseView && sortedProductionItems.length === 0) || (isWarehouseView && warehouseItems.length === 0)) && (
                        <div className="col-span-full py-40 flex flex-col items-center justify-center text-slate-300 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm">
                            <Zap className="w-16 h-16 mb-4 opacity-20 text-emerald-500" />
                            <p className="text-2xl font-black opacity-40 uppercase tracking-[0.2em] text-slate-900">Fluxo Estabilizado</p>
                            <p className="text-xs opacity-50 uppercase font-bold mt-2 text-slate-500">Nenhuma atividade pendente no setor selecionado</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
