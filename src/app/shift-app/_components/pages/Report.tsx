
import React from 'react';
import { ProductTicket, TicketStatus } from '../../_types/types';
import { Icons } from '../Icons';
import { cn } from '@/lib/utils';

interface ReportProps {
  ticket: ProductTicket;
  onClose: () => void;
}

export const Report: React.FC<ReportProps> = ({ ticket, onClose }) => {

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-gray-100/50 backdrop-blur-sm overflow-auto flex justify-center py-8 print:p-0 print:bg-white print:fixed print:inset-0">
      <div className="w-full max-w-[210mm] bg-white shadow-2xl print:shadow-none print:w-full flex flex-col min-h-[297mm] print:min-h-0">

        {/* Toolbar - Screen Only */}
        <div className="flex justify-between items-center p-4 bg-emerald-900 text-white print:hidden rounded-t-lg mx-4 mt-4 sticky top-4 z-50 shadow-lg">
          <button onClick={onClose} className="flex items-center gap-2 hover:text-emerald-200 transition-colors">
            <Icons.ChevronRight className="rotate-180" size={18} />
            <span className="font-medium text-sm">Voltar ao Painel</span>
          </button>
          <button
            onClick={handlePrint}
            className="bg-white text-emerald-900 px-4 py-1.5 rounded-md hover:bg-emerald-50 flex items-center gap-2 font-bold text-sm transition-colors"
          >
            <Icons.Print size={16} />
            Imprimir PDF
          </button>
        </div>

        {/* DOCUMENT CONTENT */}
        <div className="flex-1 p-12 lg:p-16 print:p-0 flex flex-col relative">

          {/* 1. Header Section */}
          <header className="flex justify-between items-start border-b-4 border-emerald-600 pb-8 mb-8">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-600 text-white p-3 rounded-lg print:border print:border-emerald-600 print:text-emerald-900 print:bg-transparent">
                <Icons.Settings size={32} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-emerald-900 uppercase tracking-tight">ShiftApp</h1>
                <p className="text-sm font-medium text-emerald-600/70 uppercase tracking-widest mt-0.5">Relatório Técnico</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">ID da Solicitação</p>
              <h2 className="text-4xl font-mono font-bold text-gray-900">{ticket.id}</h2>
            </div>
          </header>

          {/* 2. Status & Metadata Grid */}
          <div className="grid grid-cols-12 gap-6 mb-12">
            <div className="col-span-8 bg-slate-50 p-6 rounded-xl border border-slate-100 print:border-slate-200 print:bg-transparent">
              <div className="flex justify-between items-start mb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status Atual</span>
                <span className="text-xs font-mono text-slate-400">{new Date(ticket.updatedAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-3 h-3 rounded-full",
                  ticket.status === TicketStatus.APPROVED ? "bg-emerald-500" :
                    ticket.status === TicketStatus.REJECTED ? "bg-red-500" :
                      "bg-blue-500"
                )} />
                <span className="text-2xl font-bold text-slate-900 uppercase">{ticket.status}</span>
              </div>
            </div>
            <div className="col-span-4 bg-white border border-slate-200 p-6 rounded-xl flex flex-col justify-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Código do Produto</span>
              <span className="text-xl font-mono font-bold text-slate-700">{ticket.productCode}</span>
            </div>
          </div>

          {/* 3. Product Details */}
          <section className="mb-12">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-3 mb-6 flex items-center gap-2">
              Dados da Solicitação
            </h3>

            <div className="grid grid-cols-2 gap-x-12 gap-y-8">
              <div className="col-span-2">
                <div className="text-xs font-bold text-slate-400 uppercase mb-1">Produto</div>
                <div className="text-lg font-medium text-slate-900">{ticket.productName}</div>
              </div>

              <div className="col-span-2">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Descrição da Alteração</div>
                <div className="text-sm bg-slate-50 p-6 rounded-lg border border-slate-200 text-slate-700 leading-relaxed whitespace-pre-wrap print:bg-white print:border-slate-300 font-medium">
                  {ticket.description}
                </div>
              </div>
            </div>
          </section>

          {/* 4. Workflow Tasks */}
          <section className="mb-12">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-3 mb-6">
              Histórico de Tarefas
            </h3>
            {ticket.subTasks.length > 0 ? (
              <div className="space-y-3">
                {ticket.subTasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-4 p-3 border-b border-slate-100 last:border-0 print:border-slate-200 break-inside-avoid">
                    <div className={cn(
                      "mt-1 w-5 h-5 rounded border flex items-center justify-center shrink-0",
                      task.completed ? "bg-emerald-600 border-emerald-600" : "border-gray-300"
                    )}>
                      {task.completed && <Icons.Check size={12} className="text-white" />}
                    </div>
                    <div className="flex-1">
                      <p className={cn("text-sm font-medium", task.completed ? "text-slate-900" : "text-slate-500")}>
                        {task.description}
                      </p>
                      {task.assignedTo && (
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Resp: {task.assignedTo}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic py-4">Nenhuma tarefa registrada.</p>
            )}
          </section>



        </div>
      </div>
    </div>
  );
};



