import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { 
  Customer, 
  Supplier, 
  Invoice, 
  DuePaymentRecord, 
  SupplierBill, 
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
  UserPresence
} from '../types';
import { 
  INITIAL_CUSTOMERS, 
  INITIAL_SUPPLIERS, 
  INITIAL_PRODUCTS, 
  INITIAL_USERS 
} from '../data/initialData';
import { getTodayDateInput, toBengaliNumber, normalizeDate, isSameDate } from '../utils/formatters';
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

  // Actions
  addCustomer: (customer: Customer) => void;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'createdBy'>) => Invoice;
  addDuePayment: (payment: Omit<DuePaymentRecord, 'id' | 'createdAt' | 'collectedBy'>) => void;
  addSupplierBill: (bill: Omit<SupplierBill, 'id' | 'createdAt' | 'createdBy'>) => void;
  addSupplierPayment: (payment: Omit<SupplierPaymentRecord, 'id' | 'createdAt' | 'paidBy'>) => void;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'createdBy'>) => void;
  setOpeningCash: (amount: number, note?: string) => void;
  addOtherCashIn: (entry: Omit<OtherCashInRecord, 'id' | 'createdAt' | 'receivedBy'>) => void;
  saveCashTally: (tally: Omit<CashTallyRecord, 'id' | 'savedBy' | 'savedAt'>) => void;
  resetAllData: () => void;
  exportBackupJson: () => Promise<void>;
  generateBackupJsonString: () => string;
  importBackupJson: (jsonData: string, mode?: 'overwrite' | 'merge') => Promise<{ success: boolean; message: string }>;

  // Active Modals state
  activeModal: string | null;
  setActiveModal: (modal: string | null) => void;
  invoiceToPrint: Invoice | null;
  duePaymentToPrint: DuePaymentRecord | null;
  setDuePaymentToPrint: (dp: DuePaymentRecord | null) => void;
  setInvoiceToPrint: (inv: Invoice | null) => void;

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
}

const AppContext = createContext<AppContextType | null>(null);

const ACTIVE_BRANCH_ID = typeof window !== "undefined" ? localStorage.getItem("ACTIVE_BRANCH_ID") || "ml_electric_main" : "ml_electric_main";
const FIRESTORE_SHOP_DOC_ID = ACTIVE_BRANCH_ID;
const STORAGE_KEY_PREFIX = `ML_ELECTRIC_${ACTIVE_BRANCH_ID}_`;


