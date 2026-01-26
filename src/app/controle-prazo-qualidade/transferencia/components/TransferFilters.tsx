import React from 'react';
import { TransferStatus } from '../../types';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from '@/lib/utils';
import { Calendar, Filter, X } from 'lucide-react';

interface TransferFiltersProps {
    currentStatus: TransferStatus | 'ALL';
    onStatusChange: (status: TransferStatus | 'ALL') => void;
    startDate: string;
    endDate: string;
    onDateChange: (start: string, end: string) => void;
}

export function TransferFilters({ currentStatus, onStatusChange, startDate, endDate, onDateChange }: TransferFiltersProps) {
    const statuses: { id: TransferStatus | 'ALL', label: string }[] = [
        { id: 'ALL', label: 'Todos' },
        { id: 'PENDING', label: 'Pendentes' },
        { id: 'TRANSFERRED', label: 'Transferidos' },
        { id: 'EVALUATION', label: 'Avaliação PCP' },
    ];

    return (
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">

            {/* Status Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto">
                {statuses.map((s) => (
                    <button
                        key={s.id}
                        onClick={() => onStatusChange(s.id)}
                        className={cn(
                            "px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all whitespace-nowrap",
                            currentStatus === s.id
                                ? "bg-white text-slate-900 shadow-sm"
                                : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                        )}
                    >
                        {s.label}
                    </button>
                ))}
            </div>

            {/* Date Filters */}
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => onDateChange(e.target.value, endDate)}
                        className="border-none h-8 text-xs bg-transparent shadow-none focus-visible:ring-0 p-0 w-28 text-slate-600 font-medium"
                    />
                    <span className="text-slate-300">-</span>
                    <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => onDateChange(startDate, e.target.value)}
                        className="border-none h-8 text-xs bg-transparent shadow-none focus-visible:ring-0 p-0 w-28 text-slate-600 font-medium"
                    />
                </div>
                {(startDate || endDate) && (
                    <Button variant="ghost" size="icon" onClick={() => onDateChange('', '')} className="text-slate-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}
