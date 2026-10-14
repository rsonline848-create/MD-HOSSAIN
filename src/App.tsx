import React, { useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { DashboardView } from './components/DashboardView';
import { NewInvoiceView } from './components/NewInvoiceView';
import { DueCollectionView } from './components/DueCollectionView';
import { SupplierBillView } from './components/SupplierBillView';
import { DateSalesView } from './components/DateSalesView';
import { CustomersView } from './components/CustomersView';
import { SuppliersView } from './components/SuppliersView';
import { DailyExpensesView } from './components/DailyExpensesView';
import { CashTallyView } from './components/CashTallyView';
import { Modals } from './components/Modals';
import { SettingsModal } from './components/SettingsModal';
import { BranchModal } from './components/BranchModal';
import { LoginPage } from './components/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import Chatbot from './components/Chatbot';
import { LicenseLockScreen } from './components/LicenseLockScreen';
import { LicenseModal } from './components/LicenseModal';
import { OnlineUsersModal } from './components/OnlineUsersModal';
import { toBengaliNumber, formatDate } from './utils/formatters';

let autoBackupAttempted = false;

const MainContent: React.FC = () => {
  const { 
    currentTab, 
    isAuthenticated, 
    logout, 
    smtpSettings, 
    generateBackupJsonString,
    license,
    isLicenseExpired,
    licenseDaysLeft,
    setIsLicenseManagerOpen
  } = useApp();

  // Auto-backup on first login of the day
  useEffect(() => {
    if (!isAuthenticated || !smtpSettings || !smtpSettings.enabled) return;

    const todayStr = new Date().toLocaleDateString('en-GB');
    const lastBackupDate = localStorage.getItem('ML_ELECTRIC_LAST_AUTO_BACKUP_DATE');

    if (lastBackupDate !== todayStr && !autoBackupAttempted) {
      autoBackupAttempted = true;
      // It's the first time today, let's trigger auto-backup
      // Mark as triggered immediately to avoid race conditions from multiple rapid re-renders
      localStorage.setItem('ML_ELECTRIC_LAST_AUTO_BACKUP_DATE', todayStr);
      
      const sendAutoBackup = async () => {
        try {
          const backupData = generateBackupJsonString();
          const response = await fetch('/api/send-backup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              smtpSettings,
              backupData,
              filename: `ML_Electric_Auto_Backup_${todayStr.replace(/\//g, '-')}.json`
            })
          });

          if (response.ok) {
            console.log('Daily auto-backup sent successfully.');
          } else {
            // Revert on server error so it can try again later
            localStorage.removeItem('ML_ELECTRIC_LAST_AUTO_BACKUP_DATE');
          }
        } catch (error) {
          console.error('Failed to send auto backup:', error);
          // Revert on network error
          localStorage.removeItem('ML_ELECTRIC_LAST_AUTO_BACKUP_DATE');
        }
      };

      sendAutoBackup();
    }
  }, [isAuthenticated, smtpSettings, generateBackupJsonString]);

  // Auto-logout after 5 minutes of inactivity
  useEffect(() => {
    if (!isAuthenticated) return;

    let inactivityTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      // 5 minutes = 300000 ms
      inactivityTimer = setTimeout(() => {
        logout();
      }, 300000);
    };

    const handleUserActivity = () => {
      resetTimer();
    };

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => window.addEventListener(event, handleUserActivity, { passive: true }));
    
    // Start initial timer
    resetTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => window.removeEventListener(event, handleUserActivity));
    };
  }, [isAuthenticated, logout]);

  // Prevent scroll wheel from changing number input values
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      const target = e.target as HTMLElement;
      if (
        document.activeElement === target &&
        target.tagName === 'INPUT' &&
        (target as HTMLInputElement).type === 'number'
      ) {
        // Blur the input to prevent scroll from changing the value
        (target as HTMLInputElement).blur();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, []);

  if (isLicenseExpired) {
    return (
      <>
        <LicenseLockScreen />
        <LicenseModal />
      </>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage />
        <LicenseModal />
      </>
    );
  }

  const expiryDateFormatted = license?.expiresAt?.split('T')[0] || '2026-09-15';
  const showWarningBanner = licenseDaysLeft <= 15;

  return (
    <div className="min-h-screen whatsapp-bg flex flex-col font-sans antialiased text-slate-800 selection:bg-indigo-500 selection:text-white">
      {/* License Notice Banner */}
      {showWarningBanner ? (
        <div className="print:hidden bg-rose-600 text-white text-center py-2 px-4 text-xs sm:text-sm font-bold shadow-md relative z-50 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3">
          <span>⚠️ আপনার অ্যাপের লাইসেন্সের মেয়াদ আর মাত্র {toBengaliNumber(licenseDaysLeft)} দিন বাকি ({toBengaliNumber(formatDate(expiryDateFormatted))})!</span>
          <span>রিনিউ (Renew) করতে {license.providerName || 'RS ONLINE'} এর সাথে যোগাযোগ করুন: <a href={`tel:${license.supportPhone || '01611814813'}`} className="underline hover:text-rose-200">{license.supportPhone || '01611814813'}</a></span>
          <button 
            type="button"
            onClick={() => setIsLicenseManagerOpen(true)}
            className="bg-white text-rose-700 hover:bg-rose-100 px-2.5 py-0.5 rounded-full text-xs font-bold transition shadow-xs cursor-pointer"
          >
            রিনিউ করুন
          </button>
        </div>
      ) : (
        <div className="print:hidden bg-indigo-900 text-indigo-100 text-center py-1.5 px-4 text-xs font-semibold shadow-xs relative z-50 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3">
          <span>অনলাইন লাইসেন্স সক্রিয় | মেয়াদ: {toBengaliNumber(formatDate(expiryDateFormatted))} ({toBengaliNumber(licenseDaysLeft)} দিন বাকি)</span>
          <span>প্রোভাইডার: {license.providerName || 'RS ONLINE'} (<a href={`tel:${license.supportPhone || '01611814813'}`} className="underline hover:text-white">{license.supportPhone || '01611814813'}</a>)</span>
        </div>
      )}

      {/* Header */}
      <Header />

      {/* Workspace Area: Left Side Menu Bar + Right Main Content */}
      <div className="flex-1 flex flex-col sm:flex-row items-stretch w-full">
        {/* Left Side Navigation Menu Bar */}
        <Navigation />

        {/* Dynamic Tab Body */}
        <main className="flex-1 min-w-0 pb-10 pt-2">
          {currentTab === 'dashboard' && <DashboardView />}
          {currentTab === 'new_invoice' && <NewInvoiceView />}
          {currentTab === 'due_collection' && <DueCollectionView />}
          {currentTab === 'supplier_bill' && <SupplierBillView />}
          {currentTab === 'date_sales' && <DateSalesView />}
          {currentTab === 'customers' && <CustomersView />}
          {currentTab === 'suppliers' && <SuppliersView />}
          {currentTab === 'daily_expenses' && <DailyExpensesView />}
          {currentTab === 'cash_tally' && <CashTallyView />}
        </main>
      </div>

      {/* Modals & Dialogs */}
      <Modals />
      <SettingsModal />
      <BranchModal />
      <LicenseModal />
      <OnlineUsersModal />
      <Chatbot />

      {/* Footer */}
      <footer className="bg-slate-800 text-white text-xs py-4 px-4 border-t border-slate-700 print:hidden flex justify-between items-center">
        <p className="font-semibold">
          ML ELECTRIC
        </p>
        <p className="font-medium">
          © {new Date().getFullYear()} RS ONLINE
        </p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <MainContent />
      </AppProvider>
    </ErrorBoundary>
  );
}
