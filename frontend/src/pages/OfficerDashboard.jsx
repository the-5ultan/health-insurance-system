import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert, CheckCircle, XCircle, FileText, AlertTriangle, Loader2, Search, Filter } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';

export default function OfficerDashboard() {
  const { user } = useContext(AuthContext);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const fetchClaims = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/claims/queue');
      setClaims(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClaims();
  }, []);

  const processClaim = async (id, newStatus) => {
    setProcessingId(id);
    try {
      await axios.patch(`http://localhost:5000/api/claims/${id}/status`, { 
        status: newStatus,
        officerNotes: `Protocol ${newStatus} applied by node ${user?.username}`
      });
      setClaims(prev => prev.map(c => c._id === id ? { ...c, status: newStatus } : c));
    } catch (err) {
      alert("Encryption mismatch: Failed to commit status update.");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500 opacity-20" />
    </div>
  );

  return (
    <DashboardLayout title="Security & Adjudication Queue">
      
      {/* Alert Banner for High Risk */}
      {claims.some(c => c.fraudRiskLevel === 'High' && c.status !== 'Approved' && c.status !== 'Rejected') && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-between"
        >
          <div className="flex items-center gap-4 text-rose-400">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
            <div>
              <p className="text-xs font-black uppercase tracking-widest">Priority Intercept Required</p>
              <p className="text-sm font-medium opacity-80">High-risk anomalies detected in the current ingestion cycle.</p>
            </div>
          </div>
          <button className="text-[10px] font-black uppercase tracking-widest bg-rose-500 text-white px-4 py-2 rounded-xl hover:bg-rose-600 transition-all cursor-pointer">
            Isolate Anomalies
          </button>
        </motion.div>
      )}

      {/* Main Queue Table */}
      <div className="liquid-glass border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="px-10 py-8 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
          <h2 className="text-lg font-black text-white flex items-center gap-4">
            <ShieldAlert className="w-5 h-5 text-white/30" />
            Inbound Traffic
          </h2>
          <div className="flex items-center gap-4">
            <button className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white transition-all cursor-pointer">
              <Filter className="w-4 h-4" />
            </button>
            <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
              <Search className="w-4 h-4 text-white/30" />
              <input placeholder="Filter identities..." className="bg-transparent border-none outline-none text-[10px] font-bold text-white/60 w-32 uppercase tracking-widest" />
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.005] text-white/30 text-[10px] uppercase tracking-[0.2em] border-b border-white/5 font-black">
                <th className="p-8 pl-10">Identifier</th>
                <th className="p-8">Entity</th>
                <th className="p-8">Magnitude</th>
                <th className="p-8 text-center">Heuristic Signature</th>
                <th className="p-8">State</th>
                <th className="p-8 text-right pr-10">Adjudication</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {claims.map((claim) => (
                <tr key={claim._id} className="hover:bg-white/[0.01] transition-all duration-300 group">
                  <td className="p-8 pl-10 font-mono font-black text-blue-400 text-xs tracking-tighter">{claim.claimNumber}</td>
                  <td className="p-8">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white group-hover:translate-x-1 transition-transform">{claim.patientName}</span>
                      <span className="text-[10px] text-white/20 uppercase font-bold mt-1 tracking-widest">{claim.treatmentType}</span>
                    </div>
                  </td>
                  <td className="p-8 font-mono text-xs font-black text-white/60">${claim.treatmentCost.toLocaleString()}</td>
                  <td className="p-8 text-center">
                    <span className={`inline-block px-3 py-1.5 rounded-full text-[9px] font-black tracking-widest uppercase border ${
                      claim.fraudRiskLevel === 'High' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      claim.fraudRiskLevel === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {claim.fraudScore}% {claim.fraudRiskLevel}
                    </span>
                  </td>
                  <td className="p-8">
                    <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg bg-black/40 text-white/40 border border-white/5">
                      {claim.status}
                    </span>
                  </td>
                  <td className="p-8 text-right pr-10">
                    {claim.status === 'Approved' || claim.status === 'Rejected' ? (
                      <div className="flex items-center justify-end gap-2 text-white/20 font-black text-[9px] uppercase tracking-tighter">
                        <CheckCircle className="w-3 h-3" />
                        Finalized
                      </div>
                    ) : (
                      <div className="flex justify-end gap-3">
                        <button 
                          disabled={processingId === claim._id}
                          onClick={() => processClaim(claim._id, 'Approved')}
                          className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl hover:bg-emerald-500 hover:text-white transition-all active:scale-95 border border-emerald-500/20 cursor-pointer shadow-lg shadow-emerald-500/5"
                          title="Authorize Transaction"
                        >
                          {processingId === claim._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                        <button 
                          disabled={processingId === claim._id}
                          onClick={() => processClaim(claim._id, 'Rejected')}
                          className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-500/20 cursor-pointer shadow-lg shadow-rose-500/5"
                          title="Flag & Reject"
                        >
                          {processingId === claim._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {claims.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-20 text-center text-white/10 italic text-sm font-bold uppercase tracking-widest">
                    Adjudication queue clear. All systems optimal.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </DashboardLayout>
  );
}
