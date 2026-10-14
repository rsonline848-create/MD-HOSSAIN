export type TabType = 
  | 'dashboard' 
  | 'new_invoice' 
  | 'due_collection' 
  | 'supplier_bill' 
  | 'date_sales' 
  | 'customers' 
  | 'suppliers' 
  | 'daily_expenses' 
  | 'cash_tally';

export type PaymentMethod = 'cash' | 'online' | 'due' | 'mixed';

export interface InvoiceItem {
  id: string;
  name: string;
  category?: string;
  quantity: number;
  unit: string; // পিস, বক্স, কয়েল, মিটার, গজ, প্যাকেট, সেট
  unitPrice: number;
  totalPrice: number;
  costPrice?: number; // for profit calculation
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  date: string; // YYYY-MM-DD
  time: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  laborOrTransportCost: number;
  grandTotal: number;
  cashPaid: number;
  onlinePaid: number;
  onlineMethod?: 'bkash' | 'nagad' | 'rocket' | 'bank' | 'cheque' | 'goods';
  onlineTrxId?: string;
  dueAmount: number;
  status: 'paid' | 'partial' | 'due';
  notes?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  openingDue: number;
  totalPurchased: number;
  totalPaid: number;
  currentDue: number;
  createdDate: string;
  notes?: string;
}

export interface DuePaymentRecord {
  id: string;
  receiptNo: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  date: string; // YYYY-MM-DD
  billDate?: string;
  amount: number;
  cashPaid?: number;
  onlinePaid?: number;
  discount?: number;
  paymentMethod: 'cash' | 'online';
  onlineMethod?: 'bkash' | 'nagad' | 'rocket' | 'bank' | 'cheque' | 'goods';
  trxId?: string;
  notes?: string;
  previousDue: number;
  remainingDue: number;
  collectedBy: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  companyName: string;
  phone: string;
  address: string;
  openingPayable: number;
  totalPurchased: number;
  totalPaid: number;
  currentPayable: number;
  createdDate: string;
}

export interface SupplierBill {
  id: string;
  billNo: string;
  supplierId: string;
  supplierName: string;
  companyName: string;
  date: string;
  itemsDescription: string;
  totalAmount: number;
  cashPaid: number;
  onlinePaid: number;
  dueAmount: number;
  notes?: string;
  createdAt: string;
  createdBy: string;
}

export interface SupplierPaymentRecord {
  id: string;
  receiptNo?: string;
  supplierId: string;
  supplierName: string;
  date: string;
  amount: number;
  cashPaid?: number;
  onlinePaid?: number;
  discount?: number;
  paymentMethod: 'cash' | 'online';
  notes?: string;
  createdAt: string;
  paidBy: string;
}

export interface Expense {
  id: string;
  date: string; // YYYY-MM-DD
  category: string;
  title?: string;
  description?: string;
  amount: number;
  cashPaid?: number;
  onlinePaid?: number;
  discount?: number;
  paymentMethod: 'cash' | 'online';
  notes?: string;
  createdAt: string;
  createdBy?: string;
  recordedBy?: string;
}

export interface OpeningCashRecord {
  id: string;
  date: string; // YYYY-MM-DD
  amount: number;
  cashPaid?: number;
  onlinePaid?: number;
  discount?: number;
  note?: string;
  setBy: string;
  createdAt: string;
}

export interface OtherCashInRecord {
  id: string;
  date: string; // YYYY-MM-DD
  source: string; // মূলধন / ধার / ঋণ / ব্যাংক উত্তোলন / অন্যান্য
  amount: number;
  cashPaid?: number;
  onlinePaid?: number;
  discount?: number;
  paymentMethod: 'cash' | 'online';
  note?: string;
  receivedBy: string;
  createdAt: string;
}

export interface CashNoteCount {
  note1000: number;
  note500: number;
  note200: number;
  note100: number;
  note50: number;
  note20: number;
  note10: number;
  note5: number;
  note2: number;
  note1: number;
}

export interface SMTPSettings {
  enabled: boolean;
  host: string;
  port: string;
  encryption: 'SSL' | 'TLS' | 'None';
  username: string;
  password?: string;
  fromAddress: string;
  fromName: string;
  testEmail: string;
}

export interface Branch {
  id: string;
  name: string;
  location?: string;
  phone?: string;
  createdAt: string;
}

export interface UserAccount {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'manager' | 'branch_manager';
  pinOrPassword: string;
  phone: string;
  isActive: boolean;
  branchId?: string;
  branchName?: string;
  branchLocation?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: string;
  category: 'ইনভয়েস' | 'বাকি আদায়' | 'খরচ' | 'সাপ্লায়ার' | 'কাস্টমার' | 'ক্যাশ' | 'ইউজার' | 'সিস্টেম';
  description: string;
  performedBy: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface RecycleBinItem {
  id: string;
  type: 'invoice' | 'customer' | 'supplier' | 'expense' | 'due_payment' | 'supplier_bill';
  name: string;
  amount?: number;
  date: string;
  deletedAt: string;
  deletedBy: string;
  originalData: unknown;
}

export interface ProductCatalogItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  salePrice: number;
  purchasePrice: number;
  stock: number;
  barcode?: string;
}

export interface CashTallyRecord {
  id: string;
  date: string; // YYYY-MM-DD
  openingCash: number;
  otherCashIn: number;
  cashSales: number;
  cashDueCollected: number;
  todaysCashDeposit: number;
  cashExpenses: number;
  totalSupplierPaid: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  notes?: string;
  denominations?: Record<string, number>;
  savedBy: string;
  savedAt: string;
}

export type LicenseStatus = 'active' | 'expired' | 'suspended' | 'trial';

export interface AppLicense {
  licenseKey: string;
  shopName: string;
  clientPhone: string;
  providerName: string;
  supportPhone: string;
  status: LicenseStatus;
  planName: string;
  activatedAt: string; // ISO date
  expiresAt: string; // ISO date
  maxBranches?: number;
  lastCheckedAt?: string;
  notes?: string;
}

export interface UserPresence {
  userId: string;
  userName: string;
  role: 'admin' | 'manager' | 'branch_manager';
  branchId?: string;
  branchName?: string;
  isOnline: boolean;
  lastActive: string; // ISO string
  deviceInfo?: string;
}
