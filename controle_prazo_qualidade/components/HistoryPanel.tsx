
import React, { useState, useMemo } from 'react';
import { ProductionItem, Product } from '../types';
import { Search, Filter, ChevronLeft, ChevronRight, History, Play, AlertCircle, CheckCircle, Calendar, Hash, Package } from 'lucide-react';

interface HistoryPanelProps {
  items: ProductionItem[];
  products: Product[];
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ items, products }) => {
  // Filters Draft State
  const [draftSearchTerm, setDraftSearchTerm] = useState('');
  const [draftProcess, setDraftProcess] = useState<'ALL' | 'WASHING' | 'ADHESIVE'>('ALL');
  const [draftStartDate, setDraftStartDate] = useState('');
  const [draftEndDate, setDraftEndDate] = useState('');

  // Active Filters State
  const [hasSearched, setHasSearched] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    search: '',
    process: 'ALL' as 'ALL' | 'WASHING' | 'ADHESIVE',
    start: '',
    end: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleFilterClick = () => {
    setActiveFilters({
      search: draftSearchTerm,
      process: draftProcess,
      start: draftStartDate,
      end: draftEndDate
    });
    setHasSearched(true);
    setCurrentPage(1);
  };

  // Helper to format Date
  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return date.toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit'
    });
  };

  // Logic for Processing Items based on filter
  const processedItems = useMemo(() => {
    if (!hasSearched) return [];

    return items.map(item => {
        const product = products.find(p => p.id === item.productId);
        if (!product) return null;

        let reportRow = {
            id: item.id,
            sequentialId: item.sequentialId,
            calculo: item.calculo,
            listNumber: item.listNumber,
            productName: product.name,
            quantity: item.quantity,
            rawItem: item,
            // Dynamic fields
            arrivalAt: undefined as Date | undefined, // "Chegada na Fila"
            startedAt: undefined as Date | undefined, // "Início"
            finishedAt: undefined as Date | undefined, // "Finalizado"
            statusLabel: 'N/A',
            isLate: false,
            deadlineMinutes: 0
        };

        // Washing View Logic
        if (activeFilters.process === 'WASHING') {
            reportRow.arrivalAt = item.blastedAt;
            reportRow.startedAt = item.washStartedAt;
            reportRow.finishedAt = item.washFinishedAt;
            reportRow.deadlineMinutes = product.washDeadlineMinutes;

            if (reportRow.startedAt && reportRow.arrivalAt) {
                const deadlineTime = reportRow.arrivalAt.getTime() + (product.washDeadlineMinutes * 60000);
                reportRow.isLate = reportRow.startedAt.getTime() > deadlineTime;
                reportRow.statusLabel = reportRow.isLate ? 'Atrasou Início' : 'No Prazo';
            } else if (reportRow.arrivalAt && !reportRow.startedAt) {
                 // Not started yet, check if already late
                 const now = new Date().getTime();
                 const deadlineTime = reportRow.arrivalAt.getTime() + (product.washDeadlineMinutes * 60000);
                 if (now > deadlineTime) {
                     reportRow.isLate = true;
                     reportRow.statusLabel = 'Atrasado (Fila)';
                 } else {
                     reportRow.statusLabel = 'Aguardando';
                 }
            }

        } 
        // Adhesive View Logic
        else if (activeFilters.process === 'ADHESIVE') {
            reportRow.arrivalAt = item.washFinishedAt; // Enters queue when wash finishes
            reportRow.startedAt = item.adhesiveStartedAt;
            reportRow.finishedAt = item.adhesiveFinishedAt;
            reportRow.deadlineMinutes = product.adhesiveDeadlineMinutes;
            
            if (!reportRow.arrivalAt) {
                // Not reached adhesive queue yet
                reportRow.statusLabel = 'Aguardando Lavagem';
            } else {
                if (reportRow.startedAt) {
                    const deadlineTime = reportRow.arrivalAt.getTime() + (product.adhesiveDeadlineMinutes * 60000);
                    reportRow.isLate = reportRow.startedAt.getTime() > deadlineTime;
                    reportRow.statusLabel = reportRow.isLate ? 'Atrasou Início' : 'No Prazo';
                } else {
                     const now = new Date().getTime();
                     const deadlineTime = reportRow.arrivalAt.getTime() + (product.adhesiveDeadlineMinutes * 60000);
                     if (now > deadlineTime) {
                         reportRow.isLate = true;
                         reportRow.statusLabel = 'Atrasado (Fila)';
                     } else {
                         reportRow.statusLabel = 'Aguardando';
                     }
                }
            }
        }
        // ALL View Logic
        else {
             reportRow.arrivalAt = item.blastedAt; // Global start
             reportRow.startedAt = item.washStartedAt; // First action
             reportRow.finishedAt = item.adhesiveFinishedAt; // Global finish
             reportRow.statusLabel = item.adhesiveFinishedAt ? 'Finalizado' : 'Em Processo';
        }

        return reportRow;

    }).filter(row => {
        if (!row) return false;
        
        // Search Filter
        const searchMatch = 
            row.calculo.toLowerCase().includes(activeFilters.search.toLowerCase()) ||
            row.productName.toLowerCase().includes(activeFilters.search.toLowerCase());
        
        if (!searchMatch) return false;

        // Date Filter
        if (!row.arrivalAt) return false; 
        
        const refDate = row.arrivalAt;
        let dateMatch = true;
        
        if (activeFilters.start) {
            const [y, m, d] = activeFilters.start.split('-').map(Number);
            const startDate = new Date(y, m - 1, d, 0, 0, 0, 0);
            if (refDate < startDate) dateMatch = false;
        }
        
        if (activeFilters.end) {
            const [y, m, d] = activeFilters.end.split('-').map(Number);
            const endDate = new Date(y, m - 1, d, 23, 59, 59, 999);
            if (refDate > endDate) dateMatch = false;
        }

        return dateMatch;
    }).sort((a, b) => {
        const timeA = a?.arrivalAt?.getTime() || 0;
        const timeB = b?.arrivalAt?.getTime() || 0;
        return timeB - timeA;
    });
  }, [items, products, activeFilters, hasSearched]);

  // Pagination
  const safeProcessedItems = (processedItems || []) as NonNullable<typeof processedItems[0]>[];
  const totalPages = Math.ceil(safeProcessedItems.length / itemsPerPage);
  const paginatedItems = safeProcessedItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) setCurrentPage(newPage);
  };

  return (
    <div className="space-y-6 h-full flex flex-col pb-20 lg:pb-0">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
           <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
             <History className="w-6 h-6 text-blue-600" />
             Histórico de Produção
           </h2>
        </div>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
           <div className="relative md:col-span-2">
             <label className="text-xs text-slate-500 font-semibold mb-1 block">Busca (Produto/Cálculo)</label>
             <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                  placeholder="Ex: Lote 123, Engrenagem..."
                  value={draftSearchTerm}
                  onChange={(e) => setDraftSearchTerm(e.target.value)}
                />
             </div>
           </div>
           
           <div>
             <label className="text-xs text-slate-500 font-semibold mb-1 block">Processo</label>
             <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                <select 
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 appearance-none"
                  value={draftProcess}
                  onChange={(e) => setDraftProcess(e.target.value as any)}
                >
                  <option value="ALL">Todos</option>
                  <option value="WASHING">Lavagem</option>
                  <option value="ADHESIVE">Adesivo</option>
                </select>
             </div>
           </div>

           <div className="grid grid-cols-2 gap-2 md:col-span-1">
             <div>
                <label className="text-xs text-slate-500 font-semibold mb-1 block">Início</label>
                <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input 
                    type="date" 
                    className="w-full pl-9 pr-2 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                    value={draftStartDate}
                    onChange={(e) => setDraftStartDate(e.target.value)}
                    />
                </div>
             </div>
             <div>
                <label className="text-xs text-slate-500 font-semibold mb-1 block">Fim</label>
                <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input 
                    type="date" 
                    className="w-full pl-9 pr-2 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
                    value={draftEndDate}
                    onChange={(e) => setDraftEndDate(e.target.value)}
                    />
                </div>
             </div>
           </div>

           <button 
             onClick={handleFilterClick}
             className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition shadow-sm"
           >
             <Play className="w-4 h-4" fill="currentColor" />
             Filtrar
           </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col overflow-hidden">
        
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-800 font-semibold uppercase tracking-wider text-xs sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 border-b border-slate-200">ID / Ref.</th>
                <th className="px-6 py-3 border-b border-slate-200">
                    Chegada (Fila)
                </th>
                <th className="px-6 py-3 border-b border-slate-200">
                    Início
                </th>
                <th className="px-6 py-3 border-b border-slate-200">
                    Finalizado
                </th>
                <th className="px-6 py-3 border-b border-slate-200">
                   {activeFilters.process === 'ALL' ? 'Status Geral' : 'Status Prazo'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!hasSearched ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Filter className="w-12 h-12 mb-3 opacity-20" />
                      <p className="text-lg font-medium text-slate-600">Aguardando Filtro</p>
                      <p className="text-sm">Selecione os parâmetros acima e clique em "Filtrar" para visualizar o relatório.</p>
                    </div>
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                paginatedItems.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                         <div className="flex items-center gap-2 mb-1">
                            <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded text-xs font-mono">#{row.sequentialId}</span>
                            {row.listNumber && <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold">Lista {row.listNumber}</span>}
                         </div>
                         <span className="font-bold text-slate-800 flex items-center gap-2">
                            <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs border border-slate-200">{row.calculo}</span>
                            {row.productName}
                         </span>
                         <span className="text-xs text-slate-500">Qtd: {row.quantity}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{formatDate(row.arrivalAt)}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{formatDate(row.startedAt)}</td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{formatDate(row.finishedAt)}</td>
                    <td className="px-6 py-4">
                       {activeFilters.process === 'ALL' ? (
                          <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                             {row.statusLabel}
                          </span>
                       ) : (
                          <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center w-fit gap-1 ${
                            row.isLate 
                              ? 'bg-red-100 text-red-700 border border-red-200' 
                              : 'bg-green-100 text-green-700 border border-green-200'
                          }`}>
                             {row.isLate ? <AlertCircle className="w-3 h-3"/> : <CheckCircle className="w-3 h-3"/>}
                             {row.statusLabel}
                          </span>
                       )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD LIST */}
        <div className="md:hidden p-4 space-y-3">
            {!hasSearched && (
                <div className="text-center text-slate-400 py-8 text-sm">Utilize o filtro acima.</div>
            )}
            {hasSearched && paginatedItems.length === 0 && (
                <div className="text-center text-slate-400 py-8 text-sm">Nenhum registro.</div>
            )}
            {hasSearched && paginatedItems.map((row) => (
                <div key={row.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div>
                            <div className="flex gap-2 mb-1">
                                <span className="bg-slate-800 text-white px-1.5 py-0.5 rounded text-xs font-mono">#{row.sequentialId}</span>
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs border font-mono">{row.calculo}</span>
                            </div>
                            <h4 className="font-bold text-sm text-slate-900">{row.productName}</h4>
                        </div>
                        <span className={`px-2 py-1 rounded text-[10px] font-bold ${row.isLate && activeFilters.process !== 'ALL' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {row.statusLabel}
                        </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mt-3 bg-slate-50 p-2 rounded">
                        <div>
                            <span className="block font-bold text-slate-400 text-[10px] uppercase">Chegada</span>
                            {formatDate(row.arrivalAt)}
                        </div>
                        <div>
                            <span className="block font-bold text-slate-400 text-[10px] uppercase">Início</span>
                            {formatDate(row.startedAt)}
                        </div>
                        <div>
                            <span className="block font-bold text-slate-400 text-[10px] uppercase">Fim</span>
                            {formatDate(row.finishedAt)}
                        </div>
                        <div>
                            <span className="block font-bold text-slate-400 text-[10px] uppercase">Qtd</span>
                            {row.quantity}
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* Pagination */}
        {hasSearched && safeProcessedItems.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between bg-slate-50 gap-4">
             <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Exibir:</span>
                  <select 
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={9999}>Todos</option>
                  </select>
                </div>
                <span>
                   {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, safeProcessedItems.length)} de {safeProcessedItems.length}
                </span>
             </div>
             
             {totalPages > 1 && (
               <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium text-slate-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};
