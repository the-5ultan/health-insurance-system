import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  ChevronRight, 
  Clock, 
  CheckCheck, 
  History,
  User,
  Building,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import DashboardLayout from '../layouts/DashboardLayout';

const StatusBadge = ({ interaction }) => {
  const isReplied = interaction.repliedAt || interaction.type === 'response'; // Simplified for this view
  const isOpened = interaction.openedAt;
  const isReceived = interaction.receivedAt;

  return (
    <div className="flex items-center gap-1">
      <div className="flex -space-x-1">
        <CheckCheck className={`w-3.5 h-3.5 ${isReceived ? 'text-blue-500' : 'text-white/10'}`} />
        <CheckCheck className={`w-3.5 h-3.5 ${isOpened ? 'text-blue-500' : 'text-white/10'}`} />
      </div>
      <span className="text-[9px] font-black uppercase tracking-tighter ml-1">
        {isReplied ? 'Replied' : isOpened ? 'Opened' : isReceived ? 'Received' : 'Sent'}
      </span>
    </div>
  );
};

export default function CommunicationCenter() {
  const { user } = useContext(AuthContext);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRequests = async () => {
    try {
      // Re-using queue endpoint which is now enriched with interaction sender details
      const res = await axios.get('http://localhost:5000/api/claims/queue', { withCredentials: true });
      // Filter claims that have requests from this officer
      const myRequests = res.data.filter(claim => 
        claim.interactions?.some(i => i.type === 'request' && (i.senderId?._id === user._id || i.senderId === user._id))
      );
      setClaims(myRequests);
    } catch (err) {
      console.error('Failed to sync communication records:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 15000); // Fast sync for communication
    return () => clearInterval(interval);
  }, []);

  const filteredClaims = claims.filter(c => 
    c.claimNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout title="Communication & Request Telemetry">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Request List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filter by identifier or patient..." 
                className="w-full bg-white/5 border border-white/5 rounded-xl py-2.5 pl-12 pr-4 text-xs font-bold text-white placeholder-white/10 outline-none focus:border-white/10 transition-all uppercase tracking-widest"
              />
            </div>
            <div className="flex items-center gap-3 ml-4">
              <button className="p-2.5 bg-white/5 rounded-xl text-white/40 hover:text-white border border-white/5 transition-all">
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="liquid-glass border border-white/5 rounded-[2.5rem] overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-white/[0.02] text-[9px] font-black uppercase tracking-[0.2em] text-white/30 border-b border-white/5">
                  <th className="p-6 pl-10">Transmission</th>
                  <th className="p-6">Target Entity</th>
                  <th className="p-6">State</th>
                  <th className="p-6 text-right pr-10">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.02]">
                {filteredClaims.map((claim) => {
                  const lastReq = [...claim.interactions].reverse().find(i => i.type === 'request');
                  const isReplied = claim.status === 'Information Submitted';
                  
                  return (
                    <tr 
                      key={claim._id} 
                      onClick={() => setSelectedClaim(claim)}
                      className={`group cursor-pointer transition-all ${selectedClaim?._id === claim._id ? 'bg-blue-500/5' : 'hover:bg-white/[0.01]'}`}
                    >
                      <td className="p-6 pl-10">
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-blue-400 font-mono tracking-tighter">{claim.claimNumber}</span>
                          <span className="text-[9px] text-white/20 font-bold uppercase mt-1 tracking-widest">
                            {new Date(lastReq?.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-white/80 group-hover:translate-x-1 transition-transform">{claim.patientName}</span>
                          <div className="flex items-center gap-1.5 mt-1 text-white/20">
                            <Building className="w-3 h-3" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Healthcare Node</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                          isReplied ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {claim.status}
                        </span>
                      </td>
                      <td className="p-6 text-right pr-10">
                        <StatusBadge interaction={lastReq} />
                      </td>
                    </tr>
                  );
                })}
                {loading && (
                  <tr>
                    <td colSpan="4" className="p-20 text-center">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500 opacity-20" />
                    </td>
                  </tr>
                )}
                {!loading && filteredClaims.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-20 text-center text-white/10 italic text-sm font-bold uppercase tracking-widest">
                      No active transmissions detected.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Conversation Timeline */}
        <div className="space-y-6">
          <div className="liquid-glass border border-white/5 rounded-[2.5rem] p-8 h-[calc(100vh-14rem)] flex flex-col sticky top-28">
            {selectedClaim ? (
              <>
                <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Transmission Log</h3>
                    <p className="text-[10px] text-blue-400 font-mono mt-1">{selectedClaim.claimNumber}</p>
                  </div>
                  <div className="p-2.5 bg-white/5 rounded-xl border border-white/5 text-white/40">
                    <History className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                  {selectedClaim.interactions?.map((int, i) => (
                    <div key={i} className={`flex flex-col ${int.type === 'request' ? 'items-start' : 'items-end'}`}>
                      <div className={`max-w-[90%] rounded-2xl p-4 border ${
                        int.type === 'request' 
                          ? 'bg-blue-500/5 border-blue-500/10 text-blue-100' 
                          : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-100'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[8px] font-black uppercase tracking-widest opacity-40">
                            {int.type === 'request' ? 'Officer' : 'Healthcare Node'}
                          </span>
                          <span className="text-[8px] font-mono opacity-20">{new Date(int.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p className="text-xs font-medium leading-relaxed">{int.message}</p>
                        
                        {int.attachments?.length > 0 && (
                          <div className="mt-3 grid grid-cols-1 gap-2">
                            {int.attachments.map((att, idx) => (
                              <a 
                                key={idx} 
                                href={`http://localhost:5000/${att}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
                              >
                                <div className="flex items-center gap-2">
                                  <FileText className="w-3 h-3 text-emerald-400/50" />
                                  <span className="text-[8px] font-bold uppercase truncate max-w-[80px]">Attachment {idx + 1}</span>
                                </div>
                                <ChevronRight className="w-3 h-3 text-white/10 group-hover:text-white/30" />
                              </a>
                            ))}
                          </div>
                        )}

                        {int.type === 'request' && (
                          <div className="mt-3 flex items-center justify-end gap-1 opacity-40">
                            <CheckCheck className={`w-3 h-3 ${int.receivedAt ? 'text-blue-400' : ''}`} />
                            <span className="text-[7px] font-black uppercase">
                              {int.openedAt ? 'Read' : int.receivedAt ? 'Delivered' : 'Sent'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-white/5">
                  <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-white/20 mb-4">
                    <span>Protocol Timeline</span>
                    <span>Synchronized</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {['Requested', 'Received', 'Opened', 'Replied'].map((step, idx) => {
                      const lastReq = [...selectedClaim.interactions].reverse().find(i => i.type === 'request');
                      const active = 
                        idx === 0 ? true :
                        idx === 1 ? lastReq?.receivedAt :
                        idx === 2 ? lastReq?.openedAt :
                        selectedClaim.status === 'Information Submitted';

                      return (
                        <div key={idx} className="flex flex-col items-center gap-2">
                          <div className={`w-full h-1 rounded-full ${active ? 'bg-blue-500' : 'bg-white/5'}`} />
                          <span className={`text-[7px] font-black uppercase ${active ? 'text-white/60' : 'text-white/10'}`}>{step}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <div className="w-16 h-16 rounded-3xl bg-white/[0.02] border border-white/5 flex items-center justify-center mb-6 text-white/10">
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Select Transmission</h3>
                <p className="text-[10px] text-white/20 mt-2 font-medium">Monitoring active adjudication channels across the secure network.</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </DashboardLayout>
  );
}
