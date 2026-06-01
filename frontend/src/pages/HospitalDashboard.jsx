import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Plus, ClipboardList, Send, AlertCircle, CheckCircle2, History, Loader2, FileText, Search } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';

export default function HospitalDashboard() {
  const { user } = useContext(AuthContext);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  const [formData, setFormData] = useState({
    patientName: '',
    policyNumber: '',
    treatmentType: '',
    diagnosis: '',
    treatmentCost: '',
    dateOfTreatment: new Date().toISOString().split('T')[0],
    supportingDocuments: []
  });

  const fetchPolicies = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/claims/policies', { withCredentials: true });
      setPolicies(res.data);
    } catch (err) {
      console.error('Failed to fetch policy nodes:', err);
    }
  };

  const fetchHospitalClaims = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/claims/queue', { withCredentials: true });
      setClaims(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('Unauthorized: You do not have permission to view these records.');
      } else {
        setError('Failed to synchronize with healthcare node. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitalClaims();
    fetchPolicies();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (name === 'policyNumber') {
      const policy = policies.find(p => p.policyNumber === value);
      setSelectedPolicy(policy || null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'supportingDocuments') {
          formData.supportingDocuments.forEach(file => {
            data.append('documents', file);
          });
        } else {
          data.append(key, formData[key]);
        }
      });

      const res = await axios.post('http://localhost:5000/api/claims/submit', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      setSuccess(`Claim ${res.data.claim.claimNumber} submitted successfully. Risk Level: ${res.data.claim.fraudRiskLevel}`);
      setFormData({
        patientName: '',
        policyNumber: '',
        treatmentType: '',
        diagnosis: '',
        treatmentCost: '',
        dateOfTreatment: new Date().toISOString().split('T')[0],
        supportingDocuments: []
      });
      setShowForm(false);
      fetchHospitalClaims();
    } catch (err) {
      console.error('[HospitalDashboard] Submit error:', err);
      if (err.response?.status === 401) {
        setError('Your session has expired. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to submit claims. Please contact support.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Failed to submit claim. Please try again.');
      }
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
    <DashboardLayout title="Healthcare Node Ingestion">
      
      {/* Action Header */}
      <div className="mb-12 flex justify-between items-center bg-white/[0.02] border border-white/5 p-6 rounded-[2rem]">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-white/80">Intake Terminal</h3>
          <p className="text-xs text-white/30 mt-1 font-medium">Create new encrypted claim entries for system validation.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-white text-black px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95 shadow-lg shadow-white/5 flex items-center gap-3 cursor-pointer"
        >
          {showForm ? <Search className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'View Records' : 'New Ingestion'}
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
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
            exit={{ opacity: 0, scale: 0.95 }}
            className="mb-8 p-5 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-4 text-xs font-bold uppercase tracking-widest shadow-xl"
          >
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            {success}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Submission Form View */}
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
              <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <FileText className="w-64 h-64 text-white" />
              </div>
              
              <h2 className="text-xl font-black mb-10 flex items-center gap-4">
                <ClipboardList className="w-6 h-6 text-blue-500" />
                System Claim Matrix
              </h2>

              {policies.length === 0 && !loading && (
                <div className="mb-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[10px] font-black uppercase tracking-widest flex items-center gap-3">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  No policy configurations are available. Please create a policy configuration first.
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Patient Authority Name</label>
                  <input 
                    name="patientName" required value={formData.patientName} onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm font-medium focus:border-white/20 outline-none transition-all placeholder-white/10 shadow-inner"
                    placeholder="Full Legal Identity"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Policy Node Identifier</label>
                  <select 
                    name="policyNumber" required value={formData.policyNumber} onChange={handleInputChange}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm font-medium focus:border-white/20 outline-none transition-all shadow-inner appearance-none cursor-pointer"
                  >
                    <option value="" className="bg-black text-white/40">Select Policy Node</option>
                    {policies.length > 0 ? (
                      policies.map(p => (
                        <option key={p.policyNumber} value={p.policyNumber} className="bg-black text-white">
                          {p.policyNumber} - {p.holderName}
                        </option>
                      ))
                    ) : (
                      <option disabled className="bg-black text-rose-400">No active policy nodes found</option>
                    )}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Clinical Classification</label>
                  <select 
                    name="treatmentType" required value={formData.treatmentType} onChange={handleInputChange}
                    disabled={!selectedPolicy}
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm font-medium focus:border-white/20 outline-none transition-all shadow-inner appearance-none cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <option value="" className="bg-black text-white/40">
                      {!selectedPolicy ? "Select Policy First" : "Select Treatment"}
                    </option>
                    {selectedPolicy?.coverageDetails?.eligibleTreatments?.map(t => (
                      <option key={t} value={t} className="bg-black text-white">{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3 lg:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Diagnostic Summary</label>
                  <input 
                    name="diagnosis" required value={formData.diagnosis} onChange={handleInputChange}
                    placeholder="Primary diagnostic outcome or observation."
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm font-medium focus:border-white/20 outline-none transition-all placeholder-white/10 shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Magnitude (USD)</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 font-black">$</span>
                    <input 
                      name="treatmentCost" type="number" required value={formData.treatmentCost} onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-10 pr-6 text-white text-sm font-black focus:border-white/20 outline-none transition-all shadow-inner"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Supporting Documentation</label>
                  <div className="relative">
                    <input 
                      type="file" multiple 
                      onChange={(e) => setFormData(prev => ({ ...prev, supportingDocuments: Array.from(e.target.files) }))}
                      className="hidden" id="file-upload"
                    />
                    <label 
                      htmlFor="file-upload"
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white/40 text-[10px] font-black uppercase tracking-widest hover:border-white/20 transition-all flex items-center justify-between cursor-pointer"
                    >
                      {formData.supportingDocuments.length > 0 ? `${formData.supportingDocuments.length} Files Selected` : 'Select PDF / Images'}
                      <FileText className="w-4 h-4 text-white/20" />
                    </label>
                  </div>
                </div>
                <div className="lg:col-span-3 flex justify-end gap-6 mt-10 border-t border-white/5 pt-10">
                  <button 
                    type="button" onClick={() => setShowForm(false)}
                    className="px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-all"
                  >
                    Cancel Operations
                  </button>
                  <button 
                    disabled={isSubmitting || !formData.policyNumber || !formData.treatmentType}
                    className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-3 disabled:opacity-50 shadow-xl shadow-blue-500/20 active:scale-[0.98] cursor-pointer"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Broadcast Entry
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : (
          /* Table View */
          <motion.div 
            key="table"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="liquid-glass border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl"
          >
            <div className="px-10 py-8 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
              <h2 className="text-lg font-black text-white flex items-center gap-4">
                <History className="w-5 h-5 text-white/30" />
                Facility Queue
              </h2>
              <div className="text-[9px] uppercase font-black tracking-[0.2em] text-blue-400 bg-blue-500/5 px-4 py-1.5 rounded-full border border-blue-500/10">
                Authorized Node {user?.username}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/[0.005] text-white/30 text-[10px] uppercase tracking-[0.2em] border-b border-white/5 font-black">
                    <th className="p-8 pl-10">Op Identifier</th>
                    <th className="p-8">Target Identity</th>
                    <th className="p-8">Category</th>
                    <th className="p-8">Billed Value</th>
                    <th className="p-8 text-right pr-10">Workflow state</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {claims.map((claim) => (
                    <tr key={claim._id} className="hover:bg-white/[0.01] transition-all duration-300 group">
                      <td className="p-8 pl-10 font-mono font-black text-blue-400 text-xs tracking-tighter">{claim.claimNumber}</td>
                      <td className="p-8">
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-white group-hover:translate-x-1 transition-transform">{claim.patientName}</span>
                          <span className="text-[10px] text-white/20 uppercase font-bold mt-1 tracking-widest">{new Date(claim.dateOfTreatment).toLocaleDateString()}</span>
                        </div>
                      </td>
                      <td className="p-8 text-white/50 text-xs font-bold uppercase tracking-widest">{claim.treatmentType}</td>
                      <td className="p-8 font-mono text-xs font-black text-white/80">${claim.treatmentCost.toLocaleString()}</td>
                      <td className="p-8 text-right pr-10">
                        <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border ${
                          claim.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          claim.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {claim.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {claims.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-20 text-center text-white/10 italic text-sm font-bold uppercase tracking-widest">
                        Queue empty. Ready for new ingestion.
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
