export enum TicketStatus {
    EVALUATION = 'AVALIAÇÃO DE MUDANÇA',
    IN_CHANGE = 'EM DESENVOLVIMENTO',
    PENDING_APPROVAL = 'AGUARDANDO LIBERAÇÃO',
    APPROVED = 'APROVADO',
    REJECTED = 'REPROVADO'
}

export enum AttachmentType {
    IMAGE = 'IMAGE',
    DOCUMENT = 'DOCUMENT'
}

export interface Attachment {
    id: string;
    name: string;
    type: AttachmentType;
    url: string;
    uploadedAt: string;
    stage: TicketStatus;
}

export interface SubTask {
    id: string;
    description: string;
    assignedTo?: string;
    completed: boolean;
    completionNotes?: string;
    createdAt: string;
}

export interface HistoryLog {
    id: string;
    action: string;
    user: string;
    timestamp: string;
    details?: string;
}

export interface ProductTicket {
    id: string;
    productCode: string;
    productName: string;
    productImage?: string;
    description: string;
    status: TicketStatus;

    requesterName: string;
    trackingResponsible?: string;
    changerName?: string;

    validationResponsible?: string;

    approvers?: string[];
    superiorApprover?: string;
    approverName?: string;

    createdAt: string;
    updatedAt: string;
    developmentStartedAt?: string;
    validationSentAt?: string;
    finalizedAt?: string;

    subTasks: SubTask[];
    attachments: Attachment[];
    history: HistoryLog[];
}

export interface User {
    id: string;
    name: string;
    email: string;
    avatar: string;
    role: 'ADMIN' | 'USER';
    jobTitle: string;
    active: boolean;
    createdAt?: string;
}
