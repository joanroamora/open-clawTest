'use client';

import React, { useState } from 'react';
import { ExternalLink, Phone, Download, ChevronRight, Flame, MapPin, Building, Sparkles, CheckCircle2 } from 'lucide-react';
import { FilterState } from './SidebarFilters';

export interface Property {
  id: string;
  address: string;
  zip: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  arv?: number;
  rehab_estimate?: number;
  rehab_level?: string;
  offer?: number;
  motivation_score?: number;
  gemini_reason?: string;
  tax_delinquent_years?: number;
  status: string;
  comps?: any;
}

interface KanbanProps {
  properties: Property[];
  filters: FilterState;
  apiBaseUrl: string;
  onUpdateStatus: (id: string, newStatus: string) => void;
  onSelectAppointment: (prop: Property) => void;
}

const STAGES = [
  { key: 'NEW', label: '1. New (HCAD Raw)', color: 'border-blue-500', bgHeader: 'bg-blue-500/10' },
  { key: 'AI_FILTERED', label: '2. AI Filtered (7+)', color: 'border-amber-500', bgHeader: 'bg-amber-500/10' },
  { key: 'CONTACTED', label: '3. Contacted (Email)', color: 'border-indigo-500', bgHeader: 'bg-indigo-500/10' },
  { key: 'REPLIED', label: '4. Replied (Hot)', color: 'border-purple-500', bgHeader: 'bg-purple-500/10' },
  { key: 'APPOINTMENT', label: '5. Appointment (Sell)', color: 'border-emerald-500', bgHeader: 'bg-emerald-500/10' },
];

export default function KanbanBoard({ properties, filters, apiBaseUrl, onUpdateStatus, onSelectAppointment }: KanbanProps) {

  // Apply filters
  const filteredProperties = properties.filter(p => {
    // Zip filter
    if (filters.zips.length > 0 && !filters.zips.includes(p.zip)) return false;
    // Motivation score filter
    if ((p.motivation_score || 5) < filters.minScore) return false;
    // Max offer filter
    if ((p.offer || 0) > filters.maxOffer) return false;
    // Tax years filter
    if (filters.taxYears > 0 && (p.tax_delinquent_years || 0) < filters.taxYears) return false;
    // Rehab level filter
    if (filters.rehabLevel !== 'all' && p.rehab_level && p.rehab_level.toLowerCase() !== filters.rehabLevel.toLowerCase()) return false;
    return true;
  });

  const getMotivationBadge = (score?: number, taxYears?: number) => {
    const s = score || 5;
    if (s >= 9) {
      return (
        <span className="bg-red-500/20 text-red-400 border border-red-500/40 px-2.5 py-1 rounded-md text-[10px] font-extrabold flex items-center gap-1 uppercase tracking-wider">
          <Flame className="w-3 h-3 text-red-400 fill-red-400" />
          HIGH - {taxYears || 3} yrs tax delinquent + vacant
        </span>
      );
    }
    if (s >= 7) {
      return (
        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-md text-[10px] font-extrabold flex items-center gap-1 uppercase tracking-wider">
          <Flame className="w-3 h-3 text-amber-400" />
          MEDIUM - Score {s}/10
        </span>
      );
    }
    return (
      <span className="bg-slate-700/50 text-slate-400 border border-slate-700 px-2.5 py-1 rounded-md text-[10px] font-semibold">
        LOW MOTIVATION - Score {s}/10
      </span>
    );
  };

  const getNextStageKey = (currentStatus: string) => {
    const idx = STAGES.findIndex(s => s.key === currentStatus);
    if (idx === -1 || idx >= STAGES.length - 1) return STAGES[0].key;
    return STAGES[idx + 1].key;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-6">
      {STAGES.map(stage => {
        const stageProperties = filteredProperties.filter(p => p.status === stage.key);
        return (
          <div
            key={stage.key}
            className="bg-[#111827]/80 border border-slate-800/90 rounded-2xl p-3.5 min-w-[280px] flex flex-col justify-start shadow-xl backdrop-blur-sm"
          >
            {/* Stage Header */}
            <div className={`flex justify-between items-center p-3 rounded-xl ${stage.bgHeader} border border-slate-800 mb-3`}>
              <span className="font-extrabold text-xs text-white uppercase tracking-wider">{stage.label}</span>
              <span className="text-xs bg-slate-900/80 text-slate-300 px-2.5 py-0.5 rounded-full font-black border border-slate-700">
                {stageProperties.length}
              </span>
            </div>

            {/* Properties List */}
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[75vh] pr-1">
              {stageProperties.map(item => (
                <div
                  key={item.id}
                  className={`bg-[#1a2234] border-l-4 ${stage.color} border-y border-r border-slate-800/80 rounded-xl p-4 shadow-lg hover:border-slate-600 transition-all space-y-3 group`}
                >
                  {/* Address & Zip Badge */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-extrabold text-white text-sm group-hover:text-blue-300 transition-colors">
                        {item.address}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded">
                          ZIP {item.zip}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">Houston, TX</span>
                      </div>
                    </div>
                  </div>

                  {/* Motivation Score Badge */}
                  <div>{getMotivationBadge(item.motivation_score, item.tax_delinquent_years)}</div>

                  {/* ARV / Rehab / Offer in 3 Columns */}
                  <div className="grid grid-cols-3 gap-1.5 bg-[#111726] p-2.5 rounded-xl border border-slate-800 text-center">
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">ARV</p>
                      <p className="text-xs font-extrabold text-slate-200">${(item.arv || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">Rehab</p>
                      <p className="text-xs font-extrabold text-amber-400">${(item.rehab_estimate || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-emerald-500/10 rounded-lg p-0.5 border border-emerald-500/20">
                      <p className="text-[9px] text-emerald-400 font-bold uppercase">Max Offer</p>
                      <p className="text-xs font-black text-emerald-400">${(item.offer || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Gemini Reason */}
                  <p className="text-[11px] text-slate-300 italic bg-slate-900/60 p-2 rounded-lg border border-slate-800/60 leading-tight">
                    "{item.gemini_reason || 'Owner owes delinquent taxes; property built 1965, high equity opportunity.'}"
                  </p>

                  {/* Owner Contact */}
                  {item.owner_name && (
                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                      <span className="truncate max-w-[140px] font-medium text-slate-300">👤 {item.owner_name}</span>
                      {item.owner_phone && (
                        <a
                          href={`tel:${item.owner_phone}`}
                          className="text-emerald-400 hover:underline flex items-center gap-1 font-bold"
                        >
                          <Phone className="w-3 h-3" />
                          <span>Call</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* 1-Click Action Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-800">
                    <a
                      href={`https://hcad.org/property-search/`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition"
                    >
                      <ExternalLink className="w-3 h-3 text-blue-400" />
                      <span>HCAD Data</span>
                    </a>

                    <a
                      href={`${apiBaseUrl}/reports/${item.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1 transition"
                    >
                      <Download className="w-3 h-3 text-purple-400" />
                      <span>CMA PDF</span>
                    </a>
                  </div>

                  {/* Main Action Button */}
                  {stage.key === 'APPOINTMENT' ? (
                    <button
                      onClick={() => onSelectAppointment(item)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 shadow transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Sell Appointment ($350)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => onUpdateStatus(item.id, getNextStageKey(item.status))}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs py-2 rounded-xl flex items-center justify-center gap-1 shadow transition"
                    >
                      <span>Mark Qualified → Move Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}

              {stageProperties.length === 0 && (
                <div className="text-center py-12 text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl p-4">
                  No properties in this stage
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
