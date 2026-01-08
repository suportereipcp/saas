'use client';

import React, { useState, useEffect } from 'react';
import { QrCode, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

export const QRCodeModal: React.FC = () => {
    const [currentUrl, setCurrentUrl] = useState('');

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentUrl(window.location.href);
        }
    }, []);

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(currentUrl)}`;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 bg-white hover:bg-slate-50 border-slate-200"
                >
                    <QrCode className="w-4 h-4 text-emerald-500" />
                    <span className="text-xs font-bold text-slate-700">Acesso Mobile</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md bg-white p-8">
                <DialogHeader className="mb-4">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-900 justify-center">
                        <Smartphone className="w-5 h-5 text-emerald-500" />
                        Acessar no Celular
                    </DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center space-y-6 text-center">
                    <div className="p-4 bg-white rounded-2xl border-4 border-slate-50 shadow-xl ring-1 ring-slate-100">
                        <img
                            src={qrCodeUrl}
                            alt="QR Code para acesso mobile"
                            className="w-64 h-64"
                        />
                    </div>
                    <div className="space-y-2">
                        <p className="text-sm text-slate-600">
                            Aponte a câmera do seu celular para o código acima para abrir o Dashboard direto no seu aparelho.
                        </p>
                        <p className="text-[11px] font-bold text-emerald-600 bg-emerald-50 py-1 px-3 rounded-full inline-block">
                            Ideal para Ativar as Notificações Push
                        </p>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
