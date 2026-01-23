
export const COLLABORATORS = [
    { id: '1', name: 'Carlos (Engenharia)', items: ['Ficha Técnica', 'Desenho'], avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos' },
    { id: '2', name: 'Ana (PCP)', items: ['Prazos', 'Prioridades'], avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ana' },
    { id: '3', name: 'Roberto (Produção)', items: ['Chão de Fábrica', 'Manutenção'], avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Roberto' },
    { id: '4', name: 'Julia (Qualidade)', items: ['Inspeção', 'Refugo'], avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Julia' },
    { id: '5', name: 'Marcos (Logística)', items: ['Expedição', 'Estoque'], avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcos' },
    { id: '6', name: 'Fernanda (Vendas)', items: ['Pedidos', 'Clientes'], avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Fernanda' },
];

export const TOPICS = [
    { id: 't1', name: 'Reunião Diretoria', type: 'topic', avatar: null },
    { id: 't2', name: 'Equipe de Projetos', type: 'topic', avatar: null },
    { id: 't3', name: 'Projeto Molde X', type: 'topic', avatar: null },
    { id: 't4', name: 'Manutenção Geral', type: 'topic', avatar: null },
];

export const MOCK_CHAT_HISTORY = [
    {
        id: '1',
        date: 'Hoje, 10:30',
        content: 'Resumo da reunião com Carlos sobre o novo molde.',
        tags: ['Carlos (Engenharia)', 'Projeto Molde X'],
        type: 'summary',
        imageUrl: 'https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=1740&auto=format&fit=crop' // Generic handwritten note image
    },
    {
        id: '2',
        date: 'Ontem, 16:45',
        content: 'Alinhamento de prioridades da semana com Ana do PCP.',
        tags: ['Ana (PCP)', 'Equipe de Projetos'],
        type: 'summary',
        imageUrl: 'https://images.unsplash.com/photo-1586282391129-76a6df840fd0?q=80&w=1740&auto=format&fit=crop'
    },
    {
        id: '3',
        date: '20/01/2026',
        content: 'Problema na extrusora 3 reportado por Roberto.',
        tags: ['Roberto (Produção)', 'Manutenção Geral'],
        type: 'alert',
        imageUrl: 'https://images.unsplash.com/photo-1616628188859-7a11abb6fcc9?q=80&w=1740&auto=format&fit=crop'
    }
];
