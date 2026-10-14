import React, { useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ShoppingCart, Truck, CheckCircle, Search, Plus, CreditCard } from 'lucide-react';
import { toBengaliNumber, toEnglishNumber, formatCurrency, formatDate } from '../utils/formatters';

export const SupplierBillView: React.FC = () => {
  const { 
    selectedDate, 
    suppliers, 
    supplierBills, 
    addSupplierBill, 
    addSupplierPayment,
    supplierPayments,
    setSuppliers 
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'bill_entry' | 'payment_entry' | 'history'>('bill_entry');

  // Purchase Bill State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [itemsDescription, setItemsDescription] = useState<string>('');
  const [totalAmount, setTotalAmount] = useState<string>("");
  const [cashPaid, setCashPaid] = useState<string>("");
  const [onlinePaid, setOnlinePaid] = useState<string>("");
  const [billNotes, setBillNotes] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Bill Refs
  const billSupplierSelectRef = useRef<HTMLSelectElement>(null);
  const billTotalAmountRef = useRef<HTMLInputElement>(null);
  const billItemsDescRef = useRef<HTMLTextAreaElement>(null);
  const billCashPaidRef = useRef<HTMLInputElement>(null);
  const billOnlinePaidRef = useRef<HTMLInputElement>(null);
  const billNotesRef = useRef<HTMLInputElement>(null);
  const billSubmitButtonRef = useRef<HTMLButtonElement>(null);

  // Direct Supplier Payment State (মহাজন দেনা পরিশোধ)
  const [paySupplierId, setPaySupplierId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>("");
  const [payMethod, setPayMethod] = useState<'cash' | 'online'>('cash');
  const [payNotes, setPayNotes] = useState<string>('');

  // Pay Refs
  const paySupplierSelectRef = useRef<HTMLSelectElement>(null);
  const payAmountRef = useRef<HTMLInputElement>(null);
  const payMethodRef = useRef<HTMLSelectElement>(null);
  const payNotesRef = useRef<HTMLInputElement>(null);
  const paySubmitButtonRef = useRef<HTMLButtonElement>(null);

  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);
  const selectedPaySupplier = suppliers.find(s => s.id === paySupplierId);

  const billDue = Math.max(0, (toEnglishNumber(totalAmount.toString()) || 0) - ((toEnglishNumber(cashPaid.toString()) || 0) + (toEnglishNumber(onlinePaid.toString()) || 0)));

  const handleSaveBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) {
      alert('সাপ্লায়ার সিলেক্ট করুন!');
      return;
    }
    if (!totalAmount || toEnglishNumber(totalAmount.toString()) <= 0) {
      alert('মালের মোট টাকার পরিমাণ লিখুন!');
      return;
    }

    const billNo = 'BILL-' + Math.floor(100000 + Math.random() * 900000);

    addSupplierBill({
      billNo,
      supplierId: selectedSupplier.id,
      supplierName: selectedSupplier.name,
      companyName: selectedSupplier.companyName,
      date: selectedDate,
      itemsDescription: itemsDescription.trim() || 'ইলেকট্রিক মালামাল ক্রয়',
      totalAmount: toEnglishNumber(totalAmount.toString()),
      cashPaid: toEnglishNumber(cashPaid.toString()) || 0,
      onlinePaid: toEnglishNumber(onlinePaid.toString()) || 0,
      dueAmount: billDue,
      notes: billNotes
    });

    setSuccessMsg(`সাপ্লায়ার ${selectedSupplier.companyName} এর বিল #${billNo} সফলভাবে সেভ হয়েছে!`);
    setTimeout(() => setSuccessMsg(''), 5000);

    setSelectedSupplierId('');
    setItemsDescription('');
    setTotalAmount("");
    setCashPaid("");
    setOnlinePaid("");
    setBillNotes('');
  };

  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaySupplier) {
      alert('সাপ্লায়ার সিলেক্ট করুন!');
      return;
    }
    if (!payAmount || toEnglishNumber(payAmount.toString()) <= 0) {
      alert('সঠিক টাকার পরিমাণ লিখুন!');
      return;
    }

    addSupplierPayment({
      supplierId: selectedPaySupplier.id,
      supplierName: `${selectedPaySupplier.name} (${selectedPaySupplier.companyName})`,
      date: selectedDate,
      amount: toEnglishNumber(payAmount.toString()),
      paymentMethod: payMethod,
      notes: payNotes
    });

    setSuccessMsg(`মহাজন ${selectedPaySupplier.name}-কে ${payAmount} ৳ পরিশোধ রেকর্ড করা হয়েছে!`);
    setTimeout(() => setSuccessMsg(''), 5000);

    setPaySupplierId('');
    setPayAmount("");
    setPayNotes('');
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-purple-600" />
            <span>মাল ক্রয় ও মহাজন বিল (Supplier Purchase & Payment)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            তারিখ: <span className="font-bold text-indigo-700">{toBengaliNumber(formatDate(selectedDate))}</span>
          </p>
        </div>

        {/* Sub-tab pills */}
        <div className="flex bg-slate-200 p-1 rounded-lg text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('bill_entry')}
            className={`px-3 py-1.5 rounded-md transition ${activeSubTab === 'bill_entry' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            + নতুন মাল ক্রয় বিল
          </button>
          <button
            onClick={() => setActiveSubTab('payment_entry')}
            className={`px-3 py-1.5 rounded-md transition ${activeSubTab === 'payment_entry' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            + মহাজন দেনা পরিশোধ
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`px-3 py-1.5 rounded-md transition ${activeSubTab === 'history' ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
          >
            ক্রয় ও পেমেন্ট হিস্ট্রি
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tab 1: New Purchase Bill */}
      {activeSubTab === 'bill_entry' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:p-6">
          <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              সাপ্লায়ার বিল ভাউচার এন্ট্রি
            </h3>

            <form onSubmit={handleSaveBill} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">সাপ্লায়ার / মহাজন সিলেক্ট করুন *</label>
                  <select
                    ref={billSupplierSelectRef}
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        billTotalAmountRef.current?.focus();
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:bg-white"
                    required
                  >
                    <option value="">-- সাপ্লায়ার নির্বাচন করুন --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.companyName} - {s.name} (বাকি: {toBengaliNumber(s.currentPayable)} ৳)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">মোট বিলের পরিমাণ (৳) *</label>
                  <input
                    ref={billTotalAmountRef}
                    type="text" inputMode="numeric"
                    min="1"
                    value={totalAmount || ''}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        billItemsDescRef.current?.focus();
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-extrabold text-purple-700 focus:bg-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">মালের বিবরণ / আইটেম সমূহ</label>
                <textarea
                  ref={billItemsDescRef}
                  rows={3}
                  value={itemsDescription}
                  onChange={(e) => setItemsDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      billCashPaidRef.current?.focus();
                    }
                  }}
                  placeholder="যেমন: BRB তার ২০ কয়েল, সুপারস্টার বাল্ব ৫০ পিস..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-purple-50/50 p-3.5 rounded-xl border border-purple-100">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">নগদ প্রদান (ক্যাশ আউট) ৳:</label>
                  <input
                    ref={billCashPaidRef}
                    type="text" inputMode="numeric"
                    min="0"
                    value={cashPaid || ''}
                    onChange={(e) => setCashPaid(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        billOnlinePaidRef.current?.focus();
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-xs font-bold text-purple-900"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">অনলাইন / ব্যাংক পেমেন্ট ৳:</label>
                  <input
                    ref={billOnlinePaidRef}
                    type="text" inputMode="numeric"
                    min="0"
                    value={onlinePaid || ''}
                    onChange={(e) => setOnlinePaid(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        billNotesRef.current?.focus();
                      }
                    }}
                    placeholder="0"
                    className="w-full bg-white border border-purple-200 rounded-lg px-3 py-2 text-xs font-bold text-purple-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">নোট / মন্তব্য</label>
                <input
                  ref={billNotesRef}
                  type="text"
                  value={billNotes}
                  onChange={(e) => setBillNotes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      billSubmitButtonRef.current?.focus();
                    }
                  }}
                  placeholder="ভাউচার বা চালানের নম্বর..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
                />
              </div>

              <div className="bg-slate-100 p-3 rounded-lg flex justify-between items-center text-xs font-bold">
                <span className="text-slate-700">সাপ্লায়ার বাকি থাকবে (মহাজন পাবে):</span>
                <span className="text-sm font-extrabold text-rose-600">{toBengaliNumber(billDue)} ৳</span>
              </div>

              <button
                ref={billSubmitButtonRef}
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition active:scale-98"
              >
                ক্রয় বিল সম্পন্ন করুন
              </button>
            </form>
          </div>

          {/* Supplier Info sidebar */}
          <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
              সাপ্লায়ার বর্তমান অবস্থা
            </h3>
            {selectedSupplier ? (
              <div className="space-y-2.5 text-xs">
                <p className="font-bold text-purple-950 text-sm">{selectedSupplier.companyName}</p>
                <p className="text-slate-600">মালিক / প্রতিনিধি: {selectedSupplier.name}</p>
                <p className="text-slate-600">ফোন: {selectedSupplier.phone}</p>
                <p className="text-slate-600">ঠিকানা: {selectedSupplier.address}</p>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                  <span className="text-rose-700 font-semibold block">মোট বকেয়া পাওনা:</span>
                  <span className="text-xl font-extrabold text-rose-700">{toBengaliNumber(selectedSupplier.currentPayable)} ৳</span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">সাপ্লায়ার সিলেক্ট করলে বিস্তারিত দেখা যাবে।</p>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Direct Supplier Payment */}
      {activeSubTab === 'payment_entry' && (
        <div className="max-w-xl mx-auto bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-purple-600" />
            <span>মহাজন / সাপ্লায়ারকে দেনা পরিশোধ</span>
          </h3>

          <form onSubmit={handleSavePayment} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">সাপ্লায়ার সিলেক্ট করুন *</label>
              <select
                ref={paySupplierSelectRef}
                value={paySupplierId}
                onChange={(e) => {
                  setPaySupplierId(e.target.value);
                  const found = suppliers.find(s => s.id === e.target.value);
                  if (found) setPayAmount(String(found.currentPayable || ""));
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    payAmountRef.current?.focus();
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold focus:bg-white"
                required
              >
                <option value="">-- সাপ্লায়ার নির্বাচন করুন --</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.companyName} ({s.name}) - বকেয়া: {toBengaliNumber(s.currentPayable)} ৳
                  </option>
                ))}
              </select>
            </div>

            {selectedPaySupplier && (
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200 text-xs">
                <p className="font-bold text-purple-900">{selectedPaySupplier.companyName}</p>
                <p className="text-rose-600 font-bold mt-1">বর্তমান বকেয়া: {toBengaliNumber(selectedPaySupplier.currentPayable)} ৳</p>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">পরিশোধের পরিমাণ (৳) *</label>
              <input
                ref={payAmountRef}
                type="text" inputMode="numeric"
                min="1"
                value={payAmount || ''}
                onChange={(e) => setPayAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    payMethodRef.current?.focus();
                  }
                }}
                placeholder="0"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm font-extrabold text-purple-700 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">পরিশোধের মাধ্যম</label>
              <select
                ref={payMethodRef}
                value={payMethod}
                onChange={(e: any) => setPayMethod(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    payNotesRef.current?.focus();
                  }
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs font-semibold"
              >
                <option value="cash">নগদ ক্যাশ (হাত ক্যাশ থেকে বিয়োগ হবে)</option>
                <option value="online">অনলাইন / ব্যাংক ট্রান্সফার</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">নোট / ভাউচার বিবরণ</label>
              <input
                ref={payNotesRef}
                type="text"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    paySubmitButtonRef.current?.focus();
                  }
                }}
                placeholder="যেমন: চেক নং বা স্লিপ নং..."
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 text-xs"
              />
            </div>

            <button
              ref={paySubmitButtonRef}
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition active:scale-98"
            >
              পেমেন্ট কনফার্ম করুন
            </button>
          </form>
        </div>
      )}

      {/* Tab 3: History */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
            সর্বশেষ মাল ক্রয়ের তালিকা
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="p-2.5">বিল নং</th>
                  <th className="p-2.5">তারিখ</th>
                  <th className="p-2.5">সাপ্লায়ার / কোম্পানি</th>
                  <th className="p-2.5">মালের বিবরণ</th>
                  <th className="p-2.5 text-right">মোট বিল</th>
                  <th className="p-2.5 text-right">নগদ জমা</th>
                  <th className="p-2.5 text-right">বাকি</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {supplierBills.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-4 sm:p-6 text-center text-slate-400 text-xs">
                      এখনো কোনো ক্রয়ের বিল এন্ট্রি করা হয়নি।
                    </td>
                  </tr>
                ) : (
                  supplierBills.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-bold text-purple-700">{b.billNo}</td>
                      <td className="p-2.5 text-slate-600">{toBengaliNumber(formatDate(b.date))}</td>
                      <td className="p-2.5 font-semibold text-slate-800">{b.companyName}</td>
                      <td className="p-2.5 text-slate-600 max-w-xs truncate">{b.itemsDescription}</td>
                      <td className="p-2.5 text-right font-extrabold text-slate-800">{toBengaliNumber(b.totalAmount)} ৳</td>
                      <td className="p-2.5 text-right font-semibold text-emerald-700">{toBengaliNumber(b.cashPaid + b.onlinePaid)} ৳</td>
                      <td className="p-2.5 text-right font-bold text-rose-600">{toBengaliNumber(b.dueAmount)} ৳</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
