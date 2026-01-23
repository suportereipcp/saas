'use client';

import { useState } from "react";
import { Tag, Plus, User as UserIcon, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COLLABORATORS } from "../mock-data";

type MarkerType = 'person' | 'topic';

interface Marker {
    id: string;
    name: string;
    type: MarkerType;
    avatar: string | null;
}

export default function TagsPage() {
    // Mocking initial tags
    const [markers, setMarkers] = useState<Marker[]>([
        ...COLLABORATORS.map(c => ({ id: c.id, name: c.name, type: 'person' as MarkerType, avatar: c.avatar })),
        { id: 't1', name: 'Reunião Diretoria', type: 'topic', avatar: null },
        { id: 't2', name: 'Equipe de Projetos', type: 'topic', avatar: null },
        { id: 't3', name: 'Projeto Molde X', type: 'topic', avatar: null },
        { id: 't4', name: 'Manutenção Geral', type: 'topic', avatar: null },
    ]);

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newType, setNewType] = useState<MarkerType>('topic');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateMarker = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;

        setIsSubmitting(true);

        // Simulate network delay for better UX feeling
        await new Promise(resolve => setTimeout(resolve, 600));

        const newMarker: Marker = {
            id: Math.random().toString(36).substr(2, 9),
            name: newName,
            type: newType,
            avatar: newType === 'person'
                ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newName)}` // Matching mock data style
                : null
        };

        setMarkers(prev => [newMarker, ...prev]);
        setNewName("");
        setNewType('topic'); // Reset to default
        setIsDialogOpen(false);
        setIsSubmitting(false);
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
                    <DialogContent className="sm:max-w-md">
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
                                        <SelectItem value="topic">
                                            <div className="flex items-center gap-2">
                                                <Tag className="w-4 h-4 text-emerald-500" />
                                                <span>Tema / Tópico</span>
                                            </div>
                                        </SelectItem>
                                        <SelectItem value="person">
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
                <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {markers.map((marker) => (
                        <div key={marker.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer group">
                            <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100 transition-colors">
                                <Tag size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-bold text-slate-700 truncate">{marker.name}</h3>
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1">
                                    {marker.type === 'person' ? <Users size={10} /> : <Tag size={10} />}
                                    {marker.type === 'person' ? 'Pessoa' : 'Tema'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
