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
  Upload
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
    recycleBin,
    setActiveModal,
    setCurrentTab,
    currentUser
  } = useApp();

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
  // Total online received today (Sales online + Due online)
  const totalOnlineReceivedDate = onlineSalesDate + onlineDueCollectedDate;

  // Expenses on selected date
  const dateExpenses = expenses.filter(exp => isSameDate(exp.date, targetDate));
  const totalExpenseDate = dateExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const cashExpenseDate = dateExpenses
    .filter(e => e.paymentMethod === 'cash')
    .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

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

  // Supplier Bills paid in cash on selected date (direct cash at purchase)
  const dateSupplierBills = supplierBills.filter(sb => isSameDate(sb.date, targetDate));
  const cashSupplierBillsPaidDate = dateSupplierBills.reduce((sum, sb) => sum + (Number(sb.cashPaid) || 0), 0);

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
  const totalSupplierPayable = suppliers.reduce((sum, s) => sum + (s.currentPayable || 0), 0);
  
  let openingSupplierUpToDate = 0;
  let supplierBillsUpToDate = 0;
  let supplierPaymentsUpToDate = 0;

  suppliers.forEach(s => {
    openingSupplierUpToDate += Number((s as any).openingBalance ?? s.openingPayable) || 0;
    
    const bills = supplierBills.filter(b => b.supplierId === s.id && new Date(b.date).getTime() <= targetDateNum);
    supplierBillsUpToDate += bills.reduce((sum, b) => sum + Number((b as any).amount ?? b.totalAmount ?? 0), 0);
    
    const pays = supplierPayments.filter(p => p.supplierId === s.id && new Date(p.date).getTime() <= targetDateNum);
    supplierPaymentsUpToDate += pays.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  });
  
  const totalSupplierPayableUpToDate = openingSupplierUpToDate + supplierBillsUpToDate - supplierPaymentsUpToDate;



  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 space-y-4">
      
      {/* Date Selector Banner Box */}
      <div className="bg-indigo-50/60 border border-indigo-200/90 rounded-xl p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <label className="text-xs sm:text-sm font-bold text-slate-800 mb-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-700" />
                <span>কাজের বা হিসাবের তারিখ নির্বাচন করুন:</span>
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
            * এখানে যে তারিখ সিলেক্ট করবেন, ড্যাশবোর্ড, ইনভয়েস, বাকি আদায় এবং ক্যাশ মিলানো পেজ সেই নির্দিষ্ট তারিখের হিসাব দেখাবে।
          </div>
        </div>
      </div>

      {/* Sub-actions Section Header & Buttons */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
            <span>দোকানের সার্বিক অবস্থা (Summary)</span>
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
              <span>ওপেনিং ক্যাশ</span>
            </button>

            {/* অন্যান্য ক্যাশ ইন (ধার/মূলধন) */}
            <button
              onClick={() => setActiveModal('other_cash_in')}
              className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition active:scale-95"
            >
              <ArrowDownCircle className="w-3.5 h-3.5" />
              <span>অন্যান্য ক্যাশ ইন (ধার/মূলধন)</span>
            </button>

            {/* ম্যানেজার তালিকা ও পাসওয়ার্ড */}
            <button
              onClick={() => setActiveModal('managers_list')}
              className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition active:scale-95"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>ম্যানেজার তালিকা ও পাসওয়ার্ড</span>
            </button>

            {/* পাসওয়ার্ড পরিবর্তন */}
            <button
              onClick={() => setActiveModal('change_password')}
              className="flex items-center gap-1 bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition active:scale-95"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>পাসওয়ার্ড পরিবর্তন</span>
            </button>

            {/* ম্যানেজার তৈরি */}
            <button
              onClick={() => setActiveModal('create_manager')}
              className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>ম্যানেজার তৈরি</span>
            </button>

            {/* এডিট হিস্ট্রি */}
            <button
              onClick={() => setActiveModal('audit_log')}
              className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition active:scale-95"
            >
              <History className="w-3.5 h-3.5" />
              <span>এডিট হিস্ট্রি</span>
            </button>

            {/* রিসাইকেল বিন */}
            <button
              onClick={() => setActiveModal('recycle_bin')}
              className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-md text-xs font-bold shadow-sm transition active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>রিসাইকেল বিন</span>
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
              <span>ব্যাকআপ আপলোড</span>
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
              <p className="text-xs font-semibold text-slate-600">নির্বাচিত তারিখের মোট বিক্রি</p>
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
              <p className="text-xs font-semibold text-slate-600">নির্বাচিত তারিখের নগদ জমা</p>
              <h3 className="text-2xl font-extrabold text-emerald-700 mt-2">
                {toBengaliNumber(totalCashReceivedDate)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-emerald-600 rounded-lg shadow-xs">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 3: নির্বাচিত তারিখের অনলাইন জমা (Light Sky / Cyan) */}
        <div className="bg-sky-50/60 rounded-xl p-4 border-l-4 border-l-sky-500 border border-sky-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">নির্বাচিত তারিখের অনলাইন জমা</p>
              <h3 className="text-2xl font-extrabold text-sky-600 mt-2">
                {toBengaliNumber(totalOnlineReceivedDate)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-sky-600 rounded-lg shadow-xs">
              <Smartphone className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Card 4: নির্বাচিত তারিখের বাকি বিক্রি (Light Amber / Orange) */}
        <div className="bg-amber-50/60 rounded-xl p-4 border-l-4 border-l-amber-500 border border-amber-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">নির্বাচিত তারিখের বাকি বিক্রি</p>
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
            বিস্তারিত দেখুন
          </button>
        </div>

        {/* Card 5: নির্বাচিত তারিখের বাকি আদায় (Light Pink) */}
        <div className="bg-pink-50/60 rounded-xl p-4 border-l-4 border-l-pink-500 border border-pink-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">নির্বাচিত তারিখের বাকি আদায়</p>
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
              <p className="text-xs font-semibold text-slate-600">নির্বাচিত তারিখের খরচ</p>
              <h3 className="text-2xl font-extrabold text-rose-600 mt-2">
                {toBengaliNumber(totalExpenseDate)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-rose-600 rounded-lg shadow-xs">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-rose-200/60 text-xs">
            <span className="text-slate-600 font-medium">সর্বমোট খরচ: {toBengaliNumber(allTimeTotalExpense)} ৳</span>
            <button
              onClick={() => setCurrentTab('daily_expenses')}
              className="text-rose-700 hover:text-rose-800 font-bold flex items-center gap-0.5 hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>খরচ যোগ</span>
            </button>
          </div>
        </div>

        {/* Card 7: বর্তমান হাত ক্যাশ (Light Teal) */}
        <div className="bg-teal-50/60 rounded-xl p-4 border-l-4 border-l-teal-500 border border-teal-100 shadow-sm hover:shadow-md transition">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">বর্তমান হাত ক্যাশ</p>
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
              <p className="text-xs font-semibold text-slate-600">{toBengaliNumber(formatDate(targetDate))} পর্যন্ত কাস্টমার বাকি</p>
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
              <p className="text-xs font-semibold text-slate-600">{toBengaliNumber(formatDate(targetDate))} পর্যন্ত মহাজন পাবে</p>
              <h3 className="text-2xl font-extrabold text-purple-700 mt-2">
                {toBengaliNumber(totalSupplierPayableUpToDate)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-purple-600 rounded-lg shadow-xs">
              <Truck className="w-5 h-5" />
            </div>
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
