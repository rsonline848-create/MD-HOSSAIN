import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import { 
  UserCheck, 
  CheckCircle, 
  Search, 
  Printer, 
  HandCoins 
} from 'lucide-react';
import { 
  toBengaliNumber, 
  toEnglishNumber, 
  getFormattedCurrentTime,
  normalizeNumericInput,
  normalizeInputDigits 
} from '../utils/formatters';

export const DueCollectionView: React.FC = () => {
  const { 
    selectedDate, 
    customers, 
    duePayments, 
    addDuePayment, 
    setCustomers 
  } = useApp();

  // Form Fields matching screenshot
  const [paymentDate, setPaymentDate] = useState<string>(selectedDate || new Date().toISOString().split('T')[0]);
  const [billDate, setBillDate] = useState<string>('');
  const [memoNo, setMemoNo] = useState<string>('');

  // Element Refs for smooth Enter navigation
  const memoNoRef = useRef<HTMLInputElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const cashCollectedRef = useRef<HTMLInputElement>(null);
  const otherCollectedRef = useRef<HTMLInputElement>(null);
  const discountAmountRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Customer search & selection
  const [customerInput, setCustomerInput] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Financial inputs
  const [cashCollected, setCashCollected] = useState<string>("");
  const [otherCollected, setOtherCollected] = useState<string>("");
  const [onlineMethod, setOnlineMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank' | 'cheque' | 'goods'>('bank');
  const [discountAmount, setDiscountAmount] = useState<string>("");

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Sync date when global selectedDate changes
  useEffect(() => {
    if (selectedDate) {
      setPaymentDate(selectedDate);
    }
  }, [selectedDate]);

  // Close customer dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered customer suggestions
  const filteredCustomers = customers.filter(c => 
    (c.name || '').toLowerCase().includes(customerInput.toLowerCase()) ||
    (c.phone || '').includes(customerInput)
  );

  const handleSelectCustomer = (cust: Customer) => {
    setSelectedCustomer(cust);
    setCustomerInput(cust.name + (cust.phone ? ` (${cust.phone})` : ''));
    setShowCustomerDropdown(false);
  };

  const handleCustomerInputChange = (text: string) => {
    setCustomerInput(text);
    setShowCustomerDropdown(true);
    if (selectedCustomer && !text.includes(selectedCustomer.name)) {
      setSelectedCustomer(null);
    }
  };

  // Calculations
  const currentDue = selectedCustomer ? (selectedCustomer.currentDue || 0) : 0;
  const numDiscount = toEnglishNumber(discountAmount.toString()) || 0;
  const totalCollected = (toEnglishNumber(cashCollected.toString()) || 0) + (toEnglishNumber(otherCollected.toString()) || 0);
  const nextDue = currentDue - totalCollected - numDiscount;

  // Submit Handler
  const handleSaveDuePayment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!billDate) {
      alert('অনুগ্রহ করে বিলের তারিখ দিন!');
      return;
    }

    if (!selectedCustomer && !customerInput.trim()) {
      alert('অনুগ্রহ করে কাস্টমারের নাম নির্বাচন করুন!');
      return;
    }

    if (totalCollected <= 0 && numDiscount <= 0) {
      alert('অনুগ্রহ করে আদায়ের পরিমাণ বা ডিসকাউন্ট দিন!');
      return;
    }

    const receiptNumber = memoNo.trim() || `REC-${Date.now().toString().slice(-6)}`;
    const custId = selectedCustomer ? selectedCustomer.id : 'c_' + Date.now();
    const custName = selectedCustomer ? selectedCustomer.name : customerInput.trim();
    const custPhone = selectedCustomer ? selectedCustomer.phone : '';

    // If customer wasn't registered yet, create one
    if (!selectedCustomer) {
      const newCust: Customer = {
        id: custId,
        name: custName,
        phone: '',
        address: '',
        openingDue: 0,
        totalPurchased: 0,
        totalPaid: totalCollected,
        currentDue: 0,
        createdDate: paymentDate
      };
      setCustomers(prev => [newCust, ...prev]);
    }

    const numCash = toEnglishNumber(cashCollected.toString()) || 0;
    const numOther = toEnglishNumber(otherCollected.toString()) || 0;
    const totalPay = numCash + numOther;

    if (totalPay > 0 || numDiscount > 0) {
      let method: 'cash' | 'online' = 'cash';
      if (numOther > 0 && numCash === 0) method = 'online';

      addDuePayment({
        receiptNo: receiptNumber,
        customerId: custId,
        customerName: custName,
        customerPhone: custPhone,
        date: paymentDate,
        billDate: billDate || undefined,
        amount: totalPay,
        cashPaid: numCash,
        onlinePaid: numOther,
        discount: numDiscount,
        paymentMethod: method,
        onlineMethod: method === 'online' || numOther > 0 ? onlineMethod : undefined,
        notes: numCash > 0 && numOther > 0 ? 'নগদ ও ব্যাংক মাধ্যমে আদায়' : (numCash > 0 ? 'নগদ আদায়' : (numOther > 0 ? 'ব্যাংক মাধ্যমে আদায়' : 'শুধুমাত্র ডিসকাউন্ট')),
        previousDue: currentDue,
        remainingDue: nextDue
      });
    }



    setSuccessMessage(`${custName} এর নিকট থেকে মোট ${toBengaliNumber(totalCollected)} ৳ বাকি সফলভাবে আদায় ও সেভ হয়েছে!`);

    // Reset Form
    setMemoNo('');
    setBillDate('');
    setCustomerInput('');
    setSelectedCustomer(null);
    setCashCollected("");
    setOtherCollected("");
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 space-y-6">
      
      {/* Success Message Alert */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-xl shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-bold">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage('')}
            className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1"
          >
            বন্ধ করুন
          </button>
        </div>
      )}

      {/* Main Card Container */}
      <div className="bg-white rounded-2xl border border-slate-300 p-5 sm:p-7 shadow-sm space-y-6">
        
        {/* Title */}
        <div className="border-b border-slate-200 pb-3.5">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
            বাকি আদায় / কাস্টমার পেমেন্ট
          </h2>
        </div>

        <form 
          onSubmit={handleSaveDuePayment} 
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
              const target = e.target as HTMLElement;
              if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
                e.preventDefault();
              }
            }
          }}
          className="space-y-5"
        >
          
          {/* Row 1: তারিখ, বিলের তারিখ ও রশিদ / মেমো নম্বর */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                আদায়ের তারিখ
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    document.getElementById('billDateInput')?.focus();
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                বিলের তারিখ <span className="text-rose-600 font-semibold">*</span>
              </label>
              <input
                id="billDateInput"
                type="date"
                required
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    memoNoRef.current?.focus();
                    memoNoRef.current?.select?.();
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                রশিদ / মেমো নম্বর <span className="text-rose-600 font-semibold">*</span>
              </label>
              <input
                ref={memoNoRef}
                type="text"
                placeholder="মেমো নম্বর"
                value={memoNo}
                onChange={(e) => setMemoNo(normalizeInputDigits(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                    e.preventDefault();
                    e.stopPropagation();
                    // Move to next tab / next input (Customer selection field)
                    if (customerInputRef.current) {
                      customerInputRef.current.focus();
                      customerInputRef.current.select?.();
                    }
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm font-mono"
              />
            </div>
          </div>

          {/* Row 2: কাস্টমারের নাম ও বর্তমান বাকি */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="relative" ref={customerDropdownRef}>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                কাস্টমারের নাম
              </label>
              <div className="relative">
                <input
                  ref={customerInputRef}
                  type="text"
                  required
                  placeholder="কাস্টমারের নাম বা ফোন লিখুন..."
                  value={customerInput}
                  onChange={(e) => handleCustomerInputChange(e.target.value)}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setShowCustomerDropdown(false);
                      discountAmountRef.current?.focus();
                      discountAmountRef.current?.select?.();
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Customer Search Autocomplete Dropdown */}
              {showCustomerDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(c => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="p-2.5 hover:bg-emerald-50 cursor-pointer text-xs flex items-center justify-between transition"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{c.name}</p>
                          <p className="text-[11px] text-slate-500">{c.phone || 'ফোন নেই'} {c.address ? `• ${c.address}` : ''}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">বর্তমান বাকি</span>
                          <span className={`font-bold ${c.currentDue > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                            {toBengaliNumber(c.currentDue)} ৳
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    customerInput.trim() && (
                      <div 
                        onClick={() => setShowCustomerDropdown(false)}
                        className="p-2.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        কাস্টমার: <strong className="text-emerald-700">{customerInput}</strong>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                বর্তমান বাকি
              </label>
              <input
                type="text" inputMode="numeric"
                readOnly
                value={currentDue}
                className="w-full bg-white border border-red-500 rounded-lg px-3.5 py-2 text-sm font-bold text-red-600 shadow-sm select-none"
              />
            </div>
          </div>
          {/* Row 2.5: লেস / ডিসকাউন্ট (টাকা) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="text-xs font-bold text-pink-600 block mb-1.5">
                লেস / ডিসকাউন্ট (টাকা)
              </label>
              <input
                ref={discountAmountRef}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(normalizeNumericInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    cashCollectedRef.current?.focus();
                    cashCollectedRef.current?.select?.();
                  }
                }}
                className="w-full bg-white border border-pink-500 rounded-lg px-3.5 py-2 text-sm font-semibold text-pink-600 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 shadow-sm font-mono"
              />
            </div>
            <div>{/* Empty column matching layout */}</div>
          </div>

          {/* Row 3: Payment Section (সবুজ বক্স: নগদ আদায় ও অন্যান্য মাধ্যম) */}
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-center">
            <div>
              <label className="text-xs font-bold text-[#15803d] block mb-1.5">
                নগদ আদায়
              </label>
              <input
                ref={cashCollectedRef}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={cashCollected || ''}
                onChange={(e) => setCashCollected(normalizeNumericInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    otherCollectedRef.current?.focus();
                    otherCollectedRef.current?.select?.();
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-bold text-[#15803d] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                অনলাইন পেমেন্ট মাধ্যম
              </label>
              <select
                value={onlineMethod}
                onChange={(e: any) => setOnlineMethod(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="bank">ব্যাংক (Bank)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-[#4338ca] block mb-1.5">
                অনলাইন পেমেন্টের টাকা (ব্যাংক)
              </label>
              <input
                ref={otherCollectedRef}
                type="text"
                inputMode="decimal"
                placeholder="0"
                value={otherCollected || ''}
                onChange={(e) => setOtherCollected(normalizeNumericInput(e.target.value))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitButtonRef.current?.focus();
                  }
                }}
                className="w-full bg-white border border-indigo-300 rounded-lg px-3.5 py-2 text-sm font-bold text-[#4338ca] placeholder:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm font-mono"
              />
            </div>
          </div>

          {/* Row 4: সর্বমোট আদায় ও পরবর্তী বাকি */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="text-xs font-bold text-[#15803d] block mb-1.5">
                সর্বমোট আদায়
              </label>
              <input
                type="text" inputMode="numeric"
                readOnly
                value={totalCollected}
                className="w-full bg-white border border-emerald-500 rounded-lg px-3.5 py-2 text-sm font-bold text-emerald-700 shadow-sm select-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#b45309] block mb-1.5">
                পরবর্তী বাকি
              </label>
              <input
                type="text" inputMode="numeric"
                readOnly
                value={nextDue}
                className="w-full bg-white border border-amber-500 rounded-lg px-3.5 py-2 text-sm font-bold text-amber-700 shadow-sm select-none"
              />
            </div>
          </div>

          {/* Row 5: বাকি আদায় সেভ করুন Button */}
          <div className="pt-2">
            <button
              ref={submitButtonRef}
              type="submit"
              className="w-full bg-[#059669] hover:bg-[#047857] text-white py-3 sm:py-3.5 rounded-lg text-sm sm:text-base font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
            >
              <HandCoins className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>বাকি আদায় সেভ করুন</span>
            </button>
          </div>

        </form>

      </div>

    </div>
  );
};
