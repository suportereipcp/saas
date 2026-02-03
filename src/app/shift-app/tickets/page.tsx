'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Icons } from '../_components/Icons';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { TicketStatus, ProductTicket, Attachment, AttachmentType } from '../_types/types';
import { getTickets, saveTicket, uploadFile, getCurrentUser, getProductDescription } from '../_services/storageService';
import { useRouter } from 'next/navigation';

import { User } from '../_types/types'; // user import might needed if not present

export default function TicketsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const u = await getCurrentUser();
            setUser(u);
        };
        fetchUser();
    }, []);

    // Data List State
    const [tickets, setTickets] = useState<ProductTicket[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [ticketPage, setTicketPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalTickets, setTotalTickets] = useState(0);

    // New Ticket Modal State
    const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
    const [newTicketData, setNewTicketData] = useState({ name: '', code: '', desc: '', responsible: '' });
    const [productImg, setProductImg] = useState<File | null>(null);
    const [productImgPreview, setProductImgPreview] = useState<string | null>(null);
    const productImgInputRef = useRef<HTMLInputElement>(null);
    const [newTicketFiles, setNewTicketFiles] = useState<File[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch Data
    useEffect(() => {
        const fetchTicketsQuery = async () => {
            setIsLoadingData(true);
            const { data, count } = await getTickets(ticketPage, pageSize, searchTerm);
            setTickets(data);
            setTotalTickets(count);
            setIsLoadingData(false);
        };

        const timeout = setTimeout(() => {
            fetchTicketsQuery();
        }, 500);
        return () => clearTimeout(timeout);
    }, [ticketPage, pageSize, searchTerm]);

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= Math.ceil(totalTickets / pageSize)) {
            setTicketPage(newPage);
        }
    };

    // Modal Handlers
    const handleProductImgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProductImg(file);
            const reader = new FileReader();
            reader.onloadend = () => setProductImgPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setNewTicketFiles(prev => [...prev, ...files]);
        }
    };

    const removeFile = (index: number) => {
        setNewTicketFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleCodeBlur = async () => {
        if (!newTicketData.code) return;

        // Show loading state if desired, or silent update
        const desc = await getProductDescription(newTicketData.code);
        if (desc) {
            setNewTicketData(prev => ({ ...prev, name: desc }));
            toast.success("Produto encontrado no Datasul!");
        }
    };

    const handleCreateTicket = async () => {
        if (!newTicketData.name || !newTicketData.code) return;
        setIsUploading(true);

        try {
            // 1. Upload Product Image if exists
            let productImageParams = '';
            if (productImg) {
                productImageParams = await uploadFile(productImg);
            }

            // 2. Upload Attachments
            const attachments: Attachment[] = [];
            for (const file of newTicketFiles) {
                const publicUrl = await uploadFile(file);
                attachments.push({
                    id: Date.now().toString() + Math.random(),
                    name: file.name,
                    type: file.type.includes('image') ? AttachmentType.IMAGE : AttachmentType.DOCUMENT,
                    url: publicUrl,
                    uploadedAt: new Date().toISOString(),
                    stage: TicketStatus.EVALUATION
                });
            }

            const nextId = totalTickets + 1; // Basic ID generation, DB handles collisions mainly but here we use manual ID? 
            // In App.tsx: const nextId = totalTickets + 1; const formattedId = `TK-${String(nextId).padStart(4, '0')}`;
            // If using DB ID gen, we should let DB handle it. But saveTicket expects ID.
            // I'll stick to logic but Date.now() is safer if concurrency.
            // Or UUID. I'll use Date.now() suffix for safety if not strictly sequential.
            const formattedId = `TK-${String(nextId).padStart(4, '0')}-${Date.now().toString().slice(-4)}`;

            const newTicket: ProductTicket = {
                id: formattedId,
                productCode: newTicketData.code,
                productName: newTicketData.name,
                productImage: productImageParams,
                description: newTicketData.desc,
                status: TicketStatus.EVALUATION,
                requesterName: user?.name || 'User',
                trackingResponsible: newTicketData.responsible,
                changerName: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                subTasks: [],
                attachments: attachments,
                history: [{ id: Date.now().toString(), action: 'Criado', user: user?.name || 'User', timestamp: new Date().toISOString() }]
            };

            await saveTicket(newTicket);

            // Refresh list
            setIsLoadingData(true);
            const { data, count } = await getTickets(ticketPage, pageSize, searchTerm);
            setTickets(data);
            setTotalTickets(count);
            setIsLoadingData(false);

            // Clear Form
            setNewTicketData({ name: '', code: '', desc: '', responsible: '' });
            setNewTicketFiles([]);
            setProductImg(null);
            setProductImgPreview(null);
            setIsNewTicketModalOpen(false);
            toast.success("Solicitação criada com sucesso!");
        } catch (error) {
            toast.error("Erro ao criar solicitação. Tente novamente.");
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    // Skeleton component for Table Rows
    const TableRowSkeleton = () => (
        <tr>
            <td className="px-6 py-4"><Skeleton className="w-12 h-12 rounded-lg" /></td>
            <td className="px-6 py-4"><Skeleton className="w-20 h-4" /></td>
            <td className="px-6 py-4">
                <Skeleton className="w-32 h-5 mb-1" />
                <Skeleton className="w-16 h-3" />
            </td>
            <td className="px-6 py-4"><Skeleton className="w-24 h-4" /></td>
            <td className="px-6 py-4"><Skeleton className="w-20 h-6 rounded-full" /></td>
            <td className="px-6 py-4"><Skeleton className="w-16 h-4" /></td>
        </tr>
    );

    return (
        <div className="max-w-6xl mx-auto h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 sticky top-0 bg-gray-50 z-10 py-2 shrink-0">
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Alterações</h1>

                <div className="flex-1 w-full md:max-w-md relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icons.Search size={18} className="text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 sm:text-sm shadow-sm transition-all"
                        placeholder="Filtrar por produto..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setTicketPage(1);
                        }}
                    />
                </div>

                <button
                    onClick={() => {
                        setIsNewTicketModalOpen(true);
                        setNewTicketData({ name: '', code: '', desc: '', responsible: '' });
                        setProductImg(null);
                        setProductImgPreview(null);
                    }}
                    className="bg-emerald-600 text-white px-3 py-2 md:px-4 md:py-2 rounded-lg hover:bg-emerald-700 flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 w-full md:w-auto justify-center"
                >
                    <Icons.Plus size={20} />
                    <span className="inline">Nova Solicitação</span>
                </button>
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden md:flex flex-1 flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-0">
                <div className="flex-1 overflow-y-auto no-scrollbar">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-4 font-medium">Imagem</th>
                                <th className="px-6 py-4 font-medium">ID</th>
                                <th className="px-6 py-4 font-medium">Produto</th>
                                <th className="px-6 py-4 font-medium">Responsável</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Ação</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoadingData ? (
                                [...Array(5)].map((_, i) => <TableRowSkeleton key={i} />)
                            ) : tickets.length > 0 ? (
                                tickets.map(t => (
                                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            {t.productImage ? (
                                                <img src={t.productImage} alt="Produto" className="w-12 h-12 rounded-lg object-cover border border-gray-200 shadow-sm bg-white" />
                                            ) : (
                                                <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                                    <Icons.File size={20} />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">{t.id}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {t.productCode?.toUpperCase()}
                                            <div className="text-xs text-gray-400 font-normal">{t.productName?.toUpperCase()}</div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {t.changerName || t.trackingResponsible || t.requesterName}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold
                             ${t.status === TicketStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' :
                                                    t.status === TicketStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                                        t.status === TicketStatus.IN_CHANGE ? 'bg-emerald-100 text-emerald-700' :
                                                            'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => router.push(`/shift-app/tickets/${t.id}`)} className="text-emerald-600 hover:text-emerald-800 font-medium">
                                                Detalhes
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                        Nenhum resultado encontrado.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <span>Itens por página:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setTicketPage(1);
                            }}
                            className="border border-gray-300 rounded p-1 bg-white focus:outline-none focus:border-blue-500"
                        >
                            <option value={10}>10</option>
                            <option value={50}>50</option>
                            <option value={1000}>Todos</option>
                        </select>
                        <span className="ml-4">
                            Mostrando {(ticketPage - 1) * pageSize + 1} - {Math.min(ticketPage * pageSize, totalTickets)} de {totalTickets}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handlePageChange(ticketPage - 1)}
                            disabled={ticketPage === 1 || isLoadingData}
                            className="p-2 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
                        >
                            <Icons.ChevronLeft size={16} />
                        </button>
                        <span className="text-sm font-medium text-gray-900 px-2">Página {ticketPage}</span>
                        <button
                            onClick={() => handlePageChange(ticketPage + 1)}
                            disabled={ticketPage >= Math.ceil(totalTickets / pageSize) || isLoadingData}
                            className="p-2 rounded border border-gray-300 bg-white hover:bg-gray-100 disabled:opacity-50"
                        >
                            <Icons.ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* MOBILE LIST */}
            <div className="md:hidden flex-1 flex flex-col min-h-0">
                <div className="flex-1 overflow-y-auto space-y-4 pb-20">
                    {tickets.map(t => (
                        <div key={t.id} onClick={() => router.push(`/shift-app/tickets/${t.id}`)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-[0.98] transition-transform">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    {t.productImage ? (
                                        <img src={t.productImage} alt="Prod" className="w-14 h-14 rounded-xl object-cover border border-gray-200" />
                                    ) : (
                                        <div className="w-14 h-14 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                                            <Icons.File size={24} />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-bold text-gray-900">{t.productCode?.toUpperCase()}</h3>
                                        <p className="text-xs text-gray-500 font-mono">{t.productName?.toUpperCase()}</p>
                                        <p className="text-xs text-gray-400 mt-0.5">{t.id}</p>

                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide
                             ${t.status === TicketStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' :
                                        t.status === TicketStatus.REJECTED ? 'bg-red-100 text-red-700' :
                                            t.status === TicketStatus.IN_CHANGE ? 'bg-emerald-100 text-emerald-700' :
                                                'bg-emerald-100 text-emerald-700'
                                    }`}>
                                    {t.status === TicketStatus.IN_CHANGE ? 'Desenv.' :
                                        t.status === TicketStatus.PENDING_APPROVAL ? 'Validação' :
                                            t.status === TicketStatus.EVALUATION ? 'Avaliação' :
                                                t.status}
                                </span>
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-2">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <Icons.Users size={12} />
                                    <span>{t.changerName || t.trackingResponsible || 'A definir'}</span>
                                </div>
                                <div className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
                                    Ver Detalhes <Icons.ChevronRight size={12} />
                                </div>
                            </div>
                        </div>
                    ))}
                    {isLoadingData && (
                        <div className="text-center py-4 text-gray-500 flex justify-center items-center gap-2">
                            <Icons.Clock className="animate-spin" size={16} /> Carregando...
                        </div>
                    )}
                    {!isLoadingData && tickets.length === 0 && (
                        <div className="p-8 text-center text-gray-400 bg-white rounded-2xl border border-dashed border-gray-200">
                            Nenhuma solicitação encontrada.
                        </div>
                    )}

                    {/* Pagination Mobile */}
                    {totalTickets > 0 && (
                        <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <button
                                onClick={() => handlePageChange(ticketPage - 1)}
                                disabled={ticketPage === 1 || isLoadingData}
                                className="p-2 bg-gray-50 rounded-full border border-gray-200 disabled:opacity-50"
                            >
                                <Icons.ChevronLeft size={20} />
                            </button>
                            <div className="text-xs font-bold text-gray-600 text-center">
                                <p>Página {ticketPage}</p>
                                <p className="font-normal text-gray-400">Total: {totalTickets}</p>
                            </div>
                            <button
                                onClick={() => handlePageChange(ticketPage + 1)}
                                disabled={ticketPage >= Math.ceil(totalTickets / pageSize) || isLoadingData}
                                className="p-2 bg-gray-50 rounded-full border border-gray-200 disabled:opacity-50"
                            >
                                <Icons.ChevronRight size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL */}
            {isNewTicketModalOpen && (
                <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm md:p-4">
                    <div className="bg-white w-full h-[95vh] md:h-auto md:max-w-lg md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="p-4 md:p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                            <h3 className="text-lg font-bold text-gray-900">Nova Solicitação</h3>
                            <button onClick={() => setIsNewTicketModalOpen(false)} className="p-2 bg-gray-200 rounded-full text-gray-600 hover:bg-gray-300"><Icons.Close size={20} /></button>
                        </div>

                        <div className="p-4 md:p-6 space-y-4 overflow-y-auto no-scrollbar flex-1">

                            {/* Images/Form */}
                            <div className="flex flex-col items-center mb-2">
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Foto do Produto (Capa)</label>
                                <div
                                    onClick={() => productImgInputRef.current?.click()}
                                    className="w-32 h-32 md:w-24 md:h-24 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all relative overflow-hidden group active:bg-blue-100"
                                >
                                    {productImgPreview ? (
                                        <img src={productImgPreview} alt="Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-blue-500">
                                            <Icons.Camera size={28} />
                                            <span className="text-[10px]">Tirar Foto</span>
                                        </div>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    ref={productImgInputRef}
                                    onChange={handleProductImgChange}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Código</label>
                                    <input
                                        className="w-full px-4 py-3 bg-gray-50 text-gray-900 rounded-xl border border-gray-300 focus:bg-white focus:border-blue-500 transition-all outline-none placeholder-gray-400"
                                        value={newTicketData.code}
                                        onChange={e => setNewTicketData({ ...newTicketData, code: e.target.value })}
                                        onBlur={handleCodeBlur}
                                        placeholder="R-123"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Produto</label>
                                    <input
                                        className="w-full px-4 py-3 bg-gray-100 text-gray-500 rounded-xl border border-gray-200 cursor-not-allowed focus:outline-none"
                                        value={newTicketData.name}
                                        readOnly
                                        tabIndex={-1}
                                        placeholder="Nome do Produto"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Nome do Responsável</label>
                                <input
                                    className="w-full px-4 py-3 bg-gray-50 text-gray-900 rounded-xl border border-gray-300 focus:bg-white focus:border-blue-500 transition-all outline-none placeholder-gray-400"
                                    value={newTicketData.responsible}
                                    onChange={e => setNewTicketData({ ...newTicketData, responsible: e.target.value })}
                                    placeholder="Nome do Responsável..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Descrição</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-gray-50 text-gray-900 rounded-xl border border-gray-300 focus:bg-white focus:border-blue-500 transition-all outline-none placeholder-gray-400 min-h-[100px]"
                                    value={newTicketData.desc}
                                    onChange={e => setNewTicketData({ ...newTicketData, desc: e.target.value })}
                                    placeholder="O que precisa mudar?"
                                />
                            </div>

                            {/* File Upload */}
                            <div>
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Anexos Extras</label>
                                <input
                                    type="file"
                                    multiple
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                                    capture="environment"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileSelect}
                                />
                                <div className="space-y-2">
                                    {newTicketFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg border border-gray-200">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <Icons.File size={16} className="text-gray-500 shrink-0" />
                                                <span className="text-sm text-gray-700 truncate max-w-[150px]">{file.name}</span>
                                            </div>
                                            <button onClick={() => removeFile(idx)} className="text-gray-400 hover:text-red-500 p-2">
                                                <Icons.Close size={18} />
                                            </button>
                                        </div>
                                    ))}

                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 flex items-center justify-center gap-2 text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors active:bg-gray-100"
                                    >
                                        <Icons.Camera size={20} />
                                        <span className="text-sm font-medium">Tirar Foto ou Anexar</span>
                                    </button>
                                </div>
                            </div>

                        </div>
                        <div className="p-4 md:p-6 border-t border-gray-100 flex justify-end gap-3 bg-white shrink-0 pb-safe">
                            <button onClick={() => setIsNewTicketModalOpen(false)} className="px-4 py-3 md:py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium w-full md:w-auto">Cancelar</button>
                            <button
                                onClick={handleCreateTicket}
                                disabled={isUploading}
                                className="px-6 py-3 md:py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 font-medium disabled:opacity-50 flex items-center justify-center gap-2 w-full md:w-auto"
                            >
                                {isUploading && <Icons.Clock className="animate-spin" size={16} />}
                                {isUploading ? 'Criando...' : 'Criar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
