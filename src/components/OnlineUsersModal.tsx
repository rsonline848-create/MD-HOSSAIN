import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  Users, 
  ShieldCheck, 
  UserCheck, 
  UserX, 
  Search, 
  RefreshCw, 
  Phone, 
  MapPin, 
  Clock, 
  Laptop, 
  CheckCircle2, 
  Radio, 
  Sparkles
} from 'lucide-react';
import { toBengaliNumber, formatDateTimeBengali, getRelativeTimeBengali } from '../utils/formatters';
import { isPresenceOnline } from '../services/presenceService';
import { UserAccount } from '../types';

export const OnlineUsersModal: React.FC = () => {
  const { 
    users, 
    currentUser, 
    presenceList, 
    isOnlineUsersModalOpen, 
    setIsOnlineUsersModalOpen,
    branches
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'online' | 'offline'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Combine registered users with presence list
  const combinedUsers = useMemo(() => {
    // Map of presence by userId
    const presenceMap = new Map<string, any>();
    presenceList.forEach(p => {
      if (p.userId) {
        presenceMap.set(p.userId, p);
      }
    });

    // Also include any presence users not in registered list
    const registeredIds = new Set(users.map(u => u.id));
    const extraPresenceUsers: UserAccount[] = [];

    presenceList.forEach(p => {
      if (!registeredIds.has(p.userId)) {
        extraPresenceUsers.push({
          id: p.userId,
          name: p.userName || 'অজানা ব্যবহারকারী',
          username: p.userId,
          phone: '',
          pinOrPassword: '',
          role: p.role || 'manager',
          branchId: p.branchId || 'ml_electric_main',
          isActive: true,
          createdAt: new Date().toISOString()
        });
      }
    });

    const all = [...users, ...extraPresenceUsers];

    return all.map(user => {
      const presence = presenceMap.get(user.id);
      const isSelf = user.id === currentUser?.id;
      
      // Current logged in user in this active window is always online
      const isOnline = isSelf ? true : isPresenceOnline(presence);
      const lastActive = isSelf ? new Date().toISOString() : presence?.lastActive || '';
      const deviceInfo = isSelf ? 'বর্তমান ডিভাইস' : presence?.deviceInfo || 'ওয়েব ব্রাউজার';
      
      const branchName = branches.find(b => b.id === user.branchId)?.name || 
        (user.branchId === 'ml_electric_main' ? 'প্রধান শাখা' : 'শাখা');

      return {
        ...user,
        isOnline,
        lastActive,
        deviceInfo,
        branchName,
        isSelf
      };
    });
  }, [users, presenceList, currentUser, branches]);

  // Statistics
  const onlineCount = useMemo(() => combinedUsers.filter(u => u.isOnline).length, [combinedUsers]);
  const offlineCount = useMemo(() => combinedUsers.filter(u => !u.isOnline).length, [combinedUsers]);

  // Filtered list
  const filteredUsers = useMemo(() => {
    return combinedUsers.filter(user => {
      // Tab filter
      if (filterTab === 'online' && !user.isOnline) return false;
      if (filterTab === 'offline' && user.isOnline) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = user.name?.toLowerCase().includes(q);
        const matchUsername = user.username?.toLowerCase().includes(q);
        const matchPhone = user.phone?.toLowerCase().includes(q);
        const matchRole = user.role?.toLowerCase().includes(q);
        const matchBranch = user.branchName?.toLowerCase().includes(q);
        if (!matchName && !matchUsername && !matchPhone && !matchRole && !matchBranch) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Online first, then self first, then by name
      if (a.isSelf) return -1;
      if (b.isSelf) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.name.localeCompare(b.name, 'bn');
    });
  }, [combinedUsers, filterTab, searchQuery]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetch('/api/presence');
    } catch {}
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  if (!isOnlineUsersModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[10005] bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0 relative">
              <Radio className="w-6 h-6 animate-pulse text-emerald-400" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">অনলাইন ইউজার উপস্থিতি তালিকা</h3>
                <span className="bg-emerald-500/20 text-emerald-300 text-[11px] font-bold px-2 py-0.5 rounded-full border border-emerald-400/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  লাইভ
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                কোন কোন ব্যবহারকারী সিস্টেমে সক্রিয় আছেন এবং অফলাইন ব্যবহারকারীদের সর্বশেষ সময়
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="স্ট্যাটাস রিফ্রেশ করুন"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => setIsOnlineUsersModalOpen(false)}
              className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-white/10 transition cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Summary Counts & Filter Tabs */}
        <div className="p-3 sm:p-4 bg-slate-50 border-b border-slate-200 shrink-0 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Filter Badges / Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'all' 
                    ? 'bg-white text-slate-800 shadow-xs font-bold' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>সকল ({toBengaliNumber(combinedUsers.length)})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('online')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'online' 
                    ? 'bg-emerald-600 text-white shadow-xs font-bold' 
                    : 'text-emerald-700 hover:bg-emerald-100/60'
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>অনলাইন ({toBengaliNumber(onlineCount)})</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterTab('offline')}
                className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                  filterTab === 'offline' 
                    ? 'bg-rose-600 text-white shadow-xs font-bold' 
                    : 'text-rose-700 hover:bg-rose-100/60'
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                <span>অফলাইন ({toBengaliNumber(offlineCount)})</span>
              </button>
            </div>

            {/* Quick Search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ইউজার বা মোবাইল খুঁজুন..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 divide-y divide-slate-100">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-10 text-slate-400 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-300 stroke-[1.5]" />
              <p className="text-sm font-medium">কোন ব্যবহারকারী পাওয়া যায়নি</p>
              <p className="text-xs text-slate-400">ফিল্টার বা সার্চ পরিবর্তন করে পুনরায় চেষ্টা করুন</p>
            </div>
          ) : (
            filteredUsers.map((user) => (
              <div 
                key={user.id}
                className={`pt-3 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl transition ${
                  user.isOnline 
                    ? 'bg-emerald-50/40 border border-emerald-200/60' 
                    : 'bg-white hover:bg-slate-50 border border-slate-200/60'
                }`}
              >
                {/* Left: Avatar + Indicator + Names */}
                <div className="flex items-start gap-3">
                  {/* Avatar with Status Indicator Dot */}
                  <div className="relative shrink-0 mt-0.5">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base shadow-xs ${
                      user.isOnline 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                        : 'bg-slate-100 text-slate-700 border border-slate-300'
                    }`}>
                      {user.name ? user.name.charAt(0) : 'U'}
                    </div>

                    {/* Active Green vs Offline Red Indicator */}
                    {user.isOnline ? (
                      <span 
                        className="absolute -bottom-1 -right-1 flex h-4 w-4" 
                        title="অনলাইন (সক্রিয়)"
                      >
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white shadow-xs"></span>
                      </span>
                    ) : (
                      <span 
                        className="absolute -bottom-1 -right-1 inline-flex rounded-full h-4 w-4 bg-rose-500 border-2 border-white shadow-xs" 
                        title="অফলাইন"
                      ></span>
                    )}
                  </div>

                  {/* Info details */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                        {user.name}
                        {user.isSelf && (
                          <span className="text-[10px] font-extrabold bg-indigo-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                            আপনি (You)
                          </span>
                        )}
                      </h4>

                      {/* Role Badge */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        user.role === 'admin' 
                          ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {user.role === 'admin' ? 'এডমিন (Admin)' : 'ম্যানেজার (Manager)'}
                      </span>
                    </div>

                    {/* Metadata tags: Phone, Branch, Device */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      {user.phone && (
                        <span className="flex items-center gap-1 font-mono text-slate-600">
                          <Phone className="w-3 h-3 text-slate-400" />
                          {user.phone}
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {user.branchName}
                      </span>

                      {user.isOnline && user.deviceInfo && (
                        <span className="flex items-center gap-1 text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded text-[11px]">
                          <Laptop className="w-3 h-3" />
                          {user.deviceInfo}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Online / Offline Status Badge & Last Active Time */}
                <div className="sm:text-right shrink-0 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                  {user.isOnline ? (
                    <div className="space-y-0.5 text-right">
                      {/* Green Indicator Badge */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>অনলাইন (সক্রিয়)</span>
                      </div>
                      <p className="text-[11px] text-emerald-700 font-medium block">
                        এখন সফটওয়্যার ব্যবহার করছেন
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5 text-left sm:text-right">
                      {/* Red Indicator Badge */}
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        <span>অফলাইন</span>
                      </div>

                      {/* Last online date & time */}
                      {user.lastActive ? (
                        <div className="text-[11px] text-slate-600 flex flex-col sm:items-end">
                          <span className="flex items-center gap-1 text-slate-700 font-semibold">
                            <Clock className="w-3 h-3 text-slate-400" />
                            সর্বশেষ: {toBengaliNumber(formatDateTimeBengali(user.lastActive))}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            ({getRelativeTimeBengali(user.lastActive)})
                          </span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">
                          এখনো লগইন করেননি
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </div>
            ))
          )}
        </div>

        {/* Footer info & close button */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-500 text-[11px]">
            <Radio className="w-3.5 h-3.5 text-emerald-600 shrink-0 animate-pulse" />
            <span>
              প্রতি ২৫ সেকেন্ড অন্তর লাইভ হার্টবিট ও ক্লাউড উপস্থিতির মাধ্যমে স্বয়ংক্রিয়ভাবে আপডেট হচ্ছে।
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsOnlineUsersModalOpen(false)}
            className="w-full sm:w-auto px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition shadow-xs cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
};
