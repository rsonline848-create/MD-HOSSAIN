import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { 
  Customer, 
  Supplier, 
  Invoice, 
  InvoiceItem,
  DuePaymentRecord, 
  SupplierBill, 
  SupplierBillItem,
  SupplierPaymentRecord, 
  Expense, 
  OpeningCashRecord, 
  OtherCashInRecord, 
  UserAccount, 
  Branch,
  AuditLog, 
  RecycleBinItem, 
  ProductCatalogItem,
  CashTallyRecord,
  SMTPSettings,
  TabType,
  AppLicense,
  UserPresence,
  AppLanguage,
  Investment,
  BankLoan,
  LoanRepayment,
  Employee,
  EmployeePayment
} from '../types';
import { 
  INITIAL_CUSTOMERS, 
  INITIAL_SUPPLIERS, 
  INITIAL_PRODUCTS, 
  INITIAL_USERS,
  DEFAULT_DEMO_PRODUCT_IDS
} from '../data/initialData';

export const isDemoProduct = (p: any): boolean => {
  if (!p) return false;
  if (p.id && DEFAULT_DEMO_PRODUCT_IDS.includes(p.id)) return true;
  if (typeof p.id === 'string' && /^p([1-9]|1[0-2])$/.test(p.id)) return true;
  if (typeof p.name === 'string' && (
    p.name.includes('BRB 1.5 RM') ||
    p.name.includes('BRB 2.5 RM') ||
    p.name.includes('BBS 1.0 RM') ||
    p.name.includes('Super Star 18W') ||
    p.name.includes('Super Star 12W') ||
    p.name.includes('Click 1 Gang') ||
    p.name.includes('Click Multi Socket') ||
    p.name.includes('Havells 32A') ||
    p.name.includes('Gazi 56 ইঞ্চি') ||
    p.name.includes('BRB 3/4" ইঞ্চি') ||
    p.name.includes('Royal 16A') ||
    p.name.includes('ইলেকট্রিক ব্ল্যাক টেপ')
  )) return true;
  return false;
};

export const isDemoInvoice = (inv: any): boolean => {
  if (!inv) return false;
  if (typeof inv.id === 'string' && inv.id.startsWith('inv_demo')) return true;
  if (inv.invoiceNo === 'INV-1001' || inv.invoiceNo === 'INV-1002') return true;
  if (Array.isArray(inv.items) && inv.items.some((it: any) => isDemoProduct(it))) return true;
  return false;
};

import { getTodayDateInput, toBengaliNumber, toEnglishNumber, normalizeDate, isSameDate, setFormatterLanguage, extractSupplierBillItems } from '../utils/formatters';
import { getTranslation } from '../utils/translations';
import { parseAndSanitizeBackup } from '../utils/backupParser';
import { 
  getCachedLicense, 
  getLicenseStatusDetails, 
  subscribeToCloudLicense, 
  updateCloudLicense, 
  verifyAndActivateLicenseKey 
} from '../services/licenseService';
import {
  getCachedPresenceList,
  sendPresenceHeartbeat,
  sendPresenceLogout,
  subscribeToPresence,
  isPresenceOnline
} from '../services/presenceService';

import { doc, onSnapshot, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

interface AppContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  t: (key: string, fallback?: string) => string;
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  isAuthenticated: boolean;
  login: (usernameOrPhone: string, pinOrPass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  returnToMainApp: () => void;
  activeBranchId: string;
  currentUser: UserAccount;
  setCurrentUser: (user: UserAccount) => void;
  canEditOrDelete: boolean;
  isManager: boolean;
  users: UserAccount[];
  setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
  addUser: (userData: {
    name: string;
    username?: string;
    phone?: string;
    pinOrPassword: string;
    role: 'admin' | 'manager';
    branchId?: string;
  }) => Promise<UserAccount>;
  updateUser: (user: UserAccount) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  
  smtpSettings: SMTPSettings | null;
  setSmtpSettings: React.Dispatch<React.SetStateAction<SMTPSettings | null>>;
  
  // Data entities
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  suppliers: Supplier[];
  setSuppliers: React.Dispatch<React.SetStateAction<Supplier[]>>;
  invoices: Invoice[];
  setInvoices: React.Dispatch<React.SetStateAction<Invoice[]>>;
  duePayments: DuePaymentRecord[];
  setDuePayments: React.Dispatch<React.SetStateAction<DuePaymentRecord[]>>;
  supplierBills: SupplierBill[];
  setSupplierBills: React.Dispatch<React.SetStateAction<SupplierBill[]>>;
  supplierPayments: SupplierPaymentRecord[];
  setSupplierPayments: React.Dispatch<React.SetStateAction<SupplierPaymentRecord[]>>;
  expenses: Expense[];
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>;
  openingCashList: OpeningCashRecord[];
  setOpeningCashList: React.Dispatch<React.SetStateAction<OpeningCashRecord[]>>;
  otherCashInList: OtherCashInRecord[];
  setOtherCashInList: React.Dispatch<React.SetStateAction<OtherCashInRecord[]>>;
  cashTallies: CashTallyRecord[];
  setCashTallies: React.Dispatch<React.SetStateAction<CashTallyRecord[]>>;
  auditLogs: AuditLog[];
  addAuditLog: (category: AuditLog['category'], action: string, description: string, details?: Record<string, unknown>) => void;
  recycleBin: RecycleBinItem[];
  moveToRecycleBin: (type: RecycleBinItem['type'], name: string, data: unknown, amount?: number) => void;
  restoreFromRecycleBin: (id: string) => void;
  permanentDeleteFromRecycleBin: (id: string) => void;
  emptyRecycleBin: () => void;
  products: ProductCatalogItem[];
  setProducts: React.Dispatch<React.SetStateAction<ProductCatalogItem[]>>;
  addProduct: (product: ProductCatalogItem) => void;
  updateProduct: (id: string, updated: Partial<ProductCatalogItem>) => void;
  deleteProduct: (id: string) => void;

  // Investments & Loans
  investments: Investment[];
  setInvestments: React.Dispatch<React.SetStateAction<Investment[]>>;
  addInvestment: (investment: Omit<Investment, 'id' | 'createdAt'>) => void;
  updateInvestment: (id: string, updated: Partial<Investment>) => void;
  deleteInvestment: (id: string) => void;

  loans: BankLoan[];
  setLoans: React.Dispatch<React.SetStateAction<BankLoan[]>>;
  addLoan: (loan: Omit<BankLoan, 'id' | 'createdAt'>) => void;
  updateLoan: (id: string, updated: Partial<BankLoan>) => void;
  deleteLoan: (id: string) => void;

  loanRepayments: LoanRepayment[];
  setLoanRepayments: React.Dispatch<React.SetStateAction<LoanRepayment[]>>;
  addLoanRepayment: (repayment: Omit<LoanRepayment, 'id' | 'createdAt'>) => void;
  updateLoanRepayment: (id: string, updated: Partial<LoanRepayment>) => void;
  deleteLoanRepayment: (id: string) => void;

  // Employees & Salary Management
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  addEmployee: (emp: Omit<Employee, 'id' | 'createdAt'>) => Employee;
  updateEmployee: (id: string, updated: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  employeePayments: EmployeePayment[];
  setEmployeePayments: React.Dispatch<React.SetStateAction<EmployeePayment[]>>;
  addEmployeePayment: (payment: Omit<EmployeePayment, 'id' | 'createdAt' | 'paidBy' | 'expenseId'>) => EmployeePayment;
  updateEmployeePayment: (id: string, updated: Partial<EmployeePayment>) => void;
  deleteEmployeePayment: (id: string) => void;

  // Actions
  addCustomer: (customer: Customer) => void;
  addSupplier: (supplier: Supplier) => void;
  updateSupplier: (id: string, updated: Partial<Supplier>) => void;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'createdBy'>) => Invoice;
  updateInvoice: (invoiceId: string, updatedData: Partial<Invoice>, customItems?: InvoiceItem[]) => Invoice | undefined;
  deleteInvoice: (idOrInvoice: string | Invoice) => void;
  addDuePayment: (payment: Omit<DuePaymentRecord, 'id' | 'createdAt' | 'collectedBy'>) => void;
  addSupplierBill: (bill: Omit<SupplierBill, 'id' | 'createdAt' | 'createdBy'>) => void;
  deleteSupplierBill: (idOrBill: string | SupplierBill) => void;
  updateSupplierBill: (billId: string, updatedBillData: Partial<SupplierBill>, customItems?: SupplierBillItem[]) => void;
  addSupplierPayment: (payment: Omit<SupplierPaymentRecord, 'id' | 'createdAt' | 'paidBy'>) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'createdBy'>) => void;
  setOpeningCash: (amount: number, note?: string) => void;
  addOtherCashIn: (entry: Omit<OtherCashInRecord, 'id' | 'createdAt' | 'receivedBy'>) => void;
  saveCashTally: (tally: Omit<CashTallyRecord, 'id' | 'savedBy' | 'savedAt'>) => void;
  resetAllData: () => void;
  exportBackupJson: (selectedKeys?: string[]) => Promise<void>;
  generateBackupJsonString: (selectedKeys?: string[]) => string;
  importBackupJson: (jsonData: string, mode?: 'overwrite' | 'merge') => Promise<{ success: boolean; message: string }>;

  // Active Modals state
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  invoiceToPrint: Invoice | null;
  duePaymentToPrint: DuePaymentRecord | null;
  setDuePaymentToPrint: (dp: DuePaymentRecord | null) => void;
  setInvoiceToPrint: (inv: Invoice | null) => void;
  invoiceToEdit: Invoice | null;
  setInvoiceToEdit: (inv: Invoice | null) => void;

  // Cloud Sync status & manual sync
  isCloudSynced: boolean;
  cloudSyncTime: string | null;
  isSyncingNow: boolean;
  forceSyncFromCloud: () => Promise<void>;
  forcePushToCloud: (override?: any) => Promise<void>;
  syncManagerToBranch: (manager: UserAccount, targetBranchId: string) => Promise<void>;
  removeUserFromBranch: (userId: string, targetBranchId: string) => Promise<void>;
  branches: Branch[];
  setBranches: React.Dispatch<React.SetStateAction<Branch[]>>;
  addBranch: (branchData: { name: string; location?: string; phone?: string }) => Promise<Branch>;
  updateBranch: (branch: Branch) => Promise<void>;
  deleteBranch: (branchId: string) => Promise<void>;
  firestoreQuota: {
    dailyReadLimit: number;
    dailyWriteLimit: number;
    dailyDeleteLimit: number;
    storageLimitMB: number;
    todayReads: number;
    todayWrites: number;
    todayDeletes: number;
    estimatedDataSizeKB: number;
    status: 'safe' | 'moderate' | 'warning';
  };
  // Online Cloud License Management
  license: AppLicense;
  isLicenseValid: boolean;
  isLicenseExpired: boolean;
  licenseDaysLeft: number;
  updateLicense: (newLicense: AppLicense) => Promise<void>;
  activateLicenseKey: (key: string) => Promise<{ success: boolean; message: string; newLicense?: AppLicense }>;
  isLicenseManagerOpen: boolean;
  setIsLicenseManagerOpen: (open: boolean) => void;

  // Online Users & Presence Tracking
  presenceList: UserPresence[];
  activeOnlineUsersCount: number;
  isOnlineUsersModalOpen: boolean;
  setIsOnlineUsersModalOpen: (open: boolean) => void;

  // Custom in-app Confirmation Dialog (Works 100% reliably in iframes, webviews & standalone)
  confirmDialog: ConfirmDialogOptions | null;
  setConfirmDialog: (dialog: ConfirmDialogOptions | null) => void;
  confirmAction: (options: ConfirmDialogOptions) => void;
}

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

const getInitialActiveBranchId = (): string => {
  if (typeof window === "undefined") return "bismillah_traders_main";
  const saved = localStorage.getItem("ACTIVE_BRANCH_ID");
  if (!saved || saved === "ml_electric_main") {
    localStorage.setItem("ACTIVE_BRANCH_ID", "bismillah_traders_main");
    return "bismillah_traders_main";
  }
  return saved;
};

const ACTIVE_BRANCH_ID = getInitialActiveBranchId();
const FIRESTORE_SHOP_DOC_ID = ACTIVE_BRANCH_ID;
const STORAGE_KEY_PREFIX = `BISMILLAH_${ACTIVE_BRANCH_ID}_`;

// Auto-migrate legacy ML_ELECTRIC keys to BISMILLAH prefix if empty
if (typeof window !== 'undefined') {
  const legacyPrefix = `ML_ELECTRIC_${ACTIVE_BRANCH_ID}_`;
  const oldMainPrefix = `ML_ELECTRIC_ml_electric_main_`;
  const keysToMigrate = [
    'USERS', 'CUSTOMERS', 'SUPPLIERS', 'PRODUCTS', 'INVOICES',
    'DUE_PAYMENTS', 'SUPPLIER_BILLS', 'SUPPLIER_PAYMENTS', 'EXPENSES',
    'OPENING_CASH', 'OTHER_CASH_IN', 'CASH_TALLIES', 'INVESTMENTS',
    'LOANS', 'LOAN_REPAYMENTS', 'AUDIT_LOGS', 'RECYCLE_BIN', 'SMTP'
  ];
  keysToMigrate.forEach(k => {
    if (!localStorage.getItem(STORAGE_KEY_PREFIX + k)) {
      const oldVal = localStorage.getItem(legacyPrefix + k) || localStorage.getItem(oldMainPrefix + k);
      if (oldVal) {
        localStorage.setItem(STORAGE_KEY_PREFIX + k, oldVal);
      }
    }
  });
}

