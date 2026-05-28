import React, { useState, useEffect, useContext } from 'react';
import { motion } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Users, ShieldAlert, Activity, FileText, Clock, TrendingUp, BarChart3, Database } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';

export default function AdminDashboard() {
  const { user } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [recentClaims, setRecentClaims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const res = await axios.get('http://localhost:5000/auth/admin/summary');
        if (res.data.success) {
          setStats(res.data.stats);
          setRecentClaims(res.data.recentClaims);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-8 h-8 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );

  const statCards = [
    { label: 'Network Nodes', value: stats?.totalUsers, icon: Users, color: 'from-blue-500 to-indigo-600', trend: '+12%' },
    { label: 'Active Sessions', value: stats?.activeSessions, icon: Activity, color: 'from-emerald-500 to-teal-600', trend: 'Live' },
    { label: 'High Risk Alerts', value: stats?.highRiskClaims, icon: ShieldAlert, color: 'from-rose-500 to-pink-600', trend: 'Critical' },
    { label: 'Pending Processing', value: stats?.pendingClaims, icon: Clock, color: 'from-amber-500 to-orange-600', trend: 'Queued' }
  ];

  return (
    <DashboardLayout title="System Administration">
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {statCards.map((card, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="liquid-glass p-6 rounded-3xl border border-white/5 relative overflow-hidden group"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-10 transition-opacity duration-700`} />
            <div className="flex justify-between items-start mb-4 relative z-10">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white shadow-inner">
                <card.icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-white/5 bg-black/40 ${
                card.trend === 'Critical' ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {card.trend}
              </span>
            </div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-1 relative z-10">{card.label}</h3>
            <p className="text-3xl font-black text-white relative z-10">{card.value || 0}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Placeholder for Analytics Chart */}
        <div className="lg:col-span-2 liquid-glass rounded-[2.5rem] p-8 border border-white/5 flex flex-col h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-black uppercase tracking-widest text-white/80 flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Ingestion Velocity
            </h3>
            <select className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-bold text-white/40 outline-none">
              <option>Last 24 Hours</option>
              <option>Last 7 Days</option>
            </select>
          </div>
          <div className="flex-1 border-b border-l border-white/5 rounded-bl-3xl relative">
            <div className="absolute inset-0 flex items-center justify-center">
              <BarChart3 className="w-12 h-12 text-white/5" />
            </div>
            {/* Visual simulation of chart bars */}
            <div className="absolute bottom-0 left-0 right-0 h-full flex items-end gap-3 px-6 pb-6">
              {[40, 70, 45, 90, 65, 80, 55, 30, 95, 70, 50, 85].map((h, i) => (
                <div key={i} className="flex-1 bg-gradient-to-t from-blue-500/40 to-blue-400/10 rounded-t-lg transition-all hover:from-blue-500 hover:to-blue-400 cursor-pointer" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>

        {/* Global Node Status */}
        <div className="liquid-glass rounded-[2.5rem] p-8 border border-white/5 flex flex-col">
          <h3 className="text-sm font-black uppercase tracking-widest text-white/80 mb-8 flex items-center gap-3">
            <Database className="w-4 h-4 text-emerald-500" />
            Cluster Health
          </h3>
          <div className="space-y-6">
            {[
              { node: 'AUTH_PRIMARY', status: 'Optimal', load: '14%' },
              { node: 'ENGINE_FRAUD_V4', status: 'Optimal', load: '38%' },
              { node: 'STORAGE_ENCRYPTED', status: 'Optimal', load: '62%' },
              { node: 'API_GATEWAY', status: 'Optimal', load: '21%' },
            ].map((node, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div>
                  <p className="text-xs font-bold text-white/80">{node.node}</p>
                  <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-0.5">{node.status}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-bold text-white/40">{node.load}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Global Activity Table */}
      <div className="liquid-glass border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="px-10 py-8 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
          <h2 className="text-lg font-black text-white flex items-center gap-4">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            Live Claim Telemetry
          </h2>
          <button className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20 hover:text-white transition-all cursor-pointer">Export Full Log</button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/[0.005] text-white/30 text-[10px] uppercase tracking-[0.2em] border-b border-white/5 font-black">
                <th className="p-8 pl-10">Identifier</th>
                <th className="p-8">Entity</th>
                <th className="p-8">Magnitude</th>
                <th className="p-8">Risk Signature</th>
                <th className="p-8 text-right pr-10">Network Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {recentClaims.map((claim) => (
                <tr key={claim._id} className="hover:bg-white/[0.01] transition-all duration-300 group">
                  <td className="p-8 pl-10 font-mono font-black text-blue-400 text-xs tracking-tighter">{claim.claimNumber}</td>
                  <td className="p-8">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-white group-hover:translate-x-1 transition-transform">{claim.patientName}</span>
                      <span className="text-[10px] text-white/20 uppercase font-bold mt-1 tracking-widest">{new Date(claim.createdAt).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="p-8 font-mono text-xs font-black text-white/60">${claim.treatmentCost.toLocaleString()}</td>
                  <td className="p-8">
                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black tracking-[0.15em] uppercase border ${
                      claim.fraudRiskLevel === 'High' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                      claim.fraudRiskLevel === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {claim.fraudRiskLevel} Risk
                    </span>
                  </td>
                  <td className="p-8 text-right pr-10">
                    <span className="text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl bg-white/5 text-white/40 border border-white/10 group-hover:text-white group-hover:border-white/20 transition-all">
                      {claim.status}
                    </span>
                  </td>
                </tr>
              ))}
              {recentClaims.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-20 text-center text-white/10 italic text-sm font-bold uppercase tracking-widest">
                    Operational cycle clear. No active telemetry.
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
