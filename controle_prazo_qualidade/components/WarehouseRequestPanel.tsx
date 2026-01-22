
import React, { useState } from 'react';
import { WarehouseRequest, RequestType } from '../types';
import { Plus, CheckCircle, Package, User, Clock, Hammer, Box } from 'lucide-react';

interface WarehouseRequestPanelProps {
  type: RequestType;
  requests: WarehouseRequest[];
  onRequestCreate: (req: Omit<WarehouseRequest, 'id' | 'createdAt' | 'status'>) => void;
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
        item: newItem,
        quantity: newQuantity,
        requester,
      });
      setNewItem('');
      setNewQuantity(1);
      setRequester('');
    }
  };

  // Filter only pending and SORT BY NEWEST FIRST (b - a)
  const pendingRequests = requests
    .filter(r => r.status === 'PENDING')
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const totalPages = Math.ceil(pendingRequests.length / itemsPerPage);
  const paginatedRequests = pendingRequests.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6">
      {/* Request Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Icon className="w-5 h-5 text-blue-600" />
          {title} - Novo Pedido
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Item / Material</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-900"
              placeholder={isProfile ? "Ex: Perfil U 4 Polegadas" : "Ex: Parafuso Sextavado M10"}
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Quantidade</label>
            <input
              type="number"
              min="1"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-900"
              value={newQuantity}
              onChange={(e) => setNewQuantity(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Solicitante</label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-900"
                placeholder="Nome"
                value={requester}
                onChange={(e) => setRequester(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="md:col-span-4 flex justify-end mt-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg flex items-center justify-center gap-2 transition shadow-sm w-full md:w-auto"
            >
              <Plus className="w-4 h-4" />
              Solicitar Material
            </button>
          </div>
        </form>
      </div>

      {/* Pending Requests List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
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
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    Nenhum pedido pendente neste setor.
                  </td>
                </tr>
              ) : (
                paginatedRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-2">
                       <Package className="w-4 h-4 text-slate-400" />
                       {req.item}
                    </td>
                    <td className="px-6 py-4 font-bold">{req.quantity}</td>
                    <td className="px-6 py-4">{req.requester}</td>
                    <td className="px-6 py-4 flex items-center gap-2">
                        <Clock className="w-3 h-3 text-slate-400"/> 
                        {req.createdAt.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => onRequestFinish(req.id)}
                        className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ml-auto border border-green-200"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Finalizar
                      </button>
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
                <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded border border-slate-200 disabled:opacity-50"
                >
                    Anterior
                </button>
                <span className="px-3 py-1 text-sm text-slate-600 self-center">
                    {currentPage} / {totalPages}
                </span>
                <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded border border-slate-200 disabled:opacity-50"
                >
                    Próxima
                </button>
            </div>
        )}
      </div>
    </div>
  );
};
