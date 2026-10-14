import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldAlert, 
  KeyRound, 
  PhoneCall, 
  RefreshCw, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertTriangle,
  Building2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { toBengaliNumber, formatDate } from '../utils/formatters';

export const LicenseLockScreen: React.FC = () => {
  const { 
    license, 
    activateLicenseKey, 
    setIsLicenseManagerOpen,
    currentUser
  } = useApp();

  const [inputKey, setInputKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  // Admin emergency unlock PIN state
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [adminPin, setAdminPin] = useState('');
  const [adminPinError, setAdminPinError] = useState('');

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) {
      setFeedback({ type: 'error', message: 'অনুগ্রহ করে সঠিক লাইসেন্স কি লিখুন।' });
      return;
    }

    setIsActivating(true);
    setFeedback(null);

    try {
      const res = await activateLicenseKey(inputKey);
      if (res.success) {
        setFeedback({ type: 'success', message: res.message });
        setInputKey('');
      } else {
        setFeedback({ type: 'error', message: res.message });
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'লাইসেন্স যাচাইয়ে সমস্যা হয়েছে।' });
    } finally {
      setIsActivating(false);
    }
  };

  const handleAdminPinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPin === '102267' || adminPin === 'admin123' || (currentUser && currentUser.pinOrPassword === adminPin)) {
      setShowAdminPinModal(false);
      setAdminPin('');
      setAdminPinError('');
      setIsLicenseManagerOpen(true);
    } else {
      setAdminPinError('ভুল মাস্টার পাসওয়ার্ড! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।');
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-900/95 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-2xl border border-rose-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-rose-600 to-red-700 text-white p-6 text-center relative">
          <div className="w-16 h-16 bg-white/10 rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-inner border border-white/20">
            <Lock className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            সফটওয়্যার লাইসেন্সের মেয়াদ শেষ
          </h2>
          <p className="text-rose-100 text-xs sm:text-sm mt-1 font-medium">
            আপনার অ্যাপের নির্ধারিত লাইসেন্সের মেয়াদ শেষ হয়ে গেছে। নিরবচ্ছিন্ন সেবা চালু রাখতে লাইসেন্স রিনিউ করুন।
          </p>
        </div>

        {/* Body Content */}
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* Shop & License Details Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs sm:text-sm text-slate-700">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Building2 className="w-4 h-4 text-indigo-500" /> প্রতিষ্ঠানের নাম:
              </span>
              <span className="font-bold text-slate-800">{license.shopName || 'এম এল ইলেকট্রিক'}</span>
            </div>

            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <KeyRound className="w-4 h-4 text-amber-500" /> বর্তমান লাইসেন্স কি:
              </span>
              <span className="font-mono font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200 text-xs">
                {license.licenseKey}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                <Calendar className="w-4 h-4 text-rose-500" /> মেয়াদ শেষ হওয়ার তারিখ:
              </span>
              <span className="font-bold text-rose-600">
                {toBengaliNumber(formatDate(license.expiresAt?.split('T')[0] || '2026-09-15'))}
              </span>
            </div>
          </div>

          {/* Feedback Message */}
          {feedback && (
            <div className={`p-3 rounded-xl text-xs sm:text-sm flex items-start gap-2 ${
              feedback.type === 'success' 
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}>
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* License Key Activation Form */}
          <form onSubmit={handleActivate} className="space-y-3">
            <label className="block text-xs font-bold text-slate-700">
              নতুন লাইসেন্স কি প্রবেশ করান:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value.toUpperCase())}
                  placeholder="যেমন: RS-MLE-2027-XXXX"
                  className="w-full uppercase font-mono text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 text-slate-800"
                />
              </div>
              <button
                type="submit"
                disabled={isActivating || !inputKey.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
              >
                {isActivating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>সক্রিয় করুন</span>
              </button>
            </div>
          </form>

          {/* Support / Renewal Contact Box */}
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-center space-y-2">
            <p className="text-xs text-amber-900 font-medium">
              লাইসেন্স রিনিউ করতে বা নতুন কি সংগ্রহ করতে সফটওয়্যার প্রোভাইডারের সাথে যোগাযোগ করুন:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <a 
                href={`tel:${license.supportPhone || '01611814813'}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold rounded-lg transition shadow-xs"
              >
                <PhoneCall className="w-4 h-4" />
                <span>কল করুন: {license.supportPhone || '01611814813'}</span>
              </a>
              <a 
                href={`https://wa.me/88${license.supportPhone || '01611814813'}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold rounded-lg transition shadow-xs"
              >
                <span>হোয়াটসঅ্যাপ মেসেজ</span>
              </a>
            </div>
            <p className="text-[11px] text-slate-500 pt-1">
              সফটওয়্যার পার্টনার: <span className="font-bold text-slate-700">{license.providerName || 'RS ONLINE'}</span>
            </p>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="text-slate-500 hover:text-indigo-600 font-medium flex items-center gap-1 hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>রিফ্রেশ / পুনরায় যাচাই</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAdminPinModal(true)}
              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>মাস্টার এডমিন লগইন</span>
            </button>
          </div>

        </div>

      </div>

      {/* Admin Master Unlock PIN Modal */}
      {showAdminPinModal && (
        <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl mx-auto flex items-center justify-center mb-2">
                <KeyRound className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-800">মাস্টার এডমিন পাসওয়ার্ড</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                লাইসেন্স কন্ট্রোল প্যানেলে ঢুকতে এডমিন পাসওয়ার্ড বা মাস্টার পিন দিন
              </p>
            </div>

            <form onSubmit={handleAdminPinSubmit} className="space-y-3">
              <input
                type="password"
                autoFocus
                value={adminPin}
                onChange={(e) => {
                  setAdminPin(e.target.value);
                  setAdminPinError('');
                }}
                placeholder="মাস্টার পাসওয়ার্ড দিন..."
                className="w-full px-3 py-2 text-center text-lg tracking-widest font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />

              {adminPinError && (
                <p className="text-xs text-rose-600 font-medium text-center">{adminPinError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdminPinModal(false);
                    setAdminPin('');
                    setAdminPinError('');
                  }}
                  className="flex-1 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer"
                >
                  প্রবেশ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
