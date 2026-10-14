import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Customer } from '../types';
import { Users, Search, Plus, History, Edit, Trash2, Printer, Download, X } from 'lucide-react';
import { toBengaliNumber, toEnglishNumber, formatDate } from '../utils/formatters';

export const CustomersView: React.FC = () => {
  const { customers, setCustomers, invoices, duePayments, moveToRecycleBin, selectedDate } = useApp();

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [viewCustomerHistory, setViewCustomerHistory] = useState<Customer | null>(null);

  // Statement date filters
  const defaultEndDate = selectedDate || new Date().toISOString().split('T')[0];
  const [statementStartDate, setStatementStartDate] = useState<string>('2026-07-25');
  const [statementEndDate, setStatementEndDate] = useState<string>(defaultEndDate);
  const [filterApplied, setFilterApplied] = useState<boolean>(false);

  // Form inputs
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [openingDue, setOpeningDue] = useState<string>("");
  const [notes, setNotes] = useState<string>('');

  // Form input refs for Enter key navigation
  const custNameRef = useRef<HTMLInputElement>(null);
  const custPhoneRef = useRef<HTMLInputElement>(null);
  const custAddressRef = useRef<HTMLInputElement>(null);
  const custOpeningDueRef = useRef<HTMLInputElement>(null);
  const custNotesRef = useRef<HTMLInputElement>(null);
  const custSubmitRef = useRef<HTMLButtonElement>(null);

  const [asOfDate, setAsOfDate] = useState<string>('');

  const mappedCustomers = useMemo(() => {
    const targetDateNum = asOfDate ? new Date(asOfDate).getTime() : Infinity;

    return customers.map(c => {
      let openingDue = Number(c.openingDue) || 0;
      const invs = invoices.filter(inv => inv.customerId === c.id && new Date(inv.date).getTime() <= targetDateNum);
      const purchases = invs.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
      const addedDue = invs.reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0);
      const paidInvoices = invs.reduce((sum, inv) => sum + Number(inv.cashPaid) + Number(inv.onlinePaid), 0);

      const pays = duePayments.filter(p => p.customerId === c.id && new Date(p.date).getTime() <= targetDateNum);
      const paidDue = pays.reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        ...c,
        openingDue,
        totalPurchased: purchases,
        totalPaid: paidInvoices + paidDue,
        currentDue: openingDue + addedDue - paidDue - pays.reduce((sum, p) => sum + Number(p.discount || 0), 0)
      };
    });
  }, [customers, invoices, duePayments, asOfDate]);

  const filteredCustomers = mappedCustomers.filter(c => 
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').includes(searchQuery) ||
    (c.address || '').toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    const aDue = a.currentDue || 0;
    const bDue = b.currentDue || 0;
    if (aDue > 0 && bDue <= 0) return -1;
    if (aDue <= 0 && bDue > 0) return 1;
    if (aDue > 0 && bDue > 0) return bDue - aDue;
    return (a.name || '').localeCompare(b.name || '');
  });

  const totalDueAllCustomers = mappedCustomers.reduce((sum, c) => sum + (c.currentDue || 0), 0);

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingCustomer) {
      setCustomers(prev => prev.map(c => {
        if (c.id === editingCustomer.id) {
          const diff = (toEnglishNumber(openingDue.toString()) || 0) - (editingCustomer.openingDue || 0);
          return {
            ...c,
            name: name.trim(),
            phone: phone.trim(),
            address: address.trim(),
            openingDue: toEnglishNumber(openingDue.toString()) || 0,
            currentDue: Math.max(0, (c.currentDue || 0) + diff),
            notes
          };
        }
        return c;
      }));
    } else {
      const newCust: Customer = {
        id: 'c_' + Date.now(),
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        openingDue: toEnglishNumber(openingDue.toString()) || 0,
        totalPurchased: 0,
        totalPaid: 0,
        currentDue: toEnglishNumber(openingDue.toString()) || 0,
        createdDate: new Date().toISOString().split('T')[0],
        notes
      };
      setCustomers(prev => [newCust, ...prev]);
    }

    setShowAddModal(false);
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setAddress('');
    setOpeningDue("");
    setNotes('');
  };

  const handleOpenEdit = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone);
    setAddress(cust.address);
    setOpeningDue(String(cust.openingDue || ""));
    setNotes(cust.notes || '');
    setShowAddModal(true);
  };

  const handleDelete = (cust: Customer) => {
    if (confirm(`আপনি কি কাস্টমার ${cust.name}-কে রিসাইকেল বিনে পাঠাতে চান?`)) {
      moveToRecycleBin('customer', `কাস্টমার: ${cust.name}`, cust, cust.currentDue);
      setCustomers(prev => prev.filter(c => c.id !== cust.id));
    }
  };

  // Build Ledger entries for selected customer
  const customerLedgerEntries = useMemo(() => {
    if (!viewCustomerHistory) return [];

    const custId = viewCustomerHistory.id;
    const custInvoices = invoices.filter(i => i.customerId === custId);
    const custDuePayments = duePayments.filter(p => p.customerId === custId);

    // Combine and sort by date ascending
    const combined: Array<{
      id: string;
      date: string;
      type: 'invoice' | 'due_payment';
      memo: string;
      sale: number;
      discount: number;
      cashPaid: number;
      otherPaid: number;
      rawDate: string;
      billDate?: string;
    }> = [];

    custInvoices.forEach(inv => {
      combined.push({
        id: inv.id,
        date: inv.date,
        type: 'invoice',
        memo: `মেমো: ${inv.invoiceNo}`,
        sale: inv.subtotal || inv.grandTotal || 0,
        discount: inv.discount || 0,
        cashPaid: inv.cashPaid || 0,
        otherPaid: inv.onlinePaid || 0,
        rawDate: inv.date
      });
    });

    custDuePayments.forEach(dp => {
      combined.push({
        id: dp.id,
        date: dp.date,
        type: 'due_payment',
        memo: `বাকি আদায়: ${dp.receiptNo || 'রশিদ'}`,
        sale: 0,
        discount: dp.discount || 0,
        cashPaid: dp.cashPaid ?? (dp.paymentMethod === 'cash' ? dp.amount : 0),
        otherPaid: dp.onlinePaid ?? (dp.paymentMethod !== 'cash' ? dp.amount : 0),
        rawDate: dp.date,
        billDate: dp.billDate
      });
    });

    combined.sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    // Calculate running balance
    let runningBalance = viewCustomerHistory.openingDue || 0;
    const computedRows = combined.map(item => {
      const netBill = item.type === 'invoice' ? Math.max(0, item.sale - item.discount) : 0;
      const totalPaid = item.cashPaid + item.otherPaid;
      const extraDiscount = item.type === 'due_payment' ? item.discount : 0;
      runningBalance = Math.max(0, runningBalance + netBill - totalPaid - extraDiscount);

      return {
        ...item,
        remainingDue: runningBalance
      };
    });

    // Apply date filter if set
    if (filterApplied && statementStartDate && statementEndDate) {
      return computedRows.filter(r => r.rawDate >= statementStartDate && r.rawDate <= statementEndDate);
    }

    return computedRows;
  }, [viewCustomerHistory, invoices, duePayments, filterApplied, statementStartDate, statementEndDate]);

  const handlePrintCustomersList = () => {
    const printWindow = window.open('', '_blank', 'width=950,height=750');
    if (!printWindow) {
      window.print();
      return;
    }

    const currentDate = new Date().toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
    const totalOpening = filteredCustomers.reduce((sum, c) => sum + (c.openingDue || 0), 0);
    const totalPurchased = filteredCustomers.reduce((sum, c) => sum + (c.totalPurchased || 0), 0);
    const totalPaid = filteredCustomers.reduce((sum, c) => sum + (c.totalPaid || 0), 0);
    const totalDue = filteredCustomers.reduce((sum, c) => sum + (c.currentDue || 0), 0);

    const html = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title>কাস্টমার লেজার ও বাকি তালিকা - এম এল ইলেকট্রিক</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 12mm; }
          body { font-family: 'SolaimanLipi', 'Kalpurush', 'Nikosh', 'Arial', sans-serif; margin: 0; padding: 15px; color: #1e293b; background: #fff; font-size: 12px; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 8px; margin-bottom: 12px; }
          .shop-name { font-size: 24px; font-weight: 900; color: #2563eb; margin: 0; }
          .shop-sub { font-size: 12px; color: #64748b; margin: 2px 0 0 0; }
          .doc-title { font-size: 15px; font-weight: bold; color: #0f172a; margin-top: 6px; text-decoration: underline; }
          .meta-bar { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 8px; color: #475569; background: #f8fafc; padding: 6px 10px; border-radius: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 6px; font-size: 11.5px; }
          th { background-color: #f1f5f9; color: #1e293b; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 5px 8px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .due-col { color: #dc2626; font-weight: bold; }
          .paid-col { color: #059669; font-weight: 600; }
          .total-row { background-color: #f1f5f9; font-weight: bold; border-top: 2px solid #475569; }
          .footer { margin-top: 35px; display: flex; justify-content: space-between; padding-top: 20px; }
          .sig-line { border-top: 1px dashed #94a3b8; width: 160px; text-align: center; font-size: 11px; color: #475569; padding-top: 4px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="shop-name">এম এল ইলেকট্রিক</h1>
          <p class="shop-sub">কুদরতআলি বাজার</p>
          <div class="doc-title">কাস্টমার লেজার ও বাকি তালিকা (Customer Management Report)</div>
        </div>
        <div class="meta-bar">
          <span>${asOfDate ? 'হিসাবের তারিখ: ' + formatDate(asOfDate) : 'প্রিন্টের তারিখ: ' + currentDate}</span>
          <span>মোট কাস্টমার: ${toBengaliNumber(filteredCustomers.length)} জন</span>
          <span>সর্বমোট বাকি: <strong style="color: #dc2626; font-size: 13px;">${toBengaliNumber(totalDue)} ৳</strong></span>
        </div>
        <table>
          <thead>
            <tr>
              <th class="text-center" style="width: 30px;">নং</th>
              <th>কাস্টমারের নাম</th>
              <th>মোবাইল নম্বর</th>
              <th>ঠিকানা</th>
              <th class="text-right">পূর্বের বাকি</th>
              <th class="text-right">মোট ক্রয়</th>
              <th class="text-right">মোট পরিশোধ</th>
              <th class="text-right">বর্তমান বাকি (Due)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredCustomers.length === 0 ? `
              <tr><td colspan="8" class="text-center" style="padding: 20px;">কোনো কাস্টমার তথ্য পাওয়া যায়নি</td></tr>
            ` : filteredCustomers.map((c, i) => `
              <tr>
                <td class="text-center">${toBengaliNumber(i + 1)}</td>
                <td><strong>${c.name}</strong></td>
                <td>${c.phone || '-'}</td>
                <td>${c.address || '-'}</td>
                <td class="text-right">${toBengaliNumber(c.openingDue || 0)} ৳</td>
                <td class="text-right">${toBengaliNumber(c.totalPurchased || 0)} ৳</td>
                <td class="text-right paid-col">${toBengaliNumber(c.totalPaid || 0)} ৳</td>
                <td class="text-right due-col">${toBengaliNumber(c.currentDue || 0)} ৳</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4" class="text-right"><strong>সর্বমোট হিসেব:</strong></td>
              <td class="text-right"><strong>${toBengaliNumber(totalOpening)} ৳</strong></td>
              <td class="text-right"><strong>${toBengaliNumber(totalPurchased)} ৳</strong></td>
              <td class="text-right paid-col"><strong>${toBengaliNumber(totalPaid)} ৳</strong></td>
              <td class="text-right due-col" style="font-size: 13px;"><strong>${toBengaliNumber(totalDue)} ৳</strong></td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          <div class="sig-line">হিসাব রক্ষকের স্বাক্ষর</div>
          <div class="sig-line">স্বত্বাধিকারী / ম্যানেজার</div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintStatement = () => {
    if (!viewCustomerHistory) return;

    const printWindow = window.open('', '_blank', 'width=950,height=750');
    if (!printWindow) {
      window.print();
      return;
    }

    const cust = viewCustomerHistory;
    const finalDue = customerLedgerEntries.length > 0 
      ? customerLedgerEntries[customerLedgerEntries.length - 1].remainingDue 
      : (cust.openingDue || 0);

    const totalSale = customerLedgerEntries.reduce((s, r) => s + (r.sale || 0), 0);
    const totalDiscount = customerLedgerEntries.reduce((s, r) => s + (r.discount || 0), 0);
    const totalCashPaid = customerLedgerEntries.reduce((s, r) => s + (r.cashPaid || 0), 0);
    const totalOtherPaid = customerLedgerEntries.reduce((s, r) => s + (r.otherPaid || 0), 0);

    const html = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title>${cust.name} - এর হিসাব স্টেটমেন্ট</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 12mm; }
          body { font-family: 'SolaimanLipi', 'Kalpurush', 'Nikosh', 'Arial', sans-serif; margin: 0; padding: 15px; color: #1e293b; background: #fff; font-size: 12px; }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 6px; margin-bottom: 12px; }
          .shop-name { font-size: 24px; font-weight: 900; color: #2563eb; margin: 0; }
          .shop-sub { font-size: 12px; color: #64748b; margin: 2px 0 0 0; }
          .doc-title { font-size: 16px; font-weight: bold; color: #0f172a; margin-top: 6px; }
          .cust-info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
          th { background-color: #f1f5f9; color: #1e293b; font-weight: bold; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          td { border: 1px solid #cbd5e1; padding: 5px 8px; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .due-col { color: #dc2626; font-weight: bold; }
          .paid-col { color: #059669; font-weight: bold; }
          .other-col { color: #4338ca; font-weight: bold; }
          .total-row { background-color: #f8fafc; font-weight: bold; border-top: 2px solid #475569; }
          .summary-card { margin-top: 15px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; width: 280px; margin-left: auto; background: #fafafa; }
          .summary-line { display: flex; justify-content: space-between; padding: 3px 0; font-size: 12px; }
          .footer { margin-top: 35px; display: flex; justify-content: space-between; padding-top: 20px; }
          .sig-line { border-top: 1px dashed #94a3b8; width: 160px; text-align: center; font-size: 11px; color: #475569; padding-top: 4px; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="shop-name">এম এল ইলেকট্রিক</h1>
          <p class="shop-sub">কুদরতআলি বাজার</p>
          <div class="doc-title">${cust.name} - এর হিসাব স্টেটমেন্ট</div>
        </div>

        <div class="cust-info-box">
          <div>
            <strong>কাস্টমার:</strong> ${cust.name}<br>
            <strong>মোবাইল:</strong> ${cust.phone || 'দেওয়া নেই'}<br>
            <strong>ঠিকানা:</strong> ${cust.address || 'দেওয়া নেই'}
          </div>
          <div style="text-align: right;">
            <strong>তারিখ পরিসীমা:</strong> ${statementStartDate} হতে ${statementEndDate}<br>
            <strong>বর্তমান মোট বাকি:</strong> <span style="color: #dc2626; font-weight: bold; font-size: 14px;">${toBengaliNumber(finalDue)} ৳</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 80px;">তারিখ</th>
              <th>বিবরণ / মেমো নং</th>
              <th class="text-center">বিক্রি / ক্রয়</th>
              <th class="text-center">ডিসকাউন্ট</th>
              <th class="text-center">নগদ জমা</th>
              <th class="text-center">অন্যান্য পেমেন্ট</th>
              <th class="text-right">বাকি ব্যালেন্স</th>
            </tr>
          </thead>
          <tbody>
            <tr style="background: #fafafa; font-weight: bold;">
              <td class="text-center text-slate-400">-</td>
              <td>ওপেনিং ব্যালেন্স / সাবেক বাকি</td>
              <td class="text-center">-</td>
              <td class="text-center">-</td>
              <td class="text-center">-</td>
              <td class="text-center">-</td>
              <td class="text-right due-col">${toBengaliNumber(cust.openingDue || 0)} ৳</td>
            </tr>
            ${customerLedgerEntries.map(row => `
              <tr>
                <td style="font-family: monospace;">${formatDate(row.date)}</td>
                <td><strong>${row.memo}</strong></td>
                <td class="text-center font-bold">${row.sale > 0 ? `${toBengaliNumber(row.sale)} ৳` : '-'}</td>
                <td class="text-center" style="color: #db2777;">${row.discount > 0 ? `${toBengaliNumber(row.discount)} ৳` : '-'}</td>
                <td class="text-center paid-col">${row.cashPaid > 0 ? `${toBengaliNumber(row.cashPaid)} ৳` : '-'}</td>
                <td class="text-center other-col">${row.otherPaid > 0 ? `${toBengaliNumber(row.otherPaid)} ৳` : '-'}</td>
                <td class="text-right due-col">${toBengaliNumber(row.remainingDue)} ৳</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2" class="text-right"><strong>মোট লেনদেন:</strong></td>
              <td class="text-center"><strong>${toBengaliNumber(totalSale)} ৳</strong></td>
              <td class="text-center" style="color: #db2777;"><strong>${toBengaliNumber(totalDiscount)} ৳</strong></td>
              <td class="text-center paid-col"><strong>${toBengaliNumber(totalCashPaid)} ৳</strong></td>
              <td class="text-center other-col"><strong>${toBengaliNumber(totalOtherPaid)} ৳</strong></td>
              <td class="text-right due-col" style="font-size: 13px;"><strong>${toBengaliNumber(finalDue)} ৳</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="summary-card">
          <div class="summary-line">
            <span>পূর্বের বাকি (Opening):</span>
            <span>${toBengaliNumber(cust.openingDue || 0)} ৳</span>
          </div>
          <div class="summary-line">
            <span>মোট ক্রয়:</span>
            <span>+ ${toBengaliNumber(totalSale - totalDiscount)} ৳</span>
          </div>
          <div class="summary-line">
            <span>মোট জমা (নগদ+অন্যান্য):</span>
            <span>- ${toBengaliNumber(totalCashPaid + totalOtherPaid)} ৳</span>
          </div>
          <div class="summary-line" style="border-top: 1px solid #cbd5e1; margin-top: 4px; padding-top: 4px; font-weight: bold; color: #dc2626;">
            <span>অবশিষ্ট মোট বাকি (Due):</span>
            <span style="font-size: 14px;">${toBengaliNumber(finalDue)} ৳</span>
          </div>
        </div>

        <div class="footer">
          <div class="sig-line">কাস্টমার স্বাক্ষর</div>
          <div class="sig-line">স্বত্বাধিকারী / ক্যাশিয়ার</div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>কাস্টমার লেজার ও বাকি তালিকা (Customer Management)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            সর্বমোট কাস্টমার বাকি: <span className="font-extrabold text-rose-600 text-sm">{toBengaliNumber(totalDueAllCustomers)} ৳</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200" title="এই তারিখ পর্যন্ত বাকি হিসাব দেখতে নির্বাচন করুন">
            <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">হিসাবের তারিখ:</span>
            <input
              type="date"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              className="bg-transparent text-xs text-slate-800 font-bold focus:outline-none cursor-pointer"
            />
            {asOfDate && (
              <button 
                onClick={() => setAsOfDate('')}
                className="text-slate-400 hover:text-rose-500 ml-1"
                title="ফিল্টার মুছুন"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="কাস্টমারের নাম / ফোন খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs w-full sm:w-52 focus:ring-2 focus:ring-indigo-500"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <button
            type="button"
            onClick={handlePrintCustomersList}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow transition active:scale-95 whitespace-nowrap cursor-pointer"
            title="কাস্টমার বাকি তালিকা প্রিন্ট করুন"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>প্রিন্ট তালিকা</span>
          </button>

          <button
            type="button"
            onClick={handlePrintCustomersList}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow transition active:scale-95 whitespace-nowrap cursor-pointer"
            title="কাস্টমার বাকি তালিকা পিডিএফ ডাউনলোড করুন"
          >
            <Download className="w-3.5 h-3.5" />
            <span>পিডিএফ</span>
          </button>

          <button
            onClick={() => {
              setEditingCustomer(null);
              setName('');
              setPhone('');
              setAddress('');
              setOpeningDue("");
              setNotes('');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow transition active:scale-95 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ নতুন কাস্টমার</span>
          </button>
        </div>
      </div>

      {/* Customer Cards & Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="p-3">নং</th>
                <th className="p-3">কাস্টমারের নাম</th>
                <th className="p-3">মোবাইল নম্বর</th>
                <th className="p-3">ঠিকানা</th>
                <th className="p-3 text-right">পূর্বের বাকি</th>
                <th className="p-3 text-right">মোট ক্রয়</th>
                <th className="p-3 text-right">মোট পরিশোধ</th>
                <th className="p-3 text-right">বর্তমান বাকি (Due)</th>
                <th className="p-3 text-center">একশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 text-xs">
                    কোনো কাস্টমার পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust, idx) => (
                  <tr key={cust.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-slate-400 font-medium">{toBengaliNumber(idx + 1)}</td>
                    <td className="p-3 font-bold text-slate-800">
                      <button 
                        onClick={() => setViewCustomerHistory(cust)}
                        className="hover:text-indigo-600 text-left"
                      >
                        {cust.name}
                      </button>
                    </td>
                    <td className="p-3 text-slate-600 font-mono">{cust.phone || '-'}</td>
                    <td className="p-3 text-slate-600">{cust.address || '-'}</td>
                    <td className="p-3 text-right text-slate-600">{toBengaliNumber(cust.openingDue || 0)} ৳</td>
                    <td className="p-3 text-right font-semibold text-slate-800">{toBengaliNumber(cust.totalPurchased || 0)} ৳</td>
                    <td className="p-3 text-right font-semibold text-emerald-700">{toBengaliNumber(cust.totalPaid || 0)} ৳</td>
                    <td className="p-3 text-right font-extrabold text-sm text-rose-600">
                      {toBengaliNumber(cust.currentDue || 0)} ৳
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setViewCustomerHistory(cust)}
                          title="লেনদেন স্টেটমেন্ট"
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(cust)}
                          title="এডিট করুন"
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(cust)}
                          title="মুছুন"
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl animate-in fade-in">
            <h3 className="text-base font-bold text-slate-800 border-b border-slate-100 pb-2">
              {editingCustomer ? 'কাস্টমার তথ্য সংশোধন' : 'নতুন কাস্টমার এন্ট্রি'}
            </h3>

            <form onSubmit={handleSaveCustomer} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">কাস্টমারের নাম *</label>
                <input
                  ref={custNameRef}
                  type="text"
                  required
                  placeholder="যেমন: জামাল উদ্দিন"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      custPhoneRef.current?.focus();
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">মোবাইল নম্বর</label>
                <input
                  ref={custPhoneRef}
                  type="text"
                  placeholder="017XXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      custAddressRef.current?.focus();
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">ঠিকানা / এলাকা</label>
                <input
                  ref={custAddressRef}
                  type="text"
                  placeholder="গ্রাম / রোড / বাজার"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      custOpeningDueRef.current?.focus();
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">পূর্বের বাকি (Opening Due) ৳</label>
                <input
                  ref={custOpeningDueRef}
                  type="text" inputMode="numeric"
                  min="0"
                  placeholder="0"
                  value={openingDue || ''}
                  onChange={(e) => setOpeningDue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      custNotesRef.current?.focus();
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">নোট / মন্তব্য</label>
                <input
                  ref={custNotesRef}
                  type="text"
                  placeholder="যেমন: নিয়মিত ইলেকট্রিশিয়ান..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      custSubmitRef.current?.focus();
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  ref={custSubmitRef}
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
                >
                  সেভ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Statement / History Modal Matching Screenshot Exactly */}
      {viewCustomerHistory && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-5xl w-full p-5 sm:p-7 space-y-5 shadow-2xl max-h-[95vh] overflow-y-auto border border-slate-200 animate-in fade-in">
            
            {/* Header: Shop Name & Subtitle & Customer Statement Title */}
            <div className="text-center space-y-1 border-b border-slate-200 pb-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2563eb]">
                এম এল ইলেকট্রিক
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                কুদরতআলি বাজার
              </p>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 pt-1">
                {viewCustomerHistory.name} - এর হিসাব স্টেটমেন্ট
              </h2>
            </div>

            {/* Filter & Actions Bar matching screenshot */}
            <div className="border border-slate-200 rounded-xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 bg-white shadow-xs">
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold text-slate-700">
                <div className="flex items-center gap-2">
                  <span>শুরুর তারিখ:</span>
                  <input
                    type="date"
                    value={statementStartDate}
                    onChange={(e) => setStatementStartDate(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span>শেষ তারিখ:</span>
                  <input
                    type="date"
                    value={statementEndDate}
                    onChange={(e) => setStatementEndDate(e.target.value)}
                    className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setFilterApplied(true)}
                  className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
                >
                  ফিল্টার
                </button>

                {filterApplied && (
                  <button
                    type="button"
                    onClick={() => setFilterApplied(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 underline"
                  >
                    সব দেখুন
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrintStatement}
                  className="bg-[#1e293b] hover:bg-[#0f172a] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintStatement}
                  className="bg-[#059669] hover:bg-[#047857] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>পিডিএফ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewCustomerHistory(null)}
                  className="bg-[#64748b] hover:bg-[#475569] text-white px-3.5 py-1.5 rounded-lg text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
                >
                  বন্ধ
                </button>
              </div>
            </div>

            {/* Statement Table Matching Screenshot */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-xs sm:text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <th className="py-3 px-3">তারিখ</th>
                    <th className="py-3 px-3">বিবরণ / মেমো</th>
                    <th className="py-3 px-3 text-center">ক্রয় / বিক্রি</th>
                    <th className="py-3 px-3 text-center">ডিসকাউন্ট</th>
                    <th className="py-3 px-3 text-center">নগদ পরিশোধ</th>
                    <th className="py-3 px-3 text-center">অন্যান্য পেমেন্ট (চেক/বিকাশ)</th>
                    <th className="py-3 px-3 text-right">বাকি</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  
                  {/* Row 1: ওপেনিং ব্যালেন্স / সাবেক বাকি */}
                  <tr className="bg-slate-50/50 font-medium">
                    <td className="py-3 px-3 text-slate-400">-</td>
                    <td className="py-3 px-3 font-bold text-slate-800">
                      ওপেনিং ব্যালেন্স / সাবেক বাকি
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400">-</td>
                    <td className="py-3 px-3 text-center text-slate-400">-</td>
                    <td className="py-3 px-3 text-center text-slate-400">-</td>
                    <td className="py-3 px-3 text-center text-slate-400">-</td>
                    <td className="py-3 px-3 text-right font-extrabold text-rose-600">
                      {toBengaliNumber(viewCustomerHistory.openingDue || 0)} ৳
                    </td>
                  </tr>

                  {/* Transaction Rows */}
                  {customerLedgerEntries.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        {filterApplied ? 'নির্বাচিত সময়ে কোনো লেনদেন পাওয়া যায়নি' : 'এই কাস্টমারের কোনো লেনদেন পাওয়া যায়নি'}
                      </td>
                    </tr>
                  ) : (
                    customerLedgerEntries.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50 transition text-slate-800">
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {toBengaliNumber(formatDate(row.date))}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-800">
                          {row.memo}
                          {row.billDate && (
                            <div className="text-[10px] text-slate-500 font-normal mt-0.5">বিল: {formatDate(row.billDate)}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-slate-800">
                          {row.sale > 0 ? `${toBengaliNumber(row.sale)} ৳` : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-semibold text-pink-600">
                          {row.discount > 0 ? `${toBengaliNumber(row.discount)} ৳` : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-emerald-600">
                          {row.cashPaid > 0 ? `${toBengaliNumber(row.cashPaid)} ৳` : '-'}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-indigo-600">
                          {row.otherPaid > 0 ? `${toBengaliNumber(row.otherPaid)} ৳` : '-'}
                        </td>
                        <td className="py-3 px-3 text-right font-extrabold text-rose-600">
                          {toBengaliNumber(row.remainingDue)} ৳
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

