import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, MapPin, Plus, Store, Phone, Trash2, ArrowRight, Edit2, Shield, UserCheck, Home, AlertCircle, Eye, EyeOff, KeyRound, AlertTriangle } from 'lucide-react';
import { Branch } from '../types';

export const BranchModal: React.FC = () => {
  const { 
    activeModal, 
    setActiveModal, 
    branches, 
    addBranch, 
    updateBranch, 
    deleteBranch, 
    users, 
    currentUser, 
    activeBranchId, 
    returnToMainApp 
  } = useApp();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  
  const [branchName, setBranchName] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Branch Delete with Admin Password Confirmation
  const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  if (activeModal !== 'branch') return null;

  const normalizeDigits = (str: string = '') => {
    return str
      .trim()
      .replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d).toString());
  };

  const verifyAdminPassword = (inputPass: string) => {
    const trimmed = inputPass.trim();
    if (!trimmed) return false;
    const normInput = normalizeDigits(trimmed);

    // Master / fallback admin password
    if (trimmed === '102267' || normInput === '102267') return true;

    // Check currentUser if admin
    if (currentUser?.role === 'admin') {
      const curPass = (currentUser.pinOrPassword || '').trim();
      if (curPass && (curPass === trimmed || normalizeDigits(curPass) === normInput)) {
        return true;
      }
    }

    // Check all admin users in state
    const adminUsers = users.filter(u => u.role === 'admin');
    return adminUsers.some(u => {
      const p1 = (u.pinOrPassword || '').trim();
      const p2 = ((u as any).password || '').trim();
      return (
        p1 === trimmed ||
        p2 === trimmed ||
        (p1 && normalizeDigits(p1) === normInput) ||
        (p2 && normalizeDigits(p2) === normInput)
      );
    });
  };

  const handleOpenAdd = () => {
    setEditingBranch(null);
    setBranchName('');
    setBranchLocation('');
    setBranchPhone('');
    setShowAddForm(true);
  };

  const handleOpenEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchName(branch.name);
    setBranchLocation(branch.location || '');
    setBranchPhone(branch.phone || '');
    setShowAddForm(true);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingBranch(null);
    setBranchName('');
    setBranchLocation('');
    setBranchPhone('');
  };

  const handleSaveBranch = async () => {
    if (!branchName.trim()) {
      alert('অনুগ্রহ করে শাখার নাম প্রদান করুন!');
      return;
    }
    
    try {
      setIsSaving(true);
      if (editingBranch) {
        await updateBranch({
          ...editingBranch,
          name: branchName.trim(),
          location: branchLocation.trim(),
          phone: branchPhone.trim()
        });
        alert(`শাখা "${branchName.trim()}" এর তথ্য আপডেট হয়েছে!`);
      } else {
        await addBranch({
          name: branchName.trim(),
          location: branchLocation.trim(),
          phone: branchPhone.trim()
        });
        alert(`নতুন শাখা "${branchName.trim()}" সফলভাবে যুক্ত করা হয়েছে!`);
      }
      handleCancelForm();
    } catch (err) {
      console.error(err);
      alert('শাখা সংরক্ষণ করতে সমস্যা হয়েছে, পুনরায় চেষ্টা করুন।');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDeleteModal = (branch: Branch) => {
    setBranchToDelete(branch);
    setAdminPasswordInput('');
    setDeleteErrorMsg('');
    setShowDeletePassword(false);
  };

  const handleConfirmDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchToDelete) return;

    const trimmedPass = adminPasswordInput.trim();
    if (!trimmedPass) {
      setDeleteErrorMsg('অনুগ্রহ করে অ্যাডমিন পাসওয়ার্ড লিখুন!');
      return;
    }

    if (!verifyAdminPassword(trimmedPass)) {
      setDeleteErrorMsg('ভুল অ্যাডমিন পাসওয়ার্ড! সঠিক পাসওয়ার্ড ছাড়া শাখা মুছে ফেলা সম্ভব নয়।');
      return;
    }

    try {
      setIsDeleting(true);
      await deleteBranch(branchToDelete.id);
      alert(`শাখা "${branchToDelete.name}" সফলভাবে মুছে ফেলা হয়েছে!`);
      setBranchToDelete(null);
      setAdminPasswordInput('');
      setDeleteErrorMsg('');
    } catch (err) {
      console.error(err);
      setDeleteErrorMsg('শাখা মুছে ফেলতে সমস্যা হয়েছে, পুনরায় চেষ্টা করুন।');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSwitchBranch = (branchId: string) => {
    if (branchId === activeBranchId) return;
    localStorage.setItem('ACTIVE_BRANCH_ID', branchId);

    // Auto-login: Transfer currently logged-in user session to the target branch
    if (currentUser) {
      const targetPrefix = `ML_ELECTRIC_${branchId}_`;
      sessionStorage.setItem(`${targetPrefix}AUTH`, JSON.stringify(true));
      sessionStorage.setItem(`${targetPrefix}CURRENT_USER_ID`, currentUser.id);
      sessionStorage.setItem(`${targetPrefix}CURRENT_USER_DATA`, JSON.stringify(currentUser));

      try {
        // Sync user accounts list to target branch so current user exists in state
        const savedUsers =
          localStorage.getItem('ML_ELECTRIC_ml_electric_main_USERS') ||
          localStorage.getItem(`ML_ELECTRIC_${activeBranchId}_USERS`) ||
          JSON.stringify(users);
        if (savedUsers) {
          localStorage.setItem(`${targetPrefix}USERS`, savedUsers);
        }
      } catch (e) {
        console.error('Error copying users to target branch:', e);
      }
    }

    window.location.reload();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 my-8">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/80 rounded-t-2xl">
          <div className="flex items-center gap-3 text-slate-800">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Store className="w-5 h-5 text-indigo-700" />
            </div>
            <div>
              <h2 className="text-lg font-bold">ব্রাঞ্চ / শাখা পরিচালনা</h2>
              <p className="text-xs text-slate-500">আপনার ব্যবসা প্রতিষ্ঠানের সকল স্বতন্ত্র শাখা ও লোকেশন তালিকা</p>
            </div>
          </div>
          <button 
            onClick={() => setActiveModal(null)} 
            className="text-slate-400 hover:text-slate-700 bg-white p-2 rounded-full border border-slate-200 shadow-sm"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-5 max-h-[75vh] overflow-y-auto">
          
          {/* Main Branch Switcher Banner if in a sub-branch */}
          {activeBranchId !== 'ml_electric_main' && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-3.5 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Store className="w-5 h-5 text-amber-700 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-900">আপনি বর্তমানে একটি শাখায় আছেন</p>
                  <p className="text-[11px] text-amber-700">প্রধান কার্যালয়ের হিসাব দেখতে নিচের বাটনে চাপ দিন</p>
                </div>
              </div>
              <button
                onClick={returnToMainApp}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
              >
                <Home className="w-3.5 h-3.5" />
                <span>প্রধান শাখায় ফিরুন</span>
              </button>
            </div>
          )}

          {/* Non-admin notice */}
          {currentUser.role !== 'admin' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-800">
              <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>শুধুমাত্র <strong>অ্যাডমিন</strong> নতুন শাখা যুক্ত, এডিট বা ডিলিট করতে পারবেন।</span>
            </div>
          )}

          {/* Add/Edit Branch Form */}
          {showAddForm && currentUser.role === 'admin' && (
            <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-indigo-200 shadow-sm space-y-4 animate-in slide-in-from-top-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="font-bold text-indigo-800 text-sm flex items-center gap-2">
                  <Store className="w-4 h-4 text-indigo-600" />
                  <span>{editingBranch ? 'শাখার তথ্য আপডেট করুন' : 'নতুন শাখা তৈরি করুন'}</span>
                </h3>
                <span className="text-[11px] text-slate-500">পরবর্তীতে এই শাখায় ম্যানেজার যুক্ত করতে পারবেন</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    শাখার নাম <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text" 
                    value={branchName}
                    onChange={e => setBranchName(e.target.value)}
                    placeholder="যেমন: তাকওয়া ইলেকট্রিক"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    ঠিকানা / লোকেশন
                  </label>
                  <input 
                    type="text" 
                    value={branchLocation}
                    onChange={e => setBranchLocation(e.target.value)}
                    placeholder="যেমন: শেখদি, যাত্রাবাড়ী"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    যোগাযোগ নম্বর (ফোন)
                  </label>
                  <input 
                    type="text" 
                    value={branchPhone}
                    onChange={e => setBranchPhone(e.target.value)}
                    placeholder="যেমন: 017XXXXXXXX"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
                <button 
                  type="button"
                  onClick={handleCancelForm}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition"
                >
                  বাতিল
                </button>
                <button 
                  type="button"
                  onClick={handleSaveBranch}
                  disabled={isSaving}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : editingBranch ? 'আপডেট করুন' : 'শাখা সংরক্ষণ করুন'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Existing Branch List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span>শাখা সমূহ ({branches.length})</span>
              </h3>
              {!showAddForm && currentUser.role === 'admin' && (
                <button 
                  onClick={handleOpenAdd}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition"
                >
                  <Plus className="w-4 h-4" /> 
                  <span>নতুন ব্রাঞ্চ যুক্ত করুন</span>
                </button>
              )}
            </div>

            {/* Main Branch Card */}
            <div className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              activeBranchId === 'ml_electric_main' 
                ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-200' 
                : 'bg-white border-slate-200 hover:border-indigo-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 font-bold">
                  <Home className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-800 text-sm">প্রধান কার্যালয় (বিসমিল্লাহ ট্রেডার্স)</h4>
                    {activeBranchId === 'ml_electric_main' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                        বর্তমান সক্রিয় শাখা
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">প্রধান শপ ডাটাবেজ ও কেন্দ্রীয় নিয়ন্ত্রণ</p>
                </div>
              </div>

              {activeBranchId !== 'ml_electric_main' && (
                <button
                  onClick={returnToMainApp}
                  className="self-start sm:self-auto flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition border border-indigo-200"
                >
                  <span>প্রধান শাখায় যান</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Empty branches prompt */}
            {branches.length === 0 && !showAddForm && (
              <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                <Store className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-600">এখনও কোনো অতিরিক্ত শাখা যোগ করা হয়নি</p>
                <p className="text-[11px] text-slate-400">আপনার যদি অন্য কোনো দোকান বা শাখা থাকে, তবে উপরের বাটনে চাপ দিয়ে যুক্ত করতে পারেন।</p>
              </div>
            )}

            {/* Custom Created Branches */}
            {branches.map(branch => {
              const assignedStaff = users.filter(u => u.branchId === branch.id);
              const isActive = activeBranchId === branch.id;

              return (
                <div 
                  key={branch.id} 
                  className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isActive 
                      ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-200' 
                      : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 font-bold">
                      <Store className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-sm">{branch.name}</h4>
                        {isActive && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                            সক্রিয় শাখা
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                        {branch.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{branch.location}</span>
                          </span>
                        )}
                        {branch.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{branch.phone}</span>
                          </span>
                        )}
                      </div>

                      {/* Assigned Managers List */}
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-[11px] font-semibold text-slate-500">নিযুক্ত স্টাফ:</span>
                        {assignedStaff.length > 0 ? (
                          assignedStaff.map(st => (
                            <span 
                              key={st.id} 
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                st.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : 'bg-teal-100 text-teal-800'
                              }`}
                            >
                              {st.name} ({st.role === 'admin' ? 'অ্যাডমিন' : 'ম্যানেজার'})
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-amber-600 font-medium italic">
                            কোনো ম্যানেজার নেই ('ম্যানেজার তালিকা' থেকে যুক্ত করুন)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {!isActive && (
                      <button 
                        onClick={() => handleSwitchBranch(branch.id)}
                        className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1"
                        title="এই শাখার তথ্য পরিচালনা করুন"
                      >
                        <span>প্রবেশ করুন</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {currentUser.role === 'admin' && (
                      <>
                        <button 
                          onClick={() => handleOpenEdit(branch)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 border border-slate-200 rounded-lg transition"
                          title="শাখার তথ্য এডিট করুন"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleOpenDeleteModal(branch)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-lg transition cursor-pointer"
                          title="শাখা ডিলিট করুন"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Explanatory Guide */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs text-slate-600 space-y-1">
            <p className="font-bold text-slate-800 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span>সহজ নির্দেশনা:</span>
            </p>
            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-500 pl-1">
              <li>এখানে প্রথমে শুধু শাখার নাম ও লোকেশন দিয়ে ব্রাঞ্চ তৈরি করুন।</li>
              <li>এরপর <strong>"ম্যানেজার ও স্টাফ তালিকা"</strong> তে গিয়ে ব্রাঞ্চ সিলেক্ট করে প্রয়োজনীয় ম্যানেজার বা স্টাফ যুক্ত করুন।</li>
              <li>ম্যানেজারকে <strong>"ম্যানেজার"</strong> রোল দিলে সে শুধুমাত্র ঐ নির্দিষ্ট শাখার ইনভয়েস ও হিসাব পরিচালনা করতে পারবে।</li>
            </ul>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex justify-end">
          <button
            onClick={() => setActiveModal(null)}
            className="px-4 py-2 text-xs font-bold bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>

      {/* Admin Password Verification Modal for Branch Deletion */}
      {branchToDelete && (
        <div className="fixed inset-0 bg-black/70 z-[120] flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 p-5 sm:p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">শাখা মুছে ফেলতে অ্যাডমিন পাসওয়ার্ড</h3>
                  <p className="text-xs text-slate-500">অনুমোদনের জন্য অ্যাডমিন পাসওয়ার্ড নিশ্চিত করুন</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBranchToDelete(null);
                  setAdminPasswordInput('');
                  setDeleteErrorMsg('');
                }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3.5 space-y-1.5 text-xs text-rose-900">
              <div className="flex items-center gap-1.5 font-bold text-rose-700">
                <Store className="w-4 h-4" />
                <span>শাখা: {branchToDelete.name}</span>
              </div>
              {branchToDelete.location && (
                <p className="text-slate-600 text-[11px] pl-5">লোকেশন: {branchToDelete.location}</p>
              )}
              {(() => {
                const assigned = users.filter(u => u.branchId === branchToDelete.id);
                if (assigned.length > 0) {
                  return (
                    <p className="text-amber-800 font-semibold text-[11px] mt-1 bg-amber-50 border border-amber-200 rounded p-1.5">
                      ⚠️ সতর্কবার্তা: এই শাখায় {assigned.length} জন ম্যানেজার নিযুক্ত রয়েছে। শাখাটি মুছে দিলে তাদের শাখা অ্যাসাইনমেন্ট অপসারিত হবে।
                    </p>
                  );
                }
                return null;
              })()}
            </div>

            <form onSubmit={handleConfirmDelete} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  অ্যাডমিন পাসওয়ার্ড প্রদান করুন <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showDeletePassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="অ্যাডমিন পাসওয়ার্ড লিখুন..."
                    value={adminPasswordInput}
                    onChange={(e) => {
                      setAdminPasswordInput(e.target.value);
                      if (deleteErrorMsg) setDeleteErrorMsg('');
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 pr-10 text-xs font-mono focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showDeletePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {deleteErrorMsg && (
                  <p className="text-xs text-rose-600 font-semibold mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{deleteErrorMsg}</span>
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => {
                    setBranchToDelete(null);
                    setAdminPasswordInput('');
                    setDeleteErrorMsg('');
                  }}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm cursor-pointer transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'মুছে ফেলা হচ্ছে...' : 'পাসওয়ার্ড নিশ্চিত করে মুছুন'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
