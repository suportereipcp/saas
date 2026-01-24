'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { ProductionItem, TransferStatus } from '../types';
import { TransferTable } from './components/TransferTable';
import { TransferFilters } from './components/TransferFilters';
import { ArrowLeft, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function TransferenciaPage() {
    const router = useRouter();
    const [items, setItems] = useState<ProductionItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState<TransferStatus | 'ALL'>('ALL');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [page, setPage] = useState(0);
    const [totalCount, setTotalCount] = useState(0);
    const ROWS_PER_PAGE = 10;

    const fetchItems = useCallback(async () => {
        setIsLoading(true);
        try {
            let query = supabase
                .schema('app_controle_prazo_qualidade')
                .from('production_items')
                .select('*', { count: 'estimated' })
                .order('created_at', { ascending: false });

            // Apply Filters
            if (statusFilter !== 'ALL') {
                if (statusFilter === 'PENDING') {
                    // Include nulls as pending
                    query = query.or(`transfer_status.eq.PENDING,transfer_status.is.null`);
                } else {
                    query = query.eq('transfer_status', statusFilter);
                }
            }

            if (startDate) {
                query = query.gte('created_at', `${startDate}T00:00:00`);
            }
            if (endDate) {
                query = query.lte('created_at', `${endDate}T23:59:59`);
            }

            // Pagination
            const from = page * ROWS_PER_PAGE;
            const to = from + ROWS_PER_PAGE - 1;
            query = query.range(from, to);

            const { data, count, error } = await query;

            if (error) throw error;

            // Normalize data (treat null transfer_status as PENDING)
            const normalizedData = (data || []).map(item => ({
                ...item,
                transfer_status: item.transfer_status || 'PENDING'
            }));

            setItems(normalizedData);
            if (count !== null) setTotalCount(count);

        } catch (error: any) {
            console.error("Error fetching transfer items detailed:", JSON.stringify(error, null, 2));
            if (error?.code === '42703') {
                alert("ERRO DE CONFIGURAÇÃO: A coluna 'transfer_status' não foi encontrada no banco de dados. Por favor, execute o script de migração SQL fornecido.");
            }
        } finally {
            setIsLoading(false);
        }
    }, [statusFilter, startDate, endDate, page]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    // Reset page when filters change
    useEffect(() => {
        setPage(0);
    }, [statusFilter, startDate, endDate]);

    const handleUpdateStatus = async (id: string, newStatus: TransferStatus) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const userEmail = user?.email || 'Sistema';

            const { error } = await supabase
                .schema('app_controle_prazo_qualidade')
                .from('production_items')
                .update({
                    transfer_status: newStatus,
                    transfer_updated_at: new Date().toISOString(),
                    transfer_updated_by: userEmail
                })
                .eq('id', id);

            if (error) throw error;

            // Refresh data
            fetchItems();

        } catch (error) {
            console.error("Error updating status:", error);
            alert("Erro ao atualizar status. Verifique o console.");
        }
    };

    const totalPages = Math.ceil(totalCount / ROWS_PER_PAGE);

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans text-slate-900">
            <div className="max-w-[1600px] mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-3 text-slate-500 hover:text-slate-900 mb-2"
                            onClick={() => router.back()}
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                        </Button>
                        <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                            <Box className="w-8 h-8 text-emerald-600" />
                            LOGÍSTICA DE ENTRADA
                        </h1>
                        <p className="text-slate-500 font-medium">Gerenciamento de transferências e validação PCP</p>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-6">
                    <TransferFilters
                        currentStatus={statusFilter}
                        onStatusChange={setStatusFilter}
                        startDate={startDate}
                        endDate={endDate}
                        onDateChange={(s, e) => { setStartDate(s); setEndDate(e); }}
                    />

                    <TransferTable
                        items={items}
                        onUpdateStatus={handleUpdateStatus}
                        isLoading={isLoading}
                    />

                    {/* Pagination Controls */}
                    <div className="flex justify-center gap-4 mt-8">
                        <Button
                            variant="outline"
                            disabled={page === 0 || isLoading}
                            onClick={() => setPage(p => Math.max(0, p - 1))}
                        >
                            Anterior
                        </Button>
                        <span className="flex items-center font-mono text-sm text-slate-500">
                            Página {page + 1} de {totalPages || 1}
                        </span>
                        <Button
                            variant="outline"
                            disabled={page >= totalPages - 1 || isLoading}
                            onClick={() => setPage(p => p + 1)}
                        >
                            Próximo
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
