import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from "html5-qrcode";
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
import { Camera, CheckCircle2, QrCode, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LupaModalProps {
    mode: 'START' | 'FINISH';
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: LupaData) => void;
    initialOp?: number;
}

export interface LupaData {
    opNumber: number;
    code: string; // Evaluator or Operator code
    status: 'APPROVED' | 'REJECTED';
}

export function LupaModal({ mode, isOpen, onClose, onConfirm, initialOp }: LupaModalProps) {
    const [opNumber, setOpNumber] = useState<string>('');
    const [code, setCode] = useState('');
    const [status, setStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
    const [isScanning, setIsScanning] = useState(false);
    const scannerRef = useRef<Html5Qrcode | null>(null);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setOpNumber(initialOp ? initialOp.toString() : '');
            setCode('');
            setStatus('APPROVED');
            setIsScanning(false);
            if (scannerRef.current) {
                scannerRef.current.stop().catch(console.error);
                scannerRef.current.clear();
                scannerRef.current = null;
            }
        }
    }, [isOpen, initialOp]);

    // Cleanup on unmount or close
    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(console.error);
                scannerRef.current.clear();
            }
        };
    }, []);

    // Locked Scanner Lifecycle Management
    const processingRef = useRef(false);

    useEffect(() => {
        let mounted = true;

        const cleanupScanner = async () => {
            if (scannerRef.current) {
                try {
                    // Check if scanner is running before stopping
                    // Html5Qrcode doesn't expose public isScanning(), but stop() throws if not running.
                    // We try-catch stop().
                    await scannerRef.current.stop();
                } catch (e) {
                    // Ignore "not running" errors
                }

                try {
                    scannerRef.current.clear();
                } catch (e) {
                    console.warn("Retrying clear...", e);
                }
                scannerRef.current = null;
            }
        };

        const initScanner = async () => {
            if (processingRef.current) return;
            processingRef.current = true;

            try {
                // Ensure fresh start
                await cleanupScanner();

                if (!mounted) return;

                // Wait for DOM
                await new Promise(resolve => setTimeout(resolve, 300));

                if (!mounted) return;

                if (!document.getElementById("reader")) {
                    console.error("Reader element missing");
                    setIsScanning(false);
                    return;
                }

                const scanner = new Html5Qrcode("reader");
                scannerRef.current = scanner;

                await scanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        if (!mounted) return;
                        setOpNumber(decodedText);
                        // Don't toggle isScanning here immediately to avoid race? 
                        // Better to just let user stop or auto-stop. 
                        // Let's auto-stop safely.
                        setIsScanning(false);
                    },
                    (errorMessage) => {
                        // ignore failures
                    }
                );
            } catch (err: any) {
                console.error("Error starting scanner:", err);
                // Only alert if it's a real error, not a state error we handled
                if (mounted && isScanning) {
                    alert(`Erro na câmera: ${err?.message || err}`);
                    setIsScanning(false);
                }
            } finally {
                processingRef.current = false;
            }
        };

        const safeStop = async () => {
            if (processingRef.current) return;
            processingRef.current = true;
            try {
                await cleanupScanner();
            } finally {
                processingRef.current = false;
            }
        };

        if (isScanning) {
            initScanner();
        } else {
            safeStop();
        }

        return () => {
            mounted = false;
            // Force cleanup on unmount, bypassing lock if needed or just attempting
            cleanupScanner().catch(console.error);
        };
    }, [isScanning]);

    const toggleScanner = () => {
        if (processingRef.current) return; // Prevent clicks while processing
        setIsScanning(prev => !prev);
    };

    const isFormValid = (mode === 'START' ? opNumber.trim().length > 0 : true) && code.trim().length > 0;

    const handleSubmit = () => {
        if (!isFormValid) return;
        onConfirm({
            opNumber: parseInt(opNumber),
            code: code.trim(),
            status
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md bg-white border-none shadow-2xl">
                <DialogHeader className="pb-4 border-b border-slate-100">
                    <DialogTitle className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                        {mode === 'START' ? (
                            <><CheckCircle2 className="w-6 h-6 text-indigo-600" /> Avaliação Lupa</>
                        ) : (
                            <><CheckCircle2 className="w-6 h-6 text-emerald-600" /> Finalizar Lupa</>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-6 py-4">

                    {/* OP Number Input */}
                    <div className="space-y-2">
                        <Label htmlFor="op" className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                            Ordem de Produção (OP)
                        </Label>
                        <div className="flex gap-2">
                            <Input
                                id="op"
                                type="number"
                                value={opNumber}
                                onChange={(e) => setOpNumber(e.target.value)}
                                disabled={mode === 'FINISH'} // Read-only on finish
                                className={cn(
                                    "font-mono text-lg font-bold bg-slate-50 border-slate-200 focus-visible:ring-indigo-500",
                                    mode === 'FINISH' && "opacity-80 cursor-not-allowed bg-slate-100"
                                )}
                                placeholder="0000"
                            />
                            {mode === 'START' && (
                                <Button
                                    type="button"
                                    variant={isScanning ? "destructive" : "outline"}
                                    size="icon"
                                    onClick={toggleScanner}
                                    title="Ler QR Code"
                                >
                                    {isScanning ? <XCircle className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
                                </Button>
                            )}
                        </div>

                        {/* Camera Viewfinder */}
                        {isScanning && (
                            <div className="relative aspect-square bg-black rounded-lg overflow-hidden mt-2 border-2 border-slate-200">
                                <div id="reader" className="w-full h-full"></div>
                                <div className="absolute top-2 right-2 z-10">
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => setIsScanning(false)}
                                        className="h-6 text-[10px] uppercase font-bold px-2"
                                    >
                                        Parar
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Evaluator/Operator Code */}
                    <div className="space-y-2">
                        <Label htmlFor="code" className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                            {mode === 'START' ? 'Código do Avaliador' : 'Código do Operador'}
                        </Label>
                        <div className="relative">
                            <Input
                                id="code"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="pl-10 font-bold text-slate-900 border-slate-200 focus-visible:ring-indigo-500"
                                placeholder="Digite seu código..."
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <Camera className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Status Radio */}
                    <div className="space-y-3 pt-2">
                        <Label className="text-xs font-bold uppercase text-slate-500 tracking-wider">Resultado da Avaliação</Label>
                        <RadioGroup
                            value={status}
                            onValueChange={(val: any) => setStatus(val)}
                            className="grid grid-cols-2 gap-4"
                        >
                            <div>
                                <RadioGroupItem value="APPROVED" id="approved" className="peer sr-only" />
                                <Label
                                    htmlFor="approved"
                                    className="flex flex-col items-center justify-between rounded-xl border-2 border-slate-100 bg-white p-4 hover:bg-slate-50 hover:text-slate-900 peer-data-[state=checked]:border-emerald-500 peer-data-[state=checked]:bg-emerald-50 peer-data-[state=checked]:text-emerald-700 cursor-pointer transition-all"
                                >
                                    <CheckCircle2 className="mb-2 h-6 w-6" />
                                    <span className="text-sm font-bold uppercase">Liberado</span>
                                </Label>
                            </div>
                            <div>
                                <RadioGroupItem value="REJECTED" id="rejected" className="peer sr-only" />
                                <Label
                                    htmlFor="rejected"
                                    className="flex flex-col items-center justify-between rounded-xl border-2 border-slate-100 bg-white p-4 hover:bg-slate-50 hover:text-slate-900 peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:bg-red-50 peer-data-[state=checked]:text-red-700 cursor-pointer transition-all"
                                >
                                    <XCircle className="mb-2 h-6 w-6" />
                                    <span className="text-sm font-bold uppercase">Reprovado</span>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                </div>

                <DialogFooter className="pt-2">
                    <Button variant="ghost" onClick={onClose} className="text-slate-500">Cancelar</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!isFormValid}
                        className={cn(
                            "min-w-[120px] font-bold uppercase tracking-wide",
                            mode === 'START' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-emerald-600 hover:bg-emerald-700"
                        )}
                    >
                        {mode === 'START' ? 'Iniciar' : 'Finalizar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
