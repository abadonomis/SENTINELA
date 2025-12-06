import React, { useState } from 'react';
import CitizenView from './components/CitizenView';
import DispatchView from './components/DispatchView';
import { IncidentProvider } from './contexts/IncidentContext';
import { ShieldIcon, UserIcon, LockIcon } from './components/Icons';

type AppSection = 'LANDING' | 'CITIZEN' | 'DISPATCH_LOGIN' | 'DISPATCH_PORTAL';

// ========================================================
// LISTA DE SENHAS / IDs OPERACIONAIS PERMITIDOS
// ========================================================
// IMPORTANTE: O aviso "npm warn deprecated node-domexception" 
// no terminal é apenas um alerta de dependência e NÃO impede 
// o funcionamento deste login.
//
// Adicione novos códigos abaixo para liberar acesso ao painel:
const VALID_OPERATIONAL_IDS = [
  'admin123',  // Senha Admin Padrão
  'admin',     // Senha Curta
  '123456',    // ID Operacional (CÓDIGO DA VIATURA/AGENTE)
  // '999',    // Exemplo: Remova as barras para ativar
];
// ========================================================

// Main App Component serves as the Router and Context Provider
export default function App() {
  return (
    <IncidentProvider>
      <MainLayout />
    </IncidentProvider>
  );
}

function MainLayout() {
  const [section, setSection] = useState<AppSection>('LANDING');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleDispatcherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Remove espaços em branco que podem ter sido digitados acidentalmente
    const cleanPassword = password.trim();
    
    // Verifica se a senha digitada (limpa) está na lista de permitidos
    if (VALID_OPERATIONAL_IDS.includes(cleanPassword)) {
      setSection('DISPATCH_PORTAL');
      setError('');
      setPassword('');
    } else {
      setError('ID Operacional ou Senha inválida. Tente "123456".');
    }
  };

  // --- RENDER SECTIONS ---

  // 1. Landing Page (Portal de Escolha)
  if (section === 'LANDING') {
    return (
      <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-y-auto">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none fixed">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600 rounded-full blur-[128px]"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-red-600 rounded-full blur-[128px]"></div>
        </div>

        <div className="z-10 text-center mb-8 md:mb-12 mt-10 md:mt-0">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-2xl border border-slate-700">
               <ShieldIcon className="w-16 h-16 md:w-20 md:h-20 text-white" />
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-4">SENTINELA</h1>
          <p className="text-slate-400 text-base md:text-lg max-w-xl mx-auto px-2">
            Sistema Integrado de Emergência e Monitoramento de Segurança Pública
          </p>
        </div>

        <div className="z-10 grid md:grid-cols-2 gap-6 md:gap-8 w-full max-w-4xl mb-10">
          {/* Card Cidadão */}
          <button 
            onClick={() => setSection('CITIZEN')}
            className="group relative bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-blue-500 rounded-2xl p-6 md:p-8 transition-all duration-300 text-left shadow-lg hover:shadow-blue-900/20"
          >
            <div className="absolute top-6 right-6 bg-slate-800 p-3 rounded-full group-hover:bg-blue-600 transition-colors">
              <UserIcon className="w-6 h-6 text-slate-300 group-hover:text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2 group-hover:text-blue-400">App do Cidadão</h2>
            <p className="text-slate-400 mb-6 text-sm md:text-base">
              Acesso para população realizar denúncias, solicitar socorro e reportar emergências em tempo real.
            </p>
            <span className="inline-block text-blue-500 font-bold text-sm group-hover:translate-x-2 transition-transform">
              ACESSAR APLICATIVO →
            </span>
          </button>

          {/* Card Corporativo */}
          <button 
            onClick={() => setSection('DISPATCH_LOGIN')}
            className="group relative bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-red-500 rounded-2xl p-6 md:p-8 transition-all duration-300 text-left shadow-lg hover:shadow-red-900/20"
          >
            <div className="absolute top-6 right-6 bg-slate-800 p-3 rounded-full group-hover:bg-red-600 transition-colors">
              <LockIcon className="w-6 h-6 text-slate-300 group-hover:text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-2 group-hover:text-red-400">Portal de Monitoramento</h2>
            <p className="text-slate-400 mb-6 text-sm md:text-base">
              Área restrita para despacho de viaturas, análise de incidentes e gestão de crises.
            </p>
            <span className="inline-block text-red-500 font-bold text-sm group-hover:translate-x-2 transition-transform">
              ÁREA RESTRITA →
            </span>
          </button>
        </div>
        
        <footer className="relative z-10 text-slate-600 text-xs md:text-sm text-center">
          © 2024 Governo Estadual - Secretaria de Segurança Pública
        </footer>
      </div>
    );
  }

  // 2. Dispatcher Login (Auth Layer)
  if (section === 'DISPATCH_LOGIN') {
    return (
      <div className="w-full min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
         <button onClick={() => setSection('LANDING')} className="absolute top-6 left-6 text-slate-400 hover:text-white">
          ← Voltar
        </button>
        <div className="w-full max-w-md bg-slate-900 p-8 rounded-2xl border border-slate-700 shadow-2xl">
          <div className="flex flex-col items-center mb-6">
            <div className="bg-slate-800 p-3 rounded-full mb-4">
              <LockIcon className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-white">Acesso Restrito</h2>
            <p className="text-slate-400 text-sm">Central de Comando e Controle</p>
          </div>

          <form onSubmit={handleDispatcherLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">ID Operacional / Senha</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite seu ID (ex: 123456)"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
              {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
            </div>
            <button 
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              AUTENTICAR
            </button>
          </form>
          <div className="mt-4 text-center">
             <p className="text-xs text-slate-500">Acesso monitorado. Todas as ações são registradas.</p>
          </div>
        </div>
      </div>
    );
  }

  // 3. Citizen App (User Interface)
  if (section === 'CITIZEN') {
    return (
      <div className="w-full h-screen bg-slate-950">
        <CitizenView onBack={() => setSection('LANDING')} />
      </div>
    );
  }

  // 4. Dispatch Portal (Admin Interface)
  if (section === 'DISPATCH_PORTAL') {
    return (
      <div className="w-full h-screen bg-slate-950">
        <DispatchView onLogout={() => setSection('LANDING')} />
      </div>
    );
  }

  return null;
}