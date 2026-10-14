import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Printer, Download, Eye, Trash2, Edit, X, CheckCircle } from 'lucide-react';
import { toBengaliNumber, toEnglishNumber, normalizeDate, isSameDate, formatDate, isDateInRange } from '../utils/formatters';
import { Invoice, DuePaymentRecord } from '../types';

export const DateSalesView: React.FC = () => {
  const { 
    selectedDate, 
    setSelectedDate, 
    invoices, 
    duePayments,
    setInvoiceToPrint,
    setDuePaymentToPrint,
    moveToRecycleBin,
    setInvoices,
    setDuePayments,
    customers,
    setCustomers
  } = useApp();

  const [startDateInput, setStartDateInput] = useState<string>(normalizeDate(selectedDate) || new Date().toISOString().split('T')[0]);
  const [endDateInput, setEndDateInput] = useState<string>(normalizeDate(selectedDate) || new Date().toISOString().split('T')[0]);
  const [activeQueryStartDate, setActiveQueryStartDate] = useState<string>(normalizeDate(selectedDate) || new Date().toISOString().split('T')[0]);
  const [activeQueryEndDate, setActiveQueryEndDate] = useState<string>(normalizeDate(selectedDate) || new Date().toISOString().split('T')[0]);

  // Edit Customer Info (for both Invoice & Due Payment)
  const [editCustomerName, setEditCustomerName] = useState<string>('');
  const [editCustomerPhone, setEditCustomerPhone] = useState<string>('');
  const [editCustomerAddress, setEditCustomerAddress] = useState<string>('');
  const [editCustomerOpeningDue, setEditCustomerOpeningDue] = useState<string>('');

  // Edit Invoice States
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [editDate, setEditDate] = useState<string>('');
  const [editInvoiceNo, setEditInvoiceNo] = useState<string>('');
  const [editSalesAmount, setEditSalesAmount] = useState<string>("");
  const [editDiscount, setEditDiscount] = useState<string>("");
  const [editCashPaid, setEditCashPaid] = useState<string>("");
  const [editOnlinePaid, setEditOnlinePaid] = useState<string>("");

  // Edit Due Collection States
  const [editingDuePayment, setEditingDuePayment] = useState<DuePaymentRecord | null>(null);
  const [editDueAmount, setEditDueAmount] = useState<string>("");
  const [editDueOnlineMethod, setEditDueOnlineMethod] = useState<'bkash' | 'nagad' | 'rocket' | 'bank' | 'cheque' | 'goods'>('bkash');

  const handleOpenEditInvoice = (inv: Invoice) => {
    setEditingInvoice(inv);
    const customer = customers.find(c => c.id === inv.customerId);
    setEditCustomerName(inv.customerName || customer?.name || '');
    setEditCustomerPhone(inv.customerPhone || customer?.phone || '');
    setEditCustomerAddress(inv.customerAddress || customer?.address || '');
    setEditCustomerOpeningDue(String(customer?.openingDue || 0));
    setEditDate(inv.date || '');
    setEditInvoiceNo(inv.invoiceNo || '');
    setEditSalesAmount(String(inv.subtotal || ""));
    setEditDiscount(String(inv.discount || ""));
    setEditCashPaid(String(inv.cashPaid || ""));
    setEditOnlinePaid(String(inv.onlinePaid || ""));
  };

  const handleOpenEditDuePayment = (dp: DuePaymentRecord) => {
    setEditingDuePayment(dp);
    const customer = customers.find(c => c.id === dp.customerId);
    setEditCustomerName(dp.customerName || customer?.name || '');
    setEditCustomerPhone(dp.customerPhone || customer?.phone || '');
    setEditCustomerAddress(customer?.address || '');
    setEditCustomerOpeningDue(String(customer?.openingDue || 0));
    setEditCashPaid(String(dp.cashPaid ?? (dp.paymentMethod === 'cash' ? dp.amount : "")));
    setEditOnlinePaid(String(dp.onlinePaid ?? (dp.paymentMethod !== 'cash' ? dp.amount : "")));
    setEditDiscount(String(dp.discount || ""));
    setEditDueOnlineMethod(dp.onlineMethod || 'bkash');
    setEditDate(dp.date || '');
    setEditInvoiceNo(dp.receiptNo || '');
  };

  const handleSaveInvoiceEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingInvoice) return;

    const newGrandTotal = toEnglishNumber(editSalesAmount.toString()) + (editingInvoice.laborOrTransportCost || 0) - toEnglishNumber(editDiscount.toString());
    const newDueAmount = newGrandTotal - toEnglishNumber(editCashPaid.toString()) - toEnglishNumber(editOnlinePaid.toString());

    const diffPurchased = newGrandTotal - editingInvoice.grandTotal;
    const diffPaid = (toEnglishNumber(editCashPaid.toString()) + toEnglishNumber(editOnlinePaid.toString())) - (editingInvoice.cashPaid + editingInvoice.onlinePaid);
    const diffDue = newDueAmount - editingInvoice.dueAmount;

    // Update invoices
    const updatedInvoices = invoices.map(inv => {
      if (inv.id === editingInvoice.id) {
        return {
          ...inv,
          customerName: editCustomerName.trim() || inv.customerName,
          customerPhone: editCustomerPhone.trim() || inv.customerPhone,
          customerAddress: editCustomerAddress.trim() || inv.customerAddress,
          date: editDate,
          invoiceNo: editInvoiceNo,
          subtotal: toEnglishNumber(editSalesAmount.toString()),
          discount: toEnglishNumber(editDiscount.toString()),
          cashPaid: toEnglishNumber(editCashPaid.toString()),
          onlinePaid: toEnglishNumber(editOnlinePaid.toString()),
          grandTotal: newGrandTotal,
          dueAmount: newDueAmount,
          status: newDueAmount <= 0 ? 'paid' : (toEnglishNumber(editCashPaid.toString()) + toEnglishNumber(editOnlinePaid.toString()) > 0 ? 'partial' : 'due')
        };
      }
      return inv;
    });
    setInvoices(updatedInvoices as any); // using as any in case status string unions mismatch slightly

    // Update Customer
    const updatedCustomers = customers.map(c => {
      if (c.id === editingInvoice.customerId) {
        const diffOpeningDue = toEnglishNumber(editCustomerOpeningDue.toString()) - (c.openingDue || 0);
        return {
          ...c,
          name: editCustomerName.trim() || c.name,
          phone: editCustomerPhone.trim() || c.phone,
          address: editCustomerAddress.trim() || c.address,
          openingDue: toEnglishNumber(editCustomerOpeningDue.toString()),
          totalPurchased: (c.totalPurchased || 0) + diffPurchased,
          totalPaid: (c.totalPaid || 0) + diffPaid,
          currentDue: (c.currentDue || 0) + diffDue + diffOpeningDue
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);

    setEditingInvoice(null);
  };

  const handleSaveDuePaymentEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDuePayment) return;

    const cashPaid = toEnglishNumber(editCashPaid.toString());
    const onlinePaid = toEnglishNumber(editOnlinePaid.toString());
    const discount = toEnglishNumber(editDiscount.toString());
    const newAmount = cashPaid + onlinePaid;

    const diffPaid = newAmount - editingDuePayment.amount;
    const diffDiscount = discount - (editingDuePayment.discount || 0);

    // Update Due Payments
    const updatedDuePayments = duePayments.map(dp => {
      if (dp.id === editingDuePayment.id) {
        return {
          ...dp,
          customerName: editCustomerName.trim() || dp.customerName,
          customerPhone: editCustomerPhone.trim() || dp.customerPhone,
          amount: newAmount,
          cashPaid,
          onlinePaid,
          discount,
          paymentMethod: onlinePaid > 0 && cashPaid === 0 ? 'online' : (cashPaid > 0 && onlinePaid === 0 ? 'cash' : dp.paymentMethod),
          onlineMethod: editDueOnlineMethod,
          remainingDue: dp.previousDue - newAmount - discount,
          date: editDate,
          receiptNo: editInvoiceNo
        };
      }
      return dp;
    });
    setDuePayments(updatedDuePayments as any);

    // Update Customer
    const updatedCustomers = customers.map(c => {
      if (c.id === editingDuePayment.customerId) {
        const diffOpeningDue = toEnglishNumber(editCustomerOpeningDue.toString()) - (c.openingDue || 0);
        return {
          ...c,
          name: editCustomerName.trim() || c.name,
          phone: editCustomerPhone.trim() || c.phone,
          address: editCustomerAddress.trim() || c.address,
          openingDue: toEnglishNumber(editCustomerOpeningDue.toString()),
          totalPaid: (c.totalPaid || 0) + diffPaid,
          currentDue: (c.currentDue || 0) - diffPaid - diffDiscount + diffOpeningDue
        };
      }
      return c;
    });
    setCustomers(updatedCustomers);

    setEditingDuePayment(null);
  };

  // Sync with global selectedDate
  useEffect(() => {
    if (selectedDate) {
      const norm = normalizeDate(selectedDate);
      setStartDateInput(norm);
      setEndDateInput(norm);
      setActiveQueryStartDate(norm);
      setActiveQueryEndDate(norm);
    }
  }, [selectedDate]);

  // Handle "হিসাব দেখুন" button click
  const handleQueryDate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const sNorm = normalizeDate(startDateInput);
    const eNorm = normalizeDate(endDateInput);
    setActiveQueryStartDate(sNorm);
    setActiveQueryEndDate(eNorm);
    setSelectedDate(sNorm);
  };

  // Filter invoices for active queried date range
  const filteredInvoices = invoices.filter(inv => isDateInRange(inv.date, activeQueryStartDate, activeQueryEndDate));

  // Filter due collections for active queried date range
  const filteredDuePayments = duePayments.filter(dp => isDateInRange(dp.date, activeQueryStartDate, activeQueryEndDate));

  // Combine rows: invoice sales + separate due collections if any
  interface CombinedRow {
    id: string;
    type: 'sale' | 'due_collection';
    memo: string;
    customer: string;
    sale: number;
    discount: number;
    cash: number;
    other: number;
    due: number;
    originalData: any;
  }

  const tableRows: CombinedRow[] = [
    ...filteredInvoices.map(inv => ({
      id: inv.id,
      type: 'sale' as const,
      memo: inv.invoiceNo,
      customer: inv.customerName,
      sale: (inv.subtotal || inv.grandTotal || 0),
      discount: inv.discount || 0,
      cash: inv.cashPaid || 0,
      other: inv.onlinePaid || 0,
      due: inv.dueAmount || 0,
      originalData: inv
    })),
    ...filteredDuePayments.map(dp => ({
      id: dp.id,
      type: 'due_collection' as const,
      memo: dp.receiptNo || 'রশিদ',
      customer: dp.customerName + ' (বাকি আদায়)',
      sale: 0,
      discount: 0,
      cash: dp.cashPaid ?? (dp.paymentMethod === 'cash' ? dp.amount : 0),
      other: dp.onlinePaid ?? (dp.paymentMethod !== 'cash' ? dp.amount : 0),
      due: 0,
      originalData: dp
    }))
  ].sort((a, b) => {
    const numA = toEnglishNumber(a.memo) || 0;
    const numB = toEnglishNumber(b.memo) || 0;
    return numA - numB;
  });

  // Calculations for total summary
  const totalSale = tableRows.reduce((sum, r) => sum + r.sale, 0);
  const totalDiscount = tableRows.reduce((sum, r) => sum + r.discount, 0);
  const totalCash = tableRows.reduce((sum, r) => sum + r.cash, 0);
  const totalOther = tableRows.reduce((sum, r) => sum + r.other, 0);
  const totalDue = tableRows.reduce((sum, r) => sum + r.due, 0);

  const handleDeleteItem = (row: CombinedRow) => {
    if (row.type === 'sale') {
      if (window.confirm(`আপনি কি নিশ্চিত মেমো #${row.memo} রিসাইকেল বিনে পাঠাতে চান?`)) {
        // Find the customer to revert their purchase and due balance
        const customer = customers.find(c => c.id === row.originalData.customerId);
        if (customer) {
          const revertPurchased = row.originalData.grandTotal;
          const revertPaid = row.originalData.cashPaid + row.originalData.onlinePaid;
          const revertDue = revertPurchased - revertPaid;
          const updatedCustomer = {
            ...customer,
            totalPurchased: (customer.totalPurchased || 0) - revertPurchased,
            totalPaid: (customer.totalPaid || 0) - revertPaid,
            currentDue: (customer.currentDue || 0) - revertDue,
            updatedAt: new Date().toISOString(),
          };
          setCustomers(prev => prev.map(c => c.id === customer.id ? updatedCustomer : c));
        }
        
        moveToRecycleBin('invoice', `ইনভয়েস #${row.memo} (${row.customer})`, row.originalData, row.originalData.grandTotal);
        setInvoices(prev => prev.filter(i => i.id !== row.id));
      }
    } else if (row.type === 'due_collection') {
      if (window.confirm(`আপনি কি নিশ্চিত এই আদায়টি মুছতে চান?`)) {
        // Find the customer to revert their paid amount and due balance
        const customer = customers.find(c => c.id === row.originalData.customerId);
        if (customer) {
          const updatedCustomer = {
            ...customer,
            totalPaid: (customer.totalPaid || 0) - (row.originalData.amount || 0),
            currentDue: (customer.currentDue || 0) + (row.originalData.amount || 0),
            updatedAt: new Date().toISOString(),
          };
          setCustomers(prev => prev.map(c => c.id === customer.id ? updatedCustomer : c));
        }
        
        moveToRecycleBin('due_payment', `বাকি আদায় (${row.customer})`, row.originalData, row.originalData.amount);
        setDuePayments(prev => prev.filter(p => p.id !== row.id));
      }
    }
  };

  // Print summary or table
  const handlePrint = () => {
    window.print();
  };

  // Export as CSV/PDF
  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6">
      
      {/* Main Container Card */}
      <div className="bg-white rounded-2xl border border-slate-300 p-5 sm:p-7 shadow-sm space-y-5">
        
        {/* Top Header: Title & Action Buttons (প্রিন্ট ও পিডিএফ ডাউনলোড) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>তারিখ অনুযায়ী ইনভয়েস ও আদায়</span>
            <span className="bg-indigo-100 text-indigo-700 text-sm px-2.5 py-0.5 rounded-full border border-indigo-200">
              {toBengaliNumber(tableRows.length)} টি এন্ট্রি
            </span>
          </h2>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-[#4338ca] hover:bg-[#3730a3] text-white px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="bg-[#059669] hover:bg-[#047857] text-white px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>পিডিএফ ডাউনলোড</span>
            </button>
          </div>
        </div>

        {/* Filter and Mini Summary Box */}
        <div className="border border-slate-300 rounded-xl p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white shadow-xs">
          
          {/* Left: Date selector & হিসাব দেখুন button */}
          <form onSubmit={handleQueryDate} className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-slate-700 whitespace-nowrap">
                শুরু:
              </label>
              <input
                type="date"
                value={startDateInput}
                onChange={(e) => setStartDateInput(e.target.value)}
                className="bg-white border border-indigo-400 rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm w-[130px] sm:w-[140px]"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-slate-700 whitespace-nowrap">
                শেষ:
              </label>
              <input
                type="date"
                value={endDateInput}
                onChange={(e) => setEndDateInput(e.target.value)}
                className="bg-white border border-indigo-400 rounded-lg px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm w-[130px] sm:w-[140px]"
              />
            </div>

            <button
              type="submit"
              className="bg-[#4338ca] hover:bg-[#3730a3] text-white px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold shadow-sm transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              খুঁজুন
            </button>
          </form>

          {/* Right: Inline stats banner */}
          <div className="bg-[#f8fafc] border border-slate-200 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold flex flex-wrap items-center gap-2 sm:gap-4 text-slate-700">
            <span>
              মোট বিক্রি: <strong className="text-indigo-700">{toBengaliNumber(totalSale)} ৳</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              নগদ: <strong className="text-emerald-600">{toBengaliNumber(totalCash)} ৳</strong>
            </span>
            <span className="text-slate-300">|</span>
            <span>
              বাকি: <strong className="text-amber-600">{toBengaliNumber(totalDue)} ৳</strong>
            </span>
          </div>
        </div>

        {/* Table View matching screenshot */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-300">
                <th className="py-3 px-3">মেমো</th>
                <th className="py-3 px-3">কাস্টমার</th>
                <th className="py-3 px-3 text-center">বিক্রি</th>
                <th className="py-3 px-3 text-center">ডিসকাউন্ট</th>
                <th className="py-3 px-3 text-center">নগদ</th>
                <th className="py-3 px-3 text-center">অন্যান্য মাধ্যম</th>
                <th className="py-3 px-3 text-center">বাকি</th>
                <th className="py-3 px-3 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    নির্বাচিত তারিখে কোনো লেনদেন নেই
                  </td>
                </tr>
              ) : (
                tableRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition text-slate-800">
                    <td className="py-3 px-3 font-semibold text-indigo-700">
                      {row.memo}
                      {row.type === 'due_collection' && (row.originalData as any).billDate && (
                        <div className="text-[10px] text-slate-500 font-normal mt-0.5">বিল: {formatDate((row.originalData as any).billDate)}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 font-medium">
                      {row.customer}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900">
                      {toBengaliNumber(row.sale)} ৳
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-pink-600">
                      {toBengaliNumber(row.discount)} ৳
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-emerald-600">
                      {toBengaliNumber(row.cash)} ৳
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-indigo-600">
                      {toBengaliNumber(row.other)} ৳
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-amber-600">
                      {toBengaliNumber(row.due)} ৳
                    </td>
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {row.type === 'sale' && (
                          <>
                            <button
                              onClick={() => setInvoiceToPrint(row.originalData)}
                              title="মেমো দেখুন (ইনভয়েস প্রিভিউ)"
                              className="flex items-center gap-1 px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200 rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-600" />
                              <span>মেমো দেখুন</span>
                            </button>
                            <button
                              onClick={() => setInvoiceToPrint(row.originalData)}
                              title="মেমো প্রিন্ট করুন"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded-md transition cursor-pointer active:scale-95 shrink-0"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditInvoice(row.originalData)}
                              title="এডিট করুন"
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-md transition cursor-pointer active:scale-95 shrink-0"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(row)}
                              title="ডিলিট করুন"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-md transition cursor-pointer active:scale-95 shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {row.type === 'due_collection' && (
                          <>
                            <button
                              onClick={() => setDuePaymentToPrint(row.originalData)}
                              title="রশিদ দেখুন (মানি রিসিট প্রিভিউ)"
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-900 border border-blue-200 rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-600" />
                              <span>রশিদ দেখুন</span>
                            </button>
                            <button
                              onClick={() => setDuePaymentToPrint(row.originalData)}
                              title="রশিদ প্রিন্ট করুন"
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-200 rounded-md transition cursor-pointer active:scale-95 shrink-0"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenEditDuePayment(row.originalData)}
                              title="এডিট করুন"
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 rounded-md transition cursor-pointer active:scale-95 shrink-0"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteItem(row)}
                              title="ডিলিট করুন"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-md transition cursor-pointer active:scale-95 shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            
            {/* Footer Summary Row (সর্বমোট যোগফল) */}
            <tfoot>
              <tr className="bg-slate-50/80 font-bold border-t-2 border-slate-300 text-slate-800">
                <td colSpan={2} className="py-3.5 px-3 text-left">
                  সর্বমোট যোগফল:
                </td>
                <td className="py-3.5 px-3 text-center text-slate-900">
                  {toBengaliNumber(totalSale)} ৳
                </td>
                <td className="py-3.5 px-3 text-center text-pink-600">
                  {toBengaliNumber(totalDiscount)} ৳
                </td>
                <td className="py-3.5 px-3 text-center text-emerald-600">
                  {toBengaliNumber(totalCash)} ৳
                </td>
                <td className="py-3.5 px-3 text-center text-indigo-600">
                  {toBengaliNumber(totalOther)} ৳
                </td>
                <td className="py-3.5 px-3 text-center text-amber-600">
                  {toBengaliNumber(totalDue)} ৳
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>

      </div>

      {/* Invoice Edit Modal */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">ইনভয়েস তথ্য সংশোধন করুন ({editingInvoice.invoiceNo})</h3>
              <button onClick={() => setEditingInvoice(null)} className="text-slate-400 hover:text-rose-500 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveInvoiceEdit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 border-b pb-4 mb-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">কাস্টমার তথ্য সংশোধন (ঐচ্ছিক)</h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">নাম</label>
                      <input 
                        type="text" value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল</label>
                      <input 
                        type="text" value={editCustomerPhone} onChange={(e) => setEditCustomerPhone(e.target.value)} 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">ঠিকানা</label>
                      <input 
                        type="text" value={editCustomerAddress} onChange={(e) => setEditCustomerAddress(e.target.value)} 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">পূর্বের বাকি</label>
                      <input 
                        type="text" inputMode="numeric" value={editCustomerOpeningDue} onChange={(e) => setEditCustomerOpeningDue(e.target.value)} 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">তারিখ</label>
                  <input 
                    type="date" 
                    value={editDate} 
                    onChange={(e) => setEditDate(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">মেমো নাম্বার</label>
                  <input 
                    type="text" 
                    value={editInvoiceNo} 
                    onChange={(e) => setEditInvoiceNo(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">বিক্রির টাকা</label>
                  <input 
                    type="text" inputMode="numeric" 
                    value={editSalesAmount || ''} 
                    onChange={(e) => setEditSalesAmount(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">ডিসকাউন্ট(লেছ)</label>
                  <input 
                    type="text" inputMode="numeric" 
                    value={editDiscount || ''} 
                    onChange={(e) => setEditDiscount(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">নগদ জমা</label>
                  <input 
                    type="text" inputMode="numeric" 
                    value={editCashPaid || ''} 
                    onChange={(e) => setEditCashPaid(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">অনলাইন/ অন্যান্য জমা</label>
                  <input 
                    type="text" inputMode="numeric" 
                    value={editOnlinePaid || ''} 
                    onChange={(e) => setEditOnlinePaid(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm mt-4">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">নতুন মোট বিল:</span>
                  <span className="font-bold text-slate-800">{toBengaliNumber(toEnglishNumber(editSalesAmount.toString()) + (editingInvoice.laborOrTransportCost || 0) - toEnglishNumber(editDiscount.toString()))} ৳</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">নতুন বাকি:</span>
                  <span className="font-bold text-amber-600">{toBengaliNumber(toEnglishNumber(editSalesAmount.toString()) + (editingInvoice.laborOrTransportCost || 0) - toEnglishNumber(editDiscount.toString()) - toEnglishNumber(editCashPaid.toString()) - toEnglishNumber(editOnlinePaid.toString()))} ৳</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setEditingInvoice(null)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition">
                  বাতিল
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>সেভ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Due Payment Edit Modal */}
      {editingDuePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800">বাকি আদায় এডিট ({editingDuePayment.receiptNo})</h3>
              <button onClick={() => setEditingDuePayment(null)} className="text-slate-400 hover:text-rose-500 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSaveDuePaymentEdit} className="p-4 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 border-b pb-4 mb-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">কাস্টমার তথ্য সংশোধন (ঐচ্ছিক)</h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">নাম</label>
                      <input 
                        type="text" value={editCustomerName} onChange={(e) => setEditCustomerName(e.target.value)} 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল</label>
                      <input 
                        type="text" value={editCustomerPhone} onChange={(e) => setEditCustomerPhone(e.target.value)} 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">ঠিকানা</label>
                      <input 
                        type="text" value={editCustomerAddress} onChange={(e) => setEditCustomerAddress(e.target.value)} 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">পূর্বের বাকি</label>
                      <input 
                        type="text" inputMode="numeric" value={editCustomerOpeningDue} onChange={(e) => setEditCustomerOpeningDue(e.target.value)} 
                        className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">তারিখ</label>
                  <input 
                    type="date" 
                    value={editDate} 
                    onChange={(e) => setEditDate(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">রশিদ নাম্বার</label>
                  <input 
                    type="text" 
                    value={editInvoiceNo} 
                    onChange={(e) => setEditInvoiceNo(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">লেস / ডিসকাউন্ট</label>
                  <input 
                    type="text" inputMode="numeric" 
                    value={editDiscount || ''} 
                    onChange={(e) => setEditDiscount(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">নগদ আদায়</label>
                  <input 
                    type="text" inputMode="numeric" 
                    value={editCashPaid || ''} 
                    onChange={(e) => setEditCashPaid(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">অন্যান্য মাধ্যম</label>
                  <select
                    value={editDueOnlineMethod}
                    onChange={(e: any) => setEditDueOnlineMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1">অন্যান্য মাধ্যমে টাকা</label>
                  <input 
                    type="text" inputMode="numeric" 
                    value={editOnlinePaid || ''} 
                    onChange={(e) => setEditOnlinePaid(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm mt-4">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">মোট আদায়:</span>
                  <span className="font-bold text-emerald-600">{toBengaliNumber(toEnglishNumber(editCashPaid.toString()) + toEnglishNumber(editOnlinePaid.toString()))} ৳</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">নতুন অবশিষ্ট বাকি:</span>
                  <span className="font-bold text-amber-600">{toBengaliNumber(editingDuePayment.previousDue - toEnglishNumber(editCashPaid.toString()) - toEnglishNumber(editOnlinePaid.toString()) - toEnglishNumber(editDiscount.toString()))} ৳</span>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setEditingDuePayment(null)} className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition">
                  বাতিল
                </button>
                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>সেভ করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
