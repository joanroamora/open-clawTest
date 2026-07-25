'use client';

import React from 'react';
import { Filter, RotateCcw, Flame, MapPin, DollarSign, AlertTriangle, Hammer } from 'lucide-react';

export interface FilterState {
  zips: string[];
  minScore: number;
  maxOffer: number;
  taxYears: number;
  rehabLevel: string;
}

interface SidebarProps {
  filters: FilterState;
  onChange: (newFilters: FilterState) => void;
  onReset: () => void;
}

const AVAILABLE_ZIPS = [
  { zip: '77083', label: '77083 (Alief / Mission Bend)' },
  { zip: '77082', label: '77082 (Westchase / West)' },
  { zip: '77407', label: '77407 (Richmond / Katy South)' },
  { zip: '77002', label: '77002 (Downtown Houston)' },
  { zip: '77007', label: '77007 (Heights / Washington)' },
];

export default function SidebarFilters({ filters, onChange, onReset }: SidebarProps) {
  const toggleZip = (zip: string) => {
    const exists = filters.zips.includes(zip);
    const updated = exists
      ? filters.zips.filter(z => z !== zip)
      : [...filters.zips, zip];
    onChange({ ...filters, zips: updated });
  };

  return (
    <aside className="w-full lg:w-72 bg-[#111827]/90 border border-slate-800/80 rounded-2xl p-5 shadow-2xl backdrop-blur-md space-y-6 shrink-0">
      <div className="flex justify-between items-center pb-4 border-b border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Filter className="w-4 h-4 text-blue-400" />
          <span>Flipping Filters</span>
        </h2>
        <button
          onClick={onReset}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
          title="Reset Filters"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Zip Code Selection */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <MapPin className="w-3.5 h-3.5 text-blue-400" />
          <span>Target Zip Codes</span>
        </label>
        <div className="space-y-1.5">
          {AVAILABLE_ZIPS.map(z => {
            const isSelected = filters.zips.length === 0 || filters.zips.includes(z.zip);
            return (
              <button
                key={z.zip}
                onClick={() => toggleZip(z.zip)}
                className={`w-full text-left text-xs px-3 py-2 rounded-lg border transition font-medium flex justify-between items-center ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 font-semibold'
                    : 'bg-[#1a2234]/50 border-slate-800/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span>{z.label}</span>
                <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-blue-400' : 'bg-slate-700'}`}></span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Min Motivation Score */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center text-xs">
          <label className="font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            <span>Min Motivation Score</span>
          </label>
          <span className="font-extrabold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
            {filters.minScore}+ / 10
          </span>
        </div>
        <input
          type="range"
          min="1"
          max="10"
          value={filters.minScore}
          onChange={e => onChange({ ...filters, minScore: parseInt(e.target.value) })}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
          <span>1 (Low)</span>
          <span>7 (High Threshold)</span>
          <span>10 (Hot Lead)</span>
        </div>
      </div>

      {/* Max Offer */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center text-xs">
          <label className="font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
            <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
            <span>Max Cash Offer</span>
          </label>
          <span className="font-extrabold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded border border-emerald-400/20">
            ${(filters.maxOffer / 1000).toFixed(0)}k
          </span>
        </div>
        <input
          type="range"
          min="50000"
          max="500000"
          step="10000"
          value={filters.maxOffer}
          onChange={e => onChange({ ...filters, maxOffer: parseInt(e.target.value) })}
          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400"
        />
      </div>

      {/* Tax Years Delinquent */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span>Tax Delinquency</span>
        </label>
        <select
          value={filters.taxYears}
          onChange={e => onChange({ ...filters, taxYears: parseInt(e.target.value) })}
          className="w-full bg-[#1a2234] border border-slate-800 text-xs text-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:outline-none"
        >
          <option value={0}>All Tax Statuses</option>
          <option value={1}>1+ Years Tax Delinquent</option>
          <option value={2}>2+ Years Tax Delinquent (High Distress)</option>
          <option value={3}>3+ Years Tax Delinquent (Imminent Foreclosure)</option>
        </select>
      </div>

      {/* Rehab Level */}
      <div className="space-y-2.5">
        <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
          <Hammer className="w-3.5 h-3.5 text-purple-400" />
          <span>Rehab Level</span>
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {['all', 'low', 'medium', 'high'].map(level => {
            const isSelected = filters.rehabLevel === level;
            return (
              <button
                key={level}
                onClick={() => onChange({ ...filters, rehabLevel: level })}
                className={`text-[11px] py-1.5 rounded-lg border font-semibold capitalize transition ${
                  isSelected
                    ? 'bg-purple-600/30 border-purple-500 text-purple-300'
                    : 'bg-[#1a2234]/50 border-slate-800/60 text-slate-400 hover:border-slate-700'
                }`}
              >
                {level}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
