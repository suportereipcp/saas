import React from 'react';
import { X, CheckCircle, Package, Layers, ArrowRight } from 'lucide-react';

interface ImportSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    totalItems: number;
    totalQty: number;
    byProduct: Record<string, number>;
  } | null;
}

export const ImportSummaryModal: React.FC<ImportSummaryModalProps> = ({ isOpen, onClose, data }) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-all">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-300 transform scale-100">
        
        {/* Header */}
        <div className="bg-emerald-600 p-6 text-white flex justify-between items-start">
           <div>
             <h2 className="text-xl font-bold flex items-center gap-2">
               <CheckCircle className="w-6 h-6" /> Importação Concluída
             </h2>
             <p className="text-emerald-100 text-sm mt-1 opacity-90">Os dados foram processados e salvos.</p>
           </div>
           <button 
             onClick={onClose} 
             className="text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition"
           >
             <X className="w-5 h-5" />
           </button>
        </div>
        
        {/* Body */}
        <div className="p-6">
           {/* Big Stats */}
           <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center group hover:border-blue-200 transition">
                 <div className="bg-blue-100 p-2 rounded-full mb-2 group-hover:scale-110 transition-transform">
                    <Layers className="w-6 h-6 text-blue-600" />
                 </div>
                 <span className="text-3xl font-bold text-slate-800 tracking-tight">{data.totalItems}</span>
                 <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Registros</span>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center justify-center text-center group hover:border-purple-200 transition">
                 <div className="bg-purple-100 p-2 rounded-full mb-2 group-hover:scale-110 transition-transform">
                    <Package className="w-6 h-6 text-purple-600" />
                 </div>
                 <span className="text-3xl font-bold text-slate-800 tracking-tight">{data.totalQty}</span>
                 <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Peças Totais</span>
              </div>
           </div>

           {/* List */}
           <div className="mb-6">
               <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                   Resumo por Produto
                   <span className="flex-1 h-px bg-slate-100"></span>
               </h3>
               <div className="max-h-48 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                  {Object.entries(data.byProduct).map(([name, qty]) => (
                     <div key={name} className="flex justify-between items-center text-sm p-2 hover:bg-slate-50 rounded-lg transition border border-transparent hover:border-slate-100">
                        <span className="text-slate-700 font-medium truncate flex-1 pr-4">{name}</span>
                        <span className="font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md text-xs">{qty} un</span>
                     </div>
                  ))}
               </div>
           </div>
           
           {/* Footer Action */}
           <button 
             onClick={onClose}
             className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl transition shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 group"
           >
             Ir para Dashboard <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
           </button>
        </div>
      </div>
    </div>
  );
};