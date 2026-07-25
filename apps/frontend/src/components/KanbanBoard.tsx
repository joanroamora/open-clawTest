'use client';

import React, { useEffect, useState } from 'react';
import { Download, Building2, Phone, Mail, DollarSign, Wrench, ChevronRight } from 'lucide-react';

interface Property {
  id: string;
  address: string;
  zip: string;
  owner_name?: string;
  owner_email?: string;
  owner_phone?: string;
  arv?: number;
  rehab_estimate?: number;
  offer?: number;
  status: string;
  comps?: any;
}

const STAGES = [
  { key: 'NEW', label: 'New Lead', color: 'border-blue-500' },
  { key: 'CONTACTED', label: 'Contacted', color: 'border-yellow-500' },
  { key: 'QUALIFIED', label: 'Qualified Seller', color: 'border-purple-500' },
  { key: 'APPOINTMENT', label: 'Appointment Scheduled', color: 'border-emerald-500' },
  { key: 'CLOSED', label: 'Closed / Under Contract', color: 'border-indigo-500' },
];

export default function KanbanBoard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:8000');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      setApiBaseUrl('/api');
    }
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/enriched`);
      if (res.ok) {
        const json = await res.json();
        setProperties(json.data || []);
      } else {
        // Fallback demo data if backend not connected yet
        setProperties(getMockProperties());
      }
    } catch (e) {
      console.warn('Backend API connection offline, displaying demo properties');
      setProperties(getMockProperties());
    } finally {
      setLoading(false);
    }
  };

  const getMockProperties = (): Property[] => [
    {
      id: 'prop-1',
      address: '14202 Whittington Dr',
      zip: '77077',
      owner_name: 'Robert Vance',
      owner_email: 'rvance@example.com',
      owner_phone: '(713) 555-0182',
      arv: 350000,
      rehab_estimate: 45000,
      offer: 185000,
      status: 'NEW'
    },
    {
      id: 'prop-2',
      address: '8810 Dairy Ashford Rd',
      zip: '77083',
      owner_name: 'Elena Rostova',
      owner_email: 'elena@example.com',
      owner_phone: '(713) 555-0144',
      arv: 290000,
      rehab_estimate: 30000,
      offer: 158000,
      status: 'CONTACTED'
    },
    {
      id: 'prop-3',
      address: '2201 Main St #402',
      zip: '77002',
      owner_name: 'Marcus Sterling',
      owner_email: 'marcus@example.com',
      owner_phone: '(713) 555-0199',
      arv: 480000,
      rehab_estimate: 25000,
      offer: 296000,
      status: 'QUALIFIED'
    }
  ];

  const updateStatus = async (id: string, currentStatus: string) => {
    const currentIndex = STAGES.findIndex(s => s.key === currentStatus);
    const nextStage = STAGES[(currentIndex + 1) % STAGES.length].key;

    setProperties(prev => prev.map(p => p.id === id ? { ...p, status: nextStage } : p));

    try {
      await fetch(`${apiBaseUrl}/enriched/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStage }),
      });
    } catch (e) {
      console.error('Failed to update status on server:', e);
    }
  };

  const totalDeals = properties.length;
  const totalARV = properties.reduce((sum, p) => sum + (Number(p.arv) || 0), 0);
  const totalOffers = properties.reduce((sum, p) => sum + (Number(p.offer) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#141b2d] border border-slate-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 font-medium">Pipeline Deals</p>
            <p className="text-3xl font-bold text-white mt-1">{totalDeals}</p>
          </div>
          <Building2 className="w-10 h-10 text-blue-500 opacity-80" />
        </div>
        <div className="bg-[#141b2d] border border-slate-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 font-medium">Total Portfolio ARV</p>
            <p className="text-3xl font-bold text-emerald-400 mt-1">${totalARV.toLocaleString()}</p>
          </div>
          <DollarSign className="w-10 h-10 text-emerald-500 opacity-80" />
        </div>
        <div className="bg-[#141b2d] border border-slate-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-400 font-medium">Total Max Offers</p>
            <p className="text-3xl font-bold text-purple-400 mt-1">${totalOffers.toLocaleString()}</p>
          </div>
          <Wrench className="w-10 h-10 text-purple-500 opacity-80" />
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const stageProperties = properties.filter(p => p.status === stage.key);
          return (
            <div key={stage.key} className="bg-[#141b2d]/70 border border-slate-800/80 rounded-xl p-4 min-w-[260px]">
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-sm text-slate-200">{stage.label}</span>
                <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                  {stageProperties.length}
                </span>
              </div>
              <div className="space-y-3">
                {stageProperties.map(item => (
                  <div
                    key={item.id}
                    className={`bg-[#1c263c] border-l-4 ${stage.color} border-y border-r border-slate-800 rounded-lg p-4 shadow-md hover:border-slate-600 transition-all`}
                  >
                    <p className="font-bold text-white text-base truncate">{item.address}</p>
                    <p className="text-xs text-slate-400 mb-3">ZIP: {item.zip} • Houston, TX</p>

                    <div className="space-y-1 text-xs text-slate-300 bg-[#111726] p-2.5 rounded-md border border-slate-800/60 mb-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">ARV:</span>
                        <span className="font-semibold text-emerald-400">${Number(item.arv || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Rehab:</span>
                        <span className="font-semibold text-amber-400">${Number(item.rehab_estimate || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-1 border-t border-slate-800">
                        <span className="text-slate-200">Max Offer:</span>
                        <span className="text-purple-400">${Number(item.offer || 0).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 space-y-1 mb-3">
                      {item.owner_name && (
                        <p className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 text-blue-400" />
                          <span>{item.owner_name}</span>
                        </p>
                      )}
                      {item.owner_phone && (
                        <p className="flex items-center gap-1.5 truncate">
                          <Phone className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{item.owner_phone}</span>
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <a
                        href={`${apiBaseUrl}/reports/${item.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-xs font-semibold py-1.5 px-2 rounded flex items-center justify-center gap-1 text-slate-200 transition"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>CMA</span>
                      </a>
                      <button
                        onClick={() => updateStatus(item.id, item.status)}
                        className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold py-1.5 px-2 rounded flex items-center justify-center gap-1 transition"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {stageProperties.length === 0 && (
                  <div className="text-center py-8 text-xs text-slate-500 border border-dashed border-slate-800 rounded-lg">
                    No properties in this stage
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
