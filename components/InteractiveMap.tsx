import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Incident, EmergencyType, IncidentStatus } from '../types';
import { ShieldIcon, FireIcon, MedicalIcon, MapPinIcon } from './Icons';

interface InteractiveMapProps {
  incidents: Incident[];
  onSelectIncident: (id: string) => void;
}

const InteractiveMap: React.FC<InteractiveMapProps> = ({ incidents, onSelectIncident }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Filter valid incidents for the map
  const mapIncidents = useMemo(() => {
    return incidents.filter(i => 
      (i.status === IncidentStatus.PENDING || i.status === IncidentStatus.DISPATCHED) &&
      (i.location.latitude !== 0 || i.location.longitude !== 0)
    );
  }, [incidents]);

  // Calculate center of all points to auto-center the map initially
  const centerPoint = useMemo(() => {
    if (mapIncidents.length === 0) return { lat: -23.5505, lng: -46.6333 }; // Default (Sao Paulo approx)
    
    const sum = mapIncidents.reduce((acc, curr) => ({
      lat: acc.lat + curr.location.latitude,
      lng: acc.lng + curr.location.longitude
    }), { lat: 0, lng: 0 });

    return {
      lat: sum.lat / mapIncidents.length,
      lng: sum.lng / mapIncidents.length
    };
  }, [mapIncidents]);

  // Projection logic: Convert Lat/Lng to SVG X/Y
  // We use a simple equirectangular projection approximation for small areas
  const project = (lat: number, lng: number) => {
    const SCALE = 100000 * zoom; // Arbitrary scale factor for visibility
    const x = (lng - centerPoint.lng) * SCALE + (offset.x);
    const y = (centerPoint.lat - lat) * SCALE + (offset.y); // Latitude is inverted in SVG
    return { x, y };
  };

  const handleWheel = (e: React.WheelEvent) => {
    const scaleFactor = 0.1;
    const newZoom = Math.max(0.2, Math.min(5, zoom + (e.deltaY > 0 ? -scaleFactor : scaleFactor)));
    setZoom(newZoom);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const getMarkerColor = (type: EmergencyType) => {
    switch (type) {
      case EmergencyType.POLICE: return '#3b82f6';
      case EmergencyType.FIRE: return '#f97316';
      case EmergencyType.MEDICAL: return '#ef4444';
      default: return '#fff';
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-slate-900 relative overflow-hidden cursor-move select-none"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Grid Background Effect */}
      <div 
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, #334155 1px, transparent 1px),
            linear-gradient(to bottom, #334155 1px, transparent 1px)
          `,
          backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
          backgroundPosition: `${offset.x + window.innerWidth/2}px ${offset.y + window.innerHeight/2}px`
        }}
      />

      <svg className="w-full h-full pointer-events-none">
        <g transform={`translate(${window.innerWidth / 6}, ${window.innerHeight / 2})`}> 
          {/* Note: Translate centers 0,0 roughly in the sidebar view area */}
          
          {mapIncidents.map((incident) => {
            const pos = project(incident.location.latitude, incident.location.longitude);
            const color = getMarkerColor(incident.type);
            const isSelected = selectedId === incident.id;
            const severity = incident.aiAnalysis?.severity || 1;
            const size = 20 + (severity * 2);

            return (
              <g 
                key={incident.id} 
                transform={`translate(${pos.x}, ${pos.y})`}
                className="pointer-events-auto cursor-pointer transition-all duration-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(incident.id);
                  onSelectIncident(incident.id);
                }}
              >
                {/* Pulse for High Severity */}
                {severity >= 4 && (
                  <circle r={size * 2} fill={color} opacity="0.2">
                    <animate attributeName="r" from={size} to={size * 3} dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Marker Body */}
                <circle 
                  r={size} 
                  fill={isSelected ? '#fff' : '#1e293b'} 
                  stroke={color} 
                  strokeWidth="3"
                  className="transition-colors"
                />
                
                {/* Icon */}
                <foreignObject x={-10} y={-10} width="20" height="20" className="pointer-events-none">
                   <div className={`flex items-center justify-center w-full h-full ${isSelected ? 'text-slate-900' : 'text-white'}`}>
                      {incident.type === EmergencyType.POLICE && <ShieldIcon className="w-5 h-5" />}
                      {incident.type === EmergencyType.FIRE && <FireIcon className="w-5 h-5" />}
                      {incident.type === EmergencyType.MEDICAL && <MedicalIcon className="w-5 h-5" />}
                   </div>
                </foreignObject>

                {/* Tooltip Label (Always show if selected, hover otherwise) */}
                {isSelected && (
                   <g transform={`translate(0, -${size + 10})`}>
                      <rect x="-75" y="-40" width="150" height="40" rx="4" fill="#0f172a" stroke={color} strokeWidth="1" />
                      <text x="0" y="-22" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
                        {incident.type}
                      </text>
                      <text x="0" y="-8" textAnchor="middle" fill="#94a3b8" fontSize="8">
                        {new Date(incident.timestamp).toLocaleTimeString()}
                      </text>
                   </g>
                )}
              </g>
            );
          })}
        </g>
      </svg>

      {/* Map Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2">
        <button 
          onClick={() => setZoom(z => Math.min(5, z + 0.5))}
          className="bg-slate-800 p-2 rounded text-white border border-slate-600 hover:bg-slate-700"
        >
          +
        </button>
        <button 
          onClick={() => setZoom(z => Math.max(0.2, z - 0.5))}
          className="bg-slate-800 p-2 rounded text-white border border-slate-600 hover:bg-slate-700"
        >
          -
        </button>
        <button 
          onClick={() => { setOffset({x:0, y:0}); setZoom(1); setSelectedId(null); }}
          className="bg-slate-800 p-2 rounded text-white border border-slate-600 hover:bg-slate-700 text-xs font-bold"
        >
          RESET
        </button>
      </div>

      <div className="absolute top-4 left-4 bg-slate-900/80 px-3 py-1 rounded border border-slate-700 text-xs text-slate-300">
        Modo Tático
      </div>
    </div>
  );
};

export default InteractiveMap;