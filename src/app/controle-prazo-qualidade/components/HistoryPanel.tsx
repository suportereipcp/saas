import React, { useState, useMemo } from 'react';
import { ProductionItem } from '../types';
import { Search, Filter, ChevronLeft, ChevronRight, History, Play, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface HistoryPanelProps {
    items: ProductionItem[];
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ items }) => {
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

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const processedItems = useMemo(() => {
        if (!hasSearched) return [];

        return items.map(item => {
            let reportRow = {
                id: item.id,
                nr_solicitacao: item.nr_solicitacao,
                it_codigo: item.it_codigo,
                quantity: item.quantity,
                arrivalAt: undefined as string | undefined,
                startedAt: undefined as string | undefined,
                finishedAt: undefined as string | undefined,
                calculation_priority: item.calculation_priority,
                wash_finished_by: item.wash_finished_by,
                adhesive_finished_by: item.adhesive_finished_by,
                statusLabel: 'N/A',
                isLate: false,
                op_number: item.op_number,
                lupa_evaluator: item.lupa_evaluator,
                lupa_status_start: item.lupa_status_start,
                lupa_operator: item.lupa_operator,
                lupa_status_end: item.lupa_status_end
            };

            if (activeFilters.process === 'WASHING') {
                reportRow.arrivalAt = item.datasul_finished_at;
                reportRow.startedAt = item.wash_started_at;
                reportRow.finishedAt = item.wash_finished_at;

                if (reportRow.startedAt && reportRow.arrivalAt) {
                    const startTS = new Date(reportRow.startedAt).getTime();
                    const deadlineTS = item.wash_deadline ? new Date(item.wash_deadline).getTime() : startTS + 3600000;
                    reportRow.isLate = startTS > deadlineTS;
                    reportRow.statusLabel = reportRow.isLate ? 'Atrasou Início' : 'No Prazo';
                } else {
                    reportRow.statusLabel = item.wash_started_at ? 'Em Lavagem' : 'Aguardando';
                }
            }
            else if (activeFilters.process === 'ADHESIVE') {
                reportRow.arrivalAt = item.wash_finished_at;
                reportRow.startedAt = item.adhesive_started_at;
                reportRow.finishedAt = item.adhesive_finished_at;

                if (reportRow.startedAt && reportRow.arrivalAt) {
                    const startTS = new Date(reportRow.startedAt).getTime();
                    const deadlineTS = item.adhesive_deadline ? new Date(item.adhesive_deadline).getTime() : startTS + 3600000;
                    reportRow.isLate = startTS > deadlineTS;
                    reportRow.statusLabel = reportRow.isLate ? 'Atrasou Início' : 'No Prazo';
                } else {
                    reportRow.statusLabel = item.adhesive_started_at ? 'Em Aplicação' : 'Aguardando';
                }
            }
            else {
                reportRow.arrivalAt = item.datasul_finished_at;
                reportRow.startedAt = item.wash_started_at;
                reportRow.finishedAt = item.adhesive_finished_at;
                reportRow.statusLabel = item.status === 'WASHING' ? 'LAVAGEM' :
                    item.status === 'ADHESIVE' ? 'ADESIVO' :
                        item.status === 'FINISHED' ? 'FINALIZADO' : item.status;
            }

            return reportRow;

        }).filter(row => {
            if (!row) return false;

            const searchMatch =
                (row.nr_solicitacao?.toString() || '').includes(activeFilters.search) ||
                (row.it_codigo?.toLowerCase() || '').includes(activeFilters.search.toLowerCase());

            if (!searchMatch) return false;

            if (!row.arrivalAt) return false;

            // Normalize references to YYYY-MM-DD strings for consistent filtering
            const refDateVal = new Date(row.arrivalAt);
            const refDateStr = refDateVal.toLocaleDateString('pt-BR', { year: 'numeric', month: '2-digit', day: '2-digit' }).split('/').reverse().join('-');

            let dateMatch = true;

            if (activeFilters.start) {
                // activeFilters.start is YYYY-MM-DD
                if (refDateStr < activeFilters.start) dateMatch = false;
            }

            if (activeFilters.end) {
                // activeFilters.end is YYYY-MM-DD
                if (refDateStr > activeFilters.end) dateMatch = false;
            }

            return dateMatch;
        }).sort((a, b) => {
            const timeA = a.arrivalAt ? new Date(a.arrivalAt).getTime() : 0;
            const timeB = b.arrivalAt ? new Date(b.arrivalAt).getTime() : 0;
            return timeB - timeA;
        });
    }, [items, activeFilters, hasSearched]);

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
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="w-6 h-6 text-emerald-400" />
                        Histórico de Produção
                    </CardTitle>
                </CardHeader>

                <CardContent>
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground">Busca (Sol./Item)</label>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    placeholder="Número da solicitação ou item"
                                    value={draftSearchTerm}
                                    onChange={(e) => setDraftSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-muted-foreground">Processo</label>
                            <Select value={draftProcess} onValueChange={(val) => setDraftProcess(val as any)}>
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
                                    value={draftStartDate}
                                    onChange={(e) => setDraftStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2 flex-1">
                                <label className="text-xs font-semibold text-muted-foreground">Fim</label>
                                <Input
                                    type="date"
                                    className="px-2"
                                    value={draftEndDate}
                                    onChange={(e) => setDraftEndDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <Button onClick={handleFilterClick} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white">
                            <Play className="w-4 h-4 mr-2" fill="currentColor" />
                            Filtrar
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card className="flex-1 flex flex-col overflow-hidden">
                <div className="hidden md:block overflow-x-auto flex-1">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-semibold uppercase tracking-wider text-xs sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 border-b border-slate-200">ID / Ref.</th>
                                <th className="px-6 py-3 border-b border-slate-200">OP</th>
                                <th className="px-6 py-3 border-b border-slate-200">Chegada (Fila)</th>
                                <th className="px-6 py-3 border-b border-slate-200">Início</th>
                                <th className="px-6 py-3 border-b border-slate-200">Finalizado</th>
                                <th className="px-6 py-3 border-b border-slate-200">Lupa Início</th>
                                <th className="px-6 py-3 border-b border-slate-200">Lupa Fim</th>
                                <th className="px-6 py-3 border-b border-slate-200">
                                    {activeFilters.process === 'ALL' ? 'Status Geral' : 'Status Prazo'}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!hasSearched ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-16 text-center">
                                        <p className="text-lg font-medium text-slate-600">Aguardando Filtro</p>
                                    </td>
                                </tr>
                            ) : paginatedItems.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground">
                                        Nenhum registro encontrado.
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map((row) => (
                                    <tr key={row.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-800 flex items-center gap-2">
                                                    <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-xs border border-slate-200">{row.nr_solicitacao}</span>
                                                    {row.it_codigo}
                                                </span>
                                                <span className="text-xs text-muted-foreground">Qtd: {row.quantity}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded">
                                                {row.op_number || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-600">{formatDate(row.arrivalAt)}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-600">{formatDate(row.startedAt)}</td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-600">{formatDate(row.finishedAt)}</td>
                                        <td className="px-6 py-4">
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
                                        <td className="px-6 py-4">
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
                                        <td className="px-6 py-4">
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

                {/* Pagination */}
                {
                    hasSearched && safeProcessedItems.length > 0 && (
                        <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between bg-slate-50 gap-4">
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span>
                                    {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, safeProcessedItems.length)} de {safeProcessedItems.length}
                                </span>
                            </div>

                            {totalPages > 1 && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handlePageChange(currentPage - 1)}
                                        disabled={currentPage === 1}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </Button>
                                    <span className="text-sm font-medium text-slate-700">
                                        {currentPage} / {totalPages}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handlePageChange(currentPage + 1)}
                                        disabled={currentPage === totalPages}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    )
                }
            </Card >
        </div >
    );
};
