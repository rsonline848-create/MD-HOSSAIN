#!/bin/bash
cat << 'INNER_EOF' > branch_modal_replacement.tsx
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, MapPin, Plus, Store, User, Lock, Trash2, LogIn, Edit2 } from 'lucide-react';
import { UserAccount } from '../types';

export const BranchModal: React.FC = () => {
  const { activeModal, setActiveModal, users, setUsers, forcePushToCloud, currentUser, logout } = useApp();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBranchId, setEditingBranchId] = useState<string | null>(null);
  
  const [branchName, setBranchName] = useState('');
  const [branchLocation, setBranchLocation] = useState('');
  const [managerUsername, setManagerUsername] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  
  if (activeModal !== 'branch') return null;

  const branches = users.filter(u => u.role === 'branch_manager');

  const handleAddOrEditBranch = () => {
    if (!branchName.trim() || !managerUsername.trim() || !managerPassword.trim()) {
      alert('অনুগ্রহ করে শাখার নাম, ম্যানেজারের ইউজারনেম এবং পাসওয়ার্ড দিন!');
      return;
    }
    
    if (editingBranchId) {
      // Check if username exists for OTHER users
      if (users.some(u => u.id !== editingBranchId && u.username.toLowerCase() === managerUsername.toLowerCase())) {
        alert('এই ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হচ্ছে। অন্য একটি দিন।');
        return;
      }

      const nextUsers = users.map(u => {
        if (u.id === editingBranchId) {
          return {
            ...u,
            name: branchName,
            username: managerUsername,
            pinOrPassword: managerPassword,
            branchLocation: branchLocation
          };
        }
        return u;
      });

      const updatedBranch = nextUsers.find(u => u.id === editingBranchId);
      if (updatedBranch) {
        const branchDocRef = doc(db, "shops", updatedBranch.branchId!); 
        setDoc(branchDocRef, { users: [updatedBranch], lastUpdatedBy: "admin", updatedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
      }

      setUsers(nextUsers);
      forcePushToCloud({ users: nextUsers });

    } else {
      // Check if username exists
      if (users.some(u => u.username.toLowerCase() === managerUsername.toLowerCase())) {
        alert('এই ইউজারনেমটি ইতিমধ্যে ব্যবহৃত হচ্ছে। অন্য একটি দিন।');
        return;
      }

      const newBranch: UserAccount = {
        id: 'user_' + Date.now(),
        name: branchName, // acts as Branch Name
        username: managerUsername,
        role: 'branch_manager',
        pinOrPassword: managerPassword,
        phone: '',
        isActive: true,
        createdAt: new Date().toISOString(),
        branchId: 'branch_' + Date.now(),
        branchLocation: branchLocation
      };

      const nextUsers = [...users, newBranch];
      const branchDocRef = doc(db, "shops", newBranch.branchId!); 
      setDoc(branchDocRef, { users: [newBranch], lastUpdatedBy: "admin", updatedAt: new Date().toISOString() }, { merge: true }).catch(console.error);
      
      setUsers(nextUsers);
      forcePushToCloud({ users: nextUsers });
    }
    
    setBranchName('');
    setBranchLocation('');
    setManagerUsername('');
    setManagerPassword('');
    setShowAddForm(false);
    setEditingBranchId(null);
  };

  const handleDeleteBranch = (id: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই শাখাটি ডিলিট করতে চান? (শাখার ডাটা আলাদা থাকবে, তবে ম্যানেজার লগইন করতে পারবেন না)')) return;
    const nextUsers = users.filter(u => u.id !== id);
    setUsers(nextUsers);
    forcePushToCloud({ users: nextUsers });
  };

  const handleEditClick = (branch: UserAccount) => {
    setBranchName(branch.name);
    setBranchLocation(branch.branchLocation || '');
    setManagerUsername(branch.username);
    setManagerPassword(branch.pinOrPassword);
    setEditingBranchId(branch.id);
    setShowAddForm(true);
  };

  const handleCancelForm = () => {
    setShowAddForm(false);
    setEditingBranchId(null);
    setBranchName('');
    setBranchLocation('');
    setManagerUsername('');
    setManagerPassword('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 my-8">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3 text-slate-800">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">ব্রাঞ্চ / শাখা পরিচালনা</h2>
              <p className="text-xs text-slate-500">আপনার সকল শাখা ও ব্রাঞ্চ ম্যানেজার নিয়ন্ত্রণ করুন</p>
            </div>
          </div>
          <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700 bg-white shadow-sm p-2 rounded-full border border-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {currentUser.role !== 'admin' ? (
            <div className="text-center py-10">
              <Store className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-700">শাখা: {currentUser.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{currentUser.branchLocation || 'কোনো লোকেশন দেওয়া নেই'}</p>
              <p className="text-xs text-rose-500 mt-4 bg-rose-50 p-2 rounded-lg inline-block">শুধুমাত্র অ্যাডমিন শাখা তৈরি ও মুছে ফেলতে পারবেন।</p>
            </div>
          ) : (
            <>
              {/* Branch List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-slate-700">বিদ্যমান শাখা সমূহ ({branches.length})</h3>
                  {!showAddForm && (
                    <button 
                      onClick={() => {
                        handleCancelForm();
                        setShowAddForm(true);
                      }}
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> নতুন শাখা
                    </button>
                  )}
                </div>
                
                {branches.length === 0 && !showAddForm && (
                  <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="text-sm text-slate-500">কোনো শাখা যোগ করা হয়নি</p>
                  </div>
                )}

                {branches.map(branch => (
                  <div key={branch.id} className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white border border-slate-200 p-4 rounded-xl hover:shadow-sm transition">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <Store className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-base">{branch.name}</h4>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs font-semibold text-slate-500">
                          <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {branch.branchLocation || 'N/A'}</span>
                          <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {branch.username}</span>
                          <span className="flex items-center gap-1"><Lock className="w-3.5 h-3.5" /> {branch.pinOrPassword}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEditClick(branch)}
                        className="text-indigo-500 hover:bg-indigo-50 p-2 rounded-lg transition"
                        title="ব্রাঞ্চ এডিট করুন"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDeleteBranch(branch.id)}
                        className="text-rose-500 hover:bg-rose-50 p-2 rounded-lg transition"
                        title="ব্রাঞ্চ মুছুন"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add/Edit Branch Form */}
              {showAddForm && (
                <div className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200 space-y-4 animate-in slide-in-from-top-4">
                  <h3 className="font-bold text-indigo-700 flex items-center gap-2 border-b border-slate-200 pb-2">
                    <Store className="w-4 h-4" /> {editingBranchId ? 'শাখা আপডেট করুন' : 'নতুন শাখা যুক্ত করুন'}
                  </h3>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1">শাখার নাম <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        value={branchName}
                        onChange={e => setBranchName(e.target.value)}
                        placeholder="যেমন: ঢাকা শাখা"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1">ঠিকানা / লোকেশন</label>
                      <input 
                        type="text" 
                        value={branchLocation}
                        onChange={e => setBranchLocation(e.target.value)}
                        placeholder="শাখার বিস্তারিত ঠিকানা"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1">ম্যানেজারের ইউজারনেম <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        value={managerUsername}
                        onChange={e => setManagerUsername(e.target.value)}
                        placeholder="লগইন আইডি"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-slate-700 block mb-1">লগইন পাসওয়ার্ড <span className="text-rose-500">*</span></label>
                      <input 
                        type="text" 
                        value={managerPassword}
                        onChange={e => setManagerPassword(e.target.value)}
                        placeholder="গোপন পিন/পাসওয়ার্ড"
                        className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button 
                      onClick={handleCancelForm}
                      className="px-4 py-2 text-sm font-bold text-slate-600 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 transition"
                    >
                      বাতিল
                    </button>
                    <button 
                      onClick={handleAddOrEditBranch}
                      className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 transition flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" /> {editingBranchId ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
INNER_EOF

mv branch_modal_replacement.tsx src/components/BranchModal.tsx
