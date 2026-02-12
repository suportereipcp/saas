import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AlertTriangle, CheckCircle2, Hammer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RejectionActionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: RejectionActionData) => void;
}

export interface RejectionActionData {
    action: 'LIBERACAO_CQ' | 'RETRABALHO';
    liberadorName?: string;
}

export function RejectionActionModal({ isOpen, onClose, onConfirm }: RejectionActionModalProps) {
    const [action, setAction] = useState<'LIBERACAO_CQ' | 'RETRABALHO' | null>(null);
    const [liberadorName, setLiberadorName] = useState('');

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setAction(null);
            setLiberadorName('');
        }
    }, [isOpen]);

    const isValid = () => {
        if (!action) return false;
        if (action === 'LIBERACAO_CQ' && !liberadorName.trim()) return false;
        return true;
    };

    const handleConfirm = () => {
        if (!isValid() || !action) return;
        onConfirm({
            action,
            liberadorName: action === 'LIBERACAO_CQ' ? liberadorName.trim() : undefined
        });
        onClose(); // Close happens in parent usually, but good to have safeguard
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl">
                <DialogHeader className="pb-4 border-b border-slate-100">
                    <DialogTitle className="text-xl font-black text-red-600 flex items-center gap-2 uppercase tracking-tight">
                        <AlertTriangle className="w-6 h-6" /> Item Reprovado
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="space-y-3">
                        <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                            Selecione a Ação Corretiva
                        </Label>
                        <RadioGroup
                            value={action || ''}
                            onValueChange={(val: any) => setAction(val)}
                            className="grid grid-cols-1 gap-3"
                        >
                            {/* Liberação CQ */}
                            <div>
                                <RadioGroupItem value="LIBERACAO_CQ" id="liberacao_cq" className="peer sr-only" />
                                <Label
                                    htmlFor="liberacao_cq"
                                    className="flex items-center gap-3 rounded-xl border-2 border-slate-100 bg-white p-4 hover:bg-emerald-50 hover:border-emerald-200 peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-50 peer-data-[state=checked]:text-emerald-700 cursor-pointer transition-all"
                                >
                                    <div className="p-2 bg-emerald-100 rounded-full shrink-0">
                                        <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold uppercase text-sm">Liberação CQ</span>
                                        <span className="text-xs text-slate-500 font-normal">Item liberado sob responsabilidade do CQ</span>
                                    </div>
                                </Label>
                            </div>

                            {/* Retrabalho Jateamento */}
                            <div>
                                <RadioGroupItem value="RETRABALHO" id="retrabalho" className="peer sr-only" />
                                <Label
                                    htmlFor="retrabalho"
                                    className="flex items-center gap-3 rounded-xl border-2 border-slate-100 bg-white p-4 hover:bg-amber-50 hover:border-amber-200 peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-50 peer-data-[state=checked]:text-amber-700 cursor-pointer transition-all"
                                >
                                    <div className="p-2 bg-amber-100 rounded-full shrink-0">
                                        <Hammer className="h-5 w-5 text-amber-700" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-bold uppercase text-sm">Retrabalho Jateamento</span>
                                        <span className="text-xs text-slate-500 font-normal">Enviar item de volta para jateamento</span>
                                    </div>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {/* Input Nome para Liberação CQ */}
                    {action === 'LIBERACAO_CQ' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                            <Label htmlFor="liberador" className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                                Nome do Responsável (CQ)
                            </Label>
                            <Input
                                id="liberador"
                                value={liberadorName}
                                onChange={(e) => setLiberadorName(e.target.value)}
                                className="font-bold text-slate-900 border-slate-200 focus-visible:ring-emerald-500"
                                placeholder="Quem liberou este item?"
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-2">
                    <Button variant="ghost" onClick={onClose} className="text-slate-500">Cancelar</Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!isValid()}
                        className={cn(
                            "min-w-[120px] font-bold uppercase tracking-wide",
                            action === 'RETRABALHO' ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"
                        )}
                    >
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
