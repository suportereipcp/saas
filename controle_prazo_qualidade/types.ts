
export enum ProcessStatus {
  BLASTED = 'JATEADO', // Aguardando Lavagem
  WASHING = 'LAVANDO', // Em Processo de Lavagem
  WASHED = 'LAVADO', // Aguardando Adesivo
  ADHESIVE = 'ADESIVO', // Em Processo de Adesivo
  COMPLETED = 'FINALIZADO',
  REWORK = 'RETRABALHO'
}

export type RequestType = 'PROFILE' | 'HARDWARE';

export interface WarehouseRequest {
  id: string;
  type: RequestType;
  item: string;
  quantity: number;
  requester: string;
  createdAt: Date;
  completedAt?: Date;
  status: 'PENDING' | 'COMPLETED';
}

export interface Product {
  id: string;
  name: string;
  material: string;
  washDeadlineMinutes: number; 
  adhesiveDeadlineMinutes: number; 
  isActive?: boolean; // Novo campo para controle de inativação
}

export interface ProductionItem {
  id: string;
  sequentialId: number; 
  productId: string;
  calculo: string; 
  listNumber?: string; 
  quantity: number;
  blastedAt: Date; 
  washStartedAt?: Date;
  washFinishedAt?: Date;
  adhesiveStartedAt?: Date;
  adhesiveFinishedAt?: Date;
  status: ProcessStatus;
}

// Helper type for UI display joining Item + Product
export interface ProductionItemWithDetails extends ProductionItem {
  productName: string;
  material: string;
  deadline: Date | null;
  isDelayed: boolean;
}

export interface HistoryLog {
  id: string;
  timestamp: Date;
  action: 'IMPORT' | 'STATUS_CHANGE' | 'CREATE_PRODUCT' | 'DELETE_PRODUCT' | 'WAREHOUSE_REQUEST' | 'USER_MANAGEMENT' | 'PRODUCT_UPDATE';
  description: string;
  details?: string; 
  relatedCalculo?: string;
  relatedProduct?: string;
  user: string; 
}

export interface NotificationPreferences {
  production: boolean; // Receive alerts when items complete/move
  calls: boolean; // Receive alerts when someone requests presence
}

export interface User {
  id: string;
  name: string;
  email?: string;
  password?: string; // Used only for form input, not stored in state after auth
  permissions: ViewState[];
  isActive?: boolean; // Controla se o usuário pode acessar o sistema
  notificationSettings?: NotificationPreferences;
}

export type ViewState = 'DASHBOARD' | 'TV_DASHBOARD' | 'WASHING_STATION' | 'ADHESIVE_STATION' | 'PRODUCTS' | 'HISTORY' | 'PROFILE_WAREHOUSE' | 'HARDWARE_REQUEST' | 'USERS';