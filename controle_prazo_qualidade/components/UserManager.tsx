
import React, { useState } from 'react';
import { User, ViewState } from '../types';
import { Plus, Trash2, Users, Check, UserPlus, Mail, Lock, Loader2, Edit2, X, Ban, ShieldCheck, Bell, Megaphone, Factory } from 'lucide-react';

interface UserManagerProps {
  users: User[];
  onAddUser: (user: User) => Promise<void>;
  onUpdateUser: (user: User) => Promise<void>;
  onToggleStatus: (id: string, currentStatus: boolean) => Promise<void>;
}

const PERMISSION_GROUPS = [
  {
    name: 'Gestão & Visualização',
    permissions: [
      { id: 'DASHBOARD', label: 'Dashboard Geral' },
      { id: 'TV_DASHBOARD', label: 'Painel TV (Andon)' },
      { id: 'HISTORY', label: 'Histórico' },
    ] as { id: ViewState, label: string }[]
  },
  {
    name: 'Produção',
    permissions: [
      { id: 'IMPORT', label: 'Importar Dados' },
      { id: 'WASHING_STATION', label: 'Setor de Lavagem' },
      { id: 'ADHESIVE_STATION', label: 'Setor de Adesivo' },
    ] as { id: ViewState, label: string }[]
  },
  {
    name: 'Pedidos de Material',
    permissions: [
      { id: 'PROFILE_WAREHOUSE', label: 'Material: Perfil' },
      { id: 'HARDWARE_REQUEST', label: 'Material: Ferragem' },
    ] as { id: ViewState, label: string }[]
  },
  {
    name: 'Administração',
    permissions: [
      { id: 'PRODUCTS', label: 'Cadastro de Produtos' },
      { id: 'USERS', label: 'Gerenciar Usuários' },
    ] as { id: ViewState, label: string }[]
  }
];

