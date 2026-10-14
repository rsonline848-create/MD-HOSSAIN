import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle2, Save } from 'lucide-react';
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

  // 1. শুরুর ক্যাশ (Opening)
  const openingRecord = openingCashList.find(c => isSameDate(c.date, currentDate));
  const openingCash = openingRecord ? (Number(openingRecord.amount) || 0) : 0;

  // 2. অন্যান্য ক্যাশ ইন (+)
  const dateOtherCash = otherCashInList.filter(o => isSameDate(o.date, currentDate) && o.paymentMethod === 'cash');
  const otherCashIn = dateOtherCash.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);

  // 3. আজকের নগদ জমা (+) : নগদ বিক্রি + নগদ বাকি আদায়
  const dateInvoices = invoices.filter(inv => isSameDate(inv.date, currentDate));
  const cashSalesDate = dateInvoices.reduce((sum, inv) => sum + (Number(inv.cashPaid) || 0), 0);

  const dateDuePayments = duePayments.filter(p => isSameDate(p.date, currentDate));
  const cashDueCollectedDate = dateDuePayments.reduce((sum, p) => sum + Number(p.cashPaid ?? (p.paymentMethod === 'cash' ? p.amount : 0)), 0);

  const todaysCashDeposit = cashSalesDate + cashDueCollectedDate;

  // 4. আজকের খরচ (-)
  const dateExpenses = expenses.filter(e => isSameDate(e.date, currentDate) && e.paymentMethod === 'cash');
  const cashExpenses = dateExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

  // 5. সাপ্লায়ার নগদ পরিশোধ (-)
  const dateSupplierPayments = supplierPayments.filter(sp => isSameDate(sp.date, currentDate) && sp.paymentMethod === 'cash');
  const cashSupplierPaid = dateSupplierPayments.reduce((sum, sp) => sum + (Number(sp.amount) || 0), 0);

  const dateSupplierBills = supplierBills.filter(sb => isSameDate(sb.date, currentDate));
  const cashSupplierBillsPaid = dateSupplierBills.reduce((sum, sb) => sum + (Number(sb.cashPaid) || 0), 0);

  const totalSupplierPaid = cashSupplierPaid + cashSupplierBillsPaid;

  // 6. ক্যাশে থাকার কথা (Expected)
  const expectedCash = (openingCash + otherCashIn + todaysCashDeposit) - (cashExpenses + totalSupplierPaid);

  // 7. বাস্তবে ক্যাশে আছে (Actual) & পার্থক্য (Short/Over)
  const actualCashNumber = actualCash === '' ? 0 : (toEnglishNumber(actualCash.toString()));
  const difference = actualCashNumber - expectedCash;

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
      notes: notes.trim()
    });

    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 4000);
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 space-y-5">
      
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
            <span className="text-sm font-bold">ক্যাশ মিলানোর হিসাব সফলভাবে ক্লাউডে সেভ হয়েছে!</span>
          </div>
          <button
            onClick={() => setSaveSuccess(false)}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* Main Container: ক্যাশ মিলানো (YYYY-MM-DD) */}
      <div className="bg-white rounded-2xl border border-slate-300 p-5 sm:p-7 shadow-sm space-y-6">
        
        {/* Title */}
        <div className="border-b border-slate-200 pb-3.5">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
            ক্যাশ মিলানো ({dateInput})
          </h2>
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
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                আজকের নগদ জমা (+)
              </label>
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
          <div className="bg-[#f8fafc] border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
            
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

            {/* সেভ বোতাম: ক্যাশ মিলানো সম্পন্ন ও ক্লাউডে সেভ করুন */}
            <div className="pt-2">
              <button
                ref={saveButtonRef}
                type="submit"
                className="w-full bg-[#059669] hover:bg-[#047857] text-white py-3.5 rounded-lg text-sm sm:text-base font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
              >
                <span>ক্যাশ মিলানো সম্পন্ন ও ক্লাউডে সেভ করুন</span>
              </button>
            </div>

          </div>

        </form>

      </div>

    </div>
  );
};
