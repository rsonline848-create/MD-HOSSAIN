import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { InvoiceItem, Customer } from '../types';
import { 
  Save, 
  Printer, 
  CheckCircle, 
  Search
} from 'lucide-react';
import { toBengaliNumber, toEnglishNumber, getFormattedCurrentTime } from '../utils/formatters';

export const NewInvoiceView: React.FC = () => {
  const { 
    selectedDate, 
    customers, 
    addInvoice, 
    addCustomer,
    setCustomers,
    setInvoiceToPrint 
  } = useApp();

  // Form Fields matching screenshot
  const [invoiceDate, setInvoiceDate] = useState<string>(selectedDate || new Date().toISOString().split('T')[0]);
  const [memoNo, setMemoNo] = useState<string>('');
  
  // Element Refs for smooth Enter navigation
  const memoNoInputRef = useRef<HTMLInputElement>(null);
  const customerInputRef = useRef<HTMLInputElement>(null);
  const totalSaleRef = useRef<HTMLInputElement>(null);
  const discountRef = useRef<HTMLInputElement>(null);
  const cashPaidRef = useRef<HTMLInputElement>(null);
  const onlinePaidRef = useRef<HTMLInputElement>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);

  // Customer input & selection
  const [customerInput, setCustomerInput] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
  const customerDropdownRef = useRef<HTMLDivElement>(null);

  // Financial inputs
  const [totalSaleAmount, setTotalSaleAmount] = useState<string>("");
  const [discount, setDiscount] = useState<string>("");
  const [cashPaid, setCashPaid] = useState<string>("");
  const [onlineMethod, setOnlineMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank' | 'cheque' | 'goods'>('bkash');
  const [onlinePaid, setOnlinePaid] = useState<string>("");

  // Notifications
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [lastSavedInvoice, setLastSavedInvoice] = useState<any>(null);

  // Sync date when selectedDate in global context changes
  useEffect(() => {
    if (selectedDate) {
      setInvoiceDate(selectedDate);
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
    // If text does not match selected customer, clear selectedCustomer
    if (selectedCustomer && !text.includes(selectedCustomer.name)) {
      setSelectedCustomer(null);
    }
  };

  // Calculations
  const numTotalSale = toEnglishNumber(totalSaleAmount.toString()) || 0;
  const numDiscount = toEnglishNumber(discount.toString()) || 0;
  const numCashPaid = toEnglishNumber(cashPaid.toString()) || 0;
  const numOnlinePaid = toEnglishNumber(onlinePaid.toString()) || 0;

  const previousDue = selectedCustomer ? (selectedCustomer.currentDue || 0) : 0;
  const netSale = numTotalSale - numDiscount;
  const totalPaid = numCashPaid + numOnlinePaid;
  const todaysDue = netSale - totalPaid;
  const overallDue = previousDue + netSale - totalPaid;

  // Submit Handler
  const handleSaveInvoice = (e: React.FormEvent) => {
    e.preventDefault();

    if (!memoNo.trim()) {
      alert('মেমো নম্বর দেওয়া বাধ্যতামূলক!');
      return;
    }

    if (toEnglishNumber(totalSaleAmount.toString()) < 0) {
      alert('বিক্রির টাকা ঋণাত্মক (negative) হতে পারে না!');
      return;
    }

    let customerId = selectedCustomer ? selectedCustomer.id : '';
    let customerName = customerInput.trim() || 'সাধারণ ক্যাশ কাস্টমার';
    let customerPhone = '';
    let customerAddress = '';

    if (selectedCustomer) {
      customerName = selectedCustomer.name;
      customerPhone = selectedCustomer.phone;
      customerAddress = selectedCustomer.address;
    } else if (customerInput.trim() && customerInput.trim() !== 'সাধারণ ক্যাশ কাস্টমার') {
      // Create new customer if typed
      const newCust: Customer = {
        id: 'c_' + Date.now(),
        name: customerInput.trim(),
        phone: '',
        address: '',
        openingDue: 0,
        totalPurchased: 0,
        totalPaid: 0,
        currentDue: 0,
        createdDate: invoiceDate,
        notes: ''
      };
      addCustomer(newCust);
      customerId = newCust.id;
    }

    const validItems: InvoiceItem[] = [
      {
        id: 'it_main',
        name: 'মালামাল বিক্রয়',
        quantity: 1,
        unit: 'আইটেম',
        unitPrice: numTotalSale,
        totalPrice: numTotalSale
      }
    ];

    const created = addInvoice({
      invoiceNo: memoNo.trim(),
      date: invoiceDate,
      time: getFormattedCurrentTime(),
      customerId,
      customerName,
      customerPhone,
      customerAddress,
      items: validItems,
      subtotal: numTotalSale,
      discount: numDiscount,
      laborOrTransportCost: 0,
      grandTotal: netSale,
      cashPaid: numCashPaid,
      onlinePaid: numOnlinePaid,
      onlineMethod,
      dueAmount: todaysDue,
      status: todaysDue <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'due',
      notes: ''
    });

    setLastSavedInvoice(created);
    setSuccessMessage(`ইনভয়েস ${memoNo} সফলভাবে ক্লাউডে সেভ হয়েছে!`);

    // Reset Form
    setMemoNo('');
    setCustomerInput('');
    setSelectedCustomer(null);
    setTotalSaleAmount('');
    setDiscount('');
    setCashPaid('');
    setOnlinePaid('');
  };

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6">
      
      {/* Success Notification Alert */}
      {successMessage && (
        <div className="mb-4 bg-emerald-50 border border-emerald-300 text-emerald-800 p-4 rounded-xl shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span className="text-sm font-bold">{successMessage}</span>
          </div>
          <div className="flex items-center gap-2">
            {lastSavedInvoice && (
              <button
                type="button"
                onClick={() => setInvoiceToPrint(lastSavedInvoice)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>মেমো প্রিন্ট করুন</span>
              </button>
            )}
            <button
              onClick={() => setSuccessMessage('')}
              className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold px-2 py-1"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      )}

      {/* Main Invoice Card */}
      <div className="bg-white rounded-2xl border border-slate-300 p-5 sm:p-7 shadow-sm space-y-6">
        
        {/* Title */}
        <div className="border-b border-slate-200 pb-3.5">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
            নতুন বিক্রয় / জমা ইনভয়েস
          </h2>
        </div>

        <form onSubmit={handleSaveInvoice} className="space-y-5">
          
          {/* Row 1: তারিখ ও মেমো নম্বর */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                তারিখ
              </label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    memoNoInputRef.current?.focus();
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                মেমো নম্বর <span className="text-rose-600 font-semibold">* (বাধ্যতামূলক)</span>
              </label>
              <input
                ref={memoNoInputRef}
                type="text"
                required
                placeholder="মেমো নম্বর"
                value={memoNo}
                onChange={(e) => setMemoNo(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    customerInputRef.current?.focus();
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm font-mono"
              />
            </div>
          </div>

          {/* Row 2: কাস্টমারের নাম ও পূর্বের বাকি */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="relative" ref={customerDropdownRef}>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                কাস্টমারের নাম
              </label>
              <div className="relative">
                <input
                  ref={customerInputRef}
                  type="text"
                  placeholder="কাস্টমারের নাম বা ফোন লিখুন..."
                  value={customerInput}
                  onChange={(e) => handleCustomerInputChange(e.target.value)}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setShowCustomerDropdown(false);
                      totalSaleRef.current?.focus();
                    }
                  }}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Customer Autocomplete Dropdown */}
              {showCustomerDropdown && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-slate-100">
                  <div 
                    onClick={() => {
                      setSelectedCustomer(null);
                      setCustomerInput('সাধারণ ক্যাশ কাস্টমার');
                      setShowCustomerDropdown(false);
                    }}
                    className="p-2.5 hover:bg-indigo-50 cursor-pointer text-xs font-bold text-indigo-700 flex items-center justify-between"
                  >
                    <span>-- সাধারণ ক্যাশ কাস্টমার --</span>
                    <span className="text-[10px] text-slate-400 font-normal">কোনো পূর্বের বাকি নেই</span>
                  </div>

                  {filteredCustomers.length > 0 ? (
                    filteredCustomers.map(c => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className="p-2.5 hover:bg-slate-50 cursor-pointer text-xs flex items-center justify-between transition"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{c.name}</p>
                          <p className="text-[11px] text-slate-500">{c.phone || 'ফোন নেই'} {c.address ? `• ${c.address}` : ''}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">পূর্বের বাকি</span>
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
                        + নতুন কাস্টমার হিসেবে যুক্ত হবে: <strong className="text-indigo-700">{customerInput}</strong>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                পূর্বের বাকি
              </label>
              <input
                type="text" inputMode="numeric"
                readOnly
                value={previousDue}
                className="w-full bg-white border border-red-500 rounded-lg px-3.5 py-2 text-sm font-bold text-red-600 shadow-sm select-none"
              />
            </div>
          </div>

          {/* Row 3: মোট বিক্রির টাকা ও লেস / ডিসকাউন্ট (টাকা) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                মোট বিক্রির টাকা
              </label>
              <input
                ref={totalSaleRef}
                type="text" inputMode="numeric"
                min="0"
                placeholder="0"
                value={totalSaleAmount || ''}
                onChange={(e) => setTotalSaleAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    discountRef.current?.focus();
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-pink-600 block mb-1.5">
                লেস / ডিসকাউন্ট (টাকা)
              </label>
              <input
                ref={discountRef}
                type="text" inputMode="numeric"
                min="0"
                placeholder="0"
                value={discount || ''}
                onChange={(e) => setDiscount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    cashPaidRef.current?.focus();
                  }
                }}
                className="w-full bg-white border border-pink-500 rounded-lg px-3.5 py-2 text-sm font-semibold text-pink-600 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 shadow-sm"
              />
            </div>
          </div>

          {/* Row 4: ডিসকাউন্ট বাদে নীট বিক্রি */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                ডিসকাউন্ট বাদে নীট বিক্রি
              </label>
              <input
                type="text" inputMode="numeric"
                readOnly
                value={netSale}
                className="w-full bg-indigo-50/20 border border-indigo-400 rounded-lg px-3.5 py-2 text-sm font-bold text-indigo-900 shadow-sm select-none"
              />
            </div>
            <div>{/* Empty column matching layout */}</div>
          </div>

          {/* Row 5: Payment Container (নগদ জমা, পেমেন্ট মাধ্যম, পেমেন্টের টাকা) */}
          <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 sm:p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div>
              <label className="text-xs font-bold text-[#15803d] block mb-1.5">
                নগদ জমা
              </label>
              <input
                ref={cashPaidRef}
                type="text" inputMode="numeric"
                min="0"
                placeholder="0"
                value={cashPaid || ''}
                onChange={(e) => setCashPaid(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    onlinePaidRef.current?.focus();
                  }
                }}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-bold text-[#15803d] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                পেমেন্ট মাধ্যম
              </label>
              <select
                value={onlineMethod}
                onChange={(e: any) => setOnlineMethod(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              >
                <option value="bkash">বিকাশ (bKash)</option>
                <option value="nagad">নগদ (Nagad)</option>
                <option value="rocket">রকেট (Rocket)</option>
                <option value="bank">ব্যাংক (Bank)</option>
                <option value="cheque">চেক (Cheque)</option>
                <option value="goods">মাল বাবদ পেমেন্ট (Goods)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-[#4338ca] block mb-1.5">
                পেমেন্টের টাকা
              </label>
              <input
                ref={onlinePaidRef}
                type="text" inputMode="numeric"
                min="0"
                placeholder="0"
                value={onlinePaid || ''}
                onChange={(e) => setOnlinePaid(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitButtonRef.current?.focus();
                  }
                }}
                className="w-full bg-white border border-indigo-300 rounded-lg px-3.5 py-2 text-sm font-bold text-[#4338ca] placeholder:text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
            </div>
          </div>

          {/* Row 6: মোট জমা ও মোট বাকি */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="text-xs font-bold text-[#15803d] block mb-1.5">
                মোট জমা
              </label>
              <input
                type="text" inputMode="numeric"
                readOnly
                value={totalPaid}
                className="w-full bg-white border border-emerald-500 rounded-lg px-3.5 py-2 text-sm font-bold text-emerald-700 shadow-sm select-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-[#b45309] block mb-1.5">মোট বাকি (পূর্বের + আজকের)</label>
              <input
                type="text" inputMode="numeric"
                readOnly
                value={overallDue}
                className="w-full bg-white border border-amber-500 rounded-lg px-3.5 py-2 text-sm font-bold text-amber-700 shadow-sm select-none"
              />
            </div>
          </div>

          {/* Row 7: ক্লাউডে ইনভয়েস সেভ করুন Button */}
          <div className="pt-2">
            <button
              ref={submitButtonRef}
              type="submit"
              className="w-full bg-[#4338ca] hover:bg-[#3730a3] text-white py-3 sm:py-3.5 rounded-lg text-sm sm:text-base font-bold shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
            >
              <Save className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>ক্লাউডে ইনভয়েস সেভ করুন</span>
            </button>
          </div>

        </form>

      </div>

    </div>
  );
};
