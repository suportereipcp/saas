
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Product, ProductionItem, ProductionItemWithDetails, ProcessStatus, ViewState, HistoryLog, WarehouseRequest, User } from '../types';
import { ProductManager } from '../components/ProductManager';
import { KanbanBoard } from '../components/KanbanBoard';
import { HistoryPanel } from '../components/HistoryPanel';
import { TVDashboard } from '../components/TVDashboard';
import { WarehouseRequestPanel } from '../components/WarehouseRequestPanel';
import { UserManager } from '../components/UserManager';
import { LoginScreen } from '../components/LoginScreen';
import { ImportSummaryModal } from '../components/ImportSummaryModal';
import { DashboardPanel } from '../components/DashboardPanel';
import { LayoutDashboard, Droplets, Sticker, Package, History, MonitorPlay, Box, Hammer, Users, LogOut, Loader2, Home } from 'lucide-react';
import { auth, db } from '../services/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, addDoc, updateDoc, doc, query, orderBy, Timestamp, where } from 'firebase/firestore';

export default function Home() {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);

  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [products, setProducts] = useState<Product[]>([]);
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [warehouseRequests, setWarehouseRequests] = useState<WarehouseRequest[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<HistoryLog[]>([]);
  
  // Import Summary State
  const [importSummary, setImportSummary] = useState<{ totalItems: number; totalQty: number; byProduct: Record<string, number> } | null>(null);

  // --- NOTIFICATIONS SETUP ---
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission !== "granted" && Notification.permission !== "denied") {
            Notification.requestPermission();
        }
    }
  }, []);

  // --- FAKE LOGIN HANDLER ---
  const handleFakeLogin = () => {
    setCurrentUser({
      id: 'fake-admin',
      name: 'Administrador (Teste)',
      email: 'admin@flow.com',
      permissions: ['DASHBOARD', 'TV_DASHBOARD', 'WASHING_STATION', 'ADHESIVE_STATION', 'PRODUCTS', 'HISTORY', 'PROFILE_WAREHOUSE', 'HARDWARE_REQUEST', 'USERS'],
      isActive: true
    });
  };

  // --- FIREBASE SUBSCRIPTIONS ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setFirebaseUid(firebaseUser.uid);
      } else {
        setFirebaseUid(null);
        // Only clear if not in fake login mode
        setCurrentUser(prev => prev?.id === 'fake-admin' ? prev : null);
        setAuthLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // If it's a fake login, we still might want to load data if Firebase is accessible
    // But we don't strictly require firebaseUid to start authLoading as false
    if (!firebaseUid && currentUser?.id !== 'fake-admin') return;

    const handleError = (err: any) => {
        console.error("Firestore Listener Error:", err);
        if (err.code === 'permission-denied') {
            // Only sign out if we were actually logged in via Firebase
            if (firebaseUid) signOut(auth);
        }
    };

    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
      setProducts(loaded);
    }, handleError);

    const unsubItems = onSnapshot(collection(db, 'production_items'), (snapshot) => {
      const loaded = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          blastedAt: data.blastedAt?.toDate(),
          washStartedAt: data.washStartedAt?.toDate(),
          washFinishedAt: data.washFinishedAt?.toDate(),
          adhesiveStartedAt: data.adhesiveStartedAt?.toDate(),
          adhesiveFinishedAt: data.adhesiveFinishedAt?.toDate(),
        } as unknown as ProductionItem;
      });
      setItems(loaded);
    }, handleError);

    const unsubRequests = onSnapshot(collection(db, 'warehouse_requests'), (snapshot) => {
      const loaded = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          completedAt: data.completedAt?.toDate(),
        } as unknown as WarehouseRequest;
      });
      setWarehouseRequests(loaded);
    }, handleError);

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const loaded = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
      setUsers(loaded);
      
      if (auth.currentUser) {
        const me = loaded.find(u => u.id === auth.currentUser?.uid);
        if (me) {
            if (me.isActive === false) {
                alert("Seu acesso foi desativado pelo administrador.");
                signOut(auth);
            } else {
                setCurrentUser(me);
            }
        }
      }
      setAuthLoading(false);
    }, handleError);

    const qLogs = query(collection(db, 'history_logs'), orderBy('timestamp', 'desc'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
       const loaded = snapshot.docs.map(doc => ({
           id: doc.id,
           ...doc.data(),
           timestamp: doc.data().timestamp?.toDate()
       } as unknown as HistoryLog));
       setLogs(loaded);
    }, handleError);

    return () => {
      unsubProducts();
      unsubItems();
      unsubRequests();
      unsubUsers();
      unsubLogs();
    };
  }, [firebaseUid, currentUser?.id]);

  // --- ACTIONS ---
  const logAction = async (action: HistoryLog['action'], description: string, details?: { relatedCalculo?: string; relatedProduct?: string }) => {
    try {
        await addDoc(collection(db, 'history_logs'), {
            timestamp: new Date(),
            action,
            description,
            user: currentUser?.name || 'Sistema',
            relatedCalculo: details?.relatedCalculo || null,
            relatedProduct: details?.relatedProduct || null
        });
    } catch (e) { console.error(e); }
  };

  const handleLogout = async () => {
      if (currentUser?.id !== 'fake-admin') {
          await logAction('USER_MANAGEMENT', 'Usuário fez logout');
          await signOut(auth);
      }
      setCurrentUser(null);
  };

  const updateItemStatus = async (itemId: string, newStatus: ProcessStatus) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    const now = new Date();
    const updates: any = { status: newStatus };
    if (newStatus === ProcessStatus.WASHING) updates.washStartedAt = now;
    if (newStatus === ProcessStatus.WASHED) updates.washFinishedAt = now;
    if (newStatus === ProcessStatus.ADHESIVE) updates.adhesiveStartedAt = now;
    if (newStatus === ProcessStatus.COMPLETED) updates.adhesiveFinishedAt = now;
    
    try {
        await updateDoc(doc(db, 'production_items', itemId), updates);
        const productName = products.find(p => p.id === item.productId)?.name;
        logAction('STATUS_CHANGE', `Item #${item.sequentialId} movido para ${newStatus}`, { 
            relatedCalculo: item.calculo,
            relatedProduct: productName
        });
    } catch (err) { alert("Erro ao atualizar item."); }
  };

  // --- VIEW MAPPING ---
  const itemsWithDetails: ProductionItemWithDetails[] = useMemo(() => {
    return items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return { ...item, productName: 'Unknown', material: '-', deadline: null, isDelayed: false };

      let deadline: Date | null = null;
      if (item.status === ProcessStatus.BLASTED) deadline = new Date(item.blastedAt.getTime() + product.washDeadlineMinutes * 60000);
      else if (item.status === ProcessStatus.WASHING && item.washStartedAt) deadline = new Date(item.washStartedAt.getTime() + product.washDeadlineMinutes * 60000);
      else if (item.status === ProcessStatus.WASHED && item.washFinishedAt) deadline = new Date(item.washFinishedAt.getTime() + product.adhesiveDeadlineMinutes * 60000);
      else if (item.status === ProcessStatus.ADHESIVE && item.adhesiveStartedAt) deadline = new Date(item.adhesiveStartedAt.getTime() + product.adhesiveDeadlineMinutes * 60000);

      const isDelayed = deadline ? new Date().getTime() > deadline.getTime() : false;
      return { ...item, productName: product.name, material: product.material, deadline, isDelayed };
    });
  }, [items, products]);

  const canAccess = (v: ViewState) => currentUser?.permissions.includes(v);

  if (authLoading && !currentUser) return <div className="min-h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-10 h-10 text-cyan-500 animate-spin" /></div>;
  if (!currentUser) return <LoginScreen onLoginSuccess={() => {}} onFakeLogin={handleFakeLogin} />;

  if (view === 'TV_DASHBOARD') {
    return <TVDashboard items={itemsWithDetails} warehouseRequests={warehouseRequests} onSimulateTime={() => {}} onBack={() => setView('DASHBOARD')} />;
  }

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-900">
      <ImportSummaryModal isOpen={!!importSummary} data={importSummary} onClose={() => setImportSummary(null)} />
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex w-64 bg-slate-900 text-slate-300 flex-col h-screen fixed left-0 top-0 z-10">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-bold text-white tracking-tight">FlowControl</h1>
          <p className="text-xs text-slate-500">Gestão de Processos</p>
          {currentUser.id === 'fake-admin' && (
              <span className="mt-2 inline-block px-2 py-0.5 bg-amber-500 text-amber-950 text-[10px] font-bold rounded uppercase">Modo Teste</span>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {canAccess('DASHBOARD') && <button onClick={() => setView('DASHBOARD')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'DASHBOARD' ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 hover:text-white'}`}><LayoutDashboard className="w-5 h-5" />Dashboard Geral</button>}
          {canAccess('TV_DASHBOARD') && <button onClick={() => setView('TV_DASHBOARD')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'TV_DASHBOARD' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><MonitorPlay className="w-5 h-5" />Painel TV (Andon)</button>}
          <div className="pt-4 pb-2"><p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Produção</p></div>
          {canAccess('WASHING_STATION') && <button onClick={() => setView('WASHING_STATION')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'WASHING_STATION' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Droplets className="w-5 h-5" />Setor de Lavagem</button>}
          {canAccess('ADHESIVE_STATION') && <button onClick={() => setView('ADHESIVE_STATION')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'ADHESIVE_STATION' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Sticker className="w-5 h-5" />Setor de Adesivo</button>}
          <div className="pt-4 pb-2"><p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Solicitações</p></div>
          {canAccess('PROFILE_WAREHOUSE') && <button onClick={() => setView('PROFILE_WAREHOUSE')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'PROFILE_WAREHOUSE' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Box className="w-5 h-5" />Almox. Perfil</button>}
          {canAccess('HARDWARE_REQUEST') && <button onClick={() => setView('HARDWARE_REQUEST')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'HARDWARE_REQUEST' ? 'bg-purple-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Hammer className="w-5 h-5" />Solic. Ferragem</button>}
          <div className="pt-4 pb-2"><p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Gestão</p></div>
          {canAccess('PRODUCTS') && <button onClick={() => setView('PRODUCTS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'PRODUCTS' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Package className="w-5 h-5" />Cadastro Produtos</button>}
          {canAccess('HISTORY') && <button onClick={() => setView('HISTORY')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'HISTORY' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><History className="w-5 h-5" />Histórico / Relatório</button>}
          {canAccess('USERS') && <button onClick={() => setView('USERS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'USERS' ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 hover:text-white'}`}><Users className="w-5 h-5" />Usuários</button>}
        </nav>
        <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-4 py-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white uppercase">{currentUser.name.charAt(0)}</div>
                <div className="flex-1 overflow-hidden"><p className="text-sm font-medium text-white truncate">{currentUser.name}</p></div>
            </div>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-red-900/30 text-slate-400"><LogOut className="w-4 h-4" /> Sair</button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 relative lg:ml-64">
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 pb-24 lg:pb-6">
          {view === 'DASHBOARD' && <DashboardPanel items={itemsWithDetails} warehouseRequests={warehouseRequests} onNavigate={setView} currentUser={currentUser.name} />}
          {view === 'PRODUCTS' && <ProductManager products={products} onAddProduct={() => {}} onToggleStatus={() => {}} />}
          {view === 'WASHING_STATION' && <KanbanBoard items={itemsWithDetails} onUpdateStatus={updateItemStatus} viewMode="WASHING" />}
          {view === 'ADHESIVE_STATION' && <KanbanBoard items={itemsWithDetails} onUpdateStatus={updateItemStatus} viewMode="ADHESIVE" />}
          {view === 'HISTORY' && <HistoryPanel items={items} products={products} />}
        </div>

        {/* MOBILE NAVIGATION */}
        <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-slate-900 border-t border-slate-800 text-white flex justify-around items-center z-50 h-16">
            <button onClick={() => setView('DASHBOARD')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'DASHBOARD' ? 'text-blue-500' : 'text-slate-400'}`}>
                <Home className="w-5 h-5 mb-1" />
                <span className="text-[10px]">Dash</span>
            </button>
            <button onClick={() => setView('WASHING_STATION')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'WASHING_STATION' ? 'text-blue-500' : 'text-slate-400'}`}>
                <Droplets className="w-5 h-5 mb-1" />
                <span className="text-[10px]">Lavagem</span>
            </button>
            <button onClick={() => setView('ADHESIVE_STATION')} className={`flex flex-col items-center justify-center w-full h-full ${view === 'ADHESIVE_STATION' ? 'text-blue-500' : 'text-slate-400'}`}>
                <Sticker className="w-5 h-5 mb-1" />
                <span className="text-[10px]">Adesivo</span>
            </button>
        </nav>
      </main>
    </div>
  );
}
