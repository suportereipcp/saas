'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellOff, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';

interface PushManagerProps {
    userEmail: string;
}

export const PushManager: React.FC<PushManagerProps> = ({ userEmail }) => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSubscription();
    }, []);

    const checkSubscription = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            setLoading(false);
            return;
        }

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
        setLoading(false);
    };

    const subscribeToPush = async () => {
        try {
            setLoading(true);
            const registration = await navigator.serviceWorker.ready;

            // Nota: Em produção aqui você usaria seu VAPID_PUBLIC_KEY
            // Para o exemplo, vamos apenas pedir permissão
            const permission = await Notification.requestPermission();

            if (permission !== 'granted') {
                toast.error('Permissão de notificação negada');
                setLoading(false);
                return;
            }

            // Chave pública real gerada para o ambiente
            const VAPID_PUBLIC_KEY = 'BOhFKSnbHVv0Bqrj3ZawszGa1w1zM3W_GaAvNeOAuqpW5vLzxqT3X8-mCzbmH070xy-p9nG7gdNZz1n6O35-c_k';

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: VAPID_PUBLIC_KEY
            });

            // Salva no Supabase
            const { error } = await supabase
                .from('push_subscriptions')
                .insert([{
                    user_email: userEmail,
                    subscription_json: subscription,
                    device_name: navigator.userAgent
                }]);

            if (error) throw error;

            setIsSubscribed(true);
            toast.success('Notificações ativadas com sucesso!');
        } catch (error) {
            console.error('Erro ao assinar push:', error);
            toast.error('Não foi possível ativar as notificações.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return null;

    return (
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
            {isSubscribed ? (
                <>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-medium text-slate-600">Notificações Ativas</span>
                </>
            ) : (
                <>
                    <Bell className="w-4 h-4 text-slate-400" />
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-700">Alertas no Celular</span>
                        <span className="text-[10px] text-slate-500">Receba avisos de atraso</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto h-7 text-[11px] bg-white hover:bg-slate-100"
                        onClick={subscribeToPush}
                    >
                        Ativar
                    </Button>
                </>
            )}
        </div>
    );
};