// Unique client/session identifier to distinguish remote updates vs local writes
const CLIENT_ID = typeof window !== 'undefined'
  ? (sessionStorage.getItem(STORAGE_KEY_PREFIX + 'CLIENT_ID') || (() => {
      const id = 'client_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
      try { sessionStorage.setItem(STORAGE_KEY_PREFIX + 'CLIENT_ID', id); } catch {}
      return id;
    })())
  : 'client_node';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateInput());
  
  // Modals
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);
  const [duePaymentToPrint, setDuePaymentToPrint] = useState<DuePaymentRecord | null>(null);

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
    const savedUserData = sessionStorage.getItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_DATA');
    if (savedUserData) {
      try {
        const parsed = JSON.parse(savedUserData);
        if (parsed && parsed.id) return parsed;
      } catch {}
    }
    const savedUserId = sessionStorage.getItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_ID');
    if (savedUserId) {
      const found = users.find(u => u.id === savedUserId);
      if (found) return found;
    }
    return users[0] || INITIAL_USERS[0];
  });

  // Ensure currentUser is correctly set when users are loaded from cloud
  useEffect(() => {
    const savedUserId = sessionStorage.getItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_ID');
    if (savedUserId && currentUser.id !== savedUserId) {
      const found = users.find(u => u.id === savedUserId);
      if (found) {
        setCurrentUser(found);
      } else if (users.length > 1) { // If users have loaded from cloud and user is still not found
        sessionStorage.removeItem(STORAGE_KEY_PREFIX + 'AUTH');
        sessionStorage.removeItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_ID');
        sessionStorage.removeItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_DATA');
        window.location.reload();
      }
    }
  }, [users, currentUser.id]);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    const authSaved = sessionStorage.getItem(STORAGE_KEY_PREFIX + 'AUTH');
    return authSaved ? JSON.parse(authSaved) : false;
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

    if (!foundUser) {
      // Emergency Master Admin bypass (Only official master password 102267, 139210 removed completely)
      if ((normInputUser === 'admin' || normInputUser === 'administrator') && normInputPass === '102267') {
        const adminUser = users.find(u => u.role === 'admin') || INITIAL_USERS[0];
        
        if (ACTIVE_BRANCH_ID !== 'ml_electric_main') {
          localStorage.removeItem('ACTIVE_BRANCH_ID');
          sessionStorage.setItem(`ML_ELECTRIC_ml_electric_main_AUTH`, JSON.stringify(true));
          sessionStorage.setItem(`ML_ELECTRIC_ml_electric_main_CURRENT_USER_ID`, adminUser.id);
          sessionStorage.setItem(`ML_ELECTRIC_ml_electric_main_CURRENT_USER_DATA`, JSON.stringify(adminUser));
          window.location.reload();
          return { success: true };
        }

        setCurrentUser(adminUser);
        setIsAuthenticated(true);
        sessionStorage.setItem(STORAGE_KEY_PREFIX + 'AUTH', JSON.stringify(true));
        sessionStorage.setItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_ID', adminUser.id);
        sessionStorage.setItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_DATA', JSON.stringify(adminUser));
        return { success: true };
      }

      // Check if user exists but password was wrong
      const existingUser = allKnownUsers.find(u => isUserMatch(u));
      if (existingUser) {
        return { success: false, message: 'পাসওয়ার্ডটি ভুল হয়েছে! অনুগ্রহ করে সঠিক পাসওয়ার্ড দিন।' };
      }

      return { success: false, message: 'ভুল ইউজারনেম অথবা মোবাইল নম্বর! এই অ্যাকাউন্টটি পাওয়া যায়নি।' };
    }

    // Save found user to local caches to prevent sync lag
    try {
      const targetPrefix = `ML_ELECTRIC_${foundUser.branchId || 'ml_electric_main'}_`;
      localStorage.setItem(targetPrefix + 'CURRENT_USER_DATA', JSON.stringify(foundUser));
    } catch {}

    // Determine which branch this user belongs to
    const targetBranchId = (foundUser.role === 'admin')
      ? (foundUser.branchId || 'ml_electric_main')
      : (foundUser.branchId || 'ml_electric_main');

    if (targetBranchId && ACTIVE_BRANCH_ID !== targetBranchId) {
      if (targetBranchId === 'ml_electric_main') {
        localStorage.removeItem('ACTIVE_BRANCH_ID');
      } else {
        localStorage.setItem('ACTIVE_BRANCH_ID', targetBranchId);
      }
      sessionStorage.setItem(`ML_ELECTRIC_${targetBranchId}_AUTH`, JSON.stringify(true));
      sessionStorage.setItem(`ML_ELECTRIC_${targetBranchId}_CURRENT_USER_ID`, foundUser.id);
      sessionStorage.setItem(`ML_ELECTRIC_${targetBranchId}_CURRENT_USER_DATA`, JSON.stringify(foundUser));
      window.location.reload();
      return { success: true };
    }

    setCurrentUser(foundUser);
    setIsAuthenticated(true);
    sessionStorage.setItem(STORAGE_KEY_PREFIX + 'AUTH', JSON.stringify(true));
    sessionStorage.setItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_ID', foundUser.id);
    sessionStorage.setItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_DATA', JSON.stringify(foundUser));
    return { success: true };
  };

  const returnToMainApp = () => {
    localStorage.removeItem("ACTIVE_BRANCH_ID");
    // Ensure active session is preserved when returning to main branch
    sessionStorage.setItem("ML_ELECTRIC_ml_electric_main_AUTH", JSON.stringify(true));
    if (currentUser) {
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
    sessionStorage.removeItem(STORAGE_KEY_PREFIX + 'CURRENT_USER_ID');
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
    return saved !== null ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  // Invoices
  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'INVOICES');
    return saved ? JSON.parse(saved) : [];
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

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'AUDIT_LOGS');
    return saved ? JSON.parse(saved) : [];
  });

  // Recycle Bin
  const [recycleBin, setRecycleBin] = useState<RecycleBinItem[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'RECYCLE_BIN');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'rec_demo_1',
        type: 'invoice',
        name: 'ইনভয়েস #INV-1002 (পুরনো ড্রাফট)',
        amount: 850,
        date: getTodayDateInput(),
        deletedAt: new Date().toISOString(),
        deletedBy: 'Admin',
        originalData: { invoiceNo: 'INV-1002', grandTotal: 850 }
      }
    ];
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
    presenceList.forEach(p => {
      if (p.isOnline && isPresenceOnline(p)) {
        onlineIds.add(p.userId);
      }
    });
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
      setProducts(cloudData.products);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'PRODUCTS', JSON.stringify(cloudData.products));
    }
    if (Array.isArray(cloudData.invoices)) {
      setInvoices(cloudData.invoices);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'INVOICES', JSON.stringify(cloudData.invoices));
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
      setRecycleBin(cloudData.recycleBin);
      localStorage.setItem(STORAGE_KEY_PREFIX + 'RECYCLE_BIN', JSON.stringify(cloudData.recycleBin));
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
    const nextBranches = branchesRef.current.map(b => b.id === updatedBranch.id ? updatedBranch : b);
    setBranches(nextBranches);
    branchesRef.current = nextBranches;
    try {
      localStorage.setItem('ML_ELECTRIC_BRANCHES', JSON.stringify(nextBranches));
    } catch {}
    forcePushToCloud({ branches: nextBranches });
  };

  const deleteBranch = async (branchId: string): Promise<void> => {
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
    const item = recycleBinRef.current.find(r => r.id === id);
    if (!item) return;
    
    const nextBin = recycleBinRef.current.filter(r => r.id !== id);
    setRecycleBin(nextBin);

    let nextInvoices = invoicesRef.current;
    let nextCustomers = customersRef.current;
    let nextSuppliers = suppliersRef.current;
    let nextExpenses = expensesRef.current;
    let nextDuePayments = duePaymentsRef.current;

    // Restore based on type
    if (item.type === 'invoice') {
      nextInvoices = [item.originalData as Invoice, ...nextInvoices];
      setInvoices(nextInvoices);
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
      suppliers: nextSuppliers,
      expenses: nextExpenses,
      duePayments: nextDuePayments,
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

  // Add Invoice & Update Customer due with Instant Cloud Broadcast
  const addCustomer = (customer: Customer) => {
    const nextCustomers = [customer, ...customersRef.current];
    customersRef.current = nextCustomers;
    setCustomers(nextCustomers);
    customersRef.current = nextCustomers;
    localStorage.setItem(STORAGE_KEY_PREFIX + 'CUSTOMERS', JSON.stringify(nextCustomers));
    pushDataToCloud({ customers: nextCustomers });
  };

  const addInvoice = (invData: Omit<Invoice, 'id' | 'createdAt' | 'createdBy'>): Invoice => {
    const newInvoice: Invoice = {
      ...invData,
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
    localStorage.setItem(STORAGE_KEY_PREFIX + 'SUPPLIER_PAYMENTS', JSON.stringify(nextSuppliers));

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
    
    const newRecord: CashTallyRecord = {
      ...tallyData,
      date: normalizedTargetDate,
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
          users,
          auditLogs: [],
          recycleBin: [],
          lastUpdatedBy: CLIENT_ID,
          updatedAt: new Date().toISOString()
        }})
      }).catch(err => console.error('Cloud reset error:', err));

    addAuditLog('সিস্টেম', 'ডাটা রিসেট', 'সকল দোকানের ব্যবসায়িক ডাটা ক্লিয়ার করা হয়েছে।');
  };

  const generateBackupJsonString = () => {
    const backupData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      shopName: 'এম এল ইলেকট্রিক (ML Electric)',
      databaseId: 'Firestore-Synced',
      users,
      customers,
      suppliers,
      products,
      invoices,
      duePayments,
      supplierBills,
      supplierPayments,
      expenses,
      openingCashList,
      otherCashInList,
      cashTallies,
      auditLogs,
      recycleBin
    };
    return JSON.stringify(backupData, null, 2);
  };

  // Export Full System JSON Backup
  const exportBackupJson = async () => {
    let jsonStr = generateBackupJsonString();

    if (ACTIVE_BRANCH_ID === 'ml_electric_main' && currentUser?.role === 'admin') {
      try {
        const response = await fetch('/api/allShopData');
        if (response.ok) {
          const resData = await response.json();
          if (resData.success && resData.data) {
             const masterBackup = {
                isMasterBackup: true,
                exportedAt: new Date().toISOString(),
                version: '2.0',
                shopName: 'এম এল ইলেকট্রিক (ML Electric) - All Branches Master Backup',
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
    link.download = `ML_Electric_Cloud_Backup_${selectedDate}_${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    addAuditLog('সিস্টেম', 'ব্যাকআপ এক্সপোর্ট', 'পূর্ণাঙ্গ ডাটাবেজ ব্যাকআপ ফাইল ডাউনলোড করা হয়েছে।');
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

  return (
    <AppContext.Provider
      value={{
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
        addCustomer,
        addInvoice,
        addDuePayment,
        addSupplierBill,
        addSupplierPayment,
        addExpense,
        setOpeningCash,
        addOtherCashIn,
        saveCashTally,
        resetAllData,
        exportBackupJson,
        generateBackupJsonString,
        importBackupJson,
        activeModal,
        setActiveModal,
        invoiceToPrint,
        setInvoiceToPrint,
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
        setIsOnlineUsersModalOpen
      }}
    >
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
