import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Check, X, RefreshCw } from 'lucide-react';
import DashboardLayout from '../layouts/DashboardLayout';
import { getUserAvatarSrc, getUserInitials } from '../utils/userAvatar';

const API = 'http://localhost:5000';

const ROLE_OPTIONS = [
  { value: 'policyholder', label: 'POLICYHOLDER' },
  { value: 'hospital', label: 'HOSPITAL' },
  { value: 'officer', label: 'INSURANCE OFFICER' },
  { value: 'admin', label: 'SYSTEM ADMINISTRATOR' }
];

export default function AdminUserManagement() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API}/auth/admin/users`, { withCredentials: true });
      if (res.data?.success) setUsers(res.data.users || []);
      else setError(res.data?.message || 'Failed to load users.');
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const onChangeRole = async (userId, nextRole) => {
    setSavingId(userId);
    setError('');
    try {
      const res = await axios.put(`${API}/auth/admin/users/${userId}/role`, { role: nextRole }, { withCredentials: true });
      if (!res.data?.success) throw new Error(res.data?.message || 'Role update failed.');
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, role: res.data.user.role, updatedAt: res.data.user.updatedAt } : u))
      );
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Role update failed.');
    } finally {
      setSavingId(null);
    }
  };

  const onSetStatus = async (userId, isActive) => {
    setSavingId(userId);
    setError('');
    try {
      const res = await axios.put(`${API}/auth/admin/users/${userId}/status`, { isActive }, { withCredentials: true });
      if (!res.data?.success) throw new Error(res.data?.message || 'Status update failed.');
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, isActive: res.data.user.isActive, updatedAt: res.data.user.updatedAt } : u))
      );
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Status update failed.');
    } finally {
      setSavingId(null);
    }
  };

  const onRequestDecision = async (requestId, action) => {
    setSavingId(requestId);
    setError('');
    try {
      const res = await axios.post(`${API}/auth/admin/role-requests/${requestId}/${action}`, {}, { withCredentials: true });
      if (!res.data?.success) throw new Error(res.data?.message || 'Request update failed.');
      await fetchUsers();
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Request update failed.');
    } finally {
      setSavingId(null);
    }
  };

  const rows = useMemo(() => users, [users]);

  return (
    <DashboardLayout title="User Management">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-lg font-black tracking-tight text-white/90">Registered Users</h2>
          <p className="text-xs text-white/30 font-bold uppercase tracking-widest mt-1">
            Promote, demote, approve role requests, and manage account status.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 hover:border-white/30 text-white/70 hover:text-white transition-all cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Refresh</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold flex items-center gap-3">
          <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
          {error}
        </div>
      )}

      <div className="liquid-glass border border-white/5 rounded-[3rem] overflow-hidden shadow-2xl">
        <div className="px-10 py-8 border-b border-white/5 bg-white/[0.01] flex justify-between items-center">
          <h3 className="text-sm font-black uppercase tracking-widest text-white/80">Role Authority Console</h3>
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
            Total: {rows.length}
          </span>
        </div>

        {loading ? (
          <div className="p-20 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-white/10 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.005] text-white/30 text-[10px] uppercase tracking-[0.2em] border-b border-white/5 font-black">
                  <th className="p-8 pl-10">User</th>
                  <th className="p-8">Email</th>
                  <th className="p-8">Role</th>
                  <th className="p-8">Status</th>
                  <th className="p-8">Provider</th>
                  <th className="p-8">Role Request</th>
                  <th className="p-8 text-right pr-10">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {rows.map((u, idx) => {
                  const avatarSrc = getUserAvatarSrc(u);
                  const pending = u.roleRequest?.status === 'Pending' ? u.roleRequest : null;
                  const busy = savingId === u._id || savingId === pending?._id;
                  return (
                    <motion.tr
                      key={u._id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(idx * 0.02, 0.2) }}
                      className="hover:bg-white/[0.01] transition-all duration-300 group"
                    >
                      <td className="p-8 pl-10">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-emerald-500 overflow-hidden flex items-center justify-center shrink-0">
                            {avatarSrc ? (
                              <img
                                src={avatarSrc}
                                alt={u.username || u.email || 'User avatar'}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="text-white text-xs font-black">{getUserInitials(u)}</span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-white/90">{u.username || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'User'}</span>
                            <span className="text-[10px] text-white/20 uppercase font-bold mt-1 tracking-widest">
                              {u._id}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-8 text-xs font-bold text-white/60">{u.email}</td>
                      <td className="p-8">
                        <select
                          value={u.role}
                          disabled={busy}
                          onChange={(e) => onChangeRole(u._id, e.target.value)}
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs font-black text-white/70 outline-none hover:border-white/30 focus:border-white/30 transition-all cursor-pointer disabled:opacity-50"
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value} className="bg-[#111] text-white">
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-8">
                        <span
                          className={`inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black tracking-[0.15em] uppercase border ${
                            u.isActive
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="p-8">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">
                          {(u.provider || (u.googleId ? 'google' : 'email')).toString()}
                        </span>
                      </td>
                      <td className="p-8">
                        {pending ? (
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-300/90">
                              Pending: {pending.requestedRole}
                            </span>
                            {pending.details ? (
                              <span className="text-[10px] text-white/20 font-bold">{pending.details}</span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-[10px] font-black uppercase tracking-widest text-white/20">None</span>
                        )}
                      </td>
                      <td className="p-8 text-right pr-10">
                        <div className="inline-flex items-center gap-2">
                          <button
                            disabled={busy}
                            onClick={() => onSetStatus(u._id, !u.isActive)}
                            className="px-4 py-2 rounded-xl border border-white/10 bg-white/5 hover:border-white/30 text-white/70 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-50 cursor-pointer"
                          >
                            {u.isActive ? 'Disable' : 'Enable'}
                          </button>
                          {pending ? (
                            <>
                              <button
                                disabled={busy}
                                onClick={() => onRequestDecision(pending._id, 'approve')}
                                className="p-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-300 transition-all disabled:opacity-50 cursor-pointer"
                                title="Approve"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                disabled={busy}
                                onClick={() => onRequestDecision(pending._id, 'reject')}
                                className="p-2 rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/15 text-rose-300 transition-all disabled:opacity-50 cursor-pointer"
                                title="Reject"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : null}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan="7" className="p-20 text-center text-white/10 italic text-sm font-bold uppercase tracking-widest">
                      No registered users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

