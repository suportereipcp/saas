'use client';

import React from 'react';
import { ProductionItemWithDetails, WarehouseRequest, ProcessStatus } from '../types';
import { LayoutDashboard, AlertTriangle, CheckCircle2, Package, Activity, Timer, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardPanelProps {
    items: ProductionItemWithDetails[];
    warehouseRequests: WarehouseRequest[];
    onNavigate: (view: any) => void;
    currentUser: string;
    headerActions?: React.ReactNode;
}

export const DashboardPanel: React.FC<DashboardPanelProps> = ({ items, warehouseRequests, onNavigate, currentUser, headerActions }) => {

    // --- KPI CALCULATIONS ---
    // --- DAILY PRODUCTION METRICS (Sum of Pieces) ---
    // Production day starts at 06:00 AM
    const now = new Date();
    const productionDayStart = new Date(now);
    if (now.getHours() < 6) {
        productionDayStart.setDate(now.getDate() - 1);
    }
    productionDayStart.setHours(6, 0, 0, 0);

    const today = productionDayStart;

    const activeItems = items.filter(i => i.status !== ProcessStatus.FINISHED);
    const delayedItems = activeItems.filter(i => i.isDelayed);

    const jateadasQty = items.reduce((acc, i) => {
        if (!i.datasul_finished_at) return acc;
        return new Date(i.datasul_finished_at) >= today ? acc + (i.quantity || 0) : acc;
    }, 0);

    const lavadasQty = items.reduce((acc, i) => {
        if (!i.wash_finished_at) return acc;
        return new Date(i.wash_finished_at) >= today ? acc + (i.quantity || 0) : acc;
    }, 0);

    const aplicadasQty = items.reduce((acc, i) => {
        if (!i.adhesive_finished_at) return acc;
        return new Date(i.adhesive_finished_at) >= today ? acc + (i.quantity || 0) : acc;
    }, 0);

    const pendingHardware = warehouseRequests.filter(r => r.status === 'PENDING' && r.type === 'HARDWARE').length;
    const pendingProfile = warehouseRequests.filter(r => r.status === 'PENDING' && r.type === 'PROFILE').length;

    // --- CHART DATA ---
    const stats = {
        queueWashing: activeItems.filter(i => i.status === ProcessStatus.WASHING && !i.wash_started_at).length,
        washing: activeItems.filter(i => i.status === ProcessStatus.WASHING && i.wash_started_at).length,
        queueAdhesive: activeItems.filter(i => i.status === ProcessStatus.ADHESIVE && !i.adhesive_started_at).length,
        adhesive: activeItems.filter(i => i.status === ProcessStatus.ADHESIVE && i.adhesive_started_at).length,
    };

    const maxCount = Math.max(stats.queueWashing, stats.washing, stats.queueAdhesive, stats.adhesive, 1);

    // --- PRIORITY LIST (Top 5 Delayed) ---
    const topDelays = [...delayedItems]
        .sort((a, b) => (a.deadline ? new Date(a.deadline).getTime() : 0) - (b.deadline ? new Date(b.deadline).getTime() : 0))
        .slice(0, 5);

    const StatCard = ({ title, value, icon: Icon, colorClass, subtext, onClick }: any) => (
        <Card
            onClick={onClick}
            className="relative overflow-hidden cursor-pointer hover:shadow-md transition-all group"
        >
            <div className={cn("absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500", colorClass)}>
                <Icon className="w-24 h-24" />
            </div>
            <CardContent className="p-6 relative z-10">
                <div className={cn("flex items-center gap-2 mb-2 font-medium", colorClass)}>
                    <Icon className="w-5 h-5" />
                    {title}
                </div>
                <div className="text-4xl font-bold text-slate-800 mb-1">{value}</div>
                <div className="text-xs text-muted-foreground">{subtext}</div>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Visão Geral da Produção</h2>
                    <p className="text-muted-foreground">Olá, <strong>{currentUser}</strong>. Aqui está o resumo de hoje.</p>
                </div>
                {headerActions}
            </div>

            {/* Daily Production Totals */}
            <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Produção do Dia (Peças)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Peças Jateadas"
                        value={jateadasQty}
                        icon={Package}
                        colorClass="text-blue-600"
                        subtext="Total recebido hoje"
                        onClick={() => { }}
                    />
                    <StatCard
                        title="Peças Lavadas"
                        value={lavadasQty}
                        icon={Timer}
                        colorClass="text-emerald-500"
                        subtext="Lavagem concluída hoje"
                        onClick={() => onNavigate('WASHING_STATION')}
                    />
                    <StatCard
                        title="Peças Aplicadas"
                        value={aplicadasQty}
                        icon={CheckCircle2}
                        colorClass="text-slate-900"
                        subtext="Adesivagem concluída hoje"
                        onClick={() => onNavigate('ADHESIVE_STATION')}
                    />
                </div>
            </div>

            {/* Pipeline and Inventory Status */}
            <div className="space-y-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider ml-1">Estado da Operação (Cartões)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Em Produção"
                        value={activeItems.length}
                        icon={Activity}
                        colorClass="text-emerald-600"
                        subtext="Cartões ativos no fluxo"
                        onClick={() => { }}
                    />
                    <StatCard
                        title="Atrasados"
                        value={delayedItems.length}
                        icon={AlertTriangle}
                        colorClass="text-red-500"
                        subtext="Requer atenção imediata"
                        onClick={() => { }}
                    />
                    <StatCard
                        title="Perfis"
                        value={pendingProfile}
                        icon={Package}
                        colorClass="text-blue-500"
                        subtext="Almoxarifado Perfil"
                        onClick={() => onNavigate('PROFILE_WAREHOUSE')}
                    />
                    <StatCard
                        title="Ferragens"
                        value={pendingHardware}
                        icon={Package}
                        colorClass="text-slate-500"
                        subtext="Solicitação Ferragem"
                        onClick={() => onNavigate('HARDWARE_REQUEST')}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Pipeline Chart */}
                <Card className="lg:col-span-2 flex flex-col h-96">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <LayoutDashboard className="w-5 h-5 text-muted-foreground" />
                            Distribuição de Carga
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-end justify-around gap-4 pb-6">
                        {/* Helper to render bars */}
                        {[
                            { label: 'Fila Lavagem', value: stats.queueWashing, color: 'bg-emerald-300', nav: 'WASHING_STATION' },
                            { label: 'Lavando', value: stats.washing, color: 'bg-emerald-500', nav: 'WASHING_STATION' },
                            { label: 'Fila Adesivo', value: stats.queueAdhesive, color: 'bg-slate-300', nav: 'ADHESIVE_STATION' },
                            { label: 'Aplicando', value: stats.adhesive, color: 'bg-slate-500', nav: 'ADHESIVE_STATION' }
                        ].map((bar, idx) => (
                            <div key={idx} className="flex flex-col items-center gap-2 w-full h-full justify-end group cursor-pointer" onClick={() => onNavigate(bar.nav)}>
                                <span className="text-sm font-bold text-slate-700 group-hover:text-primary transition">{bar.value}</span>
                                <div className="w-full bg-slate-100 rounded-t-lg relative overflow-hidden h-full max-h-64">
                                    <div
                                        className={cn("absolute bottom-0 w-full transition-all duration-500 rounded-t-lg", bar.color)}
                                        style={{ height: `${(bar.value / maxCount) * 100}%` }}
                                    ></div>
                                </div>
                                <div className="text-xs font-medium text-muted-foreground text-center h-8 flex items-center">{bar.label}</div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Priority List */}
                <Card className="flex flex-col h-96">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-emerald-700">
                            <AlertTriangle className="w-5 h-5" />
                            Atenção Imediata
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto custom-scrollbar pr-2">
                        {topDelays.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center">
                                <CheckCircle2 className="w-12 h-12 mb-2 opacity-20 text-green-500" />
                                <p className="text-sm">Tudo em dia!</p>
                                <p className="text-xs opacity-70">Nenhum atraso detectado.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topDelays.map(item => (
                                    <div key={item.id} className="p-3 rounded-lg bg-emerald-50 border border-emerald-100 flex flex-col gap-1">
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-1.5 rounded">{item.nr_solicitacao}</span>
                                            <span className="text-[10px] font-bold text-slate-600 border border-slate-200 px-1 rounded">{item.status}</span>
                                        </div>
                                        <div className="font-semibold text-sm text-slate-800 truncate">{item.productName}</div>
                                        <div className="flex justify-between items-center text-xs text-emerald-700 mt-1">
                                            <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> Atrasado</span>
                                            <Button
                                                variant="link"
                                                size="sm"
                                                className="h-auto p-0 text-slate-600"
                                                onClick={() => onNavigate(item.status === ProcessStatus.ADHESIVE ? 'ADHESIVE_STATION' : 'WASHING_STATION')}
                                            >
                                                Ver <ArrowRight className="w-3 h-3 ml-1" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
