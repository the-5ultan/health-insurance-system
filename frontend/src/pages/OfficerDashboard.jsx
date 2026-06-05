import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert, CheckCircle, XCircle, FileText, AlertTriangle, Loader2, Search, Filter, Send, History } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';

export default function OfficerDashboard() {
  const { user } = useContext(AuthContext);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  // New states for workflow
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestedDocs, setRequestedDocs] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const fetchClaims = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/claims/queue', { withCredentials: true });
      setClaims(res.data);
    } catch (err) {
      console.error('[OfficerDashboard] Fetch claims failure:', err);
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
      }, { withCredentials: true });
      setClaims(prev => prev.map(c => c._id === id ? { ...c, status: newStatus } : c));
    } catch (err) {
      console.error('[OfficerDashboard] Process claim failure:', err);
      alert("Encryption mismatch: Failed to commit status update.");
    } finally {
      setProcessingId(null);
    }
  };

  const submitInfoRequest = async () => {
    if (!selectedClaim || !requestMessage) return;
    setProcessingId(selectedClaim._id);
    const url = `http://localhost:5000/api/claims/${selectedClaim._id}/request-info`;
    console.log(`[OfficerDashboard] Broadcasting Info Request to: ${url}`);
    try {
      await axios.post(url, {
        message: requestMessage,
        requestedDocumentTypes: requestedDocs.split(',').map(d => d.trim()).filter(d => d)
      }, { withCredentials: true });
      setShowRequestModal(false);
      setRequestMessage('');
      setRequestedDocs('');
      fetchClaims();
    } catch (err) {
      console.error('[OfficerDashboard] Info request failure:', err);
      alert("Failed to broadcast information request. Check console for details.");
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
      
      {/* Modals */}
      <AnimatePresence>
        {showRequestModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="liquid-glass w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/10 p-10"
            >
              <h2 className="text-xl font-black text-white mb-6 uppercase tracking-widest flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-400" />
                Information Protocol
              </h2>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Request Directive</label>
                  <textarea 
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="Describe the required information or clarification..."
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm font-medium focus:border-white/20 outline-none transition-all h-32 resize-none"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 ml-2">Document Requirements (Comma separated)</label>
                  <input 
                    value={requestedDocs}
                    onChange={(e) => setRequestedDocs(e.target.value)}
                    placeholder="e.g. Lab Results, MRI Scans, Referral Letter"
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm font-medium focus:border-white/20 outline-none transition-all"
                  />
                </div>
                <div className="flex justify-end gap-6 pt-4">
                  <button 
                    onClick={() => setShowRequestModal(false)}
                    className="px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-all cursor-pointer"
                  >
                    Abort
                  </button>
                  <button 
                    onClick={submitInfoRequest}
                    disabled={processingId || !requestMessage}
                    className="bg-blue-600 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-3 disabled:opacity-50 cursor-pointer"
                  >
                    {processingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Broadcast Request
                  </button>
                </div>
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
                    <div className="flex justify-end gap-3">
                      {/* History button always visible */}
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

                      {claim.status === 'Approved' || claim.status === 'Rejected' ? (
                        <div className="flex items-center gap-2 text-white/20 font-black text-[9px] uppercase tracking-tighter">
                          <CheckCircle className="w-3 h-3" />
                          Finalized
                        </div>
                      ) : (
                        <>
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
                            onClick={() => {
                              setSelectedClaim(claim);
                              setShowRequestModal(true);
                            }}
                            className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all active:scale-95 border border-blue-500/20 cursor-pointer shadow-lg shadow-blue-500/5"
                            title="Request Additional Information"
                          >
                            {processingId === claim._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                          </button>
                          <button 
                            disabled={processingId === claim._id}
                            onClick={() => processClaim(claim._id, 'Rejected')}
                            className="p-2.5 bg-rose-500/10 text-rose-400 rounded-xl hover:bg-rose-500 hover:text-white transition-all active:scale-95 border border-rose-500/20 cursor-pointer shadow-lg shadow-rose-500/5"
                            title="Flag & Reject"
                          >
                            {processingId === claim._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                    </div>
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
