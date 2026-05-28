import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  ShieldCheck, 
  CreditCard, 
  Activity, 
  Clock, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Loader2, 
  Search,
  Plus,
  Send,
  ClipboardList,
  History
} from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';

export default function PolicyholderDashboard() {
  const { user } = useContext(AuthContext);
  const [claims, setClaims] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    treatmentType: '',
    diagnosis: '',
    treatmentCost: '',
    dateOfTreatment: new Date().toISOString().split('T')[0],
    supportingDocuments: []
  });

  const fetchData = async () => {
    try {
      // Fetch Policy details first
      const policyRes = await axios.get('http://localhost:5000/api/claims/my-policy');
      setPolicy(policyRes.data);

      // Fetch personal claim timeline queue
      const claimsRes = await axios.get('http://localhost:5000/api/claims/queue');
      setClaims(claimsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
        patientName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        policyNumber: policy?.policyNumber
      };

      const res = await axios.post('http://localhost:5000/api/claims/submit', payload);
      setSuccess(`Claim ${res.data.claim.claimNumber} logged. Adjudication Status: ${res.data.claim.status} (Fraud Risk Assessment: ${res.data.claim.fraudRiskLevel})`);
      setFormData({
        treatmentType: '',
        diagnosis: '',
        treatmentCost: '',
        dateOfTreatment: new Date().toISOString().split('T')[0],
        supportingDocuments: []
      });
      setShowForm(false);
      
      // Re-trigger global query to update progress bars and operational timeline
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || "Protocol rejection: verify claim parameters.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500 opacity-20" />
    </div>
  );

  const activeClaimsCount = claims.filter(c => c.status === 'Pending Validation' || c.status === 'Under Review').length;
  
  const utilizationPercentage = policy?.coverageDetails
    ? Math.min(100, Math.round((policy.coverageDetails.utilizedAmount / policy.coverageDetails.maxLimit) * 100))
    : 0;

  return (
    <DashboardLayout title="Member Control Center">
      
      {/* Policy Insight Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="liquid-glass p-8 rounded-[2.5rem] border border-white/5 flex items-center gap-6 group hover:border-white/10 transition-all">
          <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Node Status</p>
            <p className="text-xl font-black text-white/90">Active & Secured</p>
          </div>
        </div>
        
        <div className="liquid-glass p-8 rounded-[2.5rem] border border-white/5 flex items-center gap-6 group hover:border-white/10 transition-all">
          <div className="p-4 rounded-2xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform shadow-inner">
            <CreditCard className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Policy ID</p>
            <p className="text-xl font-black text-white/90">{policy?.policyNumber || 'Seeding...'}</p>
          </div>
        </div>

        <div className="liquid-glass p-8 rounded-[2.5rem] border border-white/5 flex items-center gap-6 group hover:border-white/10 transition-all">
          <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform shadow-inner">
            <Activity className="w-8 h-8" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">In-Flight Claims</p>
            <p className="text-xl font-black text-white/90">{activeClaimsCount} Operations</p>
          </div>
        </div>
      </div>

      {/* Premium Glassmorphic Pool Utilization Progress Bar */}
      {policy && (
        <div className="liquid-glass p-8 rounded-[2.5rem] border border-white/5 mb-12 relative overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Resource Pool Allocation</span>
            <span className="text-xs font-mono font-black text-blue-400">{utilizationPercentage}% Utilized</span>
          </div>
          <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/10 shadow-inner">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${utilizationPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500 shadow-lg shadow-blue-500/30"
            />
          </div>
          <div className="flex justify-between items-center mt-3 text-[9px] font-black uppercase tracking-widest text-white/20">
            <span>Pool Floor: $0</span>
            <span>Allocated Capital: ${policy.coverageDetails.utilizedAmount.toLocaleString()} USD</span>
            <span>Ceiling Limit: ${policy.coverageDetails.maxLimit.toLocaleString()} USD</span>
          </div>
        </div>
      )}

      {/* Action Header Terminal */}
      <div className="mb-12 flex justify-between items-center bg-white/[0.02] border border-white/5 p-6 rounded-[2rem]">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-white/80">Operations Control</h3>
          <p className="text-xs text-white/30 mt-1 font-medium">Broadcast new patient claims and view telemetry logs.</p>
        </div>
        <button 
          onClick={() => {
            setError('');
            setSuccess('');
            setShowForm(!showForm);
          }}
          className="bg-white text-black px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/90 transition-all active:scale-95 shadow-lg shadow-white/5 flex items-center gap-3 cursor-pointer"
        >
          {showForm ? <Search className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'View Timeline' : 'File New Claim'}
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

      {/* Claim Submission Terminal or Operation History list */}
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
                Insurance Claim Matrix
              </h2>
              
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Patient Beneficiary Name</label>
                  <input 
                    disabled 
                    value={`${user.firstName || ''} ${user.lastName || ''}`.trim()} 
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white/40 text-sm font-medium outline-none cursor-not-allowed shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Policy ID (Auto-Linked)</label>
                  <input 
                    disabled 
                    value={policy?.policyNumber || ''} 
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white/40 text-sm font-medium outline-none cursor-not-allowed shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Clinical Classification</label>
                  <select 
                    name="treatmentType" 
                    required 
                    value={formData.treatmentType} 
                    onChange={handleInputChange}
                    className="w-full bg-[#111] border border-white/5 rounded-2xl py-4 px-6 text-white text-sm font-medium focus:border-white/20 outline-none transition-all appearance-none"
                  >
                    <option value="">Select Treatment...</option>
                    {policy?.coverageDetails?.eligibleTreatments?.map(treatment => (
                      <option key={treatment} value={treatment} className="bg-[#111] text-white">
                        {treatment}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3 lg:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Diagnostic Summary</label>
                  <input 
                    name="diagnosis" required value={formData.diagnosis} onChange={handleInputChange}
                    placeholder="Diagnosis description details."
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm font-medium focus:border-white/20 outline-none transition-all placeholder-white/10 shadow-inner"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Billed Magnitude (USD)</label>
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 font-black">$</span>
                    <input 
                      name="treatmentCost" type="number" required value={formData.treatmentCost} onChange={handleInputChange}
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-10 pr-6 text-white text-sm font-black focus:border-white/20 outline-none transition-all shadow-inner"
                      placeholder="0.00"
                    />
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
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-3 disabled:opacity-50 shadow-xl shadow-blue-500/20 active:scale-[0.98] cursor-pointer"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Broadcast Claim
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        ) : (
          /* Claim History Timeline */
          <motion.div 
            key="timeline"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="liquid-glass border border-white/5 rounded-[3.5rem] overflow-hidden shadow-2xl bg-white/[0.005]"
          >
            <div className="px-12 py-10 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
              <h2 className="text-xl font-black text-white flex items-center gap-4">
                <Clock className="w-6 h-6 text-white/20" />
                Operational History
              </h2>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
                <Search className="w-3.5 h-3.5 text-white/20" />
                <input placeholder="Filter by date..." className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest text-white/40 w-32" />
              </div>
            </div>
            
            <div className="p-12 pb-20">
              {claims.length > 0 ? (
                <div className="space-y-10 relative">
                  {/* Vertical Line */}
                  <div className="absolute left-[-2px] top-4 bottom-4 w-px bg-white/5" />

                  {claims.map((claim, i) => (
                    <motion.div 
                      key={claim._id}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="relative pl-12 group"
                    >
                      <div className={`absolute left-[-6px] top-4 w-3 h-3 rounded-full border-2 border-[#050505] shadow-lg transition-transform group-hover:scale-125 z-10 ${
                        claim.status === 'Approved' ? 'bg-emerald-500 shadow-emerald-500/20' :
                        claim.status === 'Rejected' ? 'bg-rose-500 shadow-rose-500/20' : 'bg-blue-500 shadow-blue-500/20'
                      }`} />
                      
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 liquid-glass p-8 rounded-3xl border border-white/[0.03] group-hover:border-white/10 transition-all duration-500 shadow-lg hover:shadow-white/[0.02]">
                        <div className="space-y-1">
                          <p className="text-[10px] font-mono font-black text-white/20 uppercase tracking-tighter">{claim.claimNumber}</p>
                          <h3 className="text-lg font-black text-white/90 tracking-tight">{claim.treatmentType}</h3>
                          <p className="text-xs text-white/40 font-medium mt-1">Diagnosis: {claim.diagnosis}</p>
                          <div className="flex items-center gap-6 mt-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                              <Activity className="w-3.5 h-3.5 text-blue-500/40" />
                              {new Date(claim.dateOfTreatment).toLocaleDateString()}
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-emerald-500/40" />
                              Magnitude: ${claim.treatmentCost.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        
                        <div className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border shadow-sm ${
                          claim.status === 'Approved' ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10' :
                          claim.status === 'Rejected' ? 'bg-rose-500/5 text-rose-400 border-rose-500/10' :
                          'bg-blue-500/5 text-blue-400 border-blue-500/10'
                        }`}>
                          {claim.status}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-32 bg-white/[0.01] rounded-[3rem] border border-dashed border-white/5">
                  <AlertCircle className="w-16 h-12 text-white/5 mx-auto mb-6" />
                  <p className="text-white/20 font-black text-xs uppercase tracking-[0.3em]">No operational records found</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </DashboardLayout>
  );
}
