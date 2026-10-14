import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Settings, Mail, Send, Award, KeyRound, ShieldCheck, ShieldAlert, Sparkles, ExternalLink } from 'lucide-react';
import { SMTPSettings } from '../types';
import { toBengaliNumber, formatDate } from '../utils/formatters';

export const SettingsModal: React.FC = () => {
  const { 
    activeModal, 
    setActiveModal, 
    smtpSettings, 
    setSmtpSettings, 
    forcePushToCloud, 
    currentUser,
    license,
    setIsLicenseManagerOpen,
    isLicenseExpired,
    licenseDaysLeft
  } = useApp();
  
  const [formData, setFormData] = useState<SMTPSettings>({
    enabled: false,
    host: 'smtp.gmail.com',
    port: '587',
    encryption: 'TLS',
    username: '',
    password: '',
    fromAddress: '',
    fromName: '',
    testEmail: ''
  });

  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [testEmailStatus, setTestEmailStatus] = useState<string | null>(null);

  useEffect(() => {
    if (smtpSettings) {
      setFormData(smtpSettings);
    }
  }, [smtpSettings]);

  if (activeModal !== 'settings') return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    // Clear statuses on change
    setSaveStatus(null);
    setTestEmailStatus(null);
  };

  const handleSave = () => {
    setSmtpSettings(formData);
    localStorage.setItem('ML_ELECTRIC_SMTP', JSON.stringify(formData));
    forcePushToCloud({ smtpSettings: formData });
    setSaveStatus('SMTP সেটিংস সফলভাবে সেভ হয়েছে!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleTestEmail = async () => {
    if (!formData.testEmail) {
      setTestEmailStatus('টেস্ট ইমেইল ঠিকানা দিন!');
      setTimeout(() => setTestEmailStatus(null), 3000);
      return;
    }
    
    setTestEmailStatus('টেস্ট ইমেইল পাঠানো হচ্ছে...');
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setTestEmailStatus('টেস্ট ইমেইল সফলভাবে পাঠানো হয়েছে!');
      } else {
        setTestEmailStatus(`সমস্যা: ${data.error || 'ইমেইল পাঠানো যায়নি'}`);
      }
    } catch (error: any) {
      setTestEmailStatus(`সমস্যা: ${error.message || 'সার্ভারের সাথে কানেক্ট করা যায়নি'}`);
    }
    
    setTimeout(() => setTestEmailStatus(null), 5000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 my-8">
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
          <div className="flex items-center gap-3 text-slate-800">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Settings className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold">সিস্টেম সেটিংস</h2>
              <p className="text-xs text-slate-500">ইমেইল নোটিফিকেশন ও অন্যান্য কনফিগারেশন</p>
            </div>
          </div>
          <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700 bg-white shadow-sm p-2 rounded-full border border-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Cloud License & Subscription Section */}
          <div className="border border-indigo-200 bg-gradient-to-br from-indigo-50/60 to-purple-50/40 rounded-xl overflow-hidden shadow-xs">
            <div className="bg-indigo-900 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-300" />
                <h3 className="font-bold text-sm">সফটওয়্যার ক্লাউড লাইসেন্স ও সাবস্ক্রিপশন</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLicenseManagerOpen(true)}
                className="bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>লাইসেন্স নিয়ন্ত্রণ প্যানেল</span>
                <ExternalLink className="w-3 h-3 ml-0.5" />
              </button>
            </div>
            
            <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded-lg border border-indigo-100">
                <span className="text-xs text-slate-500 font-medium block">বর্তমান অবস্থা</span>
                <div className="mt-1 flex items-center gap-1.5 font-bold text-sm">
                  {license.status === 'active' && !isLicenseExpired ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" /> সক্রিয় (Active)
                    </span>
                  ) : (
                    <span className="text-rose-600 flex items-center gap-1">
                      <ShieldAlert className="w-4 h-4 text-rose-600" /> মেয়াদ শেষ (Expired)
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-indigo-100">
                <span className="text-xs text-slate-500 font-medium block">অবশিষ্ট সময়</span>
                <p className="mt-1 font-bold text-sm text-indigo-900">
                  {isLicenseExpired ? '০ দিন (মেয়াদ উত্তীর্ণ)' : `${toBengaliNumber(licenseDaysLeft)} দিন বাকি`}
                </p>
              </div>

              <div className="bg-white p-3 rounded-lg border border-indigo-100">
                <span className="text-xs text-slate-500 font-medium block">মেয়াদ উত্তীর্ণের তারিখ</span>
                <p className="mt-1 font-bold text-sm text-slate-800">
                  {toBengaliNumber(formatDate(license.expiresAt?.split('T')[0] || '2026-09-15'))}
                </p>
              </div>
            </div>
          </div>

          {/* SMTP Configuration Section */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-600" />
              <h3 className="font-bold text-slate-700 text-sm">SMTP configuration (ইমেইল সেটিংস)</h3>
            </div>
            
            <div className="p-4 space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="enabled"
                  checked={formData.enabled}
                  onChange={handleChange}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span className="text-sm font-semibold text-slate-700">Enable outbound email notifications from this app</span>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-1">
                  <label className="text-sm font-bold text-slate-700">SMTP host <span className="text-red-500">*</span></label>
                  <p className="text-xs text-slate-500">SMTP server hostname</p>
                </div>
                <div className="md:col-span-3">
                  <input type="text" name="host" value={formData.host} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-1">
                  <label className="text-sm font-bold text-slate-700">SMTP port <span className="text-red-500">*</span></label>
                  <p className="text-xs text-slate-500">587 for TLS, 465 for SSL</p>
                </div>
                <div className="md:col-span-3">
                  <input type="text" name="port" value={formData.port} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-1">
                  <label className="text-sm font-bold text-slate-700">SMTP encryption <span className="text-red-500">*</span></label>
                  <p className="text-xs text-slate-500">Encryption for the SMTP connection</p>
                </div>
                <div className="md:col-span-3">
                  <select name="encryption" value={formData.encryption} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                    <option value="TLS">TLS</option>
                    <option value="SSL">SSL</option>
                    <option value="None">None</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-1">
                  <label className="text-sm font-bold text-slate-700">SMTP username <span className="text-red-500">*</span></label>
                  <p className="text-xs text-slate-500">Account used for SMTP authentication</p>
                </div>
                <div className="md:col-span-3">
                  <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-1">
                  <label className="text-sm font-bold text-slate-700">SMTP password <span className="text-red-500">*</span></label>
                  <p className="text-xs text-slate-500">Use an app password for Gmail</p>
                </div>
                <div className="md:col-span-3">
                  <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-1">
                  <label className="text-sm font-bold text-slate-700">From address <span className="text-red-500">*</span></label>
                  <p className="text-xs text-slate-500">Envelope sender for outgoing mail</p>
                </div>
                <div className="md:col-span-3">
                  <input type="email" name="fromAddress" value={formData.fromAddress} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-1">
                  <label className="text-sm font-bold text-slate-700">From name</label>
                  <p className="text-xs text-slate-500">Display name on outgoing mail</p>
                </div>
                <div className="md:col-span-3">
                  <input type="text" name="fromName" value={formData.fromName} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-1">
                  <label className="text-sm font-bold text-slate-700">Default test email</label>
                  <p className="text-xs text-slate-500">Default recipient; also used if you save with "Send test after save"</p>
                </div>
                <div className="md:col-span-3">
                  <input type="email" name="testEmail" value={formData.testEmail} onChange={handleChange} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
            </div>
            
            {/* Test Email Section */}
            <div className="border-t border-slate-200">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-emerald-700 text-sm">Test email (saved SMTP settings)</h3>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div className="md:col-span-1">
                  <label className="text-sm font-bold text-slate-700">Test recipient</label>
                  <p className="text-xs text-slate-500">Uses the last saved SMTP configuration</p>
                </div>
                <div className="md:col-span-3 flex gap-2">
                  <input type="email" value={formData.testEmail} readOnly className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none text-slate-500" />
                  <button onClick={handleTestEmail} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
                    <Send className="w-4 h-4" /> Send test
                  </button>
                </div>
                {testEmailStatus && (
                  <div className="md:col-span-4 mt-2">
                    <p className="text-sm font-bold text-indigo-600">{testEmailStatus}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Configuration Help Section */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-600" />
              <h3 className="font-bold text-slate-700 text-sm">Configuration help</h3>
            </div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-2">Gmail</h4>
                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                  <li>SMTP host: smtp.gmail.com</li>
                  <li>Port: 587, encryption: TLS</li>
                  <li>Use an app password, not your normal login password</li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm mb-2">Outlook / Hotmail</h4>
                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                  <li>SMTP host: smtp-mail.outlook.com</li>
                  <li>Port: 587, encryption: TLS</li>
                  <li>Usually works with the regular account password</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-b-2xl">
          <div>
            {saveStatus && <span className="text-sm font-bold text-emerald-600">{saveStatus}</span>}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setActiveModal(null)}
              className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-white border border-slate-300 rounded-xl shadow-sm hover:bg-slate-50 transition"
            >
              বাতিল
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl shadow-md shadow-indigo-200 hover:bg-indigo-700 transition"
            >
              সেভ করুন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