export const UserManager: React.FC<UserManagerProps> = ({ users, onAddUser, onUpdateUser, onToggleStatus }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<ViewState>>(new Set(['DASHBOARD']));
  // Notification State
  const [notifyProduction, setNotifyProduction] = useState(false);
  const [notifyCalls, setNotifyCalls] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  const handlePermissionToggle = (perm: ViewState) => {
    const newSet = new Set(selectedPermissions);
    if (newSet.has(perm)) {
      newSet.delete(perm);
    } else {
      newSet.add(perm);
    }
    setSelectedPermissions(newSet);
  };

  const startEditing = (user: User) => {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email || '');
    setPassword(''); // Passwords cannot be retrieved
    setSelectedPermissions(new Set(user.permissions));
    setNotifyProduction(user.notificationSettings?.production || false);
    setNotifyCalls(user.notificationSettings?.calls || false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setName('');
    setEmail('');
    setPassword('');
    setSelectedPermissions(new Set(['DASHBOARD']));
    setNotifyProduction(false);
    setNotifyCalls(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && email.trim()) {
      setIsLoading(true);
      try {
          const notificationSettings = {
              production: notifyProduction,
              calls: notifyCalls
          };

          if (editingId) {
             await onUpdateUser({
               id: editingId,
               name,
               email,
               permissions: Array.from(selectedPermissions),
               notificationSettings
             });
             alert('Usuário atualizado com sucesso!');
             cancelEditing();
          } else {
             await onAddUser({
                id: '', 
                name,
                email,
                password,
                permissions: Array.from(selectedPermissions),
                notificationSettings
              });
              setName('');
              setEmail('');
              setPassword('');
              setSelectedPermissions(new Set(['DASHBOARD']));
              setNotifyProduction(false);
              setNotifyCalls(false);
              alert('Usuário criado com sucesso!');
          }
      } catch (err: any) {
          console.error("Error in UserManager:", err);
          alert('Erro: ' + (err.message || String(err)));
      } finally {
          setIsLoading(false);
      }
    }
  };

  const toggleGroup = (groupPerms: { id: ViewState }[]) => {
    const allSelected = groupPerms.every(p => selectedPermissions.has(p.id));
    const newSet = new Set(selectedPermissions);
    
    groupPerms.forEach(p => {
        if (allSelected) newSet.delete(p.id);
        else newSet.add(p.id);
    });
    setSelectedPermissions(newSet);
  };

  return (
    <div className="space-y-6">
      <div className={`p-6 rounded-xl shadow-sm border transition-colors ${editingId ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
        <div className="flex justify-between items-center mb-6">
            <h2 className={`text-xl font-bold flex items-center gap-2 ${editingId ? 'text-amber-800' : 'text-slate-800'}`}>
            {editingId ? <Edit2 className="w-6 h-6" /> : <UserPlus className="w-6 h-6 text-blue-600" />}
            {editingId ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
            {editingId && (
                <button onClick={cancelEditing} className="text-sm text-slate-500 flex items-center gap-1 hover:text-slate-700">
                    <X className="w-4 h-4"/> Cancelar Edição
                </button>
            )}
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Usuário</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-900"
                  placeholder="Ex: João Silva"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3"/> Email de Acesso
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-900"
                  placeholder="joao@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              {!editingId && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1">
                        <Lock className="w-3 h-3"/> Senha
                    </label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition text-slate-900 font-mono"
                      placeholder="Ex: 123456"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
              )}
          </div>

          <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
             <label className="block text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Bell className="w-4 h-4 text-blue-600" /> Preferências de Notificação (Push)
             </label>
             <div className="flex flex-col md:flex-row gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${notifyProduction ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                        {notifyProduction && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={notifyProduction} onChange={() => setNotifyProduction(!notifyProduction)} />
                    <span className="text-sm text-slate-600 flex items-center gap-2">
                        <Factory className="w-4 h-4" /> Alertas de Produção (Finalização)
                    </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${notifyCalls ? 'bg-purple-600 border-purple-600' : 'bg-white border-slate-300'}`}>
                        {notifyCalls && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <input type="checkbox" className="hidden" checked={notifyCalls} onChange={() => setNotifyCalls(!notifyCalls)} />
                    <span className="text-sm text-slate-600 flex items-center gap-2">
                        <Megaphone className="w-4 h-4" /> Chamados de Presença
                    </span>
                </label>
             </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">Permissões de Acesso</label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.name} className="bg-white/50 p-4 rounded-lg border border-slate-200">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200">
                      <h3 className="font-bold text-slate-700 text-sm">{group.name}</h3>
                      <button 
                        type="button"
                        onClick={() => toggleGroup(group.permissions)}
                        className="text-[10px] text-blue-600 font-semibold hover:underline"
                      >
                        Alternar
                      </button>
                  </div>
                  <div className="space-y-2">
                    {group.permissions.map((perm) => (
                      <label key={perm.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-1 rounded -ml-1 transition">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition ${selectedPermissions.has(perm.id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                          {selectedPermissions.has(perm.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={selectedPermissions.has(perm.id)}
                          onChange={() => handlePermissionToggle(perm.id)}
                        />
                        <span className="text-sm text-slate-600">{perm.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
             {editingId && (
                 <button
                 type="button"
                 onClick={cancelEditing}
                 className="px-6 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold transition"
               >
                 Cancelar
               </button>
             )}
            <button
              type="submit"
              disabled={isLoading}
              className={`${editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'} text-white font-semibold py-2.5 px-8 rounded-lg flex items-center gap-2 transition shadow-sm disabled:opacity-70`}
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? <Check className="w-4 h-4"/> : <Plus className="w-4 h-4" />)}
              {isLoading ? 'Processando...' : (editingId ? 'Salvar Alterações' : 'Cadastrar Usuário')}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-700 flex items-center gap-2">
            <Users className="w-4 h-4" /> Usuários Cadastrados
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-white text-slate-500 font-semibold border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 w-1/4">Nome / Email</th>
                <th className="px-6 py-3">Acessos / Notificações</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {users.map((user) => {
                const isActive = user.isActive !== false;
                return (
                    <tr key={user.id} className={`hover:bg-slate-50 transition ${!isActive ? 'bg-slate-50 opacity-60' : ''} ${editingId === user.id ? 'bg-amber-50' : ''}`}>
                      <td className="px-6 py-4">
                         <div className="font-medium text-slate-900">{user.name}</div>
                         <div className="text-xs text-slate-500">{user.email || 'Sem email'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {user.permissions.length === 0 ? (
                            <span className="text-slate-400 italic text-xs">Sem acesso</span>
                          ) : (
                            user.permissions.map(p => (
                              <span key={p} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs border border-slate-200">
                                {PERMISSION_GROUPS.flatMap(g => g.permissions).find(item => item.id === p)?.label || p}
                              </span>
                            ))
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <span className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 w-fit ${isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                            {isActive ? <ShieldCheck className="w-3 h-3"/> : <Ban className="w-3 h-3"/>}
                            {isActive ? 'ATIVO' : 'INATIVO'}
                         </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                            <button
                            onClick={() => startEditing(user)}
                            className="text-blue-500 hover:text-blue-700 p-1.5 rounded hover:bg-blue-50 transition"
                            title="Editar Usuário"
                            disabled={!isActive}
                            >
                            <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                            onClick={() => onToggleStatus(user.id, isActive)}
                            className={`p-1.5 rounded transition ${isActive ? 'text-slate-400 hover:text-red-500 hover:bg-red-50' : 'text-green-500 hover:text-green-700 hover:bg-green-50'}`}
                            title={isActive ? "Inativar Usuário" : "Reativar Usuário"}
                            >
                             {isActive ? <Ban className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                            </button>
                        </div>
                      </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
