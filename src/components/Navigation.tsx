import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TabType } from '../types';
import { 
  LayoutDashboard, 
  FileText, 
  HandCoins, 
  ShoppingCart, 
  CalendarRange, 
  Users, 
  Truck, 
  Receipt, 
  Calculator, 
  Trash2, 
  Upload, 
  Download, 
  RotateCw,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  Package,
  ArrowLeftRight,
  Landmark,
  UserCheck
} from 'lucide-react';
import { toBengaliNumber } from '../utils/formatters';

export const Navigation: React.FC = () => {
  const { 
    currentTab, 
    setCurrentTab, 
    recycleBin, 
    setActiveModal, 
    exportBackupJson,
    canEditOrDelete,
    language,
    t
  } = useApp();

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tabs: { id: TabType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: language === 'bn' ? 'ড্যাশবোর্ড' : 'Dashboard', icon: LayoutDashboard },
    { id: 'new_invoice', label: language === 'bn' ? 'নতুন ইনভয়েস (বিক্রি)' : 'New Invoice (Sale)', icon: FileText },
    { id: 'exchange', label: language === 'bn' ? 'এক্সচেঞ্জ (মাল পরিবর্তন)' : 'Exchange (Return)', icon: ArrowLeftRight },
    { id: 'due_collection', label: language === 'bn' ? 'বাকি আদায় (পেমেন্ট)' : 'Due Collection', icon: HandCoins },
    { id: 'supplier_bill', label: language === 'bn' ? 'মাল ক্রয় (সাপ্লায়ার বিল)' : 'Purchase & Supplier Bills', icon: ShoppingCart },
    { id: 'products', label: language === 'bn' ? 'প্রোডাক্ট / স্টক' : 'Products & Stock', icon: Package },
    { id: 'date_sales', label: language === 'bn' ? 'তারিখভিত্তিক বিক্রি' : 'Date-wise Sales', icon: CalendarRange },
    { id: 'customers', label: language === 'bn' ? 'কাস্টমার লিস্ট' : 'Customer List', icon: Users },
    { id: 'suppliers', label: language === 'bn' ? 'সাপ্লায়ার লিস্ট' : 'Supplier List', icon: Truck },
    { id: 'employees', label: language === 'bn' ? 'কর্মচারী ও বেতন' : 'Staff & Salary', icon: UserCheck },
    { id: 'daily_expenses', label: language === 'bn' ? 'দৈনিক খরচ' : 'Daily Expenses', icon: Receipt },
    { id: 'cash_tally', label: language === 'bn' ? 'ক্যাশ মিলানো' : 'Cash Tally', icon: Calculator },
    { id: 'investment_loans', label: language === 'bn' ? 'বিনিয়োগ ও ব্যাংক ঋণ' : 'Investment & Loans', icon: Landmark },
  ];

  const activeTabObj = tabs.find(t => t.id === currentTab) || tabs[0];

  const handleSelectTab = (tabId: TabType) => {
    setCurrentTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile Top-Left Menu Bar Trigger (< 640px) */}
      <div className="sm:hidden shrink-0 flex items-center justify-between bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 py-2.5 shadow-xs print:hidden z-20">
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
        >
          <Menu className="w-4 h-4" />
          <span>{language === 'bn' ? 'মেনু বার' : 'Menu'}</span>
        </button>
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
          <activeTabObj.icon className="w-3.5 h-3.5 text-indigo-600" />
          <span>{activeTabObj.label}</span>
        </div>
      </div>

      {/* Mobile Left Drawer Backdrop (< 640px) */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 sm:hidden print:hidden animate-in fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar Menu Bar */}
      <aside
        className={`print:hidden bg-white/95 backdrop-blur-md border-r border-slate-200/90 shadow-sm flex flex-col justify-between transition-all duration-200 z-40
          ${mobileMenuOpen ? 'fixed inset-y-0 left-0 w-64 shadow-2xl z-50' : 'hidden sm:flex'}
          ${isCollapsed ? 'sm:w-18' : 'sm:w-60 lg:w-64'}
          sm:h-full sm:overflow-y-auto shrink-0
        `}
      >
        <div className="p-3 space-y-2">
          {/* Sidebar Header & Collapse Toggle */}
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} pb-2 border-b border-slate-200/80`}>
            {!isCollapsed && (
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-900 px-1.5 flex items-center gap-1.5">
                <Menu className="w-3.5 h-3.5 text-indigo-600" />
                <span>মেনু বার</span>
              </span>
            )}
            
            {/* Desktop Collapse/Expand Button */}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'মেনু বড় করুন' : 'মেনু ছোট করুন'}
              className="hidden sm:flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-indigo-700 hover:bg-indigo-50 transition cursor-pointer"
            >
              {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            {/* Mobile Drawer Close Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="sm:hidden p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Primary Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleSelectTab(tab.id)}
                  title={tab.label}
                  className={`w-full flex items-center ${
                    isCollapsed ? 'justify-center px-2' : 'justify-start gap-2.5 px-3.5'
                  } py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer text-left ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-400'
                      : 'bg-white text-slate-700 hover:bg-indigo-50/80 hover:text-indigo-700 border border-slate-200/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-indigo-600'}`} />
                  {!isCollapsed && <span className="truncate">{tab.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Action Buttons (Recycle Bin, Backup Upload, Backup Download, Refresh) */}
        <div className="p-3 pt-2.5 border-t border-slate-200/80 bg-slate-50/70 flex flex-col gap-2">
          {canEditOrDelete && (
            <>
              {/* Recycle Bin Button */}
              <button
                type="button"
                onClick={() => {
                  setActiveModal('recycle_bin');
                  setMobileMenuOpen(false);
                }}
                title={language === 'bn' ? 'রিসাইকেল বিন' : 'Recycle Bin'}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2' : 'justify-between px-3'
                } bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  {!isCollapsed && <span className="truncate">{language === 'bn' ? 'রিসাইকেল বিন' : 'Recycle Bin'}</span>}
                </div>
                {!isCollapsed && (
                  <span className="bg-white text-rose-700 font-extrabold px-1.5 py-0.5 rounded-full text-[11px] leading-none shrink-0">
                    {toBengaliNumber(recycleBin.length)}
                  </span>
                )}
              </button>

              {/* Backup Upload */}
              <button
                type="button"
                onClick={() => {
                  setActiveModal('backup_upload');
                  setMobileMenuOpen(false);
                }}
                title={language === 'bn' ? 'ব্যাকআপ আপলোড' : 'Upload Backup'}
                className={`w-full flex items-center ${
                  isCollapsed ? 'justify-center px-2' : 'justify-start gap-2 px-3'
                } bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer`}
              >
                <Upload className="w-3.5 h-3.5 shrink-0" />
                {!isCollapsed && <span className="truncate">{language === 'bn' ? 'ব্যাকআপ আপলোড' : 'Upload Backup'}</span>}
              </button>
            </>
          )}

          {/* Backup Download */}
          <button
            type="button"
            onClick={() => {
              setActiveModal('backup_download_options');
              setMobileMenuOpen(false);
            }}
            title={language === 'bn' ? 'ব্যাকআপ ডাউনলোড' : 'Download Backup'}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-2' : 'justify-start gap-2 px-3'
            } bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer`}
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            {!isCollapsed && <span className="truncate">{language === 'bn' ? 'ব্যাকআপ ডাউনলোড' : 'Download Backup'}</span>}
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => {
              window.location.reload();
            }}
            title={language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}
            className={`w-full flex items-center ${
              isCollapsed ? 'justify-center px-2' : 'justify-start gap-2 px-3'
            } bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer`}
          >
            <RotateCw className="w-3.5 h-3.5 shrink-0" />
            {!isCollapsed && <span className="truncate">{language === 'bn' ? 'রিফ্রেশ' : 'Refresh'}</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
