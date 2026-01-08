
import React, { useState } from 'react';
import { Product } from '../types';
import { Plus, Archive, RefreshCcw, Package, Clock, Search, ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductManagerProps {
  products: Product[];
  onAddProduct: (p: Product) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
}

export const ProductManager: React.FC<ProductManagerProps> = ({ products, onAddProduct, onToggleStatus }) => {
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    material: '',
    washDeadlineMinutes: 60,
    adhesiveDeadlineMinutes: 120,
  });
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProduct.name && newProduct.material) {
      onAddProduct({
        id: crypto.randomUUID(),
        name: newProduct.name,
        material: newProduct.material,
        washDeadlineMinutes: newProduct.washDeadlineMinutes || 60,
        adhesiveDeadlineMinutes: newProduct.adhesiveDeadlineMinutes || 120,
        isActive: true
      });
      setNewProduct({ name: '', material: '', washDeadlineMinutes: 60, adhesiveDeadlineMinutes: 120 });
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.material.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Cadastro Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Package className="w-5 h-5 text-blue-600" />
          Cadastro de Produto
        </h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-slate-500 mb-1">Nome do Produto</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-900"
              placeholder="Ex: R-025.2/JATEADO"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Material</label>
            <input
              type="text"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-900"
              placeholder="Ex: Ferro Fundido"
              value={newProduct.material}
              onChange={(e) => setNewProduct({ ...newProduct, material: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Prazo Lavagem (min)</label>
            <input
              type="number"
              min="1"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-900"
              value={newProduct.washDeadlineMinutes}
              onChange={(e) => setNewProduct({ ...newProduct, washDeadlineMinutes: parseInt(e.target.value) })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Prazo Adesivo (min)</label>
            <input
              type="number"
              min="1"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-900"
              value={newProduct.adhesiveDeadlineMinutes}
              onChange={(e) => setNewProduct({ ...newProduct, adhesiveDeadlineMinutes: parseInt(e.target.value) })}
              required
            />
          </div>
          <div className="lg:col-span-5 flex justify-end mt-2">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg flex items-center justify-center gap-2 transition shadow-sm w-full md:w-auto"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Produto
            </button>
          </div>
        </form>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-semibold text-slate-700">Produtos Cadastrados</h3>
          
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Filtrar por nome..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full text-slate-900"
            />
          </div>
        </div>
        
        {/* DESKTOP TABLE */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-800 font-semibold uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-3">Produto</th>
                <th className="px-6 py-3">Material</th>
                <th className="px-6 py-3">Prazo Lavagem</th>
                <th className="px-6 py-3">Prazo Adesivo</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    {searchTerm ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado.'}
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((product) => {
                  const isActive = product.isActive !== false;
                  return (
                    <tr key={product.id} className={`hover:bg-slate-50 transition ${!isActive ? 'bg-slate-50 opacity-60' : ''}`}>
                      <td className="px-6 py-4 font-medium text-slate-900">{product.name}</td>
                      <td className="px-6 py-4">{product.material}</td>
                      <td className="px-6 py-4 flex items-center gap-2">
                          <Clock className="w-3 h-3 text-amber-500"/> {product.washDeadlineMinutes} min
                      </td>
                      <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3 text-purple-500"/> {product.adhesiveDeadlineMinutes} min
                          </div>
                      </td>
                      <td className="px-6 py-4">
                         <span className={`px-2 py-1 rounded text-xs font-bold ${isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                            {isActive ? 'ATIVO' : 'INATIVO'}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => onToggleStatus(product.id, isActive)}
                          className={`p-1.5 rounded transition flex items-center gap-1 ml-auto text-xs font-medium ${
                             isActive 
                                ? 'text-slate-500 hover:text-red-600 hover:bg-red-50' 
                                : 'text-green-600 hover:text-green-700 hover:bg-green-50'
                          }`}
                        >
                          {isActive ? <Archive className="w-4 h-4" /> : <RefreshCcw className="w-4 h-4" />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARD LIST */}
        <div className="md:hidden p-4 space-y-4">
            {paginatedProducts.length === 0 ? (
                <div className="text-center text-slate-400 py-8 text-sm">Nenhum produto encontrado.</div>
            ) : (
                paginatedProducts.map((product) => {
                    const isActive = product.isActive !== false;
                    return (
                        <div key={product.id} className={`bg-white border border-slate-200 rounded-lg p-4 shadow-sm ${!isActive ? 'opacity-70' : ''}`}>
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-slate-800 text-sm">{product.name}</h4>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-500'}`}>
                                    {isActive ? 'ATIVO' : 'INATIVO'}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mb-3">{product.material}</p>
                            <div className="flex gap-4 text-xs mb-3">
                                <span className="flex items-center gap-1 text-amber-600"><Clock className="w-3 h-3"/> L: {product.washDeadlineMinutes}m</span>
                                <span className="flex items-center gap-1 text-purple-600"><Clock className="w-3 h-3"/> A: {product.adhesiveDeadlineMinutes}m</span>
                            </div>
                            <div className="flex justify-end">
                                <button
                                onClick={() => onToggleStatus(product.id, isActive)}
                                className={`text-xs font-medium flex items-center gap-1 ${isActive ? 'text-red-600' : 'text-green-600'}`}
                                >
                                {isActive ? <Archive className="w-3 h-3" /> : <RefreshCcw className="w-3 h-3" />}
                                {isActive ? 'Inativar' : 'Reativar'}
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>

        {/* Pagination Controls */}
        {filteredProducts.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between bg-slate-50 gap-4">
             <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span>Exibir:</span>
                  <select 
                    value={itemsPerPage}
                    onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                    className="bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={10}>10</option>
                    <option value={50}>50</option>
                    <option value={9999}>Todos</option>
                  </select>
                </div>
                <span>
                   {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredProducts.length)} de {filteredProducts.length}
                </span>
             </div>
             
             {totalPages > 1 && (
               <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium text-slate-700">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};
