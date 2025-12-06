import React, { useState, useMemo } from 'react';
import { EmergencyType, Incident, IncidentStatus, Coordinates } from '../types';
import { FireIcon, ShieldIcon, MapPinIcon, MedicalIcon } from './Icons';
import { analyzeEmergency } from '../services/geminiService';
import { useIncidentSystem } from '../contexts/IncidentContext';

interface CitizenViewProps {
  onBack: () => void;
}

// CPF Validation Logic
const isValidCPF = (cpf: string): boolean => {
  const cleanCpf = cpf.replace(/\D/g, '');

  // Check length and known invalid patterns (e.g. 111.111.111-11)
  if (cleanCpf.length !== 11 || /^(\d)\1+$/.test(cleanCpf)) {
    return false;
  }

  // Calculate first verifier digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
  }
  let rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cleanCpf.charAt(9))) return false;

  // Calculate second verifier digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
  }
  rest = (sum * 10) % 11;
  if (rest === 10 || rest === 11) rest = 0;
  if (rest !== parseInt(cleanCpf.charAt(10))) return false;

  return true;
};

const CitizenView: React.FC<CitizenViewProps> = ({ onBack }) => {
  const { incidents, reportIncident } = useIncidentSystem();

  // Auth State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cpf, setCpf] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Report State
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [selectedType, setSelectedType] = useState<EmergencyType | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Location Mode State
  const [locationMode, setLocationMode] = useState<'GPS' | 'MANUAL'>('GPS');
  const [manualAddress, setManualAddress] = useState('');

  const formatCpf = (value: string) => {
    return value
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  // Filter incidents for the currently logged-in user
  const userIncidents = useMemo(() => {
    if (!isLoggedIn) return [];
    const formattedCpf = formatCpf(cpf);
    return incidents.filter(inc => 
      inc.userContact === phoneNumber && 
      inc.userCpf === formattedCpf &&
      inc.status !== IncidentStatus.RESOLVED && 
      inc.status !== IncidentStatus.FALSE_ALARM
    );
  }, [incidents, isLoggedIn, phoneNumber, cpf]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (phoneNumber.length < 8) {
      alert("Por favor, digite um número de telefone válido.");
      return;
    }

    if (!isValidCPF(cpf)) {
      alert("CPF Inválido. Por favor, verifique os dígitos e tente novamente.");
      return;
    }

    setIsLoggedIn(true);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
      setCpf(value);
    }
  };

  const handleStartReport = (type: EmergencyType) => {
    setSelectedType(type);
    setDescription('');
    setLocationMode('GPS');
    setManualAddress('');
  };

  const submitIncident = async (location: Coordinates, address?: string) => {
    const newIncident: Incident = {
      id: crypto.randomUUID(),
      type: selectedType!,
      timestamp: Date.now(),
      location,
      address,
      description,
      status: IncidentStatus.PENDING,
      userContact: phoneNumber,
      userCpf: formatCpf(cpf),
    };

    // Attempt AI analysis if description is provided
    try {
      if (description.length > 5) {
          const analysis = await analyzeEmergency(description, selectedType!);
          newIncident.aiAnalysis = analysis;
      }
    } catch (err) {
      console.error("AI Analysis skipped:", err);
    }

    reportIncident(newIncident);
    setSelectedType(null);
    setIsSubmitting(false);
    alert('Chamado enviado com sucesso! O socorro está sendo notificado.');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) return;

    setIsSubmitting(true);

    if (locationMode === 'MANUAL') {
      if (!manualAddress.trim()) {
        setIsSubmitting(false);
        alert("Por favor, digite o endereço.");
        return;
      }
      await submitIncident({ latitude: 0, longitude: 0 }, manualAddress);
    } else {
      setLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          setLoadingLocation(false);
          await submitIncident({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          setLoadingLocation(false);
          setIsSubmitting(false);
          alert('Erro ao obter localização GPS. Tente usar a opção "Endereço Manual" ou verifique suas permissões.');
          console.error(error);
        }
      );
    }
  };

  // --- LOGIN SCREEN ---
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-slate-900 animate-fade-in relative overflow-y-auto">
        <button onClick={onBack} className="absolute top-6 left-6 text-slate-400 hover:text-white z-10">
          ← Voltar ao Portal
        </button>

        <div className="w-full max-w-sm bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 my-auto">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-red-600 p-3 rounded-xl mb-4 shadow-lg shadow-red-900/20">
              <ShieldIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">App do Cidadão</h1>
            <p className="text-slate-400 text-sm mt-2 text-center">Identifique-se para solicitar socorro.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">CPF</label>
              <input 
                type="text" 
                value={formatCpf(cpf)}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
                maxLength={14}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Número de Celular</label>
              <input 
                type="tel" 
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="(XX) 99999-9999"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg active:scale-95 mt-4"
            >
              ENTRAR
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- REPORT FORM ---
  if (selectedType) {
    let typeColor = '';
    let borderColor = '';
    let icon = null;
    let title = '';
    let placeholder = '';

    switch (selectedType) {
      case EmergencyType.POLICE:
        typeColor = 'bg-blue-600 hover:bg-blue-500';
        borderColor = 'border-blue-500';
        icon = <ShieldIcon className="w-8 h-8 md:w-10 md:h-10 text-blue-500" />;
        title = 'Acionar Polícia';
        placeholder = "Ex: Alguém está tentando entrar na minha casa, assalto em andamento...";
        break;
      case EmergencyType.FIRE:
        typeColor = 'bg-orange-600 hover:bg-orange-500';
        borderColor = 'border-orange-500';
        icon = <FireIcon className="w-8 h-8 md:w-10 md:h-10 text-orange-500" />;
        title = 'Acionar Bombeiros';
        placeholder = "Ex: Cheiro forte de gás, fumaça preta, incêndio em vegetação...";
        break;
      case EmergencyType.MEDICAL:
        typeColor = 'bg-red-600 hover:bg-red-500';
        borderColor = 'border-red-500';
        icon = <MedicalIcon className="w-8 h-8 md:w-10 md:h-10 text-red-500" />;
        title = 'Acionar SAMU';
        placeholder = "Ex: Pessoa desmaiada, dor no peito, acidente de moto...";
        break;
    }

    return (
      <div className="flex flex-col h-full p-4 md:p-6 animate-fade-in overflow-y-auto">
        <button 
          onClick={() => setSelectedType(null)}
          className="mb-6 text-gray-400 hover:text-white flex items-center gap-2"
        >
          ← Cancelar
        </button>

        <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-3">
          {icon}
          {title}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6 flex-1 min-h-[400px]">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-gray-300">O que está acontecendo? (Opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={placeholder}
              className={`w-full h-32 md:h-48 bg-gray-800 rounded-xl p-4 text-white placeholder-gray-500 border-2 ${borderColor} focus:outline-none focus:ring-2 focus:ring-white`}
            />
          </div>

          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
            <div className="flex gap-2 mb-4 p-1 bg-gray-900 rounded-lg">
              <button
                type="button"
                onClick={() => setLocationMode('GPS')}
                className={`flex-1 py-3 rounded-md text-sm font-bold transition-all ${locationMode === 'GPS' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Usar GPS
              </button>
              <button
                type="button"
                onClick={() => setLocationMode('MANUAL')}
                className={`flex-1 py-3 rounded-md text-sm font-bold transition-all ${locationMode === 'MANUAL' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
              >
                Digitar Endereço
              </button>
            </div>

            {locationMode === 'GPS' ? (
              <div className="flex items-center gap-3 p-2">
                <MapPinIcon className="w-6 h-6 text-green-500 animate-bounce" />
                <div className="text-sm text-gray-300">
                  Sua localização exata será enviada via satélite.
                </div>
              </div>
            ) : (
              <div className="animate-fade-in">
                <input
                  type="text"
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder="Rua, Número, Bairro, Cidade..."
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg p-3 text-white focus:outline-none focus:border-white transition-colors"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`mt-auto w-full py-5 md:py-6 rounded-2xl text-xl md:text-2xl font-bold text-white shadow-lg transform transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${typeColor} mb-6`}
          >
            {isSubmitting ? (loadingLocation ? 'Localizando...' : 'Enviando...') : 'ENVIAR ALERTA'}
          </button>
        </form>
      </div>
    );
  }

  // --- DASHBOARD ---
  return (
    <div className="flex flex-col h-full p-6 relative overflow-y-auto">
      <div className="flex justify-between items-start mb-6 shrink-0">
        <button onClick={onBack} className="text-slate-500 hover:text-white text-sm">
          ← Voltar
        </button>
        <button onClick={() => setIsLoggedIn(false)} className="text-slate-500 hover:text-white text-sm underline">
          Sair do Perfil
        </button>
      </div>

      {userIncidents.length > 0 && (
        <div className="mb-6 bg-gray-800 rounded-xl p-4 border border-gray-700 shadow-xl shrink-0">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Seus Chamados Ativos</h3>
          <div className="flex flex-col gap-2">
            {userIncidents.map(inc => (
              <div key={inc.id} className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${inc.status === IncidentStatus.DISPATCHED ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                  <span className="font-medium text-sm">
                    {inc.type === EmergencyType.POLICE && 'Polícia'}
                    {inc.type === EmergencyType.FIRE && 'Bombeiros'}
                    {inc.type === EmergencyType.MEDICAL && 'SAMU'}
                  </span>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  inc.status === IncidentStatus.DISPATCHED ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                }`}>
                  {inc.status === IncidentStatus.DISPATCHED ? 'A CAMINHO' : 'PENDENTE'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col justify-center items-center gap-4 z-10 w-full max-w-lg mx-auto">
        <div className="text-center mb-4">
          <h1 className="text-4xl font-extrabold mb-2">Sentinela</h1>
          <p className="text-gray-400">Olá, {phoneNumber}</p>
          <p className="text-xs text-slate-500">CPF: {formatCpf(cpf)}</p>
          <p className="text-gray-500 text-sm mt-2">Toque para solicitar socorro imediato</p>
        </div>

        <button
          onClick={() => handleStartReport(EmergencyType.POLICE)}
          className="w-full h-24 md:h-32 bg-gradient-to-r from-blue-700 to-blue-900 rounded-2xl shadow-xl flex items-center justify-start px-6 md:px-8 gap-4 md:gap-6 hover:brightness-110 active:scale-95 transition-all border-l-8 border-blue-500 group"
        >
          <ShieldIcon className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
          <span className="text-xl md:text-2xl font-bold tracking-widest text-white">POLÍCIA</span>
        </button>

        <button
          onClick={() => handleStartReport(EmergencyType.FIRE)}
          className="w-full h-24 md:h-32 bg-gradient-to-r from-orange-600 to-orange-800 rounded-2xl shadow-xl flex items-center justify-start px-6 md:px-8 gap-4 md:gap-6 hover:brightness-110 active:scale-95 transition-all border-l-8 border-orange-500 group"
        >
          <FireIcon className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
          <span className="text-xl md:text-2xl font-bold tracking-widest text-white">BOMBEIROS</span>
        </button>

        <button
          onClick={() => handleStartReport(EmergencyType.MEDICAL)}
          className="w-full h-24 md:h-32 bg-gradient-to-r from-red-600 to-red-800 rounded-2xl shadow-xl flex items-center justify-start px-6 md:px-8 gap-4 md:gap-6 hover:brightness-110 active:scale-95 transition-all border-l-8 border-red-500 group"
        >
          <MedicalIcon className="w-10 h-10 md:w-12 md:h-12 text-white drop-shadow-md group-hover:scale-110 transition-transform" />
          <span className="text-xl md:text-2xl font-bold tracking-widest text-white">SAMU (192)</span>
        </button>
      </div>
    </div>
  );
};

export default CitizenView;