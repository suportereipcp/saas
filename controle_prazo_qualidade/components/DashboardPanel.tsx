
import React from 'react';
import { ProductionItemWithDetails, WarehouseRequest, ProcessStatus } from '../types';
import { LayoutDashboard, AlertTriangle, CheckCircle2, Package, Activity, Droplets, Sticker, Timer, ArrowRight } from 'lucide-react';

interface DashboardPanelProps {
  items: ProductionItemWithDetails[];
  warehouseRequests: WarehouseRequest[];
  onNavigate: (view: any) => void;
  currentUser: string;
}

export const DashboardPanel: React.FC<DashboardPanelProps> = ({ items, warehouseRequests, onNavigate, currentUser }) => {
  
  // --- KPI CALCULATIONS ---
  const activeItems = items.filter(i => i.status !== ProcessStatus.COMPLETED && i.status !== ProcessStatus.REWORK);
  const delayedItems = activeItems.filter(i => i.isDelayed);
  
  // Completed Today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completedToday = items.filter(i => 
    i.status === ProcessStatus.COMPLETED && 
    i.adhesiveFinishedAt && 
    i.adhesiveFinishedAt >= today
  ).length;

  const pendingRequests = warehouseRequests.filter(r => r.status === 'PENDING').length;

  // --- CHART DATA ---
  const stats = {
    queueWashing: activeItems.filter(i => i.status === ProcessStatus.BLASTED).length,
    washing: activeItems.filter(i => i.status === ProcessStatus.WASHING).length,
    queueAdhesive: activeItems.filter(i => i.status === ProcessStatus.WASHED).length,
    adhesive: activeItems.filter(i => i.status === ProcessStatus.ADHESIVE).length,
  };

  const maxCount = Math.max(stats.queueWashing, stats.washing, stats.queueAdhesive, stats.adhesive, 1);

  // --- PRIORITY LIST (Top 5 Delayed) ---
  const topDelays = [...delayedItems]
    .sort((a, b) => (a.deadline?.getTime() || 0) - (b.deadline?.getTime() || 0))
    .slice(0, 5);

  const StatCard = ({ title, value, icon: Icon, color, subtext, onClick }: any) => (
    <div 
        onClick={onClick}
        className={`p-6 rounded-2xl border bg-white shadow-sm hover:shadow-md transition cursor-pointer group relative overflow-hidden`}
    >
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500`}>
            <Icon className={`w-24 h-24 text-${color}-600`} />
        </div>
        <div className="relative z-10">
            <div className={`flex items-center gap-2 text-${color}-600 mb-2 font-medium`}>
                <Icon className="w-5 h-5" />
                {title}
            </div>
            <div className="text-4xl font-bold text-slate-800 mb-1">{value}</div>
            <div className="text-xs text-slate-500">{subtext}</div>
        </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto pr-2 space-y-8 pb-20 lg:pb-0">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Visão Geral da Produção</h1>
                <p className="text-slate-500 text-sm">Olá, <strong>{currentUser}</strong>. Aqui está o resumo de hoje.</p>
            </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard 
                title="Em Produção" 
                value={activeItems.length} 
                icon={Activity} 
                color="blue"
                subtext="Itens ativos no fluxo"
                onClick={() => {}}
            />
            <StatCard 
                title="Atrasados" 
                value={delayedItems.length} 
                icon={AlertTriangle} 
                color="red"
                subtext="Requer atenção imediata"
                onClick={() => {}}
            />
            <StatCard 
                title="Finalizados Hoje" 
                value={completedToday} 
                icon={CheckCircle2} 
                color="green"
                subtext="Peças prontas para expedição"
                onClick={() => {}}
            />
            <StatCard 
                title="Solicitações" 
                value={pendingRequests} 
                icon={Package} 
                color="purple"
                subtext="Almoxarifado pendente"
                onClick={() => onNavigate('HARDWARE_REQUEST')}
            />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Pipeline Chart */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-80 lg:h-96">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <LayoutDashboard className="w-5 h-5 text-slate-500" />
                    Distribuição de Carga
                </h3>
                <div className="flex-1 flex items-end justify-around gap-4 pb-2">
                    {/* Bar 1 */}
                    <div className="flex flex-col items-center gap-2 w-full h-full justify-end group cursor-pointer" onClick={() => onNavigate('WASHING_STATION')}>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition">{stats.queueWashing}</span>
                        <div className="w-full bg-slate-100 rounded-t-lg relative overflow-hidden h-full max-h-52 lg:max-h-64">
                            <div className="absolute bottom-0 w-full bg-amber-400 hover:bg-amber-500 transition-all duration-500 rounded-t-lg" style={{ height: `${(stats.queueWashing / maxCount) * 100}%` }}></div>
                        </div>
                        <div className="text-[10px] lg:text-xs font-medium text-slate-500 text-center h-8 flex items-center">Fila Lavagem</div>
                    </div>
                    
                    {/* Bar 2 */}
                    <div className="flex flex-col items-center gap-2 w-full h-full justify-end group cursor-pointer" onClick={() => onNavigate('WASHING_STATION')}>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition">{stats.washing}</span>
                        <div className="w-full bg-slate-100 rounded-t-lg relative overflow-hidden h-full max-h-52 lg:max-h-64">
                            <div className="absolute bottom-0 w-full bg-blue-500 hover:bg-blue-600 transition-all duration-500 rounded-t-lg" style={{ height: `${(stats.washing / maxCount) * 100}%` }}></div>
                        </div>
                        <div className="text-[10px] lg:text-xs font-medium text-slate-500 text-center h-8 flex items-center">Lavando</div>
                    </div>

                    {/* Bar 3 */}
                    <div className="flex flex-col items-center gap-2 w-full h-full justify-end group cursor-pointer" onClick={() => onNavigate('ADHESIVE_STATION')}>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition">{stats.queueAdhesive}</span>
                        <div className="w-full bg-slate-100 rounded-t-lg relative overflow-hidden h-full max-h-52 lg:max-h-64">
                            <div className="absolute bottom-0 w-full bg-amber-400 hover:bg-amber-500 transition-all duration-500 rounded-t-lg" style={{ height: `${(stats.queueAdhesive / maxCount) * 100}%` }}></div>
                        </div>
                        <div className="text-[10px] lg:text-xs font-medium text-slate-500 text-center h-8 flex items-center">Fila Adesivo</div>
                    </div>

                    {/* Bar 4 */}
                    <div className="flex flex-col items-center gap-2 w-full h-full justify-end group cursor-pointer" onClick={() => onNavigate('ADHESIVE_STATION')}>
                        <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition">{stats.adhesive}</span>
                        <div className="w-full bg-slate-100 rounded-t-lg relative overflow-hidden h-full max-h-52 lg:max-h-64">
                            <div className="absolute bottom-0 w-full bg-purple-500 hover:bg-purple-600 transition-all duration-500 rounded-t-lg" style={{ height: `${(stats.adhesive / maxCount) * 100}%` }}></div>
                        </div>
                        <div className="text-[10px] lg:text-xs font-medium text-slate-500 text-center h-8 flex items-center">Aplicando</div>
                    </div>
                </div>
            </div>

            {/* Priority List */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-auto lg:h-96">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                    Atenção Imediata
                </h3>
                <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                    {topDelays.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center py-8 lg:py-0">
                            <CheckCircle2 className="w-12 h-12 mb-2 opacity-20 text-green-500" />
                            <p className="text-sm">Tudo em dia!</p>
                            <p className="text-xs opacity-70">Nenhum atraso detectado.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {topDelays.map(item => (
                                <div key={item.id} className="p-3 rounded-lg bg-red-50 border border-red-100 flex flex-col gap-1">
                                    <div className="flex justify-between items-start">
                                        <span className="text-xs font-bold text-red-800 bg-red-100 px-1.5 rounded">{item.calculo}</span>
                                        <span className="text-[10px] font-bold text-red-600 border border-red-200 px-1 rounded">{item.status}</span>
                                    </div>
                                    <div className="font-semibold text-sm text-slate-800 truncate">{item.productName}</div>
                                    <div className="flex justify-between items-center text-xs text-red-700 mt-1">
                                        <span className="flex items-center gap-1"><Timer className="w-3 h-3"/> Atrasado</span>
                                        <button 
                                            onClick={() => onNavigate(item.status === ProcessStatus.ADHESIVE || item.status === ProcessStatus.WASHED ? 'ADHESIVE_STATION' : 'WASHING_STATION')}
                                            className="text-blue-600 hover:underline flex items-center gap-0.5"
                                        >
                                            Ver <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
