import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Plus, ClipboardList, Send, AlertCircle, CheckCircle2, History, Loader2, FileText, Search, XCircle } from 'lucide-react';
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

  // New states for workflow
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [responseFiles, setResponseFiles] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

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
      console.error('[HospitalDashboard] Failed to fetch policy nodes:', err);
    }
  };

  const fetchHospitalClaims = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/claims/queue', { withCredentials: true });
      setClaims(res.data);
    } catch (err) {
      console.error('[HospitalDashboard] Fetch claims failure:', err);
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

  const submitResponse = async () => {
    if (!selectedClaim || !responseMessage) return;
    setIsSubmitting(true);
    try {
      const data = new FormData();
      data.append('message', responseMessage);
      responseFiles.forEach(file => {
        data.append('attachments', file);
      });

      await axios.post(`http://localhost:5000/api/claims/${selectedClaim._id}/respond-info`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true
      });
      
      setSuccess(`Information submitted for claim ${selectedClaim.claimNumber}.`);
      setShowResponseModal(false);
      setResponseMessage('');
      setResponseFiles([]);
      fetchHospitalClaims();
    } catch (err) {
      console.error('[HospitalDashboard] Submit response error:', err);
      setError('Failed to submit information response.');
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
      
      {/* Modals */}
      <AnimatePresence>
        {showResponseModal && selectedClaim && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="liquid-glass w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/10 p-10 max-h-[90vh] flex flex-col"
            >
              <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest flex items-center gap-3">
                <Send className="w-5 h-5 text-blue-400" />
                Response Terminal
              </h2>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-8">
                {/* Officer's Request */}
                <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/10 space-y-4">
                  {selectedClaim.interactions?.filter(i => i.type === 'request').slice(-1).map((lastReq, i) => (
                    <div key={i} className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block mb-1">Adjudication Officer</span>
                          <p className="text-xs font-bold text-white/90">
                            {lastReq.senderId?.firstName || 'System'} {lastReq.senderId?.lastName || 'Authority'}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-1">Requested On</span>
                          <p className="text-[10px] font-mono text-white/50">
                            {new Date(lastReq.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block mb-2">Directive Message</span>
                        <p className="text-sm text-white/70 italic leading-relaxed bg-black/20 p-4 rounded-xl border border-white/5">
                          "{lastReq.message || 'No specific instructions provided.'}"
                        </p>
                      </div>

                      {lastReq.requestedDocumentTypes?.length > 0 && (
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/30 block mb-2">Required Items</span>
                          <div className="flex flex-wrap gap-2">
                            {lastReq.requestedDocumentTypes.map((d, idx) => (
                              <span key={idx} className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[9px] font-bold text-white/50">{d}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {(!selectedClaim.interactions || selectedClaim.interactions.filter(i => i.type === 'request').length === 0) && (
                    <div className="text-center py-4">
                      <p className="text-xs text-white/20 font-bold uppercase tracking-widest italic">Synchronizing interaction data...</p>
                    </div>
                  )}
                </div>

                <div className="space-y-6 pt-2">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Response Payload</label>
                    <textarea 
                      value={responseMessage}
                      onChange={(e) => setResponseMessage(e.target.value)}
                      placeholder="Enter detailed clarification or notes..."
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm font-medium focus:border-white/20 outline-none transition-all h-32 resize-none"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Supplemental Documentation</label>
                    <div className="relative">
                      <input 
                        type="file" multiple 
                        onChange={(e) => setResponseFiles(Array.from(e.target.files))}
                        className="hidden" id="resp-file-upload"
                      />
                      <label 
                        htmlFor="resp-file-upload"
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white/40 text-[10px] font-black uppercase tracking-widest hover:border-white/20 transition-all flex items-center justify-between cursor-pointer"
                      >
                        {responseFiles.length > 0 ? `${responseFiles.length} Files Attached` : 'Upload Requested Files'}
                        <FileText className="w-4 h-4 text-white/20" />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-6 pt-8 border-t border-white/5 mt-8">
                <button 
                  onClick={() => setShowResponseModal(false)}
                  className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitResponse}
                  disabled={isSubmitting || !responseMessage}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500 transition-all flex items-center gap-3 disabled:opacity-50 cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Synchronize Data
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showHistory && selectedClaim && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="liquid-glass w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[80vh]"
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h2 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-4">
                  <History className="w-5 h-5 text-blue-400" />
                  Interaction Log: {selectedClaim.claimNumber}
                </h2>
                <button onClick={() => setShowHistory(false)} className="text-white/30 hover:text-white cursor-pointer">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
                {selectedClaim.interactions && selectedClaim.interactions.length > 0 ? (
                  selectedClaim.interactions.map((int, i) => (
                    <div key={i} className={`flex flex-col ${int.type === 'request' ? 'items-start' : 'items-end'}`}>
                      <div className={`max-w-[85%] rounded-[2rem] p-6 border ${
                        int.type === 'request' 
                          ? 'bg-blue-500/5 border-blue-500/20 text-blue-100' 
                          : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-100'
                      }`}>
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-[9px] font-black uppercase tracking-widest opacity-40">
                            {int.type === 'request' ? 'Officer Directive' : 'Facility Response'}
                          </span>
                          <span className="text-[9px] font-mono opacity-20">{new Date(int.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm font-medium leading-relaxed">{int.message}</p>
                        
                        {int.requestedDocumentTypes && int.requestedDocumentTypes.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/5">
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 block mb-2">Requested Docs</span>
                            <div className="flex flex-wrap gap-2">
                              {int.requestedDocumentTypes.map((doc, idx) => (
                                <span key={idx} className="px-2 py-1 rounded-md bg-white/5 border border-white/5 text-[9px] font-bold uppercase">{doc}</span>
                              ))}
                            </div>
                          </div>
                        )}

                        {int.attachments && int.attachments.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-white/5">
                            <span className="text-[9px] font-black uppercase tracking-widest opacity-40 block mb-2">Attachments</span>
                            <div className="grid grid-cols-2 gap-2">
                              {int.attachments.map((att, idx) => (
                                <a 
                                  key={idx} 
                                  href={`http://localhost:5000/${att}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                                >
                                  <FileText className="w-3 h-3 text-white/30 group-hover:text-blue-400" />
                                  <span className="text-[8px] font-bold uppercase truncate">Document {idx + 1}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-20 text-center text-white/10 font-black uppercase tracking-[0.2em] text-xs italic">
                    No historical interactions recorded for this node.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Alert Banner for Information Requested */}
      {claims.some(c => c.status === 'Information Requested') && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 p-6 rounded-3xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between"
        >
          <div className="flex items-center gap-4 text-blue-400">
            <AlertCircle className="w-6 h-6 animate-pulse" />
            <div>
              <p className="text-xs font-black uppercase tracking-widest">Information Required</p>
              <p className="text-sm font-medium opacity-80">Adjudication officers have requested additional details for one or more claims.</p>
            </div>
          </div>
          <button 
            onClick={() => {
              const firstReq = claims.find(c => c.status === 'Information Requested');
              if (firstReq) {
                setSelectedClaim(firstReq);
                setShowResponseModal(true);
              }
            }}
            className="text-[10px] font-black uppercase tracking-widest bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-all cursor-pointer"
          >
            Review Requests
          </button>
        </motion.div>
      )}
      
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
                        <div className="flex justify-end gap-3 items-center">
                          {/* History Button */}
                          <button 
                            onClick={() => {
                              setSelectedClaim(claim);
                              setShowHistory(true);
                            }}
                            className="p-2.5 bg-white/5 text-white/40 rounded-xl hover:bg-white/10 hover:text-white transition-all border border-white/5 cursor-pointer shadow-lg shadow-white/5"
                            title="View Interaction History"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] border ${
                            claim.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                            claim.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                            claim.status === 'Information Requested' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {claim.status}
                          </span>

                          {claim.status === 'Information Requested' && (
                            <button 
                              onClick={() => {
                                setSelectedClaim(claim);
                                setShowResponseModal(true);
                              }}
                              className="px-4 py-1.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-all text-[9px] font-black uppercase tracking-widest cursor-pointer active:scale-95 shadow-lg shadow-blue-500/10"
                            >
                              Respond
                            </button>
                          )}
                        </div>
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