// Unique client/session identifier to distinguish remote updates vs local writes
const CLIENT_ID = typeof window !== 'undefined'
  ? (sessionStorage.getItem(STORAGE_KEY_PREFIX + 'CLIENT_ID') || (() => {
      const id = 'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      try { sessionStorage.setItem(STORAGE_KEY_PREFIX + 'CLIENT_ID', id); } catch {}
      return id;
    })())
  : 'client_node';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Language State: 'bn' (Bengali) | 'en' (English)
  const [language, setLanguageState] = useState<AppLanguage>(() => {
    try {
      const saved = localStorage.getItem('ML_ELECTRIC_LANGUAGE');
      if (saved === 'en' || saved === 'bn') return saved;
    } catch {}
    return 'bn';
  });

  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    setFormatterLanguage(lang);
    try {
      localStorage.setItem('ML_ELECTRIC_LANGUAGE', lang);
    } catch {}
  };

  useEffect(() => {
    setFormatterLanguage(language);
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    return getTranslation(key, language, fallback);
  };

  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateInput());
  
  // Modals
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);
  const [duePaymentToPrint, setDuePaymentToPrint] = useState<DuePaymentRecord | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);

  // Custom In-App Confirmation Dialog State (Solves iframe native confirm() blocking)
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogOptions | null>(null);
  const confirmAction = (options: ConfirmDialogOptions) => {
    setConfirmDialog(options);
  };

  // Cloud Sync indicators & Quota Usage
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);
  const [cloudSyncTime, setCloudSyncTime] = useState<string | null>(null);
  const [isSyncingNow, setIsSyncingNow] = useState<boolean>(false);

  // Sync flags to prevent loopback writes and race conditions
  const isIncomingRemoteUpdateRef = useRef<boolean>(false);
  const hasLoadedInitialCloudRef = useRef<boolean>(false);
  const hasInitializedCloudRef = useRef<boolean>(false);

  // Daily Firestore Read/Write Quota Tracker (Firebase Spark Free Tier: 50k reads, 20k writes/day)
  const todayStr = getTodayDateInput();
  const [firestoreQuota, setFirestoreQuota] = useState<{
    dailyReadLimit: number;
    dailyWriteLimit: number;
    dailyDeleteLimit: number;
    storageLimitMB: number;
    todayReads: number;
    todayWrites: number;
    todayDeletes: number;
    estimatedDataSizeKB: number;
    status: 'safe' | 'moderate' | 'warning';
  }>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'QUOTA_' + todayStr);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback default
    }
    return {
      dailyReadLimit: 50000,
      dailyWriteLimit: 20000,
      dailyDeleteLimit: 20000,
      storageLimitMB: 1024,
      todayReads: 1,
      todayWrites: 1,
      todayDeletes: 0,
      estimatedDataSizeKB: 24,
      status: 'safe'
    };
  });

  // Helper to record a Firestore Read
  const recordFirestoreRead = () => {
    setFirestoreQuota(prev => {
      const updated = {
        ...prev,
        todayReads: prev.todayReads + 1,
        status: (prev.todayReads + 1 > 40000 || prev.todayWrites > 16000) ? 'warning' as const : 'safe' as const
      };
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'QUOTA_' + todayStr, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Helper to record a Firestore Write
  const recordFirestoreWrite = (sizeBytes: number = 0) => {
    setFirestoreQuota(prev => {
      const updated = {
        ...prev,
        todayWrites: prev.todayWrites + 1,
        estimatedDataSizeKB: Math.max(prev.estimatedDataSizeKB, Math.round(sizeBytes / 1024) || 28),
        status: (prev.todayReads > 40000 || prev.todayWrites + 1 > 16000) ? 'warning' as const : 'safe' as const
      };
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'QUOTA_' + todayStr, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Initialize Users & Authentication
  const [users, setUsers] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'USERS');
    if (saved) {
      let parsedUsers: UserAccount[] = JSON.parse(saved);
      // Auto-migrate old default password if still present (remove 139210 completely)
      let needsUpdate = false;
      parsedUsers = parsedUsers.map(u => {
        if (u.pinOrPassword === '139210' || (u.role === 'admin' && (u.pinOrPassword === '139210' || (u.id === 'u_admin_1' && u.pinOrPassword !== '102267')))) {
          needsUpdate = true;
          return { ...u, pinOrPassword: '102267' };
        }
        return u;
      });
      if (needsUpdate) {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'USERS', JSON.stringify(parsedUsers));
      }
      return parsedUsers;
    }
    return INITIAL_USERS;
  });
  const [branches, setBranches] = useState<Branch[]>(() => {
    const saved = localStorage.getItem('ML_ELECTRIC_BRANCHES');
    return saved ? JSON.parse(saved) : [];
  });
  const branchesRef = useRef<Branch[]>(branches);
  useEffect(() => {
    branchesRef.current = branches;
    try {
      localStorage.setItem('ML_ELECTRIC_BRANCHES', JSON.stringify(branches));
    } catch {}
  }, [branches]);

  const [currentUser, setCurrentUser] = useState<UserAccount>(() => {
    const savedUserData = 
      sessionStorage.getItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_DATA') ||
      sessionStorage.getItem('CURRENT_USER_DATA') ||
      sessionStorage.getItem('ML_ELECTRIC_CURRENT_USER_DATA') ||
      sessionStorage.getItem('ML_ELECTRIC_ml_electric_main_CURRENT_USER_DATA') ||
      sessionStorage.getItem('ML_ELECTRIC_bismillah_traders_main_CURRENT_USER_DATA');
    if (savedUserData) {
      try {
        const parsed = JSON.parse(savedUserData);
        if (parsed && parsed.id) return parsed;
      } catch {}
    }
    const savedUserId = 
      sessionStorage.getItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_ID') ||
      sessionStorage.getItem('CURRENT_USER_ID') ||
      sessionStorage.getItem('ML_ELECTRIC_CURRENT_USER_ID') ||
      sessionStorage.getItem('ML_ELECTRIC_ml_electric_main_CURRENT_USER_ID') ||
      sessionStorage.getItem('ML_ELECTRIC_bismillah_traders_main_CURRENT_USER_ID');
    if (savedUserId) {
      const found = users.find(u => u.id === savedUserId);
      if (found) return found;
    }
    return users[0] || INITIAL_USERS[0];
  });

  const isManager = currentUser?.role === 'manager';
  const canEditOrDelete = Boolean(currentUser && (currentUser.role === 'admin' || currentUser.role === 'branch_manager'));

  // Ensure currentUser is correctly set when users are loaded from cloud
  useEffect(() => {
    const savedUserId = 
      sessionStorage.getItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_ID') ||
      sessionStorage.getItem('ML_ELECTRIC_CURRENT_USER_ID');
    if (savedUserId && currentUser.id !== savedUserId) {
      const found = users.find(u => u.id === savedUserId);
      if (found) {
        setCurrentUser(found);
      }
    }
  }, [users, currentUser.id]);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const authSaved = 
      sessionStorage.getItem(STORAGE_KEY_PREFIX + 'AUTH') ||
      sessionStorage.getItem('IS_AUTHENTICATED') ||
      sessionStorage.getItem('ML_ELECTRIC_AUTH') ||
      sessionStorage.getItem('ML_ELECTRIC_ml_electric_main_AUTH') ||
      sessionStorage.getItem('ML_ELECTRIC_bismillah_traders_main_AUTH');
    return authSaved ? JSON.parse(authSaved) === true : false;
  });

  const [smtpSettings, setSmtpSettings] = useState<SMTPSettings | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'SMTP');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (usernameOrPhone: string, pinOrPass: string): Promise<{ success: boolean; message?: string }> => {
    const normalizeAuth = (val: string | undefined | null) => {
      if (!val) return '';
      return val
        .toString()
        .trim()
        .replace(/[০-৯]/g, d => "০১২৩৪৫৬৭৮৯".indexOf(d).toString())
        .toLowerCase();
    };

    const normInputUser = normalizeAuth(usernameOrPhone);
    const rawInputUser = usernameOrPhone.trim().toLowerCase();
    const normInputPass = normalizeAuth(pinOrPass);
    const rawInputPass = pinOrPass.trim();

    // 1. Gather all users from current state, ref, and all localStorage shops
    const allKnownUsers: UserAccount[] = [...usersRef.current];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.includes('_USERS') || k === 'ML_ELECTRIC_USERS')) {
          const stored = localStorage.getItem(k);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              parsed.forEach((item: UserAccount) => {
                if (item && item.id && !allKnownUsers.some(u => u.id === item.id)) {
                  allKnownUsers.push(item);
                }
              });
            }
          }
        }
      }
    } catch (e) {}

    const isUserMatch = (u: UserAccount) => {
      const uName = (u.name || '').trim().toLowerCase();
      const normUName = normalizeAuth(u.name);
      const normUUsername = normalizeAuth(u.username);
      const normUPhone = normalizeAuth(u.phone);
      const normUId = normalizeAuth(u.id);

      return (
        (normUUsername && normUUsername === normInputUser) ||
        (normUPhone && normUPhone === normInputUser) ||
        (normUName && normUName === normInputUser) ||
        (uName && (uName === rawInputUser || (rawInputUser.length >= 3 && uName.includes(rawInputUser)))) ||
        (normUId && normUId === normInputUser)
      );
    };

    const isPasswordMatch = (u: UserAccount) => {
      const pass1 = (u.pinOrPassword || '').trim();
      const pass2 = ((u as any).password || '').trim();
      return (
        pass1 === rawInputPass ||
        pass2 === rawInputPass ||
        (pass1 && normalizeAuth(pass1) === normInputPass) ||
        (pass2 && normalizeAuth(pass2) === normInputPass)
      );
    };

    let foundUser = allKnownUsers.find(u => isUserMatch(u) && isPasswordMatch(u));

    // 2. If not found in local memory, check server API for any newly created users
    if (!foundUser) {
      try {
        const res = await fetch('/api/allUsers');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.users)) {
            data.users.forEach((apiUser: UserAccount) => {
              if (apiUser && apiUser.id && !allKnownUsers.some(u => u.id === apiUser.id)) {
                allKnownUsers.push(apiUser);
              }
            });
            foundUser = allKnownUsers.find(u => isUserMatch(u) && isPasswordMatch(u));
          }
        }
      } catch (err) {
        console.warn("Could not query /api/allUsers during login:", err);
      }
    }

    const persistLoginSession = (user: UserAccount) => {
      setCurrentUser(user);
      setIsAuthenticated(true);
      // Persist to all key formats so every hook and reload lookup succeeds
      sessionStorage.setItem(STORAGE_KEY_PREFIX + 'AUTH', JSON.stringify(true));
      sessionStorage.setItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_ID', user.id);
      sessionStorage.setItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_DATA', JSON.stringify(user));
      sessionStorage.setItem('IS_AUTHENTICATED', JSON.stringify(true));
      sessionStorage.setItem('CURRENT_USER_ID', user.id);
      sessionStorage.setItem('CURRENT_USER_DATA', JSON.stringify(user));
      sessionStorage.setItem('ML_ELECTRIC_AUTH', JSON.stringify(true));
      sessionStorage.setItem('ML_ELECTRIC_CURRENT_USER_ID', user.id);
      sessionStorage.setItem('ML_ELECTRIC_CURRENT_USER_DATA', JSON.stringify(user));
      sessionStorage.setItem('ML_ELECTRIC_ml_electric_main_AUTH', JSON.stringify(true));
      sessionStorage.setItem('ML_ELECTRIC_ml_electric_main_CURRENT_USER_ID', user.id);
      sessionStorage.setItem('ML_ELECTRIC_ml_electric_main_CURRENT_USER_DATA', JSON.stringify(user));
      sessionStorage.setItem('ML_ELECTRIC_bismillah_traders_main_AUTH', JSON.stringify(true));
      sessionStorage.setItem('ML_ELECTRIC_bismillah_traders_main_CURRENT_USER_ID', user.id);
      sessionStorage.setItem('ML_ELECTRIC_bismillah_traders_main_CURRENT_USER_DATA', JSON.stringify(user));
    };

    if (!foundUser) {
      // Emergency Master Admin bypass (Only official master password 102267)
      if ((normInputUser === 'admin' || normInputUser === 'administrator') && normInputPass === '102267') {
        const adminUser = users.find(u => u.role === 'admin') || INITIAL_USERS[0];
        persistLoginSession(adminUser);
        return { success: true };
      }

      // Check if user exists but password was wrong
      const existingUser = allKnownUsers.find(u => isUserMatch(u));
      if (existingUser) {
        return { success: false, message: 'পাসওয়ার্ডটি ভুল হয়েছে! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।' };
      }

      return { success: false, message: 'ভুল ইউজারনেম অথবা মোবাইল নম্বর! এই অ্যাকাউন্টটি পাওয়া যায়নি।' };
    }

    // Save found user to local caches and activate session
    persistLoginSession(foundUser);
    return { success: true };
  };

  const returnToMainApp = () => {
    localStorage.setItem("ACTIVE_BRANCH_ID", "bismillah_traders_main");
    sessionStorage.setItem(STORAGE_KEY_PREFIX + 'AUTH', JSON.stringify(true));
    sessionStorage.setItem('IS_AUTHENTICATED', JSON.stringify(true));
    sessionStorage.setItem("ML_ELECTRIC_ml_electric_main_AUTH", JSON.stringify(true));
    if (currentUser) {
      sessionStorage.setItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_ID', currentUser.id);
      sessionStorage.setItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_DATA', JSON.stringify(currentUser));
      sessionStorage.setItem("ML_ELECTRIC_ml_electric_main_CURRENT_USER_ID", currentUser.id);
      sessionStorage.setItem("ML_ELECTRIC_ml_electric_main_CURRENT_USER_DATA", JSON.stringify(currentUser));
    }
    window.location.reload();
  };

  const logout = () => {
    if (currentUser?.id) {
      sendPresenceLogout(currentUser.id);
    }
    setIsAuthenticated(false);
    sessionStorage.setItem(STORAGE_KEY_PREFIX + 'AUTH', JSON.stringify(false));
    sessionStorage.setItem('IS_AUTHENTICATED', JSON.stringify(false));
    sessionStorage.setItem('ML_ELECTRIC_AUTH', JSON.stringify(false));
    sessionStorage.setItem('ML_ELECTRIC_ml_electric_main_AUTH', JSON.stringify(false));
    sessionStorage.removeItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_ID');
    sessionStorage.removeItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_DATA');
    sessionStorage.removeItem('CURRENT_USER_ID');
    sessionStorage.removeItem('CURRENT_USER_DATA');
    sessionStorage.removeItem('ML_ELECTRIC_CURRENT_USER_ID');
    sessionStorage.removeItem('ML_ELECTRIC_CURRENT_USER_DATA');
    setActiveModal(null);
  };

  // Customers
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'CUSTOMERS');
    return saved !== null ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  // Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'SUPPLIERS');
    return saved !== null ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  // Products
  const [products, setProducts] = useState<ProductCatalogItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'PRODUCTS');
    if (saved !== null) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(p => !isDemoProduct(p));
        }
      } catch {}
    }
    return INITIAL_PRODUCTS;
  });

  // Invoices
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'INVOICES');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(inv => !isDemoInvoice(inv));
        }
      } catch {}
    }
    return [];
  });

  // Due Payments
  const [duePayments, setDuePayments] = useState<DuePaymentRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'DUE_PAYMENTS');
    return saved ? JSON.parse(saved) : [];
  });

  // Supplier Bills
  const [supplierBills, setSupplierBills] = useState<SupplierBill[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'SUPPLIER_BILLS');
    return saved ? JSON.parse(saved) : [];
  });

  // Supplier Payments
  const [supplierPayments, setSupplierPayments] = useState<SupplierPaymentRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'SUPPLIER_PAYMENTS');
    return saved ? JSON.parse(saved) : [];
  });

  // Expenses
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'EXPENSES');
    return saved ? JSON.parse(saved) : [];
  });

  // Opening Cash
  const [openingCashList, setOpeningCashList] = useState<OpeningCashRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'OPENING_CASH');
    return saved ? JSON.parse(saved) : [];
  });

  // Other Cash In
  const [otherCashInList, setOtherCashInList] = useState<OtherCashInRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'OTHER_CASH_IN');
    return saved ? JSON.parse(saved) : [];
  });

  // Cash Tallies (Saved cash register balances)
  const [cashTallies, setCashTallies] = useState<CashTallyRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'CASH_TALLIES');
    return saved ? JSON.parse(saved) : [];
  });

  // Investments
  const [investments, setInvestments] = useState<Investment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'INVESTMENTS');
    return saved ? JSON.parse(saved) : [];
  });

  // Bank Loans
  const [loans, setLoans] = useState<BankLoan[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'LOANS');
    return saved ? JSON.parse(saved) : [];
  });

  // Loan Repayments
  const [loanRepayments, setLoanRepayments] = useState<LoanRepayment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'LOAN_REPAYMENTS');
    return saved ? JSON.parse(saved) : [];
  });

  // Employees & Staff Profiles
  const [employees, setEmployees] = useState<Employee[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'EMPLOYEES');
    return saved ? JSON.parse(saved) : [];
  });

  // Employee Salary Disbursements & Advances
  const [employeePayments, setEmployeePayments] = useState<EmployeePayment[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'EMPLOYEE_PAYMENTS');
    return saved ? JSON.parse(saved) : [];
  });

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'AUDIT_LOGS');
    return saved ? JSON.parse(saved) : [];
  });

  // Recycle Bin
  const [recycleBin, setRecycleBin] = useState<RecycleBinItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'RECYCLE_BIN');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((r: any) => r.id !== 'rec_demo_1' && !isDemoInvoice(r.originalData));
        }
      } catch {}
    }
    return [];
  });

  // Online Cloud License Management State
  const [license, setLicense] = useState<AppLicense>(() => getCachedLicense());
  const [isLicenseManagerOpen, setIsLicenseManagerOpen] = useState<boolean>(false);

  const licenseStatusDetails = useMemo(() => getLicenseStatusDetails(license), [license]);

  useEffect(() => {
    // Realtime Cloud listener on Firestore `/system_license/app_license`
    const unsubscribe = subscribeToCloudLicense((cloudLic) => {
      setLicense(cloudLic);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const updateLicense = async (newLicense: AppLicense) => {
    setLicense(newLicense);
    await updateCloudLicense(newLicense);
  };

  const activateLicenseKey = async (key: string) => {
    const res = await verifyAndActivateLicenseKey(key, license);
    if (res.newLicense) {
      setLicense(res.newLicense);
    }
    return res;
  };

  // Online Users & Real-time Presence Tracking
  const [presenceList, setPresenceList] = useState<UserPresence[]>(() => getCachedPresenceList());
  const [isOnlineUsersModalOpen, setIsOnlineUsersModalOpen] = useState<boolean>(false);

  // Real-time Cloud Presence Listener
  useEffect(() => {
    const unsubscribe = subscribeToPresence((incoming) => {
      setPresenceList(incoming);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // Send periodic presence heartbeat when user is authenticated
  useEffect(() => {
    if (!isAuthenticated || !currentUser?.id) return;

    const branchName = branches.find(b => b.id === ACTIVE_BRANCH_ID)?.name || 
      (ACTIVE_BRANCH_ID === 'ml_electric_main' ? 'প্রধান শাখা' : 'শাখা');

    const heartbeatParams = {
      userId: currentUser.id,
      userName: currentUser.name,
      role: currentUser.role,
      branchId: ACTIVE_BRANCH_ID,
      branchName
    };

    // Immediate initial heartbeat
    sendPresenceHeartbeat(heartbeatParams);

    // Continuous heartbeat every 25 seconds
    const interval = setInterval(() => {
      sendPresenceHeartbeat(heartbeatParams);
    }, 25000);

    // Active tab focus / visibility listener
    const handleActivity = () => {
      sendPresenceHeartbeat(heartbeatParams);
    };
    window.addEventListener('focus', handleActivity);
    window.addEventListener('visibilitychange', handleActivity);

    // Mark user as offline on tab/browser close
    const handleBeforeUnload = () => {
      sendPresenceLogout(currentUser.id);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleActivity);
      window.removeEventListener('visibilitychange', handleActivity);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isAuthenticated, currentUser?.id, currentUser?.name, currentUser?.role, ACTIVE_BRANCH_ID, branches]);

  // Compute active online users count
  const activeOnlineUsersCount = useMemo(() => {
    const onlineIds = new Set<string>();
    if (Array.isArray(presenceList)) {
      presenceList.forEach(p => {
        if (p && p.isOnline && isPresenceOnline(p) && p.userId) {
          onlineIds.add(p.userId);
        }
      });
    }
    if (isAuthenticated && currentUser?.id) {
      onlineIds.add(currentUser.id);
    }
    return onlineIds.size;
  }, [presenceList, isAuthenticated, currentUser?.id]);

  // Synchronous State Reference Keepers (avoid closure staleness)
  const customersRef = useRef(customers);
  customersRef.current = customers;
  const suppliersRef = useRef(suppliers);
  suppliersRef.current = suppliers;
  const productsRef = useRef(products);
  productsRef.current = products;
  const invoicesRef = useRef(invoices);
  invoicesRef.current = invoices;
  const duePaymentsRef = useRef(duePayments);
  duePaymentsRef.current = duePayments;
  const supplierBillsRef = useRef(supplierBills);
  supplierBillsRef.current = supplierBills;
  const supplierPaymentsRef = useRef(supplierPayments);
  supplierPaymentsRef.current = supplierPayments;
  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;
  const openingCashListRef = useRef(openingCashList);
  openingCashListRef.current = openingCashList;
  const otherCashInListRef = useRef(otherCashInList);
  otherCashInListRef.current = otherCashInList;
  const cashTalliesRef = useRef(cashTallies);
  cashTalliesRef.current = cashTallies;
  const usersRef = useRef(users);
  usersRef.current = users;
  const smtpSettingsRef = useRef(smtpSettings);
  smtpSettingsRef.current = smtpSettings;
  const auditLogsRef = useRef(auditLogs);
  auditLogsRef.current = auditLogs;
  const recycleBinRef = useRef(recycleBin);
  recycleBinRef.current = recycleBin;
  const investmentsRef = useRef(investments);
  investmentsRef.current = investments;
  const loansRef = useRef(loans);
  loansRef.current = loans;
  const loanRepaymentsRef = useRef(loanRepayments);
  loanRepaymentsRef.current = loanRepayments;
  const employeesRef = useRef(employees);
  employeesRef.current = employees;
  const employeePaymentsRef = useRef(employeePayments);
  employeePaymentsRef.current = employeePayments;

  // Save to LocalStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'USERS', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'CUSTOMERS', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIERS', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'PRODUCTS', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'INVOICES', JSON.stringify(invoices));
  }, [invoices]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'DUE_PAYMENTS', JSON.stringify(duePayments));
  }, [duePayments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIER_BILLS', JSON.stringify(supplierBills));
  }, [supplierBills]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIER_PAYMENTS', JSON.stringify(supplierPayments));
  }, [supplierPayments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'EXPENSES', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'OPENING_CASH', JSON.stringify(openingCashList));
  }, [openingCashList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'OTHER_CASH_IN', JSON.stringify(otherCashInList));
  }, [otherCashInList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'CASH_TALLIES', JSON.stringify(cashTallies));
  }, [cashTallies]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'AUDIT_LOGS', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'RECYCLE_BIN', JSON.stringify(recycleBin));
  }, [recycleBin]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'INVESTMENTS', JSON.stringify(investments));
  }, [investments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'LOANS', JSON.stringify(loans));
  }, [loans]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'LOAN_REPAYMENTS', JSON.stringify(loanRepayments));
  }, [loanRepayments]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'EMPLOYEES', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'EMPLOYEE_PAYMENTS', JSON.stringify(employeePayments));
  }, [employeePayments]);

  // One-time startup check: purge any demo products or demo invoices from storage and cloud
  useEffect(() => {
    const rawProds = productsRef.current;
    const rawInvs = invoicesRef.current;
    const hasDemoProds = Array.isArray(rawProds) && rawProds.some(p => isDemoProduct(p));
    const hasDemoInvs = Array.isArray(rawInvs) && rawInvs.some(inv => isDemoInvoice(inv));

    if (hasDemoProds || hasDemoInvs) {
      const cleanedP = rawProds.filter(p => !isDemoProduct(p));
      const cleanedI = rawInvs.filter(inv => !isDemoInvoice(inv));
      setProducts(cleanedP);
      productsRef.current = cleanedP;
      localStorage.setItem(STORAGE_KEY_PREFIX + 'PRODUCTS', JSON.stringify(cleanedP));
      setInvoices(cleanedI);
      invoicesRef.current = cleanedI;
      localStorage.setItem(STORAGE_KEY_PREFIX + 'INVOICES', JSON.stringify(cleanedI));
      pushDataToCloud({ products: cleanedP, invoices: cleanedI });
    }
  }, []);

  // =========================================================================
  // CORE CLOUD SYNC ENGINE: INSTANT BROADCAST & REAL-TIME LISTENER
  // =========================================================================

  // Function to push full or partial snapshot to Firestore immediately
  const pushDataToCloud = async (override?: {
    customers?: Customer[];
    suppliers?: Supplier[];
    products?: ProductCatalogItem[];
    invoices?: Invoice[];
    duePayments?: DuePaymentRecord[];
    supplierBills?: SupplierBill[];
    supplierPayments?: SupplierPaymentRecord[];
    expenses?: Expense[];
    openingCashList?: OpeningCashRecord[];
    otherCashInList?: OtherCashInRecord[];
    cashTallies?: CashTallyRecord[];
    users?: UserAccount[];
    branches?: Branch[];
    smtpSettings?: SMTPSettings | null;
    auditLogs?: AuditLog[];
    recycleBin?: RecycleBinItem[];
    investments?: Investment[];
    loans?: BankLoan[];
    loanRepayments?: LoanRepayment[];
    employees?: Employee[];
    employeePayments?: EmployeePayment[];
  }) => {
    try {
      setIsSyncingNow(true);
      const payload = {
        customers: override?.customers ?? customersRef.current,
        suppliers: override?.suppliers ?? suppliersRef.current,
        products: override?.products ?? productsRef.current,
        invoices: override?.invoices ?? invoicesRef.current,
        duePayments: override?.duePayments ?? duePaymentsRef.current,
        supplierBills: override?.supplierBills ?? supplierBillsRef.current,
        supplierPayments: override?.supplierPayments ?? supplierPaymentsRef.current,
        expenses: override?.expenses ?? expensesRef.current,
        openingCashList: override?.openingCashList ?? openingCashListRef.current,
        otherCashInList: override?.otherCashInList ?? otherCashInListRef.current,
        cashTallies: override?.cashTallies ?? cashTalliesRef.current,
        users: override?.users ?? usersRef.current,
        branches: override?.branches ?? branchesRef.current,
        smtpSettings: override?.smtpSettings ?? smtpSettingsRef.current,
        auditLogs: override?.auditLogs ?? auditLogsRef.current,
        recycleBin: override?.recycleBin ?? recycleBinRef.current,
        investments: override?.investments ?? investmentsRef.current,
        loans: override?.loans ?? loansRef.current,
        loanRepayments: override?.loanRepayments ?? loanRepaymentsRef.current,
        employees: override?.employees ?? employeesRef.current,
        employeePayments: override?.employeePayments ?? employeePaymentsRef.current,
        lastUpdatedBy: CLIENT_ID,
        updatedAt: new Date().toISOString()
      };
      
      const response = await fetch('/api/shopData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ shopId: FIRESTORE_SHOP_DOC_ID, payload })
      });
      if (response.ok) {
        setIsCloudSynced(true);
        setCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
      } else {
        setIsCloudSynced(false);
      }
    } catch (err: any) {
      console.warn('API push error:', err);
      setIsCloudSynced(false);
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Helper to apply incoming cloud document to local states and storage
  const applyCloudData = (cloudData: any) => {
    isIncomingRemoteUpdateRef.current = true;
    hasLoadedInitialCloudRef.current = true;

    if (Array.isArray(cloudData.customers)) {
      setCustomers(cloudData.customers);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'CUSTOMERS', JSON.stringify(cloudData.customers));
    }
    if (Array.isArray(cloudData.suppliers)) {
      setSuppliers(cloudData.suppliers);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIERS', JSON.stringify(cloudData.suppliers));
    }
    if (Array.isArray(cloudData.products)) {
      const cleanProducts = cloudData.products.filter((p: any) => !isDemoProduct(p));
      setProducts(cleanProducts);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'PRODUCTS', JSON.stringify(cleanProducts));
    }
    if (Array.isArray(cloudData.invoices)) {
      const cleanInvoices = cloudData.invoices.filter((inv: any) => !isDemoInvoice(inv));
      setInvoices(cleanInvoices);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'INVOICES', JSON.stringify(cleanInvoices));
    }
    if (Array.isArray(cloudData.duePayments)) {
      setDuePayments(cloudData.duePayments);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'DUE_PAYMENTS', JSON.stringify(cloudData.duePayments));
    }
    if (Array.isArray(cloudData.supplierBills)) {
      setSupplierBills(cloudData.supplierBills);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIER_BILLS', JSON.stringify(cloudData.supplierBills));
    }
    if (Array.isArray(cloudData.supplierPayments)) {
      setSupplierPayments(cloudData.supplierPayments);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIER_PAYMENTS', JSON.stringify(cloudData.supplierPayments));
    }
    if (Array.isArray(cloudData.expenses)) {
      setExpenses(cloudData.expenses);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'EXPENSES', JSON.stringify(cloudData.expenses));
    }
    if (Array.isArray(cloudData.openingCashList)) {
      setOpeningCashList(cloudData.openingCashList);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'OPENING_CASH', JSON.stringify(cloudData.openingCashList));
    }
    if (Array.isArray(cloudData.otherCashInList)) {
      setOtherCashInList(cloudData.otherCashInList);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'OTHER_CASH_IN', JSON.stringify(cloudData.otherCashInList));
    }
    if (Array.isArray(cloudData.cashTallies)) {
      setCashTallies(cloudData.cashTallies);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'CASH_TALLIES', JSON.stringify(cloudData.cashTallies));
    }
    if (Array.isArray(cloudData.investments)) {
      setInvestments(cloudData.investments);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'INVESTMENTS', JSON.stringify(cloudData.investments));
    }
    if (Array.isArray(cloudData.loans)) {
      setLoans(cloudData.loans);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'LOANS', JSON.stringify(cloudData.loans));
    }
    if (Array.isArray(cloudData.loanRepayments)) {
      setLoanRepayments(cloudData.loanRepayments);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'LOAN_REPAYMENTS', JSON.stringify(cloudData.loanRepayments));
    }
    if (Array.isArray(cloudData.employees)) {
      setEmployees(cloudData.employees);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'EMPLOYEES', JSON.stringify(cloudData.employees));
    }
    if (Array.isArray(cloudData.employeePayments)) {
      setEmployeePayments(cloudData.employeePayments);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'EMPLOYEE_PAYMENTS', JSON.stringify(cloudData.employeePayments));
    }
    if (cloudData.smtpSettings) {
      setSmtpSettings(cloudData.smtpSettings);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'SMTP', JSON.stringify(cloudData.smtpSettings));
    }
    if (Array.isArray(cloudData.users) && cloudData.users.length > 0) {
      // Auto-migrate cloud users too and remove any 139210 password
      let incomingUsers = cloudData.users;
      let needsCloudUpdate = false;
      incomingUsers = incomingUsers.map((u: any) => {
        // Delete/replace any instance of old password 139210
        if (u.pinOrPassword === '139210' || (u.role === 'admin' && (u.pinOrPassword === '139210' || (u.id === 'u_admin_1' && u.pinOrPassword !== '102267')))) {
          needsCloudUpdate = true;
          return { ...u, pinOrPassword: '102267' };
        }
        return u;
      });
      setUsers(incomingUsers);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'USERS', JSON.stringify(incomingUsers));
      if (needsCloudUpdate) {
        setTimeout(() => {
          pushDataToCloud({ users: incomingUsers });
        }, 500);
      }
    }
    if (Array.isArray(cloudData.auditLogs)) {
      setAuditLogs(cloudData.auditLogs);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'AUDIT_LOGS', JSON.stringify(cloudData.auditLogs));
    }
    if (Array.isArray(cloudData.recycleBin)) {
      const cleanRecycleBin = cloudData.recycleBin.filter((r: any) => r.id !== 'rec_demo_1' && !isDemoInvoice(r.originalData));
      setRecycleBin(cleanRecycleBin);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'RECYCLE_BIN', JSON.stringify(cleanRecycleBin));
    }
    if (Array.isArray(cloudData.branches) && cloudData.branches.length > 0) {
      setBranches(cloudData.branches);
      try {
        localStorage.setItem('ML_ELECTRIC_BRANCHES', JSON.stringify(cloudData.branches));
      } catch {}
    }
    if (cloudData.branchName || cloudData.branchInfo?.name) {
      const bName = cloudData.branchName || cloudData.branchInfo?.name;
      try {
        localStorage.setItem(`ML_ELECTRIC_${ACTIVE_BRANCH_ID}_BRANCH_NAME`, bName);
      } catch {}
    }

    setIsCloudSynced(true);
    setCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));

    setTimeout(() => {
      isIncomingRemoteUpdateRef.current = false;
    }, 300);
  };

  // Polling listener
  useEffect(() => {
    let interval: any;
    
    const fetchBranches = async () => {
      try {
        const response = await fetch('/api/branches');
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && Array.isArray(resData.branches) && resData.branches.length > 0) {
            setBranches(resData.branches);
            branchesRef.current = resData.branches;
            try {
              localStorage.setItem('ML_ELECTRIC_BRANCHES', JSON.stringify(resData.branches));
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Branch fetch error:', err);
      }
    };

    const fetchCloudData = async () => {
      try {
        const response = await fetch('/api/shopData?shopId=' + FIRESTORE_SHOP_DOC_ID);
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.data) {
            const cloudData = resData.data;
            if (cloudData.lastUpdatedBy === CLIENT_ID && hasLoadedInitialCloudRef.current) {
              setIsCloudSynced(true);
              setCloudSyncTime(new Date().toLocaleTimeString('bn-BD'));
              return;
            }
            applyCloudData(cloudData);
          } else if (!hasInitializedCloudRef.current) {
            hasInitializedCloudRef.current = true;
            hasLoadedInitialCloudRef.current = true;
            pushDataToCloud();
          }
        }
      } catch (err) {
        console.warn('Polling listener error:', err);
      }
    };
    
    // Initial fetch
    fetchCloudData();
    fetchBranches();
    
    // Poll every 10 seconds
    interval = setInterval(() => {
      if (hasLoadedInitialCloudRef.current) {
         fetchCloudData();
         fetchBranches();
      }
    }, 10000);

    return () => {
      clearInterval(interval);
    };  }, []);

  // Automatic debounced cloud sync for local state mutations that didn't go through dedicated helpers
  useEffect(() => {
    // Skip if we haven't completed initial load from cloud or if update came from remote cloud stream
    if (!hasLoadedInitialCloudRef.current) return;
    if (isIncomingRemoteUpdateRef.current) return;

    const timer = setTimeout(() => {
      pushDataToCloud();
    }, 250);

    return () => clearTimeout(timer);
  }, [customers, suppliers, products, invoices, duePayments, supplierBills, supplierPayments, expenses, openingCashList, otherCashInList, cashTallies, users, auditLogs, recycleBin, smtpSettings]);

  // Manual Force Fetch from Cloud
  const forceSyncFromCloud = async () => {
    try {
      setIsSyncingNow(true);
      const response = await fetch('/api/shopData?shopId=' + FIRESTORE_SHOP_DOC_ID);
      if (response.ok) {
        const resData = await response.json();
        if (resData.success && resData.data) {
          applyCloudData(resData.data);
        }
      }
      setIsCloudSynced(true);
    } catch (e) {
      console.error('Manual force sync error:', e);
      setIsCloudSynced(false);
    } finally {
      setIsSyncingNow(false);
    }
  };

  // Manual Force Push to Cloud
  const forcePushToCloud = async (override?: Parameters<typeof pushDataToCloud>[0]) => {
    await pushDataToCloud(override);
  };

  const syncManagerToBranch = async (manager: UserAccount, targetBranchId: string) => {
    if (targetBranchId === 'ml_electric_main') return;
    try {
      const response = await fetch(`/api/shopData?shopId=${targetBranchId}`);
      if (response.ok) {
        const result = await response.json();
        let targetData = result.data || {};
        
        let targetUsers: UserAccount[] = targetData.users || [];
        
        const existingIndex = targetUsers.findIndex(u => u.id === manager.id);
        if (existingIndex >= 0) {
          targetUsers[existingIndex] = manager;
        } else {
          targetUsers.push(manager);
        }
        
        targetData.users = targetUsers;
        targetData.lastUpdatedBy = 'admin';
        targetData.updatedAt = new Date().toISOString();
        
        await fetch('/api/shopData', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopId: targetBranchId, payload: targetData })
        });

        // Also push to Firestore
        try {
          const branchDocRef = doc(db, 'shops', targetBranchId);
          await setDoc(branchDocRef, targetData, { merge: true });
        } catch (fErr) {
          console.warn("Firestore syncManagerToBranch error:", fErr);
        }
      }
    } catch (err) {
      console.error("Error syncing manager to branch:", err);
    }
  };

  const removeUserFromBranch = async (userId: string, targetBranchId: string) => {
    if (!targetBranchId || targetBranchId === 'ml_electric_main') return;
    try {
      const response = await fetch(`/api/shopData?shopId=${targetBranchId}`);
      if (response.ok) {
        const result = await response.json();
        let targetData = result.data || {};
        let targetUsers: UserAccount[] = targetData.users || [];
        targetData.users = targetUsers.filter(u => u.id !== userId);
        targetData.lastUpdatedBy = 'admin';
        targetData.updatedAt = new Date().toISOString();
        
        await fetch('/api/shopData', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopId: targetBranchId, payload: targetData })
        });
        try {
          const branchDocRef = doc(db, 'shops', targetBranchId);
          await setDoc(branchDocRef, targetData, { merge: true });
        } catch {}
      }
    } catch (err) {
      console.error("Error removing user from branch:", err);
    }
  };

  const addBranch = async (branchData: { name: string; location?: string; phone?: string }): Promise<Branch> => {
    const newBranch: Branch = {
      id: 'branch_' + Date.now(),
      name: branchData.name.trim(),
      location: branchData.location?.trim() || '',
      phone: branchData.phone?.trim() || '',
      createdAt: new Date().toISOString()
    };

    const nextBranches = [...branchesRef.current, newBranch];
    setBranches(nextBranches);
    branchesRef.current = nextBranches;
    try {
      localStorage.setItem('ML_ELECTRIC_BRANCHES', JSON.stringify(nextBranches));
    } catch {}

    // Initialize blank shop for branch with products catalog but NO auto-created users/managers
    const initialBranchData = {
      customers: [],
      suppliers: [],
      products: INITIAL_PRODUCTS,
      invoices: [],
      duePayments: [],
      supplierBills: [],
      supplierPayments: [],
      expenses: [],
      openingCashList: [],
      otherCashInList: [],
      cashTallies: [],
      users: [],
      branches: nextBranches,
      branchInfo: newBranch,
      branchName: newBranch.name,
      auditLogs: [],
      recycleBin: [],
      lastUpdatedBy: 'admin',
      updatedAt: new Date().toISOString()
    };

    try {
      await fetch('/api/shopData', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopId: newBranch.id, payload: initialBranchData })
      });
      const branchDocRef = doc(db, 'shops', newBranch.id);
      await setDoc(branchDocRef, initialBranchData);
    } catch (err) {
      console.error("Error initializing branch shop data:", err);
    }

    forcePushToCloud({ branches: nextBranches });
    return newBranch;
  };

  const updateBranch = async (updatedBranch: Branch): Promise<void> => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে শাখা এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const nextBranches = branchesRef.current.map(b => b.id === updatedBranch.id ? updatedBranch : b);
    setBranches(nextBranches);
    branchesRef.current = nextBranches;
    try {
      localStorage.setItem('ML_ELECTRIC_BRANCHES', JSON.stringify(nextBranches));
    } catch {}
    forcePushToCloud({ branches: nextBranches });
  };

  const deleteBranch = async (branchId: string): Promise<void> => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে শাখা ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const nextBranches = branchesRef.current.filter(b => b.id !== branchId);
    setBranches(nextBranches);
    branchesRef.current = nextBranches;
    try {
      localStorage.setItem('ML_ELECTRIC_BRANCHES', JSON.stringify(nextBranches));
    } catch {}

    // Delete branch shop data from PostgreSQL and Firestore
    try {
      await fetch(`/api/shopData?shopId=${branchId}`, { method: 'DELETE' });
      await deleteDoc(doc(db, 'shops', branchId));
    } catch (err) {
      console.error("Error deleting branch from cloud:", err);
    }

    // Clean up users that were assigned to this branch
    const nextUsers = usersRef.current.filter(u => u.branchId !== branchId);
    setUsers(nextUsers);
    usersRef.current = nextUsers;
    forcePushToCloud({ branches: nextBranches, users: nextUsers });
  };

  const addUser = async (userData: {
    name: string;
    username?: string;
    phone?: string;
    pinOrPassword: string;
    role: 'admin' | 'manager';
    branchId?: string;
  }): Promise<UserAccount> => {
    const phone = (userData.phone || '').trim();
    const name = userData.name.trim();
    const username = (userData.username || phone || 'user_' + Date.now()).trim();
    const pinOrPassword = userData.pinOrPassword.trim();
    const branchId = userData.branchId || 'ml_electric_main';
    const role = userData.role;
    const branchObj = branchesRef.current.find(b => b.id === branchId);
    const branchName = branchObj ? branchObj.name : (branchId === 'ml_electric_main' ? 'প্রধান কার্যালয়' : '');

    const newUser: UserAccount = {
      id: 'u_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      name,
      username,
      phone,
      pinOrPassword,
      role,
      branchId,
      branchName,
      branchLocation: branchObj?.location || '',
      isActive: true,
      createdAt: new Date().toISOString()
    };

    const nextUsers = [...usersRef.current.filter(u => u.id !== newUser.id), newUser];
    setUsers(nextUsers);
    usersRef.current = nextUsers;

    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'USERS', JSON.stringify(nextUsers));
      localStorage.setItem('ML_ELECTRIC_ml_electric_main_USERS', JSON.stringify(nextUsers));
      if (branchId !== 'ml_electric_main') {
        localStorage.setItem(`ML_ELECTRIC_${branchId}_USERS`, JSON.stringify(nextUsers));
      }
    } catch (e) {}

    // Force push to cloud database (Postgres & Firestore)
    try {
      await forcePushToCloud({ users: nextUsers });
    } catch (err) {
      console.warn("Could not push users to main cloud:", err);
    }

    if (branchId && branchId !== 'ml_electric_main') {
      try {
        await syncManagerToBranch(newUser, branchId);
      } catch (err) {
        console.warn("Could not sync manager to branch:", err);
      }
    }

    return newUser;
  };

  const updateUser = async (updatedUser: UserAccount): Promise<void> => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে ব্যবহারকারী তথ্য এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const branchObj = branchesRef.current.find(b => b.id === updatedUser.branchId);
    const userToSave: UserAccount = {
      ...updatedUser,
      branchName: branchObj ? branchObj.name : (updatedUser.branchName || (updatedUser.branchId === 'ml_electric_main' ? 'প্রধান কার্যালয়' : '')),
      branchLocation: branchObj?.location || updatedUser.branchLocation
    };

    const nextUsers = usersRef.current.map(u => u.id === userToSave.id ? userToSave : u);
    setUsers(nextUsers);
    usersRef.current = nextUsers;

    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'USERS', JSON.stringify(nextUsers));
      localStorage.setItem('ML_ELECTRIC_ml_electric_main_USERS', JSON.stringify(nextUsers));
      if (updatedUser.branchId && updatedUser.branchId !== 'ml_electric_main') {
        localStorage.setItem(`ML_ELECTRIC_${updatedUser.branchId}_USERS`, JSON.stringify(nextUsers));
      }
    } catch (e) {}

    try {
      await forcePushToCloud({ users: nextUsers });
    } catch (err) {
      console.warn("Could not push updated user to cloud:", err);
    }

    if (updatedUser.branchId && updatedUser.branchId !== 'ml_electric_main') {
      try {
        await syncManagerToBranch(updatedUser, updatedUser.branchId);
      } catch (err) {
        console.warn("Could not sync updated manager to branch:", err);
      }
    }
  };

  const deleteUser = async (userId: string): Promise<void> => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে ব্যবহারকারী মুছে ফেলার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const userToDelete = usersRef.current.find(u => u.id === userId);
    const nextUsers = usersRef.current.filter(u => u.id !== userId);
    setUsers(nextUsers);
    usersRef.current = nextUsers;

    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + 'USERS', JSON.stringify(nextUsers));
      localStorage.setItem('ML_ELECTRIC_ml_electric_main_USERS', JSON.stringify(nextUsers));
    } catch (e) {}

    try {
      await forcePushToCloud({ users: nextUsers });
    } catch (err) {
      console.warn("Could not push user deletion to cloud:", err);
    }

    if (userToDelete?.branchId && userToDelete.branchId !== 'ml_electric_main') {
      try {
        await removeUserFromBranch(userId, userToDelete.branchId);
      } catch (err) {
        console.warn("Could not remove user from branch:", err);
      }
    }
  };

  const addAuditLog = (category: AuditLog['category'], action: string, description: string, details?: Record<string, unknown>) => {
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category,
      action,
      description,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString(),
      details
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;
    return nextLogs;
  };

  const moveToRecycleBin = (type: RecycleBinItem['type'], name: string, data: unknown, amount?: number) => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে কোনো রেকর্ড ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const item: RecycleBinItem = {
      id: 'rec_' + Date.now(),
      type,
      name,
      amount,
      date: selectedDate,
      deletedAt: new Date().toISOString(),
      deletedBy: currentUser.name,
      originalData: data
    };
    const nextBin = [item, ...recycleBinRef.current];
    setRecycleBin(nextBin);
    recycleBinRef.current = nextBin;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'RECYCLE_BIN', JSON.stringify(nextBin));
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'সিস্টেম',
      action: 'ডিলিট',
      description: `${name} রিসাইকেল বিনে পাঠানো হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    pushDataToCloud({ recycleBin: nextBin, auditLogs: nextLogs });
  };

  const restoreFromRecycleBin = (id: string) => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে রিসাইকেল বিনের রেকর্ড রিস্টোর করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const item = recycleBinRef.current.find(r => r.id === id);
    if (!item) return;
    
    const nextBin = recycleBinRef.current.filter(r => r.id !== id);
    setRecycleBin(nextBin);
    recycleBinRef.current = nextBin;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'RECYCLE_BIN', JSON.stringify(nextBin));

    let nextInvoices = invoicesRef.current;
    let nextCustomers = customersRef.current;
    let nextSuppliers = suppliersRef.current;
    let nextExpenses = expensesRef.current;
    let nextDuePayments = duePaymentsRef.current;
    let nextSupplierBills = supplierBillsRef.current;

    // Restore based on type
    if (item.type === 'invoice') {
      const restoredInv = item.originalData as Invoice;
      nextInvoices = [restoredInv, ...nextInvoices];
      setInvoices(nextInvoices);
      invoicesRef.current = nextInvoices;
      localStorage.setItem(STORAGE_KEY_PREFIX + 'INVOICES', JSON.stringify(nextInvoices));

      // Re-deduct product stock
      let nextProducts = [...productsRef.current];
      if (Array.isArray(restoredInv.items) && restoredInv.items.length > 0) {
        restoredInv.items.forEach(invItem => {
          const qty = Number(invItem.quantity) || 0;
          if (qty <= 0) return;
          const isExchangeReturn = invItem.category === 'এক্সচেঞ্জ ফেরত' || invItem.name?.startsWith('[ফেরত মাল]');
          const prodIdx = nextProducts.findIndex(p => {
            if (invItem.productId && p.id === invItem.productId) return true;
            const clean = (invItem.name || '').replace(/^\[(নতুন মাল|ফেরত মাল)\]\s*/, '').trim().toLowerCase();
            return p.name.trim().toLowerCase() === clean || (invItem.code && p.code === invItem.code) || p.id === invItem.id;
          });
          if (prodIdx !== -1) {
            const curStock = Number(nextProducts[prodIdx].stock) || 0;
            const updatedStock = isExchangeReturn ? curStock + qty : curStock - qty;
            nextProducts[prodIdx] = {
              ...nextProducts[prodIdx],
              stock: Math.round(updatedStock * 100) / 100,
              updatedAt: new Date().toISOString()
            };
          }
        });
        productsRef.current = nextProducts;
        setProducts(nextProducts);
        localStorage.setItem(STORAGE_KEY_PREFIX + 'PRODUCTS', JSON.stringify(nextProducts));
      }

      // Re-apply customer balance
      if (restoredInv.customerId) {
        const revertPurchased = restoredInv.grandTotal || 0;
        const revertPaid = (restoredInv.cashPaid || 0) + (restoredInv.onlinePaid || 0);
        const revertDue = restoredInv.dueAmount !== undefined ? restoredInv.dueAmount : (revertPurchased - revertPaid);
        nextCustomers = customersRef.current.map(c => {
          if (c.id === restoredInv.customerId) {
            return {
              ...c,
              totalPurchased: (c.totalPurchased || 0) + revertPurchased,
              totalPaid: (c.totalPaid || 0) + revertPaid,
              currentDue: (c.currentDue || 0) + revertDue,
              updatedAt: new Date().toISOString()
            };
          }
          return c;
        });
        customersRef.current = nextCustomers;
        setCustomers(nextCustomers);
        localStorage.setItem(STORAGE_KEY_PREFIX + 'CUSTOMERS', JSON.stringify(nextCustomers));
      }
    } else if (item.type === 'supplier_bill') {
      const restoredBill = item.originalData as SupplierBill;
      nextSupplierBills = [restoredBill, ...nextSupplierBills];
      setSupplierBills(nextSupplierBills);
      supplierBillsRef.current = nextSupplierBills;
      localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIER_BILLS', JSON.stringify(nextSupplierBills));

      // Re-apply supplier accounts
      nextSuppliers = suppliersRef.current.map(s => {
        if (s.id === restoredBill.supplierId) {
          return {
            ...s,
            totalPurchased: (s.totalPurchased || 0) + (Number(restoredBill.totalAmount) || 0),
            totalPaid: (s.totalPaid || 0) + ((Number(restoredBill.cashPaid) || 0) + (Number(restoredBill.onlinePaid) || 0)),
            currentPayable: (s.currentPayable || 0) + (Number(restoredBill.dueAmount) || 0)
          };
        }
        return s;
      });
      suppliersRef.current = nextSuppliers;
      setSuppliers(nextSuppliers);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIERS', JSON.stringify(nextSuppliers));

      // Re-add product stock (+)
      let nextProducts = [...productsRef.current];
      const itemsToRestore = extractSupplierBillItems(restoredBill);

      itemsToRestore.forEach(it => {
        const qty = Number(it.quantity) || 0;
        if (qty <= 0) return;
        const prodIndex = nextProducts.findIndex(p => {
          if (it.productId && p.id === it.productId) return true;
          return p.name.trim().toLowerCase() === it.name.trim().toLowerCase();
        });
        if (prodIndex !== -1) {
          const curStock = Number(nextProducts[prodIndex].stock) || 0;
          nextProducts[prodIndex] = {
            ...nextProducts[prodIndex],
            stock: Math.round((curStock + qty) * 100) / 100,
            updatedAt: new Date().toISOString()
          };
        }
      });
      productsRef.current = nextProducts;
      setProducts(nextProducts);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'PRODUCTS', JSON.stringify(nextProducts));
    } else if (item.type === 'customer') {
      nextCustomers = [item.originalData as Customer, ...nextCustomers];
      setCustomers(nextCustomers);
    } else if (item.type === 'supplier') {
      nextSuppliers = [item.originalData as Supplier, ...nextSuppliers];
      setSuppliers(nextSuppliers);
    } else if (item.type === 'expense') {
      nextExpenses = [item.originalData as Expense, ...nextExpenses];
      setExpenses(nextExpenses);
    } else if (item.type === 'due_payment') {
      nextDuePayments = [item.originalData as DuePaymentRecord, ...nextDuePayments];
      setDuePayments(nextDuePayments);
    } else if (item.type === 'investment') {
      const nextInv = [item.originalData as Investment, ...investmentsRef.current];
      setInvestments(nextInv);
      investmentsRef.current = nextInv;
      localStorage.setItem(STORAGE_KEY_PREFIX + 'INVESTMENTS', JSON.stringify(nextInv));
    } else if (item.type === 'loan') {
      const nextLoans = [item.originalData as BankLoan, ...loansRef.current];
      setLoans(nextLoans);
      loansRef.current = nextLoans;
      localStorage.setItem(STORAGE_KEY_PREFIX + 'LOANS', JSON.stringify(nextLoans));
    } else if (item.type === 'loan_repayment') {
      const nextReps = [item.originalData as LoanRepayment, ...loanRepaymentsRef.current];
      setLoanRepayments(nextReps);
      loanRepaymentsRef.current = nextReps;
      localStorage.setItem(STORAGE_KEY_PREFIX + 'LOAN_REPAYMENTS', JSON.stringify(nextReps));
    }

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'সিস্টেম',
      action: 'রিস্টোর',
      description: `${item.name} সফলভাবে উদ্ধার করা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    pushDataToCloud({
      recycleBin: nextBin,
      invoices: nextInvoices,
      customers: nextCustomers,
      products: productsRef.current,
      suppliers: nextSuppliers,
      supplierBills: nextSupplierBills,
      expenses: nextExpenses,
      duePayments: nextDuePayments,
      investments: investmentsRef.current,
      loans: loansRef.current,
      loanRepayments: loanRepaymentsRef.current,
      auditLogs: nextLogs
    });
  };

  const permanentDeleteFromRecycleBin = (id: string) => {
    if (currentUser?.role !== 'admin') {
      alert('রিসাইকেল বিন থেকে স্থায়ীভাবে ডিলিট করার অনুমতি শুধুমাত্র অ্যাডমিন (Admin) অ্যাকাউন্টের রয়েছে।');
      return;
    }
    const nextBin = recycleBinRef.current.filter(r => r.id !== id);
    setRecycleBin(nextBin);
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'সিস্টেম',
      action: 'স্থায়ী ডিলিট',
      description: `রিসাইকেল বিন থেকে স্থায়ীভাবে মুছে ফেলা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;
    pushDataToCloud({ recycleBin: nextBin, auditLogs: nextLogs });
  };

  const emptyRecycleBin = () => {
    if (currentUser?.role !== 'admin') {
      alert('রিসাইকেল বিন সম্পূর্ণ খালি করার অনুমতি শুধুমাত্র অ্যাডমিন (Admin) অ্যাকাউন্টের রয়েছে।');
      return;
    }
    setRecycleBin([]);
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'সিস্টেম',
      action: 'বিন খালি',
      description: `রিসাইকেল বিনের সকল ফাইল খালি করা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;
    pushDataToCloud({ recycleBin: [], auditLogs: nextLogs });
  };

  // Products & Stock Management with Instant Cloud Persistence
  const addProduct = (product: ProductCatalogItem) => {
    const nextProducts = [product, ...productsRef.current];
    setProducts(nextProducts);
    productsRef.current = nextProducts;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'PRODUCTS', JSON.stringify(nextProducts));
    pushDataToCloud({ products: nextProducts });

    addAuditLog('সিস্টেম', 'নতুন পণ্য', `পণ্য যুক্ত করা হয়েছে: ${product.name} (কোড: ${product.code || 'N/A'}, স্টক: ${product.stock} ${product.unit || 'KG'})`);
  };

  const updateProduct = (id: string, updated: Partial<ProductCatalogItem>) => {
    if (currentUser?.role === 'manager' && (updated.name !== undefined || updated.salePrice !== undefined || updated.purchasePrice !== undefined || updated.code !== undefined)) {
      alert('ম্যানেজার একাউন্ট থেকে প্রোডাক্ট এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const nextProducts = productsRef.current.map(p => p.id === id ? { ...p, ...updated, updatedAt: new Date().toISOString() } : p);
    setProducts(nextProducts);
    productsRef.current = nextProducts;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'PRODUCTS', JSON.stringify(nextProducts));
    pushDataToCloud({ products: nextProducts });
  };

  const deleteProduct = (id: string) => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে প্রোডাক্ট ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const target = productsRef.current.find(p => p.id === id);
    const nextProducts = productsRef.current.filter(p => p.id !== id);
    setProducts(nextProducts);
    productsRef.current = nextProducts;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'PRODUCTS', JSON.stringify(nextProducts));
    pushDataToCloud({ products: nextProducts });

    if (target) {
      addAuditLog('সিস্টেম', 'পণ্য মুছে ফেলা', `পণ্য মুছে ফেলা হয়েছে: ${target.name} (কোড: ${target.code || 'N/A'})`);
    }
  };

  // Add Invoice & Update Customer due with Instant Cloud Broadcast
  const addCustomer = (customer: Customer) => {
    const nextCustomers = [customer, ...customersRef.current];
    customersRef.current = nextCustomers;
    setCustomers(nextCustomers);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'CUSTOMERS', JSON.stringify(nextCustomers));
    pushDataToCloud({ customers: nextCustomers });
  };

  const addSupplier = (supplier: Supplier) => {
    const cleanOpening = Number(supplier.openingPayable ?? supplier.openingBalance ?? supplier.previousDue ?? 0) || 0;
    const finalSupplier: Supplier = {
      ...supplier,
      openingPayable: cleanOpening,
      openingBalance: cleanOpening,
      previousDue: cleanOpening,
      currentPayable: supplier.currentPayable !== undefined && supplier.currentPayable > 0
        ? supplier.currentPayable
        : cleanOpening
    };
    const nextSuppliers = [finalSupplier, ...suppliersRef.current];
    suppliersRef.current = nextSuppliers;
    setSuppliers(nextSuppliers);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIERS', JSON.stringify(nextSuppliers));
    pushDataToCloud({ suppliers: nextSuppliers });

    addAuditLog('সাপ্লায়ার', 'নতুন সাপ্লায়ার', `নতুন সাপ্লায়ার যুক্ত: ${finalSupplier.companyName || finalSupplier.name} (পূর্বের বকেয়া: ${cleanOpening} ৳)`);
  };

  const updateSupplier = (id: string, updated: Partial<Supplier>) => {
    const nextSuppliers = suppliersRef.current.map(s => {
      if (s.id === id) {
        const merged = { ...s, ...updated };
        const cleanOpening = Number(merged.openingPayable ?? merged.openingBalance ?? merged.previousDue ?? 0) || 0;
        return {
          ...merged,
          openingPayable: cleanOpening,
          openingBalance: cleanOpening,
          previousDue: cleanOpening
        };
      }
      return s;
    });
    suppliersRef.current = nextSuppliers;
    setSuppliers(nextSuppliers);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIERS', JSON.stringify(nextSuppliers));
    pushDataToCloud({ suppliers: nextSuppliers });

    const sup = nextSuppliers.find(s => s.id === id);
    if (sup) {
      addAuditLog('সাপ্লায়ার', 'সাপ্লায়ার আপডেট', `সাপ্লায়ার তথ্য সংশোধন: ${sup.companyName || sup.name}`);
    }
  };

  const addInvoice = (invData: Omit<Invoice, 'id' | 'createdAt' | 'createdBy'>): Invoice => {
    const customer = invData.customerId ? customersRef.current.find(c => c.id === invData.customerId) : null;
    const prevDue = invData.previousDue !== undefined ? invData.previousDue : (customer ? (customer.currentDue || 0) : 0);
    const totDue = invData.totalDue !== undefined ? invData.totalDue : (prevDue + (invData.dueAmount || 0));

    const newInvoice: Invoice = {
      ...invData,
      previousDue: prevDue,
      totalDue: totDue,
      id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
    };

    const nextInvoices = [newInvoice, ...invoicesRef.current];
    setInvoices(nextInvoices);
    invoicesRef.current = nextInvoices;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'INVOICES', JSON.stringify(nextInvoices));

    let nextCustomers = customersRef.current;
    if (invData.customerId) {
      nextCustomers = customersRef.current.map(c => {
        if (c.id === invData.customerId) {
          const newPurchased = (c.totalPurchased || 0) + invData.grandTotal;
          const newPaid = (c.totalPaid || 0) + (invData.cashPaid + invData.onlinePaid);
          const newDue = (c.currentDue || 0) + invData.grandTotal - (invData.cashPaid + invData.onlinePaid);
          return {
            ...c,
            totalPurchased: newPurchased,
            totalPaid: newPaid,
            currentDue: newDue,
          };
        }
        return c;
      });
      setCustomers(nextCustomers);
      customersRef.current = nextCustomers;
      localStorage.setItem(STORAGE_KEY_PREFIX + 'CUSTOMERS', JSON.stringify(nextCustomers));
    }

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'ইনভয়েস',
      action: 'নতুন বিক্রি',
      description: `ইনভয়েস #${newInvoice.invoiceNo} তৈরি করা হয়েছে। মোট: ${newInvoice.grandTotal} ৳, নগদ: ${newInvoice.cashPaid} ৳, বাকি: ${newInvoice.dueAmount} ৳`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;
    auditLogsRef.current = nextLogs;

    // Instant multi-device sync
    pushDataToCloud({
      invoices: nextInvoices,
      customers: nextCustomers,
      auditLogs: nextLogs
    });

    return newInvoice;
  };

  const deleteInvoice = (idOrInvoice: string | Invoice) => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে কোনো ইনভয়েস ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const targetInvoice = typeof idOrInvoice === 'string'
      ? invoicesRef.current.find(i => i.id === idOrInvoice)
      : idOrInvoice;
    if (!targetInvoice) return;

    // 1. Auto return sold items back to stock!
    let nextProducts = [...productsRef.current];
    if (Array.isArray(targetInvoice.items) && targetInvoice.items.length > 0) {
      targetInvoice.items.forEach(item => {
        const qty = Number(item.quantity) || 0;
        if (qty <= 0) return;
        const isExchangeReturn = item.category === 'এক্সচেঞ্জ ফেরত' || item.name?.startsWith('[ফেরত মাল]');
        const prodIndex = nextProducts.findIndex(p => {
          if (item.productId && p.id === item.productId) return true;
          const cleanItemName = (item.name || '').replace(/^\[(নতুন মাল|ফেরত মাল)\]\s*/, '').trim().toLowerCase();
          return p.name.trim().toLowerCase() === cleanItemName || (item.code && p.code === item.code) || p.id === item.id;
        });
        if (prodIndex !== -1) {
          const curStock = Number(nextProducts[prodIndex].stock) || 0;
          const updatedStock = isExchangeReturn ? curStock - qty : curStock + qty;
          nextProducts[prodIndex] = {
            ...nextProducts[prodIndex],
            stock: Math.round(updatedStock * 100) / 100,
            updatedAt: new Date().toISOString()
          };
        }
      });
      productsRef.current = nextProducts;
      setProducts(nextProducts);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'PRODUCTS', JSON.stringify(nextProducts));
    }

    // 2. Revert Customer Balances
    let nextCustomers = customersRef.current;
    if (targetInvoice.customerId) {
      const revertPurchased = targetInvoice.grandTotal || 0;
      const revertPaid = (targetInvoice.cashPaid || 0) + (targetInvoice.onlinePaid || 0);
      const revertDue = targetInvoice.dueAmount !== undefined
        ? targetInvoice.dueAmount
        : (revertPurchased - revertPaid);

      nextCustomers = customersRef.current.map(c => {
        if (c.id === targetInvoice.customerId) {
          return {
            ...c,
            totalPurchased: Math.max(0, (c.totalPurchased || 0) - revertPurchased),
            totalPaid: Math.max(0, (c.totalPaid || 0) - revertPaid),
            currentDue: (c.currentDue || 0) - revertDue,
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      });
      customersRef.current = nextCustomers;
      setCustomers(nextCustomers);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'CUSTOMERS', JSON.stringify(nextCustomers));
    }

    // 3. Move to recycle bin
    moveToRecycleBin('invoice', `ইনভয়েস #${targetInvoice.invoiceNo} (${targetInvoice.customerName || 'কাস্টমার'})`, targetInvoice, targetInvoice.grandTotal);

    // 4. Remove from invoices list
    const nextInvoices = invoicesRef.current.filter(i => i.id !== targetInvoice.id);
    invoicesRef.current = nextInvoices;
    setInvoices(nextInvoices);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'INVOICES', JSON.stringify(nextInvoices));

    // 5. Audit Log
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'ইনভয়েস',
      action: 'ডিলিট',
      description: `ইনভয়েস #${targetInvoice.invoiceNo} মুছে ফেলা হয়েছে এবং এর মালামাল স্বয়ংক্রিয়ভাবে স্টকে ফেরত যোগ করা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    // 6. Push updated state to cloud
    pushDataToCloud({
      invoices: nextInvoices,
      customers: nextCustomers,
      products: nextProducts,
      auditLogs: nextLogs
    });
  };

  // Update Invoice with automatic stock (+/-) & customer balance adjustment
  const updateInvoice = (
    invoiceId: string,
    updatedData: Partial<Invoice>,
    customItems?: InvoiceItem[]
  ): Invoice | undefined => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে কোনো ইনভয়েস এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return undefined;
    }
    const oldInvoice = invoicesRef.current.find(i => i.id === invoiceId);
    if (!oldInvoice) return undefined;

    const oldItems: InvoiceItem[] = Array.isArray(oldInvoice.items) ? oldInvoice.items : [];
    const newItems: InvoiceItem[] = customItems || (updatedData.items ? updatedData.items : oldItems);

    // 1. Stock Adjustment (+/-)
    // Selling item deducts stock.
    // delta = oldQty - newQty.
    // If sold LESS now -> add delta back to stock.
    // If sold MORE now -> deduct delta from stock.
    let nextProducts = [...productsRef.current];

    const oldQtyMap = new Map<string, number>();
    oldItems.forEach(it => {
      const qty = Number(it.quantity) || 0;
      if (qty <= 0) return;
      const key = it.productId || (it.name || '').trim().toLowerCase();
      oldQtyMap.set(key, (oldQtyMap.get(key) || 0) + qty);
    });

    const newQtyMap = new Map<string, number>();
    newItems.forEach(it => {
      const qty = Number(it.quantity) || 0;
      if (qty <= 0) return;
      const key = it.productId || (it.name || '').trim().toLowerCase();
      newQtyMap.set(key, (newQtyMap.get(key) || 0) + qty);
    });

    const allProductKeys = new Set([...oldQtyMap.keys(), ...newQtyMap.keys()]);
    allProductKeys.forEach(key => {
      const oldQty = oldQtyMap.get(key) || 0;
      const newQty = newQtyMap.get(key) || 0;
      const delta = oldQty - newQty;

      if (delta !== 0) {
        const prodIndex = nextProducts.findIndex(p => {
          if (p.id === key) return true;
          return p.name.trim().toLowerCase() === key;
        });
        if (prodIndex !== -1) {
          const curStock = Number(nextProducts[prodIndex].stock) || 0;
          nextProducts[prodIndex] = {
            ...nextProducts[prodIndex],
            stock: Math.round((curStock + delta) * 100) / 100,
            updatedAt: new Date().toISOString()
          };
        }
      }
    });

    productsRef.current = nextProducts;
    setProducts(nextProducts);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'PRODUCTS', JSON.stringify(nextProducts));

    // 2. Customer Ledger Adjustment
    let nextCustomers = [...customersRef.current];
    const oldGrandTotal = Number(oldInvoice.grandTotal) || 0;
    const oldPaid = (Number(oldInvoice.cashPaid) || 0) + (Number(oldInvoice.onlinePaid) || 0);
    const oldDue = oldInvoice.dueAmount !== undefined ? Number(oldInvoice.dueAmount) : (oldGrandTotal - oldPaid);

    const newGrandTotal = updatedData.grandTotal !== undefined ? Number(updatedData.grandTotal) : oldGrandTotal;
    const newPaid = (updatedData.cashPaid !== undefined ? Number(updatedData.cashPaid) : (Number(oldInvoice.cashPaid) || 0)) + 
                    (updatedData.onlinePaid !== undefined ? Number(updatedData.onlinePaid) : (Number(oldInvoice.onlinePaid) || 0));
    const newDue = updatedData.dueAmount !== undefined ? Number(updatedData.dueAmount) : (newGrandTotal - newPaid);

    const targetCustomerId = updatedData.customerId !== undefined ? updatedData.customerId : oldInvoice.customerId;

    if (oldInvoice.customerId === targetCustomerId && targetCustomerId) {
      const diffPurchased = newGrandTotal - oldGrandTotal;
      const diffPaid = newPaid - oldPaid;
      const diffDue = newDue - oldDue;

      nextCustomers = nextCustomers.map(c => {
        if (c.id === targetCustomerId) {
          return {
            ...c,
            name: updatedData.customerName?.trim() || c.name,
            phone: updatedData.customerPhone?.trim() || c.phone,
            address: updatedData.customerAddress?.trim() || c.address,
            totalPurchased: Math.max(0, (c.totalPurchased || 0) + diffPurchased),
            totalPaid: Math.max(0, (c.totalPaid || 0) + diffPaid),
            currentDue: (c.currentDue || 0) + diffDue,
            updatedAt: new Date().toISOString()
          };
        }
        return c;
      });
    } else {
      if (oldInvoice.customerId) {
        nextCustomers = nextCustomers.map(c => {
          if (c.id === oldInvoice.customerId) {
            return {
              ...c,
              totalPurchased: Math.max(0, (c.totalPurchased || 0) - oldGrandTotal),
              totalPaid: Math.max(0, (c.totalPaid || 0) - oldPaid),
              currentDue: (c.currentDue || 0) - oldDue,
              updatedAt: new Date().toISOString()
            };
          }
          return c;
        });
      }
      if (targetCustomerId) {
        nextCustomers = nextCustomers.map(c => {
          if (c.id === targetCustomerId) {
            return {
              ...c,
              name: updatedData.customerName?.trim() || c.name,
              phone: updatedData.customerPhone?.trim() || c.phone,
              address: updatedData.customerAddress?.trim() || c.address,
              totalPurchased: (c.totalPurchased || 0) + newGrandTotal,
              totalPaid: (c.totalPaid || 0) + newPaid,
              currentDue: (c.currentDue || 0) + newDue,
              updatedAt: new Date().toISOString()
            };
          }
          return c;
        });
      }
    }

    customersRef.current = nextCustomers;
    setCustomers(nextCustomers);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'CUSTOMERS', JSON.stringify(nextCustomers));

    // 3. Update Invoice
    const updatedInvoice: Invoice = {
      ...oldInvoice,
      ...updatedData,
      items: newItems,
      grandTotal: newGrandTotal,
      cashPaid: updatedData.cashPaid !== undefined ? Number(updatedData.cashPaid) : (Number(oldInvoice.cashPaid) || 0),
      onlinePaid: updatedData.onlinePaid !== undefined ? Number(updatedData.onlinePaid) : (Number(oldInvoice.onlinePaid) || 0),
      dueAmount: newDue,
      status: newDue <= 0 ? 'paid' : (newPaid > 0 ? 'partial' : 'due'),
      updatedAt: new Date().toISOString()
    };

    const nextInvoices = invoicesRef.current.map(inv => inv.id === invoiceId ? updatedInvoice : inv);
    invoicesRef.current = nextInvoices;
    setInvoices(nextInvoices);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'INVOICES', JSON.stringify(nextInvoices));

    // 4. Audit Log
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'ইনভয়েস',
      action: 'সংশোধন',
      description: `ইনভয়েস #${updatedInvoice.invoiceNo} (${updatedInvoice.customerName || 'কাস্টমার'}) সংশোধন ও আপডেট করা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    // 5. Cloud push
    pushDataToCloud({
      invoices: nextInvoices,
      customers: nextCustomers,
      products: nextProducts,
      auditLogs: nextLogs
    });

    return updatedInvoice;
  };

  // Add Due Payment & Update Customer with Instant Cloud Broadcast
  const addDuePayment = (paymentData: Omit<DuePaymentRecord, 'id' | 'createdAt' | 'collectedBy'>) => {
    const newPayment: DuePaymentRecord = {
      ...paymentData,
      id: 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString(),
      collectedBy: currentUser.name
    };

    const nextDuePayments = [newPayment, ...duePaymentsRef.current];
    setDuePayments(nextDuePayments);
    duePaymentsRef.current = nextDuePayments;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'DUE_PAYMENTS', JSON.stringify(nextDuePayments));

    const nextCustomers = customersRef.current.map(c => {
      if (c.id === paymentData.customerId) {
        return {
          ...c,
          totalPaid: (c.totalPaid || 0) + paymentData.amount,
          currentDue: (c.currentDue || 0) - paymentData.amount - (paymentData.discount || 0)
        };
      }
      return c;
    });
    setCustomers(nextCustomers);
    customersRef.current = nextCustomers;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'CUSTOMERS', JSON.stringify(nextCustomers));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'বাকি আদায়',
      action: 'বাকি আদায়',
      description: `কাস্টমার ${paymentData.customerName} থেকে ${paymentData.amount} ৳ বাকি আদায় হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    // Instant multi-device sync
    pushDataToCloud({
      duePayments: nextDuePayments,
      customers: nextCustomers,
      auditLogs: nextLogs
    });
  };

  // Add Supplier Bill with Instant Cloud Broadcast
  const addSupplierBill = (billData: Omit<SupplierBill, 'id' | 'createdAt' | 'createdBy'>) => {
    const newBill: SupplierBill = {
      ...billData,
      id: 'sb_' + Date.now(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name
    };

    const nextSupplierBills = [newBill, ...supplierBillsRef.current];
    setSupplierBills(nextSupplierBills);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIER_BILLS', JSON.stringify(nextSupplierBills));

    const nextSuppliers = suppliersRef.current.map(s => {
      if (s.id === billData.supplierId) {
        return {
          ...s,
          totalPurchased: (s.totalPurchased || 0) + billData.totalAmount,
          totalPaid: (s.totalPaid || 0) + (billData.cashPaid + billData.onlinePaid),
          currentPayable: (s.currentPayable || 0) + billData.dueAmount
        };
      }
      return s;
    });
    setSuppliers(nextSuppliers);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIERS', JSON.stringify(nextSuppliers));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'সাপ্লায়ার',
      action: 'মাল ক্রয়',
      description: `সাপ্লায়ার ${billData.supplierName} থেকে ${billData.totalAmount} ৳ মূল্যের মাল ক্রয় এন্ট্রি।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    // Instant multi-device sync
    pushDataToCloud({
      supplierBills: nextSupplierBills,
      suppliers: nextSuppliers,
      auditLogs: nextLogs
    });
  };

  // Delete Supplier Bill with automatic stock deduction (-)
  const deleteSupplierBill = (idOrBill: string | SupplierBill) => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে কোনো বিল ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const targetBill = typeof idOrBill === 'string'
      ? supplierBillsRef.current.find(b => b.id === idOrBill)
      : idOrBill;
    if (!targetBill) return;

    // 1. Auto deduct purchased items from stock! (-)
    let nextProducts = [...productsRef.current];
    const billItems = extractSupplierBillItems(targetBill);
    let totalDeductedKg = 0;

    billItems.forEach(item => {
      const qty = Number(item.quantity) || 0;
      if (qty <= 0) return;
      totalDeductedKg += qty;

      const prodIndex = nextProducts.findIndex(p => {
        if (item.productId && p.id === item.productId) return true;
        const cleanItemName = (item.name || '').trim().toLowerCase();
        return p.name.trim().toLowerCase() === cleanItemName || (item.id && p.id === item.id);
      });

      if (prodIndex !== -1) {
        const curStock = Number(nextProducts[prodIndex].stock) || 0;
        nextProducts[prodIndex] = {
          ...nextProducts[prodIndex],
          stock: Math.max(0, Math.round((curStock - qty) * 100) / 100),
          updatedAt: new Date().toISOString()
        };
      }
    });

    productsRef.current = nextProducts;
    setProducts(nextProducts);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'PRODUCTS', JSON.stringify(nextProducts));

    // 2. Revert Supplier Accounts
    let nextSuppliers = suppliersRef.current;
    if (targetBill.supplierId) {
      const revertPurchased = Number(targetBill.totalAmount) || 0;
      const revertPaid = (Number(targetBill.cashPaid) || 0) + (Number(targetBill.onlinePaid) || 0);
      const revertDue = targetBill.dueAmount !== undefined
        ? Number(targetBill.dueAmount) || 0
        : (revertPurchased - revertPaid);

      nextSuppliers = suppliersRef.current.map(s => {
        if (s.id === targetBill.supplierId) {
          return {
            ...s,
            totalPurchased: Math.max(0, (s.totalPurchased || 0) - revertPurchased),
            totalPaid: Math.max(0, (s.totalPaid || 0) - revertPaid),
            currentPayable: Math.max(0, (s.currentPayable || 0) - revertDue),
            updatedAt: new Date().toISOString()
          };
        }
        return s;
      });
      suppliersRef.current = nextSuppliers;
      setSuppliers(nextSuppliers);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIERS', JSON.stringify(nextSuppliers));
    }

    // 3. Move to recycle bin
    moveToRecycleBin('supplier_bill', `মাল ক্রয় বিল #${targetBill.billNo} (${targetBill.companyName || targetBill.supplierName})`, targetBill, targetBill.totalAmount);

    // 4. Remove from supplierBills list
    const nextSupplierBills = supplierBillsRef.current.filter(b => b.id !== targetBill.id);
    supplierBillsRef.current = nextSupplierBills;
    setSupplierBills(nextSupplierBills);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIER_BILLS', JSON.stringify(nextSupplierBills));

    // 5. Audit Log
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'সাপ্লায়ার',
      action: 'ডিলিট',
      description: `মাল ক্রয় বিল #${targetBill.billNo} (${targetBill.companyName || targetBill.supplierName}) মুছে ফেলা হয়েছে এবং এর মালামাল (${totalDeductedKg > 0 ? toBengaliNumber(totalDeductedKg) + ' কেজি' : ''}) স্টক থেকে স্বয়ংক্রিয়ভাবে মাইনাস (-) করা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    // 6. Push to Cloud
    pushDataToCloud({
      supplierBills: nextSupplierBills,
      suppliers: nextSuppliers,
      products: nextProducts,
      auditLogs: nextLogs
    });
  };

  // Update Supplier Bill with automatic stock +/- adjustment
  const updateSupplierBill = (
    billId: string, 
    updatedBillData: Partial<SupplierBill>, 
    customItems?: SupplierBillItem[]
  ) => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে কোনো বিল এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const oldBill = supplierBillsRef.current.find(b => b.id === billId);
    if (!oldBill) return;

    // 1. Calculate stock difference (+/-) between old items and new items
    const oldItems = extractSupplierBillItems(oldBill);
    const newItems = customItems || (updatedBillData.items ? updatedBillData.items : extractSupplierBillItems({ ...oldBill, ...updatedBillData }));

    const oldStockMap = new Map<string, { name: string; productId?: string; qty: number; rate: number }>();
    oldItems.forEach(it => {
      const nameKey = (it.name || '').trim().toLowerCase();
      if (!nameKey && (it.quantity || 0) <= 0) return;
      const key = it.productId || nameKey;
      const existing = oldStockMap.get(key);
      if (existing) {
        existing.qty += (Number(it.quantity) || 0);
      } else {
        oldStockMap.set(key, { name: it.name.trim(), productId: it.productId, qty: Number(it.quantity) || 0, rate: Number(it.unitPrice) || 0 });
      }
    });

    const newStockMap = new Map<string, { name: string; productId?: string; qty: number; rate: number }>();
    newItems.forEach(it => {
      const nameKey = (it.name || '').trim().toLowerCase();
      if (!nameKey && (it.quantity || 0) <= 0) return;
      const key = it.productId || nameKey;
      const existing = newStockMap.get(key);
      if (existing) {
        existing.qty += (Number(it.quantity) || 0);
      } else {
        newStockMap.set(key, { name: it.name.trim(), productId: it.productId, qty: Number(it.quantity) || 0, rate: Number(it.unitPrice) || 0 });
      }
    });

    let nextProducts = [...productsRef.current];
    const allKeys = new Set([...oldStockMap.keys(), ...newStockMap.keys()]);

    allKeys.forEach(key => {
      const oldEntry = oldStockMap.get(key);
      const newEntry = newStockMap.get(key);
      const oldQty = oldEntry?.qty || 0;
      const newQty = newEntry?.qty || 0;
      const diff = newQty - oldQty;

      if (diff !== 0) {
        const targetName = (newEntry?.name || oldEntry?.name || '').trim();
        const targetId = newEntry?.productId || oldEntry?.productId;

        const prodIdx = nextProducts.findIndex(p => 
          (targetId && p.id === targetId) || 
          p.name.trim().toLowerCase() === targetName.toLowerCase()
        );

        if (prodIdx !== -1) {
          const curStock = Number(nextProducts[prodIdx].stock) || 0;
          const updatedStock = Math.max(0, Math.round((curStock + diff) * 100) / 100);
          nextProducts[prodIdx] = {
            ...nextProducts[prodIdx],
            stock: updatedStock,
            purchasePrice: (newEntry?.rate && newEntry.rate > 0) ? newEntry.rate : nextProducts[prodIdx].purchasePrice,
            updatedAt: new Date().toISOString()
          };
        } else if (newQty > 0 && targetName) {
          // New product added during edit
          const createdProd: ProductCatalogItem = {
            id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            code: `P-${String(nextProducts.length + 1).padStart(3, '0')}`,
            name: targetName,
            category: 'সাধারণ মালামাল',
            purchasePrice: newEntry?.rate || 0,
            salePrice: newEntry?.rate ? Math.round(newEntry.rate * 1.15) : 0,
            stock: newQty,
            unit: 'KG',
            createdAt: new Date().toISOString()
          };
          nextProducts = [createdProd, ...nextProducts];
        }
      }
    });

    productsRef.current = nextProducts;
    setProducts(nextProducts);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'PRODUCTS', JSON.stringify(nextProducts));

    // 2. Adjust supplier accounts
    const newTotal = updatedBillData.totalAmount !== undefined ? Number(updatedBillData.totalAmount) : oldBill.totalAmount;
    const newCash = updatedBillData.cashPaid !== undefined ? Number(updatedBillData.cashPaid) : oldBill.cashPaid;
    const newOnline = updatedBillData.onlinePaid !== undefined ? Number(updatedBillData.onlinePaid) : oldBill.onlinePaid;
    const newDue = updatedBillData.dueAmount !== undefined ? Number(updatedBillData.dueAmount) : Math.max(0, newTotal - (newCash + newOnline));
    const targetSupId = updatedBillData.supplierId || oldBill.supplierId;

    let nextSuppliers = suppliersRef.current.map(s => {
      // If same supplier
      if (s.id === oldBill.supplierId && oldBill.supplierId === targetSupId) {
        const diffTotal = newTotal - oldBill.totalAmount;
        const diffPaid = (newCash + newOnline) - ((oldBill.cashPaid || 0) + (oldBill.onlinePaid || 0));
        const diffDue = newDue - (oldBill.dueAmount || 0);
        return {
          ...s,
          totalPurchased: Math.max(0, (s.totalPurchased || 0) + diffTotal),
          totalPaid: Math.max(0, (s.totalPaid || 0) + diffPaid),
          currentPayable: Math.max(0, (s.currentPayable || 0) + diffDue),
          updatedAt: new Date().toISOString()
        };
      }
      // If supplier changed: revert old supplier
      if (s.id === oldBill.supplierId && oldBill.supplierId !== targetSupId) {
        return {
          ...s,
          totalPurchased: Math.max(0, (s.totalPurchased || 0) - oldBill.totalAmount),
          totalPaid: Math.max(0, (s.totalPaid || 0) - ((oldBill.cashPaid || 0) + (oldBill.onlinePaid || 0))),
          currentPayable: Math.max(0, (s.currentPayable || 0) - (oldBill.dueAmount || 0)),
          updatedAt: new Date().toISOString()
        };
      }
      // If supplier changed: apply to new supplier
      if (s.id === targetSupId && oldBill.supplierId !== targetSupId) {
        return {
          ...s,
          totalPurchased: (s.totalPurchased || 0) + newTotal,
          totalPaid: (s.totalPaid || 0) + (newCash + newOnline),
          currentPayable: (s.currentPayable || 0) + newDue,
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    });
    suppliersRef.current = nextSuppliers;
    setSuppliers(nextSuppliers);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIERS', JSON.stringify(nextSuppliers));

    // 3. Update supplier bills
    const updatedFullBill: SupplierBill = {
      ...oldBill,
      ...updatedBillData,
      items: newItems,
      totalAmount: newTotal,
      cashPaid: newCash,
      onlinePaid: newOnline,
      dueAmount: newDue
    };

    const nextSupplierBills = supplierBillsRef.current.map(b => b.id === billId ? updatedFullBill : b);
    supplierBillsRef.current = nextSupplierBills;
    setSupplierBills(nextSupplierBills);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIER_BILLS', JSON.stringify(nextSupplierBills));

    // 4. Audit Log
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'সাপ্লায়ার',
      action: 'এডিট',
      description: `মাল ক্রয় বিল #${updatedFullBill.billNo} (${updatedFullBill.companyName || updatedFullBill.supplierName}) এডিট করা হয়েছে এবং পণ্যের স্টক (+/-) সমন্বয় করা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    // 5. Cloud broadcast
    pushDataToCloud({
      supplierBills: nextSupplierBills,
      suppliers: nextSuppliers,
      products: nextProducts,
      auditLogs: nextLogs
    });
  };

  // Add Supplier Payment with Instant Cloud Broadcast
  const addSupplierPayment = (paymentData: Omit<SupplierPaymentRecord, 'id' | 'createdAt' | 'paidBy'>) => {
    const newRecord: SupplierPaymentRecord = {
      ...paymentData,
      id: 'sp_' + Date.now(),
      createdAt: new Date().toISOString(),
      paidBy: currentUser.name
    };

    const nextSupplierPayments = [newRecord, ...supplierPaymentsRef.current];
    setSupplierPayments(nextSupplierPayments);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIER_PAYMENTS', JSON.stringify(nextSupplierPayments));

    const nextSuppliers = suppliersRef.current.map(s => {
      if (s.id === paymentData.supplierId) {
        return {
          ...s,
          totalPaid: (s.totalPaid || 0) + paymentData.amount,
          currentPayable: Math.max(0, (s.currentPayable || 0) - paymentData.amount)
        };
      }
      return s;
    });
    setSuppliers(nextSuppliers);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIERS', JSON.stringify(nextSuppliers));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'সাপ্লায়ার',
      action: 'পেমেন্ট প্রদান',
      description: `মহাজন ${paymentData.supplierName}-কে ${paymentData.amount} ৳ পরিশোধ করা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    // Instant multi-device sync
    pushDataToCloud({
      supplierPayments: nextSupplierPayments,
      suppliers: nextSuppliers,
      auditLogs: nextLogs
    });
  };

  // Add Expense with Instant Cloud Broadcast
  const addExpense = (expData: Omit<Expense, 'id' | 'createdAt' | 'createdBy'>) => {
    const newExpense: Expense = {
      ...expData,
      id: 'exp_' + Date.now(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
      recordedBy: currentUser.name
    };

    const nextExpenses = [newExpense, ...expensesRef.current];
    setExpenses(nextExpenses);
    expensesRef.current = nextExpenses;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'EXPENSES', JSON.stringify(nextExpenses));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'খরচ',
      action: 'নতুন খরচ',
      description: `খরচের খাত: ${expData.category}, পরিমাণ: ${expData.amount} ৳`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    // Instant multi-device sync
    pushDataToCloud({
      expenses: nextExpenses,
      auditLogs: nextLogs
    });
  };

  // Set Opening Cash for a date with Instant Cloud Broadcast
  const setOpeningCash = (amount: number, note?: string) => {
    const existingIndex = openingCashListRef.current.findIndex(o => o.date === selectedDate);
    const newRecord: OpeningCashRecord = {
      id: existingIndex >= 0 ? openingCashListRef.current[existingIndex].id : 'oc_' + Date.now(),
      date: selectedDate,
      amount,
      note: note || "",
      setBy: currentUser.name,
      createdAt: existingIndex >= 0 ? openingCashListRef.current[existingIndex].createdAt : new Date().toISOString()
    };

    let nextList: OpeningCashRecord[];
    if (existingIndex >= 0) {
      nextList = [...openingCashListRef.current];
      nextList[existingIndex] = newRecord;
    } else {
      nextList = [...openingCashListRef.current, newRecord];
    }
    setOpeningCashList(nextList);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'OPENING_CASH', JSON.stringify(nextList));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'ক্যাশ',
      action: 'ওপেনিং ক্যাশ',
      description: `${selectedDate} তারিখের জন্য প্রারম্ভিক ক্যাশ নির্ধারণ: ${amount} ৳`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    // Instant multi-device sync
    pushDataToCloud({
      openingCashList: nextList,
      auditLogs: nextLogs
    });
  };

  // Add Other Cash In with Instant Cloud Broadcast
  const addOtherCashIn = (entry: Omit<OtherCashInRecord, 'id' | 'createdAt' | 'receivedBy'>) => {
    const newEntry: OtherCashInRecord = {
      ...entry,
      id: 'oci_' + Date.now(),
      createdAt: new Date().toISOString(),
      receivedBy: currentUser.name
    };

    const nextOtherCash = [newEntry, ...otherCashInListRef.current];
    setOtherCashInList(nextOtherCash);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'OTHER_CASH_IN', JSON.stringify(nextOtherCash));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'ক্যাশ',
      action: 'অন্যান্য ক্যাশ ইন',
      description: `উৎস: ${entry.source}, পরিমাণ: ${entry.amount} ৳ (${entry.paymentMethod === 'online' ? 'অনলাইন' : 'নগদ'})`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    // Instant multi-device sync
    pushDataToCloud({
      otherCashInList: nextOtherCash,
      auditLogs: nextLogs
    });
  };

  // Save Cash Tally for a Date with Instant Cloud Broadcast
  const saveCashTally = (tallyData: Omit<CashTallyRecord, 'id' | 'savedBy' | 'savedAt'>) => {
    const normalizedTargetDate = normalizeDate(tallyData.date);
    const existingIndex = cashTalliesRef.current.findIndex(t => normalizeDate(t.date) === normalizedTargetDate);
    
    // Capture current stock snapshot at the time cash tally is saved (দিনের শেষ স্টক)
    const currentTotalStockKg = productsRef.current.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const currentStockSnapshot = productsRef.current.reduce((acc, p) => {
      acc[p.id] = Number(p.stock) || 0;
      return acc;
    }, {} as Record<string, number>);

    const newRecord: CashTallyRecord = {
      ...tallyData,
      date: normalizedTargetDate,
      lastStockKg: tallyData.lastStockKg !== undefined ? tallyData.lastStockKg : currentTotalStockKg,
      stockSnapshot: tallyData.stockSnapshot || currentStockSnapshot,
      id: existingIndex >= 0 ? cashTalliesRef.current[existingIndex].id : 'tally_' + Date.now(),
      savedBy: currentUser.name,
      savedAt: new Date().toISOString()
    };

    let nextTallies: CashTallyRecord[];
    if (existingIndex >= 0) {
      nextTallies = [...cashTalliesRef.current];
      nextTallies[existingIndex] = newRecord;
    } else {
      nextTallies = [newRecord, ...cashTalliesRef.current];
    }

    setCashTallies(nextTallies);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'CASH_TALLIES', JSON.stringify(nextTallies));

    // Also forward actual cash as next day's opening cash
    const targetDateObj = new Date(normalizedTargetDate);
    targetDateObj.setDate(targetDateObj.getDate() + 1);
    const nextDateString = targetDateObj.toISOString().split('T')[0];

    const existingOpeningIndex = openingCashListRef.current.findIndex(o => o.date === nextDateString);
    const newOpeningRecord: OpeningCashRecord = {
      id: existingOpeningIndex >= 0 ? openingCashListRef.current[existingOpeningIndex].id : 'oc_' + Date.now() + '_auto',
      date: nextDateString,
      amount: tallyData.actualCash,
      note: "গতদিনের ক্যাশ মিলানো থেকে স্বয়ংক্রিয়ভাবে এসেছে",
      setBy: "সিস্টেম",
      createdAt: existingOpeningIndex >= 0 ? openingCashListRef.current[existingOpeningIndex].createdAt : new Date().toISOString()
    };

    let nextOpeningList: OpeningCashRecord[];
    if (existingOpeningIndex >= 0) {
      nextOpeningList = [...openingCashListRef.current];
      nextOpeningList[existingOpeningIndex] = newOpeningRecord;
    } else {
      nextOpeningList = [...openingCashListRef.current, newOpeningRecord];
    }
    setOpeningCashList(nextOpeningList);
    localStorage.setItem(STORAGE_KEY_PREFIX + 'OPENING_CASH', JSON.stringify(nextOpeningList));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'ক্যাশ',
      action: 'ক্যাশ মিলানো',
      description: `${normalizedTargetDate} তারিখের ক্যাশ হিসাব সম্পন্ন ও সেভ। প্রত্যাশিত: ${tallyData.expectedCash} ৳, ড্রয়ার ক্যাশ: ${tallyData.actualCash} ৳, পার্থক্য: ${tallyData.difference} ৳`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    pushDataToCloud({
      cashTallies: nextTallies,
      openingCashList: nextOpeningList,
      auditLogs: nextLogs
    });
  };

  // Investment Actions
  const addInvestment = (investmentData: Omit<Investment, 'id' | 'createdAt'>) => {
    const newInv: Investment = {
      ...investmentData,
      id: 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString()
    };
    const nextList = [newInv, ...investmentsRef.current];
    setInvestments(nextList);
    investmentsRef.current = nextList;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'INVESTMENTS', JSON.stringify(nextList));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'হিসাব',
      action: 'বিনিয়োগ যোগ',
      description: `বিনিয়োগকারী ${investmentData.investorName}-এর পক্ষ থেকে ${investmentData.amount} ৳ ব্যবসার মূলধন যুক্ত হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    pushDataToCloud({
      investments: nextList,
      auditLogs: nextLogs
    });
  };

  const updateInvestment = (id: string, updated: Partial<Investment>) => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে কোনো তথ্য এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const nextList = investmentsRef.current.map(inv => inv.id === id ? { ...inv, ...updated } : inv);
    setInvestments(nextList);
    investmentsRef.current = nextList;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'INVESTMENTS', JSON.stringify(nextList));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'হিসাব',
      action: 'বিনিয়োগ আপডেট',
      description: `বিনিয়োগের তথ্য সংশোধন করা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    pushDataToCloud({
      investments: nextList,
      auditLogs: nextLogs
    });
  };

  const deleteInvestment = (id: string) => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে কোনো তথ্য ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const target = investmentsRef.current.find(inv => inv.id === id);
    if (!target) return;
    moveToRecycleBin('investment', `বিনিয়োগ - ${target.investorName}`, target, target.amount);
    const nextList = investmentsRef.current.filter(inv => inv.id !== id);
    setInvestments(nextList);
    investmentsRef.current = nextList;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'INVESTMENTS', JSON.stringify(nextList));

    pushDataToCloud({
      investments: nextList
    });
  };

  // Bank Loan Actions
  const addLoan = (loanData: Omit<BankLoan, 'id' | 'createdAt'>) => {
    const newLoan: BankLoan = {
      ...loanData,
      id: 'loan_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString()
    };
    const nextList = [newLoan, ...loansRef.current];
    setLoans(nextList);
    loansRef.current = nextList;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'LOANS', JSON.stringify(nextList));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'হিসাব',
      action: 'ব্যাংক লোন গ্রহণ',
      description: `${loanData.bankName} থেকে ${loanData.loanAmount} ৳ ঋণ গ্রহণ এন্ট্রি করা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    pushDataToCloud({
      loans: nextList,
      auditLogs: nextLogs
    });
  };

  const updateLoan = (id: string, updated: Partial<BankLoan>) => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে কোনো তথ্য এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const nextList = loansRef.current.map(l => l.id === id ? { ...l, ...updated } : l);
    setLoans(nextList);
    loansRef.current = nextList;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'LOANS', JSON.stringify(nextList));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'হিসাব',
      action: 'ব্যাংক লোন আপডেট',
      description: `ব্যাংক লোনের তথ্য সংশোধন করা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    pushDataToCloud({
      loans: nextList,
      auditLogs: nextLogs
    });
  };

  const deleteLoan = (id: string) => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে কোনো তথ্য ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const target = loansRef.current.find(l => l.id === id);
    if (!target) return;
    moveToRecycleBin('loan', `ব্যাংক লোন - ${target.bankName}`, target, target.loanAmount);
    const nextList = loansRef.current.filter(l => l.id !== id);
    setLoans(nextList);
    loansRef.current = nextList;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'LOANS', JSON.stringify(nextList));

    pushDataToCloud({
      loans: nextList
    });
  };

  // Loan Repayment Actions
  const addLoanRepayment = (repData: Omit<LoanRepayment, 'id' | 'createdAt'>) => {
    const newRep: LoanRepayment = {
      ...repData,
      id: 'lrep_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString()
    };
    const nextList = [newRep, ...loanRepaymentsRef.current];
    setLoanRepayments(nextList);
    loanRepaymentsRef.current = nextList;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'LOAN_REPAYMENTS', JSON.stringify(nextList));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'হিসাব',
      action: 'ঋণ পরিশোধ',
      description: `${repData.bankName}-এ ${repData.amount} ৳ ঋণ পরিশোধ এন্ট্রি করা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    pushDataToCloud({
      loanRepayments: nextList,
      auditLogs: nextLogs
    });
  };

  const updateLoanRepayment = (id: string, updated: Partial<LoanRepayment>) => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে কোনো তথ্য এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const nextList = loanRepaymentsRef.current.map(r => r.id === id ? { ...r, ...updated } : r);
    setLoanRepayments(nextList);
    loanRepaymentsRef.current = nextList;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'LOAN_REPAYMENTS', JSON.stringify(nextList));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'হিসাব',
      action: 'ঋণ পরিশোধ আপডেট',
      description: `ঋণ পরিশোধের তথ্য সংশোধন করা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    pushDataToCloud({
      loanRepayments: nextList,
      auditLogs: nextLogs
    });
  };

  const deleteLoanRepayment = (id: string) => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে কোনো তথ্য ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const target = loanRepaymentsRef.current.find(r => r.id === id);
    if (!target) return;
    moveToRecycleBin('loan_repayment', `ঋণ পরিশোধ - ${target.bankName}`, target, target.amount);
    const nextList = loanRepaymentsRef.current.filter(r => r.id !== id);
    setLoanRepayments(nextList);
    loanRepaymentsRef.current = nextList;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'LOAN_REPAYMENTS', JSON.stringify(nextList));

    pushDataToCloud({
      loanRepayments: nextList
    });
  };

  // ===================== Employee Management Actions =====================
  const addEmployee = (empData: Omit<Employee, 'id' | 'createdAt'>): Employee => {
    const newEmp: Employee = {
      ...empData,
      id: 'emp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      createdAt: new Date().toISOString()
    };
    const nextEmployees = [newEmp, ...employeesRef.current];
    setEmployees(nextEmployees);
    employeesRef.current = nextEmployees;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'EMPLOYEES', JSON.stringify(nextEmployees));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'ইউজার',
      action: 'কর্মচারী যুক্ত',
      description: `নতুন কর্মচারী ${empData.name} (${empData.designation || 'স্টাফ'}, বেতন: ${empData.salary} ৳) যুক্ত করা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    pushDataToCloud({
      employees: nextEmployees,
      auditLogs: nextLogs
    });

    return newEmp;
  };

  const updateEmployee = (id: string, updated: Partial<Employee>) => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে কর্মচারী এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const nextEmployees = employeesRef.current.map(e => e.id === id ? { ...e, ...updated } : e);
    setEmployees(nextEmployees);
    employeesRef.current = nextEmployees;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'EMPLOYEES', JSON.stringify(nextEmployees));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'ইউজার',
      action: 'কর্মচারী আপডেট',
      description: `কর্মচারী ${updated.name || 'তথ্য'} আপডেট করা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    pushDataToCloud({
      employees: nextEmployees,
      auditLogs: nextLogs
    });
  };

  const deleteEmployee = (id: string) => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে কর্মচারী ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const target = employeesRef.current.find(e => e.id === id);
    if (!target) return;
    moveToRecycleBin('customer' as any, `কর্মচারী - ${target.name} (${target.designation})`, target, target.salary);
    const nextEmployees = employeesRef.current.filter(e => e.id !== id);
    setEmployees(nextEmployees);
    employeesRef.current = nextEmployees;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'EMPLOYEES', JSON.stringify(nextEmployees));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'ইউজার',
      action: 'কর্মচারী ডিলিট',
      description: `কর্মচারী ${target.name} মুছে ফেলা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    pushDataToCloud({
      employees: nextEmployees,
      auditLogs: nextLogs
    });
  };

  // ===================== Employee Salary Disbursements & Auto Expense Sync =====================
  const addEmployeePayment = (paymentData: Omit<EmployeePayment, 'id' | 'createdAt' | 'paidBy' | 'expenseId'>): EmployeePayment => {
    const paymentId = 'epay_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const expenseId = 'exp_emp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    
    const typeLabel = paymentData.paymentType === 'advance' 
      ? 'অগ্রিম বেতন' 
      : (paymentData.paymentType === 'bonus' ? 'বোনাস' : 'মাসিক বেতন');
    
    const expenseTitle = `স্টাফ বেতন - ${paymentData.employeeName}`;
    const expenseDesc = `কর্মচারী ${paymentData.employeeName}-কে ${typeLabel} প্রদান${paymentData.month ? ' (মাস: ' + paymentData.month + ')' : ''}${paymentData.notes ? ' | নোট: ' + paymentData.notes : ''}`;

    // 1. Automatically create Expense entry in daily expenses & statement
    const autoExpense: Expense = {
      id: expenseId,
      date: paymentData.date,
      category: 'কর্মচারী বেতন',
      title: expenseTitle,
      description: expenseDesc,
      amount: paymentData.amount,
      paymentMethod: paymentData.paymentMethod,
      cashPaid: paymentData.paymentMethod === 'cash' ? paymentData.amount : 0,
      onlinePaid: paymentData.paymentMethod === 'online' ? paymentData.amount : 0,
      onlineMethod: paymentData.onlineMethod,
      employeePaymentId: paymentId,
      notes: paymentData.notes,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.name,
      recordedBy: currentUser.name
    };

    const nextExpenses = [autoExpense, ...expensesRef.current];
    setExpenses(nextExpenses);
    expensesRef.current = nextExpenses;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'EXPENSES', JSON.stringify(nextExpenses));

    // 2. Create Employee Payment record linked to autoExpense
    const newPayment: EmployeePayment = {
      ...paymentData,
      id: paymentId,
      expenseId,
      paidBy: currentUser.name,
      createdAt: new Date().toISOString()
    };

    const nextPayments = [newPayment, ...employeePaymentsRef.current];
    setEmployeePayments(nextPayments);
    employeePaymentsRef.current = nextPayments;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'EMPLOYEE_PAYMENTS', JSON.stringify(nextPayments));

    // 3. Audit Log
    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'খরচ',
      action: 'কর্মচারী বেতন প্রদান',
      description: `কর্মচারী ${paymentData.employeeName}-কে ${paymentData.amount} ৳ (${typeLabel}) প্রদান করা হয়েছে এবং দৈনিক খরচে স্বয়ংক্রিয়ভাবে যুক্ত করা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    // 4. Cloud sync both
    pushDataToCloud({
      employeePayments: nextPayments,
      expenses: nextExpenses,
      auditLogs: nextLogs
    });

    return newPayment;
  };

  const updateEmployeePayment = (id: string, updated: Partial<EmployeePayment>) => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে তথ্য এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const oldPayment = employeePaymentsRef.current.find(p => p.id === id);
    if (!oldPayment) return;

    const nextPayments = employeePaymentsRef.current.map(p => p.id === id ? { ...p, ...updated } : p);
    setEmployeePayments(nextPayments);
    employeePaymentsRef.current = nextPayments;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'EMPLOYEE_PAYMENTS', JSON.stringify(nextPayments));

    // Update linked expense if exists
    let nextExpenses = expensesRef.current;
    const linkedExpenseIndex = nextExpenses.findIndex(e => e.id === oldPayment.expenseId || e.employeePaymentId === id);
    if (linkedExpenseIndex >= 0) {
      const typeLabel = (updated.paymentType || oldPayment.paymentType) === 'advance' 
        ? 'অগ্রিম বেতন' 
        : ((updated.paymentType || oldPayment.paymentType) === 'bonus' ? 'বোনাস' : 'মাসিক বেতন');
      const empName = updated.employeeName || oldPayment.employeeName;
      const amt = updated.amount !== undefined ? updated.amount : oldPayment.amount;
      const dt = updated.date || oldPayment.date;
      const pMethod = updated.paymentMethod || oldPayment.paymentMethod;
      const mth = updated.month || oldPayment.month;
      const nts = updated.notes !== undefined ? updated.notes : oldPayment.notes;

      nextExpenses = [...nextExpenses];
      nextExpenses[linkedExpenseIndex] = {
        ...nextExpenses[linkedExpenseIndex],
        amount: amt,
        date: dt,
        paymentMethod: pMethod,
        cashPaid: pMethod === 'cash' ? amt : 0,
        onlinePaid: pMethod === 'online' ? amt : 0,
        description: `কর্মচারী ${empName}-কে ${typeLabel} প্রদান${mth ? ' (মাস: ' + mth + ')' : ''}${nts ? ' | নোট: ' + nts : ''}`,
        notes: nts
      };
      setExpenses(nextExpenses);
      expensesRef.current = nextExpenses;
      localStorage.setItem(STORAGE_KEY_PREFIX + 'EXPENSES', JSON.stringify(nextExpenses));
    }

    pushDataToCloud({
      employeePayments: nextPayments,
      expenses: nextExpenses
    });
  };

  const deleteEmployeePayment = (id: string) => {
    if (currentUser?.role === 'manager') {
      alert('ম্যানেজার একাউন্ট থেকে তথ্য ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    const target = employeePaymentsRef.current.find(p => p.id === id);
    if (!target) return;

    moveToRecycleBin('expense' as any, `কর্মচারী বেতন প্রদান - ${target.employeeName} (${target.amount} ৳)`, target, target.amount);

    const nextPayments = employeePaymentsRef.current.filter(p => p.id !== id);
    setEmployeePayments(nextPayments);
    employeePaymentsRef.current = nextPayments;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'EMPLOYEE_PAYMENTS', JSON.stringify(nextPayments));

    // Also remove the auto-created expense from daily expenses
    const nextExpenses = expensesRef.current.filter(e => e.id !== target.expenseId && e.employeePaymentId !== id);
    setExpenses(nextExpenses);
    expensesRef.current = nextExpenses;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'EXPENSES', JSON.stringify(nextExpenses));

    const newLog: AuditLog = {
      id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      category: 'খরচ',
      action: 'কর্মচারী বেতন মুছে ফেলা',
      description: `কর্মচারী ${target.employeeName}-এর ${target.amount} ৳ পেমেন্ট এবং সংশ্লিষ্ট খরচ মুছে ফেলা হয়েছে।`,
      performedBy: currentUser.name,
      timestamp: new Date().toISOString()
    };
    const nextLogs = [newLog, ...auditLogsRef.current];
    setAuditLogs(nextLogs);
    auditLogsRef.current = nextLogs;

    pushDataToCloud({
      employeePayments: nextPayments,
      expenses: nextExpenses,
      auditLogs: nextLogs
    });
  };

  // Factory Reset
  const resetAllData = () => {
    setCustomers([]);
    setSuppliers([]);
    setProducts([]);
    setInvoices([]);
    setDuePayments([]);
    setSupplierBills([]);
    setSupplierPayments([]);
    setExpenses([]);
    setOpeningCashList([]);
    setOtherCashInList([]);
    setInvestments([]);
    setLoans([]);
    setLoanRepayments([]);
    setEmployees([]);
    setEmployeePayments([]);
    setRecycleBin([]);

    // Clear local storage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX) && !key.endsWith('USERS') && !key.endsWith('AUTH')) {
        localStorage.removeItem(key);
      }
    });

    // Reset cloud document as well
    fetch('/api/shopData', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ shopId: FIRESTORE_SHOP_DOC_ID, payload: {
          customers: [],
          suppliers: [],
          products: [],
          invoices: [],
          duePayments: [],
          supplierBills: [],
          supplierPayments: [],
          expenses: [],
          openingCashList: [],
          otherCashInList: [],
          investments: [],
          loans: [],
          loanRepayments: [],
          employees: [],
          employeePayments: [],
          users,
          auditLogs: [],
          recycleBin: [],
          lastUpdatedBy: CLIENT_ID,
          updatedAt: new Date().toISOString()
        }})
      }).catch(err => console.error('Cloud reset error:', err));

    addAuditLog('সিস্টেম', 'ডাটা রিসেট', 'সকল দোকানের ব্যবসায়িক ডাটা ক্লিয়ার করা হয়েছে।');
  };

  const generateBackupJsonString = (selectedKeys?: string[]) => {
    const isAll = !selectedKeys || selectedKeys.length === 0 || selectedKeys.length >= 18;
    const shouldInclude = (key: string) => isAll || selectedKeys.includes(key);

    const backupData: any = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      shopName: 'বিসমিল্লাহ ট্রেডার্স (Bismillah Traders)',
      databaseId: 'Firestore-Synced',
      isSelectiveBackup: !isAll,
      selectedCategories: isAll ? 'all' : selectedKeys
    };

    if (shouldInclude('users')) backupData.users = users;
    if (shouldInclude('customers')) backupData.customers = customers;
    if (shouldInclude('suppliers')) backupData.suppliers = suppliers;
    if (shouldInclude('products')) backupData.products = products;
    if (shouldInclude('invoices')) backupData.invoices = invoices;
    if (shouldInclude('duePayments')) backupData.duePayments = duePayments;
    if (shouldInclude('supplierBills')) backupData.supplierBills = supplierBills;
    if (shouldInclude('supplierPayments')) backupData.supplierPayments = supplierPayments;
    if (shouldInclude('expenses')) backupData.expenses = expenses;
    if (shouldInclude('openingCashList')) backupData.openingCashList = openingCashList;
    if (shouldInclude('otherCashInList')) backupData.otherCashInList = otherCashInList;
    if (shouldInclude('cashTallies')) backupData.cashTallies = cashTallies;
    if (shouldInclude('investments')) backupData.investments = investments;
    if (shouldInclude('loans')) backupData.loans = loans;
    if (shouldInclude('loanRepayments')) backupData.loanRepayments = loanRepayments;
    if (shouldInclude('employees')) backupData.employees = employees;
    if (shouldInclude('employeePayments')) backupData.employeePayments = employeePayments;
    if (shouldInclude('auditLogs')) backupData.auditLogs = auditLogs;
    if (shouldInclude('recycleBin')) backupData.recycleBin = recycleBin;

    return JSON.stringify(backupData, null, 2);
  };

  // Export System JSON Backup (supports all or selected categories)
  const exportBackupJson = async (selectedKeys?: string[]) => {
    const isAll = !selectedKeys || selectedKeys.length === 0 || selectedKeys.length >= 16;
    let jsonStr = generateBackupJsonString(selectedKeys);

    if (isAll && ACTIVE_BRANCH_ID === 'ml_electric_main' && currentUser?.role === 'admin') {
      try {
        const response = await fetch('/api/allShopData');
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.data) {
             const masterBackup = {
                isMasterBackup: true,
                exportedAt: new Date().toISOString(),
                version: '2.0',
                shopName: 'বিসমিল্লাহ ট্রেডার্স (Bismillah Traders) - All Branches Master Backup',
                mainShopData: JSON.parse(jsonStr),
                allShops: resData.data
             };
             jsonStr = JSON.stringify(masterBackup, null, 2);
          }
        }
      } catch (err) {
        console.error('Failed to fetch master backup data', err);
      }
    }

    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const prefix = isAll ? 'Full_Backup' : 'Selected_Backup';
    link.download = `Bismillah_Traders_${prefix}_${selectedDate}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addAuditLog(
      'সিস্টেম', 
      'ব্যাকআপ এক্সপোর্ট', 
      isAll 
        ? 'পূর্ণাঙ্গ ডাটাবেজ ব্যাকআপ ফাইল ডাউনলোড করা হয়েছে।' 
        : `নির্বাচিত ক্যাটাগরির (${selectedKeys?.length}টি) কাস্টম ব্যাকআপ ফাইল ডাউনলোড করা হয়েছে।`
    );
  };

  // Universal Smart Import Backup JSON
  const importBackupJson = async (jsonData: string, mode: 'overwrite' | 'merge' = 'overwrite'): Promise<{ success: boolean; message: string }> => {
    try {
      const rawParsed = JSON.parse(jsonData);
      if (rawParsed.isMasterBackup && rawParsed.allShops && Array.isArray(rawParsed.allShops)) {
        if (ACTIVE_BRANCH_ID !== 'ml_electric_main' || currentUser?.role !== 'admin') {
          return { success: false, message: 'মাস্টার ব্যাকআপ শুধুমাত্র অ্যাডমিন মেইন শাখা থেকে রিস্টোর করতে পারবেন।' };
        }
        
        const response = await fetch('/api/restoreAllShopData', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopsData: rawParsed.allShops })
        });
        
        if (response.ok) {
          setTimeout(() => window.location.reload(), 1000);
          return { success: true, message: 'মাস্টার ব্যাকআপ সফলভাবে রিস্টোর হয়েছে। রিলোড হচ্ছে...' };
        } else {
          return { success: false, message: 'মাস্টার ব্যাকআপ রিস্টোর ব্যর্থ হয়েছে।' };
        }
      }

      const res = parseAndSanitizeBackup(jsonData);
      if (!res || !Array.isArray(res.customers)) {
        return { success: false, message: 'ফাইলটি সঠিক ব্যাকআপ JSON ফাইল নয়।' };
      }

      let finalCustomers = res.customers;
      let finalSuppliers = res.suppliers;
      let finalProducts = res.products;
      let finalInvoices = res.invoices;
      let finalDuePayments = res.duePayments;
      let finalSupplierBills = res.supplierBills;
      let finalSupplierPayments = res.supplierPayments;
      let finalExpenses = res.expenses;
      let finalOpeningCash = res.openingCashList;
      let finalOtherCash = res.otherCashInList;
      let finalCashTallies = res.cashTallies || [];
      let finalUsers = res.users;
      let finalRecycleBin = res.recycleBin;

      if (mode === 'merge') {
        // Merge Customers
        const custMap = new Map<string, Customer>();
        customers.forEach(c => custMap.set(c.id || c.name, c));
        res.customers.forEach(c => custMap.set(c.id || c.name, c));
        finalCustomers = Array.from(custMap.values());

        // Merge Suppliers
        const supMap = new Map<string, Supplier>();
        suppliers.forEach(s => supMap.set(s.id || s.name, s));
        res.suppliers.forEach(s => supMap.set(s.id || s.name, s));
        finalSuppliers = Array.from(supMap.values());

        // Merge Products
        const prodMap = new Map<string, ProductCatalogItem>();
        products.forEach(p => prodMap.set(p.id || p.name, p));
        res.products.forEach(p => prodMap.set(p.id || p.name, p));
        finalProducts = Array.from(prodMap.values());

        // Merge Invoices
        const invMap = new Map<string, Invoice>();
        invoices.forEach(i => invMap.set(i.id || i.invoiceNo, i));
        res.invoices.forEach(i => invMap.set(i.id || i.invoiceNo, i));
        finalInvoices = Array.from(invMap.values());

        // Merge Due Payments
        const dpMap = new Map<string, DuePaymentRecord>();
        duePayments.forEach(d => dpMap.set(d.id || d.receiptNo, d));
        res.duePayments.forEach(d => dpMap.set(d.id || d.receiptNo, d));
        finalDuePayments = Array.from(dpMap.values());

        // Merge Supplier Bills
        const sbMap = new Map<string, SupplierBill>();
        supplierBills.forEach(b => sbMap.set(b.id || b.billNo, b));
        res.supplierBills.forEach(b => sbMap.set(b.id || b.billNo, b));
        finalSupplierBills = Array.from(sbMap.values());

        // Merge Supplier Payments
        const spMap = new Map<string, SupplierPaymentRecord>();
        supplierPayments.forEach(p => spMap.set(p.id || p.receiptNo || '', p));
        res.supplierPayments.forEach(p => spMap.set(p.id || p.receiptNo || '', p));
        finalSupplierPayments = Array.from(spMap.values());

        // Merge Expenses
        const expMap = new Map<string, Expense>();
        expenses.forEach(e => expMap.set(e.id, e));
        res.expenses.forEach(e => expMap.set(e.id, e));
        finalExpenses = Array.from(expMap.values());

        // Merge Opening Cash
        const ocMap = new Map<string, OpeningCashRecord>();
        openingCashList.forEach(o => ocMap.set(o.date, o));
        res.openingCashList.forEach(o => ocMap.set(o.date, o));
        finalOpeningCash = Array.from(ocMap.values());

        // Merge Other Cash In
        const ociMap = new Map<string, OtherCashInRecord>();
        otherCashInList.forEach(o => ociMap.set(o.id, o));
        res.otherCashInList.forEach(o => ociMap.set(o.id, o));
        finalOtherCash = Array.from(ociMap.values());

        // Cash Tallies
        const tallyMap = new Map<string, CashTallyRecord>();
        cashTallies.forEach(t => tallyMap.set(t.id, t));
        (res.cashTallies || []).forEach(t => tallyMap.set(t.id, t));
        finalCashTallies = Array.from(tallyMap.values());

        // Users
        if (res.users.length > 0) {
          const userMap = new Map<string, UserAccount>();
          users.forEach(u => userMap.set(u.id || u.username, u));
          res.users.forEach(u => userMap.set(u.id || u.username, u));
          finalUsers = Array.from(userMap.values());
        } else {
          finalUsers = users;
        }

        // Recycle Bin
        if (res.recycleBin.length > 0) {
          const rbMap = new Map<string, RecycleBinItem>();
          recycleBin.forEach(r => rbMap.set(r.id, r));
          res.recycleBin.forEach(r => rbMap.set(r.id, r));
          finalRecycleBin = Array.from(rbMap.values());
        } else {
          finalRecycleBin = recycleBin;
        }
      }

      // Update state
      setCustomers(finalCustomers);
      setSuppliers(finalSuppliers);
      setProducts(finalProducts);
      setInvoices(finalInvoices);
      setDuePayments(finalDuePayments);
      setSupplierBills(finalSupplierBills);
      setSupplierPayments(finalSupplierPayments);
      setExpenses(finalExpenses);
      setOpeningCashList(finalOpeningCash);
      setOtherCashInList(finalOtherCash);
      setCashTallies(finalCashTallies);

      if (finalUsers.length > 0) {
        setUsers(finalUsers);
        const stillExists = finalUsers.find(u => u.id === currentUser?.id || u.username === currentUser?.username);
        if (!stillExists) {
          const defaultUser = finalUsers.find(u => u.role === 'admin') || finalUsers[0];
          setCurrentUser(defaultUser);
        }
      }
      setRecycleBin(finalRecycleBin);

      // Explicitly write immediately to localStorage to ensure absolute persistence
      localStorage.setItem(STORAGE_KEY_PREFIX + 'CUSTOMERS', JSON.stringify(finalCustomers));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIERS', JSON.stringify(finalSuppliers));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'PRODUCTS', JSON.stringify(finalProducts));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'INVOICES', JSON.stringify(finalInvoices));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'DUE_PAYMENTS', JSON.stringify(finalDuePayments));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIER_BILLS', JSON.stringify(finalSupplierBills));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIER_PAYMENTS', JSON.stringify(finalSupplierPayments));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'EXPENSES', JSON.stringify(finalExpenses));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'OPENING_CASH', JSON.stringify(finalOpeningCash));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'OTHER_CASH_IN', JSON.stringify(finalOtherCash));
      localStorage.setItem(STORAGE_KEY_PREFIX + 'CASH_TALLIES', JSON.stringify(finalCashTallies));
      if (finalUsers.length > 0) {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'USERS', JSON.stringify(finalUsers));
      }
      localStorage.setItem(STORAGE_KEY_PREFIX + 'RECYCLE_BIN', JSON.stringify(finalRecycleBin));
      sessionStorage.setItem(STORAGE_KEY_PREFIX + 'AUTH', JSON.stringify(true));
      setIsAuthenticated(true);

      // Push to Cloud Firestore
      pushDataToCloud({
        customers: finalCustomers,
        suppliers: finalSuppliers,
        products: finalProducts,
        invoices: finalInvoices,
        duePayments: finalDuePayments,
        supplierBills: finalSupplierBills,
        supplierPayments: finalSupplierPayments,
        expenses: finalExpenses,
        openingCashList: finalOpeningCash,
        otherCashInList: finalOtherCash,
        cashTallies: finalCashTallies,
        users: finalUsers,
        auditLogs,
        recycleBin: finalRecycleBin
      });

      const totalItems = finalCustomers.length + finalSuppliers.length + finalInvoices.length + finalExpenses.length + finalOtherCash.length;
      addAuditLog('সিস্টেম', 'ব্যাকআপ আপলোড', `সিস্টেম ব্যাকআপ ফাইল (${mode === 'merge' ? 'একত্রীকরণ' : 'প্রতিস্থাপন'}) ক্লাউড ডাটাবেসে সফলভাবে রিস্টোর ও সিঙ্ক করা হয়েছে।`);
      return { 
        success: true, 
        message: `ডাটাবেজ ব্যাকআপ সফলভাবে রিস্টোর ও ক্লাউডে সিঙ্ক করা হয়েছে! (${toBengaliNumber(finalCustomers.length)} জন কাস্টমার সহ মোট ${toBengaliNumber(totalItems)} টি রেকর্ড ডাটাবেসে সংরক্ষিত)` 
      };
    } catch (e: any) {
      console.error('Backup import error:', e);
      return { success: false, message: `ত্রুটি: ${e?.message || 'ব্যাকআপ ফাইল রিস্টোর করা যায়নি'}` };
    }
  };

  const contextValue = useMemo(() => ({
    language,
    setLanguage,
    t,
    currentTab,
    setCurrentTab,
    selectedDate,
    setSelectedDate,
    isAuthenticated,
    login,
    returnToMainApp,
    activeBranchId: ACTIVE_BRANCH_ID,
    logout,
    currentUser,
    setCurrentUser,
    canEditOrDelete,
    isManager,
    users,
    setUsers,
    smtpSettings,
    setSmtpSettings,
    customers,
    setCustomers,
    suppliers,
    setSuppliers,
    invoices,
    setInvoices,
    duePayments,
    setDuePayments,
    supplierBills,
    setSupplierBills,
    supplierPayments,
    setSupplierPayments,
    expenses,
    setExpenses,
    openingCashList,
    setOpeningCashList,
    otherCashInList,
    setOtherCashInList,
    cashTallies,
    setCashTallies,
    auditLogs,
    addAuditLog,
    recycleBin,
    moveToRecycleBin,
    restoreFromRecycleBin,
    permanentDeleteFromRecycleBin,
    emptyRecycleBin,
    products,
    setProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    addCustomer,
    addSupplier,
    updateSupplier,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    addDuePayment,
    addSupplierBill,
    deleteSupplierBill,
    updateSupplierBill,
    addSupplierPayment,
    addExpense,
    setOpeningCash,
    addOtherCashIn,
    saveCashTally,
    // Investments & Loans
    investments,
    setInvestments,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    loans,
    setLoans,
    addLoan,
    updateLoan,
    deleteLoan,
    loanRepayments,
    setLoanRepayments,
    addLoanRepayment,
    updateLoanRepayment,
    deleteLoanRepayment,
    employees,
    setEmployees,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    employeePayments,
    setEmployeePayments,
    addEmployeePayment,
    updateEmployeePayment,
    deleteEmployeePayment,
    resetAllData,
    exportBackupJson,
    generateBackupJsonString,
    importBackupJson,
    activeModal,
    setActiveModal,
    invoiceToPrint,
    setInvoiceToPrint,
    invoiceToEdit,
    setInvoiceToEdit,
    duePaymentToPrint,
    setDuePaymentToPrint,
    isCloudSynced,
    cloudSyncTime,
    isSyncingNow,
    forceSyncFromCloud,
    forcePushToCloud,
    syncManagerToBranch,
    removeUserFromBranch,
    branches,
    setBranches,
    addBranch,
    updateBranch,
    deleteBranch,
    addUser,
    updateUser,
    deleteUser,
    firestoreQuota,
    license,
    isLicenseValid: licenseStatusDetails.isValid,
    isLicenseExpired: licenseStatusDetails.isExpired,
    licenseDaysLeft: licenseStatusDetails.daysLeft,
    updateLicense,
    activateLicenseKey,
    isLicenseManagerOpen,
    setIsLicenseManagerOpen,
    presenceList,
    activeOnlineUsersCount,
    isOnlineUsersModalOpen,
    setIsOnlineUsersModalOpen,
    confirmDialog,
    setConfirmDialog,
    confirmAction
  }), [
    language,
    currentTab,
    selectedDate,
    isAuthenticated,
    ACTIVE_BRANCH_ID,
    currentUser,
    canEditOrDelete,
    isManager,
    users,
    smtpSettings,
    customers,
    suppliers,
    invoices,
    duePayments,
    supplierBills,
    supplierPayments,
    expenses,
    openingCashList,
    otherCashInList,
    cashTallies,
    auditLogs,
    recycleBin,
    products,
    investments,
    loans,
    loanRepayments,
    employees,
    employeePayments,
    activeModal,
    invoiceToPrint,
    duePaymentToPrint,
    isCloudSynced,
    cloudSyncTime,
    isSyncingNow,
    branches,
    firestoreQuota,
    license,
    licenseStatusDetails.isValid,
    licenseStatusDetails.isExpired,
    licenseStatusDetails.daysLeft,
    isLicenseManagerOpen,
    presenceList,
    activeOnlineUsersCount,
    isOnlineUsersModalOpen,
    confirmDialog
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
