"use client";

import { useState, useEffect } from "react";
import { Save, Target, DollarSign, TrendingUp, Factory, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function MetasPage() {
    const [config, setConfig] = useState({
        metaProducaoAnual: 0,
        metaProducaoMensal: 0,
        valorFechadoAnterior: 0, // Valor fechado até o mês anterior (editável)
        metaFaturamentoME: 0,
        metaFaturamentoMI: 0,
    });
    const [loading, setLoading] = useState(true);
    const [showSuccess, setShowSuccess] = useState(false);

    useEffect(() => {
        loadMetas();
    }, []);

    const loadMetas = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .schema('dashboards')
                .from('metas')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
                console.error("Erro ao carregar metas:", error);
            }

            if (data) {
                setConfig({
                    metaProducaoAnual: data.meta_producao_anual || 0,
                    metaProducaoMensal: data.meta_producao_mensal || 0,
                    valorFechadoAnterior: data.valor_fechado_anterior || 0,
                    metaFaturamentoME: data.meta_faturamento_ext || 0,
                    metaFaturamentoMI: data.meta_faturamento_int || 0,
                });
            }
        } catch (err) {
            console.error("Erro inesperado:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Accept only numbers
        const numValue = Number(value.replace(/\D/g, ""));
        setConfig(prev => ({ ...prev, [name]: numValue }));
    };

    const handleSave = async () => {
        try {
            const { error } = await supabase
                .schema('dashboards')
                .from('metas')
                .insert([{
                    meta_producao_anual: config.metaProducaoAnual,
                    meta_producao_mensal: config.metaProducaoMensal,
                    valor_fechado_anterior: config.valorFechadoAnterior,
                    meta_faturamento_ext: config.metaFaturamentoME,
                    meta_faturamento_int: config.metaFaturamentoMI
                }]);

            if (error) throw error;

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
        } catch (err: any) {
            console.error("Erro ao salvar:", err);
            alert("Erro ao salvar metas: " + err.message);
        }
    };

    const formatCurrency = (val: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
    };

    const formatNumber = (val: number) => {
        return new Intl.NumberFormat('pt-BR').format(val);
    };

    if (loading) {
        return <div className="flex items-center justify-center h-full text-muted-foreground">Carregando metas...</div>;
    }

    return (
        <div className="flex flex-col h-full w-full p-6 gap-8 font-sans text-foreground max-w-5xl mx-auto relative">

            {/* Success Toast */}
            {showSuccess && (
                <div className="absolute top-4 right-4 z-50 bg-[#34d399] text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                    <Check className="w-6 h-6" />
                    <span className="font-bold text-lg">Metas salvas com sucesso!</span>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between bg-card/95 p-6 rounded-2xl border border-border backdrop-blur-md shadow-xl">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-primary/20 rounded-2xl text-primary border border-primary/30">
                        <Target className="w-10 h-10" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold tracking-wide text-[#374151]">Definição de Metas</h1>
                        <p className="text-muted-foreground text-lg mt-1">Configure os objetivos anuais e mensais para os indicadores.</p>
                    </div>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-3 bg-[#34d399] hover:bg-[#2dba87] text-white px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-[#34d399]/30 active:scale-95 border border-[#34d399]/50"
                >
                    <Save className="w-6 h-6" />
                    Salvar Metas
                </button>
            </div>

            <div className="grid grid-cols-2 gap-8">

                {/* Produção Section */}
                <div className="bg-card/95 backdrop-blur p-8 rounded-3xl border border-border shadow-2xl flex flex-col gap-6">
                    <div className="flex items-center gap-3 border-b border-border pb-4 mb-2">
                        <Factory className="w-6 h-6 text-primary" />
                        <h2 className="text-2xl font-bold uppercase tracking-widest text-foreground">Produção</h2>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">Meta Anual (Peças)</label>
                        <div className="relative group">
                            <input
                                type="text"
                                name="metaProducaoAnual"
                                value={formatNumber(config.metaProducaoAnual)}
                                onChange={handleChange}
                                className="w-full bg-muted/50 border border-border rounded-xl p-4 text-3xl font-bold text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all group-hover:border-primary/50"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm pointer-events-none">PÇS</div>
                        </div>
                        <p className="text-xs text-muted-foreground ml-1">Total esperado para o ano corrente.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">Meta Mensal (Peças)</label>
                        <div className="relative group">
                            <input
                                type="text"
                                name="metaProducaoMensal"
                                value={formatNumber(config.metaProducaoMensal)}
                                onChange={handleChange}
                                className="w-full bg-muted/50 border border-border rounded-xl p-4 text-3xl font-bold text-foreground focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all group-hover:border-primary/50"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm pointer-events-none">PÇS</div>
                        </div>
                        <p className="text-xs text-muted-foreground ml-1">Objetivo base para cada mês.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">Valor Fechado Até Mês Anterior (Peças)</label>
                        <div className="relative group">
                            <input
                                type="text"
                                name="valorFechadoAnterior"
                                value={formatNumber(config.valorFechadoAnterior)}
                                onChange={handleChange}
                                className="w-full bg-muted/50 border border-border rounded-xl p-4 text-3xl font-bold text-green-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all group-hover:border-green-500/50"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm pointer-events-none">PÇS</div>
                        </div>
                        <p className="text-xs text-muted-foreground ml-1">Soma da produção dos meses anteriores (será somado com o mês atual).</p>
                    </div>
                </div>

                {/* Financeiro Section */}
                <div className="bg-card/95 backdrop-blur p-8 rounded-3xl border border-border shadow-2xl flex flex-col gap-6">
                    <div className="flex items-center gap-3 border-b border-border pb-4 mb-2">
                        <TrendingUp className="w-6 h-6 text-green-500" />
                        <h2 className="text-2xl font-bold uppercase tracking-widest text-foreground">Faturamento</h2>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">Meta Mercado Externo (R$)</label>
                        <div className="relative group">
                            <input
                                type="text" // Using text to handle masked input logic if needed, simplify here
                                name="metaFaturamentoME"
                                value={config.metaFaturamentoME.toLocaleString('pt-BR')}
                                onChange={handleChange}
                                className="w-full bg-muted/50 border border-border rounded-xl p-4 text-3xl font-bold text-green-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all group-hover:border-green-500/50"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm pointer-events-none">R$</div>
                        </div>
                        <p className="text-xs text-muted-foreground ml-1">Meta mensal para exportação.</p>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider ml-1">Meta Mercado Interno (R$)</label>
                        <div className="relative group">
                            <input
                                type="text"
                                name="metaFaturamentoMI"
                                value={config.metaFaturamentoMI.toLocaleString('pt-BR')}
                                onChange={handleChange}
                                className="w-full bg-muted/50 border border-border rounded-xl p-4 text-3xl font-bold text-green-500 focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition-all group-hover:border-green-500/50"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm pointer-events-none">R$</div>
                        </div>
                        <p className="text-xs text-muted-foreground ml-1">Meta mensal para mercado nacional.</p>
                    </div>
                </div>

            </div>
        </div>
    );
}
