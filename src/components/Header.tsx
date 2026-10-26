import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, LogOut, ShieldCheck, Key, Cloud, CloudCheck, RefreshCw, Settings, MapPin, Home, Zap, Award, Users, Languages } from 'lucide-react';
import { toBengaliNumber } from '../utils/formatters';

export const Header: React.FC = () => {
  const { 
    currentUser, 
    setCurrentUser, 
    users, 
    branches, 
    setActiveModal, 
    logout, 
    returnToMainApp, 
    activeBranchId, 
    isCloudSynced, 
    cloudSyncTime, 
    isSyncingNow, 
    forceSyncFromCloud,
    language,
    setLanguage,
    t
  } = useApp();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Resolve branch name strictly from branch records or branch metadata, NEVER from user's personal name
  const currentBranch = branches.find(b => b.id === activeBranchId) || 
                        (currentUser?.branchId ? branches.find(b => b.id === currentUser.branchId) : undefined);

  if (currentBranch?.name && activeBranchId) {
    try {
      localStorage.setItem(`ML_ELECTRIC_${activeBranchId}_BRANCH_NAME`, currentBranch.name);
    } catch {}
  }

  const cachedBranchName = typeof window !== 'undefined'
    ? (localStorage.getItem(`ML_ELECTRIC_${activeBranchId}_BRANCH_NAME`) || '')
    : '';

  const isMainOffice = activeBranchId === 'bismillah_traders_main' || activeBranchId === 'ml_electric_main';

  const branchNameDisplay = 
    currentBranch?.name || 
    currentUser?.branchName || 
    cachedBranchName || 
    (isMainOffice 
      ? (language === 'bn' ? 'প্রধান কার্যালয়' : 'Head Office') 
      : (language === 'bn' ? 'শাখা' : 'Branch'));

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    logout();
  };

  const isAdmin = currentUser?.role === 'admin';

  return (
    <header className="bg-gradient-to-r from-indigo-700 via-indigo-800 to-purple-800 text-white shadow-md z-30 shrink-0 print:hidden">
      <div className="w-full px-3 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar min-h-[60px]">
        
        {/* Brand Name, Status & User Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 cursor-pointer select-none">
            <div className="flex flex-col">
              <h1 className="text-lg sm:text-xl font-black tracking-tight leading-none text-white whitespace-nowrap">
                Bismillah Traders
              </h1>
              {!isMainOffice ? (
                <span className="text-xs font-semibold text-emerald-300 whitespace-nowrap leading-tight mt-1">
                  {language === 'bn' ? 'শাখা: ' : 'Branch: '}{branchNameDisplay}
                </span>
              ) : (
                <span className="text-xs font-medium text-indigo-200 whitespace-nowrap leading-tight mt-1">
                  {language === 'bn' ? 'বিসমিল্লাহ ট্রেডার্স (প্রধান কার্যালয়)' : 'Bismillah Traders (Head Office)'}
                </span>
              )}
            </div>
          </div>

          {/* Real-time Google Cloud Sync Status Badge with Refresh Button */}
          <div className="flex items-center gap-1.5">
            <div 
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap ${
                isCloudSynced 
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200' 
                  : 'bg-amber-500/20 border-amber-400/40 text-amber-200'
              }`}
              title={`Google Firebase Firestore ${language === 'bn' ? 'রিয়েল-টাইমে সংযুক্ত' : 'Live Connected'} ${cloudSyncTime ? `| ${language === 'bn' ? 'শেষ আপডেট: ' : 'Last: '}${cloudSyncTime}` : ''}`}
            >
              <span className={`inline-block w-2 h-2 rounded-full ${isCloudSynced ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <Cloud className="w-3.5 h-3.5" />
              <span className="hidden xl:inline">
                {isSyncingNow ? t('header.syncing', 'সিঙ্ক...') : isCloudSynced ? t('header.cloud_sync', 'ক্লাউড লাইভ সিঙ্ক') : t('header.offline', 'অফলাইন')}
              </span>
              {cloudSyncTime && (
                <span className="text-[11px] opacity-85">({cloudSyncTime})</span>
              )}
            </div>
            <button
              onClick={() => forceSyncFromCloud()}
              disabled={isSyncingNow}
              title={t('header.refresh_tooltip', 'ক্লাউড থেকে তাৎক্ষণিক রিফ্রেশ ও সিঙ্ক করুন')}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition text-indigo-100 disabled:opacity-50 cursor-pointer shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingNow ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* User Badge */}
          <div className="relative shrink-0">
            <button
              id="header-user-badge-btn"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-1.5 sm:gap-2 bg-indigo-900/80 hover:bg-indigo-950 text-indigo-100 px-3 sm:px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold border border-indigo-500/40 transition shadow-inner cursor-pointer whitespace-nowrap"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>আইডি: {currentUser?.name || 'অ্যাডমিন'}</span>
            </button>

            {showUserDropdown && (
              <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-2xl py-2 text-slate-800 border border-slate-200 z-50 animate-in fade-in">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-400 font-medium">লগইন করা আছে</p>
                  <p className="font-bold text-slate-800 text-sm">{currentUser?.name || 'অ্যাডমিন'}</p>
                  <span className="inline-block mt-0.5 text-[11px] font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    {(currentUser?.role === 'admin' || currentUser?.role === 'branch_manager') ? 'অ্যাডমিন একাউন্ট' : 'ম্যানেজার একাউন্ট'}
                  </span>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setActiveModal('change_password');
                    }}
                    className="w-full text-left px-4 py-2 text-xs sm:text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Key className="w-3.5 h-3.5 text-slate-500" />
                    পাসওয়ার্ড পরিবর্তন
                  </button>
                  
                  {/* Switch user */}
                  <div className="border-t border-slate-100 my-1 pt-1">
                    <p className="px-4 py-1 text-[11px] font-medium text-slate-400">ইউজার পরিবর্তন করুন:</p>
                    {users.filter(u => u.role !== 'admin').map(u => (
                      <button
                        key={u.id}
                        onClick={() => {
                          setCurrentUser(u);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-1.5 text-xs flex items-center justify-between hover:bg-indigo-50 cursor-pointer ${u.id === currentUser.id ? 'font-bold text-indigo-700 bg-indigo-50/50' : 'text-slate-600'}`}
                      >
                        <span>{u.name}</span>
                        {u.id === currentUser.id && <span className="text-[10px] text-indigo-600 font-bold">● সক্রিয়</span>}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        setShowLogoutModal(true);
                      }}
                      className="w-full text-left px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-600" />
                      লগআউট করুন
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Return to Main Branch Button if in Sub-Branch (Admin only) */}
          {isAdmin && !isMainOffice && (
            <button
              onClick={returnToMainApp}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-md text-[11px] sm:text-xs font-bold shadow-xs hover:shadow active:scale-95 transition cursor-pointer whitespace-nowrap shrink-0"
              title="প্রধান শাখায় ফিরে যান"
            >
              <Home className="w-3 h-3" />
              <span>প্রধান শাখা</span>
            </button>
          )}
        </div>

        {/* Far Right Action Buttons (১ লাইনে ভাষা, ব্রাঞ্চ, সেটিংস, অনলাইন ইউজার, লগআউট) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap">
          
          {/* ভাষা পরিবর্তন বাটন (Language Switcher) */}
          <button
            type="button"
            onClick={() => setLanguage(language === 'bn' ? 'en' : 'bn')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-black shadow-2xs hover:shadow-xs active:scale-95 transition cursor-pointer border shrink-0 ${
              language === 'en'
                ? 'bg-amber-400 text-slate-900 border-amber-300 shadow-amber-900/30 ring-1 ring-white/50'
                : 'bg-white/15 hover:bg-white/25 text-white border-white/20'
            }`}
            title={language === 'bn' ? 'Switch application to English' : 'অ্যাপ বাংলায় রূপান্তর করুন'}
          >
            <Languages className={`w-3.5 h-3.5 ${language === 'en' ? 'text-slate-900' : 'text-amber-300'} shrink-0`} />
            <span className="tracking-wide">{language === 'bn' ? 'বাংলা' : 'English'}</span>
          </button>

          {/* Admin only: ব্রাঞ্চ, সেটিংস, অনলাইন ইউজার */}
          {isAdmin && (
            <>
              {/* ১. ব্রাঞ্চ */}
              <button
                id="header-branch-btn"
                onClick={() => setActiveModal('branch')}
                className="flex items-center gap-1 bg-slate-100 hover:bg-white text-slate-800 px-2.5 py-1.5 rounded-md text-xs font-bold shadow-2xs hover:shadow-xs active:scale-95 transition cursor-pointer border border-slate-200 shrink-0"
                title={language === 'bn' ? 'শাখা ও ব্রাঞ্চ নিয়ন্ত্রণ' : 'Branch Management'}
              >
                <MapPin className="w-3 h-3 text-indigo-600 shrink-0" />
                <span>{language === 'bn' ? 'ব্রাঞ্চ' : 'Branch'}</span>
              </button>
              
              {/* ২. সেটিংস */}
              <button
                id="header-settings-btn"
                onClick={() => setActiveModal('settings')}
                className="flex items-center gap-1 bg-slate-100 hover:bg-white text-slate-800 px-2.5 py-1.5 rounded-md text-xs font-bold shadow-2xs hover:shadow-xs active:scale-95 transition cursor-pointer border border-slate-200 shrink-0"
                title={language === 'bn' ? 'সফটওয়্যার সেটিংস' : 'Software Settings'}
              >
                <Settings className="w-3 h-3 text-slate-700 shrink-0" />
                <span>{language === 'bn' ? 'সেটিংস' : 'Settings'}</span>
              </button>
            </>
          )}

          {/* ৫. লগআউট (সকল রোলের জন্য দৃশ্যমান) */}
          <button
            id="header-logout-btn"
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center gap-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-bold shadow-2xs hover:shadow-sm active:scale-95 transition cursor-pointer border border-rose-400/30 shrink-0"
            title={language === 'bn' ? 'সফটওয়্যার থেকে লগআউট করুন' : 'Log out from application'}
          >
            <LogOut className="w-3 h-3 shrink-0" />
            <span>{language === 'bn' ? 'লগআউট' : 'Logout'}</span>
          </button>
        </div>
      </div>

      {/* In-App Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl text-slate-800 animate-in zoom-in-95 border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <LogOut className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {language === 'bn' ? 'লগআউট নিশ্চিতকরণ' : 'Confirm Logout'}
                </h3>
                <p className="text-xs text-slate-500">{language === 'bn' ? 'আইডি: ' : 'User: '}{currentUser.name}</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              {language === 'bn' 
                ? 'আপনি কি নিশ্চিত যে সফটওয়্যার থেকে লগআউট করে লগইন স্ক্রিনে ফিরে যেতে চান?' 
                : 'Are you sure you want to log out and return to the login screen?'}
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                {language === 'bn' ? 'না, থাকুন' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleLogoutConfirm}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow transition active:scale-95 cursor-pointer flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'হ্যাঁ, লগআউট করুন' : 'Yes, Log Out'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
