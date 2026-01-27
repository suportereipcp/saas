import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Notebook, ArrowRight } from "lucide-react";

export function NotesWelcome() {
    return (
        <div className="w-full h-full flex items-center justify-center bg-slate-50 p-6">
            <div className="max-w-md w-full flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-500">
                
                {/* Header / Branding */}
                <div className="flex flex-col items-center gap-4 text-center">
                    <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-2">
                        <Notebook className="w-10 h-10 text-emerald-600" strokeWidth={1.5} />
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-slate-800">Caderno Inteligente</h1>
                        <p className="text-slate-500">O que você gostaria de fazer hoje?</p>
                    </div>
                </div>

                {/* Main Actions */}
                <div className="w-full grid gap-4">
                    <Link href="/anotacoes?new=true" className="w-full group">
                        <Button 
                            className="w-full h-16 text-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all rounded-xl relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <Plus className="mr-2 w-6 h-6" />
                            Criar Nova Nota
                        </Button>
                    </Link>

                    <Link href="/anotacoes/memory" className="w-full group">
                        <Button 
                            variant="outline" 
                            className="w-full h-14 text-base border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/50 text-slate-700 transition-all rounded-xl justify-between px-6"
                        >
                            <span className="flex items-center gap-2">
                                <Notebook className="w-5 h-5 text-slate-400 group-hover:text-emerald-500 transition-colors" />
                                Minhas Anotações
                            </span>
                            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                        </Button>
                    </Link>
                </div>

                {/* Footer Info */}
                <p className="text-xs text-slate-400 text-center max-w-[280px] leading-relaxed">
                    Suas anotações são aprimoradas com IA para correções, resumos e busca.
                </p>
            </div>
        </div>
    );
}
