import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, Save, Landmark, CreditCard, Wallet, ArrowDownRight, ArrowUpRight, Scale } from 'lucide-react';
import { toBengaliNumber, formatCurrency, formatDate, normalizeDate, isSameDate, toEnglishNumber } from '../utils/formatters';

export const CashTallyView: React.FC = () => {
  const { 
    selectedDate, 
    setSelectedDate,
    invoices, 
    duePayments, 
    expenses, 
    openingCashList, 
    otherCashInList, 
    supplierBills, 
    supplierPayments,
    cashTallies,
    saveCashTally
  } = useApp();

  const [dateInput, setDateInput] = useState<string>(normalizeDate(selectedDate) || new Date().toISOString().split('T')[0]);
  const [actualCash, setActualCash] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  const actualCashRef = useRef<HTMLInputElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  // Normalized current working date string (YYYY-MM-DD)
  const currentDate = normalizeDate(dateInput) || new Date().toISOString().split('T')[0];

  // Sync dateInput when global selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      const norm = normalizeDate(selectedDate);
      setDateInput(norm);
    }
  }, [selectedDate]);

  // Load existing saved cash tally if any exists for this date
  useEffect(() => {
    const existingTally = cashTallies.find(t => isSameDate(t.date, currentDate));
    if (existingTally) {
      setActualCash(String(existingTally.actualCash || ''));
      setNotes(existingTally.notes || '');
    } else {
      setActualCash('');
      setNotes('');
    }
  }, [currentDate, cashTallies]);

  const handleDateChange = (newDate: string) => {
    const norm = normalizeDate(newDate);
    setDateInput(norm);
    setSelectedDate(norm);
  };

  // ===================== ১. নগদ ক্যাশ হিসাব (Cash Calculations) =====================
  // ১. শুরুর ক্যাশ (Opening)
  const openingRecord = openingCashList.find(c => isSameDate(c.date, currentDate));
  const openingCash = openingRecord ? (Number(openingRecord.amount) || 0) : 0;

  // ২. অন্যান্য ক্যাশ ইন (+)
  const dateOtherCash = otherCashInList.filter(o => isSameDate(o.date, currentDate) && o.paymentMethod === 'cash');
  const otherCashIn = dateOtherCash.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  // ৩. আজকের নগদ জমা (+) : নগদ বিক্রি + নগদ বাকি আদায়
  const dateInvoices = invoices.filter(inv => isSameDate(inv.date, currentDate));
  const cashSalesDate = dateInvoices.reduce((sum, inv) => sum + (Number(inv.cashPaid) || 0), 0);

  const dateDuePayments = duePayments.filter(p => isSameDate(p.date, currentDate));
  const cashDueCollectedDate = dateDuePayments.reduce((sum, p) => sum + Number(p.cashPaid ?? (p.paymentMethod === 'cash' ? p.amount : 0)), 0);

  const todaysCashDeposit = cashSalesDate + cashDueCollectedDate;

  // ৪. আজকের নগদ খরচ (-)
  const dateExpenses = expenses.filter(e => isSameDate(e.date, currentDate) && e.paymentMethod === 'cash');
  const cashExpenses = dateExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // ৫. সাপ্লায়ার নগদ পরিশোধ (-)
  const dateSupplierPayments = supplierPayments.filter(sp => isSameDate(sp.date, currentDate) && sp.paymentMethod === 'cash');
  const cashSupplierPaid = dateSupplierPayments.reduce((sum, sp) => sum + (Number(sp.amount) || 0), 0);

  const dateSupplierBills = supplierBills.filter(sb => isSameDate(sb.date, currentDate));
  const cashSupplierBillsPaid = dateSupplierBills.reduce((sum, sb) => sum + (Number(sb.cashPaid) || 0), 0);

  const totalSupplierPaid = cashSupplierPaid + cashSupplierBillsPaid;

  // ৬. ক্যাশে থাকার কথা (Expected Cash)
  const expectedCash = (openingCash + otherCashIn + todaysCashDeposit) - (cashExpenses + totalSupplierPaid);

  // ৭. বাস্তবে ক্যাশে আছে (Actual) & পার্থক্য (Short/Over)
  const actualCashNumber = actualCash === '' ? 0 : (toEnglishNumber(actualCash.toString()));
  const difference = actualCashNumber - expectedCash;

  // ===================== ২. ব্যাংক জমা ও ব্যাংক খরচ হিসাব (Bank Calculations) =====================
  // ক) ব্যাংক জমা (+)
  const bankSalesDate = dateInvoices.reduce((sum, inv) => sum + (Number(inv.onlinePaid) || 0), 0);
  const bankDueCollectedDate = dateDuePayments.reduce((sum, p) => sum + Number(p.onlinePaid ?? (p.paymentMethod !== 'cash' ? p.amount : 0)), 0);
  const dateOtherBankIn = otherCashInList
    .filter(o => isSameDate(o.date, currentDate) && o.paymentMethod !== 'cash')
    .reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const totalBankDeposit = bankSalesDate + bankDueCollectedDate + dateOtherBankIn;

  // খ) ব্যাংক খরচ (-)
  const bankExpenses = expenses
    .filter(e => isSameDate(e.date, currentDate) && e.paymentMethod !== 'cash')
    .reduce((sum, e) => sum + (Number(e.onlinePaid ?? e.amount) || 0), 0);

  const bankSupplierPaid = supplierPayments
    .filter(sp => isSameDate(sp.date, currentDate) && sp.paymentMethod !== 'cash')
    .reduce((sum, sp) => sum + Number(sp.onlinePaid ?? sp.amount ?? 0), 0);

  const bankSupplierBillsPaid = supplierBills
    .filter(sb => isSameDate(sb.date, currentDate))
    .reduce((sum, sb) => sum + (Number(sb.onlinePaid) || 0), 0);

  const totalSupplierBankPaid = bankSupplierPaid + bankSupplierBillsPaid;
  const totalBankExpense = bankExpenses + totalSupplierBankPaid;

  // গ) নিট ব্যাংক উদ্বৃত্ত / ব্যালেন্স (Net Bank Balance = Bank In - Bank Out)
  const netBankBalance = totalBankDeposit - totalBankExpense;

  const handleSaveTally = (e: React.FormEvent) => {
    e.preventDefault();
    
    saveCashTally({
      date: currentDate,
      openingCash,
      otherCashIn,
      cashSales: cashSalesDate,
      cashDueCollected: cashDueCollectedDate,
      todaysCashDeposit,
      cashExpenses,
      totalSupplierPaid,
      expectedCash,
      actualCash: actualCashNumber,
      difference,
      bankDeposit: totalBankDeposit,
      bankExpense: totalBankExpense,
      netBankBalance,
      notes: notes.trim()
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      
      {/* Top Banner: কাজের বা হিসাবের তারিখ নির্বাচন করুন */}
      <div className="bg-[#eff6ff] border border-[#bfdbfe] rounded-xl p-4 sm:p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <label className="text-xs sm:text-sm font-bold text-[#1e3a8a] block mb-1.5">
              কাজের বা হিসাবের তারিখ নির্বাচন করুন:
            </label>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => handleDateChange(e.target.value)}
              className="bg-white border-2 border-[#3b82f6] rounded-lg px-3.5 py-1.5 text-xs sm:text-sm font-bold text-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          <p className="text-xs text-[#3b82f6] font-medium max-w-xl">
            * এখানে যে তারিখ সিলেক্ট করবেন, ড্যাশবোর্ড, ইনভয়েস, বাকি আদায় এবং ক্যাশ মিলানো পেজ সেই নির্দিষ্ট তারিখের হিসাব দেখাবে।
          </p>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-xl shadow-sm flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-bold">ক্যাশ ও ব্যাংক মিলানোর হিসাব সফলভাবে ক্লাউডে সেভ হয়েছে!</span>
          </div>
          <button
            onClick={() => setSaveSuccess(false)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* Overview Metric Cards: নির্বাচিত তারিখের ক্যাশ ও ব্যাংক সারসংক্ষেপ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: ক্যাশে থাকার কথা */}
        <div className="bg-blue-50/70 rounded-xl p-4 border-l-4 border-l-blue-600 border border-blue-200 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">ক্যাশে থাকার কথা (ড্রয়ার)</p>
              <h3 className="text-2xl font-black text-blue-700 mt-1.5">
                {toBengaliNumber(expectedCash)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-blue-600 rounded-lg shadow-2xs border border-blue-100">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-blue-700/80 font-medium mt-2">
            শুরুর ক্যাশ + আজকের নগদ জমা - নগদ খরচ
          </p>
        </div>

        {/* Card 2: নির্বাচিত তারিখের ব্যাংক জমা */}
        <div className="bg-sky-50/70 rounded-xl p-4 border-l-4 border-l-sky-500 border border-sky-200 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">নির্বাচিত তারিখের ব্যাংক জমা</p>
              <h3 className="text-2xl font-black text-sky-600 mt-1.5">
                {toBengaliNumber(totalBankDeposit)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-sky-600 rounded-lg shadow-2xs border border-sky-100">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-sky-700/80 font-medium mt-2 truncate" title={`বিক্রয়: ${toBengaliNumber(bankSalesDate)} ৳ | বাকি আদায়: ${toBengaliNumber(bankDueCollectedDate)} ৳`}>
            বিক্রয়: {toBengaliNumber(bankSalesDate)} ৳ | বাকি আদায়: {toBengaliNumber(bankDueCollectedDate)} ৳
          </p>
        </div>

        {/* Card 3: নির্বাচিত তারিখের ব্যাংক খরচ */}
        <div className="bg-violet-50/70 rounded-xl p-4 border-l-4 border-l-violet-500 border border-violet-200 shadow-xs">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">নির্বাচিত তারিখের ব্যাংক খরচ</p>
              <h3 className="text-2xl font-black text-violet-600 mt-1.5">
                {toBengaliNumber(totalBankExpense)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className="p-2.5 bg-white text-violet-600 rounded-lg shadow-2xs border border-violet-100">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-[11px] text-violet-700/80 font-medium mt-2 truncate" title={`সাধারণ খরচ: ${toBengaliNumber(bankExpenses)} ৳ | মহাজন পরিশোধ: ${toBengaliNumber(totalSupplierBankPaid)} ৳`}>
            সাধারণ: {toBengaliNumber(bankExpenses)} ৳ | মহাজন: {toBengaliNumber(totalSupplierBankPaid)} ৳
          </p>
        </div>

        {/* Card 4: নির্বাচিত তারিখের নিট ব্যাংক ব্যালেন্স */}
        <div className={`rounded-xl p-4 border-l-4 border shadow-xs ${
          netBankBalance >= 0 
            ? 'bg-emerald-50/70 border-l-emerald-500 border-emerald-200' 
            : 'bg-rose-50/70 border-l-rose-500 border-rose-200'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-600">নির্বাচিত তারিখের নিট ব্যাংক উদ্বৃত্ত</p>
              <h3 className={`text-2xl font-black mt-1.5 ${netBankBalance >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                {netBankBalance > 0 ? '+' : ''}{toBengaliNumber(netBankBalance)} <span className="text-sm font-normal">৳</span>
              </h3>
            </div>
            <div className={`p-2.5 bg-white rounded-lg shadow-2xs border ${netBankBalance >= 0 ? 'text-emerald-600 border-emerald-100' : 'text-rose-600 border-rose-100'}`}>
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-[11px] font-medium mt-2 ${netBankBalance >= 0 ? 'text-emerald-700/80' : 'text-rose-700/80'}`}>
            মোট ব্যাংক জমা - মোট ব্যাংক খরচ
          </p>
        </div>
      </div>

      {/* Main Container: ক্যাশ মিলানো (YYYY-MM-DD) */}
      <div className="bg-white rounded-2xl border border-slate-300 p-5 sm:p-7 shadow-sm space-y-6">
        
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3.5">
          <div className="flex items-center gap-2">
            <Wallet className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
              নগদ ক্যাশ মিলানো ({toBengaliNumber(formatDate(currentDate))})
            </h2>
          </div>
          <span className="text-xs font-mono bg-purple-50 text-purple-700 px-3 py-1 rounded-full font-bold border border-purple-200 self-start sm:self-auto">
            তারিখ: {dateInput}
          </span>
        </div>

        <form onSubmit={handleSaveTally} className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* Left Column: Left Side Breakdown Cards */}
          <div className="space-y-4">
            
            {/* ১. শুরুর ক্যাশ (Opening) */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                শুরুর ক্যাশ (Opening)
              </label>
              <input
                type="text"
                readOnly
                value={openingCash}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-bold text-[#1d4ed8] shadow-sm select-none"
              />
            </div>

            {/* ২. অন্যান্য ক্যাশ ইন (+) */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                অন্যান্য ক্যাশ ইন (+)
              </label>
              <input
                type="text"
                readOnly
                value={otherCashIn}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-bold text-purple-700 shadow-sm select-none"
              />
            </div>

            {/* ৩. আজকের নগদ জমা (+) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  আজকের নগদ জমা (+)
                </label>
                <span className="text-[11px] text-slate-500 font-medium">
                  নগদ বিক্রি: {toBengaliNumber(cashSalesDate)} ৳ + বাকি আদায়: {toBengaliNumber(cashDueCollectedDate)} ৳
                </span>
              </div>
              <input
                type="text"
                readOnly
                value={todaysCashDeposit}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-bold text-[#15803d] shadow-sm select-none"
              />
            </div>

            {/* ৪. আজকের খরচ (-) */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                আজকের খরচ (-)
              </label>
              <input
                type="text"
                readOnly
                value={cashExpenses}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-bold text-rose-600 shadow-sm select-none"
              />
            </div>

            {/* ৫. সাপ্লায়ার নগদ পরিশোধ (-) */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                সাপ্লায়ার নগদ পরিশোধ (-)
              </label>
              <input
                type="text"
                readOnly
                value={totalSupplierPaid}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm font-bold text-purple-700 shadow-sm select-none"
              />
            </div>

            {/* ৬. ক্যাশে থাকার কথা (Expected) */}
            <div className="pt-2">
              <label className="text-xs font-bold text-[#1e3a8a] block mb-1.5">
                ক্যাশে থাকার কথা (Expected)
              </label>
              <input
                type="text"
                readOnly
                value={expectedCash}
                className="w-full bg-[#f8fafc] border-2 border-[#93c5fd] rounded-lg px-3.5 py-3 text-base font-extrabold text-[#1e3a8a] shadow-sm select-none"
              />
            </div>

          </div>

          {/* Right Column: Physical Drawer Cash Entry & Short/Over Box */}
          <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-5 sm:p-6 space-y-4">
            
            {/* বাস্তবে ক্যাশে আছে (Actual) */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                বাস্তবে ক্যাশে আছে (Actual)
              </label>
              <input
                ref={actualCashRef}
                type="text" inputMode="numeric"
                min="0"
                placeholder="টাকা লিখুন"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveButtonRef.current?.focus();
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2.5 text-base font-semibold text-slate-800 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
            </div>

            {/* পার্থক্য (Short/Over) */}
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1.5">
                পার্থক্য (Short/Over)
              </label>
              <input
                type="text"
                readOnly
                value={`${difference} ৳`}
                className={`w-full bg-white border rounded-lg px-4 py-2.5 text-base font-extrabold shadow-sm select-none ${
                  difference === 0 
                    ? 'border-emerald-400 text-emerald-600' 
                    : difference > 0 
                    ? 'border-blue-400 text-blue-600' 
                    : 'border-slate-300 text-slate-900'
                }`}
              />
            </div>

            {/* নোট / মন্তব্য (Notes) */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                মন্তব্য / নোট (ঐচ্ছিক)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ক্যাশ মিলানো সংক্রান্ত কোনো মন্তব্য থাকলে লিখুন..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
              />
            </div>

            {/* সেভ বোতাম: ক্যাশ মিলানো সম্পন্ন ও ক্লাউডে সেভ করুন */}
            <div className="pt-2">
              <button
                ref={saveButtonRef}
                type="submit"
                className="w-full bg-[#059669] hover:bg-[#047857] text-white py-3.5 rounded-lg text-sm sm:text-base font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>ক্যাশ ও ব্যাংক মিলানো সম্পন্ন ও সেভ করুন</span>
              </button>
              <p className="text-[11px] text-slate-500 font-medium text-center mt-2 flex items-center justify-center gap-1">
                <span>📦</span>
                <span>ক্যাশ মিলানো সম্পন্ন করার সাথে সাথে ঐ দিনের সমাপনী পণ্যের লাস্ট স্টকও (Closing Stock) স্বয়ংক্রিয়ভাবে সংরক্ষিত হবে।</span>
              </p>
            </div>

          </div>

        </form>

        {/* Bank Details Breakdown Section: নির্বাচিত তারিখের ব্যাংক জমা ও ব্যাংক খরচের পূর্ণ বিবরণী */}
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
              <Landmark className="w-5 h-5 text-sky-600" />
              <span>নির্বাচিত তারিখের ব্যাংক জমা ও ব্যাংক খরচের বিস্তারিত বিবরণী</span>
            </h3>
            <span className="text-xs font-semibold text-slate-500 hidden sm:inline-block">
              {toBengaliNumber(formatDate(currentDate))}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            
            {/* Bank Deposit Box */}
            <div className="bg-gradient-to-br from-sky-50/80 to-white rounded-xl border border-sky-200 p-4 sm:p-5 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-sky-100 text-sky-700 rounded-lg">
                    <ArrowDownRight className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-sky-900">
                    নির্বাচিত তারিখের ব্যাংক জমা (+)
                  </h4>
                </div>
                <span className="bg-sky-600 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                  {toBengaliNumber(totalBankDeposit)} ৳
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-sky-100">
                  <span className="text-slate-600">১. বিক্রয় বাবদ ব্যাংক জমা:</span>
                  <span className="font-bold text-slate-800">{toBengaliNumber(bankSalesDate)} ৳</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-sky-100">
                  <span className="text-slate-600">২. বাকি আদায় বাবদ ব্যাংক জমা:</span>
                  <span className="font-bold text-slate-800">{toBengaliNumber(bankDueCollectedDate)} ৳</span>
                </div>
                {dateOtherBankIn > 0 && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-sky-100">
                    <span className="text-slate-600">৩. অন্যান্য অনলাইন/ব্যাংক জমা:</span>
                    <span className="font-bold text-slate-800">{toBengaliNumber(dateOtherBankIn)} ৳</span>
                  </div>
                )}
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-sky-100/70 border border-sky-200 font-bold text-sky-950">
                  <span>সর্বমোট ব্যাংক জমা:</span>
                  <span className="text-sm font-black text-sky-700">{toBengaliNumber(totalBankDeposit)} ৳</span>
                </div>
              </div>
            </div>

            {/* Bank Expense Box */}
            <div className="bg-gradient-to-br from-violet-50/80 to-white rounded-xl border border-violet-200 p-4 sm:p-5 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between border-b border-violet-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-violet-100 text-violet-700 rounded-lg">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs sm:text-sm font-bold text-violet-900">
                    নির্বাচিত তারিখের ব্যাংক খরচ (-)
                  </h4>
                </div>
                <span className="bg-violet-600 text-white font-extrabold text-xs px-2.5 py-0.5 rounded-full shadow-2xs">
                  {toBengaliNumber(totalBankExpense)} ৳
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-violet-100">
                  <span className="text-slate-600">১. দোকান / সাধারণ ব্যাংক খরচ:</span>
                  <span className="font-bold text-slate-800">{toBengaliNumber(bankExpenses)} ৳</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-violet-100">
                  <span className="text-slate-600">২. মহাজন দেনা পরিশোধ (ব্যাংক):</span>
                  <span className="font-bold text-slate-800">{toBengaliNumber(bankSupplierPaid)} ৳</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-white/80 border border-violet-100">
                  <span className="text-slate-600">৩. মাল ক্রয় বিলের ব্যাংক পেমেন্ট:</span>
                  <span className="font-bold text-slate-800">{toBengaliNumber(bankSupplierBillsPaid)} ৳</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-violet-100/70 border border-violet-200 font-bold text-violet-950">
                  <span>সর্বমোট ব্যাংক খরচ:</span>
                  <span className="text-sm font-black text-violet-700">{toBengaliNumber(totalBankExpense)} ৳</span>
                </div>
              </div>
            </div>

          </div>

          {/* Bottom Bank Summary Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-slate-700">
              <Scale className="w-4 h-4 text-purple-600 shrink-0" />
              <span>
                <strong>ব্যাংক সারসংক্ষেপ:</strong> মোট ব্যাংক জমা <strong className="text-sky-700">({toBengaliNumber(totalBankDeposit)} ৳)</strong> - মোট ব্যাংক খরচ <strong className="text-violet-700">({toBengaliNumber(totalBankExpense)} ৳)</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-600">নিট ব্যাংক উদ্বৃত্ত / ব্যালেন্স:</span>
              <span className={`text-sm font-extrabold px-3 py-1 rounded-lg border ${
                netBankBalance >= 0 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}>
                {netBankBalance > 0 ? '+' : ''}{toBengaliNumber(netBankBalance)} ৳
              </span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
