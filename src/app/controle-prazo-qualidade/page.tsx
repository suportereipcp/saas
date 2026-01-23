'use client';

import { useMemo, useState, useEffect, useCallback, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { DashboardPanel } from './components/DashboardPanel';
import { TVDashboard } from './components/TVDashboard';
import { PushManager } from './components/PushManager';
import { QRCodeModal } from './components/QRCodeModal';
import { KanbanBoard } from './components/KanbanBoard';
import { HistoryPanel } from './components/HistoryPanel';
import { WarehouseRequestPanel } from './components/WarehouseRequestPanel';
import { ProductionItemWithDetails, ProcessStatus, ViewState, WarehouseRequest, ProductionItem } from './types';
import { Monitor } from 'lucide-react'; // Added import for Monitor icon

function ControleQualidadeContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const view = (searchParams.get('view') as ViewState) || 'DASHBOARD';

    const [items, setItems] = useState<ProductionItem[]>([]);
    const [requests, setRequests] = useState<WarehouseRequest[]>([]);
    const [currentUser, setCurrentUser] = useState("Usuário");
    const [currentUserEmail, setCurrentUserEmail] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Busca Itens de Produção (via View que já calcula a prioridade)
            const { data: itemsData, error: itemsError } = await supabase
                .schema('app_controle_prazo_qualidade')
                .from('production_items_view')
                .select('*')
                .order('created_at', { ascending: false });

            if (itemsError) throw itemsError;
            setItems(itemsData || []);

            // Busca Solicitações de Almoxarifado
            const { data: requestsData, error: requestsError } = await supabase
                .schema('app_controle_prazo_qualidade')
                .from('warehouse_requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (requestsError) throw requestsError;
            setRequests(requestsData || []);

        } catch (error: any) {
            console.error("Erro ao buscar dados do Supabase (detalhado):",
                `Msg: ${error.message} | Code: ${error.code} | Hint: ${error.hint} | Details: ${error.details}`
            );
            console.dir(error); // Tenta mostrar o objeto de forma expansível
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && user.email) {
                const name = user.email.split('@')[0];
                setCurrentUser(name);
                setCurrentUserEmail(user.email);
            }
        };
        getUser();
        fetchData();
    }, [fetchData]);

    const handleNavigate = (newView: ViewState) => {
        router.push(`/controle-prazo-qualidade?view=${newView}`);
    };

    // Logic to calculate deadlines and delays
    const itemsWithDetails: ProductionItemWithDetails[] = useMemo(() => {
        return items.map(item => {
            let deadline: string | null = null;
            if (item.status === ProcessStatus.WASHING) deadline = item.wash_deadline || null;
            else if (item.status === ProcessStatus.ADHESIVE) deadline = item.adhesive_deadline || null;

            const isDelayed = deadline ? new Date(deadline).getTime() < new Date().getTime() : false;

            return {
                ...item,
                productName: item.it_codigo, // Voltando para o código conforme solicitado
                isDelayed,
                deadline,
                calculation_priority: item.calculation_priority,
                product_description: item.product_description // Mantemos a descrição no objeto caso precise
            };
        });
    }, [items]);

    const handleUpdateStatus = async (itemId: string, newStatus: ProcessStatus) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;

        const updates: any = { status: newStatus };

        // Lógica de Timestamps: Início e Fim de etapas
        if (newStatus === ProcessStatus.WASHING && !item.wash_started_at) {
            updates.wash_started_at = new Date().toISOString();
        } else if (newStatus === ProcessStatus.ADHESIVE) {
            // Se estava em lavagem, marca o fim da lavagem
            if (item.status === ProcessStatus.WASHING) {
                updates.wash_finished_at = new Date().toISOString();
                updates.wash_finished_by = currentUserEmail;
                // IMPORTANTE: NÃO marca o adhesive_started_at agora.
                // Isso fará o card ir para "Aguardando Adesivo" primeiro.
            }
            // Se já estava na fase de Adesivo mas não tinha começado, agora começa
            else if (item.status === ProcessStatus.ADHESIVE && !item.adhesive_started_at) {
                updates.adhesive_started_at = new Date().toISOString();
            }
        } else if (newStatus === ProcessStatus.FINISHED) {
            updates.adhesive_finished_at = new Date().toISOString();
            updates.adhesive_finished_by = currentUserEmail;
        }

        const { error } = await supabase
            .schema('app_controle_prazo_qualidade')
            .from('production_items')
            .update(updates)
            .eq('id', itemId);

        if (error) {
            console.error("Erro ao atualizar status (detalhado):",
                `Msg: ${error.message} | Code: ${error.code} | Hint: ${error.hint} | Details: ${error.details}`
            );
            alert("Falha ao salvar alteração. Verifique o console.");
        } else {
            fetchData();
        }
    };

    const handleRequestCreate = async (request: any) => {
        const { error } = await supabase
            .schema('app_controle_prazo_qualidade')
            .from('warehouse_requests')
            .insert([{
                type: request.type,
                item_code: request.item_code,
                quantity: request.quantity,
                requester: request.requester || currentUser,
                status: 'PENDING'
            }]);

        if (error) {
            console.error("Erro ao solicitar material (detalhado):",
                `Msg: ${error.message} | Code: ${error.code} | Hint: ${error.hint} | Details: ${error.details}`
            );
            alert("Erro ao enviar solicitação. Verifique o console.");
        } else {
            fetchData();
        }
    };

    const handleRequestFinish = async (requestId: string) => {
        const { error } = await supabase
            .schema('app_controle_prazo_qualidade')
            .from('warehouse_requests')
            .update({
                status: 'COMPLETED',
                completed_at: new Date().toISOString(),
                completed_by: currentUserEmail
            })
            .eq('id', requestId);

        if (error) {
            console.error("Erro ao finalizar solicitação (detalhado):",
                `Msg: ${error.message} | Code: ${error.code} | Hint: ${error.hint} | Details: ${error.details}`
            );
        } else {
            fetchData();
        }
    };

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
                    <p className="font-bold text-slate-600 animate-pulse">Sincronizando com Supabase...</p>
                </div>
            </div>
        );
    }

    if (view === 'TV_DASHBOARD') {
        return (
            <TVDashboard
                items={itemsWithDetails}
                warehouseRequests={requests}
                userEmail={currentUserEmail}
                onSimulateTime={() => { }}
                onBack={() => handleNavigate('DASHBOARD')}
            />
        );
    }

    return (
        <div className="min-h-screen bg-slate-50/50">
            {view === 'DASHBOARD' && (
                <DashboardPanel
                    items={itemsWithDetails}
                    warehouseRequests={requests}
                    onNavigate={handleNavigate}
                    currentUser={currentUser}
                    headerActions={
                        <div className="flex items-center gap-3">
                            <QRCodeModal />
                            <PushManager userEmail={currentUserEmail} />
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                                onClick={() => handleNavigate('TV_DASHBOARD')}
                            >
                                <Monitor className="w-4 h-4" />
                                Modo TV
                            </Button>
                        </div>
                    }
                />
            )}

            {view === 'WASHING_STATION' && (
                <KanbanBoard
                    items={itemsWithDetails.filter(i => i.status === ProcessStatus.WASHING)}
                    onUpdateStatus={handleUpdateStatus}
                    viewMode="WASHING"
                />
            )}

            {view === 'ADHESIVE_STATION' && (
                <KanbanBoard
                    items={itemsWithDetails.filter(i =>
                        i.status === ProcessStatus.ADHESIVE || i.status === ProcessStatus.FINISHED
                    )}
                    onUpdateStatus={handleUpdateStatus}
                    viewMode="ADHESIVE"
                />
            )}

            {(view === 'HARDWARE_REQUEST' || view === 'PROFILE_WAREHOUSE') && (
                <WarehouseRequestPanel
                    type={view === 'HARDWARE_REQUEST' ? 'HARDWARE' : 'PROFILE'}
                    requests={requests}
                    onRequestCreate={handleRequestCreate}
                    onRequestFinish={handleRequestFinish}
                />
            )}

            {view === 'HISTORY' && (
                <HistoryPanel items={items} />
            )}
        </div>
    );
}

export default function ControleQualidadePage() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-slate-500 font-medium">Carregando painel de qualidade...</div>}>
            <ControleQualidadeContent />
        </Suspense>
    );
}
