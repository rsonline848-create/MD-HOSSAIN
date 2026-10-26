export type TabType = 
  | 'dashboard' 
  | 'new_invoice' 
  | 'exchange'
  | 'due_collection' 
  | 'supplier_bill' 
  | 'products'
  | 'date_sales' 
  | 'customers' 
  | 'suppliers' 
  | 'employees'
  | 'daily_expenses' 
  | 'cash_tally'
  | 'investment_loans';

export type AppLanguage = 'bn' | 'en';

export type PaymentMethod = 'cash' | 'online' | 'due' | 'mixed';

export interface InvoiceItem {
  id: string;
  productId?: string;
  code?: string;
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
  previousDue?: number;
  totalDue?: number;
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
  discountPerKg?: number;
  totalPurchased: number;
  totalKg?: number;
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
  openingBalance?: number;
  previousDue?: number;
  totalPurchased: number;
  totalKg?: number;
  totalPaid: number;
  currentPayable: number;
  createdDate: string;
}

export interface SupplierBillItem {
  id?: string;
  productId?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface SupplierBill {
  id: string;
  billNo: string;
  supplierId: string;
  supplierName: string;
  companyName: string;
  date: string;
  itemsDescription: string;
  items?: SupplierBillItem[];
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
  onlineMethod?: 'bkash' | 'nagad' | 'rocket' | 'bank' | 'cheque' | 'goods';
  employeePaymentId?: string;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  recordedBy?: string;
}

export interface Employee {
  id: string;
  name: string;
  phone: string;
  designation: string; // যেমন: সেলসম্যান, ম্যানেজার, হিসাবরক্ষক, ডেলিভারি, হেল্পার
  salary: number; // মাসিক নির্ধারিত মূল বেতন
  joinDate: string; // YYYY-MM-DD
  status: 'active' | 'inactive'; // কর্মরত / অব্যাহতি
  address?: string;
  nidOrId?: string;
  notes?: string;
  createdAt: string;
}

export interface EmployeePayment {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  month: string; // e.g. "2026-10" or "অক্টোবর ২০২৬"
  amount: number; // কত টাকা দেওয়া হলো
  paymentType: 'salary' | 'advance' | 'bonus' | 'other'; // বেতন / অগ্রিম / বোনাস
  paymentMethod: 'cash' | 'online';
  onlineMethod?: 'bkash' | 'nagad' | 'rocket' | 'bank' | 'cheque';
  expenseId?: string; // Auto-created expense ID in daily expenses
  notes?: string;
  paidBy: string;
  createdAt: string;
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
  category: 'ইনভয়েস' | 'বাকি আদায়' | 'খরচ' | 'সাপ্লায়ার' | 'কাস্টমার' | 'ক্যাশ' | 'ইউজার' | 'সিস্টেম' | 'হিসাব';
  description: string;
  performedBy: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface RecycleBinItem {
  id: string;
  type: 'invoice' | 'customer' | 'supplier' | 'expense' | 'due_payment' | 'supplier_bill' | 'investment' | 'loan' | 'loan_repayment';
  name: string;
  amount?: number;
  date: string;
  deletedAt: string;
  deletedBy: string;
  originalData: unknown;
}

export interface Investment {
  id: string;
  investorName: string;
  amount: number;
  date: string; // YYYY-MM-DD
  paymentMethod: 'cash' | 'bank' | 'online';
  referenceNo?: string;
  purpose?: string;
  notes?: string;
  createdAt: string;
}

export interface BankLoan {
  id: string;
  loanNo: string;
  bankName: string;
  branchName?: string;
  accountNo?: string;
  loanAmount: number; // Principal
  sanctionDate: string; // YYYY-MM-DD
  termMonths?: number;
  interestRate?: number;
  monthlyInstallment?: number;
  notes?: string;
  status: 'active' | 'closed';
  createdAt: string;
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  bankName: string;
  repaymentDate: string; // YYYY-MM-DD
  amount: number;
  paymentMethod: 'cash' | 'bank' | 'online' | 'cheque';
  voucherNo?: string;
  notes?: string;
  createdAt: string;
}

export interface ProductCatalogItem {
  id: string;
  code?: string; // Product Code (যেমন: P-101, B-01)
  name: string;
  category?: string;
  unit: string; // যেমন: KG / কেজি, পিস, ইত্যাদি
  salePrice: number; // Sale Price (৳)
  purchasePrice: number; // Purchase Price (৳)
  stock: number; // Current Stock (KG)
  barcode?: string;
  createdAt?: string;
  updatedAt?: string;
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
  bankDeposit?: number;
  bankExpense?: number;
  netBankBalance?: number;
  notes?: string;
  denominations?: Record<string, number>;
  lastStockKg?: number; // ক্যাশ মিলানো শেষে ঐ দিনের সমাপনী মোট স্টক (KG)
  stockSnapshot?: Record<string, number>; // প্রতিটি পণ্যের স্টক স্ন্যাপশট
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
