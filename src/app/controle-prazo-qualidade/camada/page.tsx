'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Save, Eraser, Plus, RefreshCw, X, ChevronLeft, ChevronRight, Search, Calendar as CalendarIcon } from 'lucide-react';
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

interface LayerRecord {
    id: string;
    created_at: string;
    date: string;
    item_code: string;
    op_number: string;
    process_type: string;
    standard_range: string;
    test_1: number;
    test_2: number;
    test_3: number;
    average: number;
    result: number;
    validation_status: string;
    adhesive_type: string;
    standard_thickness: string;
    user_email: string;
}

// --- CONSTANTS ---
const PROCESS_STANDARDS: Record<string, string> = {
    'Pincel': '15 a 25',
    'Pincel Prime': '3 a 8',
    'Imersão': '4 a 13',
    'Pistola Dupla': '15 a 25',
    'Pistola': '5 a 15',
    'Maquina Dupla': '15 a 25',
    'Maquina': '5 a 15'
};

export default function LayerControlPage() {
    const [records, setRecords] = useState<LayerRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [itemCode, setItemCode] = useState('');
    const [opNumber, setOpNumber] = useState('');
    const [processType, setProcessType] = useState('Pincel');
    const [standardRange, setStandardRange] = useState('15 a 25');
    const [adhesiveType, setAdhesiveType] = useState('');
    const [standardThickness, setStandardThickness] = useState('52,5');

    // Measurements
    const [test1, setTest1] = useState('');
    const [test2, setTest2] = useState('');
    const [test3, setTest3] = useState('');
    const [average, setAverage] = useState(0);
    const [calculatedStatus, setCalculatedStatus] = useState('');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const RECORDS_PER_PAGE = 15;

    // Filter State - Date Range
    const [filterDateStart, setFilterDateStart] = useState('');
    const [filterDateEnd, setFilterDateEnd] = useState('');
    const [filterItem, setFilterItem] = useState('');
    const [filterOP, setFilterOP] = useState('');

    // --- DATA FETCHING ---
    const fetchRecords = useCallback(async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .schema('app_controle_prazo_qualidade')
            .from('layer_control_records')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            // Only log serious errors, empty table errors on first run are expected if not created yet
            console.error('Erro ao buscar registros:', error.message, error.details);
        } else {
            setRecords(data || []);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchRecords();
    }, [fetchRecords]);

    // --- LOGIC: Auto-select standard based on process ---
    const handleProcessChange = (newProcess: string) => {
        setProcessType(newProcess);
        if (PROCESS_STANDARDS[newProcess]) {
            setStandardRange(PROCESS_STANDARDS[newProcess]);
        }
    };

    // --- CALCULATIONS ---
    useEffect(() => {
        const v1 = parseFloat(test1) || 0;
        const v2 = parseFloat(test2) || 0;
        const v3 = parseFloat(test3) || 0;
        let count = 0;
        if (test1) count++;
        if (test2) count++;
        if (test3) count++;

        let avg = 0;
        if (count > 0) {
            avg = parseFloat(((v1 + v2 + v3) / count).toFixed(1));
            setAverage(avg);
        } else {
            setAverage(0);
        }

        // Status Calculation
        // Parse range "X a Y" -> [min, max]
        const parts = standardRange.match(/\d+/g);
        if (parts && parts.length >= 2 && count > 0) {
            const min = parseFloat(parts[0]);
            const max = parseFloat(parts[1]);

            if (avg > max) {
                setCalculatedStatus('Camada acima do Padrão');
            } else if (avg < min) {
                setCalculatedStatus('Menor que o Padrão');
            } else {
                setCalculatedStatus('Teste dentro dos Parâmetros');
            }
        } else {
            setCalculatedStatus('');
        }

    }, [test1, test2, test3, standardRange]);

    // --- HANDLERS ---
    const handleClear = () => {
        setDate(new Date().toISOString().split('T')[0]);
        setItemCode('');
        setOpNumber('');
        setProcessType('Pincel');
        setStandardRange('15 a 25');
        setAdhesiveType('');
        setStandardThickness('52,5');
        setTest1('');
        setTest2('');
        setTest3('');
        setAverage(0);
        setCalculatedStatus('');
    };

    const handleSave = async (shouldSendEmail: boolean = false) => {
        if (!itemCode || !opNumber) {
            alert('Preencha Item e Ordem de Produção');
            return;
        }

        const { data: itemData, error: itemError } = await supabase
            .schema('datasul')
            .from('item') // Corrected table name based on SQL snapshot
            .select('it_codigo')
            .eq('it_codigo', itemCode.toUpperCase().trim()) // Trim added safety
            .maybeSingle(); // Changed to maybeSingle to avoid 406 error if multiple found (unlikely unique)

        console.log('Item Check:', { itemCode, itemData, itemError }); // DEBUG LOG

        if (itemError) {
            console.error('Erro ao validar item:', itemError);
            // alert('Erro ao validar item: ' + itemError.message); // Temporarily non-blocking for connection errors
        }

        if (!itemData && !itemError) { // Explicitly check if data is null
            alert(`Item ${itemCode.toUpperCase()} não encontrado no Datasul!`);
            return;
        }

        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const payload = {
                date,
                item_code: itemCode.toUpperCase(),
                op_number: opNumber,
                process_type: processType,
                standard_range: standardRange,
                test_1: parseFloat(test1) || 0,
                test_2: parseFloat(test2) || 0,
                test_3: parseFloat(test3) || 0,
                average,
                result: 0,
                validation_status: calculatedStatus,
                adhesive_type: adhesiveType,
                standard_thickness: standardThickness,
                user_email: user?.email,
                approval_status: shouldSendEmail ? 'PENDING' : null // Mark as pending if emailing
            };

            const { data: insertedData, error } = await supabase
                .schema('app_controle_prazo_qualidade')
                .from('layer_control_records')
                .insert([payload])
                .select()
                .single();

            if (error) throw error;

            // Send Email if required
            if (shouldSendEmail && insertedData) {
                const emailRes = await fetch('/api/send-layer-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...payload,
                        id: insertedData.id, // Only available if select() is used
                        calculatedStatus
                    })
                });

                if (!emailRes.ok) {
                    console.error(`Email API Trace: Status ${emailRes.status} ${emailRes.statusText}`);

                    let errorData;
                    try {
                        const text = await emailRes.text();
                        console.error('Email API Raw Response:', text);
                        errorData = JSON.parse(text);
                    } catch (e) {
                        errorData = { error: 'Could not parse response JSON', details: e };
                    }

                    console.error('Falha ao enviar email (Parsed):', errorData);
                    toast.warning(`Registro salvo, mas erro no email: ${errorData.error || 'Erro desconhecido'}`);
                } else {
                    toast.success('Registro salvo e email de aprovação enviado com sucesso!');
                }
            } else {
                toast.success('Registro salvo com sucesso!');
            }

            handleClear();
            setIsDialogOpen(false);
            fetchRecords();

        } catch (error: any) {
            console.error('Erro ao salvar:', error.message, error.details, error.hint, error);
            toast.error('Erro ao salvar: ' + (error.message || error));
        } finally {
            setIsSaving(false);
        }
    };

    // ... inside return ...

    <div className="flex gap-3 pt-4">
        <Button variant="destructive" onClick={handleClear} className="flex-1"><Eraser className="w-4 h-4 mr-2" /> Limpar</Button>

        {calculatedStatus === 'Teste dentro dos Parâmetros' ? (
            <Button onClick={() => handleSave(false)} disabled={isSaving} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white">
                {isSaving ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" /> Salvar</>}
            </Button>
        ) : (
            <Button onClick={() => handleSave(true)} disabled={isSaving} className="flex-[2] bg-amber-600 hover:bg-amber-700 text-white">
                {isSaving ? 'Enviando...' : <><Save className="w-4 h-4 mr-2" /> Salvar e Enviar Email</>}
            </Button>
        )}
    </div>

    return (
        <div className="flex flex-col h-full bg-slate-50/50 p-6 space-y-6">

            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    Controle de Camada
                </h1>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-bold">
                            <Plus className="w-5 h-5 mr-2" /> Novo Registro
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-50">
                        <DialogHeader>
                            <DialogTitle>Novo Controle de Camada</DialogTitle>
                        </DialogHeader>

                        <div className="p-1 space-y-6">
                            {/* Form Content */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                <div className="md:col-span-4 space-y-2">
                                    <Label className="text-xs font-bold uppercase text-slate-500">Data</Label>
                                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white" />
                                </div>
                                <div className="md:col-span-8 space-y-2">
                                    <Label className="text-xs font-bold uppercase text-slate-500">Item</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Item"
                                            value={itemCode}
                                            onChange={(e) => setItemCode(e.target.value.toUpperCase())}
                                            className="bg-white uppercase"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-slate-500">OP (Somente Números)</Label>
                                <Input
                                    placeholder="Ordem de Produção"
                                    value={opNumber}
                                    onChange={(e) => setOpNumber(e.target.value.replace(/\D/g, ''))}
                                    className="bg-white"
                                    maxLength={10}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Adesivo</Label>
                                    <div className="flex gap-2">
                                        {['01A', '02A', '05A'].map((opt) => (
                                            <Button
                                                key={opt}
                                                variant="outline"
                                                onClick={() => setAdhesiveType(opt)}
                                                className={cn(
                                                    "flex-1 font-bold h-10 px-0",
                                                    adhesiveType === opt ? "bg-slate-800 text-white hover:bg-slate-900 border-slate-900" : "bg-white text-slate-400"
                                                )}
                                            >
                                                {opt}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                                <div><Label className="text-xs font-bold uppercase text-slate-500 mb-2 block">Esp. Padrão</Label><Input value={standardThickness} onChange={(e) => setStandardThickness(e.target.value)} className="bg-white" /></div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                                <Card className="p-3 bg-white flex flex-col">
                                    <Label className="mb-2 block font-bold text-slate-700">Processo</Label>
                                    <RadioGroup value={processType} onValueChange={handleProcessChange} className="flex-1">
                                        {Object.keys(PROCESS_STANDARDS).map(p => (
                                            <div key={p} className="flex items-center space-x-2 py-1">
                                                <RadioGroupItem value={p} id={`d-${p}`} />
                                                <Label htmlFor={`d-${p}`} className="cursor-pointer text-sm">{p}</Label>
                                            </div>
                                        ))}
                                    </RadioGroup>
                                </Card>
                                <Card className="p-3 bg-white flex flex-col">
                                    <Label className="mb-2 block font-bold text-slate-700">Padrão Utilizado</Label>
                                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded text-center flex flex-col items-center justify-center min-h-[120px]">
                                        <span className="text-4xl font-black text-slate-800">{standardRange}</span>
                                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-2">Microns (uM)</div>
                                    </div>
                                </Card>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { l: 'Teste 1', v: test1, s: setTest1 },
                                    { l: 'Teste 2', v: test2, s: setTest2 },
                                    { l: 'Teste 3', v: test3, s: setTest3 },
                                ].map((t, i) => (
                                    <div key={i}>
                                        <Label className="text-xs font-bold uppercase text-slate-500 mb-1 block">{t.l}</Label>
                                        <Input type="number" value={t.v} onChange={(e) => t.s(e.target.value)} className="bg-white text-center font-bold" />
                                    </div>
                                ))}
                                <div>
                                    <Label className="text-xs font-bold uppercase text-slate-500 mb-1 block">Média</Label>
                                    <div className="h-10 flex items-center justify-center bg-slate-200 rounded font-black border border-slate-300">
                                        {average}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-slate-500">Resultado do Teste</Label>
                                <div className={cn(
                                    "p-3 rounded border font-bold text-center text-sm uppercase tracking-wide transition-colors",
                                    calculatedStatus === 'Camada acima do Padrão' ? "bg-amber-100 text-amber-900 border-amber-200" :
                                        calculatedStatus === 'Menor que o Padrão' ? "bg-red-100 text-red-900 border-red-200" :
                                            calculatedStatus === 'Teste dentro dos Parâmetros' ? "bg-emerald-100 text-emerald-900 border-emerald-200" :
                                                "bg-slate-100 text-slate-400 border-slate-200"
                                )}>
                                    {calculatedStatus || "Aguardando medidas..."}
                                </div>
                            </div>




                            <div className="flex gap-3 pt-4">
                                <Button variant="destructive" onClick={handleClear} className="flex-1"><Eraser className="w-4 h-4 mr-2" /> Limpar</Button>

                                {calculatedStatus === 'Teste dentro dos Parâmetros' ? (
                                    <Button onClick={() => handleSave(false)} disabled={isSaving} className="flex-[2] bg-emerald-600 hover:bg-emerald-700 text-white">
                                        {isSaving ? 'Salvando...' : <><Save className="w-4 h-4 mr-2" /> Salvar</>}
                                    </Button>
                                ) : (
                                    <Button onClick={() => handleSave(true)} disabled={isSaving} className="flex-[2] bg-amber-600 hover:bg-amber-700 text-white">
                                        {isSaving ? 'Enviando...' : <><Save className="w-4 h-4 mr-2" /> Salvar e Enviar Email</>}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="flex-1 overflow-hidden flex flex-col shadow-sm border-slate-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase text-slate-500 tracking-wider">Registros Recentes</CardTitle>
                </CardHeader>

                {/* Filters */}
                <div className="px-4 pb-3 flex flex-wrap gap-4 items-end border-b border-slate-200">
                    <div className="flex gap-2 items-end">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Data Início</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <Input
                                    type="date"
                                    value={filterDateStart}
                                    onChange={(e) => { setFilterDateStart(e.target.value); setCurrentPage(1); }}
                                    className="h-9 w-40 text-xs bg-white pl-7"
                                />
                            </div>
                        </div>
                        <span className="text-slate-400 text-xs pb-2">até</span>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400">Data Fim</label>
                            <div className="relative">
                                <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                                <Input
                                    type="date"
                                    value={filterDateEnd}
                                    onChange={(e) => { setFilterDateEnd(e.target.value); setCurrentPage(1); }}
                                    className="h-9 w-40 text-xs bg-white pl-7"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">Item</label>
                        <Input
                            placeholder="Filtrar item..."
                            value={filterItem}
                            onChange={(e) => { setFilterItem(e.target.value.toUpperCase()); setCurrentPage(1); }}
                            className="h-9 w-44 text-xs bg-white uppercase"
                        />
                    </div>
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold uppercase text-slate-400">OP</label>
                        <Input
                            placeholder="Filtrar OP..."
                            value={filterOP}
                            onChange={(e) => { setFilterOP(e.target.value.replace(/\D/g, '')); setCurrentPage(1); }}
                            className="h-9 w-36 text-xs bg-white"
                        />
                    </div>
                    {(filterDateStart || filterDateEnd || filterItem || filterOP) && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setFilterDateStart(''); setFilterDateEnd(''); setFilterItem(''); setFilterOP(''); setCurrentPage(1); }}
                            className="h-9 text-xs text-slate-500 hover:text-slate-800"
                        >
                            <X className="w-3 h-3 mr-1" /> Limpar Filtros
                        </Button>
                    )}
                </div>
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-700 font-bold uppercase text-xs sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Data</th>
                                <th className="px-4 py-3">Item</th>
                                <th className="px-4 py-3">OP</th>
                                <th className="px-4 py-3">Processo</th>
                                <th className="px-4 py-3">Padrão</th>
                                <th className="px-4 py-3 text-center">Testes (1/2/3)</th>
                                <th className="px-4 py-3 text-center">Média</th>
                                <th className="px-4 py-3">Validação</th>
                                <th className="px-4 py-3">Adesivo</th>
                                <th className="px-4 py-3">Esp. Padrão</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={11} className="p-8 text-center text-slate-400">Carregando registros...</td></tr>
                            ) : (() => {
                                // Apply filters with date range
                                const filteredRecords = records.filter(r => {
                                    let matchDate = true;
                                    if (filterDateStart && filterDateEnd) {
                                        matchDate = r.date >= filterDateStart && r.date <= filterDateEnd;
                                    } else if (filterDateStart) {
                                        matchDate = r.date >= filterDateStart;
                                    } else if (filterDateEnd) {
                                        matchDate = r.date <= filterDateEnd;
                                    }
                                    const matchItem = !filterItem || r.item_code.includes(filterItem);
                                    const matchOP = !filterOP || r.op_number.includes(filterOP);
                                    return matchDate && matchItem && matchOP;
                                });

                                // Pagination
                                const totalPages = Math.ceil(filteredRecords.length / RECORDS_PER_PAGE);
                                const startIndex = (currentPage - 1) * RECORDS_PER_PAGE;
                                const paginatedRecords = filteredRecords.slice(startIndex, startIndex + RECORDS_PER_PAGE);

                                if (filteredRecords.length === 0) {
                                    return <tr><td colSpan={11} className="p-8 text-center text-slate-400">Nenhum registro encontrado.</td></tr>;
                                }

                                return paginatedRecords.map((r) => (
                                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-4 py-2 font-mono text-xs">{new Date(r.date + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                        <td className="px-4 py-2 font-bold text-slate-800">{r.item_code}</td>
                                        <td className="px-4 py-2 font-mono text-xs">{r.op_number}</td>
                                        <td className="px-4 py-2">{r.process_type}</td>
                                        <td className="px-4 py-2">{r.standard_range}</td>
                                        <td className="px-4 py-2 text-center text-xs text-slate-500">
                                            {r.test_1} / {r.test_2} / {r.test_3}
                                        </td>
                                        <td className="px-4 py-2 text-center font-bold text-slate-800 bg-slate-50 rounded">{r.average}</td>
                                        <td className="px-4 py-2">
                                            <span className={cn("px-2 py-0.5 rounded text-[10px] uppercase font-bold border",
                                                r.validation_status === 'Teste dentro dos Parâmetros' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                                    r.validation_status?.includes('acima') ? "bg-amber-50 text-amber-600 border-amber-200" :
                                                        "bg-red-50 text-red-600 border-red-200")}>
                                                {r.validation_status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-xs">{r.adhesive_type}</td>
                                        <td className="px-4 py-2 text-xs">{r.standard_thickness}</td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {!isLoading && records.length > 0 && (() => {
                    const filteredRecords = records.filter(r => {
                        let matchDate = true;
                        if (filterDateStart && filterDateEnd) {
                            matchDate = r.date >= filterDateStart && r.date <= filterDateEnd;
                        } else if (filterDateStart) {
                            matchDate = r.date >= filterDateStart;
                        } else if (filterDateEnd) {
                            matchDate = r.date <= filterDateEnd;
                        }
                        const matchItem = !filterItem || r.item_code.includes(filterItem);
                        const matchOP = !filterOP || r.op_number.includes(filterOP);
                        return matchDate && matchItem && matchOP;
                    });
                    const totalPages = Math.ceil(filteredRecords.length / RECORDS_PER_PAGE);

                    if (totalPages <= 1) return null;

                    return (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
                            <div className="text-xs text-slate-500">
                                Mostrando {((currentPage - 1) * RECORDS_PER_PAGE) + 1} - {Math.min(currentPage * RECORDS_PER_PAGE, filteredRecords.length)} de {filteredRecords.length} registros
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 px-2"
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <span className="text-sm font-medium text-slate-600">
                                    Página {currentPage} de {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="h-8 px-2"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    );
                })()}
            </Card>
        </div>
    );
}
