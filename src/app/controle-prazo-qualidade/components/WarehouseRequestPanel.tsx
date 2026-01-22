import React, { useState } from 'react';
import { WarehouseRequest, RequestType } from '../types';
import { Plus, CheckCircle, Package, User, Clock, Hammer, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface WarehouseRequestPanelProps {
    type: RequestType;
    requests: WarehouseRequest[];
    onRequestCreate: (req: any) => void;
    onRequestFinish: (id: string) => void;
}

export const WarehouseRequestPanel: React.FC<WarehouseRequestPanelProps> = ({ type, requests, onRequestCreate, onRequestFinish }) => {
    const [newItem, setNewItem] = useState('');
    const [newQuantity, setNewQuantity] = useState(1);
    const [requester, setRequester] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const isProfile = type === 'PROFILE';
    const title = isProfile ? 'Almoxarifado de Perfil' : 'Solicitação de Ferragem';
    const Icon = isProfile ? Box : Hammer;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem && requester) {
            onRequestCreate({
                type,
                item_code: newItem,
                quantity: newQuantity,
                requester,
            });
            setNewItem('');
            setNewQuantity(1);
            setRequester('');
        }
    };

    const pendingRequests = requests
        .filter(r => r.status === 'PENDING' && r.type === type)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const totalPages = Math.ceil(pendingRequests.length / itemsPerPage);
    const paginatedRequests = pendingRequests.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-6">
            {/* Request Form */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Icon className="w-5 h-5 text-slate-800" />
                        {title} - Novo Pedido
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                        <div className="md:col-span-2 space-y-2">
                            <label className="text-sm font-medium leading-none">Item / Material</label>
                            <Input
                                placeholder={isProfile ? "R-025.1.1" : "R-025.2"}
                                value={newItem}
                                onChange={(e) => setNewItem(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">Quantidade</label>
                            <Input
                                type="number"
                                min="1"
                                value={newQuantity}
                                onChange={(e) => setNewQuantity(Number(e.target.value))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium leading-none">Solicitante</label>
                            <div className="relative">
                                <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    className="pl-9"
                                    placeholder="Nome"
                                    value={requester}
                                    onChange={(e) => setRequester(e.target.value)}
                                    required
                                />
                            </div>
                        </div>
                        <div className="md:col-span-4 flex justify-end mt-2">
                            <Button type="submit" className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-600 text-white">
                                <Plus className="w-4 h-4 mr-2" />
                                Solicitar Material
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Pending Requests List */}
            <Card>
                <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="font-semibold text-slate-700">Pedidos Pendentes</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-semibold uppercase tracking-wider text-xs">
                            <tr>
                                <th className="px-6 py-3">Item</th>
                                <th className="px-6 py-3">Qtd</th>
                                <th className="px-6 py-3">Solicitante</th>
                                <th className="px-6 py-3">Data/Hora</th>
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paginatedRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                                        Nenhum pedido pendente neste setor.
                                    </td>
                                </tr>
                            ) : (
                                paginatedRequests.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50 transition">
                                        <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                                            <Package className="w-4 h-4 text-slate-400" />
                                            {req.item_code}
                                        </td>
                                        <td className="px-6 py-4 font-bold">{req.quantity}</td>
                                        <td className="px-6 py-4">{req.requester}</td>
                                        <td className="px-6 py-4 flex items-center gap-2">
                                            <Clock className="w-3 h-3 text-emerald-400" />
                                            {new Date(req.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                size="sm"
                                                onClick={() => onRequestFinish(req.id)}
                                                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200"
                                                variant="outline"
                                            >
                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                Finalizar
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Simple Pagination */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                        >
                            Anterior
                        </Button>
                        <span className="px-3 py-1 text-sm text-slate-600 self-center">
                            {currentPage} / {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                        >
                            Próxima
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};
