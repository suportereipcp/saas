import React from 'react';
import { ProductionItem, TransferStatus } from '../../types';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BadgeAlert, CheckCircle2, CircleDashed, Clock, FileSearch, MoreHorizontal, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransferTableProps {
    items: ProductionItem[];
    onUpdateStatus: (id: string, status: TransferStatus) => void;
    isLoading?: boolean;
}

export function TransferTable({ items, onUpdateStatus, isLoading }: TransferTableProps) {

    const getStatusBadge = (status?: TransferStatus) => {
        switch (status) {
            case 'TRANSFERRED':
                return (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Transferido
                    </div>
                );
            case 'EVALUATION':
                return (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold uppercase tracking-wider">
                        <FileSearch className="w-3.5 h-3.5" /> Avaliação PCP
                    </div>
                );
            case 'PENDING':
            default:
                return (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 text-slate-500 border border-slate-200 text-xs font-bold uppercase tracking-wider">
                        <CircleDashed className="w-3.5 h-3.5" /> Pendente
                    </div>
                );
        }
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="w-[180px] font-bold text-slate-600 uppercase text-xs tracking-wider">Data Entrada</TableHead>
                        <TableHead className="font-bold text-slate-600 uppercase text-xs tracking-wider">Solicitação</TableHead>
                        <TableHead className="font-bold text-slate-600 uppercase text-xs tracking-wider">Item</TableHead>
                        <TableHead className="text-right font-bold text-slate-600 uppercase text-xs tracking-wider">Qtd</TableHead>

                        <TableHead className="font-bold text-slate-600 uppercase text-xs tracking-wider">Status Logística</TableHead>
                        <TableHead className="w-[100px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><div className="h-4 w-24 bg-slate-100 rounded animate-pulse" /></TableCell>
                                <TableCell><div className="h-4 w-16 bg-slate-100 rounded animate-pulse" /></TableCell>
                                <TableCell><div className="h-4 w-32 bg-slate-100 rounded animate-pulse" /></TableCell>
                                <TableCell><div className="h-4 w-8 bg-slate-100 rounded animate-pulse ml-auto" /></TableCell>
                                <TableCell><div className="h-6 w-20 bg-slate-100 rounded animate-pulse" /></TableCell>
                                <TableCell><div className="h-6 w-24 bg-slate-100 rounded animate-pulse" /></TableCell>
                                <TableCell><div className="h-8 w-8 bg-slate-100 rounded animate-pulse" /></TableCell>
                            </TableRow>
                        ))
                    ) : (
                        items.map((item) => (
                            <TableRow key={item.id} className="hover:bg-slate-50 transition-colors group">
                                <TableCell className="font-mono text-xs text-slate-500">
                                    {new Date(item.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                </TableCell>
                                <TableCell className="font-medium text-slate-700">#{item.nr_solicitacao}</TableCell>
                                <TableCell className="font-bold text-slate-900">{item.it_codigo}</TableCell>
                                <TableCell className="text-right font-mono font-medium">{item.quantity}</TableCell>

                                <TableCell>
                                    {getStatusBadge(item.transfer_status)}
                                </TableCell>
                                <TableCell>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-[200px]">
                                            <DropdownMenuItem onClick={() => onUpdateStatus(item.id, 'TRANSFERRED')} className="gap-2 cursor-pointer text-emerald-700 focus:text-emerald-800 focus:bg-emerald-50">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Marcar Transferido
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onUpdateStatus(item.id, 'EVALUATION')} className="gap-2 cursor-pointer text-amber-700 focus:text-amber-800 focus:bg-amber-50">
                                                <FileSearch className="w-4 h-4" />
                                                Solicitar Avaliação
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onUpdateStatus(item.id, 'PENDING')} className="gap-2 cursor-pointer text-slate-500 focus:bg-slate-50">
                                                <Clock className="w-4 h-4" />
                                                Voltar para Pendente
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
            {!isLoading && items.length === 0 && (
                <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
                    <Truck className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm font-medium uppercase tracking-widest">Nenhum item encontrado</p>
                </div>
            )}
        </div>
    );
}
