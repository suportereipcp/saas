import React, { useState, useEffect, useCallback } from 'react';
import { ProductionItem } from '../types';
import { Search, ChevronLeft, ChevronRight, History, Play, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
// Filter icon was unused, removed.
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';

interface HistoryPanelProps {
    // items: ProductionItem[]; // Removed to avoid confusion. We fetch our own data.
}

export const HistoryPanel: React.FC<HistoryPanelProps> = () => {
    // Filters State
    const [searchTerm, setSearchTerm] = useState('');
    const [processFilter, setProcessFilter] = useState<'ALL' | 'WASHING' | 'ADHESIVE'>('ALL');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Active Filters for Pagination (so changing inputs doesn't trigger fetch until "Filter" is clicked)
    const [activeFilters, setActiveFilters] = useState({
        searchTerm: '',
        processFilter: 'ALL' as 'ALL' | 'WASHING' | 'ADHESIVE',
        startDate: '',
        endDate: ''
    });

    // Data State
    const [displayedItems, setDisplayedItems] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [totalServerItems, setTotalServerItems] = useState(0);

    // Initial Fetch
    useEffect(() => {
        // Initial load with default filters (empty)
        fetchData(1, {
            searchTerm: '',
            processFilter: 'ALL',
            startDate: '',
            endDate: ''
        });
    }, []);

    const mapItemsToRows = (data: any[]) => {
        return data.map(item => {
            let reportRow = {
                id: item.id,
                nr_solicitacao: item.nr_solicitacao,
                it_codigo: item.it_codigo,
                quantity: item.quantity,
                arrivalAt: item.datasul_finished_at,
                startedAt: item.wash_started_at,
                finishedAt: item.adhesive_finished_at,
                calculation_priority: item.calculation_priority,
                wash_finished_by: item.wash_finished_by,
                adhesive_finished_by: item.adhesive_finished_by,
                statusLabel: 'N/A',
                isLate: false,
                op_number: item.op_number,
                lupa_evaluator: item.lupa_evaluator,
                lupa_status_start: item.lupa_status_start,
                lupa_operator: item.lupa_operator,
                lupa_status_end: item.lupa_status_end,
                status: item.status
            };

            // Logic for specific status display based on item status
            if (item.status === 'WASHING') {
                reportRow.startedAt = item.wash_started_at;
                reportRow.finishedAt = item.wash_finished_at;
                const startTS = item.wash_started_at ? new Date(item.wash_started_at).getTime() : 0;
                const deadlineTS = item.wash_deadline ? new Date(item.wash_deadline).getTime() : startTS + 3600000;
                reportRow.isLate = startTS > deadlineTS;
                reportRow.statusLabel = item.wash_started_at ? 'LAVAGEM' : 'AGUARDANDO';
            } else if (item.status === 'ADHESIVE') {
                reportRow.arrivalAt = item.wash_finished_at;
                reportRow.startedAt = item.adhesive_started_at;
                reportRow.finishedAt = item.adhesive_finished_at;
                const startTS = item.adhesive_started_at ? new Date(item.adhesive_started_at).getTime() : 0;
                const deadlineTS = item.adhesive_deadline ? new Date(item.adhesive_deadline).getTime() : startTS + 3600000;
                reportRow.isLate = startTS > deadlineTS;
                reportRow.statusLabel = item.adhesive_started_at ? 'ADESIVO' : 'AGUARDANDO';
            } else {
                reportRow.statusLabel = item.status === 'FINISHED' ? 'FINALIZADO' : item.status;
            }

            return reportRow;
        });
    };

    const fetchData = async (page: number, filters: typeof activeFilters) => {
        setIsSearching(true);
        try {
            // Calculate Range
            const from = (page - 1) * itemsPerPage;
            const to = from + itemsPerPage - 1;

            // Base Query on View
            let query = supabase
                .schema('app_controle_prazo_qualidade')
                .from('production_items_view')
                .select('*', { count: 'exact' }) // Request exact count for pagination
                .order('created_at', { ascending: false })
                .range(from, to);

            // Apply Filters
            if (filters.searchTerm) {
                // Check if it's a number (solicitation) or text (item code)
                if (!isNaN(Number(filters.searchTerm))) {
                    query = query.eq('nr_solicitacao', filters.searchTerm);
                } else {
                    query = query.ilike('it_codigo', `%${filters.searchTerm}%`);
                }
            }

            if (filters.processFilter !== 'ALL') {
                query = query.eq('status', filters.processFilter);
            }

            if (filters.startDate) {
                query = query.gte('created_at', `${filters.startDate}T00:00:00`);
            }

            if (filters.endDate) {
                query = query.lte('created_at', `${filters.endDate}T23:59:59`);
            }

            const { data: viewData, count, error: viewError } = await query;

            if (viewError) throw viewError;

            // Update Total Count
            if (count !== null) setTotalServerItems(count);

            // Fetch Table Details (OP, Lupa, etc) for these IDs
            if (viewData && viewData.length > 0) {
                const ids = viewData.map((i: any) => i.id);
                const { data: tableData, error: tableError } = await supabase
                    .schema('app_controle_prazo_qualidade')
                    .from('production_items')
                    .select('id, op_number, lupa_evaluator, lupa_operator, lupa_status_start, lupa_status_end')
                    .in('id', ids);

                if (tableError) throw tableError;

                // Merge Data
                const mergedData = viewData.map((viewItem: any) => {
                    const tableItem = tableData?.find((t: any) => t.id === viewItem.id);
                    return {
                        ...viewItem,
                        op_number: tableItem?.op_number || viewItem.op_number,
                        lupa_evaluator: tableItem?.lupa_evaluator || viewItem.lupa_evaluator,
                        lupa_operator: tableItem?.lupa_operator || viewItem.lupa_operator,
                        lupa_status_start: tableItem?.lupa_status_start || viewItem.lupa_status_start,
                        lupa_status_end: tableItem?.lupa_status_end || viewItem.lupa_status_end
                    };
                });

                setDisplayedItems(mapItemsToRows(mergedData));
            } else {
                setDisplayedItems([]);
            }

        } catch (error) {
            console.error("Erro na busca:", error);
            // Fallback?
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchClick = () => {
        // Update active filters and fetch page 1
        const newFilters = {
            searchTerm,
            processFilter,
            startDate,
            endDate
        };
        setActiveFilters(newFilters);
        setCurrentPage(1);
        fetchData(1, newFilters);
    };

    const handlePageChange = (newPage: number) => {
        const totalPages = Math.ceil(totalServerItems / itemsPerPage);
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            fetchData(newPage, activeFilters);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Calculate total pages based on server count
    const totalPages = Math.ceil(totalServerItems / itemsPerPage);

    return (
        <div className="space-y-2 p-2 h-full overflow-y-auto">
            <Card className="shrink-0">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <History className="w-5 h-5 text-emerald-400" />
                        Histórico de Produção
                    </CardTitle>
                </CardHeader>

                <CardContent className="pb-2">
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground">Busca (Sol./Item)</label>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    placeholder="Número da solicitação ou item"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground">Processo</label>
                            <Select value={processFilter} onValueChange={(val) => setProcessFilter(val as any)}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Processo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos</SelectItem>
                                    <SelectItem value="WASHING">Lavagem</SelectItem>
                                    <SelectItem value="ADHESIVE">Adesivo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-2 md:col-span-1">
                            <div className="space-y-2 flex-1">
                                <label className="text-xs font-semibold text-muted-foreground">Início</label>
                                <Input
                                    type="date"
                                    className="px-2"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 flex-1">
                                <label className="text-xs font-semibold text-muted-foreground">Fim</label>
                                <Input
                                    type="date"
                                    className="px-2"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="md:pl-2">
                            <Button
                                onClick={handleSearchClick}
                                disabled={isSearching}
                                className="w-full md:w-32 bg-emerald-500 hover:bg-emerald-600 text-white"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-2" fill="currentColor" />}
                                Filtrar
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="flex flex-col shrink-0">
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-semibold uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-6 py-3 border-b border-slate-200">ID / Ref.</th>
                                <th className="px-6 py-3 border-b border-slate-200">OP</th>
                                <th className="px-6 py-3 border-b border-slate-200">Chegada (Fila)</th>
                                <th className="px-6 py-3 border-b border-slate-200">Início</th>
                                <th className="px-6 py-3 border-b border-slate-200">Finalizado</th>
                                <th className="px-6 py-3 border-b border-slate-200">Lupa Início</th>
                                <th className="px-6 py-3 border-b border-slate-200">Lupa Fim</th>
                                <th className="px-6 py-3 border-b border-slate-200">Status Geral</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 border-b border-slate-200">
                            {displayedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                                        {isSearching ? "Buscando dados..." : "Nenhum registro encontrado."}
                                    </td>
                                </tr>
                            ) : (
                                displayedItems.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-2">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 flex items-center gap-2">
                                                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs border border-slate-200">{row.nr_solicitacao}</span>
                                                    {row.it_codigo}
                                                </span>
                                                <span className="text-xs text-muted-foreground">Qtd: {row.quantity}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-2">
                                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                                {row.op_number || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-2 font-mono text-xs text-slate-600">{formatDate(row.arrivalAt)}</td>
                                        <td className="px-6 py-2 font-mono text-xs text-slate-600">{formatDate(row.startedAt)}</td>
                                        <td className="px-6 py-2 font-mono text-xs text-slate-600">{formatDate(row.finishedAt)}</td>
                                        <td className="px-6 py-2">
                                            {row.lupa_evaluator ? (
                                                <div className="flex flex-col text-xs">
                                                    <span className="font-bold text-slate-700">{row.lupa_evaluator}</span>
                                                    <span className={cn(
                                                        "text-[10px] uppercase font-bold",
                                                        row.lupa_status_start === 'APPROVED' ? "text-emerald-600" : "text-slate-400"
                                                    )}>
                                                        {row.lupa_status_start === 'APPROVED' ? 'Liberado' : row.lupa_status_start}
                                                    </span>
                                                </div>
                                            ) : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-6 py-2">
                                            {row.lupa_operator ? (
                                                <div className="flex flex-col text-xs">
                                                    <span className="font-bold text-slate-700">{row.lupa_operator}</span>
                                                    <span className={cn(
                                                        "text-[10px] uppercase font-bold",
                                                        row.lupa_status_end === 'APPROVED' ? "text-emerald-600" : "text-slate-400"
                                                    )}>
                                                        {row.lupa_status_end === 'APPROVED' ? 'Finalizado' : row.lupa_status_end}
                                                    </span>
                                                </div>
                                            ) : <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-6 py-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold flex items-center w-fit gap-1 ${row.isLate
                                                ? 'bg-red-100 text-red-700 border border-red-200'
                                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                }`}>
                                                {row.isLate ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                                {row.statusLabel}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination - Always visible even if 0 items to show state */}
                <div className="px-6 py-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between bg-slate-50 gap-2 shrink-0">
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span>
                            {totalServerItems > 0
                                ? `Exibindo ${((currentPage - 1) * itemsPerPage) + 1} - ${Math.min(currentPage * itemsPerPage, totalServerItems)} de ${totalServerItems} resultados`
                                : 'Nenhum resultado encontrado'}
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1 || isSearching || totalPages <= 1}
                            className="bg-white"
                        >
                            Anterior
                        </Button>
                        <span className="text-sm font-medium text-slate-700 mx-2">
                            Página {currentPage} de {totalPages || 1}
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || isSearching || totalPages <= 1}
                            className="bg-white"
                        >
                            Próximo
                        </Button>
                    </div>
                </div>
            </Card >
        </div >
    );
};
