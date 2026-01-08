
import React, { useEffect, useState } from 'react';
import { ProductionItemWithDetails, ProcessStatus, WarehouseRequest } from '../types';
import { Timer, Hash, Zap, ArrowLeft, AlertTriangle, Package, User, Clock, Hammer, Box, ClipboardList } from 'lucide-react';

interface TVDashboardProps {
  items: ProductionItemWithDetails[];
  warehouseRequests: WarehouseRequest[];
  onSimulateTime: () => void;
  onBack: () => void;
}

export const TVDashboard: React.FC<TVDashboardProps> = ({ items, warehouseRequests, onSimulateTime, onBack }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filter, setFilter] = useState<'ALL' | 'WASHING' | 'ADHESIVE' | 'WAREHOUSE'>('ALL');

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeProductionItems = items.filter(i => {
    const isActiveStage = [ProcessStatus.BLASTED, ProcessStatus.WASHING, ProcessStatus.WASHED, ProcessStatus.ADHESIVE].includes(i.status);
    if (!isActiveStage) return false;
    if (filter === 'WASHING') return [ProcessStatus.BLASTED, ProcessStatus.WASHING].includes(i.status);
    if (filter === 'ADHESIVE') return [ProcessStatus.WASHED, ProcessStatus.ADHESIVE].includes(i.status);
    if (filter === 'WAREHOUSE') return false; // Esconde produção na visão de almoxarifado
    return true;
  });

  const getUrgencyInfo = (item: ProductionItemWithDetails) => {
    if (!item.deadline) return { timeLeftMs: 0, percentUsed: 0, colorStatus: 'green', isLate: false };
    const now = new Date().getTime();
    const deadline = item.deadline.getTime();
    const timeLeftMs = deadline - now;
    let startTime = 0;
    if (item.status === ProcessStatus.BLASTED) startTime = item.blastedAt.getTime();
    else if (item.status === ProcessStatus.WASHING) startTime = item.washStartedAt?.getTime() || 0;
    else if (item.status === ProcessStatus.WASHED) startTime = item.washFinishedAt?.getTime() || 0;
    else if (item.status === ProcessStatus.ADHESIVE) startTime = item.adhesiveStartedAt?.getTime() || 0;
    const totalDuration = deadline - startTime;
    const elapsed = now - startTime;
    const percentUsed = totalDuration > 0 ? (elapsed / totalDuration) : 0;
    const isLate = timeLeftMs < 0;
    let colorStatus = 'green';
    if (isLate || (1 - percentUsed) < 0.15) colorStatus = 'red';
    else if ((1 - percentUsed) < 0.50) colorStatus = 'orange';
    return { timeLeftMs, percentUsed, colorStatus, isLate };
  };

  const sortedProductionItems = activeProductionItems.map(item => ({
      ...item,
      ...getUrgencyInfo(item)
  })).sort((a, b) => a.timeLeftMs - b.timeLeftMs);

  const warehouseItems = warehouseRequests
    .filter(r => r.status === 'PENDING')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const isWarehouseView = filter === 'WAREHOUSE';

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col font-sans select-none">
        <header className="flex justify-between items-center p-6 border-b border-slate-800 shrink-0 bg-slate-950/80 backdrop-blur-md">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition shadow-lg"><ArrowLeft /></button>
                <h1 className="text-3xl font-bold text-white tracking-tight">Monitoramento Industrial <span className="text-blue-500">Andon</span></h1>
            </div>
            <div className="flex items-center gap-6">
                <div className="bg-slate-900 p-1 rounded-xl flex border border-slate-800">
                    {['ALL', 'WASHING', 'ADHESIVE', 'WAREHOUSE'].map(f => (
                        <button 
                          key={f} 
                          onClick={() => setFilter(f as any)} 
                          className={`px-5 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wider ${filter === f ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40 ring-1 ring-blue-400/30' : 'text-slate-500 hover:text-white'}`}
                        >
                            {f === 'ALL' ? 'Todos' : f === 'WASHING' ? 'Lavagem' : f === 'ADHESIVE' ? 'Adesivo' : 'Pedidos Material'}
                        </button>
                    ))}
                </div>
                <div className="text-right border-l border-slate-800 pl-6">
                    <div className="text-4xl font-mono font-bold text-white leading-none tracking-tighter mb-1">{currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})}</div>
                    <div className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em]">{currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                </div>
            </div>
        </header>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                {/* CARDS DE PRODUÇÃO */}
                {!isWarehouseView && sortedProductionItems.map((item) => (
                    <div key={item.id} className={`p-6 rounded-2xl bg-slate-900 border-l-[10px] shadow-2xl relative overflow-hidden flex flex-col transition-all duration-500 hover:scale-[1.02] border border-white/5 ${item.isLate ? 'border-red-600 animate-pulse' : item.colorStatus === 'orange' ? 'border-orange-500' : 'border-emerald-500'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <span className="text-[10px] font-black bg-slate-800 text-slate-400 px-2 py-1 rounded-lg border border-slate-700 uppercase tracking-tighter shadow-sm">{item.status}</span>
                            <span className="text-2xl font-black text-white/10 italic">#{item.sequentialId}</span>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-1 truncate leading-tight group-hover:text-blue-400 transition-colors">{item.productName}</h2>
                        <p className="text-slate-500 text-xs mb-6 flex items-center gap-1.5 font-medium"><Hash className="w-3.5 h-3.5"/> {item.calculo} • Qtd: <strong className="text-white text-base ml-1">{item.quantity}</strong></p>
                        
                        <div className="mt-auto bg-black/40 p-4 rounded-xl border border-white/5 shadow-inner">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Tempo Restante</span>
                                <span className={`text-2xl font-mono font-bold ${item.isLate ? 'text-red-500' : 'text-emerald-400'}`}>
                                    {item.isLate ? 'ATRASADO' : `${Math.floor(item.timeLeftMs / (1000 * 60))}m`}
                                </span>
                            </div>
                            <div className="h-2.5 w-full bg-slate-800 rounded-full overflow-hidden p-[1px]">
                                <div className={`h-full transition-all duration-1000 rounded-full ${item.colorStatus === 'red' ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]' : item.colorStatus === 'orange' ? 'bg-orange-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, item.percentUsed * 100)}%` }} />
                            </div>
                        </div>
                    </div>
                ))}

                {/* CARDS DE SOLICITAÇÃO DE MATERIAL */}
                {(isWarehouseView || filter === 'ALL') && warehouseItems.map((req) => (
                    <div key={req.id} className="p-6 rounded-2xl bg-slate-900 border-l-[10px] border-purple-600 shadow-2xl relative overflow-hidden flex flex-col transition-all hover:scale-[1.02] border border-white/5 ring-1 ring-purple-500/10">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                {req.type === 'PROFILE' ? <Box className="w-4 h-4 text-purple-400" /> : <Hammer className="w-4 h-4 text-purple-400" />}
                                <span className="text-[10px] font-black bg-purple-900/40 text-purple-300 px-2 py-1 rounded-lg border border-purple-700/50 uppercase tracking-tighter">
                                    {req.type === 'PROFILE' ? 'Almox. Perfil' : 'Solic. Ferragem'}
                                </span>
                            </div>
                            <div className="p-1.5 bg-white/5 rounded-full"><ClipboardList className="w-4 h-4 text-white/20" /></div>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-1 truncate leading-tight">{req.item}</h2>
                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-3xl font-black text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]">x{req.quantity}</span>
                            <span className="text-slate-700 font-light text-xl">|</span>
                            <div className="flex items-center gap-1.5 text-slate-400 text-sm bg-white/5 px-2 py-1 rounded-lg">
                                <User className="w-3.5 h-3.5 text-slate-500" />
                                <span className="font-semibold">{req.requester}</span>
                            </div>
                        </div>
                        
                        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between text-slate-500">
                             <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-slate-950 px-2 py-1 rounded border border-white/5">
                                <Clock className="w-3.5 h-3.5 text-purple-500/50" />
                                {req.createdAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                             </div>
                             <span className="text-[10px] font-black text-purple-500/70 tracking-widest">PENDENTE</span>
                        </div>
                    </div>
                ))}

                {/* ESTADO VAZIO */}
                {((!isWarehouseView && sortedProductionItems.length === 0) || (isWarehouseView && warehouseItems.length === 0)) && (
                    <div className="col-span-full py-40 flex flex-col items-center justify-center text-slate-600 bg-slate-900/20 rounded-3xl border border-dashed border-white/5">
                        <Zap className="w-16 h-16 mb-4 opacity-5 animate-pulse text-blue-500" />
                        <p className="text-2xl font-black opacity-20 uppercase tracking-[0.2em]">Fluxo Estabilizado</p>
                        <p className="text-xs opacity-10 uppercase font-bold mt-2">Nenhuma atividade pendente no setor selecionado</p>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
