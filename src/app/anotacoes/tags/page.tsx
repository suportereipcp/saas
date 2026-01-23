'use client';

import { useState, useEffect } from "react";
import { Tag, Plus, User as UserIcon, Users, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type MarkerType = 'PERSON' | 'TOPIC';

interface Marker {
    id: string;
    name: string;
    type: MarkerType;
    avatar_url: string | null;
    created_at: string;
}

export default function TagsPage() {
    const [markers, setMarkers] = useState<Marker[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form State
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState<MarkerType>('TOPIC');
    const [isSubmitting, setIsSubmitting] = useState(false);


    const fetchMarkers = async () => {
        setIsLoading(true);
        const { data, error } = await supabase
            .schema('app_anotacoes')
            .from('markers')
            .select('*')
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(error);
            toast.error("Erro ao carregar marcadores.");
        } else {
            // Safe cast assuming DB types match roughly
            setMarkers(data as any[] || []);
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchMarkers();
    }, []);

    const handleCreateMarker = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setIsSubmitting(true);

        const avatarUrl = null;

        const { data, error } = await supabase
            .schema('app_anotacoes')
            .from('markers')
            .insert({
                name: newName,
                type: newType,
                avatar_url: avatarUrl,
                metadata: {}
            })
            .select() // Return the created row to add to UI
            .single();

        if (error) {
            console.error(error);
            toast.error("Erro ao criar marcador.");
        } else {
            toast.success("Marcador criado!");
            setMarkers(prev => [data as any, ...prev]);

            // Reset Form and Close
            setNewName("");
            setNewType('TOPIC');
            setIsDialogOpen(false);
        }

        setIsSubmitting(false);
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Tem certeza que deseja remover este marcador?")) return;

        const { error } = await supabase
            .schema('app_anotacoes')
            .from('markers')
            .update({ is_active: false }) // Soft delete
            .eq('id', id);

        if (error) {
            toast.error("Erro ao remover.");
        } else {
            toast.success("Marcador removido.");
            setMarkers(prev => prev.filter(m => m.id !== id));
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm shrink-0 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <Tag size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Marcadores</h1>
                        <p className="text-xs text-slate-500 font-medium">Gerencie pessoas e temas</p>
                    </div>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full gap-2 px-3 sm:px-4">
                            <Plus size={18} />
                            <span className="hidden sm:inline">Novo Marcador</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md bg-white">
                        <DialogHeader>
                            <DialogTitle>Criar Novo Marcador</DialogTitle>
                            <DialogDescription>
                                Adicione uma pessoa ou tema para organizar suas anotações.
                            </DialogDescription>
                        </DialogHeader>

                        <form onSubmit={handleCreateMarker} className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Nome</Label>
                                <Input
                                    id="name"
                                    placeholder="Ex: Projeto X ou João Silva"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="type">Tipo</Label>
                                <Select
                                    value={newType}
                                    onValueChange={(value: MarkerType) => setNewType(value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TOPIC">
                                            <div className="flex items-center gap-2">
                                                <Tag className="w-4 h-4 text-emerald-500" />
                                                <span>Tema / Tópico</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="PERSON">
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="w-4 h-4 text-blue-500" />
                                                <span>Pessoa / Colaborador</span>
                                            </div>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter className="pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                                    Cancelar
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    disabled={!newName.trim() || isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Criando...
                                        </>
                                    ) : (
                                        "Criar Marcador"
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto p-6">

                {isLoading && (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    </div>
                )}

                {!isLoading && markers.length === 0 && (
                    <div className="text-center py-20 opacity-50">
                        <p>Nenhum marcador criado ainda.</p>
                        <p className="text-sm">Clique em "Novo Marcador" para começar.</p>
                    </div>
                )}

                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {markers.map((marker) => (
                        <div key={marker.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow cursor-default group relative">
                            {/* Avatar / Icon */}
                            <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors overflow-hidden">
                                {marker.avatar_url ? (
                                    <img src={marker.avatar_url} alt={marker.name} className="w-full h-full object-cover" />
                                ) : (
                                    <Tag size={20} />
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-700 truncate">{marker.name}</h3>
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
                                    {marker.type === 'PERSON' ? <Users size={10} /> : <Tag size={10} />}
                                    {marker.type === 'PERSON' ? 'Pessoa' : 'Tema'}
                                </p>
                            </div>

                            {/* Delete Button (Hover) */}
                            <button
                                onClick={(e) => handleDelete(marker.id, e)}
                                className="absolute top-2 right-2 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remover"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
