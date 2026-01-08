export enum ProcessStatus {
    WASHING = 'WASHING', // Em processo ou aguardando lavagem
    ADHESIVE = 'ADHESIVE', // Em processo ou aguardando adesivo
    FINISHED = 'FINISHED' // Finalizado
}

export type RequestType = 'PROFILE' | 'HARDWARE';

export interface WarehouseRequest {
    id: string;
    type: RequestType;
    item_code: string;
    quantity: number;
    requester: string;
    status: 'PENDING' | 'COMPLETED' | 'CANCELLED';
    created_at: string;
    completed_at?: string;
    completed_by?: string;
}

export interface ProductionItem {
    id: string;
    solicitation_id: number;
    nr_solicitacao: number;
    it_codigo: string;
    quantity: number;
    status: ProcessStatus;
    datasul_finished_at: string;
    wash_started_at?: string;
    wash_finished_at?: string;
    wash_deadline?: string;
    adhesive_started_at?: string;
    adhesive_finished_at?: string;
    adhesive_deadline?: string;
    wash_finished_by?: string;
    adhesive_finished_by?: string;
    created_at: string;
    product_description?: string;
    calculation_priority?: string;
}

export interface ProductionItemWithDetails extends ProductionItem {
    productName: string;
    isDelayed: boolean;
    deadline: string | null;
}

export type ViewState = 'DASHBOARD' | 'TV_DASHBOARD' | 'WASHING_STATION' | 'ADHESIVE_STATION' | 'HISTORY' | 'PROFILE_WAREHOUSE' | 'HARDWARE_REQUEST';
