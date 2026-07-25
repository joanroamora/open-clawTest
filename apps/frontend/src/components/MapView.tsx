'use client';

import React, { useState } from 'react';
import { MapPin, Building, Flame, DollarSign, ExternalLink, Phone } from 'lucide-react';

interface Property {
  id: string;
  address: string;
  zip: string;
  owner_name?: string;
  owner_phone?: string;
  arv?: number;
  rehab_estimate?: number;
  offer?: number;
  motivation_score?: number;
  gemini_reason?: string;
  status: string;
}

interface MapViewProps {
  properties: Property[];
  onSelectProperty: (prop: Property) => void;
}

// Coordinates map for Houston target zips
const ZIP_COORDS: Record<string, { x: number; y: number; name: string }> = {
  '77083': { x: 22, y: 65, name: 'Mission Bend / Alief (77083)' },
  '77082': { x: 30, y: 50, name: 'Westchase (77082)' },
  '77407': { x: 15, y: 80, name: 'Richmond / Katy (77407)' },
  '77002': { x: 68, y: 45, name: 'Downtown Houston (77002)' },
  '77007': { x: 55, y: 35, name: 'Heights / Washington (77007)' },
};

export default function MapView({ properties, onSelectProperty }: MapViewProps) {
  const [activeProperty, setActiveProperty] = useState<Property | null>(null);

  const getBadgeColor = (score?: number) => {
    if (!score || score < 7) return { bg: 'bg-slate-500', text: 'text-slate-200', hex: '#64748b' };
    if (score >= 9) return { bg: 'bg-red-500', text: 'text-white', hex: '#ef4444' };
    return { bg: 'bg-amber-500', text: 'text-black', hex: '#f59e0b' };
  };

  return (
    <div className="bg-[#111827]/90 border border-slate-800/80 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-4 min-h-[600px] flex flex-col justify-between relative overflow-hidden">
      <div className="flex justify-between items-center z-10">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-red-500" />
            <span>Houston Off-Market Spatial Lead Map</span>
          </h3>
          <p className="text-xs text-slate-400">
            Color Legend: <span className="text-red-400 font-bold">🔴 Score 9-10 (Hot)</span> |{' '}
            <span className="text-amber-400 font-bold">🟡 Score 7-8 (High)</span> |{' '}
            <span className="text-slate-400 font-bold">⚪ Score &lt;7 (Low)</span>
          </p>
        </div>
        <div className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-full font-bold">
          {properties.length} Leads Plotted
        </div>
      </div>

      {/* Houston Map Canvas Container */}
      <div className="relative w-full h-[480px] bg-[#0b0f19] rounded-xl border border-slate-800 overflow-hidden shadow-inner flex items-center justify-center">
        {/* Houston Vector Grid Graphic */}
        <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#3b82f6" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          {/* Interstate 10 & Beltway 8 Mock Highway Lines */}
          <line x1="0" y1="200" x2="1000" y2="200" stroke="#60a5fa" strokeWidth="2" strokeDasharray="8 4" />
          <line x1="600" y1="0" x2="600" y2="600" stroke="#60a5fa" strokeWidth="2" strokeDasharray="8 4" />
          <circle cx="500" cy="250" r="180" fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="6 6" />
        </svg>

        {/* Houston Neighborhood Labels */}
        {Object.entries(ZIP_COORDS).map(([zip, coord]) => (
          <div
            key={zip}
            className="absolute text-[11px] font-extrabold text-slate-600 uppercase tracking-widest pointer-events-none select-none"
            style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
          >
            {coord.name}
          </div>
        ))}

        {/* Property Pins */}
        {properties.map((prop, idx) => {
          const zipInfo = ZIP_COORDS[prop.zip] || { x: 50 + (idx * 5) % 40, y: 40 + (idx * 7) % 40 };
          const offset = (idx * 4) % 15 - 7;
          const posX = Math.max(10, Math.min(90, zipInfo.x + offset));
          const posY = Math.max(10, Math.min(90, zipInfo.y + offset));
          const badge = getBadgeColor(prop.motivation_score);
          const isSelected = activeProperty?.id === prop.id;

          return (
            <div
              key={prop.id}
              onClick={() => setActiveProperty(prop)}
              className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 group z-20 ${
                isSelected ? 'scale-125 z-30' : 'hover:scale-110'
              }`}
              style={{ left: `${posX}%`, top: `${posY}%` }}
            >
              <div
                className={`w-7 h-7 rounded-full ${badge.bg} flex items-center justify-center shadow-lg border-2 border-slate-900 text-xs font-bold text-white group-hover:ring-4 ring-blue-500/50`}
              >
                {prop.motivation_score || '?'}
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded shadow-lg whitespace-nowrap pointer-events-none border border-slate-700">
                {prop.address}
              </div>
            </div>
          );
        })}

        {/* Selected Property Overlay Modal */}
        {activeProperty && (
          <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-[#1a2234] border border-blue-500/40 rounded-xl p-4 shadow-2xl z-40 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-bold">
                  ZIP {activeProperty.zip}
                </span>
                <h4 className="font-extrabold text-white text-sm mt-1">{activeProperty.address}</h4>
              </div>
              <button
                onClick={() => setActiveProperty(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded bg-slate-800"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 italic mb-3">
              "{activeProperty.gemini_reason || 'High off-market potential lead'}"
            </p>

            <div className="grid grid-cols-3 gap-2 bg-[#111726] p-2.5 rounded-lg border border-slate-800 text-center mb-3">
              <div>
                <p className="text-[10px] text-slate-400">ARV</p>
                <p className="text-xs font-bold text-emerald-400">${(activeProperty.arv || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Rehab</p>
                <p className="text-xs font-bold text-amber-400">${(activeProperty.rehab_estimate || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-400">Max Offer</p>
                <p className="text-xs font-extrabold text-emerald-400">${(activeProperty.offer || 0).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onSelectProperty(activeProperty)}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition shadow"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Property Details</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
