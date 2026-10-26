import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Lock, 
  User, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  LogIn, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  Phone
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, users } = useApp();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!username.trim()) {
      setErrorMessage('অনুগ্রহ করে ইউজারনেম বা মোবাইল নম্বর দিন!');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('অনুগ্রহ করে পাসওয়ার্ড বা পিন কোড দিন!');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(username.trim(), password.trim());
      if (!result.success) {
        setErrorMessage(result.message || 'ভুল ইউজারনেম অথবা পাসওয়ার্ড!');
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage('লগইন প্রক্রিয়ায় সমস্যা হয়েছে, আবার চেষ্টা করুন।');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen whatsapp-bg flex flex-col justify-center items-center p-4 selection:bg-indigo-500 selection:text-white">

      {/* Main Login Card */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header Branding */}
        <div className="text-center space-y-1 pb-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center gap-2">
            <span className="text-indigo-600">RS ONLINE</span> <span>ERP</span>
          </h1>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in shake">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Username / Phone */}
          <div>
            <label className="text-[15px] font-bold text-slate-700 block mb-1.5">
              ইউজারনেম / মোবাইল নম্বর / আইডি
            </label>
            <input
              type="text"
              required
              placeholder="ইউজারনেম বা মোবাইল নম্বর লিখুন"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (errorMessage) setErrorMessage('');
              }}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition"
            />
          </div>

          {/* Password / PIN */}
          <div>
            <label className="text-[15px] font-bold text-slate-700 block mb-1.5">
              পাসওয়ার্ড
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="পাসওয়ার্ড লিখুন"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2.5 pr-10 text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                title={showPassword ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                ) : (
                  <Eye className="w-4 h-4 text-slate-400 hover:text-slate-600" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white py-3 rounded-xl text-sm sm:text-base font-bold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>লগইন হচ্ছে...</span>
                </div>
              ) : (
                <>
                  <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>লগইন</span>
                </>
              )}
            </button>
          </div>

        </form>


        {/* Footer info */}
        <div className="text-center pt-1">
          <p className="text-[11px] font-medium text-slate-400">
            © 2026 RS ONLINE
          </p>
        </div>

      </div>

    </div>
  );
};
