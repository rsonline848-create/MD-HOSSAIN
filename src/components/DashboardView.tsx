import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShoppingCart, 
  Banknote, 
  Smartphone, 
  Hourglass, 
  Receipt, 
  Wallet, 
  Users, 
  Truck, 
  Plus, 
  AlertTriangle,
  Calendar,
  Layers,
  ArrowDownCircle,
  UserCheck,
  KeyRound,
  UserPlus,
  History,
  Trash2,
  Upload,
  Package,
  Boxes,
  TrendingUp,
  ArrowRight,
  Landmark,
  CreditCard
} from 'lucide-react';
import { toBengaliNumber, formatCurrency, formatDate, normalizeDate, isSameDate } from '../utils/formatters';

export const DashboardView: React.FC = () => {
  const { 
    selectedDate, 
    setSelectedDate,
    invoices, 
    duePayments, 
    supplierBills, 
    supplierPayments, 
    expenses, 
    openingCashList, 
    otherCashInList, 
    customers, 
    suppliers,
    products,
    recycleBin,
    setActiveModal,
    setCurrentTab,
    currentUser,
    isManager,
    language,
    t
  } = useApp();

  const isUserManager = Boolean(isManager || currentUser?.role === 'manager');
  const isAdmin = (currentUser?.role === 'admin' || currentUser?.role === 'branch_manager');

  // 1. Calculations for Selected Date with normalized date matching
  const targetDate = normalizeDate(selectedDate);
  const dateInvoices = invoices.filter(inv => isSameDate(inv.date, targetDate));
  const totalSalesDate = dateInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
  const cashSalesDate = dateInvoices.reduce((sum, inv) => sum + (Number(inv.cashPaid) || 0), 0);
  const onlineSalesDate = dateInvoices.reduce((sum, inv) => sum + (Number(inv.onlinePaid) || 0), 0);
  const dueSalesDate = dateInvoices.reduce((sum, inv) => sum + (Number(inv.dueAmount) || 0), 0);

  // Due collections on selected date
  const dateDuePayments = duePayments.filter(p => isSameDate(p.date, targetDate));
  const cashDueCollectedDate = dateDuePayments.reduce((sum, p) => sum + Number(p.cashPaid ?? (p.paymentMethod === 'cash' ? p.amount : 0)), 0);
  const onlineDueCollectedDate = dateDuePayments.reduce((sum, p) => sum + Number(p.onlinePaid ?? (p.paymentMethod !== 'cash' ? p.amount : 0)), 0);
  const totalDueCollectedDate = cashDueCollectedDate + onlineDueCollectedDate;

  // Total cash received today (Sales cash + Due collection cash)
  const totalCashReceivedDate = cashSalesDate + cashDueCollectedDate;
  // Total bank received today (Sales bank + Due collection bank)
  const totalBankReceivedDate = onlineSalesDate + onlineDueCollectedDate;
  const totalOnlineReceivedDate = totalBankReceivedDate;

  // Expenses on selected date
  const dateExpenses = expenses.filter(exp => isSameDate(exp.date, targetDate));
  const totalExpenseDate = dateExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const cashExpenseDate = dateExpenses
    .filter(e => e.paymentMethod === 'cash')
    .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const bankExpenseDate = dateExpenses
    .filter(e => e.paymentMethod !== 'cash')
    .reduce((sum, exp) => sum + (Number(exp.onlinePaid ?? exp.amount) || 0), 0);

  // All time total expenses
  const allTimeTotalExpense = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  // Opening Cash for selected date
  const openingCashRecord = openingCashList.find(c => isSameDate(c.date, targetDate));
  const openingCashAmount = openingCashRecord ? (Number(openingCashRecord.amount) || 0) : 0;

  // Other cash in for selected date
  const dateOtherCashIn = otherCashInList.filter(o => isSameDate(o.date, targetDate));
  const otherCashInAmount = dateOtherCashIn
    .filter(o => o.paymentMethod === 'cash')
    .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  // Supplier payments in cash on selected date
  const dateSupplierPayments = supplierPayments.filter(sp => isSameDate(sp.date, targetDate));
  const cashSupplierPaidDate = dateSupplierPayments
    .filter(sp => sp.paymentMethod === 'cash')
    .reduce((sum, sp) => sum + (Number(sp.amount) || 0), 0);
  const bankSupplierPaidDate = dateSupplierPayments
    .filter(sp => sp.paymentMethod !== 'cash')
    .reduce((sum, sp) => sum + Number(sp.onlinePaid ?? sp.amount ?? 0), 0);

  // Supplier Bills paid in cash on selected date (direct cash at purchase)
  const dateSupplierBills = supplierBills.filter(sb => isSameDate(sb.date, targetDate));
  const cashSupplierBillsPaidDate = dateSupplierBills.reduce((sum, sb) => sum + (Number(sb.cashPaid) || 0), 0);
  const bankSupplierBillsPaidDate = dateSupplierBills.reduce((sum, sb) => sum + (Number(sb.onlinePaid) || 0), 0);

  // Total Bank Expense / Outflow on selected date
  const totalBankExpenseDate = bankExpenseDate + bankSupplierPaidDate + bankSupplierBillsPaidDate;

  // In-Hand Cash Calculation:
  // Opening Cash + Cash from Sales + Cash from Due Collected + Other Cash In - Cash Expenses - Cash Paid to Suppliers
  const currentHandCash = Math.max(
    0,
    openingCashAmount + 
    cashSalesDate + 
    cashDueCollectedDate + 
    otherCashInAmount - 
    cashExpenseDate - 
    cashSupplierPaidDate - 
    cashSupplierBillsPaidDate
  );

  // Total Customer Due across system
  const totalCustomerDue = customers.reduce((sum, c) => sum + (c.currentDue || 0), 0);
  // Total Customer Due Up to Selected Date
  
  const targetDateNum = new Date(targetDate).getTime();
  
  let openingDueUpToDate = 0;
  let invoicesDueUpToDate = 0;
  let paymentsUpToDate = 0;

  customers.forEach(c => {
    openingDueUpToDate += Number(c.openingDue) || 0;
    
    const invs = invoices.filter(inv => inv.customerId === c.id && new Date(inv.date).getTime() <= targetDateNum);
    invoicesDueUpToDate += invs.reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0);
    
    const pays = duePayments.filter(p => p.customerId === c.id && new Date(p.date).getTime() <= targetDateNum);
    paymentsUpToDate += pays.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  });
  
  const totalCustomerDueUpToDate = openingDueUpToDate + invoicesDueUpToDate - paymentsUpToDate;



  // Total Supplier Payable across system
  const totalSupplierPayable = suppliers.reduce((sum, s) => {
    const opening = Number(s.openingPayable ?? s.openingBalance ?? s.previousDue ?? 0) || 0;
    const sBills = supplierBills.filter(b => b.supplierId === s.id);
    const sPayments = supplierPayments.filter(p => p.supplierId === s.id);
    const totalPurchased = sBills.reduce((acc, b) => acc + (Number(b.totalAmount) || 0), 0);
    const totalPaid = sBills.reduce((acc, b) => acc + ((Number(b.cashPaid) || 0) + (Number(b.onlinePaid) || 0)), 0) +
      sPayments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    return sum + Math.max(0, opening + totalPurchased - totalPaid);
  }, 0);
  
  let openingSupplierUpToDate = 0;
  let supplierBillsUpToDate = 0;
  let supplierPaymentsUpToDate = 0;

  suppliers.forEach(s => {
    openingSupplierUpToDate += Number(s.openingPayable ?? s.openingBalance ?? s.previousDue ?? 0) || 0;
    
    const bills = supplierBills.filter(b => b.supplierId === s.id && new Date(b.date).getTime() <= targetDateNum);
    supplierBillsUpToDate += bills.reduce((sum, b) => sum + Number((b as any).amount ?? b.totalAmount ?? 0), 0);
    
    const pays = supplierPayments.filter(p => p.supplierId === s.id && new Date(p.date).getTime() <= targetDateNum);
    supplierPaymentsUpToDate += pays.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  });
  
  const totalSupplierPayableUpToDate = openingSupplierUpToDate + supplierBillsUpToDate - supplierPaymentsUpToDate;

  // Stock & Inventory Calculations
  const totalProductsCount = products.length;
  const totalStockQty = Math.round(products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0) * 100) / 100;
  const totalStockPurchaseValue = Math.round(products.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.purchasePrice) || 0)), 0) * 100) / 100;
  const totalStockSaleValue = Math.round(products.reduce((sum, p) => sum + ((Number(p.stock) || 0) * (Number(p.salePrice) || 0)), 0) * 100) / 100;
  const potentialProfit = Math.max(0, Math.round((totalStockSaleValue - totalStockPurchaseValue) * 100) / 100);
  const lowStockCount = products.filter(p => (Number(p.stock) || 0) <= 5).length;
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 space-y-4">
      
      {/* Date Selector Banner Box */}
      <div className="bg-indigo-50/60 border border-indigo-200/90 rounded-xl p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <label className="text-xs sm:text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-700" />
                <span>{language === 'bn' ? 'কাজের বা হিসাবের তারিখ নির্বাচন করুন:' : 'Select Working / Reporting Date:'}</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-white border border-indigo-300 rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>
          <div className="text-xs text-indigo-900 font-medium bg-indigo-100/70 border border-indigo-200 px-3 py-2 rounded-lg">
            {language === 'bn' 
              ? '* এখানে যে তারিখ সিলেক্ট করবেন, ড্যাশবোর্ড, ইনভয়েস, বাকি আদায় এবং ক্যাশ মিলানো পেজ সেই নির্দিষ্ট তারিখের হিসাব দেখাবে।' 
              : '* The selected date dynamically updates calculations on Dashboard, Invoice, Due Collections, and Cash Tally.'}
          </div>
        </div>
      </div>

      {/* Sub-actions Section Header & Buttons */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>{language === 'bn' ? 'দোকানের সার্বিক অবস্থা (Summary)' : 'Shop Summary Overview'}</span>
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
          </h2>
        </div>

        {/* Sub-Action Buttons Strip (Only visible for Admin role) */}
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            {/* ওপেনিং ক্যাশ */}
            <button
              onClick={() => setActiveModal('opening_cash')}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ওপেনিং ক্যাশ' : 'Opening Cash'}</span>
            </button>

            {/* অন্যান্য ক্যাশ ইন (ধার/মূলধন) */}
            <button
              onClick={() => setActiveModal('other_cash_in')}
              className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition active:scale-95"
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'অন্যান্য ক্যাশ ইন' : 'Other Cash In'}</span>
            </button>

            {/* ম্যানেজার তালিকা ও পাসওয়ার্ড */}
            <button
              onClick={() => setActiveModal('managers_list')}
              className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition active:scale-95"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ম্যানেজার তালিকা' : 'Managers List'}</span>
            </button>

            {/* পাসওয়ার্ড পরিবর্তন */}
            <button
              onClick={() => setActiveModal('change_password')}
              className="flex items-center gap-1 bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition active:scale-95"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'পাসওয়ার্ড পরিবর্তন' : 'Change Password'}</span>
            </button>

            {/* কর্মচারী ও বেতন */}
            <button
              onClick={() => setCurrentTab('employees')}
              className="flex items-center gap-1 bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition active:scale-95"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'কর্মচারী ও বেতন' : 'Staff & Salary'}</span>
            </button>

            {/* ম্যানেজার তৈরি */}
            <button
              onClick={() => setActiveModal('create_manager')}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ম্যানেজার তৈরি' : 'Add Manager'}</span>
            </button>

            {/* এডিট হিস্ট্রি */}
            <button
              onClick={() => setActiveModal('audit_log')}
              className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition active:scale-95"
            >
              <History className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'এডিট হিস্ট্রি' : 'Audit Log'}</span>
            </button>

            {/* রিসাইকেল বিন */}
            <button
              onClick={() => setActiveModal('recycle_bin')}
              className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'রিসাইকেল বিন' : 'Recycle Bin'}</span>
              <span className="bg-white text-rose-700 px-1 rounded-full text-[10px]">
                {toBengaliNumber(recycleBin.length)}
              </span>
            </button>

            {/* ব্যাকআপ আপলোড */}
            <button
              onClick={() => setActiveModal('backup_upload')}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'ব্যাকআপ আপলোড' : 'Upload Backup'}</span>
            </button>

            {/* স্টক ও মালামাল */}
            <button
              onClick={() => setCurrentTab('products')}
              className="flex items-center gap-1 bg-cyan-700 hover:bg-cyan-800 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Package className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'স্টক ও মালামাল' : 'Stock & Items'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Google Firebase Live Quota & Usage Monitor Card */}
      

      {/* 9 Stat Cards Grid (Light theme backgrounds matching each card category) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 pt-1">
        
        {/* Card 1: নির্বাচিত তারিখের মোট বিক্রি (Light Indigo / Blue) */}
        <div className="bg-indigo-50/60 rounded-xl p-4 border-l-4 border-l-indigo-600 border border-indigo-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">
                {language === 'bn' ? 'নির্বাচিত তারিখের মোট বিক্রি' : 'Selected Date Total Sales'}
              </p>
              <h3 className="text-2xl font-extrabold text-indigo-700 mt-2">
                {toBengaliNumber(totalSalesDate)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-indigo-600 rounded-lg shadow-xs">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 2: নির্বাচিত তারিখের নগদ জমা (Light Emerald / Green) */}
        <div className="bg-emerald-50/60 rounded-xl p-4 border-l-4 border-l-emerald-600 border border-emerald-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">
                {language === 'bn' ? 'নির্বাচিত তারিখের নগদ জমা' : 'Selected Date Cash Received'}
              </p>
              <h3 className="text-2xl font-extrabold text-emerald-700 mt-2">
                {toBengaliNumber(totalCashReceivedDate)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-emerald-600 rounded-lg shadow-xs">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 3: নির্বাচিত তারিখের ব্যাংক জমা (Light Sky / Cyan) */}
        <div className="bg-sky-50/60 rounded-xl p-4 border-l-4 border-l-sky-500 border border-sky-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">
                {language === 'bn' ? 'নির্বাচিত তারিখের ব্যাংক জমা' : 'Selected Date Bank Deposit'}
              </p>
              <h3 className="text-2xl font-extrabold text-sky-600 mt-2">
                {toBengaliNumber(totalBankReceivedDate)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-sky-600 rounded-lg shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-sky-700/80 font-medium">
            {language === 'bn' ? 'বিক্রয় ও বাকি আদায় বাবদ ব্যাংক জমা' : 'Sales & Due payments in bank'}
          </div>
        </div>

        {/* Card 4: নির্বাচিত তারিখের ব্যাংক খরচ (Light Violet / Purple) */}
        <div className="bg-violet-50/60 rounded-xl p-4 border-l-4 border-l-violet-500 border border-violet-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">
                {language === 'bn' ? 'নির্বাচিত তারিখের ব্যাংক খরচ' : 'Selected Date Bank Expense'}
              </p>
              <h3 className="text-2xl font-extrabold text-violet-600 mt-2">
                {toBengaliNumber(totalBankExpenseDate)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-violet-600 rounded-lg shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-violet-700/80 font-medium flex items-center justify-between">
            <span>{language === 'bn' ? 'দৈনিক খরচ ও সরবরাহকারী পেমেন্ট' : 'Expenses & Supplier payments'}</span>
            <button
              onClick={() => setCurrentTab('daily_expenses')}
              className="text-violet-700 hover:text-violet-900 font-bold hover:underline cursor-pointer"
            >
              {language === 'bn' ? 'খরচের খাতা' : 'Expenses'}
            </button>
          </div>
        </div>

        {/* Card 4: নির্বাচিত তারিখের বাকি বিক্রি (Light Amber / Orange) */}
        <div className="bg-amber-50/60 rounded-xl p-4 border-l-4 border-l-amber-500 border border-amber-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">
                {language === 'bn' ? 'নির্বাচিত তারিখের বাকি বিক্রি' : 'Selected Date Due Sales'}
              </p>
              <h3 className="text-2xl font-extrabold text-amber-600 mt-2">
                {toBengaliNumber(dueSalesDate)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-amber-600 rounded-lg shadow-xs">
              <Hourglass className="w-5 h-5" />
            </div>
          </div>
          <button
            onClick={() => setActiveModal('date_due_sales_list')}
            className="mt-3 text-[11px] font-bold text-amber-700 bg-white hover:bg-amber-100/80 border border-amber-200/80 py-1.5 px-3 rounded shadow-xs text-center transition w-max cursor-pointer"
          >
            {language === 'bn' ? 'বিস্তারিত দেখুন' : 'View Details'}
          </button>
        </div>

        {/* Card 5: নির্বাচিত তারিখের বাকি আদায় (Light Pink) */}
        <div className="bg-pink-50/60 rounded-xl p-4 border-l-4 border-l-pink-500 border border-pink-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">
                {language === 'bn' ? 'নির্বাচিত তারিখের বাকি আদায়' : 'Selected Date Due Collected'}
              </p>
              <h3 className="text-2xl font-extrabold text-pink-600 mt-2">
                {toBengaliNumber(totalDueCollectedDate)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-pink-600 rounded-lg shadow-xs">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 6: নির্বাচিত তারিখের খরচ (Light Rose / Red) */}
        <div className="bg-rose-50/60 rounded-xl p-4 border-l-4 border-l-rose-500 border border-rose-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">
                {language === 'bn' ? 'নির্বাচিত তারিখের খরচ' : 'Selected Date Expenses'}
              </p>
              <h3 className="text-2xl font-extrabold text-rose-600 mt-2">
                {toBengaliNumber(totalExpenseDate)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-rose-600 rounded-lg shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-rose-200/60 text-xs">
            <span className="text-slate-600 font-medium">
              {language === 'bn' ? 'সর্বমোট খরচ: ' : 'Total Expenses: '}{toBengaliNumber(allTimeTotalExpense)} ৳
            </span>
            <button
              onClick={() => setCurrentTab('daily_expenses')}
              className="text-rose-700 hover:text-rose-800 font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'bn' ? 'খরচ যোগ' : 'Add Expense'}</span>
            </button>
          </div>
        </div>

        {/* Card 7: বর্তমান হাত ক্যাশ (Light Teal) */}
        <div className="bg-teal-50/60 rounded-xl p-4 border-l-4 border-l-teal-500 border border-teal-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">
                {language === 'bn' ? 'বর্তমান হাত ক্যাশ' : 'Current Hand Cash'}
              </p>
              <h3 className="text-2xl font-extrabold text-teal-700 mt-2">
                {toBengaliNumber(currentHandCash)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-teal-600 rounded-lg shadow-xs">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 8: মোট কাস্টমার বাকি (Light Red) */}
        <div className="bg-red-50/60 rounded-xl p-4 border-l-4 border-l-red-600 border border-red-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">
                {language === 'bn' 
                  ? `${toBengaliNumber(formatDate(targetDate))} পর্যন্ত কাস্টমার বাকি` 
                  : `Customer Dues up to ${toBengaliNumber(formatDate(targetDate))}`}
              </p>
              <h3 className="text-2xl font-extrabold text-red-600 mt-2">
                {toBengaliNumber(totalCustomerDueUpToDate)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-red-600 rounded-lg shadow-xs">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 9: মোট সাপ্লায়ার পাবে (মহাজন) (Light Purple) */}
        <div className="bg-purple-50/60 rounded-xl p-4 border-l-4 border-l-purple-600 border border-purple-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">
                {language === 'bn' 
                  ? `${toBengaliNumber(formatDate(targetDate))} পর্যন্ত মহাজন পাবে` 
                  : `Supplier Payables up to ${toBengaliNumber(formatDate(targetDate))}`}
              </p>
              <h3 className="text-2xl font-extrabold text-purple-700 mt-2">
                {toBengaliNumber(totalSupplierPayableUpToDate)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-purple-600 rounded-lg shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 10: মোট স্টক মূল্য (ক্রয়মূল্য / ইনভেস্টমেন্ট) (Light Blue) */}
        <div className="bg-blue-50/60 rounded-xl p-4 border-l-4 border-l-blue-600 border border-blue-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">
                {language === 'bn' ? 'দোকানের মোট স্টক মূল্য (ক্রয়মূল্য)' : 'Total Stock Cost Value'}
              </p>
              <h3 className="text-2xl font-extrabold text-blue-700 mt-2">
                {toBengaliNumber(totalStockPurchaseValue)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-blue-600 rounded-lg shadow-xs">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-blue-200/60 text-xs">
            <span className="text-slate-600 font-medium">
              {language === 'bn' ? 'মোট পণ্য: ' : 'Total Items: '}{toBengaliNumber(totalProductsCount)} {language === 'bn' ? 'প্রকার' : 'items'}
            </span>
            <button
              onClick={() => setCurrentTab('products')}
              className="text-blue-700 hover:text-blue-800 font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              <span>{language === 'bn' ? 'স্টক তালিকা' : 'Stock List'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 11: স্টকের সম্ভাব্য মোট বিক্রয়মূল্য (Light Emerald) */}
        <div className="bg-emerald-50/60 rounded-xl p-4 border-l-4 border-l-emerald-600 border border-emerald-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">
                {language === 'bn' ? 'স্টকের সম্ভাব্য বিক্রয়মূল্য' : 'Estimated Stock Sale Value'}
              </p>
              <h3 className="text-2xl font-extrabold text-emerald-700 mt-2">
                {toBengaliNumber(totalStockSaleValue)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-emerald-600 rounded-lg shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-emerald-200/60 text-xs">
            {!isUserManager ? (
              <span className="text-emerald-700 font-semibold">
                {language === 'bn' ? 'সম্ভাব্য লাভ: +' : 'Potential Profit: +'}{toBengaliNumber(potentialProfit)} ৳
              </span>
            ) : (
              <span className="text-slate-500 font-medium">
                {language === 'bn' ? 'মোট মজুদ মালামাল' : 'Total in Stock'}
              </span>
            )}
            <button
              onClick={() => setCurrentTab('products')}
              className="text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              <span>{language === 'bn' ? 'প্রোডাক্টস' : 'Products'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Card 12: মজুদ মালামাল ও লো স্টক সতর্কতা */}
        <div className={`rounded-xl p-4 border-l-4 border shadow-sm hover:shadow-md transition ${
          lowStockCount > 0 
            ? 'bg-amber-50/70 border-l-amber-500 border-amber-200' 
            : 'bg-teal-50/60 border-l-teal-600 border-teal-100'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">মোট মজুদ মালামাল (কোয়ান্টিটি)</p>
              <h3 className={`text-2xl font-extrabold mt-2 ${lowStockCount > 0 ? 'text-amber-700' : 'text-teal-700'}`}>
                {toBengaliNumber(totalStockQty)} <span className="text-sm font-normal">কেজি</span>
              </h3>
            </div>
            <div className={`p-2.5 bg-white rounded-lg shadow-xs ${lowStockCount > 0 ? 'text-amber-600' : 'text-teal-600'}`}>
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className={`flex items-center justify-between pt-3 mt-2 border-t text-xs ${
            lowStockCount > 0 ? 'border-amber-200/70' : 'border-teal-200/60'
          }`}>
            {lowStockCount > 0 ? (
              <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-100/90 px-2 py-0.5 rounded-md">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                {toBengaliNumber(lowStockCount)} টি পণ্যের স্টক কম
              </span>
            ) : (
              <span className="text-teal-700 font-semibold">
                স্টক পর্যাপ্ত আছে
              </span>
            )}
            <button
              onClick={() => setCurrentTab('products')}
              className={`font-bold flex items-center gap-0.5 hover:underline cursor-pointer ${
                lowStockCount > 0 ? 'text-amber-800 hover:text-amber-900' : 'text-teal-700 hover:text-teal-800'
              }`}
            >
              <span>স্টক আপডেট</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Danger Zone: Data Reset Card (Only visible for Admin role) */}
      {isAdmin && (
        <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-4 mt-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-rose-700 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>ডেটা রিসেট / ক্লিয়ার করুন</span>
              </h4>
              <p className="text-xs text-rose-600 font-medium">
                সতর্কতা: এটি করলে ক্লাউড ডাটাবেজের সমস্ত কাস্টমার ও লেনদেন মুছে যাবে।
              </p>
            </div>
            <button
              onClick={() => setActiveModal('reset_confirm')}
              className="flex items-center justify-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow transition active:scale-95 self-start sm:self-center"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>সকল ডাটা ক্লিয়ার করুন</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
