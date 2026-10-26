import React, { useState, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Customer, Invoice, DuePaymentRecord } from '../types';
import { Users, Search, Plus, History, Edit, Trash2, Printer, Download, X, Eye, FileText, ArrowLeft, Scale } from 'lucide-react';
import { toBengaliNumber, toEnglishNumber, formatDate, numberToBengaliWords } from '../utils/formatters';

export const CustomersView: React.FC = () => {
  const { 
    customers, 
    setCustomers, 
    invoices, 
    duePayments, 
    moveToRecycleBin, 
    selectedDate, 
    setInvoiceToPrint, 
    setDuePaymentToPrint,
    deleteInvoice,
    canEditOrDelete,
    confirmAction
  } = useApp();

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
  const [discountPerKg, setDiscountPerKg] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Form input refs for Enter key navigation
  const custNameRef = useRef<HTMLInputElement>(null);
  const custPhoneRef = useRef<HTMLInputElement>(null);
  const custAddressRef = useRef<HTMLInputElement>(null);
  const custOpeningDueRef = useRef<HTMLInputElement>(null);
  const custDiscountPerKgRef = useRef<HTMLInputElement>(null);
  const custNotesRef = useRef<HTMLInputElement>(null);
  const custSubmitRef = useRef<HTMLButtonElement>(null);

  const [asOfDate, setAsOfDate] = useState<string>('');

  const mappedCustomers = useMemo(() => {
    const targetDateNum = asOfDate ? new Date(asOfDate).getTime() : Infinity;

    return customers.map(c => {
      let openingDue = Number(c.openingDue) || 0;
      const invs = invoices.filter(inv => ((inv.customerId && inv.customerId === c.id) || (inv.customerName && inv.customerName.trim().toLowerCase() === c.name.trim().toLowerCase())) && new Date(inv.date).getTime() <= targetDateNum);
      const purchases = invs.reduce((sum, inv) => sum + Number(inv.grandTotal), 0);
      const totalKg = invs.reduce((sum, inv) => sum + (inv.items?.reduce((s, it) => s + (Number(it.quantity) || 0), 0) || 0), 0);
      const addedDue = invs.reduce((sum, inv) => sum + Number(inv.dueAmount || 0), 0);
      const paidInvoices = invs.reduce((sum, inv) => sum + Number(inv.cashPaid) + Number(inv.onlinePaid), 0);

      const pays = duePayments.filter(p => ((p.customerId && p.customerId === c.id) || (p.customerName && p.customerName.trim().toLowerCase() === c.name.trim().toLowerCase())) && new Date(p.date).getTime() <= targetDateNum);
      const paidDue = pays.reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        ...c,
        openingDue,
        totalPurchased: purchases,
        totalKg: totalKg,
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

    const dPerKg = toEnglishNumber(discountPerKg.toString()) || 0;

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
            discountPerKg: dPerKg,
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
        discountPerKg: dPerKg,
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
    setDiscountPerKg('');
    setNotes('');
  };

  const handleOpenEdit = (cust: Customer) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো কাস্টমার এডিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    setEditingCustomer(cust);
    setName(cust.name);
    setPhone(cust.phone);
    setAddress(cust.address);
    setOpeningDue(String(cust.openingDue || ""));
    setDiscountPerKg(cust.discountPerKg !== undefined && cust.discountPerKg !== null ? String(cust.discountPerKg) : '');
    setNotes(cust.notes || '');
    setShowAddModal(true);
  };

  const handleDelete = (cust: Customer) => {
    if (!canEditOrDelete) {
      alert('ম্যানেজার একাউন্ট থেকে কোনো কাস্টমার ডিলিট করার অনুমতি নেই। শুধুমাত্র অ্যাডমিন এটি করতে পারবেন।');
      return;
    }
    confirmAction({
      title: 'কাস্টমার মুছে ফেলা',
      message: `আপনি কি কাস্টমার "${cust.name}"-কে রিসাইকেল বিনে পাঠাতে চান?`,
      confirmLabel: 'হ্যাঁ, মুছুন',
      onConfirm: () => {
        moveToRecycleBin('customer', `কাস্টমার: ${cust.name}`, cust, cust.currentDue);
        setCustomers(prev => prev.filter(c => c.id !== cust.id));
      }
    });
  };

  // Build Ledger entries for selected customer
  const customerLedgerEntries = useMemo(() => {
    if (!viewCustomerHistory) return [];

    const custId = viewCustomerHistory.id;
    const custName = (viewCustomerHistory.name || '').trim().toLowerCase();
    const custInvoices = invoices.filter(i => (i.customerId && i.customerId === custId) || (i.customerName && i.customerName.trim().toLowerCase() === custName));
    const custDuePayments = duePayments.filter(p => (p.customerId && p.customerId === custId) || (p.customerName && p.customerName.trim().toLowerCase() === custName));

    // Combine and sort by date ascending
    const combined: Array<{
      id: string;
      date: string;
      type: 'invoice' | 'due_payment';
      memo: string;
      totalKg: number;
      sale: number;
      discount: number;
      cashPaid: number;
      otherPaid: number;
      rawDate: string;
      billDate?: string;
      originalInvoice?: Invoice;
      originalDuePayment?: DuePaymentRecord;
    }> = [];

    custInvoices.forEach(inv => {
      const invKg = inv.items?.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0) || 0;
      combined.push({
        id: inv.id,
        date: inv.date,
        type: 'invoice',
        memo: `মেমো: ${inv.invoiceNo}`,
        totalKg: invKg,
        sale: inv.subtotal || inv.grandTotal || 0,
        discount: inv.discount || 0,
        cashPaid: inv.cashPaid || 0,
        otherPaid: inv.onlinePaid || 0,
        rawDate: inv.date,
        originalInvoice: inv
      });
    });

    custDuePayments.forEach(dp => {
      combined.push({
        id: dp.id,
        date: dp.date,
        type: 'due_payment',
        memo: `বাকি আদায়: ${dp.receiptNo || 'রশিদ'}`,
        totalKg: 0,
        sale: 0,
        discount: dp.discount || 0,
        cashPaid: dp.cashPaid ?? (dp.paymentMethod === 'cash' ? dp.amount : 0),
        otherPaid: dp.onlinePaid ?? (dp.paymentMethod !== 'cash' ? dp.amount : 0),
        rawDate: dp.date,
        billDate: dp.billDate,
        originalDuePayment: dp
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

  const totalKgInStatement = useMemo(() => {
    return customerLedgerEntries.reduce((s, r) => s + (r.totalKg || 0), 0);
  }, [customerLedgerEntries]);

  const handlePrintSingleInvoice = (inv: Invoice) => {
    let prevDue = 0;
    let totalDue = Number(inv.dueAmount) || 0;

    if (inv.previousDue !== undefined) {
      prevDue = Number(inv.previousDue) || 0;
      totalDue = inv.totalDue !== undefined ? Number(inv.totalDue) : (prevDue + (Number(inv.dueAmount) || 0));
    } else {
      const cust = viewCustomerHistory || customers.find(c => (inv.customerId && c.id === inv.customerId) || (c.name && c.name === inv.customerName));
      if (cust) {
        const matchedRowIndex = customerLedgerEntries.findIndex(r => r.id === inv.id || (r.memo && r.memo.includes(inv.invoiceNo)));
        if (matchedRowIndex !== -1) {
          totalDue = customerLedgerEntries[matchedRowIndex].remainingDue;
          prevDue = Math.max(0, totalDue - (Number(inv.dueAmount) || 0));
        } else {
          totalDue = cust.currentDue || 0;
          prevDue = Math.max(0, totalDue - (Number(inv.dueAmount) || 0));
        }
      }
    }

    const printWindow = window.open('', '_blank', 'width=850,height=750');
    if (!printWindow) {
      setInvoiceToPrint(inv);
      return;
    }

    const itemsHtml = (inv.items && inv.items.length > 0)
      ? inv.items.map((item, idx) => `
          <tr>
            <td style="text-align: center; border: 1px solid #94a3b8; padding: 6px 8px; font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; font-weight: 700; font-size: 13.5px; color: #000000;">${toBengaliNumber(idx + 1)}</td>
            <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; font-weight: 600; color: #000000;">${item.name}</td>
            <td style="text-align: center; border: 1px solid #94a3b8; padding: 6px 8px; font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; font-weight: 700; font-size: 13px; color: #000000;">${toBengaliNumber(item.quantity)} ${item.unit || 'কেজি'}</td>
            <td style="text-align: right; border: 1px solid #94a3b8; padding: 6px 8px; font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; font-weight: 600; color: #000000;">${toBengaliNumber(item.unitPrice)} ৳</td>
            <td style="text-align: right; border: 1px solid #94a3b8; padding: 6px 8px; font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; font-weight: 800; color: #000000;">${toBengaliNumber(item.totalPrice)} ৳</td>
          </tr>
        `).join('')
      : `
          <tr>
            <td style="text-align: center; border: 1px solid #94a3b8; padding: 6px 8px; font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; font-weight: 700; font-size: 13.5px; color: #000000;">১</td>
            <td style="border: 1px solid #94a3b8; padding: 6px 8px; font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; font-weight: 600; color: #000000;">মালামাল বিক্রয়</td>
            <td style="text-align: center; border: 1px solid #94a3b8; padding: 6px 8px; font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; font-weight: 700; font-size: 13px; color: #000000;">১ পিস</td>
            <td style="text-align: right; border: 1px solid #94a3b8; padding: 6px 8px; font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; font-weight: 600; color: #000000;">${toBengaliNumber(inv.grandTotal)} ৳</td>
            <td style="text-align: right; border: 1px solid #94a3b8; padding: 6px 8px; font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif; font-weight: 800; color: #000000;">${toBengaliNumber(inv.grandTotal)} ৳</td>
          </tr>
        `;

    const html = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title>ক্যাশ মেমো - ${inv.invoiceNo}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 10mm 12mm; }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-sizing: border-box;
          }
          body { 
            font-family: 'Noto Sans Bengali', 'SolaimanLipi', 'Kalpurush', sans-serif !important; 
            margin: 0; 
            padding: 15px; 
            color: #0f172a; 
            font-size: 12.5px; 
            line-height: 1.4;
            -webkit-font-smoothing: antialiased;
            text-rendering: optimizeLegibility;
          }
          .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 6px; margin-bottom: 10px; }
          .shop-name { font-size: 24px; font-weight: 900; color: #2563eb; margin: 0; }
          .shop-sub { font-size: 11.5px; color: #475569; margin: 3px 0 0 0; }
          .doc-badge { display: inline-block; background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; font-weight: bold; font-size: 13px; padding: 3px 14px; border-radius: 4px; margin-top: 6px; }
          .meta-grid { display: flex; justify-content: space-between; font-size: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
          th { background: #f1f5f9; border: 1px solid #94a3b8; padding: 7px 8px; font-weight: bold; color: #0f172a; }
          td { border: 1px solid #94a3b8; padding: 6px 8px; color: #000000; }
          .totals-wrap { display: flex; justify-content: flex-end; margin-top: 10px; }
          .totals-table { width: 290px; font-size: 12.5px; }
          .totals-table td { padding: 4px 6px; }
          .totals-table tr.grand { font-size: 13.5px; font-weight: bold; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; }
          .in-words { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 12px; margin-top: 12px; color: #0f172a; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; }
          .sig-line { border-top: 1px dashed #94a3b8; width: 150px; text-align: center; font-size: 11.5px; padding-top: 4px; font-weight: 600; color: #334155; }
          @media print { 
            body { padding: 0; } 
            th { background-color: #f1f5f9 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="shop-name">বিসমিল্লাহ ট্রেডার্স (Bismillah Traders)</h1>
          <p class="shop-sub">ঠিকানা: ১৪৭০, নতুন এ. কে. স্কুল রোড, দক্ষিণ দনিয়া, কদমতলী, ঢাকা-১২৩৬ | মোবাইল: 01885926704, 01718042483, 01720640137</p>
          <div class="doc-badge">ক্যাশ মেমো / ইনভয়েস</div>
        </div>

        <div class="meta-grid">
          <div>
            <strong>কাস্টমার:</strong> ${inv.customerName}<br>
            <strong>মোবাইল:</strong> ${inv.customerPhone || 'দেওয়া নেই'}<br>
            <strong>ঠিকানা:</strong> ${inv.customerAddress || 'দেওয়া নেই'}
          </div>
          <div style="text-align: right;">
            <strong>মেমো নং:</strong> <span style="font-family: monospace; font-weight: bold; background: #e0e7ff; padding: 2px 6px; border-radius: 4px;">${inv.invoiceNo}</span><br>
            <strong>তারিখ:</strong> ${toBengaliNumber(formatDate(inv.date))}<br>
            <strong>সময়:</strong> ${inv.time || ''}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">নং</th>
              <th style="text-align: left;">পণ্যের বিবরণ</th>
              <th style="width: 80px; text-align: center;">পরিমাণ</th>
              <th style="width: 85px; text-align: right;">দর (৳)</th>
              <th style="width: 95px; text-align: right;">মোট (৳)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="totals-wrap">
          <table class="totals-table">
            <tr>
              <td>মোট আইটেম বিল:</td>
              <td style="text-align: right; font-weight: bold;">${toBengaliNumber(inv.subtotal || inv.grandTotal)} ৳</td>
            </tr>
            ${(inv.discount || 0) > 0 ? `
              <tr style="color: #dc2626;">
                <td>ডিসকাউন্ট:</td>
                <td style="text-align: right; font-weight: bold;">-${toBengaliNumber(inv.discount)} ৳</td>
              </tr>
            ` : ''}
            ${(inv.laborOrTransportCost || 0) > 0 ? `
              <tr>
                <td>লেবার / পরিবহন:</td>
                <td style="text-align: right; font-weight: bold;">+${toBengaliNumber(inv.laborOrTransportCost)} ৳</td>
              </tr>
            ` : ''}
            <tr class="grand">
              <td>সর্বমোট বিল:</td>
              <td style="text-align: right; color: #2563eb;">${toBengaliNumber(inv.grandTotal)} ৳</td>
            </tr>
            <tr style="color: #059669;">
              <td>নগদ জমা:</td>
              <td style="text-align: right; font-weight: bold;">${toBengaliNumber(inv.cashPaid || 0)} ৳</td>
            </tr>
            ${(inv.onlinePaid || 0) > 0 ? `
              <tr style="color: #4338ca;">
                <td>অন্যান্য জমা:</td>
                <td style="text-align: right; font-weight: bold;">${toBengaliNumber(inv.onlinePaid)} ৳</td>
              </tr>
            ` : ''}
            <tr>
              <td style="padding: 4px 6px; border-top: 1px solid #e2e8f0;">আজকের বিলের বাকি:</td>
              <td style="text-align: right; padding: 4px 6px; font-weight: bold; border-top: 1px solid #e2e8f0; color: ${(inv.dueAmount || 0) > 0 ? '#dc2626' : '#059669'};">
                ${(inv.dueAmount || 0) > 0 ? `${toBengaliNumber(inv.dueAmount)} ৳` : 'পরিশোধিত (০ ৳)'}
              </td>
            </tr>
            <tr>
              <td style="padding: 4px 6px;">কাস্টমারের পূর্বের বাকি:</td>
              <td style="text-align: right; padding: 4px 6px; font-weight: bold; color: ${prevDue > 0 ? '#b45309' : '#475569'};">
                ${toBengaliNumber(prevDue)} ৳
              </td>
            </tr>
            <tr style="border-top: 2px solid #000; font-weight: bold; background: #fff1f2; color: ${totalDue > 0 ? '#b91c1c' : '#059669'}; font-size: 13px;">
              <td style="padding: 6px 6px;">কাস্টমারের মোট বকেয়া:</td>
              <td style="text-align: right; padding: 6px 6px;">
                ${totalDue > 0 ? `${toBengaliNumber(totalDue)} ৳` : 'পরিশোধিত (০ ৳)'}
              </td>
            </tr>
          </table>
        </div>

        <div class="in-words">
          <strong>সর্বমোট বিল কথায়:</strong> ${numberToBengaliWords(inv.grandTotal)}
        </div>

        <div class="footer">
          <div class="sig-line">গ্রাহকের স্বাক্ষর</div>
          <div class="sig-line">বিক্রেতার স্বাক্ষর</div>
        </div>

        <div style="text-align: center; font-size: 10px; color: #64748b; font-weight: 600; margin-top: 15px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
          App Developer: RS ONLINE - 01611814813
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 350);
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handlePrintCustomersList = () => {
    const printWindow = window.open('', '_blank', 'width=950,height=750');
    if (!printWindow) {
      window.print();
      return;
    }

    const currentDate = formatDate(new Date());
    const totalOpening = filteredCustomers.reduce((sum, c) => sum + (c.openingDue || 0), 0);
    const totalPurchased = filteredCustomers.reduce((sum, c) => sum + (c.totalPurchased || 0), 0);
    const totalPaid = filteredCustomers.reduce((sum, c) => sum + (c.totalPaid || 0), 0);
    const totalDue = filteredCustomers.reduce((sum, c) => sum + (c.currentDue || 0), 0);

    const html = `
      <!DOCTYPE html>
      <html lang="bn">
      <head>
        <meta charset="UTF-8">
        <title>কাস্টমার লেজার ও বাকি তালিকা - বিসমিল্লাহ ট্রেডার্স</title>
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
          <h1 class="shop-name">বিসমিল্লাহ ট্রেডার্স (Bismillah Traders)</h1>
          <p class="shop-sub">ঠিকানা: ১৪৭০, নতুন এ. কে. স্কুল রোড, দক্ষিণ দনিয়া, কদমতলী, ঢাকা-১২৩৬ | মোবাইল: 01885926704, 01718042483, 01720640137</p>
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
              <th class="text-center">মোট মাল (কেজি)</th>
              <th class="text-right">পূর্বের বাকি</th>
              <th class="text-right">মোট ক্রয়</th>
              <th class="text-right">মোট পরিশোধ</th>
              <th class="text-right">বর্তমান বাকি (Due)</th>
            </tr>
          </thead>
          <tbody>
            ${filteredCustomers.length === 0 ? `
              <tr><td colspan="9" class="text-center" style="padding: 20px;">কোনো কাস্টমার তথ্য পাওয়া যায়নি</td></tr>
            ` : filteredCustomers.map((c, i) => `
              <tr>
                <td class="text-center">${toBengaliNumber(i + 1)}</td>
                <td><strong>${c.name}</strong></td>
                <td>${c.phone || '-'}</td>
                <td>${c.address || '-'}</td>
                <td class="text-center" style="font-weight: bold; color: #4338ca;">${c.totalKg && c.totalKg > 0 ? `${toBengaliNumber(c.totalKg)} কেজি` : '-'}</td>
                <td class="text-right">${toBengaliNumber(c.openingDue || 0)} ৳</td>
                <td class="text-right">${toBengaliNumber(c.totalPurchased || 0)} ৳</td>
                <td class="text-right paid-col">${toBengaliNumber(c.totalPaid || 0)} ৳</td>
                <td class="text-right due-col">${toBengaliNumber(c.currentDue || 0)} ৳</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="4" class="text-right"><strong>সর্বমোট হিসেব:</strong></td>
              <td class="text-center" style="font-weight: bold; color: #4338ca;"><strong>${toBengaliNumber(filteredCustomers.reduce((s, c) => s + (c.totalKg || 0), 0))} কেজি</strong></td>
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
          <h1 class="shop-name">বিসমিল্লাহ ট্রেডার্স (Bismillah Traders)</h1>
          <p class="shop-sub">ঠিকানা: ১৪৭০, নতুন এ. কে. স্কুল রোড, দক্ষিণ দনিয়া, কদমতলী, ঢাকা-১২৩৬ | মোবাইল: 01885926704, 01718042483, 01720640137</p>
          <div class="doc-title">${cust.name} - এর হিসাব স্টেটমেন্ট</div>
        </div>

        <div class="cust-info-box">
          <div>
            <strong>কাস্টমার:</strong> ${cust.name}<br>
            <strong>মোবাইল:</strong> ${cust.phone || 'দেওয়া নেই'}<br>
            <strong>ঠিকানা:</strong> ${cust.address || 'দেওয়া নেই'}
          </div>
          <div style="text-align: right;">
            <strong>তারিখ পরিসীমা:</strong> ${formatDate(statementStartDate)} হতে ${formatDate(statementEndDate)}<br>
            <strong>বর্তমান মোট বাকি:</strong> <span style="color: #dc2626; font-weight: bold; font-size: 14px;">${toBengaliNumber(finalDue)} ৳</span>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 80px;">তারিখ</th>
              <th>বিবরণ / মেমো নং</th>
              <th class="text-center">পরিমাণ (কেজি)</th>
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
              <td class="text-center">-</td>
              <td class="text-right due-col">${toBengaliNumber(cust.openingDue || 0)} ৳</td>
            </tr>
            ${customerLedgerEntries.map(row => `
              <tr>
                <td style="font-family: monospace;">${formatDate(row.date)}</td>
                <td><strong>${row.memo}</strong></td>
                <td class="text-center font-bold">${row.totalKg && row.totalKg > 0 ? `${toBengaliNumber(row.totalKg)} কেজি` : '-'}</td>
                <td class="text-center font-bold">${row.sale > 0 ? `${toBengaliNumber(row.sale)} ৳` : '-'}</td>
                <td class="text-center" style="color: #db2777;">${row.discount > 0 ? `${toBengaliNumber(row.discount)} ৳` : '-'}</td>
                <td class="text-center paid-col">${row.cashPaid > 0 ? `${toBengaliNumber(row.cashPaid)} ৳` : '-'}</td>
                <td class="text-center other-col">${row.otherPaid > 0 ? `${toBengaliNumber(row.otherPaid)} ৳` : '-'}</td>
                <td class="text-right due-col">${toBengaliNumber(row.remainingDue)} ৳</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="2" class="text-right"><strong>মোট লেনদেন:</strong></td>
              <td class="text-center" style="color: #2563eb;"><strong>${totalKgInStatement > 0 ? `${toBengaliNumber(totalKgInStatement)} কেজি` : '-'}</strong></td>
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
            <span>মোট ক্রয়কৃত মাল:</span>
            <span style="font-weight: bold; color: #2563eb;">${toBengaliNumber(totalKgInStatement)} কেজি</span>
          </div>
          <div class="summary-line">
            <span>মোট ক্রয় (মূল্য):</span>
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

        <div style="text-align: center; font-size: 10px; color: #64748b; font-weight: 600; margin-top: 20px; padding-top: 6px; border-top: 1px dashed #cbd5e1;">
          App Developer: RS ONLINE - 01611814813
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

  // Dedicated Full Page View for Customer Ledger / Statement
  if (viewCustomerHistory) {
    const cust = viewCustomerHistory;
    const customerTotalSale = customerLedgerEntries.reduce((s, r) => s + (r.sale || 0), 0);
    const customerTotalDiscount = customerLedgerEntries.reduce((s, r) => s + (r.discount || 0), 0);
    const customerTotalCash = customerLedgerEntries.reduce((s, r) => s + (r.cashPaid || 0), 0);
    const customerTotalOther = customerLedgerEntries.reduce((s, r) => s + (r.otherPaid || 0), 0);
    const customerTotalPaid = customerTotalCash + customerTotalOther;
    const customerCurrentDue = customerLedgerEntries.length > 0 
      ? customerLedgerEntries[customerLedgerEntries.length - 1].remainingDue 
      : (cust.openingDue || 0);

    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5 animate-in fade-in">
        {/* Top Header / Back Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <button
              type="button"
              onClick={() => setViewCustomerHistory(null)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm transition cursor-pointer border border-slate-300 active:scale-95 shrink-0 shadow-2xs"
              title="কাস্টমার তালিকায় ফিরে যান"
            >
              <ArrowLeft className="w-4 h-4 text-slate-700" />
              <span>কাস্টমার তালিকায় ফিরুন</span>
            </button>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-slate-800 tracking-tight">
                  {cust.name}
                </h1>
                <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                  কাস্টমার লেজার ও খতিয়ান স্টেটমেন্ট
                </span>
                {cust.discountPerKg && cust.discountPerKg > 0 ? (
                  <span className="text-xs font-bold text-pink-700 bg-pink-50 border border-pink-200 px-2.5 py-0.5 rounded-full">
                    কেজি প্রতি ছাড়: {toBengaliNumber(cust.discountPerKg)} ৳/কেজি
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1 flex items-center gap-3 flex-wrap">
                {cust.phone && <span>মোবাইল: <strong className="text-slate-700 font-mono">{cust.phone}</strong></span>}
                {cust.address && <span>ঠিকানা: <strong className="text-slate-700">{cust.address}</strong></span>}
                {cust.notes && <span>মন্তব্য: <strong className="text-slate-600">{cust.notes}</strong></span>}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
            <button
              type="button"
              onClick={handlePrintStatement}
              className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
              title="লেজার স্টেটমেন্ট প্রিন্ট করুন"
            >
              <Printer className="w-4 h-4" />
              <span>স্টেটমেন্ট প্রিন্ট</span>
            </button>
            <button
              type="button"
              onClick={handlePrintStatement}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
              title="পিডিএফ ডাউনলোড করুন"
            >
              <Download className="w-4 h-4" />
              <span>পিডিএফ</span>
            </button>
          </div>
        </div>

        {/* Customer KPI Summary Cards Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Card 1: প্রারম্ভিক বাকি */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500">প্রারম্ভিক / সাবেক বাকি</span>
            <p className="text-lg sm:text-xl font-black text-slate-800">
              {toBengaliNumber(cust.openingDue || 0)} <span className="text-xs font-bold text-slate-500">৳</span>
            </p>
            <p className="text-[10px] text-slate-400">শুরুর পূর্বের বকেয়া</p>
          </div>

          {/* Card 2: মোট বিক্রিত মাল (ওজন) */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-indigo-600 flex items-center justify-between">
              <span>মোট ক্রয়কৃত মাল</span>
              <Scale className="w-3.5 h-3.5" />
            </span>
            <p className="text-lg sm:text-xl font-black text-indigo-700">
              {toBengaliNumber(totalKgInStatement)} <span className="text-xs font-bold text-indigo-600">কেজি</span>
            </p>
            <p className="text-[10px] text-indigo-500 font-medium">মোট পণ্য বা ওজন</p>
          </div>

          {/* Card 3: মোট ক্রয় / বিল */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-slate-500">মোট বিক্রয় বিল</span>
            <p className="text-lg sm:text-xl font-black text-slate-900">
              {toBengaliNumber(customerTotalSale)} <span className="text-xs font-bold text-slate-500">৳</span>
            </p>
            <p className="text-[10px] text-slate-400">
              {customerTotalDiscount > 0 ? `লেস: -${toBengaliNumber(customerTotalDiscount)} ৳` : 'মোট ইনভয়েস মূল্য'}
            </p>
          </div>

          {/* Card 4: মোট জমা / পরিশোধ */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-1">
            <span className="text-[11px] font-bold text-emerald-600">মোট জমা / পরিশোধ</span>
            <p className="text-lg sm:text-xl font-black text-emerald-700">
              {toBengaliNumber(customerTotalPaid)} <span className="text-xs font-bold text-emerald-600">৳</span>
            </p>
            <p className="text-[10px] text-emerald-600 font-medium">নগদ ও অন্যান্য মাধ্যম</p>
          </div>

          {/* Card 5: বর্তমান অবশিষ্ট বাকি */}
          <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-rose-600">বর্তমান অবশিষ্ট বাকি</span>
            <p className={`text-lg sm:text-2xl font-black ${customerCurrentDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {toBengaliNumber(customerCurrentDue)} <span className="text-xs font-bold">৳</span>
            </p>
            <p className="text-[10px] font-bold text-rose-500">
              {customerCurrentDue > 0 ? 'পরিশোধযোগ্য চূড়ান্ত বাকি' : 'কোনো বাকি নেই (পরিশোধিত)'}
            </p>
          </div>
        </div>

        {/* Date Filter & Transaction Controls Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold text-slate-700">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">শুরুর তারিখ:</span>
              <input
                type="date"
                value={statementStartDate}
                onChange={(e) => setStatementStartDate(e.target.value)}
                className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <span className="text-slate-400 font-bold hidden sm:inline">➔</span>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-bold">শেষ তারিখ:</span>
              <input
                type="date"
                value={statementEndDate}
                onChange={(e) => setStatementEndDate(e.target.value)}
                className="border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => setFilterApplied(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-xs font-bold shadow-sm transition active:scale-95 cursor-pointer"
            >
              ফিল্টার
            </button>

            {filterApplied && (
              <button
                type="button"
                onClick={() => setFilterApplied(false)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
              >
                সব তারিখ দেখুন
              </button>
            )}
          </div>

          <div className="text-xs text-slate-500 font-medium">
            মোট এন্ট্রি: <strong className="text-slate-800 font-bold">{toBengaliNumber(customerLedgerEntries.length)}</strong> টি
          </div>
        </div>

        {/* Main Statement Ledger Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>{cust.name} - এর বিস্তারিত লেনদেন খতিয়ান ও হিসাব বিবরণী</span>
            </h3>
            <span className="text-xs font-bold text-slate-500">
              মুদ্রা: টাকা (৳) | ওজন: কেজি
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-3">তারিখ</th>
                  <th className="py-3 px-3">বিবরণ / মেমো</th>
                  <th className="py-3 px-3 text-center">পরিমাণ (কেজি)</th>
                  <th className="py-3 px-3 text-center">ক্রয় / বিক্রি</th>
                  <th className="py-3 px-3 text-center">ডিসকাউন্ট</th>
                  <th className="py-3 px-3 text-center">নগদ পরিশোধ</th>
                  <th className="py-3 px-3 text-center">অন্যান্য পেমেন্ট (চেক/বিকাশ)</th>
                  <th className="py-3 px-3 text-right">বাকি (ব্যালেন্স)</th>
                  <th className="py-3 px-3 text-center">একশন / ইনভয়েস</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                
                {/* Row 1: ওপেনিং ব্যালেন্স / সাবেক বাকি */}
                <tr className="bg-slate-50/60 font-semibold">
                  <td className="py-3 px-3 text-slate-400">-</td>
                  <td className="py-3 px-3 font-bold text-slate-800">
                    ওপেনিং ব্যালেন্স / সাবেক বাকি
                  </td>
                  <td className="py-3 px-3 text-center text-slate-400">-</td>
                  <td className="py-3 px-3 text-center text-slate-400">-</td>
                  <td className="py-3 px-3 text-center text-slate-400">-</td>
                  <td className="py-3 px-3 text-center text-slate-400">-</td>
                  <td className="py-3 px-3 text-center text-slate-400">-</td>
                  <td className="py-3 px-3 text-right font-black text-rose-600">
                    {toBengaliNumber(cust.openingDue || 0)} ৳
                  </td>
                  <td className="py-3 px-3 text-center text-slate-400">-</td>
                </tr>

                {/* Transaction Rows */}
                {customerLedgerEntries.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                      {filterApplied ? 'নির্বাচিত সময়ে কোনো লেনদেন পাওয়া যায়নি' : 'এই কাস্টমারের কোনো লেনদেন পাওয়া যায়নি'}
                    </td>
                  </tr>
                ) : (
                  customerLedgerEntries.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/80 transition text-slate-800">
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {toBengaliNumber(formatDate(row.date))}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {row.memo}
                        {row.billDate && (
                          <div className="text-[10px] text-slate-500 font-normal mt-0.5">বিল: {formatDate(row.billDate)}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-700">
                        {row.totalKg && row.totalKg > 0 ? (
                          <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded text-xs whitespace-nowrap">
                            {toBengaliNumber(row.totalKg)} কেজি
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">-</span>
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
                      <td className="py-3 px-3 text-right font-black text-rose-600">
                        {toBengaliNumber(row.remainingDue)} ৳
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {row.type === 'invoice' && row.originalInvoice && (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => row.originalInvoice && setInvoiceToPrint(row.originalInvoice)}
                              title="ইনভয়েস মেমো দেখুন"
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200 rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-600" />
                              <span>ভিউ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => row.originalInvoice && handlePrintSingleInvoice(row.originalInvoice)}
                              title="ইনভয়েস সরাসরি প্রিন্ট করুন"
                              className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-300 rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                              <span>প্রিন্ট</span>
                            </button>
                            {canEditOrDelete && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (!row.originalInvoice) return;
                                  const inv = row.originalInvoice;
                                  confirmAction({
                                    title: 'ইনভয়েস মুছে ফেলা',
                                    message: `আপনি কি নিশ্চিত মেমো #${inv.invoiceNo} মুছে ফেলতে চান? এতে মেমোটি বাতিল হবে এবং বিক্রিত পণ্যের সমস্ত স্টক স্বয়ংক্রিয়ভাবে আবার স্টকে ফেরত যোগ হয়ে যাবে।`,
                                    confirmLabel: 'হ্যাঁ, মেমো মুছুন',
                                    onConfirm: () => deleteInvoice(inv.id)
                                  });
                                }}
                                title="ইনভয়েস মুছুন (মালামাল স্টকে ফেরত যাবে)"
                                className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 hover:text-rose-900 border border-rose-200 rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                <span>মুছুন</span>
                              </button>
                            )}
                          </div>
                        )}

                        {row.type === 'due_payment' && row.originalDuePayment && (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => row.originalDuePayment && setDuePaymentToPrint(row.originalDuePayment)}
                              title="বাকি আদায়ের রশিদ দেখুন"
                              className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            >
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>রশিদ</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => row.originalDuePayment && setDuePaymentToPrint(row.originalDuePayment)}
                              title="রশিদ প্রিন্ট করুন"
                              className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 hover:text-slate-900 border border-slate-300 rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                              <span>প্রিন্ট</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-bold text-slate-800 border-t-2 border-slate-300">
                <tr>
                  <td colSpan={2} className="py-3 px-3 text-right">সর্বমোট লেনদেন:</td>
                  <td className="py-3 px-3 text-center text-indigo-700 font-black">
                    {totalKgInStatement > 0 ? `${toBengaliNumber(totalKgInStatement)} কেজি` : '-'}
                  </td>
                  <td className="py-3 px-3 text-center font-black text-slate-900">
                    {toBengaliNumber(customerTotalSale)} ৳
                  </td>
                  <td className="py-3 px-3 text-center font-black text-pink-600">
                    {toBengaliNumber(customerTotalDiscount)} ৳
                  </td>
                  <td className="py-3 px-3 text-center font-black text-emerald-700">
                    {toBengaliNumber(customerTotalCash)} ৳
                  </td>
                  <td className="py-3 px-3 text-center font-black text-indigo-700">
                    {toBengaliNumber(customerTotalOther)} ৳
                  </td>
                  <td className="py-3 px-3 text-right font-black text-rose-600 text-sm">
                    {toBengaliNumber(customerCurrentDue)} ৳
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-5">
      
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            <span>কাস্টমার লেজার ও বাকি তালিকা (Customer Management)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-3 flex-wrap">
            <span>সর্বমোট কাস্টমার বাকি: <strong className="font-extrabold text-rose-600 text-sm">{toBengaliNumber(totalDueAllCustomers)} ৳</strong></span>
            <span className="text-slate-300">|</span>
            <span>সর্বমোট বিক্রিত মাল: <strong className="font-extrabold text-indigo-700 text-sm">{toBengaliNumber(mappedCustomers.reduce((sum, c) => sum + (c.totalKg || 0), 0))} কেজি</strong></span>
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
              setDiscountPerKg('');
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
                <th className="p-3 text-center">ছাড় (৳/কেজি)</th>
                <th className="p-3 text-center">মোট মাল (কেজি)</th>
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
                  <td colSpan={11} className="p-8 text-center text-slate-400 text-xs">
                    কোনো কাস্টমার পাওয়া যায়নি।
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust, idx) => (
                  <tr key={cust.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 text-slate-400 font-medium">{toBengaliNumber(idx + 1)}</td>
                    <td className="p-3 font-bold text-slate-800">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button 
                          onClick={() => setViewCustomerHistory(cust)}
                          className="hover:text-indigo-600 text-left font-bold"
                        >
                          {cust.name}
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-slate-600 font-mono">{cust.phone || '-'}</td>
                    <td className="p-3 text-slate-600">{cust.address || '-'}</td>
                    <td className="p-3 text-center">
                      {(cust.discountPerKg && cust.discountPerKg > 0) ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-pink-50 text-pink-700 border border-pink-200 shadow-2xs whitespace-nowrap">
                          {toBengaliNumber(cust.discountPerKg)} ৳/কেজি
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">-</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-bold">
                      {(cust.totalKg && cust.totalKg > 0) ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs whitespace-nowrap">
                          {toBengaliNumber(cust.totalKg)} কেজি
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">-</span>
                      )}
                    </td>
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
                          title="হিসাব স্টেটমেন্ট দেখুন (ভিউ)"
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-900 border border-indigo-200 rounded-md transition shadow-2xs cursor-pointer active:scale-95 shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5 text-indigo-600" />
                          <span>ভিউ</span>
                        </button>
                        {canEditOrDelete && (
                          <>
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
                          </>
                        )}
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
                      custDiscountPerKgRef.current?.focus();
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-pink-700">
                    ডিসকাউন্ট / ছাড় (প্রতি কেজি ৳)
                  </label>
                  <span className="text-[10px] text-pink-600 font-semibold bg-pink-50 px-1.5 py-0.5 rounded border border-pink-200">
                    প্রতি কেজি বিক্রয়ে ছাড়
                  </span>
                </div>
                <input
                  ref={custDiscountPerKgRef}
                  type="text"
                  inputMode="numeric"
                  min="0"
                  placeholder="যেমন: ২ (প্রতি কেজিতে যত টাকা ছাড় পাবে)"
                  value={discountPerKg}
                  onChange={(e) => setDiscountPerKg(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      custNotesRef.current?.focus();
                    }
                  }}
                  className="w-full bg-pink-50/50 border border-pink-300 rounded-lg px-3 py-2 text-xs font-bold text-pink-700 placeholder:text-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
                />
                <p className="text-[10.5px] text-slate-500 mt-1">
                  💡 এই কাস্টমার যত কেজি কেনাকাটা করবে, প্রতি কেজিতে স্বয়ংক্রিয়ভাবে এই পরিমাণ টাকা ছাড় পাবে।
                </p>
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

    </div>
  );
};

