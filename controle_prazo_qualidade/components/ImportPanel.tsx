
import React, { useState } from 'react';
import { Product, ProductionItem, ProcessStatus } from '../types';
import { parseImportData } from '../services/geminiService';
import { UploadCloud, FileText, AlertCircle, CheckCircle, Loader2, ArrowRight, Hash, List } from 'lucide-react';

interface ImportPanelProps {
  products: Product[];
  onImportItems: (items: Partial<ProductionItem>[]) => void;
}

export const ImportPanel: React.FC<ImportPanelProps> = ({ products, onImportItems }) => {
  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<any[]>([]);

  const handleAnalyze = async () => {
    if (!textInput.trim()) return;
    setIsLoading(true);
    setError(null);
    setPreviewItems([]);

    try {
      const extracted = await parseImportData(textInput);
      
      // Match extracted items with existing products
      const matched = extracted.map(item => {
        const product = products.find(p => 
          p.name.toLowerCase() === item.productName.toLowerCase() || 
          item.productName.toLowerCase().includes(p.name.toLowerCase())
        );
        return {
          ...item,
          matchedProduct: product || null,
          status: product ? 'valid' : 'unknown_product'
        };
      });

      setPreviewItems(matched);
    } catch (err) {
      setError("Não foi possível processar os dados. Verifique sua chave de API e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  const confirmImport = () => {
    const validItems = previewItems
      .filter(i => i.matchedProduct)
      .map(i => ({
        id: crypto.randomUUID(),
        productId: i.matchedProduct!.id,
        calculo: i.calculo || 'N/A',
        listNumber: i.listNumber || undefined,
        quantity: i.quantity,
        blastedAt: new Date(i.blastedTime),
        status: ProcessStatus.BLASTED,
      } as Partial<ProductionItem>));

    onImportItems(validItems);
    setTextInput('');
    setPreviewItems([]);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Entrada de Dados (Relatório de Jateamento)
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Cole abaixo o conteúdo do arquivo de importação. 
            A IA irá identificar Produtos, Quantidades, Horários, <strong>Número do Cálculo/Lote</strong> e <strong>Número da Lista</strong>.
          </p>
        </div>
        
        <textarea
          className="flex-1 w-full p-4 bg-slate-50 border border-slate-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-4 text-slate-900"
          placeholder={`Exemplo:
Lista 550 - Cálculo 10205: 50 un de Engrenagem X20 jateadas as 10:30
Romaneio B-20 - OP 3321: 20 un de Eixo Y50 jateadas as 11:15`}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
        />
        
        <button
          onClick={handleAnalyze}
          disabled={isLoading || !textInput.trim()}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
          {isLoading ? 'Analisando com IA...' : 'Processar Dados'}
        </button>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Pré-visualização da Importação</h2>
        
        <div className="flex-1 overflow-y-auto pr-2">
          {previewItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
              <Loader2 className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">Aguardando processamento...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {previewItems.map((item, idx) => (
                <div key={idx} className={`p-4 rounded-lg border flex items-center justify-between ${item.matchedProduct ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="bg-slate-200 text-slate-700 text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                            <Hash className="w-3 h-3" /> {item.calculo}
                        </span>
                        {item.listNumber && (
                           <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                              <List className="w-3 h-3" /> {item.listNumber}
                           </span>
                        )}
                        <span className="text-xs text-slate-400">|</span>
                        <div className="font-medium text-slate-900">
                            {item.productName} 
                        </div>
                    </div>
                    <div className="text-sm text-slate-600 mb-1">Quantidade: {item.quantity}</div>
                    <div className="text-xs text-slate-500">
                      Jateado: {new Date(item.blastedTime).toLocaleString()}
                    </div>
                    {!item.matchedProduct && (
                      <div className="text-xs text-red-600 mt-1 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Produto não encontrado
                      </div>
                    )}
                  </div>
                  {item.matchedProduct && <CheckCircle className="w-5 h-5 text-green-600" />}
                </div>
              ))}
            </div>
          )}
        </div>

        {previewItems.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
             <div className="flex justify-between items-center mb-4 text-sm text-slate-600">
               <span>{previewItems.filter(i => i.matchedProduct).length} itens válidos</span>
               <span>{previewItems.filter(i => !i.matchedProduct).length} erros</span>
             </div>
             <button
               onClick={confirmImport}
               disabled={previewItems.filter(i => i.matchedProduct).length === 0}
               className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition"
             >
               Confirmar Importação <ArrowRight className="w-4 h-4" />
             </button>
          </div>
        )}
      </div>
    </div>
  );
};
