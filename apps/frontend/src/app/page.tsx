'use client';

import React, { useEffect, useState } from 'react';
import StatsHeader from '@/components/StatsHeader';
import SidebarFilters, { FilterState } from '@/components/SidebarFilters';
import KanbanBoard, { Property } from '@/components/KanbanBoard';
import MapView from '@/components/MapView';
import AppointmentModal from '@/components/AppointmentModal';
import { LayoutGrid, Map, RefreshCw, Flame, Building2, ShieldAlert } from 'lucide-react';

export default function Home() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [stats, setStats] = useState({
    total_leads_free_today: 142,
    high_motivation: 23,
    cost_saved_free_filter: '$1,200.00',
    qualified_appointments: 4,
    total_revenue_generated: '$1,400.00',
  });

  const [viewMode, setViewMode] = useState<'kanban' | 'map'>('kanban');
  const [selectedAppointment, setSelectedAppointment] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiBaseUrl, setApiBaseUrl] = useState('http://localhost:8000');

  const [filters, setFilters] = useState<FilterState>({
    zips: [],
    minScore: 1,
    maxOffer: 400000,
    taxYears: 0,
    rehabLevel: 'all',
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      setApiBaseUrl('/api');
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const statsRes = await fetch(`${apiBaseUrl}/stats`);
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // Fetch properties
      const propsRes = await fetch(`${apiBaseUrl}/properties`);
      if (propsRes.ok) {
        const json = await propsRes.json();
        if (json.data && json.data.length > 0) {
          setProperties(json.data);
        } else {
          setProperties(getMockProperties());
        }
      } else {
        setProperties(getMockProperties());
      }
    } catch (e) {
      console.warn('Backend API connection offline, displaying demo properties');
      setProperties(getMockProperties());
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    setProperties(prev => prev.map(p => (p.id === id ? { ...p, status: newStatus } : p)));

    try {
      await fetch(`${apiBaseUrl}/enriched/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      // Refresh stats
      const statsRes = await fetch(`${apiBaseUrl}/stats`);
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) {
      console.error('Failed to update status on backend:', e);
    }
  };

  const handleMarkAsSold = async (id: string) => {
    await updateStatus(id, 'SOLD');
    alert('🎉 Appointment marked as SOLD ($350 revenue generated)!');
  };

  const getMockProperties = (): Property[] => [
    {
      id: 'hcad-77083-1',
      address: '14202 Whittington Dr, Houston, TX 77083',
      zip: '77083',
      owner_name: 'ESTATE OF JAMES R HUDSON',
      owner_email: 'hudson.estate@example.com',
      owner_phone: '(713) 555-0182',
      arv: 340000,
      rehab_estimate: 42000,
      rehab_level: 'high',
      offer: 181000,
      motivation_score: 9,
      gemini_reason: 'Owner owes $8,900 tax delinquent since 2021. Built 1965, likely needs roof, electrical, and foundation.',
      tax_delinquent_years: 3,
      status: 'APPOINTMENT',
    },
    {
      id: 'hcad-77082-2',
      address: '8810 Dairy Ashford Rd, Houston, TX 77082',
      zip: '77082',
      owner_name: 'PATRICIA M GARCIA TRUSTEE',
      owner_email: 'pgarcia@example.com',
      owner_phone: '(713) 555-0144',
      arv: 295000,
      rehab_estimate: 30000,
      rehab_level: 'medium',
      offer: 161500,
      motivation_score: 8,
      gemini_reason: 'Owner owes taxes since 2022. Built 1978, fair condition code. High off-market equity potential.',
      tax_delinquent_years: 2,
      status: 'REPLIED',
    },
    {
      id: 'hcad-77002-3',
      address: '2201 Main St #402, Houston, TX 77002',
      zip: '77002',
      owner_name: 'MARCUS STERLING',
      owner_email: 'msterling@example.com',
      owner_phone: '(713) 555-0199',
      arv: 490000,
      rehab_estimate: 25000,
      rehab_level: 'low',
      offer: 303000,
      motivation_score: 7,
      gemini_reason: 'Assessed value exceeds market valuation by 25%. Owner out of state, fast closing target.',
      tax_delinquent_years: 1,
      status: 'CONTACTED',
    },
    {
      id: 'hcad-77407-4',
      address: '5412 Highway 6 S, Houston, TX 77407',
      zip: '77407',
      owner_name: 'CARLOS A MENDEZ',
      owner_email: 'cmendez@example.com',
      owner_phone: '(713) 555-0167',
      arv: 310000,
      rehab_estimate: 38000,
      rehab_level: 'medium',
      offer: 164000,
      motivation_score: 9,
      gemini_reason: 'Owner 3 years tax delinquent, vacant property signal from HCAD records.',
      tax_delinquent_years: 3,
      status: 'AI_FILTERED',
    },
    {
      id: 'hcad-77007-5',
      address: '1105 Washington Ave, Houston, TX 77007',
      zip: '77007',
      owner_name: 'BEVERLY S SIMPSON',
      owner_email: 'bsimpson@example.com',
      owner_phone: '(713) 555-0112',
      arv: 520000,
      rehab_estimate: 60000,
      rehab_level: 'high',
      offer: 289000,
      motivation_score: 10,
      gemini_reason: 'Structure condition marked Uninhabitable. Delinquent taxes since 2020. Top priority lead.',
      tax_delinquent_years: 4,
      status: 'NEW',
    },
  ];

  return (
    <main className="min-h-screen bg-[#0b0f19] p-4 md:p-6 text-slate-100 selection:bg-blue-500 selection:text-white">
      {/* Top Header Navigation */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400">
                  Houston Off-Market Deal Machine
                </span>
                <span className="text-xs font-black bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2.5 py-0.5 rounded-full">
                  v0.1 Free-First
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                HCAD Public Data Ingestion &amp; Gemini AI Qualifier • Zips: 77083, 77082, 77407, 77002, 77007
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls & View Switcher */}
        <div className="flex items-center gap-3">
          <div className="bg-[#111827] border border-slate-800 p-1 rounded-xl flex items-center gap-1 shadow-inner">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'kanban'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban CRM</span>
            </button>

            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'map'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Map className="w-3.5 h-3.5" />
              <span>Spatial Map</span>
            </button>
          </div>

          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
            title="Refresh Leads & Stats"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {/* Top Banner Statistics */}
      <StatsHeader stats={stats} />

      {/* Main Workspace Layout (Sidebar Filters + Kanban/Map) */}
      <div className="flex flex-col lg:flex-row gap-6">
        <SidebarFilters
          filters={filters}
          onChange={setFilters}
          onReset={() => setFilters({ zips: [], minScore: 1, maxOffer: 400000, taxYears: 0, rehabLevel: 'all' })}
        />

        <div className="flex-1 min-w-0">
          {viewMode === 'kanban' ? (
            <KanbanBoard
              properties={properties}
              filters={filters}
              apiBaseUrl={apiBaseUrl}
              onUpdateStatus={updateStatus}
              onSelectAppointment={setSelectedAppointment}
            />
          ) : (
            <MapView
              properties={properties}
              onSelectProperty={prop => setSelectedAppointment(prop)}
            />
          )}
        </div>
      </div>

      {/* Appointment Sell Modal View */}
      {selectedAppointment && (
        <AppointmentModal
          property={selectedAppointment}
          apiBaseUrl={apiBaseUrl}
          onClose={() => setSelectedAppointment(null)}
          onMarkAsSold={handleMarkAsSold}
        />
      )}
    </main>
  );
}
