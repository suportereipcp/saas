'use client';
import React, { useState, useEffect } from 'react';
import { TicketDetail } from '../../_components/pages/TicketDetail';
import { ProductTicket } from '../../_types/types';
import { getTicketById } from '../../_services/storageService';
import { useRouter, useParams } from 'next/navigation';
import { Icons } from '../../_components/Icons';
export default function TicketDetailPageWrapper() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;

    const [ticket, setTicket] = useState<ProductTicket | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchTicket = async () => {
        if (!id) return;
        setLoading(true);
        const data = await getTicketById(id);
        setTicket(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchTicket();
    }, [id]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Icons.Clock className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    if (!ticket) {
        return <div className="p-8 text-center text-gray-500">Solicitação não encontrada.</div>;
    }

    return (
        <TicketDetail
            ticket={ticket}
            onBack={() => router.push('/shift-app/tickets')}
            onUpdate={fetchTicket}
        />
    );
}
