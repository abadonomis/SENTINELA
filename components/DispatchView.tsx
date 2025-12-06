import React, { useMemo, useState } from 'react';
import { Incident, IncidentStatus, EmergencyType } from '../types';
import { FireIcon, ShieldIcon, MapPinIcon, PhoneIcon, MedicalIcon, ClockIcon, FilterIcon } from './Icons';
import InteractiveMap from './InteractiveMap';
import { useIncidentSystem } from '../contexts/IncidentContext';

interface DispatchViewProps {
  onLogout: () => void;
}

const DispatchView: React.FC<DispatchViewProps> = ({ onLogout }) => {
  const { incidents, updateIncidentStatus } = useIncidentSystem();

  const [viewTab, setViewTab] = useState<'LIVE' | 'HISTORY'>('LIVE');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  
  // History Filter State
  const [filterType, setFilterType] = useState<EmergencyType | 'ALL'>('ALL');
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');

  // Live Incidents (Pending or Dispatched)
  const sortedLiveIncidents = useMemo(() => {
    return incidents
      .filter(i => i.status === IncidentStatus.PENDING || i.status === IncidentStatus.DISPATCHED)
      .sort((a, b) => {
        // Prioritize highlighted incident
        if (a.id === highlightedId) return -1;
        if (b.id === highlightedId) return 1;

        if (a.status !== b.status) {
          if (a.status === IncidentStatus.PENDING) return -1;
          if (b.status === IncidentStatus.PENDING) return 1;
        }
        const severityA = a.aiAnalysis?.severity || 0;
        const severityB = b.aiAnalysis?.severity || 0;
        if (severityA !== severityB) return severityB - severityA;
        return b.timestamp - a.timestamp;
      });
  }, [incidents, highlightedId]);

  // History Incidents (Resolved or False Alarm) + Filters
  const historyIncidents = useMemo(() => {
    return incidents
      .filter(i => {
        // Status Check
        const isHistory = i.status === IncidentStatus.RESOLVED || i.status === IncidentStatus.FALSE_ALARM;
        if (!isHistory) return false;

        // Type Filter
        if (filterType !== 'ALL' && i.type !== filterType) return false;

        // Date Filter
        const incidentDate = new Date(i.timestamp);
        if (dateStart) {
          const start = new Date(dateStart);
          start.setHours(0, 0, 0, 0);
          if (incidentDate < start) return false;
        }
        if (dateEnd) {
          const end = new Date(dateEnd);
          end.setHours(23, 59, 59, 999);
          if (incidentDate > end) return false;
        }

        return true;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [incidents, filterType, dateStart, dateEnd]);

  const handleMapSelection = (id: string) => {
    setHighlightedId(id);
    setViewTab('LIVE'); // Switch to live view to see the card
  };

  return (
    <div className="flex h-full bg-slate-900 text-slate-100 overflow-hidden">
      {/* Sidebar - Interactive Map & Stats (Always visible on desktop) */}
      <div className="hidden lg:flex w-1/3 bg-slate-800 border-r border-slate-700 flex-col p-4">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">
          <MapPinIcon className="w-5 h-5" /> Mapa Operacional
        </h2>
        
        {/* Interactive Map Component */}
        <div className="flex-1 bg-slate-900 rounded-xl relative overflow-hidden border border-slate-600 shadow-inner">
           <InteractiveMap 
             incidents={incidents} 
             onSelectIncident={handleMapSelection}
           />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-slate-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-400">{incidents.filter(i => i.status === IncidentStatus.PENDING).length}</div>
                <div className="text-xs text-slate-400">Pendentes</div>
            </div>
            <div className="bg-slate-700 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{incidents.filter(i => i.status === IncidentStatus.DISPATCHED).length}</div>
                <div className="text-xs text-slate-400">Em Atendimento</div>
            </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-slate-700 flex items-center justify-between px-6 bg-slate-800">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold hidden md:block">Central de Despacho</h1>
            <div className="flex bg-slate-700 rounded-lg p-1">
              <button 
                onClick={() => setViewTab('LIVE')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${viewTab === 'LIVE' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                <div className={`w-2 h-2 rounded-full ${viewTab === 'LIVE' ? 'bg-green-500 animate-pulse' : 'bg-slate-500'}`} />
                Ao Vivo
              </button>
              <button 
                onClick={() => setViewTab('HISTORY')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-medium transition-all ${viewTab === 'HISTORY' ? 'bg-slate-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
              >
                <ClockIcon className="w-4 h-4" />
                Histórico
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:inline">{new Date().toLocaleDateString()}</span>
            <button 
                onClick={onLogout}
                className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-white"
            >
                Sair do Sistema
            </button>
          </div>
        </header>

        {viewTab === 'LIVE' ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {sortedLiveIncidents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                <ShieldIcon className="w-16 h-16 mb-4" />
                <p className="text-lg">Nenhum incidente ativo no momento.</p>
              </div>
            ) : (
              sortedLiveIncidents.map(incident => (
                <IncidentCard 
                  key={incident.id} 
                  incident={incident} 
                  onAction={updateIncidentStatus}
                  isHighlighted={incident.id === highlightedId}
                />
              ))
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* History Filters */}
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex flex-wrap gap-4 items-center">
              <div className="flex items-center gap-2 text-slate-300">
                <FilterIcon className="w-4 h-4" />
                <span className="text-sm font-bold">Filtros:</span>
              </div>
              
              <select 
                className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg p-2.5 outline-none focus:border-blue-500"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as EmergencyType | 'ALL')}
              >
                <option value="ALL">Todos os Tipos</option>
                <option value={EmergencyType.POLICE}>Polícia</option>
                <option value={EmergencyType.FIRE}>Bombeiros</option>
                <option value={EmergencyType.MEDICAL}>SAMU</option>
              </select>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">De:</span>
                <input 
                  type="date" 
                  className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg p-2 outline-none focus:border-blue-500"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Até:</span>
                <input 
                  type="date" 
                  className="bg-slate-700 border border-slate-600 text-white text-sm rounded-lg p-2 outline-none focus:border-blue-500"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                />
              </div>
              
              <div className="ml-auto text-xs text-slate-400">
                {historyIncidents.length} registros encontrados
              </div>
            </div>

            {/* History Table */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm text-left text-slate-300">
                <thead className="text-xs uppercase bg-slate-700 text-slate-400 sticky top-0">
                  <tr>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Data/Hora</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Solicitante (CPF)</th>
                    <th className="px-6 py-3">Resumo / Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {historyIncidents.map((incident) => (
                    <tr key={incident.id} className="border-b border-slate-700 hover:bg-slate-800">
                      <td className="px-6 py-4">
                        {incident.status === IncidentStatus.RESOLVED ? (
                          <span className="bg-blue-900 text-blue-300 px-2 py-1 rounded-full text-xs font-bold border border-blue-700">
                            FINALIZADO
                          </span>
                        ) : (
                          <span className="bg-slate-600 text-slate-300 px-2 py-1 rounded-full text-xs font-bold border border-slate-500">
                            ALARME FALSO
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono">
                        {new Date(incident.timestamp).toLocaleDateString()} <br/>
                        {new Date(incident.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {incident.type === EmergencyType.POLICE && <ShieldIcon className="w-4 h-4 text-blue-500" />}
                          {incident.type === EmergencyType.FIRE && <FireIcon className="w-4 h-4 text-orange-500" />}
                          {incident.type === EmergencyType.MEDICAL && <MedicalIcon className="w-4 h-4 text-red-500" />}
                          <span>
                             {incident.type === EmergencyType.POLICE ? 'Polícia' : 
                              incident.type === EmergencyType.FIRE ? 'Bombeiros' : 'SAMU'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span>{incident.userContact}</span>
                          <span className="text-xs text-slate-500">{incident.userCpf}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-md truncate" title={incident.description}>
                        {incident.aiAnalysis?.summary || incident.description}
                      </td>
                    </tr>
                  ))}
                  {historyIncidents.length === 0 && (
                     <tr>
                       <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                         Nenhum histórico encontrado com os filtros selecionados.
                       </td>
                     </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const IncidentCard: React.FC<{ 
  incident: Incident; 
  onAction: (id: string, status: IncidentStatus) => void;
  isHighlighted?: boolean;
}> = ({ incident, onAction, isHighlighted }) => {
  const isPending = incident.status === IncidentStatus.PENDING;
  
  const severity = incident.aiAnalysis?.severity || 0;
  let severityColor = "bg-gray-600";
  if (severity >= 4) severityColor = "bg-red-600 animate-pulse";
  else if (severity === 3) severityColor = "bg-orange-600";
  else if (severity > 0) severityColor = "bg-yellow-600";

  let typeConfig = {
    color: 'border-gray-500',
    iconBg: 'bg-gray-900',
    iconColor: 'text-gray-400',
    icon: <ShieldIcon className="w-8 h-8" />
  };

  if (incident.type === EmergencyType.POLICE) {
    typeConfig = {
      color: 'border-blue-500',
      iconBg: 'bg-blue-900/50',
      iconColor: 'text-blue-400',
      icon: <ShieldIcon className="w-8 h-8" />
    };
  } else if (incident.type === EmergencyType.FIRE) {
    typeConfig = {
      color: 'border-orange-500',
      iconBg: 'bg-orange-900/50',
      iconColor: 'text-orange-400',
      icon: <FireIcon className="w-8 h-8" />
    };
  } else if (incident.type === EmergencyType.MEDICAL) {
    typeConfig = {
      color: 'border-red-500',
      iconBg: 'bg-red-900/50',
      iconColor: 'text-red-400',
      icon: <MedicalIcon className="w-8 h-8" />
    };
  }

  return (
    <div className={`relative bg-slate-800 rounded-lg border-l-4 shadow-lg overflow-hidden transition-all hover:bg-slate-750 ${typeConfig.color} ${incident.status === IncidentStatus.RESOLVED ? 'opacity-50 grayscale' : ''} ${isHighlighted ? 'ring-2 ring-white scale-[1.02]' : ''}`}>
      <div className="p-5 flex flex-col md:flex-row gap-4">
        
        <div className="flex md:flex-col items-center gap-3 min-w-[80px]">
            <div className={`p-3 rounded-full ${typeConfig.iconBg} ${typeConfig.iconColor}`}>
                {typeConfig.icon}
            </div>
            {incident.aiAnalysis && (
                 <div className={`px-2 py-1 rounded text-xs font-bold text-white ${severityColor}`}>
                   Nível {severity}
                 </div>
            )}
        </div>

        <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-slate-400">#{incident.id.slice(0, 8)}</span>
                <span className="text-xs text-slate-400">• {new Date(incident.timestamp).toLocaleTimeString()}</span>
                {incident.aiAnalysis && (
                    <span className="text-xs font-bold bg-slate-700 px-2 py-0.5 rounded text-slate-200">
                        {incident.aiAnalysis.category}
                    </span>
                )}
            </div>
            
            <h3 className="text-lg font-semibold text-white mb-2">
                {incident.aiAnalysis?.summary || "Relato de emergência"}
            </h3>
            
            <p className="text-slate-300 text-sm mb-3 bg-slate-900/50 p-2 rounded border border-slate-700">
                "{incident.description || 'Sem descrição detalhada.'}"
            </p>

            <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-1">
                    <MapPinIcon className="w-4 h-4 text-slate-500" />
                    {incident.address ? (
                        <span className="text-white font-medium">{incident.address}</span>
                    ) : (
                        <span>{incident.location.latitude.toFixed(4)}, {incident.location.longitude.toFixed(4)}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 text-slate-500" />
                    <span className="text-slate-300">{incident.userContact}</span>
                    {incident.userCpf && (
                      <span className="text-slate-500 text-xs ml-1">CPF: {incident.userCpf}</span>
                    )}
                </div>
            </div>

            {incident.aiAnalysis?.suggestedAction && (
                <div className="mt-3 text-xs text-cyan-400 font-medium">
                    Sugestão IA: {incident.aiAnalysis.suggestedAction}
                </div>
            )}
        </div>

        <div className="flex md:flex-col justify-center gap-2 min-w-[140px] border-t md:border-t-0 md:border-l border-slate-700 pt-4 md:pt-0 md:pl-4">
             {isPending ? (
                 <>
                    <button 
                        onClick={() => onAction(incident.id, IncidentStatus.DISPATCHED)}
                        className="bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded font-bold shadow-lg transition-colors text-sm"
                    >
                        DESPACHAR VIATURA
                    </button>
                    <button 
                        onClick={() => onAction(incident.id, IncidentStatus.FALSE_ALARM)}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 px-4 rounded font-medium transition-colors text-xs"
                    >
                        Alarme Falso
                    </button>
                 </>
             ) : incident.status === IncidentStatus.DISPATCHED ? (
                <div className="text-center">
                    <div className="text-green-400 font-bold mb-2 text-sm animate-pulse">EM ATENDIMENTO</div>
                    <button 
                        onClick={() => onAction(incident.id, IncidentStatus.RESOLVED)}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded font-bold text-sm"
                    >
                        FINALIZAR
                    </button>
                </div>
             ) : (
                <div className="text-center text-slate-500 font-bold text-sm">
                    FINALIZADO
                </div>
             )}
        </div>
      </div>
    </div>
  );
};

export default DispatchView;