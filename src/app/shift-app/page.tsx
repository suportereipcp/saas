'use client';

import React, { useState, useEffect } from 'react';
import { StatsCard } from './_components/StatsCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from './_components/Icons';
import { TicketStatus, ProductTicket } from './_types/types';
import { getTickets, getDashboardStats } from './_services/storageService';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [tickets, setTickets] = useState<ProductTicket[]>([]);
  const [dashboardStats, setDashboardStats] = useState({ total: 0, evaluation: 0, inProgress: 0, pending: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getTickets(1, 5) // Recent 5
    ]).then(([stats, ticketsData]) => {
      setDashboardStats(stats);
      setTickets(ticketsData.data);
      setIsLoading(false);
    });
  }, []);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Painel Geral</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Painel Geral</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
        <StatsCard title="Total" value={dashboardStats.total} icon={Icons.Ticket} colorClass="text-emerald-600" subtext="Total de Solicitações" />
        <StatsCard title="Em Avaliação" value={dashboardStats.evaluation} icon={Icons.FileText} colorClass="text-emerald-600" subtext="Aguardando análise" />
        <StatsCard title="Desenvolvimento" value={dashboardStats.inProgress} icon={Icons.Settings} colorClass="text-emerald-600" subtext="Em andamento" />
        <StatsCard title="Aguardando Aprov." value={dashboardStats.pending} icon={Icons.Clock} colorClass="text-emerald-600" subtext="Validação final" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
        <h2 className="font-bold text-lg mb-4">Modificações Recentes</h2>
        <div className="space-y-3">
          {tickets.map(t => (
            <div key={t.id} onClick={() => router.push(`/shift-app/tickets/${t.id}`)} className="flex items-center justify-between p-3 md:p-4 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors border border-gray-50 hover:border-gray-200 active:scale-[0.99]">
              <div className="flex items-center gap-3 md:gap-4">
                {t.productImage ? (
                  <img src={t.productImage} alt="Prod" className="w-10 h-10 md:w-12 md:h-12 rounded-lg object-cover border border-gray-200" />
                ) : (
                  <div className={`p-2 md:p-3 rounded-lg ${t.status === TicketStatus.APPROVED ? 'bg-green-100 text-green-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    <Icons.Ticket size={20} />
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm md:text-base text-gray-900">{t.productName}</p>
                  <p className="text-xs text-gray-500">{t.id} • {new Date(t.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
              <Icons.ChevronRight size={18} className="text-gray-400" />
            </div>
          ))}
          {tickets.length === 0 && <p className="text-gray-400 text-sm">Nenhum dado para exibir.</p>}
        </div>
      </div>
    </div>
  );
}
