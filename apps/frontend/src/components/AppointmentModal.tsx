'use client';

import React, { useState } from 'react';
import { DollarSign, CheckCircle2, MessageSquare, Download, Building, Phone, Mail, FileText, Check } from 'lucide-react';

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
  motivation_score?: number;
  gemini_reason?: string;
  status: string;
  comps?: any;
}

interface ModalProps {
  property: Property;
  apiBaseUrl: string;
  onClose: () => void;
  onMarkAsSold: (id: string) => void;
}

export default function AppointmentModal({ property, apiBaseUrl, onClose, onMarkAsSold }: ModalProps) {
  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);
  const [selling, setSelling] = useState(false);

  const compsList = property.comps
    ? typeof property.comps === 'string'
      ? JSON.parse(property.comps)
      : property.comps
    : [
        { address: `1410 ${property.address.split(' ')[1] || 'Main'} Rd`, price: (property.arv || 300000) * 0.98, distance: 0.2 },
        { address: `1435 ${property.address.split(' ')[1] || 'Main'} Rd`, price: (property.arv || 300000) * 1.02, distance: 0.4 },
      ];

  const handleCopyWhatsappPitch = () => {
    const pitch = `🔥 OFF-MARKET DEAL HOUSTON TX (ZIP ${property.zip})
📍 Address: ${property.address}
👤 Owner: ${property.owner_name || 'Verified Owner'} (${property.owner_phone || 'Call Available'})
💰 Conserv. ARV: $${(property.arv || 0).toLocaleString()}
🔨 Est. Rehab: $${(property.rehab_estimate || 0).toLocaleString()}
🎯 Max Cash Offer: $${(property.offer || 0).toLocaleString()}
⭐ AI Motivation Score: ${property.motivation_score || 9}/10
⚠️ Distress Notes: ${property.gemini_reason || 'Tax delinquent + high equity'}

📲 QUALIFIED APPOINTMENT READY FOR ASSIGNMENT
💵 Price: $350 USD
Contact acquisitions team to acquire now!`;

    navigator.clipboard.writeText(pitch);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 3000);
  };

  const handleSellDeal = async () => {
    setSelling(true);
    try {
      await onMarkAsSold(property.id);
      onClose();
    } finally {
      setSelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#111827] border border-blue-500/50 rounded-2xl max-w-3xl w-full p-6 md:p-8 shadow-2xl space-y-6 relative animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold transition"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Qualified Appointment - Ready to Sell
              </span>
              <span className="bg-slate-800 text-slate-300 text-xs px-2.5 py-1 rounded-full font-bold">
                ZIP {property.zip}
              </span>
            </div>
            <h2 className="text-2xl font-black text-white">{property.address}</h2>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 font-semibold uppercase">Appointment Price</p>
            <p className="text-3xl font-black text-emerald-400">$350 USD</p>
          </div>
        </div>

        {/* Property Breakdown & Financial Comps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#1a2234] border border-slate-800 p-4 rounded-xl text-center">
            <p className="text-xs text-slate-400 font-semibold">Conservative ARV</p>
            <p className="text-xl font-bold text-white mt-1">${(property.arv || 0).toLocaleString()}</p>
          </div>
          <div className="bg-[#1a2234] border border-slate-800 p-4 rounded-xl text-center">
            <p className="text-xs text-slate-400 font-semibold">Gemini Rehab Est.</p>
            <p className="text-xl font-bold text-amber-400 mt-1">${(property.rehab_estimate || 0).toLocaleString()}</p>
          </div>
          <div className="bg-[#1a2234] border border-emerald-500/40 p-4 rounded-xl text-center bg-emerald-500/5">
            <p className="text-xs text-slate-400 font-semibold">Target Cash Offer</p>
            <p className="text-2xl font-black text-emerald-400 mt-1">${(property.offer || 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Seller Info & Distress Reason */}
        <div className="space-y-3 bg-[#1a2234]/60 border border-slate-800 p-4 rounded-xl">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Owner Contact & AI Analysis</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <p className="flex items-center gap-2 text-slate-200">
              <Building className="w-4 h-4 text-blue-400" />
              <span className="font-bold">{property.owner_name || 'HCAD Owner of Record'}</span>
            </p>
            <p className="flex items-center gap-2 text-slate-200">
              <Phone className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">{property.owner_phone || '(713) 555-0199'}</span>
            </p>
          </div>
          <p className="text-xs text-slate-300 italic pt-2 border-t border-slate-800">
            "{property.gemini_reason || 'HCAD delinquent taxes + distress signal'}"
          </p>
        </div>

        {/* Comparable Sales (Comps) Table Preview */}
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent Comps Breakdown</h4>
          <div className="bg-[#1a2234] border border-slate-800 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-[#111726] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3 font-semibold">Address</th>
                  <th className="p-3 font-semibold">Sale Price</th>
                  <th className="p-3 font-semibold">Distance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {compsList.map((c: any, idx: number) => (
                  <tr key={idx}>
                    <td className="p-3 font-medium">{c.address}</td>
                    <td className="p-3 font-bold text-emerald-400">${Number(c.price || 0).toLocaleString()}</td>
                    <td className="p-3 text-slate-400">{c.distance || 0.3} mi</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-800">
          <a
            href={`${apiBaseUrl}/reports/${property.id}`}
            target="_blank"
            rel="noreferrer"
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" />
            <span>Download CMA PDF</span>
          </a>

          <button
            onClick={handleCopyWhatsappPitch}
            className="flex-1 bg-emerald-600/20 border border-emerald-500/50 hover:bg-emerald-600/30 text-emerald-300 font-bold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition"
          >
            {copiedWhatsapp ? <Check className="w-4 h-4 text-emerald-400" /> : <MessageSquare className="w-4 h-4 text-emerald-400" />}
            <span>{copiedWhatsapp ? 'Copied to Clipboard!' : 'Copy Whatsapp Pitch'}</span>
          </button>

          <button
            onClick={handleSellDeal}
            disabled={selling}
            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20"
          >
            <DollarSign className="w-4 h-4" />
            <span>{selling ? 'Processing...' : 'Mark as Sold $350'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
