import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Incident, IncidentStatus } from '../types';

interface IncidentContextType {
  incidents: Incident[];
  reportIncident: (incident: Incident) => void;
  updateIncidentStatus: (id: string, status: IncidentStatus) => void;
}

const IncidentContext = createContext<IncidentContextType | undefined>(undefined);

export const IncidentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);

  const reportIncident = (newIncident: Incident) => {
    setIncidents(prev => [newIncident, ...prev]);
  };

  const updateIncidentStatus = (id: string, status: IncidentStatus) => {
    setIncidents(prev => prev.map(incident => 
      incident.id === id ? { ...incident, status } : incident
    ));
  };

  return (
    <IncidentContext.Provider value={{ incidents, reportIncident, updateIncidentStatus }}>
      {children}
    </IncidentContext.Provider>
  );
};

export const useIncidentSystem = () => {
  const context = useContext(IncidentContext);
  if (!context) throw new Error("useIncidentSystem must be used within IncidentProvider");
  return context;
};