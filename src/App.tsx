import React, { useEffect, Suspense, lazy } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { LoginPage } from './components/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy loaded views and modals for optimized bundle size and fast page load
const DashboardView = lazy(() => import('./components/DashboardView').then(m => ({ default: m.DashboardView })));
const NewInvoiceView = lazy(() => import('./components/NewInvoiceView').then(m => ({ default: m.NewInvoiceView })));
const ExchangeView = lazy(() => import('./components/ExchangeView').then(m => ({ default: m.ExchangeView })));
const DueCollectionView = lazy(() => import('./components/DueCollectionView').then(m => ({ default: m.DueCollectionView })));
const SupplierBillView = lazy(() => import('./components/SupplierBillView').then(m => ({ default: m.SupplierBillView })));
const DateSalesView = lazy(() => import('./components/DateSalesView').then(m => ({ default: m.DateSalesView })));
const CustomersView = lazy(() => import('./components/CustomersView').then(m => ({ default: m.CustomersView })));
const SuppliersView = lazy(() => import('./components/SuppliersView').then(m => ({ default: m.SuppliersView })));
const ProductsView = lazy(() => import('./components/ProductsView').then(m => ({ default: m.ProductsView })));
const DailyExpensesView = lazy(() => import('./components/DailyExpensesView').then(m => ({ default: m.DailyExpensesView })));
const CashTallyView = lazy(() => import('./components/CashTallyView').then(m => ({ default: m.CashTallyView })));
const InvestmentLoansView = lazy(() => import('./components/InvestmentLoansView').then(m => ({ default: m.InvestmentLoansView })));
const EmployeesView = lazy(() => import('./components/EmployeesView').then(m => ({ default: m.EmployeesView })));
const Modals = lazy(() => import('./components/Modals').then(m => ({ default: m.Modals })));
const SettingsModal = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const BranchModal = lazy(() => import('./components/BranchModal').then(m => ({ default: m.BranchModal })));
const Chatbot = lazy(() => import('./components/Chatbot'));

const ViewLoader: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center animate-pulse">
    <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
    <p className="text-xs font-semibold text-slate-500">লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>
  </div>
);

let autoBackupAttempted = false;

const MainContent: React.FC = () => {
  const { 
    currentTab, 
    isAuthenticated, 
    logout, 
    smtpSettings, 
    generateBackupJsonString
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
              filename: `Bismillah_Traders_Auto_Backup_${todayStr.replace(/\//g, '-')}.json`
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

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="h-screen h-[100dvh] flex flex-col whatsapp-bg font-sans antialiased text-slate-800 selection:bg-indigo-500 selection:text-white overflow-hidden app-root-layout">
      {/* Header - Stays fixed at top */}
      <Header />

      {/* Workspace Area: Left Side Menu Bar + Right Main Content */}
      <div className="flex-1 flex flex-col sm:flex-row items-stretch w-full min-h-0 overflow-hidden">
        {/* Left Side Navigation Menu Bar - Stationary on the left */}
        <Navigation />

        {/* Dynamic Tab Body - Right side content scrolls independently */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto pb-16 pt-2 flex flex-col justify-between">
          <div>
            <Suspense fallback={<ViewLoader />}>
              {currentTab === 'dashboard' && <DashboardView />}
              {currentTab === 'new_invoice' && <NewInvoiceView />}
              {currentTab === 'exchange' && <ExchangeView />}
              {currentTab === 'due_collection' && <DueCollectionView />}
              {currentTab === 'supplier_bill' && <SupplierBillView />}
              {currentTab === 'products' && <ProductsView />}
              {currentTab === 'date_sales' && <DateSalesView />}
              {currentTab === 'customers' && <CustomersView />}
              {currentTab === 'suppliers' && <SuppliersView />}
              {currentTab === 'employees' && <EmployeesView />}
              {currentTab === 'daily_expenses' && <DailyExpensesView />}
              {currentTab === 'cash_tally' && <CashTallyView />}
              {currentTab === 'investment_loans' && <InvestmentLoansView />}
            </Suspense>
          </div>

          {/* Footer - at bottom of right content scroll */}
          <footer className="mt-8 bg-slate-800 text-white text-xs py-4 px-4 border-t border-slate-700 print:hidden flex justify-between items-center shrink-0">
            <p className="font-semibold">
              BISMILLAH TRADERS
            </p>
            <p className="font-medium">
              © {new Date().getFullYear()} RS ONLINE
            </p>
          </footer>
        </main>
      </div>

      {/* Modals & Dialogs */}
      <Suspense fallback={null}>
        <Modals />
        <SettingsModal />
        <BranchModal />
        <Chatbot />
      </Suspense>
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
