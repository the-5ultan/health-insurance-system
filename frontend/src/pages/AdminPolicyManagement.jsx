import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Plus, Search, Loader2, AlertCircle, CheckCircle2, Database, Trash2 } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';

export default function AdminPolicyManagement() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    policyNumber: '',
    holderName: '',
    maxLimit: '',
    eligibleTreatments: '',
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const fetchPolicies = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/claims/policies', { withCredentials: true });
      setPolicies(res.data);
    } catch (err) {
      setError('Failed to fetch policy configurations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        ...formData,
        maxLimit: Number(formData.maxLimit),
        eligibleTreatments: formData.eligibleTreatments.split(',').map(t => t.trim()).filter(t => t !== '')
      };

      const res = await axios.post('http://localhost:5000/api/claims/policies', payload, { withCredentials: true });
      setSuccess(`Policy ${res.data.policy.policyNumber} provisioned successfully.`);
      setFormData({
        policyNumber: '',
        holderName: '',
        maxLimit: '',
        eligibleTreatments: '',
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      setShowForm(false);
      fetchPolicies();
    } catch (err) {
      setError(err.response?.data?.message || 'Policy provisioning failure.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500 opacity-20" />
    </div>
  );

  return (
    <DashboardLayout title="Policy Architecture">
      
      {/* Action Header */}
      <div className="mb-12 flex justify-between items-center bg-white/[0.02] border border-white/5 p-6 rounded-[2rem]">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-white/80">Inventory Management</h3>
          <p className="text-xs text-white/30 mt-1 font-medium">Configure network-wide policy parameters and coverage limits.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-white text-black px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95 shadow-lg shadow-white/5 flex items-center gap-3 cursor-pointer"
        >
          {showForm ? <Search className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'View Active' : 'New Configuration'}
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-8 p-5 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center gap-4 text-xs font-bold uppercase tracking-widest shadow-xl"
          >
            <AlertCircle className="w-5 h-5 shrink-0" />
            {error}
          </motion.div>
        )}
        {success && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mb-8 p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-4 text-xs font-bold uppercase tracking-widest shadow-xl"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {showForm ? (
          <motion.div 
            key="form"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="mb-12"
          >
            <div className="liquid-glass border border-white/10 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden">
              <h2 className="text-xl font-black mb-10 flex items-center gap-4 text-white">
                <ShieldCheck className="w-6 h-6 text-blue-500" />
                Provision New Policy
              </h2>
              
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Policy Identifier</label>
                  <input 
                    name="policyNumber" required value={formData.policyNumber} onChange={handleInputChange}
                    placeholder="e.g., POL-882991"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm font-medium focus:border-white/20 outline-none transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Holder Identity</label>
                  <input 
                    name="holderName" required value={formData.holderName} onChange={handleInputChange}
                    placeholder="Patient or Corporate Name"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm font-medium focus:border-white/20 outline-none transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Ceiling Limit (USD)</label>
                  <input 
                    name="maxLimit" type="number" required value={formData.maxLimit} onChange={handleInputChange}
                    placeholder="500000"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm font-black focus:border-white/20 outline-none transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Expiry Date</label>
                  <input 
                    name="expiryDate" type="date" required value={formData.expiryDate} onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm font-medium focus:border-white/20 outline-none transition-all shadow-inner"
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Eligible Treatment Protocols (Comma Separated)</label>
                  <textarea 
                    name="eligibleTreatments" required value={formData.eligibleTreatments} onChange={handleInputChange}
                    placeholder="Dental, Surgery, Neurology, Cardiology..."
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm font-medium focus:border-white/20 outline-none transition-all shadow-inner min-h-[100px]"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end gap-6 mt-6 border-t border-white/5 pt-10">
                  <button 
                    type="button" onClick={() => setShowForm(false)}
                    className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={isSubmitting}
                    className="bg-emerald-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-3 disabled:opacity-50 shadow-xl shadow-emerald-500/20 cursor-pointer"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Commit Configuration
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="liquid-glass border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl"
          >
            <div className="px-10 py-8 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
              <h2 className="text-lg font-black text-white flex items-center gap-4">
                <Database className="w-5 h-5 text-white/30" />
                Active Inventory
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.005] text-white/30 text-[10px] uppercase tracking-[0.2em] border-b border-white/5 font-black">
                    <th className="p-8 pl-10">Policy ID</th>
                    <th className="p-8">Holder</th>
                    <th className="p-8">Limit</th>
                    <th className="p-8">Utilization</th>
                    <th className="p-8 text-right pr-10">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {policies.map((p) => (
                    <tr key={p._id} className="hover:bg-white/[0.01] transition-all duration-300 group">
                      <td className="p-8 pl-10 font-mono font-black text-blue-400 text-xs tracking-tighter">{p.policyNumber}</td>
                      <td className="p-8 text-sm font-black text-white/90">{p.holderName}</td>
                      <td className="p-8 font-mono text-xs font-black text-white/60">${p.coverageDetails.maxLimit.toLocaleString()}</td>
                      <td className="p-8">
                        <div className="flex flex-col gap-2">
                          <div className="w-32 h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div 
                              className="h-full bg-blue-500" 
                              style={{ width: `${Math.round((p.coverageDetails.utilizedAmount / p.coverageDetails.maxLimit) * 100)}%` }} 
                            />
                          </div>
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                            ${p.coverageDetails.utilizedAmount.toLocaleString()} Used
                          </span>
                        </div>
                      </td>
                      <td className="p-8 text-right pr-10">
                        <button className="p-2.5 rounded-xl bg-white/5 border border-white/5 text-white/20 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {policies.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-20 text-center text-white/10 italic text-sm font-bold uppercase tracking-widest">
                        Inventory empty. Provision new configuration to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </DashboardLayout>
  );
}
