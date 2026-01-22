
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Product, ProductionItem, ProductionItemWithDetails, ProcessStatus, ViewState, HistoryLog, WarehouseRequest, User } from './types';
import { ProductManager } from './components/ProductManager';
import { KanbanBoard } from './components/KanbanBoard';
import { HistoryPanel } from './components/HistoryPanel';
import { TVDashboard } from './components/TVDashboard';
import { WarehouseRequestPanel } from './components/WarehouseRequestPanel';
import { UserManager } from './components/UserManager';
import { LoginScreen } from './components/LoginScreen';
import { ImportSummaryModal } from './components/ImportSummaryModal';
import { DashboardPanel } from './components/DashboardPanel';
import { LayoutDashboard, Droplets, Sticker, Package, History, MonitorPlay, Box, Hammer, Users, LogOut, Loader2, Home, ClipboardList } from 'lucide-react';
import { supabase } from './supabaseClient';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [warehouseRequests, setWarehouseRequests] = useState<WarehouseRequest[]>([]);
  
  const [importSummary, setImportSummary] = useState<{ totalItems: number; totalQty: number; byProduct: Record<string, number> } | null>(null);

  // --- HANDLER PARA LOGIN DE TESTE (Bypass) ---
  const handleFakeLogin = () => {
    setCurrentUser({
      id: 'fake-admin-id',
      name: 'Admin de Teste',
      email: 'admin@flow.com',
      permissions: ['DASHBOARD', 'TV_DASHBOARD', 'WASHING_STATION', 'ADHESIVE_STATION', 'PRODUCTS', 'HISTORY', 'PROFILE_WAREHOUSE', 'HARDWARE_REQUEST', 'USERS'],
      isActive: true
    });
  };

  // --- AUTH & DATA INITIALIZATION ---
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        
        if (profile) setCurrentUser(profile);
      }
      setAuthLoading(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profile) setCurrentUser(profile);
      } else {
        setCurrentUser(prev => prev?.id === 'fake-admin-id' ? prev : null);
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    if (!currentUser) return;
    
    const { data: p } = await supabase.from('products').select('*');
    if (p) setProducts(p);

    const { data: i } = await supabase.from('production_items').select('*');
    if (i) {
      setItems(i.map(item => ({
        ...item,
        blastedAt: new Date(item.blasted_at),
        washStartedAt: item.wash_started_at ? new Date(item.wash_started_at) : undefined,
        washFinishedAt: item.wash_finished_at ? new Date(item.wash_finished_at) : undefined,
        adhesiveStartedAt: item.adhesive_started_at ? new Date(item.adhesive_started_at) : undefined,
        adhesiveFinishedAt: item.adhesive_finished_at ? new Date(item.adhesive_finished_at) : undefined,
        productId: item.product_id,
        sequentialId: item.sequential_id
      })));
    }

    const { data: w } = await supabase.from('warehouse_requests').select('*');
    if (w) setWarehouseRequests(w.map(req => ({ 
        ...req, 
        createdAt: new Date(req.created_at),
        completedAt: req.completed_at ? new Date(req.completed_at) : undefined
    })));
  };

  useEffect(() => {
    fetchData();

    const itemsChannel = supabase.channel('production_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'production_items' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'warehouse_requests' }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(itemsChannel);
    };
  }, [currentUser]);

  const itemsWithDetails: ProductionItemWithDetails[] = useMemo(() => {
    return items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return { ...item, productName: 'Desconhecido', material: '-', deadline: null, isDelayed: false };
      
      let deadline: Date | null = null;
      if (item.status === ProcessStatus.BLASTED) deadline = new Date(item.blastedAt.getTime() + product.washDeadlineMinutes * 60000);
      else if (item.status === ProcessStatus.WASHING && item.washStartedAt) deadline = new Date(item.washStartedAt.getTime() + product.washDeadlineMinutes * 60000);
      else if (item.status === ProcessStatus.WASHED && item.washFinishedAt) deadline = new Date(item.washFinishedAt.getTime() + product.adhesiveDeadlineMinutes * 60000);
      else if (item.status === ProcessStatus.ADHESIVE && item.adhesiveStartedAt) deadline = new Date(item.adhesiveStartedAt.getTime() + product.adhesiveDeadlineMinutes * 60000);
      
      const isDelayed = deadline ? new Date().getTime() > deadline.getTime() : false;
      return { ...item, productName: product.name, material: product.material, deadline, isDelayed };
    });
  }, [items, products]);

  const updateItemStatus = async (itemId: string, newStatus: ProcessStatus) => {
    if (currentUser?.id === 'fake-admin-id') {
        setItems(prev => prev.map(it => it.id === itemId ? { ...it, status: newStatus } : it));
        return;
    }
    const now = new Date().toISOString();
    const updates: any = { status: newStatus };
    
    if (newStatus === ProcessStatus.WASHING) updates.wash_started_at = now;
    if (newStatus === ProcessStatus.WASHED) updates.wash_finished_at = now;
    if (newStatus === ProcessStatus.ADHESIVE) updates.adhesive_started_at = now;
    if (newStatus === ProcessStatus.COMPLETED) updates.adhesive_finished_at = now;

    const { error } = await supabase.from('production_items').update(updates).eq('id', itemId);
    if (error) alert("Erro ao atualizar status.");
  };

  const handleCreateRequest = async (req: any) => {
    if (currentUser?.id === 'fake-admin-id') {
        const newReq = { ...req, id: crypto.randomUUID(), createdAt: new Date(), status: 'PENDING' };
        setWarehouseRequests(prev => [newReq, ...prev]);
        return;
    }
    const { error } = await supabase.from('warehouse_requests').insert({
        type: req.type,
        item: req.item,
        quantity: req.quantity,
        requester: req.requester,
        status: 'PENDING',
        created_at: new Date().toISOString()
    });
    if (error) alert("Erro ao solicitar material.");
  };

  const handleFinishRequest = async (id: string) => {
    if (currentUser?.id === 'fake-admin-id') {
        setWarehouseRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'COMPLETED' as const } : r));
        return;
    }
    const { error } = await supabase.from('warehouse_requests').update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString()
    }).eq('id', id);
    if (error) alert("Erro ao finalizar solicitação.");
  };

  const handleLogout = async () => {
    if (currentUser?.id !== 'fake-admin-id') await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const canAccess = (v: ViewState) => currentUser?.permissions.includes(v);

  if (authLoading) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-10 h-10 text-cyan-500 animate-spin" /></div>;
  if (!currentUser) return <LoginScreen onLoginSuccess={() => {}} onFakeLogin={handleFakeLogin} />;

  if (view === 'TV_DASHBOARD') {
    return <TVDashboard items={itemsWithDetails} warehouseRequests={warehouseRequests} onSimulateTime={() => {}} onBack={() => setView('DASHBOARD')} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      <ImportSummaryModal isOpen={!!importSummary} data={importSummary} onClose={() => setImportSummary(null)} />
      
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col h-screen fixed left-0 top-0 z-40 border-r border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-white tracking-tight">FlowControl</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {canAccess('DASHBOARD') && <button onClick={() => setView('DASHBOARD')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'DASHBOARD' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800'}`}><LayoutDashboard className="w-5 h-5" />Dashboard</button>}
          {canAccess('TV_DASHBOARD') && <button onClick={() => setView('TV_DASHBOARD')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'TV_DASHBOARD' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><MonitorPlay className="w-5 h-5" />Painel TV</button>}
          <div className="pt-4 pb-2"><p className="px-4 text-[10px] font-bold text-slate-500 uppercase">Produção</p></div>
          {canAccess('WASHING_STATION') && <button onClick={() => setView('WASHING_STATION')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'WASHING_STATION' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Droplets className="w-5 h-5" />Lavagem</button>}
          {canAccess('ADHESIVE_STATION') && <button onClick={() => setView('ADHESIVE_STATION')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'ADHESIVE_STATION' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Sticker className="w-5 h-5" />Adesivo</button>}
          <div className="pt-4 pb-2"><p className="px-4 text-[10px] font-bold text-slate-500 uppercase">Pedidos Material</p></div>
          {canAccess('PROFILE_WAREHOUSE') && <button onClick={() => setView('PROFILE_WAREHOUSE')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'PROFILE_WAREHOUSE' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Box className="w-5 h-5" />Almox. Perfil</button>}
          {canAccess('HARDWARE_REQUEST') && <button onClick={() => setView('HARDWARE_REQUEST')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'HARDWARE_REQUEST' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Hammer className="w-5 h-5" />Solic. Ferragem</button>}
          <div className="pt-4 pb-2"><p className="px-4 text-[10px] font-bold text-slate-500 uppercase">Gestão</p></div>
          {canAccess('PRODUCTS') && <button onClick={() => setView('PRODUCTS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'PRODUCTS' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Package className="w-5 h-5" />Produtos</button>}
          {canAccess('HISTORY') && <button onClick={() => setView('HISTORY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'HISTORY' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><History className="w-5 h-5" />Relatórios</button>}
          {canAccess('USERS') && <button onClick={() => setView('USERS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'USERS' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800'}`}><Users className="w-5 h-5" />Usuários</button>}
        </nav>
        <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-4 py-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white uppercase">{currentUser.name.charAt(0)}</div>
                <div className="flex-1 overflow-hidden"><p className="text-sm font-medium text-white truncate">{currentUser.name}</p></div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-red-900/30 text-slate-400"><LogOut className="w-4 h-4" /> Sair</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden relative lg:ml-64">
        <header className="lg:hidden h-14 bg-slate-900 flex items-center px-4 border-b border-slate-800 shrink-0">
          <h1 className="text-white font-bold tracking-tight">FlowControl</h1>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-24 lg:pb-8">
          {view === 'DASHBOARD' && <DashboardPanel items={itemsWithDetails} warehouseRequests={warehouseRequests} onNavigate={setView} currentUser={currentUser.name} />}
          {view === 'PRODUCTS' && <ProductManager products={products} onAddProduct={() => {}} onToggleStatus={() => {}} />}
          {view === 'WASHING_STATION' && <KanbanBoard items={itemsWithDetails} onUpdateStatus={updateItemStatus} viewMode="WASHING" />}
          {view === 'ADHESIVE_STATION' && <KanbanBoard items={itemsWithDetails} onUpdateStatus={updateItemStatus} viewMode="ADHESIVE" />}
          {view === 'PROFILE_WAREHOUSE' && <WarehouseRequestPanel type="PROFILE" requests={warehouseRequests} onRequestCreate={handleCreateRequest} onRequestFinish={handleFinishRequest} />}
          {view === 'HARDWARE_REQUEST' && <WarehouseRequestPanel type="HARDWARE" requests={warehouseRequests} onRequestCreate={handleCreateRequest} onRequestFinish={handleFinishRequest} />}
          {view === 'HISTORY' && <HistoryPanel items={items} products={products} />}
          {view === 'USERS' && <UserManager users={[]} onAddUser={async () => {}} onUpdateUser={async () => {}} onToggleStatus={async () => {}} />}
        </div>

        <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 text-white flex justify-around items-center z-50 h-16 shadow-2xl">
            <button onClick={() => setView('DASHBOARD')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'DASHBOARD' ? 'text-blue-500' : 'text-slate-400'}`}>
                <Home className="w-5 h-5" /><span className="text-[10px] mt-1">Dashboard</span>
            </button>
            <button onClick={() => setView('WASHING_STATION')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'WASHING_STATION' ? 'text-blue-500' : 'text-slate-400'}`}>
                <Droplets className="w-5 h-5" /><span className="text-[10px] mt-1">Lavagem</span>
            </button>
            <button onClick={() => setView('ADHESIVE_STATION')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'ADHESIVE_STATION' ? 'text-blue-500' : 'text-slate-400'}`}>
                <Sticker className="w-5 h-5" /><span className="text-[10px] mt-1">Adesivo</span>
            </button>
            <button onClick={() => setView('PROFILE_WAREHOUSE')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'PROFILE_WAREHOUSE' || view === 'HARDWARE_REQUEST' ? 'text-blue-500' : 'text-slate-400'}`}>
                <ClipboardList className="w-5 h-5" /><span className="text-[10px] mt-1">Pedidos</span>
            </button>
        </nav>
      </main>
    </div>
  );
};

export default App;
