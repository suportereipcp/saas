
import React, { useEffect, useState } from 'react';
import { ProductionItemWithDetails, ProcessStatus } from '../types';
import { Timer, AlertTriangle, CheckCircle2, Droplets, Play, CheckSquare, Sticker, Hash, AlertOctagon, Megaphone } from 'lucide-react';

interface KanbanBoardProps {
  items: ProductionItemWithDetails[];
  onUpdateStatus: (itemId: string, newStatus: ProcessStatus) => void;
  onCallPresence?: () => void;
  viewMode: 'WASHING' | 'ADHESIVE';
}

const ItemCard: React.FC<{ 
    item: ProductionItemWithDetails; 
    onNext: () => void; 
    onRework: () => void;
    actionLabel: string; 
    icon: React.ReactNode 
}> = ({ item, onNext, onRework, actionLabel, icon }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    if (!item.deadline) {
      setTimeLeft('');
      return;
    }

    const updateTimer = () => {
      const now = new Date().getTime();
      const deadline = item.deadline!.getTime();
      const diff = deadline - now;
      
      // Determine base duration for percentage bar
      let baseDuration = 0;
      if (item.status === ProcessStatus.BLASTED) baseDuration = item.washDeadlineMinutes * 60 * 1000;
      if (item.status === ProcessStatus.WASHED) baseDuration = item.adhesiveDeadlineMinutes * 60 * 1000;
      
      if (diff <= 0) {
        setTimeLeft('Atrasado');
        setPercent(100);
      } else {
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const hours = Math.floor((diff / (1000 * 60 * 60)));
        setTimeLeft(`${hours}h ${minutes}m restantes`);
        
        if (baseDuration > 0) {
           const elapsed = baseDuration - diff;
           setPercent(Math.min(100, (elapsed / baseDuration) * 100));
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [item]);

  const isDelayed = item.isDelayed;
  const isQueue = item.status === ProcessStatus.BLASTED || item.status === ProcessStatus.WASHED;

  return (
    <div className={`p-5 rounded-xl shadow-sm border-l-8 mb-4 bg-white transition hover:shadow-md flex flex-col ${isDelayed ? 'border-l-red-500' : 'border-l-blue-500'}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
                 <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold border border-slate-200 flex items-center gap-1">
                   <Hash className="w-3 h-3"/> {item.calculo}
                 </span>
            </div>
          <h4 className="font-bold text-slate-800 text-lg leading-tight">{item.productName}</h4>
          <p className="text-sm text-slate-500 mt-1">{item.material}</p>
        </div>
        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold">
          x{item.quantity}
        </span>
      </div>

      {isQueue && item.deadline && (
        <div className="mb-4 mt-2">
          <div className="flex justify-between items-center text-sm mb-1">
            <span className={`${isDelayed ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
              {timeLeft}
            </span>
            {isDelayed && <AlertTriangle className="w-4 h-4 text-red-500" />}
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full ${isDelayed ? 'bg-red-500' : 'bg-blue-500'}`} 
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {!isQueue && (
        <div className="mb-4 text-sm text-blue-600 font-medium flex items-center gap-2 animate-pulse mt-2">
           <Timer className="w-4 h-4"/> Em andamento...
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2">
          {isDelayed && (
              <button
              onClick={onRework}
              className="w-full py-2 bg-red-50 hover:bg-red-100 hover:text-red-800 text-red-600 border border-red-200 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition"
              >
              <AlertOctagon className="w-4 h-4" />
              Enviar para Retrabalho
              </button>
          )}

          <button
            onClick={onNext}
            className="w-full py-3 bg-slate-50 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 text-slate-700 border border-slate-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition"
          >
            {icon}
            {actionLabel}
          </button>
      </div>
    </div>
  );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ items, onUpdateStatus, onCallPresence, viewMode }) => {
  
  // State for Mobile Tabs (which column to show)
  const [mobileTab, setMobileTab] = useState(0);

  // Helper to sort items
  const getSortedItems = (status: ProcessStatus) => {
    return items
      .filter(i => i.status === status)
      .sort((a, b) => {
        if (status === ProcessStatus.COMPLETED) {
          const timeA = a.adhesiveFinishedAt?.getTime() || 0;
          const timeB = b.adhesiveFinishedAt?.getTime() || 0;
          return timeB - timeA;
        }
        if (a.deadline && b.deadline) return a.deadline.getTime() - b.deadline.getTime();
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return a.productName.localeCompare(b.productName);
      });
  };

  const allColumns = [
    {
      id: ProcessStatus.BLASTED,
      title: 'Fila Lavagem',
      fullTitle: 'Aguardando Lavagem',
      icon: <Timer className="w-5 h-5"/>,
      color: 'border-amber-400',
      bgHeader: 'bg-amber-50',
      action: 'Iniciar Lavagem',
      nextStatus: ProcessStatus.WASHING,
      actionIcon: <Play className="w-4 h-4"/>,
      belongsTo: ['WASHING'],
      hasCallButton: true 
    },
    {
      id: ProcessStatus.WASHING,
      title: 'Em Lavagem',
      fullTitle: 'Em Lavagem',
      icon: <Droplets className="w-5 h-5"/>,
      color: 'border-blue-400',
      bgHeader: 'bg-blue-50',
      action: 'Concluir Lavagem',
      nextStatus: ProcessStatus.WASHED,
      actionIcon: <CheckSquare className="w-4 h-4"/>,
      belongsTo: ['WASHING']
    },
    {
      id: ProcessStatus.WASHED,
      title: 'Fila Adesivo',
      fullTitle: 'Aguardando Adesivo',
      icon: <Timer className="w-5 h-5"/>,
      color: 'border-amber-400',
      bgHeader: 'bg-amber-50',
      action: 'Iniciar Aplicação',
      nextStatus: ProcessStatus.ADHESIVE,
      actionIcon: <Play className="w-4 h-4"/>,
      belongsTo: ['ADHESIVE']
    },
    {
      id: ProcessStatus.ADHESIVE,
      title: 'Aplicando',
      fullTitle: 'Aplicando Adesivo',
      icon: <Sticker className="w-5 h-5"/>,
      color: 'border-purple-400',
      bgHeader: 'bg-purple-50',
      action: 'Finalizar Peça',
      nextStatus: ProcessStatus.COMPLETED,
      actionIcon: <CheckCircle2 className="w-4 h-4"/>,
      belongsTo: ['ADHESIVE']
    }
  ];

  const displayedColumns = allColumns.filter(col => col.belongsTo.includes(viewMode));

  return (
    <div className="flex flex-col h-full">
        
        {/* MOBILE TABS (Visible only on mobile) */}
        <div className="flex lg:hidden mb-4 bg-white rounded-lg p-1 shadow-sm">
            {displayedColumns.map((col, index) => (
                <button
                    key={col.id}
                    onClick={() => setMobileTab(index)}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition ${mobileTab === index ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500'}`}
                >
                    {col.title}
                </button>
            ))}
            {viewMode === 'ADHESIVE' && (
                <button
                    onClick={() => setMobileTab(displayedColumns.length)}
                    className={`flex-1 py-2 text-xs font-bold rounded-md transition ${mobileTab === displayedColumns.length ? 'bg-green-600 text-white shadow-md' : 'text-slate-500'}`}
                >
                    Finalizados
                </button>
            )}
        </div>

        {/* COLUMNS CONTAINER */}
        <div className="flex-1 lg:flex lg:gap-6 h-full overflow-y-auto lg:overflow-x-auto pb-2 box-border custom-scrollbar">
        
        {/* ACTIVE COLUMNS */}
        {displayedColumns.map((col, index) => (
            <div key={col.id} className={`flex-shrink-0 w-full lg:w-80 xl:w-96 flex flex-col h-full transition-opacity duration-300 ${mobileTab === index ? 'flex' : 'hidden lg:flex'}`}>
                <div className={`p-4 rounded-t-xl border-t-4 ${col.color} ${col.bgHeader} shadow-sm mb-0 flex items-center justify-between z-10`}>
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                        {col.icon} {col.fullTitle}
                        </h3>
                        {col.hasCallButton && onCallPresence && (
                            <button 
                                onClick={onCallPresence}
                                className="p-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-full transition-transform hover:scale-110 shadow-md animate-pulse"
                                title="Solicitar Presença no Setor"
                            >
                                <Megaphone className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    <span className="bg-white text-slate-700 text-sm px-3 py-1 rounded-full font-bold shadow-sm border border-slate-100">
                        {getSortedItems(col.id).length}
                    </span>
                </div>
                <div className="flex-1 bg-slate-100/80 border-x border-b border-slate-200 rounded-b-xl p-3 overflow-y-auto custom-scrollbar">
                    {getSortedItems(col.id).map(item => (
                        <ItemCard
                            key={item.id}
                            item={item}
                            onNext={() => onUpdateStatus(item.id, col.nextStatus)}
                            onRework={() => onUpdateStatus(item.id, ProcessStatus.REWORK)}
                            actionLabel={col.action}
                            icon={col.actionIcon}
                        />
                    ))}
                    {getSortedItems(col.id).length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm italic p-8">
                            <div className="mb-2 opacity-50">Nenhum item nesta etapa</div>
                        </div>
                    )}
                </div>
            </div>
        ))}
        
        {/* COMPLETED COLUMN (Adhesive Mode Only) */}
        {viewMode === 'ADHESIVE' && (
            <div className={`flex-shrink-0 w-full lg:w-80 xl:w-96 flex flex-col h-full opacity-90 transition-opacity duration-300 ${mobileTab === displayedColumns.length ? 'flex' : 'hidden lg:flex'}`}>
            <div className="bg-slate-200 p-4 rounded-t-xl border-t-4 border-slate-400 shadow-sm mb-0 flex items-center justify-between z-10">
                <h3 className="font-bold text-slate-700 text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5"/> Finalizados
                </h3>
                <span className="bg-white text-slate-600 text-sm px-3 py-1 rounded-full font-bold shadow-sm">
                    {getSortedItems(ProcessStatus.COMPLETED).length}
                </span>
            </div>
            <div className="flex-1 bg-slate-100 rounded-b-xl p-3 overflow-y-auto border-x border-b border-slate-200 custom-scrollbar">
                {getSortedItems(ProcessStatus.COMPLETED).slice(0, 10).map(item => (
                    <div key={item.id} className="p-4 rounded-lg bg-white mb-3 shadow-sm border border-slate-100 flex justify-between items-center">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1 mb-0.5">
                            <span className="text-[9px] bg-slate-100 px-1 rounded border border-slate-200 font-mono text-slate-500">{item.calculo}</span>
                            </div>
                            <div className="font-bold text-sm text-slate-700">{item.productName}</div>
                        </div>
                        <div className="flex flex-col items-end">
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded font-medium">x{item.quantity}</span>
                            {item.adhesiveFinishedAt && (
                                <span className="text-[10px] text-slate-400 mt-1">
                                {item.adhesiveFinishedAt.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            </div>
        )}
        </div>
    </div>
  );
};
