import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Settings, Mail, Send, KeyRound, Languages, Check } from 'lucide-react';
import { SMTPSettings } from '../types';

export const SettingsModal: React.FC = () => {
  const { 
    activeModal, 
    setActiveModal, 
    smtpSettings, 
    setSmtpSettings, 
    forcePushToCloud, 
    currentUser,
    language,
    setLanguage,
    t
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
    setSaveStatus(language === 'bn' ? 'সেটিংস সফলভাবে সেভ হয়েছে!' : 'Settings saved successfully!');
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleTestEmail = async () => {
    if (!formData.testEmail) {
      setTestEmailStatus(language === 'bn' ? 'টেস্ট ইমেইল ঠিকানা দিন!' : 'Please enter a test email address!');
      setTimeout(() => setTestEmailStatus(null), 3000);
      return;
    }
    
    setTestEmailStatus(language === 'bn' ? 'টেস্ট ইমেইল পাঠানো হচ্ছে...' : 'Sending test email...');
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
        setTestEmailStatus(language === 'bn' ? 'টেস্ট ইমেইল সফলভাবে পাঠানো হয়েছে!' : 'Test email sent successfully!');
      } else {
        setTestEmailStatus(`${language === 'bn' ? 'সমস্যা:' : 'Error:'} ${data.error || (language === 'bn' ? 'ইমেইল পাঠানো যায়নি' : 'Failed to send email')}`);
      }
    } catch (error: any) {
      setTestEmailStatus(`${language === 'bn' ? 'সমস্যা:' : 'Error:'} ${error.message || (language === 'bn' ? 'সার্ভারের সাথে কানেক্ট করা যায়নি' : 'Could not connect to server')}`);
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
              <h2 className="text-lg font-bold">
                {language === 'bn' ? 'সিস্টেম সেটিংস' : 'System Settings'}
              </h2>
              <p className="text-xs text-slate-500">
                {language === 'bn' ? 'ভাষা নির্বাচন ও ইমেইল নোটিফিকেশন কনফিগারেশন' : 'Language selection, email notifications & configurations'}
              </p>
            </div>
          </div>
          <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-700 bg-white shadow-sm p-2 rounded-full border border-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-6 max-h-[70vh] overflow-y-auto">

          {/* ======================================================== */}
          {/* Language Selection Section (ভাষা নির্বাচন) */}
          {/* ======================================================== */}
          <div className="border border-indigo-200 bg-gradient-to-br from-indigo-50/50 to-white rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
                  <Languages className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                    {language === 'bn' ? 'ভাষা নির্বাচন (Select Language)' : 'Select Language / ভাষা নির্বাচন'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === 'bn' 
                      ? 'পছন্দের ভাষা সিলেক্ট করলেই সাথে সাথে পুরো অ্যাপ সেই ভাষায় রূপান্তরিত হবে।' 
                      : 'Choose your preferred language. The entire app will switch immediately.'}
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-300">
                {language === 'bn' ? '🇧🇩 বাংলা সক্রিয়' : '🇺🇸 English Active'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-3">
              {/* Option 1: বাংলা (Bangla) */}
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${
                  language === 'bn'
                    ? 'bg-emerald-50/70 border-emerald-600 text-slate-900 shadow-sm ring-2 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-emerald-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl select-none">🇧🇩</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base text-slate-900">বাংলা (Bangla)</span>
                      {language === 'bn' && (
                        <span className="text-[10px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded">সক্রিয়</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      মেনু, ইনভয়েস, স্টক ও হিসাব সম্পূর্ণ বাংলায়
                    </p>
                  </div>
                </div>
                {language === 'bn' && (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </button>

              {/* Option 2: English */}
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl border-2 transition-all cursor-pointer text-left ${
                  language === 'en'
                    ? 'bg-indigo-50/70 border-indigo-600 text-slate-900 shadow-sm ring-2 ring-indigo-500/20'
                    : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl select-none">🇺🇸</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-base text-slate-900">English</span>
                      {language === 'en' && (
                        <span className="text-[10px] font-bold bg-indigo-600 text-white px-1.5 py-0.5 rounded">Active</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Menus, Invoices, Stock & Reports in English
                    </p>
                  </div>
                </div>
                {language === 'en' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 stroke-[3]" />
                  </div>
                )}
              </button>
            </div>
          </div>

          {/* SMTP Configuration Section */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-600" />
              <h3 className="font-bold text-slate-700 text-sm">
                {language === 'bn' ? 'SMTP কনফিগারেশন (ইমেইল সেটিংস)' : 'SMTP Configuration (Email Settings)'}
              </h3>
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
              {language === 'bn' ? 'বাতিল' : 'Cancel'}
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl shadow-md shadow-indigo-200 hover:bg-indigo-700 transition"
            >
              {language === 'bn' ? 'সেভ করুন' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
