'use client';

import React from 'react';
import { DollarSign, Flame, ShieldCheck, CalendarCheck, Zap } from 'lucide-react';

interface StatsProps {
  stats: {
    total_leads_free_today: number;
    high_motivation: number;
    cost_saved_free_filter: string;
    qualified_appointments: number;
    total_revenue_generated?: string;
  };
}

export default function StatsHeader({ stats }: StatsProps) {
  return (
    <div className="bg-[#111827]/90 border border-slate-800/80 rounded-2xl p-4 md:p-5 shadow-2xl backdrop-blur-md mb-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat 1 */}
        <div className="bg-[#1f293d]/60 border border-slate-800/90 rounded-xl p-4 flex items-center gap-3.5 hover:border-blue-500/40 transition">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Free HCAD Leads Today</p>
            <p className="text-2xl font-extrabold text-white mt-0.5">{stats.total_leads_free_today}</p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-[#1f293d]/60 border border-slate-800/90 rounded-xl p-4 flex items-center gap-3.5 hover:border-amber-500/40 transition">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">High Motivation (7+)</p>
            <p className="text-2xl font-extrabold text-amber-400 mt-0.5">{stats.high_motivation}</p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-[#1f293d]/60 border border-slate-800/90 rounded-xl p-4 flex items-center gap-3.5 hover:border-emerald-500/40 transition">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Saved by Free Filter</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-0.5">{stats.cost_saved_free_filter}</p>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-[#1f293d]/60 border border-slate-800/90 rounded-xl p-4 flex items-center gap-3.5 hover:border-purple-500/40 transition">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Qualified Appointments</p>
            <p className="text-2xl font-extrabold text-purple-400 mt-0.5">{stats.qualified_appointments}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
