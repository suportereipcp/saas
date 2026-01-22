
import React, { useState, useEffect } from 'react';
import { Lock, Mail, ArrowRight, Zap, Scan, ShieldCheck, AlertTriangle, Fingerprint, Loader2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onFakeLogin: () => void;
}

type LoginState = 'IDLE' | 'SCANNING' | 'PROCESSING' | 'SUCCESS' | 'ERROR';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onFakeLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginState, setLoginState] = useState<LoginState>('IDLE');
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (loginState === 'IDLE') setStatusText('Aguardando credenciais...');
    if (loginState === 'SCANNING') setStatusText('Estabelecendo conexão segura...');
    if (loginState === 'PROCESSING') setStatusText('Verificando acesso na nuvem...');
    if (loginState === 'SUCCESS') setStatusText('Acesso Autorizado. Redirecionando...');
    if (loginState === 'ERROR') setStatusText('Falha na autenticação.');
  }, [loginState]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setLoginState('SCANNING');

    // Interceptação das credenciais de teste
    if (email === 'admin@flow.com' && password === 'admin123') {
        setTimeout(() => {
            setLoginState('PROCESSING');
            setTimeout(() => {
                setLoginState('SUCCESS');
                setTimeout(() => onFakeLogin(), 500);
            }, 600);
        }, 800);
        return;
    }

    // Login Real via Supabase
    setTimeout(async () => {
        setLoginState('PROCESSING');
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setLoginState('ERROR');
                setErrorMessage(error.message === 'Invalid login credentials' ? 'Email ou senha incorretos.' : error.message);
                setTimeout(() => setLoginState('IDLE'), 3000);
            } else {
                setLoginState('SUCCESS');
                setTimeout(() => onLoginSuccess(), 500);
            }
        } catch (err) {
            setLoginState('ERROR');
            setErrorMessage('Erro de conexão com o Supabase.');
            setTimeout(() => setLoginState('IDLE'), 3000);
        }
    }, 800); 
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden selection:bg-cyan-500/30">
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: 'linear-gradient(rgba(6, 182, 212, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(6, 182, 212, 0.1) 1px, transparent 1px)', 
             backgroundSize: '40px 40px',
             transform: 'perspective(500px) rotateX(60deg) translateY(-100px) translateZ(-200px)'
           }}>
      </div>
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      <div className="relative z-10 w-full max-w-5xl flex flex-col lg:flex-row rounded-3xl overflow-hidden shadow-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl">
         <div className="hidden lg:flex w-1/2 bg-slate-900 relative flex-col items-center justify-center p-12 border-r border-slate-800">
            <div className="absolute inset-0 bg-gradient-to-b from-blue-500/5 to-transparent"></div>
            <div className="relative z-10 mb-8">
                <div className={`w-32 h-32 rounded-full border-4 flex items-center justify-center relative transition-all duration-700 ${
                    loginState === 'SCANNING' || loginState === 'PROCESSING' ? 'border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.5)]' : 
                    loginState === 'SUCCESS' ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.5)]' : 
                    loginState === 'ERROR' ? 'border-red-500 shadow-[0_0_30px_rgba(239,68,68,0.5)]' : 'border-slate-700'
                }`}>
                    {loginState === 'SUCCESS' ? <ShieldCheck className="w-12 h-12 text-green-500" /> : 
                     loginState === 'ERROR' ? <AlertTriangle className="w-12 h-12 text-red-500" /> :
                     <Zap className={`w-12 h-12 transition-colors ${loginState === 'IDLE' ? 'text-slate-600' : 'text-cyan-400'}`} />}
                    {(loginState === 'SCANNING' || loginState === 'PROCESSING') && (
                        <div className="absolute inset-0 bg-gradient-to-b from-cyan-400/30 to-transparent animate-scan rounded-full"></div>
                    )}
                </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight text-center">FlowControl <span className="text-cyan-400">Cloud</span></h1>
            <p className="text-slate-400 text-center max-w-xs">Gerenciamento Industrial Seguro</p>
            <div className="mt-12 w-full max-w-xs space-y-3 text-center">
                <div className="text-center font-mono text-xs text-cyan-500/80 h-4 uppercase tracking-widest">{statusText}</div>
            </div>
         </div>

         <div className="w-full lg:w-1/2 p-8 lg:p-16 flex flex-col justify-center relative bg-slate-900/50">
             <div className="mb-8">
                 <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                    <Scan className="w-6 h-6 text-blue-500" /> Identificação
                 </h2>
                 <p className="text-slate-400 text-sm">Insira suas credenciais corporativas.</p>
             </div>
             <form onSubmit={handleLogin} className="space-y-6">
                 <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Email</label>
                     <div className="relative">
                         <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                         <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loginState !== 'IDLE' && loginState !== 'ERROR'}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white focus:border-cyan-500/50 outline-none transition-all"
                            placeholder="seu@email.com" />
                     </div>
                 </div>
                 <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2 ml-1">Senha</label>
                     <div className="relative">
                         <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                         <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={loginState !== 'IDLE' && loginState !== 'ERROR'}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white focus:border-cyan-500/50 outline-none transition-all"
                            placeholder="••••••" />
                     </div>
                 </div>
                 {errorMessage && (
                     <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-200 animate-pulse">
                         {errorMessage}
                     </div>
                 )}
                 <div className="space-y-4">
                    <button type="submit" disabled={loginState !== 'IDLE' && loginState !== 'ERROR'}
                        className={`w-full py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
                            loginState === 'IDLE' || loginState === 'ERROR' ? 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/20' : 'bg-slate-700 cursor-not-allowed'
                        }`}>
                        {loginState === 'IDLE' || loginState === 'ERROR' ? (
                            <> <Fingerprint className="w-5 h-5" /> Entrar <ArrowRight className="w-4 h-4" /> </>
                        ) : ( <Loader2 className="w-5 h-5 animate-spin" /> )}
                    </button>
                 </div>
             </form>
         </div>
      </div>
    </div>
  );
};
