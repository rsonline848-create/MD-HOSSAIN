import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  X, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  Calendar, 
  Clock, 
  Check, 
  Copy, 
  RefreshCw, 
  Lock, 
  Unlock, 
  Cloud, 
  CheckCircle2, 
  PhoneCall, 
  Sparkles,
  Award,
  Building2,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { toBengaliNumber, formatDate } from '../utils/formatters';
import { generateNewLicenseKey } from '../services/licenseService';
import { AppLicense } from '../types';

export const LicenseModal: React.FC = () => {
  const { 
    license, 
    updateLicense, 
    activateLicenseKey,
    isLicenseManagerOpen, 
    setIsLicenseManagerOpen,
    isLicenseExpired,
    licenseDaysLeft,
    currentUser
  } = useApp();

  // Master key unlock state: default false so normal customers only see validity details
  const [isMasterUnlocked, setIsMasterUnlocked] = useState(false);
  const [showMasterPinPrompt, setShowMasterPinPrompt] = useState(false);
  const [masterPin, setMasterPin] = useState('');
  const [masterPinError, setMasterPinError] = useState('');

  // Customer key activation state
  const [customerKeyInput, setCustomerKeyInput] = useState('');
  const [isActivatingCustomerKey, setIsActivatingCustomerKey] = useState(false);
  const [customerFeedback, setCustomerFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Admin form state
  const [formData, setFormData] = useState<AppLicense>(() => ({ ...license }));
  const [copiedKey, setCopiedKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Sync formData whenever license changes
  useEffect(() => {
    setFormData({ ...license });
  }, [license]);

  // Reset master unlock state when modal closes
  const handleClose = () => {
    setIsLicenseManagerOpen(false);
    setShowMasterPinPrompt(false);
    setMasterPin('');
    setMasterPinError('');
    setCustomerFeedback(null);
    setAdminFeedback(null);
  };

  if (!isLicenseManagerOpen) return null;

  // Verify Master Key
  const handleMasterPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPin = masterPin.trim();
    // Master key: 102267 or ADMIN-UNLOCK or user's password if admin
    if (
      cleanPin === '102267' || 
      cleanPin.toUpperCase() === 'ADMIN-UNLOCK' || 
      cleanPin.toUpperCase() === 'RS-ADMIN' ||
      (currentUser && currentUser.pinOrPassword === cleanPin)
    ) {
      setIsMasterUnlocked(true);
      setShowMasterPinPrompt(false);
      setMasterPin('');
      setMasterPinError('');
    } else {
      setMasterPinError('ভুল মাস্টার কি! অনুগ্রহ করে সঠিক মাস্টার কি দিয়ে চেষ্টা করুন।');
    }
  };

  // Customer Activate Key
  const handleCustomerKeyActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerKeyInput.trim()) {
      setCustomerFeedback({ type: 'error', text: 'অনুগ্রহ করে লাইসেন্স কি প্রদান করুন।' });
      return;
    }
    setIsActivatingCustomerKey(true);
    setCustomerFeedback(null);
    try {
      const res = await activateLicenseKey(customerKeyInput.trim());
      if (res.success) {
        setCustomerFeedback({ type: 'success', text: res.message });
        setCustomerKeyInput('');
      } else {
        setCustomerFeedback({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setCustomerFeedback({ type: 'error', text: err.message || 'লাইসেন্স যাচাইয়ে সমস্যা হয়েছে।' });
    } finally {
      setIsActivatingCustomerKey(false);
    }
  };

  // Quick extension helper for Admin
  const handleQuickExtend = (days: number) => {
    const currentExpiry = new Date(formData.expiresAt || new Date());
    const baseDate = currentExpiry.getTime() > Date.now() ? currentExpiry : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    
    setFormData(prev => ({
      ...prev,
      expiresAt: baseDate.toISOString(),
      status: 'active'
    }));
  };

  const handleLifetime = () => {
    const farDate = new Date();
    farDate.setFullYear(farDate.getFullYear() + 25);
    setFormData(prev => ({
      ...prev,
      planName: 'আজীবন লাইসেন্স (Lifetime Plan)',
      expiresAt: farDate.toISOString(),
      status: 'active'
    }));
  };

  const handleCopyCurrentKey = () => {
    const keyToCopy = formData.licenseKey || license.licenseKey;
    if (keyToCopy) {
      navigator.clipboard.writeText(keyToCopy);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleGenerateKey = (type: 'annual' | 'lifetime' | 'monthly') => {
    const newKey = generateNewLicenseKey(type);
    setFormData(prev => ({
      ...prev,
      licenseKey: newKey,
      planName: type === 'lifetime' ? 'আজীবন লাইসেন্স (Lifetime)' : type === 'monthly' ? 'মাসিক লাইসেন্স (Monthly)' : '১ বছর মেয়াদী (Annual)'
    }));
  };

  const handleSaveToCloud = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setAdminFeedback(null);

    try {
      await updateLicense(formData);
      setAdminFeedback({ type: 'success', text: 'ক্লাউডে লাইসেন্স সফলভাবে সংরক্ষিত ও আপডেট হয়েছে!' });
      setTimeout(() => {
        setAdminFeedback(null);
      }, 4000);
    } catch (err: any) {
      setAdminFeedback({ type: 'error', text: err.message || 'ক্লাউডে লাইসেন্স সংরক্ষণে ব্যর্থ হয়েছে।' });
    } finally {
      setIsSaving(false);
    }
  };

  const expiryDateOnly = formData.expiresAt?.split('T')[0] || license.expiresAt?.split('T')[0] || '2026-09-15';

  return (
    <div className="fixed inset-0 z-[10001] bg-black/65 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95">
        
        {/* ========================================================================= */}
        {/* 1. VIEW MODE: CUSTOMER VIEW (গ্রাহকের সাধারণ ভিউ - শুধু মেয়াদের তথ্য)     */}
        {/* ========================================================================= */}
        {!isMasterUnlocked ? (
          <div>
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold">সফটওয়্যার লাইসেন্স বিবরণী</h3>
                  <p className="text-xs text-indigo-200">
                    {license.shopName || 'এম এল ইলেকট্রিক'} - সাবস্ক্রিপশন স্ট্যাটাস
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Body */}
            <div className="p-4 sm:p-6 space-y-4">
              
              {/* Primary 3-Card Summary: Status, Days Left, Expiry Date */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. Status */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center sm:text-left">
                  <span className="text-xs text-slate-500 font-medium block">বর্তমান স্ট্যাটাস</span>
                  <div className="mt-1.5 flex items-center justify-center sm:justify-start gap-1.5">
                    {license.status === 'active' && !isLicenseExpired ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> সক্রিয় (Active)
                      </span>
                    ) : license.status === 'suspended' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <Lock className="w-3.5 h-3.5 text-amber-600" /> স্থগিত (Suspended)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> মেয়াদ শেষ (Expired)
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Days Left (High Focus) */}
                <div className="bg-indigo-50/80 border border-indigo-200 rounded-xl p-3.5 text-center sm:text-left">
                  <span className="text-xs text-indigo-700 font-medium block">অবশিষ্ট সময়</span>
                  <p className="mt-1 text-base sm:text-lg font-black text-indigo-900">
                    {isLicenseExpired ? (
                      <span className="text-rose-600">০ দিন (মেয়াদ শেষ)</span>
                    ) : (
                      <span>{toBengaliNumber(licenseDaysLeft)} দিন বাকি</span>
                    )}
                  </p>
                </div>

                {/* 3. Expiration Date */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-center sm:text-left">
                  <span className="text-xs text-slate-500 font-medium block">মেয়াদ শেষ হওয়ার তারিখ</span>
                  <p className="mt-1 text-sm sm:text-base font-bold text-slate-800">
                    {toBengaliNumber(formatDate(expiryDateOnly))}
                  </p>
                </div>
              </div>

              {/* Detail Items Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs sm:text-sm text-slate-700">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-slate-400" /> প্রতিষ্ঠানের নাম:
                  </span>
                  <span className="font-bold text-slate-800">{license.shopName || 'এম এল ইলেকট্রিক'}</span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-500" /> সাবস্ক্রিপশন প্ল্যান:
                  </span>
                  <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {license.planName || '১ বছর মেয়াদী (Annual Plan)'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-amber-500" /> লাইসেন্স কি:
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                      {license.licenseKey}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyCurrentKey}
                      className="text-indigo-600 hover:text-indigo-800 p-1 hover:bg-indigo-50 rounded transition cursor-pointer"
                      title="কি কপি করুন"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Feedback Alert */}
              {customerFeedback && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  customerFeedback.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  {customerFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{customerFeedback.text}</span>
                </div>
              )}

              {/* Customer Key Entry (If customer received a new renewal key) */}
              <form onSubmit={handleCustomerKeyActivate} className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  নতুন লাইসেন্স কি দিয়ে মেয়াদ বাড়ান:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customerKeyInput}
                    onChange={(e) => setCustomerKeyInput(e.target.value.toUpperCase())}
                    placeholder="যেমন: RS-MLE-2027-XXXX"
                    className="flex-1 uppercase font-mono text-xs sm:text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isActivatingCustomerKey || !customerKeyInput.trim()}
                    className="px-3 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {isActivatingCustomerKey ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>সক্রিয় করুন</span>
                  </button>
                </div>
              </form>

              {/* Provider Contact Information */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3.5 text-center space-y-2">
                <p className="text-xs text-amber-950 font-medium">
                  লাইসেন্স নবায়ন বা যেকোনো কারিগরি সহায়তায় যোগাযোগ করুন:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <a 
                    href={`tel:${license.supportPhone || '01611814813'}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition shadow-xs"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    <span>কল: {license.supportPhone || '01611814813'}</span>
                  </a>
                  <a 
                    href={`https://wa.me/88${license.supportPhone || '01611814813'}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>হোয়াটসঅ্যাপ</span>
                  </a>
                </div>
                <p className="text-[11px] text-slate-500">
                  সফটওয়্যার প্রোভাইডার: <span className="font-bold text-slate-700">{license.providerName || 'RS ONLINE'}</span>
                </p>
              </div>

              {/* Bottom Actions: Close & Master Key Login Trigger */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowMasterPinPrompt(true)}
                  className="text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>মাস্টার কি দিয়ে আনলক করুন</span>
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  বন্ধ করুন
                </button>
              </div>

            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* 2. MASTER ADMIN EDIT MODE (মাস্টার কি দিয়ে আনলক হওয়ার পর পূর্ণ প্যানেল)  */
          /* ========================================================================= */
          <div>
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 sm:p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                  <Award className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold">ক্লাউড লাইসেন্স ও সাবস্ক্রিপশন কন্ট্রোল</h3>
                    <span className="bg-amber-400/20 text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-300/30">
                      মাস্টার এডমিন
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200">
                    অনলাইন লাইসেন্স ম্যানেজমেন্ট এবং রিমোট ভ্যালিডেশন
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsMasterUnlocked(false)}
                  className="text-xs font-medium text-slate-300 hover:text-white px-2 py-1 rounded hover:bg-white/10 transition cursor-pointer flex items-center gap-1"
                  title="গ্রাহক ভিউতে ফিরে যান"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">লক করুন</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Master Admin Form */}
            <form onSubmit={handleSaveToCloud} className="p-4 sm:p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              
              {/* Feedback Message */}
              {adminFeedback && (
                <div className={`p-3 rounded-xl text-xs sm:text-sm flex items-center gap-2 ${
                  adminFeedback.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-medium">{adminFeedback.text}</span>
                </div>
              )}

              {/* Status Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <span className="text-xs text-slate-500 font-medium block">বর্তমান স্ট্যাটাস</span>
                  <div className="mt-1 flex items-center gap-2">
                    {formData.status === 'active' && !isLicenseExpired ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> সক্রিয় (Active)
                      </span>
                    ) : formData.status === 'suspended' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        <Lock className="w-3.5 h-3.5 text-amber-600" /> স্থগিত (Suspended)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> মেয়াদ শেষ (Expired)
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <span className="text-xs text-slate-500 font-medium block">অবশিষ্ট সময়</span>
                  <p className="mt-1 text-sm font-extrabold text-slate-800">
                    {isLicenseExpired ? (
                      <span className="text-rose-600">০ দিন (মেয়াদ শেষ)</span>
                    ) : (
                      <span className="text-indigo-600">
                        {toBengaliNumber(licenseDaysLeft)} দিন বাকি
                      </span>
                    )}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <span className="text-xs text-slate-500 font-medium block">মেয়াদ উত্তীর্ণের তারিখ</span>
                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {toBengaliNumber(formatDate(expiryDateOnly))}
                  </p>
                </div>
              </div>

              {/* Quick Validity Extenders */}
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" /> দ্রুত মেয়াদ বৃদ্ধি করুন:
                  </span>
                  <span className="text-[11px] text-indigo-600">এক ক্লিকে মেয়াদ যুক্ত হবে</span>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(30)}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 shadow-xs transition cursor-pointer"
                  >
                    + ৩০ দিন (১ মাস)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(180)}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 shadow-xs transition cursor-pointer"
                  >
                    + ১৮০ দিন (৬ মাস)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickExtend(365)}
                    className="px-3 py-1.5 bg-white hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 shadow-xs transition cursor-pointer"
                  >
                    + ৩৬৫ দিন (১ বছর)
                  </button>
                  <button
                    type="button"
                    onClick={handleLifetime}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition cursor-pointer"
                  >
                    আজীবন (Lifetime)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, status: p.status === 'suspended' ? 'active' : 'suspended' }))}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition cursor-pointer ${
                      formData.status === 'suspended'
                        ? 'bg-emerald-600 text-white border-emerald-700'
                        : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                    }`}
                  >
                    {formData.status === 'suspended' ? 'লক মুক্ত করুন (Activate)' : 'লক / স্থগিত করুন (Suspend)'}
                  </button>
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* License Key */}
                <div className="sm:col-span-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-700 flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-slate-500" /> সক্রিয় লাইসেন্স কি (License Key):
                    </label>
                    <button
                      type="button"
                      onClick={handleCopyCurrentKey}
                      className="text-slate-500 hover:text-indigo-600 flex items-center gap-1 font-medium cursor-pointer"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'কপি হয়েছে' : 'কপি করুন'}</span>
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.licenseKey}
                      onChange={(e) => setFormData({ ...formData, licenseKey: e.target.value.toUpperCase() })}
                      className="flex-1 font-mono uppercase font-bold text-sm px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleGenerateKey('annual')}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition border border-slate-300 flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>নতুন কি</span>
                    </button>
                  </div>
                </div>

                {/* Expiration Date Input */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" /> মেয়াদ শেষ হওয়ার তারিখ:
                  </label>
                  <input
                    type="date"
                    value={expiryDateOnly}
                    onChange={(e) => {
                      const d = new Date(e.target.value);
                      d.setHours(23, 59, 59, 999);
                      setFormData({ ...formData, expiresAt: d.toISOString() });
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Status Select */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">লাইসেন্স স্ট্যাটাস:</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">সক্রিয় (Active)</option>
                    <option value="expired">মেয়াদ শেষ (Expired)</option>
                    <option value="suspended">স্থগিত / লক (Suspended)</option>
                    <option value="trial">ট্রায়াল (Trial)</option>
                  </select>
                </div>

                {/* Plan Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">প্ল্যানের নাম:</label>
                  <input
                    type="text"
                    value={formData.planName || ''}
                    onChange={(e) => setFormData({ ...formData, planName: e.target.value })}
                    placeholder="১ বছর মেয়াদী / আজীবন"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Shop Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">দোকান / প্রতিষ্ঠানের নাম:</label>
                  <input
                    type="text"
                    value={formData.shopName || ''}
                    onChange={(e) => setFormData({ ...formData, shopName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Provider Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">সফটওয়্যার প্রোভাইডার:</label>
                  <input
                    type="text"
                    value={formData.providerName || ''}
                    onChange={(e) => setFormData({ ...formData, providerName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Support Phone */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 flex items-center gap-1.5">
                    <PhoneCall className="w-3.5 h-3.5 text-slate-500" /> প্রোভাইডারের হটলাইন নম্বর:
                  </label>
                  <input
                    type="text"
                    value={formData.supportPhone || ''}
                    onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Cloud Sync Notice */}
              <div className="bg-slate-100 rounded-xl p-3 text-[11px] text-slate-600 flex items-start gap-2">
                <Cloud className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <span>
                  তথ্য পরিবর্তন করে <strong>"ক্লাউডে সেভ করুন"</strong> বাটনে ক্লিক করলে তা সরাসরি গুগল ক্লাউড ফায়ারবেস (Firestore) এ জমা হবে এবং অবিলম্বে সকল ডিভাইসে কার্যকর হবে।
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  বন্ধ করুন
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4" />
                  )}
                  <span>ক্লাউডে সেভ করুন</span>
                </button>
              </div>

            </form>
          </div>
        )}

      </div>

      {/* Master Pin Verification Prompt Modal */}
      {showMasterPinPrompt && (
        <div className="fixed inset-0 z-[10002] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">মাস্টার এডমিন ভেরিফিকেশন</h3>
              <p className="text-xs text-slate-500 mt-1">
                লাইসেন্স কন্ট্রোল প্যানেল পরিবর্তন ও মেয়াদ বৃদ্ধির জন্য মাস্টার কি বা পাসওয়ার্ড দিন:
              </p>
            </div>

            <form onSubmit={handleMasterPinSubmit} className="space-y-3">
              <input
                type="password"
                autoFocus
                value={masterPin}
                onChange={(e) => {
                  setMasterPin(e.target.value);
                  setMasterPinError('');
                }}
                placeholder="মাস্টার কি প্রবেশ করান..."
                className="w-full px-3 py-2.5 text-center text-lg tracking-widest font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
              />

              {masterPinError && (
                <p className="text-xs text-rose-600 font-medium text-center">{masterPinError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowMasterPinPrompt(false);
                    setMasterPin('');
                    setMasterPinError('');
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={!masterPin.trim()}
                  className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition cursor-pointer"
                >
                  আনলক করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
