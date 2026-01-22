import { ProcessStatus, ProductionItem, Product, WarehouseRequest } from "./types";

export const MOCK_PRODUCTS: Product[] = [
    { id: '1', name: 'Perfil Alumínio A', material: 'Alumínio', washDeadlineMinutes: 30, adhesiveDeadlineMinutes: 45, isActive: true },
    { id: '2', name: 'Perfil Aço B', material: 'Aço', washDeadlineMinutes: 45, adhesiveDeadlineMinutes: 60, isActive: true },
    { id: '3', name: 'Vidro Temperado', material: 'Vidro', washDeadlineMinutes: 20, adhesiveDeadlineMinutes: 30, isActive: true },
];

// Use fixed dates to match server/client hydration
const BASE_DATE = new Date('2024-01-01T12:00:00Z');

export const MOCK_ITEMS: ProductionItem[] = [
    {
        id: '101',
        sequentialId: 1,
        productId: '1',
        calculo: 'CALC-001',
        quantity: 10,
        blastedAt: new Date(BASE_DATE.getTime() - 1000 * 60 * 60),
        status: ProcessStatus.BLASTED
    },
    {
        id: '102',
        sequentialId: 2,
        productId: '2',
        calculo: 'CALC-002',
        quantity: 5,
        blastedAt: new Date(BASE_DATE.getTime() - 1000 * 60 * 120),
        washStartedAt: new Date(BASE_DATE.getTime() - 1000 * 60 * 30),
        status: ProcessStatus.WASHING
    },
    {
        id: '103',
        sequentialId: 3,
        productId: '1',
        calculo: 'CALC-003',
        quantity: 8,
        blastedAt: new Date(BASE_DATE.getTime() - 1000 * 60 * 200),
        washStartedAt: new Date(BASE_DATE.getTime() - 1000 * 60 * 180),
        washFinishedAt: new Date(BASE_DATE.getTime() - 1000 * 60 * 150),
        status: ProcessStatus.WASHED
    },
    {
        id: '104',
        sequentialId: 4,
        productId: '3',
        calculo: 'CALC-004',
        quantity: 20,
        blastedAt: new Date(BASE_DATE.getTime() - 1000 * 60 * 300),
        washStartedAt: new Date(BASE_DATE.getTime() - 1000 * 60 * 280),
        washFinishedAt: new Date(BASE_DATE.getTime() - 1000 * 60 * 250),
        adhesiveStartedAt: new Date(BASE_DATE.getTime() - 1000 * 60 * 10),
        status: ProcessStatus.ADHESIVE
    }
];

export const MOCK_REQUESTS: WarehouseRequest[] = [
    { id: 'r1', type: 'HARDWARE', item: 'Parafuso M4', quantity: 100, requester: 'João', createdAt: BASE_DATE, status: 'PENDING' },
    { id: 'r2', type: 'PROFILE', item: 'Barra 6m', quantity: 2, requester: 'Maria', createdAt: BASE_DATE, status: 'COMPLETED', completedAt: BASE_DATE }
];
